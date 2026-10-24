#!/usr/bin/env python3
"""Generate reproducible A8 fleet-sizing evidence from the existing mine engine.

The experiment changes only the number of physical trucks instantiated in a fresh
engine. It does not change the six-twin live topology or any runtime setting.

    python ademix/simulator/fleet_sizing.py --write
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from engine import MineEngine, SCENARIOS


SCHEMA_VERSION = "ademix.fleet-sizing.v1"
FLEET_SIZES = tuple(range(2, 7))
WARMUP_H = 4
TRANSIENT_H = 1
MEASUREMENT_H = 8
STEP_S = 20.0
PLATEAU_TOLERANCE = 0.01
DEFAULT_OUTPUT = Path(__file__).parents[1] / "data" / "evidence" / "fleet_sizing.json"


def advance(mine: MineEngine, hours: float) -> None:
    for _ in range(int(round(hours * 3600 / STEP_S))):
        mine.step(STEP_S)


def evaluate(fleet_size: int, scenario: str) -> dict:
    """Run one fresh, deterministic, fixed-dispatch planning case."""
    mine = MineEngine(seed=42, truck_count=fleet_size)
    advance(mine, WARMUP_H)
    start_hash = hashlib.sha256(
        json.dumps(mine.snapshot(), sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    mine.set_scenario(scenario)
    advance(mine, TRANSIENT_H)
    mine._reset_window()
    advance(mine, MEASUREMENT_H)
    kpi = mine.kpis()
    operating_h = kpi["truck_operating_h_per_kt"] * kpi["production_t"] / 1000.0
    return {
        "fleet_size_trucks": fleet_size,
        "start_state_sha256": start_hash,
        "production_t": round(kpi["production_t"], 6),
        "throughput_tph": round(kpi["window_throughput_tph"], 6),
        "bottleneck": mine.projection()["bottleneck"],
        "average_cycle_min": round(kpi["average_cycle_min"], 6),
        "loading_queue_trucks_avg": round(kpi["excavator_queue_avg"], 6),
        "crusher_queue_trucks_avg": round(kpi["crusher_queue_avg"], 6),
        "loading_wait_min": round(kpi["excavator_wait_min"], 6),
        "crusher_wait_min": round(kpi["crusher_wait_min"], 6),
        "fleet_utilization_pct": round(kpi["fleet_utilization_pct"], 6),
        "excavator_utilization_pct": round(kpi["excavator_utilization_pct"], 6),
        "crusher_utilization_pct": round(kpi["crusher_utilization_pct"], 6),
        "truck_operating_h": round(operating_h, 6),
        "truck_operating_h_per_1000_t": round(kpi["truck_operating_h_per_kt"], 6),
        "trips_per_hour": round(kpi["window_trips"] / kpi["window_h"], 6),
        "mass_balance_error_t": round(mine.mass_balance_error_t(), 9),
    }


def recommendation(cases: list[dict]) -> dict:
    """Find the first observed plateau; do not hard-code the expected fleet size."""
    for current, following in zip(cases, cases[1:]):
        base = current["throughput_tph"]
        gain = (following["throughput_tph"] / base - 1.0) if base else float("inf")
        if gain <= PLATEAU_TOLERANCE:
            return {
                "recommended_active_trucks": current["fleet_size_trucks"],
                "plateau_observed": True,
                "rule": "first fleet whose next truck raises throughput by no more than 1%",
                "next_truck_throughput_gain_pct": round(gain * 100.0, 6),
            }
    return {
        "recommended_active_trucks": cases[-1]["fleet_size_trucks"],
        "plateau_observed": False,
        "rule": "no <=1% throughput plateau observed in the tested 2-6 truck range",
        "next_truck_throughput_gain_pct": None,
    }


def build_evidence() -> dict:
    scenarios = {}
    for scenario, label in SCENARIOS.items():
        cases = [evaluate(size, scenario) for size in FLEET_SIZES]
        scenarios[scenario] = {
            "label": label,
            "recommendation": recommendation(cases),
            "cases": cases,
        }
    return {
        "schema_version": SCHEMA_VERSION,
        "synthetic": True,
        "claim": "Deterministic planning experiment; not measured operating-mine performance.",
        "methodology": {
            "seed": 42,
            "dispatch_policy": "fixed",
            "fleet_sizes_trucks": list(FLEET_SIZES),
            "warmup_h": WARMUP_H,
            "scenario_transition_h_excluded": TRANSIENT_H,
            "measurement_window_h": MEASUREMENT_H,
            "step_s": STEP_S,
            "fresh_engine_per_case": True,
            "live_twin_topology_changed": False,
        },
        "units": {
            "production_t": "t",
            "throughput_tph": "t/h",
            "average_cycle_min": "min",
            "loading_queue_trucks_avg": "trucks",
            "crusher_queue_trucks_avg": "trucks",
            "loading_wait_min": "min",
            "crusher_wait_min": "min",
            "fleet_utilization_pct": "%",
            "excavator_utilization_pct": "%",
            "crusher_utilization_pct": "%",
            "truck_operating_h": "h",
            "truck_operating_h_per_1000_t": "h/1,000 t",
            "trips_per_hour": "trips/h",
            "mass_balance_error_t": "t",
        },
        "scenarios": scenarios,
    }


def evidence_json() -> str:
    return json.dumps(build_evidence(), indent=2, ensure_ascii=False) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true", help=f"write {DEFAULT_OUTPUT}")
    args = parser.parse_args()
    output = evidence_json()
    if args.write:
        DEFAULT_OUTPUT.write_text(output, encoding="utf-8", newline="\n")
        print(DEFAULT_OUTPUT)
    else:
        print(output, end="")


if __name__ == "__main__":
    main()
