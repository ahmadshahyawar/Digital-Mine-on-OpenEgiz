"""Deterministic discrete-event model of the Ademix open-pit haulage and crusher system.

The model is event-driven: trucks move between scheduled events (arrival, end of
loading, end of dumping, bin space available, road cleared). ``step(dt)`` simply
advances the clock to ``now + dt`` and processes every event on the way, so results
do not depend on the publishing tick size. Formulas, units, sources and
limitations are documented in ``MODEL.md``; the what-if scenarios and bottleneck
analysis in ``SCENARIOS.md``.

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
# Dynamic bottleneck detection: measured over the last 30 simulated minutes; a
# server is saturated when busy at least 95 % of that time.
BOTTLENECK_WINDOW_S = 1800.0
SATURATED_SHARE = 0.95
QUEUE_PRESENT_TRUCKS = 0.05

SCENARIOS = {
    "baseline": "Normal operations",
    "truck_breakdown": "Truck HT-01 breakdown",
    "road_closure": "Main road restriction",
    "crusher_slowdown": "Crusher capacity −45%",
}
LOADING, ROAD, FLEET, DUMP, CRUSHER = (
    "loading resource", "haul-road travel", "available truck fleet",
    "dump point", "crusher processing capacity",
)
TRAVEL_STATES = {"hauling", "returning"}
PRODUCTIVE_STATES = {"loading", "hauling", "dumping", "returning"}
TRUCK_STATES = (
    "queued_at_excavator", "loading", "hauling", "queued_at_crusher",
    "dumping", "returning", "blocked", "breakdown",
)
# Legal truck-cycle transitions. "hauling -> hauling" is a re-plan after a speed or
# blockage change; anything else (a skipped stage) raises immediately.
ALLOWED_TRANSITIONS = {
    "queued_at_excavator": {"loading", "breakdown"},
    "loading": {"hauling", "breakdown"},
    "hauling": {"hauling", "queued_at_crusher", "blocked", "breakdown"},
    "queued_at_crusher": {"dumping", "breakdown"},
    "dumping": {"returning", "breakdown"},
    "returning": {"returning", "queued_at_excavator", "blocked", "breakdown"},
    "blocked": {"hauling", "returning"},
    "breakdown": {"hauling", "returning", "queued_at_excavator", "queued_at_crusher"},
}
COUNTERS = (
    "production_t", "excavator_busy_s", "dump_busy_s", "crusher_busy_s", "truck_s",
    "productive_s", "travel_s", "excavator_queue_s", "crusher_queue_s", "blocked_s",
    "down_s", "rom_ts", "delivered_t",
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


def projection(scenario: str, truck_count: int = TRUCK_COUNT) -> dict:
    """Steady-state capacity of each stage of the cycle (t/h) and the binding one.

    For a closed, deterministic cyclic system, long-run throughput is the minimum of
    the fleet's free-running supply and the capacity of each single server.
    """
    if scenario not in SCENARIOS:
        raise ValueError(f"unknown scenario: {scenario}")
    active = truck_count - (1 if scenario == "truck_breakdown" else 0)
    speed = road_speed_kmh(scenario)
    travel_s = 2 * ROUTE_KM / speed * 3600.0
    free_cycle_s = LOAD_SECONDS + DUMP_SECONDS + travel_s
    haulage = ROAD if speed < BASE_SPEED_KMH else FLEET
    limits = {
        haulage: active * CAPACITY_T * 3600.0 / free_cycle_s,
        LOADING: CAPACITY_T * 3600.0 / LOAD_SECONDS,
        DUMP: CAPACITY_T * 3600.0 / DUMP_SECONDS,
        CRUSHER: crusher_capacity_tph(scenario),
    }
    bottleneck = min(limits, key=limits.get)
    runner_up = min((k for k in limits if k != bottleneck), key=limits.get)
    reasons = {
        LOADING: f"One excavator loads a {CAPACITY_T:.0f} t truck every {LOAD_SECONDS / 60:.0f} min "
                 f"({limits[LOADING]:.0f} t/h), while {active} trucks could supply {limits[haulage]:.0f} t/h.",
        ROAD: f"At {speed:.2f} km/h a round trip takes {travel_s / 60:.1f} min, so {active} trucks "
              f"deliver only {limits[haulage]:.0f} t/h; the excavator ({limits[LOADING]:.0f} t/h) waits for trucks.",
        FLEET: f"{active} trucks on a {free_cycle_s / 60:.1f} min cycle supply only {limits[haulage]:.0f} t/h, "
               f"less than the excavator's {limits[LOADING]:.0f} t/h.",
        DUMP: f"The single dump bay accepts at most {limits[DUMP]:.0f} t/h.",
        CRUSHER: f"The crusher processes {limits[CRUSHER]:.0f} t/h, less than the {limits[runner_up]:.0f} t/h "
                 f"the {runner_up} can deliver; the ROM bin fills and trucks wait to dump.",
    }
    return {
        "active_trucks": active,
        "free_cycle_min": free_cycle_s / 60.0,
        "match_factor": active * LOAD_SECONDS / free_cycle_s,
        "limits_tph": limits,
        "bottleneck": bottleneck,
        "reason": reasons[bottleneck],
        "throughput_tph": limits[bottleneck],
    }


class MineEngine:
    def __init__(self, seed: int = 42, truck_count: int = TRUCK_COUNT):
        self.lock = RLock()
        self.rng = random.Random(seed)
        self.truck_count = truck_count
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
        self.cum = dict.fromkeys(COUNTERS, 0.0)
        self._history = deque([(0.0, tuple(self.cum.values()))])
        self.excavator_queue: deque[Truck] = deque()
        self.excavator_truck: Truck | None = None
        self.dump_queue: deque[Truck] = deque()
        self.dump_truck: Truck | None = None
        self.trucks = [
            Truck(f"truck-{i:02d}", (i - 1) / truck_count, payload_t=CAPACITY_T, state="hauling")
            for i in range(1, truck_count + 1)
        ]
        for truck in self.trucks:
            truck.fuel_pct = self.rng.uniform(68, 98)
        self.opening_stock_t = INITIAL_ROM_T + sum(t.payload_t for t in self.trucks)
        self.breakdown_location = "none"
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

    def _set_state(self, truck: Truck, state: str):
        if state not in ALLOWED_TRANSITIONS[truck.state]:
            raise RuntimeError(f"{truck.name}: illegal transition {truck.state} -> {state}")
        if state in ("hauling", "dumping") and truck.payload_t != CAPACITY_T:
            raise RuntimeError(f"{truck.name}: {state} without a full payload")
        if state in ("returning", "loading") and truck.payload_t != 0.0:
            raise RuntimeError(f"{truck.name}: {state} while still loaded")
        truck.state = state

    def _sync(self, time_s: float):
        """Integrate continuous quantities (crusher draw, state durations) up to ``time_s``."""
        span = time_s - self._last_sync_s
        if span > 0:
            rate_tps = crusher_capacity_tph(self.scenario) / 3600.0
            to_empty = self.rom_inventory_t / rate_tps
            if 0 < to_empty < span:
                # Record the exact moment the bin runs dry so rolling KPIs stay exact.
                self._integrate(to_empty, rate_tps)
                self.rom_inventory_t = 0.0
                self._history.append((self._last_sync_s + to_empty, tuple(self.cum.values())))
                self._integrate(span - to_empty, rate_tps)
            else:
                self._integrate(span, rate_tps)
        self._last_sync_s = time_s
        self.sim_time_s = time_s
        self._history.append((time_s, tuple(self.cum.values())))
        horizon = time_s - max(KPI_WINDOW_S, BOTTLENECK_WINDOW_S)
        while len(self._history) > 2 and self._history[1][0] <= horizon:
            self._history.popleft()

    def _integrate(self, span: float, rate_tps: float):
        cum = self.cum
        counts = {state: 0 for state in TRUCK_STATES}
        for truck in self.trucks:
            counts[truck.state] += 1
        cum["truck_s"] += span * len(self.trucks)
        cum["productive_s"] += span * sum(counts[s] for s in PRODUCTIVE_STATES)
        cum["travel_s"] += span * (counts["hauling"] + counts["returning"])
        cum["excavator_queue_s"] += span * counts["queued_at_excavator"]
        cum["crusher_queue_s"] += span * counts["queued_at_crusher"]
        cum["blocked_s"] += span * counts["blocked"]
        cum["down_s"] += span * counts["breakdown"]
        if self.excavator_truck:
            cum["excavator_busy_s"] += span
        if self.dump_truck:
            cum["dump_busy_s"] += span
        run = min(span, self.rom_inventory_t / rate_tps)
        if run > 0:
            start = self.rom_inventory_t
            processed = run * rate_tps
            cum["rom_ts"] += start * run - rate_tps * run * run / 2
            self.rom_inventory_t = max(0.0, start - processed)
            self.production_t += processed
            cum["production_t"] += processed
            cum["crusher_busy_s"] += run

    def _handle(self, kind: str, truck: Truck | None, token: int):
        if kind == "bin_space":
            if token == self._crusher_token:
                self._try_start_dump()
            return
        if kind == "road_cleared":
            if token == self._blockage_token and self.blockage:
                self._clear_blockage()
            return
        if token != truck.token:
            return  # superseded by a speed change, blockage or breakdown
        if kind == "arrive":
            self._commit_travel(truck)
            if truck.travel_blocked:
                self._set_state(truck, "blocked")
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
            self.cum["delivered_t"] += truck.payload_t
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
        truck.progress, truck.wait_started_s = 0.0, self.sim_time_s
        self._set_state(truck, "queued_at_excavator")
        self.excavator_queue.append(truck)
        self._try_start_loading()

    def _try_start_loading(self):
        if self.excavator_truck or not self.excavator_queue:
            return
        truck = self.excavator_queue.popleft()
        wait = self.sim_time_s - truck.wait_started_s
        truck.cycle_wait_s += wait
        self.window["excavator_waits_s"].append(wait)
        self._set_state(truck, "loading")
        self.excavator_truck = truck
        truck.token += 1
        self._schedule(LOAD_SECONDS, "load_done", truck, truck.token)

    def _join_crusher_queue(self, truck: Truck):
        truck.progress, truck.wait_started_s = 1.0, self.sim_time_s
        self._set_state(truck, "queued_at_crusher")
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
        self._set_state(truck, "dumping")
        self.dump_truck = truck
        truck.token += 1
        self._schedule(DUMP_SECONDS, "dump_done", truck, truck.token)

    # ----------------------------------------------------------------- travel

    def speed_kmh(self) -> float:
        return road_speed_kmh(self.scenario)

    def speed_factor(self) -> float:
        return self.speed_kmh() / BASE_SPEED_KMH

    def _start_travel(self, truck: Truck):
        self._set_state(truck, "hauling" if truck.direction == 1 else "returning")
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
            self.breakdown_location = f"haul road at {truck.progress * ROUTE_KM:.2f} km, {truck.state}"
        elif truck.state == "queued_at_excavator":
            self.excavator_queue.remove(truck)
            self.breakdown_location = "loading area, queued"
        elif truck.state == "queued_at_crusher":
            self.dump_queue.remove(truck)
            self.breakdown_location = "crusher, queued"
        elif truck.state == "loading":
            self.excavator_truck = None  # the partial bucket load stays at the face
            self.breakdown_location = "loading area, under the excavator"
        elif truck.state == "dumping":
            self.dump_truck = None  # the payload stays on the truck
            self.breakdown_location = "crusher dump bay"
        truck.token += 1
        self._set_state(truck, "breakdown")
        self._try_start_loading()
        self._try_start_dump()

    def _clear_blockage(self):
        self.blockage = None
        # Trucks still driving toward the blockage were scheduled to stop there: re-plan them too.
        self._replan_travel()
        for other in self.trucks:
            if other.state == "blocked":
                self._start_travel(other)

    def _recover_breakdown(self):
        if self.blockage:
            self._clear_blockage()
        self.breakdown_location = "none"
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
            "cum0": dict(self.cum),
            "excavator_waits_s": [], "crusher_waits_s": [], "cycles_s": [],
            "loads": 0, "trips": 0, "delivered_t": 0.0,
        }

    def _cum_at(self, time_s: float) -> dict:
        points = list(self._history)
        if time_s <= points[0][0]:
            values = points[0][1]
        else:
            values = points[-1][1]
            for (t0, v0), (t1, v1) in zip(points, points[1:]):
                if t0 <= time_s <= t1:
                    f = 0.0 if t1 == t0 else (time_s - t0) / (t1 - t0)
                    values = tuple(a + (b - a) * f for a, b in zip(v0, v1))
                    break
        return dict(zip(COUNTERS, values))

    def _rolling(self, window_s: float) -> tuple[dict, float]:
        span = min(window_s, self.sim_time_s)
        start = self._cum_at(self.sim_time_s - span)
        return {k: self.cum[k] - start[k] for k in COUNTERS}, span

    def rolling_throughput_tph(self) -> float:
        delta, span = self._rolling(KPI_WINDOW_S)
        return delta["production_t"] / span * 3600.0 if span > 0 else 0.0

    def ore_in_trucks_t(self) -> float:
        return sum(t.payload_t for t in self.trucks)

    def mass_balance_error_t(self) -> float:
        """Opening stock + excavated − (in trucks + ROM + processed); zero when conserved."""
        return (self.opening_stock_t + self.excavated_t
                - self.ore_in_trucks_t() - self.rom_inventory_t - self.production_t)

    def projection(self) -> dict:
        return projection(self.scenario, self.truck_count)

    def projected_throughput_tph(self) -> float:
        return self.projection()["throughput_tph"]

    @staticmethod
    def _shares(delta: dict, span: float) -> dict:
        truck_s = delta["truck_s"]
        active_s = truck_s - delta["down_s"]

        def pct(part, whole):
            return 100.0 * part / whole if whole > 0 else 0.0

        return {
            "throughput_tph": delta["production_t"] / span * 3600.0 if span > 0 else 0.0,
            "fleet_utilization_pct": pct(delta["productive_s"], truck_s),
            "truck_queue_pct": pct(delta["excavator_queue_s"] + delta["crusher_queue_s"], truck_s),
            "truck_blocked_pct": pct(delta["blocked_s"], truck_s),
            "truck_down_pct": pct(delta["down_s"], truck_s),
            "travel_share_pct": pct(delta["travel_s"], active_s),
            "excavator_utilization_pct": pct(delta["excavator_busy_s"], span),
            "dump_bay_utilization_pct": pct(delta["dump_busy_s"], span),
            "crusher_utilization_pct": pct(delta["crusher_busy_s"], span),
            "excavator_queue_avg": delta["excavator_queue_s"] / span if span > 0 else 0.0,
            "crusher_queue_avg": delta["crusher_queue_s"] / span if span > 0 else 0.0,
            "rom_avg_t": delta["rom_ts"] / span if span > 0 else 0.0,
        }

    def kpis(self) -> dict:
        """Operational KPIs; time-based ones cover the window since the scenario started."""
        with self.lock:
            stats = self.window
            elapsed = self.sim_time_s - stats["start_s"]
            delta = {k: self.cum[k] - stats["cum0"][k] for k in COUNTERS}
            result = self._shares(delta, elapsed)

            def mean(values):
                return sum(values) / len(values) if values else 0.0

            cycles = stats["cycles_s"] or [t.last_cycle_s for t in self.trucks if t.last_cycle_s > 0]
            result.update({
                "window_h": elapsed / 3600.0,
                "production_t": delta["production_t"],
                "throughput_tph": self.rolling_throughput_tph(),
                "window_throughput_tph": result["throughput_tph"],
                "throughput_avg_tph": self.production_t / self.sim_time_s * 3600.0 if self.sim_time_s else 0.0,
                "average_cycle_min": mean(cycles) / 60.0,
                "excavator_wait_min": mean(stats["excavator_waits_s"]) / 60.0,
                "crusher_wait_min": mean(stats["crusher_waits_s"]) / 60.0,
                "window_trips": stats["trips"],
                "window_delivered_tph": stats["delivered_t"] / elapsed * 3600.0 if elapsed else 0.0,
                "rom_end_t": self.rom_inventory_t,
            })
            return result

    def live_bottleneck(self) -> dict:
        """Active constraint measured from the last 30 simulated minutes of operation.

        Rule: the most downstream saturated server with trucks waiting for it is the
        constraint; if no server is saturated, the servers are waiting for trucks and
        haulage is the constraint (road travel if the speed limit is reduced,
        otherwise the size of the fleet). A blocked lane overrides everything.
        """
        with self.lock:
            delta, span = self._rolling(BOTTLENECK_WINDOW_S)
            s = self._shares(delta, span)
            exc, dump, crush = (s["excavator_utilization_pct"] / 100, s["dump_bay_utilization_pct"] / 100,
                                s["crusher_utilization_pct"] / 100)
            if self.blockage:
                blocked = sum(t.state == "blocked" for t in self.trucks)
                return {"constraint": ROAD, "measured": s,
                        "reason": f"HT-01 has stopped on the single-lane road; {blocked} truck(s) are held behind it "
                                  f"and deliveries pause until it is towed aside."}
            accumulating = delta["delivered_t"] > delta["production_t"] + CAPACITY_T
            if crush >= SATURATED_SHARE and (s["crusher_queue_avg"] > QUEUE_PRESENT_TRUCKS or accumulating
                                             or self.rom_inventory_t > ROM_BIN_CAPACITY_T - CAPACITY_T):
                return {"constraint": CRUSHER, "measured": s,
                        "reason": f"Crusher busy {100 * crush:.0f}% at {crusher_capacity_tph(self.scenario):.0f} t/h; "
                                  f"ROM bin {self.rom_inventory_t:.0f} of {ROM_BIN_CAPACITY_T:.0f} t and "
                                  f"{s['crusher_queue_avg']:.1f} trucks waiting to dump on average."}
            if dump >= SATURATED_SHARE:
                return {"constraint": DUMP, "measured": s,
                        "reason": f"Dump bay busy {100 * dump:.0f}% of the last {span / 60:.0f} min."}
            if exc >= SATURATED_SHARE:
                return {"constraint": LOADING, "measured": s,
                        "reason": f"Excavator busy {100 * exc:.0f}% with {s['excavator_queue_avg']:.1f} trucks "
                                  f"queued on average; trucks wait to be loaded."}
            if self.speed_kmh() < BASE_SPEED_KMH:
                return {"constraint": ROAD, "measured": s,
                        "reason": f"Speed limit {self.speed_kmh():.2f} km/h: trucks spend {s['travel_share_pct']:.0f}% "
                                  f"of their time travelling and the excavator is idle {100 - 100 * exc:.0f}% "
                                  f"waiting for trucks."}
            return {"constraint": FLEET, "measured": s,
                    "reason": f"No server is saturated: the excavator is idle {100 - 100 * exc:.0f}% and the crusher "
                              f"{100 - 100 * crush:.0f}% waiting for trucks."}

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
            live = self.live_bottleneck()
            plan = self.projection()
            baseline = projection("baseline", self.truck_count)["throughput_tph"]
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
                    "bottleneck_live": self.metric(live["constraint"]),
                    "bottleneck_live_reason": self.metric(live["reason"]),
                },
                "excavator-01": {
                    "state": self.metric("loading" if self.excavator_truck else "ready"),
                    "queue_length": self.metric(len(self.excavator_queue)),
                    "position_x": self.metric(-25), "position_z": self.metric(-18),
                    "utilization_pct": self.metric(kpi["excavator_utilization_pct"], "%"),
                    "average_wait_min": self.metric(kpi["excavator_wait_min"], "min"),
                    "loading_truck": self.metric(self.excavator_truck.name if self.excavator_truck else "none"),
                    "average_queue": self.metric(kpi["excavator_queue_avg"], "trucks"),
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
                    "average_queue": self.metric(kpi["crusher_queue_avg"], "trucks"),
                    "rom_average_t": self.metric(kpi["rom_avg_t"], "t"),
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
                    "fleet_supply_tph": self.metric(max(plan["limits_tph"].get(ROAD, 0), plan["limits_tph"].get(FLEET, 0)), "t/h"),
                    "excavator_capacity_tph": self.metric(plan["limits_tph"][LOADING], "t/h"),
                    "crusher_capacity_tph": self.metric(plan["limits_tph"][CRUSHER], "t/h"),
                    "bottleneck_reason": self.metric(plan["reason"]),
                    "breakdown_location": self.metric(self.breakdown_location),
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
