#!/usr/bin/env python3
"""Build the frontend-ready A8/A9 decision explanation from verified fixtures."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


DATA = Path(__file__).resolve().parent
A8_PATH = DATA / "evidence" / "fleet_sizing.json"
A9_PATH = DATA / "evidence" / "fleet_sensitivity.json"
OUTPUT = DATA / "evidence" / "decision_explanation.json"


def _case(scenario: dict, trucks: int) -> dict:
    return next(case for case in scenario["cases"] if case["fleet_size_trucks"] == trucks)


def _compact(case: dict) -> dict:
    return {
        "trucks": case["fleet_size_trucks"],
        "throughput_tph": case["throughput_tph"],
        "loading_queue_trucks_avg": case["loading_queue_trucks_avg"],
        "crusher_queue_trucks_avg": case["crusher_queue_trucks_avg"],
        "truck_operating_h_per_1000_t": case["truck_operating_h_per_1000_t"],
        "bottleneck": case["bottleneck"],
    }


def build() -> dict:
    a8 = json.loads(A8_PATH.read_text(encoding="utf-8"))
    a9 = json.loads(A9_PATH.read_text(encoding="utf-8"))
    baseline = a8["scenarios"]["baseline"]
    road = a8["scenarios"]["road_closure"]
    crusher = a8["scenarios"]["crusher_slowdown"]

    sensitivity = {}
    for name, study in a9["studies"].items():
        sensitivity[name] = {
            "unit": study["unit"],
            "category": study["category"],
            "baseline_value": study["baseline_value"],
            "cases": [
                {
                    "value": case["inputs"][name],
                    "recommended_active_trucks": case["recommendation"]["recommended_active_trucks"],
                    "plateau_observed": case["recommendation"]["plateau_observed"],
                    "throughput_tph": case["recommended_case"]["throughput_tph"],
                    "bottleneck": case["recommended_case"]["bottleneck"],
                }
                for case in study["cases"]
            ],
        }

    return {
        "schema_version": "ademix.decision-explanation.v1",
        "source_label": "saved deterministic model evidence",
        "synthetic": True,
        "not_live_control": True,
        "claim": "Planning evidence from matched model runs; not measured mine performance or a universal optimum.",
        "questions": {
            "baseline": {
                "question": "Why are four cycling trucks sufficient under baseline conditions?",
                "answer": "Four trucks keep the single excavator at its 770 t/h modeled limit; fifth and sixth trucks add queueing and operating hours, not output.",
                "recommended_action": "Cycle four trucks and park two ready reserves.",
                "comparison": [_compact(_case(baseline, n)) for n in (4, 5, 6)],
                "evidence_pointer": "fleet_sizing.json#/scenarios/baseline",
            },
            "road_closure": {
                "question": "Why do all six remain useful during the road restriction?",
                "answer": "The slower 10.72 km/h road limits truck supply. Throughput still rises with every added truck through six, and no plateau is observed in the tested range.",
                "recommended_action": "Keep all six available trucks cycling; the model would require more than the available fleet to saturate loading.",
                "comparison": [_compact(_case(road, n)) for n in (4, 5, 6)],
                "evidence_pointer": "fleet_sizing.json#/scenarios/road_closure",
            },
            "crusher_slowdown": {
                "question": "Why does crusher slowdown justify parking three trucks?",
                "answer": "Three trucks already feed the reduced 495 t/h crusher limit. Additional trucks do not increase output and instead increase crusher queueing and truck-hours.",
                "recommended_action": "Cycle three trucks and park three ready reserves.",
                "comparison": [_compact(_case(crusher, n)) for n in (3, 4, 6)],
                "evidence_pointer": "fleet_sizing.json#/scenarios/crusher_slowdown",
            },
            "sensitivity": {
                "question": "Which changed assumption would make the recommendation different?",
                "answer": "Route length, loading duration and crusher capacity each move the useful-fleet boundary in the tested planning cases.",
                "recommended_action": "Re-run the planning study when any of these assumptions changes; do not reuse four trucks as a universal rule.",
                "studies": sensitivity,
                "evidence_pointer": "fleet_sensitivity.json#/studies",
            },
        },
        "presentation_contract": {
            "required_labels": ["saved model evidence", "synthetic", "not measured"],
            "live_state_separation": "Do not present this fixture as current live twin state.",
            "rounding": {"throughput_tph": 1, "queues_trucks": 2, "truck_h_per_1000_t": 2},
            "missing_data_behavior": "Show unavailable and suppress a recommendation when the fixture or required scenario is missing.",
            "reset_behavior": "Reset returns the live scenario to baseline; it does not rewrite or regenerate this saved evidence.",
        },
    }


def output_json() -> str:
    return json.dumps(build(), indent=2, ensure_ascii=False) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    text = output_json()
    if args.write:
        OUTPUT.write_text(text, encoding="utf-8", newline="\n")
        print(OUTPUT)
    else:
        print(text, end="")


if __name__ == "__main__":
    main()
