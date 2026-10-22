"""Deterministic discrete-event model of the Ademix open-pit haulage and crusher system.

The model is event-driven: trucks move between scheduled events (arrival, end of
loading, end of dumping, bin space available, road cleared). ``step(dt)`` simply
advances the clock to ``now + dt`` and processes every event on the way, so results
do not depend on the publishing tick size. Formulas, units, sources and
limitations are documented in ``MODEL.md`` next to this file.

Limited resources:
- one excavator that loads one truck at a time (FIFO queue at the face);
- one crusher dump bay that accepts one truck at a time (FIFO queue at the crusher);
- a run-of-mine (ROM) bin of limited capacity that the crusher draws from;
- one single-lane haul road whose speed limit and blockages apply to every truck.
"""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass
import heapq
import itertools
import math
import random
from threading import RLock

ROUTE = [(-25.0, -18.0), (-16.0, -8.0), (-8.0, 2.0), (3.0, 8.0), (15.0, 12.0), (27.0, 18.0)]
ROUTE_KM = 3.2
TRUCK_COUNT = 6
CAPACITY_T = 77.0
BASE_SPEED_KMH = 25.0
# OpenMines North Pit reference: 77 t trucks at 25 km/h, 20.32 t shovel pass every
# 1.5 min, 1 min dump. ceil(77 / 20.32) = 4 passes, so one truck loads in 6 min.
SHOVEL_PASS_T = 20.32
SHOVEL_PASS_S = 90.0
LOAD_PASSES = math.ceil(CAPACITY_T / SHOVEL_PASS_T)
LOAD_SECONDS = LOAD_PASSES * SHOVEL_PASS_S
DUMP_SECONDS = 60.0
# Team planning assumptions (not manufacturer or site data).
BASE_CRUSHER_TPH = 900.0
CRUSHER_SLOWDOWN_FACTOR = 0.55
ROM_BIN_CAPACITY_T = 600.0
INITIAL_ROM_T = 250.0
# Scenario inputs chosen by the team for the what-if demonstration.
ROAD_RESTRICTION_SPEED_KMH = 10.72
BREAKDOWN_TRUCK = "truck-01"
BREAKDOWN_RECOVERY_S = 1200.0
# Fuel is a synthetic visual signal: % of tank per full route length travelled.
FUEL_PCT_PER_ROUTE_LOADED = 1.4
FUEL_PCT_PER_ROUTE_EMPTY = 0.8
KPI_WINDOW_S = 3600.0

SCENARIOS = {
    "baseline": "Normal operations",
    "truck_breakdown": "Truck HT-01 breakdown",
    "road_closure": "Main road restriction",
    "crusher_slowdown": "Crusher capacity −45%",
}
TRAVEL_STATES = {"hauling", "returning"}
PRODUCTIVE_STATES = {"loading", "hauling", "dumping", "returning"}
TRUCK_STATES = (
    "queued_at_excavator", "loading", "hauling", "queued_at_crusher",
    "dumping", "returning", "blocked", "breakdown",
)
EPS_T = 1e-6


@dataclass
class Truck:
    name: str
    progress: float
    direction: int = 1
    payload_t: float = 0.0
    fuel_pct: float = 100.0
    state: str = "returning"
    trips: int = 0
    last_cycle_s: float = 0.0
    last_wait_s: float = 0.0
    cycle_wait_s: float = 0.0
    last_dump_end_s: float | None = None
    wait_started_s: float = 0.0
    token: int = 0
    travel_from: float = 0.0
    travel_target: float = 0.0
    travel_start_s: float = 0.0
    travel_speed_kmh: float = 0.0
    travel_blocked: bool = False


def crusher_capacity_tph(scenario: str) -> float:
    return BASE_CRUSHER_TPH * (CRUSHER_SLOWDOWN_FACTOR if scenario == "crusher_slowdown" else 1.0)


def road_speed_kmh(scenario: str) -> float:
    return ROAD_RESTRICTION_SPEED_KMH if scenario == "road_closure" else BASE_SPEED_KMH


