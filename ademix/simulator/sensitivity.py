#!/usr/bin/env python3
"""Generate A9 one-at-a-time sensitivity evidence using the A8 experiment."""

from __future__ import annotations

import argparse
from contextlib import contextmanager
import json
from pathlib import Path

import engine
from fleet_sizing import FLEET_SIZES, evaluate, recommendation


SCHEMA_VERSION = "ademix.fleet-sensitivity.v1"
DEFAULT_OUTPUT = Path(__file__).parents[1] / "data" / "evidence" / "fleet_sensitivity.json"
BASE_INPUTS = {
    "route_length_km": 3.2,
    "loading_duration_min": 6.0,
    "crusher_capacity_tph": 900.0,
}
CASES = {
    "route_length_km": (2.0, 3.2, 5.0),
    "loading_duration_min": (6.0, 9.0, 12.0),
    "crusher_capacity_tph": (500.0, 700.0, 900.0),
}
ENGINE_CONSTANTS = {
    "route_length_km": "ROUTE_KM",
    "loading_duration_min": "LOAD_SECONDS",
    "crusher_capacity_tph": "BASE_CRUSHER_TPH",
}
ENGINE_FACTORS = {
    "route_length_km": 1.0,
    "loading_duration_min": 60.0,
    "crusher_capacity_tph": 1.0,
}
INPUT_META = {
    "route_length_km": {
        "unit": "km", "category": "team planning assumption",
        "basis": "3.2 km one-way baseline; alternatives are explicit planning cases",
    },
    "loading_duration_min": {
        "unit": "min/truck", "category": "derived baseline and planning alternatives",
        "basis": "6 min baseline = ceil(77 t / 20.32 t/pass) × 1.5 min/pass",
    },
    "crusher_capacity_tph": {
        "unit": "t/h", "category": "team planning assumption",
        "basis": "900 t/h baseline; alternatives are explicit planning cases",
    },
}


@contextmanager
def changed_input(name: str, value: float):
    """Temporarily change one engine constant and always restore it."""
    constant = ENGINE_CONSTANTS[name]
    old = getattr(engine, constant)
    setattr(engine, constant, value * ENGINE_FACTORS[name])
    try:
        yield
    finally:
        setattr(engine, constant, old)


def evaluate_input(name: str, value: float) -> dict:
    with changed_input(name, value):
        fleet_cases = [evaluate(size, "baseline") for size in FLEET_SIZES]
    decision = recommendation(fleet_cases)
    chosen = next(c for c in fleet_cases if c["fleet_size_trucks"] == decision["recommended_active_trucks"])
    inputs = dict(BASE_INPUTS)
    inputs[name] = value
    return {
        "changed_input": name,
        "inputs": inputs,
        "recommendation": decision,
        "recommended_case": {
            key: chosen[key] for key in (
                "fleet_size_trucks", "throughput_tph", "bottleneck",
                "loading_queue_trucks_avg", "crusher_queue_trucks_avg",
                "truck_operating_h_per_1000_t",
            )
        },
        "fleet_cases": fleet_cases,
    }


def build_evidence() -> dict:
    studies = {}
    for name, values in CASES.items():
        studies[name] = {
            **INPUT_META[name],
            "baseline_value": BASE_INPUTS[name],
            "cases": [evaluate_input(name, value) for value in values],
        }
    return {
        "schema_version": SCHEMA_VERSION,
        "synthetic": True,
        "claim": "One-at-a-time deterministic planning sensitivity; not measured uncertainty or site validation.",
        "methodology": {
            "reuses": "ademix.fleet-sizing.v1",
            "scenario": "baseline",
            "only_one_input_changes_per_case": True,
            "tested_fleet_sizes_trucks": list(FLEET_SIZES),
            "base_inputs": BASE_INPUTS,
            "live_runtime_configuration_changed": False,
        },
        "studies": studies,
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
