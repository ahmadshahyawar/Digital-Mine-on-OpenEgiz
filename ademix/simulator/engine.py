"""Deterministic open-pit haulage model used by the Ademix digital twin."""

from __future__ import annotations

from dataclasses import dataclass, field
import random
from threading import RLock

ROUTE = [(-25.0, -18.0), (-16.0, -8.0), (-8.0, 2.0), (3.0, 8.0), (15.0, 12.0), (27.0, 18.0)]
ROUTE_KM = 3.2
CAPACITY_T = 77.0
# OpenMines North Pit reference: 20.32 t shovel, 1.5 min passes, 1 min dump.
LOAD_SECONDS = 360.0
DUMP_SECONDS = 60.0
BASE_CRUSHER_TPH = 900.0
INITIAL_ROM_T = 250.0
TRUCK_BREAKDOWN_SPEED_FACTOR = 0.64
ROAD_CLOSURE_SPEED_FACTOR = 0.429

SCENARIO_DETAILS = {
    "baseline": ("Normal operations", "none"),
    "truck_breakdown": ("HT-01 breakdown blocks the active haul lane", "truck-01,fleet,road"),
    "road_closure": ("Main haul road restricted; fleet follows the slow route", "road,fleet"),
    "crusher_slowdown": ("Primary crusher capacity reduced by 45%", "crusher,rom-inventory"),
}


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
    queue_entered_s: float = 0.0
    movement_started_s: float = 0.0
    last_loading_wait_s: float = 0.0
    last_crusher_wait_s: float = 0.0
    last_loading_s: float = 0.0
    last_haul_s: float = 0.0
    last_dump_s: float = 0.0
    last_return_s: float = 0.0
    operating_s: float = 0.0
    interrupted_state: str | None = None
    state_history: list[str] = field(default_factory=list)

    def __post_init__(self):
        if not self.state_history:
            self.state_history.append(self.state)


