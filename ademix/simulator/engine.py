"""Deterministic open-pit haulage model used by the Ademix digital twin."""

from __future__ import annotations

from dataclasses import dataclass
import random
from threading import RLock

ROUTE = [(-25.0, -18.0), (-16.0, -8.0), (-8.0, 2.0), (3.0, 8.0), (15.0, 12.0), (27.0, 18.0)]
ROUTE_KM = 3.2
CAPACITY_T = 77.0
# OpenMines North Pit reference: 20.32 t shovel, 1.5 min passes, 1 min dump.
LOAD_SECONDS = 360.0
DUMP_SECONDS = 60.0
BASE_CRUSHER_TPH = 900.0


@dataclass
class Truck:
    name: str
    progress: float
    direction: int = 1
    payload_t: float = 0.0
    fuel_pct: float = 100.0
    state: str = "returning"
    timer_s: float = 0.0
    trips: int = 0
    cycle_started_s: float = 0.0
    last_cycle_s: float = 0.0


class MineEngine:
    def __init__(self, seed: int = 42):
        self.lock = RLock()
        self.rng = random.Random(seed)
        self.sim_time_s = 0.0
        self.production_t = 0.0
        self.stockpile_t = 0.0
        self.scenario = "baseline"
        self.scenario_started_s = 0.0
        self.trucks = [Truck(f"truck-{i:02d}", (i - 1) / 6, state="hauling") for i in range(1, 7)]
        for truck in self.trucks:
            truck.payload_t = CAPACITY_T
            truck.fuel_pct = self.rng.uniform(68, 98)

    def set_scenario(self, scenario: str):
        if scenario not in {"baseline", "truck_breakdown", "road_closure", "crusher_slowdown"}:
            raise ValueError(f"unknown scenario: {scenario}")
        with self.lock:
            self.scenario = scenario
            self.scenario_started_s = self.sim_time_s
            if scenario != "truck_breakdown" and self.trucks[0].state == "breakdown":
                self.trucks[0].state = "hauling" if self.trucks[0].payload_t else "returning"

    def step(self, dt: float):
        with self.lock:
            self.sim_time_s += dt
            for truck in self.trucks:
                self._step_truck(truck, dt)

    def _step_truck(self, truck: Truck, dt: float):
        if self.scenario == "truck_breakdown" and truck.name == "truck-01":
            truck.state = "breakdown"
            return
        if truck.state == "breakdown":
            truck.state = "hauling" if truck.payload_t else "returning"

        road_factor = 0.62 if self.scenario == "road_closure" else 1.0
        speed_kmh = 25.0 * road_factor

        if truck.state in {"loading", "dumping"}:
            truck.timer_s += dt
            required = LOAD_SECONDS if truck.state == "loading" else DUMP_SECONDS
            if truck.timer_s < required:
                return
            truck.timer_s = 0.0
            if truck.state == "loading":
                truck.payload_t = CAPACITY_T
                truck.direction = 1
                truck.state = "hauling"
                truck.cycle_started_s = self.sim_time_s
            else:
                accepted = truck.payload_t
                if self.scenario == "crusher_slowdown":
                    accepted *= 0.55
                self.production_t += accepted
                self.stockpile_t += accepted
                truck.payload_t = 0.0
                truck.direction = -1
                truck.state = "returning"
                truck.trips += 1
                truck.last_cycle_s = max(0.0, self.sim_time_s - truck.cycle_started_s)
            return

        delta = speed_kmh * dt / 3600.0 / ROUTE_KM
        truck.progress = max(0.0, min(1.0, truck.progress + delta * truck.direction))
        truck.fuel_pct = max(0.0, truck.fuel_pct - delta * (1.4 if truck.direction == 1 else 0.8))
        if truck.progress >= 1.0 and truck.direction == 1:
            truck.state = "dumping"
            truck.timer_s = 0.0
        elif truck.progress <= 0.0 and truck.direction == -1:
            truck.state = "loading"
            truck.timer_s = 0.0

    @staticmethod
    def position(progress: float):
        scaled = progress * (len(ROUTE) - 1)
        index = min(int(scaled), len(ROUTE) - 2)
        fraction = scaled - index
        start, end = ROUTE[index], ROUTE[index + 1]
        return start[0] + (end[0] - start[0]) * fraction, start[1] + (end[1] - start[1]) * fraction

    def snapshot(self):
        with self.lock:
            operational = [t for t in self.trucks if t.state != "breakdown"]
            moving = [t for t in operational if t.state in {"hauling", "returning"}]
            cycles = [t.last_cycle_s for t in self.trucks if t.last_cycle_s > 0]
            window_h = max(self.sim_time_s / 3600.0, 1 / 60)
            throughput = self.production_t / window_h
            crusher_capacity = BASE_CRUSHER_TPH * (0.55 if self.scenario == "crusher_slowdown" else 1.0)
            impact = {"baseline": 0, "truck_breakdown": -17, "road_closure": -28, "crusher_slowdown": -45}[self.scenario]
            things = {
                "mine-01": {
                    "production_t": self.metric(self.production_t, "t"),
                    "throughput_tph": self.metric(min(throughput, crusher_capacity), "t/h"),
                    "fleet_utilization": self.metric(100 * len(moving) / len(self.trucks), "%"),
                    "average_cycle_min": self.metric(sum(cycles) / len(cycles) / 60 if cycles else 0, "min"),
                    "active_scenario": self.metric(self.scenario),
                    "sim_time_s": self.metric(self.sim_time_s, "s"),
                },
                "excavator-01": {
                    "state": self.metric("loading" if any(t.state == "loading" for t in self.trucks) else "ready"),
                    "queue_length": self.metric(sum(t.state == "loading" for t in self.trucks)),
                    "position_x": self.metric(-25), "position_z": self.metric(-18),
                },
                "crusher-01": {
                    "state": self.metric("constrained" if self.scenario == "crusher_slowdown" else "operating"),
                    "capacity_tph": self.metric(crusher_capacity, "t/h"),
                    "queue_length": self.metric(sum(t.state == "dumping" for t in self.trucks)),
                    "stockpile_t": self.metric(self.stockpile_t, "t"),
                    "position_x": self.metric(27), "position_z": self.metric(18),
                },
                "road-main": {
                    "state": self.metric("restricted" if self.scenario == "road_closure" else "open"),
                    "speed_limit_kmh": self.metric(18 if self.scenario == "road_closure" else 35, "km/h"),
                    "traffic_count": self.metric(len(moving)),
                },
                "scenario-controller": {
                    "active": self.metric(self.scenario),
                    "description": self.metric(self.scenario.replace("_", " ").title()),
                    "impact_pct": self.metric(impact, "%"),
                },
            }
            for truck in self.trucks:
                x, z = self.position(truck.progress)
                things[truck.name] = {
                    "state": self.metric(truck.state),
                    "payload_t": self.metric(truck.payload_t, "t"),
                    "fuel_pct": self.metric(truck.fuel_pct, "%"),
                    "speed_kmh": self.metric(0 if truck.state not in {"hauling", "returning"} else 25, "km/h"),
                    "position_x": self.metric(x), "position_z": self.metric(z),
                    "heading": self.metric(1 if truck.direction == 1 else -1),
                    "trips_total": self.metric(truck.trips),
                    "cycle_time_min": self.metric(truck.last_cycle_s / 60, "min"),
                }
            return things

    @staticmethod
    def metric(value, unit=None):
        result = {"value": round(value, 2) if isinstance(value, float) else value}
        if unit:
            result["unit"] = unit
        return result