def projection(scenario: str) -> dict:
    """Steady-state capacity of each stage of the cycle (t/h) and the binding one.

    For a closed, deterministic cyclic system, long-run throughput is the minimum of
    the fleet's free-running supply and the capacity of each single server.
    """
    if scenario not in SCENARIOS:
        raise ValueError(f"unknown scenario: {scenario}")
    active = TRUCK_COUNT - (1 if scenario == "truck_breakdown" else 0)
    travel_s = 2 * ROUTE_KM / road_speed_kmh(scenario) * 3600.0
    free_cycle_s = LOAD_SECONDS + DUMP_SECONDS + travel_s
    limits = {
        "haulage fleet": active * CAPACITY_T * 3600.0 / free_cycle_s,
        "excavator": CAPACITY_T * 3600.0 / LOAD_SECONDS,
        "dump bay": CAPACITY_T * 3600.0 / DUMP_SECONDS,
        "crusher": crusher_capacity_tph(scenario),
    }
    bottleneck = min(limits, key=limits.get)
    return {
        "active_trucks": active,
        "free_cycle_min": free_cycle_s / 60.0,
        "match_factor": active * LOAD_SECONDS / free_cycle_s,
        "limits_tph": limits,
        "bottleneck": bottleneck,
        "throughput_tph": limits[bottleneck],
    }


