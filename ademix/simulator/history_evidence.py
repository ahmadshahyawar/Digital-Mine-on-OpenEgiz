#!/usr/bin/env python3
"""Generate the versioned A3 production/recovery timeline fixture."""

from __future__ import annotations

import hashlib
import json

from engine import BREAKDOWN_RECOVERY_S, MineEngine, projection

SCHEMA_VERSION = "ademix.production-recovery.v1"
WARMUP_H = 4
BREAKDOWN_H = 3
RESET_H = 1
STEP_S = 20.0
SAMPLE_S = 300.0


def advance(mine: MineEngine, seconds: float):
    for _ in range(int(round(seconds / STEP_S))):
        mine.step(STEP_S)


def state_hash(mine: MineEngine) -> str:
    payload = json.dumps(mine.snapshot(), sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def sample(mine: MineEngine, period_id: int, elapsed_s: float) -> dict:
    twins = mine.snapshot()
    mine_twin = twins["mine-01"]
    controller = twins["scenario-controller"]
    road = twins["road-main"]
    return {
        "period_id": period_id,
        "sim_time_s": round(mine.sim_time_s, 6),
        "elapsed_s": round(elapsed_s, 6),
        "observed_rolling_throughput_tph": mine_twin["throughput_tph"]["value"],
        "projected_steady_capacity_tph": controller["projected_throughput_tph"]["value"],
        "production_t": mine_twin["production_t"]["value"],
        "active_scenario": mine_twin["active_scenario"]["value"],
        "road_state": road["state"]["value"],
        "blocked_trucks": road["blocked_trucks"]["value"],
    }


def event(kind: str, label: str, mine: MineEngine, period_id: int) -> dict:
    return {
        "period_id": period_id,
        "sim_time_s": round(mine.sim_time_s, 6),
        "kind": kind,
        "label": label,
    }


def generate_history() -> dict:
    baseline, disrupted = MineEngine(), MineEngine()
    advance(baseline, WARMUP_H * 3600)
    advance(disrupted, WARMUP_H * 3600)
    baseline_hash, disrupted_hash = state_hash(baseline), state_hash(disrupted)
    if baseline_hash != disrupted_hash:
        raise RuntimeError("baseline and breakdown histories do not share the same starting state")

    baseline._reset_window()
    baseline_samples = [sample(baseline, 1, 0)]
    for elapsed in range(int(SAMPLE_S), int(BREAKDOWN_H * 3600) + 1, int(SAMPLE_S)):
        advance(baseline, SAMPLE_S)
        baseline_samples.append(sample(baseline, 1, elapsed))

    disrupted._reset_window()
    events = [event("period_started", "Breakdown comparison started", disrupted, 1)]
    disrupted.set_scenario("truck_breakdown")
    events.append(event("breakdown_started", "HT-01 stopped; disruption active", disrupted, 1))
    samples = [sample(disrupted, 1, 0)]
    road_cleared_recorded = False
    recovered_recorded = False
    projected = projection("truck_breakdown")["throughput_tph"]
    for elapsed in range(int(SAMPLE_S), int(BREAKDOWN_H * 3600) + 1, int(SAMPLE_S)):
        advance(disrupted, SAMPLE_S)
        point = sample(disrupted, 1, elapsed)
        samples.append(point)
        if not road_cleared_recorded and elapsed >= BREAKDOWN_RECOVERY_S and disrupted.blockage is None:
            events.append(event("road_cleared", "HT-01 towed aside; road cleared", disrupted, 1))
            road_cleared_recorded = True
        if (road_cleared_recorded and not recovered_recorded
                and point["observed_rolling_throughput_tph"] >= 0.95 * projected):
            events.append(event("throughput_recovered", "Observed rolling throughput recovered to at least 95% of projection",
                                disrupted, 1))
            recovered_recorded = True

    disrupted.set_scenario("baseline")
    disrupted._reset_window()
    events.append(event("reset", "Normal operations reset; new comparison period", disrupted, 2))
    reset_samples = [sample(disrupted, 2, 0)]
    for elapsed in range(int(SAMPLE_S), int(RESET_H * 3600) + 1, int(SAMPLE_S)):
        advance(disrupted, SAMPLE_S)
        reset_samples.append(sample(disrupted, 2, elapsed))

    return {
        "schema_version": SCHEMA_VERSION,
        "synthetic": True,
        "claim": "Deterministic simulator history; not measured mine telemetry.",
        "methodology": {
            "seed": 42,
            "step_s": STEP_S,
            "sample_s": SAMPLE_S,
            "warmup_h": WARMUP_H,
            "breakdown_period_h": BREAKDOWN_H,
            "reset_period_h": RESET_H,
            "common_start_state_sha256": baseline_hash,
            "recovery_rule": "first 5-minute sample after road clear with observed rolling throughput >= 95% of projected steady capacity",
        },
        "field_sources": {
            "observed_rolling_throughput_tph": "mine-01.throughput_tph",
            "projected_steady_capacity_tph": "scenario-controller.projected_throughput_tph",
            "production_t": "mine-01.production_t",
            "active_scenario": "mine-01.active_scenario",
            "road_state": "road-main.state",
            "blocked_trucks": "road-main.blocked_trucks",
        },
        "units": {
            "sim_time_s": "s", "elapsed_s": "s",
            "observed_rolling_throughput_tph": "t/h",
            "projected_steady_capacity_tph": "t/h", "production_t": "t",
            "blocked_trucks": "trucks",
        },
        "baseline": {"period_id": 1, "start_state_sha256": baseline_hash, "samples": baseline_samples},
        "breakdown_recovery": {
            "start_state_sha256": disrupted_hash,
            "events": events,
            "periods": [
                {"period_id": 1, "label": "HT-01 breakdown and recovery", "samples": samples},
                {"period_id": 2, "label": "Reset to normal operations", "samples": reset_samples},
            ],
        },
    }


def history_json() -> str:
    return json.dumps(generate_history(), indent=2, ensure_ascii=False) + "\n"


if __name__ == "__main__":
    print(history_json(), end="")