class MineEngine:
    def __init__(self, seed: int = 42):
        self.lock = RLock()
        self.rng = random.Random(seed)
        self.sim_time_s = 0.0
        self.production_t = 0.0
        self.delivered_t = 0.0
        self.extracted_t = 0.0
        self.rom_inventory_t = INITIAL_ROM_T
        self.scenario = "baseline"
        self.scenario_started_s = 0.0
        self.excavator_busy_s = 0.0
        self.dump_point_busy_s = 0.0
        self.crusher_busy_s = 0.0
        self.loading_queue_time_s = 0.0
        self.crusher_queue_time_s = 0.0
        self.trucks = [Truck(f"truck-{i:02d}", (i - 1) / 6, state="hauling") for i in range(1, 7)]
        for truck in self.trucks:
            truck.payload_t = CAPACITY_T
            truck.fuel_pct = self.rng.uniform(68, 98)
        # The staggered startup fleet begins loaded. Count that ore as already
        # extracted so the mass balance is valid from simulation time zero.
        self.extracted_t = sum(truck.payload_t for truck in self.trucks)

    def set_scenario(self, scenario: str):
        if scenario not in SCENARIO_DETAILS:
            raise ValueError(f"unknown scenario: {scenario}")
        with self.lock:
            self.scenario = scenario
            self.scenario_started_s = self.sim_time_s
            truck = self.trucks[0]
            if scenario != "truck_breakdown" and truck.state == "breakdown":
                restore = truck.interrupted_state or ("hauling" if truck.payload_t else "returning")
                if restore in {"loading", "waiting_loading"}:
                    restore = "waiting_loading"
                    truck.queue_entered_s = self.sim_time_s
                elif restore in {"dumping", "waiting_crusher"}:
                    restore = "waiting_crusher"
                    truck.queue_entered_s = self.sim_time_s
                self._transition(truck, restore)
                truck.interrupted_state = None

    def step(self, dt: float):
        if dt <= 0:
            raise ValueError("step duration must be positive")
        with self.lock:
            # One-second slices preserve the order of short queue/resource events
            # even when the accelerated runtime requests a larger time step.
            remaining = dt
            while remaining > 0:
                interval = min(1.0, remaining)
                self._step_interval(interval)
                remaining -= interval

    def _step_interval(self, dt: float):
        self.sim_time_s += dt
        breakdown_truck = self.trucks[0]
        if self.scenario == "truck_breakdown" and breakdown_truck.state != "breakdown":
            breakdown_truck.interrupted_state = breakdown_truck.state
            self._transition(breakdown_truck, "breakdown")

        self._assign_resources()
        loading_queue_length = sum(truck.state == "waiting_loading" for truck in self.trucks)
        crusher_queue_length = sum(truck.state == "waiting_crusher" for truck in self.trucks)
        self.loading_queue_time_s += loading_queue_length * dt
        self.crusher_queue_time_s += crusher_queue_length * dt
        if any(truck.state == "loading" for truck in self.trucks):
            self.excavator_busy_s += dt
        if any(truck.state == "dumping" for truck in self.trucks):
            self.dump_point_busy_s += dt
        for truck in self.trucks:
            if truck.state in {"loading", "hauling", "dumping", "returning"}:
                truck.operating_s += dt
        for truck in self.trucks:
            self._step_truck(truck, dt)
        self._assign_resources()

        capacity_tph = BASE_CRUSHER_TPH * (0.55 if self.scenario == "crusher_slowdown" else 1.0)
        processed = min(self.rom_inventory_t, capacity_tph * dt / 3600.0)
        if processed > 0:
            self.crusher_busy_s += dt
        self.rom_inventory_t -= processed
        self.production_t += processed

    def _assign_resources(self):
        if not any(truck.state == "loading" for truck in self.trucks):
            waiting = [truck for truck in self.trucks if truck.state == "waiting_loading"]
            if waiting:
                truck = min(waiting, key=lambda item: (item.queue_entered_s, item.name))
                truck.last_loading_wait_s = max(0.0, self.sim_time_s - truck.queue_entered_s)
                if truck.cycle_started_s > 0:
                    truck.last_cycle_s = max(0.0, self.sim_time_s - truck.cycle_started_s)
                truck.cycle_started_s = self.sim_time_s
                truck.timer_s = 0.0
                self._transition(truck, "loading")

        if not any(truck.state == "dumping" for truck in self.trucks):
            waiting = [truck for truck in self.trucks if truck.state == "waiting_crusher"]
            if waiting:
                truck = min(waiting, key=lambda item: (item.queue_entered_s, item.name))
                truck.last_crusher_wait_s = max(0.0, self.sim_time_s - truck.queue_entered_s)
                truck.timer_s = 0.0
                self._transition(truck, "dumping")

    @staticmethod
    def _transition(truck: Truck, state: str):
        if truck.state != state:
            truck.state = state
            truck.state_history.append(state)

    def _step_truck(self, truck: Truck, dt: float):
        if truck.state in {"breakdown", "waiting_loading", "waiting_crusher"}:
            return

        road_factor = self.speed_factor()
        speed_kmh = 25.0 * road_factor

        if truck.state in {"loading", "dumping"}:
            truck.timer_s += dt
            required = LOAD_SECONDS if truck.state == "loading" else DUMP_SECONDS
            if truck.timer_s < required:
                return
            completed_duration = truck.timer_s
            truck.timer_s = 0.0
            if truck.state == "loading":
                truck.last_loading_s = completed_duration
                truck.payload_t = CAPACITY_T
                self.extracted_t += CAPACITY_T
                truck.direction = 1
                self._transition(truck, "hauling")
                truck.movement_started_s = self.sim_time_s
            else:
                truck.last_dump_s = completed_duration
                delivered = truck.payload_t
                self.delivered_t += delivered
                self.rom_inventory_t += delivered
                truck.payload_t = 0.0
                truck.direction = -1
                self._transition(truck, "returning")
                truck.movement_started_s = self.sim_time_s
                truck.trips += 1
            return

        delta = speed_kmh * dt / 3600.0 / ROUTE_KM
        truck.progress = max(0.0, min(1.0, truck.progress + delta * truck.direction))
        truck.fuel_pct = max(0.0, truck.fuel_pct - delta * (1.4 if truck.direction == 1 else 0.8))
        if truck.progress >= 1.0 and truck.direction == 1:
            truck.last_haul_s = max(0.0, self.sim_time_s - truck.movement_started_s)
            self._transition(truck, "waiting_crusher")
            truck.queue_entered_s = self.sim_time_s
            truck.timer_s = 0.0
        elif truck.progress <= 0.0 and truck.direction == -1:
            truck.last_return_s = max(0.0, self.sim_time_s - truck.movement_started_s)
            self._transition(truck, "waiting_loading")
            truck.queue_entered_s = self.sim_time_s
            truck.timer_s = 0.0

    @staticmethod
    def position(progress: float):
        scaled = progress * (len(ROUTE) - 1)
        index = min(int(scaled), len(ROUTE) - 2)
        fraction = scaled - index
        start, end = ROUTE[index], ROUTE[index + 1]
        return start[0] + (end[0] - start[0]) * fraction, start[1] + (end[1] - start[1]) * fraction

    def speed_factor(self):
        if self.scenario == "truck_breakdown":
            # A stopped truck constrains the single active haul lane until recovery.
            return TRUCK_BREAKDOWN_SPEED_FACTOR
        if self.scenario == "road_closure":
            return ROAD_CLOSURE_SPEED_FACTOR
        return 1.0

    def projected_throughput_tph(self):
        active_trucks = len(self.trucks) - (1 if self.scenario == "truck_breakdown" else 0)
        speed_kmh = 25.0 * self.speed_factor()
        cycle_s = LOAD_SECONDS + DUMP_SECONDS + 2 * ROUTE_KM / speed_kmh * 3600.0
        fleet_supply_tph = active_trucks * CAPACITY_T * 3600.0 / cycle_s
        excavator_supply_tph = CAPACITY_T * 3600.0 / LOAD_SECONDS
        crusher_capacity = BASE_CRUSHER_TPH * (0.55 if self.scenario == "crusher_slowdown" else 1.0)
        return min(fleet_supply_tph, excavator_supply_tph, crusher_capacity)

    def baseline_throughput_tph(self):
        speed_kmh = 25.0
        cycle_s = LOAD_SECONDS + DUMP_SECONDS + 2 * ROUTE_KM / speed_kmh * 3600.0
        fleet_supply_tph = len(self.trucks) * CAPACITY_T * 3600.0 / cycle_s
        excavator_supply_tph = CAPACITY_T * 3600.0 / LOAD_SECONDS
        return min(fleet_supply_tph, excavator_supply_tph, BASE_CRUSHER_TPH)

    def mass_balance(self):
        """Return the complete ore balance for validation and telemetry."""
        truck_payload_t = sum(truck.payload_t for truck in self.trucks)
        accounted_t = self.production_t + self.rom_inventory_t + truck_payload_t
        supplied_t = INITIAL_ROM_T + self.extracted_t
        return {
            "initial_rom_t": INITIAL_ROM_T,
            "extracted_t": self.extracted_t,
            "truck_payload_t": truck_payload_t,
            "rom_inventory_t": self.rom_inventory_t,
            "processed_t": self.production_t,
            "balance_error_t": supplied_t - accounted_t,
        }

    def snapshot(self):
        with self.lock:
            operational = [t for t in self.trucks if t.state != "breakdown"]
            moving = [t for t in operational if t.state in {"hauling", "returning"}]
            cycles = [t.last_cycle_s for t in self.trucks if t.last_cycle_s > 0]
            loading_waits = [t.last_loading_wait_s for t in self.trucks if t.cycle_started_s > 0]
            crusher_waits = [t.last_crusher_wait_s for t in self.trucks if t.trips > 0]
            window_h = max(self.sim_time_s / 3600.0, 1 / 60)
            throughput = self.production_t / window_h
            crusher_capacity = BASE_CRUSHER_TPH * (0.55 if self.scenario == "crusher_slowdown" else 1.0)
            projected_throughput = self.projected_throughput_tph()
            baseline_throughput = self.baseline_throughput_tph()
            impact = round(100 * (projected_throughput / baseline_throughput - 1))
            balance = self.mass_balance()
            elapsed = max(self.sim_time_s, 1.0)
            fleet_operating_s = sum(truck.operating_s for truck in self.trucks)
            total_trips = sum(truck.trips for truck in self.trucks)
            loading_order = {
                truck.name: index + 1
                for index, truck in enumerate(sorted(
                    (truck for truck in self.trucks if truck.state == "waiting_loading"),
                    key=lambda item: (item.queue_entered_s, item.name),
                ))
            }
            crusher_order = {
                truck.name: index + 1
                for index, truck in enumerate(sorted(
                    (truck for truck in self.trucks if truck.state == "waiting_crusher"),
                    key=lambda item: (item.queue_entered_s, item.name),
                ))
            }
            things = {
                "mine-01": {
                    "production_t": self.metric(self.production_t, "t"),
                    "throughput_tph": self.metric(min(throughput, crusher_capacity), "t/h"),
                    "fleet_utilization": self.metric(100 * fleet_operating_s / (elapsed * len(self.trucks)), "%"),
                    "excavator_utilization": self.metric(100 * self.excavator_busy_s / elapsed, "%"),
                    "dump_point_utilization": self.metric(100 * self.dump_point_busy_s / elapsed, "%"),
                    "crusher_utilization": self.metric(100 * self.crusher_busy_s / elapsed, "%"),
                    "average_loading_queue": self.metric(self.loading_queue_time_s / elapsed, "trucks"),
                    "average_crusher_queue": self.metric(self.crusher_queue_time_s / elapsed, "trucks"),
                    "trips_per_hour": self.metric(total_trips * 3600 / elapsed, "trips/h"),
                    "average_cycle_min": self.metric(sum(cycles) / len(cycles) / 60 if cycles else 0, "min"),
                    "average_loading_wait_min": self.metric(sum(loading_waits) / len(loading_waits) / 60 if loading_waits else 0, "min"),
                    "average_crusher_wait_min": self.metric(sum(crusher_waits) / len(crusher_waits) / 60 if crusher_waits else 0, "min"),
                    "extracted_total_t": self.metric(balance["extracted_t"], "t"),
                    "truck_payload_total_t": self.metric(balance["truck_payload_t"], "t"),
                    "mass_balance_error_t": self.metric(balance["balance_error_t"], "t"),
                    "active_scenario": self.metric(self.scenario),
                    "sim_time_s": self.metric(self.sim_time_s, "s"),
                },
                "excavator-01": {
                    "state": self.metric("loading" if any(t.state == "loading" for t in self.trucks) else "ready"),
                    "resource_busy": self.metric(any(t.state == "loading" for t in self.trucks)),
                    "queue_length": self.metric(sum(t.state == "waiting_loading" for t in self.trucks)),
                    "position_x": self.metric(-25), "position_z": self.metric(-18),
                },
                "crusher-01": {
                    "state": self.metric("constrained" if self.scenario == "crusher_slowdown" else "operating"),
                    "dump_point_busy": self.metric(any(t.state == "dumping" for t in self.trucks)),
                    "capacity_tph": self.metric(crusher_capacity, "t/h"),
                    "queue_length": self.metric(sum(t.state == "waiting_crusher" for t in self.trucks)),
                    "rom_inventory_t": self.metric(self.rom_inventory_t, "t"),
                    "processed_total_t": self.metric(self.production_t, "t"),
                    "position_x": self.metric(27), "position_z": self.metric(18),
                },
                "road-main": {
                    "state": self.metric("restricted" if self.scenario == "road_closure" else "open"),
                    "speed_limit_kmh": self.metric(25 * self.speed_factor(), "km/h"),
                    "traffic_count": self.metric(len(moving)),
                },
                "scenario-controller": {
                    "active": self.metric(self.scenario),
                    "description": self.metric(SCENARIO_DETAILS[self.scenario][0]),
                    "affected_assets": self.metric(SCENARIO_DETAILS[self.scenario][1]),
                    "elapsed_min": self.metric((self.sim_time_s - self.scenario_started_s) / 60, "min"),
                    "impact_pct": self.metric(impact, "%"),
                    "baseline_throughput_tph": self.metric(baseline_throughput, "t/h"),
                    "projected_throughput_tph": self.metric(projected_throughput, "t/h"),
                },
            }
            for truck in self.trucks:
                x, z = self.position(truck.progress)
                if truck.state == "loading":
                    payload_fill_pct = 100 * min(1.0, truck.timer_s / LOAD_SECONDS)
                elif truck.state == "dumping":
                    payload_fill_pct = 100 * max(0.0, 1.0 - truck.timer_s / DUMP_SECONDS)
                elif truck.payload_t > 0:
                    payload_fill_pct = 100.0
                else:
                    payload_fill_pct = 0.0
                things[truck.name] = {
                    "state": self.metric(truck.state),
                    "payload_t": self.metric(truck.payload_t, "t"),
                    "payload_fill_pct": self.metric(payload_fill_pct, "%"),
                    "fuel_pct": self.metric(truck.fuel_pct, "%"),
                    "speed_kmh": self.metric(
                        0 if truck.state not in {"hauling", "returning"}
                        else 25 * self.speed_factor(),
                        "km/h",
                    ),
                    "route_progress_pct": self.metric(truck.progress * 100, "%"),
                    "queue_position": self.metric(
                        loading_order.get(truck.name, crusher_order.get(truck.name, 0)),
                    ),
                    "position_x": self.metric(x), "position_z": self.metric(z),
                    "heading": self.metric(1 if truck.direction == 1 else -1),
                    "trips_total": self.metric(truck.trips),
                    "cycle_time_min": self.metric(truck.last_cycle_s / 60, "min"),
                    "loading_wait_min": self.metric(truck.last_loading_wait_s / 60, "min"),
                    "crusher_wait_min": self.metric(truck.last_crusher_wait_s / 60, "min"),
                    "loading_time_min": self.metric(truck.last_loading_s / 60, "min"),
                    "haul_time_min": self.metric(truck.last_haul_s / 60, "min"),
                    "dumping_time_min": self.metric(truck.last_dump_s / 60, "min"),
                    "return_time_min": self.metric(truck.last_return_s / 60, "min"),
                }
            return things

    @staticmethod
    def metric(value, unit=None):
        result = {"value": round(value, 2) if isinstance(value, float) else value}
        if unit:
            result["unit"] = unit
        return result