class MineEngine:
    def __init__(self, seed: int = 42):
        self.lock = RLock()
        self.rng = random.Random(seed)
        self.sim_time_s = 0.0
        self.production_t = 0.0
        self.delivered_t = 0.0
        self.excavated_t = 0.0
        self.rom_inventory_t = INITIAL_ROM_T
        self.scenario = "baseline"
        self.scenario_started_s = 0.0
        self.blockage: tuple[float, float] | None = None
        self._events: list = []
        self._seq = itertools.count()
        self._crusher_token = 0
        self._blockage_token = 0
        self._last_sync_s = 0.0
        self._history = deque([(0.0, 0.0)])
        self.excavator_queue: deque[Truck] = deque()
        self.excavator_truck: Truck | None = None
        self.dump_queue: deque[Truck] = deque()
        self.dump_truck: Truck | None = None
        self.trucks = [
            Truck(f"truck-{i:02d}", (i - 1) / TRUCK_COUNT, payload_t=CAPACITY_T, state="hauling")
            for i in range(1, TRUCK_COUNT + 1)
        ]
        for truck in self.trucks:
            truck.fuel_pct = self.rng.uniform(68, 98)
        self.opening_stock_t = INITIAL_ROM_T + sum(t.payload_t for t in self.trucks)
        self._reset_window()
        for truck in self.trucks:
            self._start_travel(truck)

    # ----------------------------------------------------------------- control

    def set_scenario(self, scenario: str):
        if scenario not in SCENARIOS:
            raise ValueError(f"unknown scenario: {scenario}")
        with self.lock:
            if scenario == self.scenario:
                return
            if self.scenario == "truck_breakdown":
                self._recover_breakdown()
            self.scenario = scenario
            self.scenario_started_s = self.sim_time_s
            self._reset_window()
            if scenario == "truck_breakdown":
                self._break_down(self._truck(BREAKDOWN_TRUCK))
            self._replan_travel()
            self._crusher_token += 1
            self._try_start_dump()

    def step(self, dt: float):
        if dt <= 0:
            raise ValueError("step duration must be positive")
        with self.lock:
            target = self.sim_time_s + dt
            while self._events and self._events[0][0] <= target:
                time_s, _, kind, subject, token = heapq.heappop(self._events)
                self._sync(time_s)
                self._handle(kind, subject, token)
            self._sync(target)

    # ------------------------------------------------------------ event core

    def _schedule(self, delay_s: float, kind: str, subject=None, token: int = 0):
        heapq.heappush(self._events, (self.sim_time_s + delay_s, next(self._seq), kind, subject, token))

    def _sync(self, time_s: float):
        """Integrate continuous quantities (crusher draw, state durations) up to ``time_s``."""
        span = time_s - self._last_sync_s
        if span > 0:
            stats = self.window
            for truck in self.trucks:
                stats["truck_s"][truck.state] += span
            if self.excavator_truck:
                stats["excavator_busy_s"] += span
            if self.dump_truck:
                stats["dump_busy_s"] += span
            rate_tps = crusher_capacity_tph(self.scenario) / 3600.0
            run = min(span, self.rom_inventory_t / rate_tps)
            if run > 0:
                processed = run * rate_tps
                self.rom_inventory_t = max(0.0, self.rom_inventory_t - processed)
                if run < span:
                    self.rom_inventory_t = 0.0
                self.production_t += processed
                stats["crusher_busy_s"] += run
                if run < span:
                    self._history.append((self._last_sync_s + run, self.production_t))
        self._last_sync_s = time_s
        self.sim_time_s = time_s
        self._history.append((time_s, self.production_t))
        while len(self._history) > 2 and self._history[1][0] <= time_s - KPI_WINDOW_S:
            self._history.popleft()

    def _handle(self, kind: str, truck: Truck | None, token: int):
        if kind == "bin_space":
            if token == self._crusher_token:
                self._try_start_dump()
            return
        if kind == "road_cleared":
            if token == self._blockage_token and self.blockage:
                self.blockage = None
                for other in self.trucks:
                    if other.state == "blocked":
                        self._start_travel(other)
            return
        if token != truck.token:
            return  # superseded by a speed change, blockage or breakdown
        if kind == "arrive":
            self._commit_travel(truck)
            if truck.travel_blocked:
                truck.state = "blocked"
            elif truck.direction == 1:
                self._join_crusher_queue(truck)
            else:
                self._join_excavator_queue(truck)
        elif kind == "load_done":
            truck.payload_t = CAPACITY_T
            self.excavated_t += CAPACITY_T
            self.window["loads"] += 1
            self.excavator_truck = None
            truck.direction = 1
            self._start_travel(truck)
            self._try_start_loading()
        elif kind == "dump_done":
            self.rom_inventory_t += truck.payload_t
            self.delivered_t += truck.payload_t
            self.window["delivered_t"] += truck.payload_t
            truck.payload_t = 0.0
            truck.trips += 1
            self.window["trips"] += 1
            if truck.last_dump_end_s is not None:
                truck.last_cycle_s = self.sim_time_s - truck.last_dump_end_s
                truck.last_wait_s = truck.cycle_wait_s
                self.window["cycles_s"].append(truck.last_cycle_s)
            truck.last_dump_end_s = self.sim_time_s
            truck.cycle_wait_s = 0.0
            self.dump_truck = None
            truck.direction = -1
            self._start_travel(truck)
            self._try_start_dump()

    # -------------------------------------------------------------- resources

    def _join_excavator_queue(self, truck: Truck):
        truck.progress, truck.state, truck.wait_started_s = 0.0, "queued_at_excavator", self.sim_time_s
        self.excavator_queue.append(truck)
        self._try_start_loading()

    def _try_start_loading(self):
        if self.excavator_truck or not self.excavator_queue:
            return
        truck = self.excavator_queue.popleft()
        wait = self.sim_time_s - truck.wait_started_s
        truck.cycle_wait_s += wait
        self.window["excavator_waits_s"].append(wait)
        truck.state = "loading"
        self.excavator_truck = truck
        truck.token += 1
        self._schedule(LOAD_SECONDS, "load_done", truck, truck.token)

    def _join_crusher_queue(self, truck: Truck):
        truck.progress, truck.state, truck.wait_started_s = 1.0, "queued_at_crusher", self.sim_time_s
        self.dump_queue.append(truck)
        self._try_start_dump()

    def _try_start_dump(self):
        if self.dump_truck or not self.dump_queue:
            return
        truck = self.dump_queue[0]
        overflow_t = self.rom_inventory_t + truck.payload_t - ROM_BIN_CAPACITY_T
        if overflow_t > EPS_T:
            # The dump pocket cannot accept a full load until the crusher draws the bin down.
            self._crusher_token += 1
            rate_tps = crusher_capacity_tph(self.scenario) / 3600.0
            self._schedule(overflow_t / rate_tps, "bin_space", None, self._crusher_token)
            return
        self.dump_queue.popleft()
        wait = self.sim_time_s - truck.wait_started_s
        truck.cycle_wait_s += wait
        self.window["crusher_waits_s"].append(wait)
        truck.state = "dumping"
        self.dump_truck = truck
        truck.token += 1
        self._schedule(DUMP_SECONDS, "dump_done", truck, truck.token)

    # ----------------------------------------------------------------- travel

    def speed_kmh(self) -> float:
        return road_speed_kmh(self.scenario)

    def speed_factor(self) -> float:
        return self.speed_kmh() / BASE_SPEED_KMH

    def _start_travel(self, truck: Truck):
        truck.state = "hauling" if truck.direction == 1 else "returning"
        target, blocked = (1.0 if truck.direction == 1 else 0.0), False
        if self.blockage and truck.name != BREAKDOWN_TRUCK:
            point = self.blockage[0]
            if (truck.direction == 1 and truck.progress < point) or (truck.direction == -1 and truck.progress > point):
                target, blocked = point, True
        truck.travel_from, truck.travel_target, truck.travel_blocked = truck.progress, target, blocked
        truck.travel_start_s, truck.travel_speed_kmh = self.sim_time_s, self.speed_kmh()
        truck.token += 1
        duration_s = abs(target - truck.progress) * ROUTE_KM / truck.travel_speed_kmh * 3600.0
        self._schedule(duration_s, "arrive", truck, truck.token)

    def _progress_now(self, truck: Truck) -> float:
        if truck.state not in TRAVEL_STATES:
            return truck.progress
        moved = truck.travel_speed_kmh * (self.sim_time_s - truck.travel_start_s) / 3600.0 / ROUTE_KM
        moved = min(moved, abs(truck.travel_target - truck.travel_from))
        return truck.travel_from + truck.direction * moved

    def _fuel_now(self, truck: Truck) -> float:
        burn = FUEL_PCT_PER_ROUTE_LOADED if truck.payload_t > 0 else FUEL_PCT_PER_ROUTE_EMPTY
        return max(0.0, truck.fuel_pct - abs(self._progress_now(truck) - truck.progress) * burn)

    def _commit_travel(self, truck: Truck):
        truck.fuel_pct = self._fuel_now(truck)
        truck.progress = self._progress_now(truck)
        truck.travel_from, truck.travel_start_s = truck.progress, self.sim_time_s

    def _replan_travel(self):
        """Re-schedule moving trucks after a speed limit or blockage change."""
        for truck in self.trucks:
            if truck.state in TRAVEL_STATES:
                self._commit_travel(truck)
                self._start_travel(truck)

    # -------------------------------------------------------------- breakdown

    def _truck(self, name: str) -> Truck:
        return next(t for t in self.trucks if t.name == name)

    def _break_down(self, truck: Truck):
        if truck.state in TRAVEL_STATES:
            self._commit_travel(truck)
            # A stopped truck blocks the single-lane road until it is towed aside.
            self._blockage_token += 1
            self.blockage = (truck.progress, self.sim_time_s + BREAKDOWN_RECOVERY_S)
            self._schedule(BREAKDOWN_RECOVERY_S, "road_cleared", None, self._blockage_token)
        elif truck.state == "queued_at_excavator":
            self.excavator_queue.remove(truck)
        elif truck.state == "queued_at_crusher":
            self.dump_queue.remove(truck)
        elif truck.state == "loading":
            self.excavator_truck = None  # the partial bucket load stays at the face
        elif truck.state == "dumping":
            self.dump_truck = None  # the payload stays on the truck
        truck.token += 1
        truck.state = "breakdown"
        self._try_start_loading()
        self._try_start_dump()

    def _recover_breakdown(self):
        if self.blockage:
            self.blockage = None
            for other in self.trucks:
                if other.state == "blocked":
                    self._start_travel(other)
        truck = self._truck(BREAKDOWN_TRUCK)
        if truck.state != "breakdown":
            return
        truck.last_dump_end_s, truck.cycle_wait_s = None, 0.0  # downtime is not a haul cycle
        loaded = truck.payload_t > 0
        if loaded and truck.progress >= 1.0:
            self._join_crusher_queue(truck)
        elif not loaded and truck.progress <= 0.0:
            self._join_excavator_queue(truck)
        else:
            truck.direction = 1 if loaded else -1
            self._start_travel(truck)

    # ---------------------------------------------------------------- metrics

    def _reset_window(self):
        self.window = {
            "start_s": self.sim_time_s,
            "truck_s": {state: 0.0 for state in TRUCK_STATES},
            "excavator_busy_s": 0.0, "dump_busy_s": 0.0, "crusher_busy_s": 0.0,
            "excavator_waits_s": [], "crusher_waits_s": [], "cycles_s": [],
            "loads": 0, "trips": 0, "delivered_t": 0.0,
        }

    def _production_at(self, time_s: float) -> float:
        points = list(self._history)
        if time_s <= points[0][0]:
            return points[0][1]
        for (t0, p0), (t1, p1) in zip(points, points[1:]):
            if t0 <= time_s <= t1:
                return p0 if t1 == t0 else p0 + (p1 - p0) * (time_s - t0) / (t1 - t0)
        return points[-1][1]

    def rolling_throughput_tph(self) -> float:
        span = min(KPI_WINDOW_S, self.sim_time_s)
        if span <= 0:
            return 0.0
        return (self.production_t - self._production_at(self.sim_time_s - span)) / span * 3600.0

    def ore_in_trucks_t(self) -> float:
        return sum(t.payload_t for t in self.trucks)

    def mass_balance_error_t(self) -> float:
        """Opening stock + excavated − (in trucks + ROM + processed); zero when conserved."""
        return (self.opening_stock_t + self.excavated_t
                - self.ore_in_trucks_t() - self.rom_inventory_t - self.production_t)

    def projected_throughput_tph(self) -> float:
        return projection(self.scenario)["throughput_tph"]

    def kpis(self) -> dict:
        """Operational KPIs; time-based ones cover the window since the scenario started."""
        with self.lock:
            stats = self.window
            elapsed = self.sim_time_s - stats["start_s"]
            truck_time = sum(stats["truck_s"].values())

            def share(seconds, total):
                return 100.0 * seconds / total if total > 0 else 0.0

            def mean(values):
                return sum(values) / len(values) if values else 0.0

            cycles = stats["cycles_s"] or [t.last_cycle_s for t in self.trucks if t.last_cycle_s > 0]
            return {
                "window_h": elapsed / 3600.0,
                "throughput_tph": self.rolling_throughput_tph(),
                "throughput_avg_tph": self.production_t / self.sim_time_s * 3600.0 if self.sim_time_s else 0.0,
                "fleet_utilization_pct": share(sum(stats["truck_s"][s] for s in PRODUCTIVE_STATES), truck_time),
                "truck_queue_pct": share(stats["truck_s"]["queued_at_excavator"] + stats["truck_s"]["queued_at_crusher"], truck_time),
                "truck_blocked_pct": share(stats["truck_s"]["blocked"], truck_time),
                "truck_down_pct": share(stats["truck_s"]["breakdown"], truck_time),
                "excavator_utilization_pct": share(stats["excavator_busy_s"], elapsed),
                "dump_bay_utilization_pct": share(stats["dump_busy_s"], elapsed),
                "crusher_utilization_pct": share(stats["crusher_busy_s"], elapsed),
                "average_cycle_min": mean(cycles) / 60.0,
                "excavator_wait_min": mean(stats["excavator_waits_s"]) / 60.0,
                "crusher_wait_min": mean(stats["crusher_waits_s"]) / 60.0,
                "window_trips": stats["trips"],
                "window_delivered_tph": stats["delivered_t"] / elapsed * 3600.0 if elapsed else 0.0,
            }

    @staticmethod
    def position(progress: float):
        scaled = progress * (len(ROUTE) - 1)
        index = min(int(scaled), len(ROUTE) - 2)
        fraction = scaled - index
        start, end = ROUTE[index], ROUTE[index + 1]
        return start[0] + (end[0] - start[0]) * fraction, start[1] + (end[1] - start[1]) * fraction

    def snapshot(self):
        with self.lock:
            kpi = self.kpis()
            plan = projection(self.scenario)
            baseline = projection("baseline")["throughput_tph"]
            capacity = crusher_capacity_tph(self.scenario)
            moving = [t for t in self.trucks if t.state in TRAVEL_STATES]
            blocked = [t for t in self.trucks if t.state == "blocked"]
            if self.scenario == "crusher_slowdown":
                crusher_state = "constrained"
            elif self.rom_inventory_t <= EPS_T:
                crusher_state = "starved"
            else:
                crusher_state = "operating"
            blockage = "none"
            if self.blockage:
                blockage = f"HT-01 stopped at {self.blockage[0] * ROUTE_KM:.2f} km, cleared at {self.blockage[1] / 60:.0f} min"
            things = {
                "mine-01": {
                    "production_t": self.metric(self.production_t, "t"),
                    "throughput_tph": self.metric(kpi["throughput_tph"], "t/h"),
                    "fleet_utilization": self.metric(kpi["fleet_utilization_pct"], "%"),
                    "average_cycle_min": self.metric(kpi["average_cycle_min"], "min"),
                    "active_scenario": self.metric(self.scenario),
                    "sim_time_s": self.metric(self.sim_time_s, "s"),
                    "throughput_avg_tph": self.metric(kpi["throughput_avg_tph"], "t/h"),
                    "excavated_t": self.metric(self.excavated_t, "t"),
                    "delivered_t": self.metric(self.delivered_t, "t"),
                    "ore_in_trucks_t": self.metric(self.ore_in_trucks_t(), "t"),
                    "mass_balance_error_t": self.metric(round(self.mass_balance_error_t(), 6), "t"),
                    "truck_trips_total": self.metric(sum(t.trips for t in self.trucks)),
                    "truck_queue_pct": self.metric(kpi["truck_queue_pct"], "%"),
                    "bottleneck": self.metric(plan["bottleneck"]),
                },
                "excavator-01": {
                    "state": self.metric("loading" if self.excavator_truck else "ready"),
                    "queue_length": self.metric(len(self.excavator_queue)),
                    "position_x": self.metric(-25), "position_z": self.metric(-18),
                    "utilization_pct": self.metric(kpi["excavator_utilization_pct"], "%"),
                    "average_wait_min": self.metric(kpi["excavator_wait_min"], "min"),
                    "loading_truck": self.metric(self.excavator_truck.name if self.excavator_truck else "none"),
                },
                "crusher-01": {
                    "state": self.metric(crusher_state),
                    "capacity_tph": self.metric(capacity, "t/h"),
                    "queue_length": self.metric(len(self.dump_queue)),
                    "rom_inventory_t": self.metric(self.rom_inventory_t, "t"),
                    "processed_total_t": self.metric(self.production_t, "t"),
                    "position_x": self.metric(27), "position_z": self.metric(18),
                    "rom_bin_capacity_t": self.metric(ROM_BIN_CAPACITY_T, "t"),
                    "utilization_pct": self.metric(kpi["crusher_utilization_pct"], "%"),
                    "average_wait_min": self.metric(kpi["crusher_wait_min"], "min"),
                    "delivered_total_t": self.metric(self.delivered_t, "t"),
                },
                "road-main": {
                    "state": self.metric("restricted" if self.scenario == "road_closure" or self.blockage else "open"),
                    "speed_limit_kmh": self.metric(self.speed_kmh(), "km/h"),
                    "traffic_count": self.metric(len(moving)),
                    "blockage": self.metric(blockage),
                    "blocked_trucks": self.metric(len(blocked)),
                },
                "scenario-controller": {
                    "active": self.metric(self.scenario),
                    "description": self.metric(SCENARIOS[self.scenario]),
                    "impact_pct": self.metric(round(100 * (plan["throughput_tph"] / baseline - 1))),
                    "baseline_throughput_tph": self.metric(baseline, "t/h"),
                    "projected_throughput_tph": self.metric(plan["throughput_tph"], "t/h"),
                    "bottleneck": self.metric(plan["bottleneck"]),
                    "match_factor": self.metric(plan["match_factor"]),
                    "fleet_supply_tph": self.metric(plan["limits_tph"]["haulage fleet"], "t/h"),
                    "excavator_capacity_tph": self.metric(plan["limits_tph"]["excavator"], "t/h"),
                    "crusher_capacity_tph": self.metric(plan["limits_tph"]["crusher"], "t/h"),
                },
            }
            for truck in self.trucks:
                progress = self._progress_now(truck)
                x, z = self.position(progress)
                things[truck.name] = {
                    "state": self.metric(truck.state),
                    "payload_t": self.metric(truck.payload_t, "t"),
                    "fuel_pct": self.metric(self._fuel_now(truck), "%"),
                    "speed_kmh": self.metric(truck.travel_speed_kmh if truck.state in TRAVEL_STATES else 0, "km/h"),
                    "position_x": self.metric(x), "position_z": self.metric(z),
                    "heading": self.metric(1 if truck.direction == 1 else -1),
                    "trips_total": self.metric(truck.trips),
                    "cycle_time_min": self.metric(truck.last_cycle_s / 60, "min"),
                    "queue_wait_min": self.metric(truck.last_wait_s / 60, "min"),
                    "route_progress_pct": self.metric(100 * progress, "%"),
                }
            return things

    @staticmethod
    def metric(value, unit=None):
        result = {"value": round(value, 2) if isinstance(value, float) else value}
        if unit:
            result["unit"] = unit
        return result
