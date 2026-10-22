#!/usr/bin/env python3
"""Reproduce the baseline-versus-scenario table in MODEL.md.

Each run starts from the same deterministic state, operates normally for a warm-up
period, switches to the scenario, and reports the first hour (transient response)
and the following hours (steady state) separately. Output is Markdown.

    python compare_scenarios.py
"""

import sys

from engine import SCENARIOS, MineEngine, projection

WARMUP_H = 4
TRANSIENT_H = 1
STEADY_H = 8
STEP_S = 20.0


def advance(mine, hours):
    for _ in range(int(hours * 3600 / STEP_S)):
        mine.step(STEP_S)


def evaluate(scenario):
    mine = MineEngine()
    advance(mine, WARMUP_H)
    mine.set_scenario(scenario)
    start = mine.production_t
    advance(mine, TRANSIENT_H)
    transient = mine.production_t - start
    mine._reset_window()  # measure steady state without the transition
    start = mine.production_t
    advance(mine, STEADY_H)
    kpi = mine.kpis()
    return {
        "plan": projection(scenario),
        "transient_tph": transient / TRANSIENT_H,
        "steady_tph": (mine.production_t - start) / STEADY_H,
        "kpi": kpi,
        "rom_t": mine.rom_inventory_t,
        "mass_error_t": mine.mass_balance_error_t(),
    }


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    results = {name: evaluate(name) for name in SCENARIOS}
    base = results["baseline"]["steady_tph"]
    print(f"Warm-up {WARMUP_H} h of normal operation, then the scenario; "
          f"transient = first {TRANSIENT_H} h, steady = next {STEADY_H} h. Synthetic model output.\n")
    print("| Scenario | Bottleneck | Analytical t/h | Transient t/h | Steady t/h | vs baseline | "
          "Fleet util. % | Truck queue % | Excavator util. % | Crusher util. % | "
          "Wait at excavator min | Wait at crusher min | Cycle min | ROM at end t | Mass error t |")
    print("|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|")
    for name, r in results.items():
        k = r["kpi"]
        print(f"| {SCENARIOS[name]} | {r['plan']['bottleneck']} | {r['plan']['throughput_tph']:.1f} | "
              f"{r['transient_tph']:.1f} | {r['steady_tph']:.1f} | {100 * (r['steady_tph'] / base - 1):+.1f}% | "
              f"{k['fleet_utilization_pct']:.1f} | {k['truck_queue_pct']:.1f} | {k['excavator_utilization_pct']:.1f} | "
              f"{k['crusher_utilization_pct']:.1f} | {k['excavator_wait_min']:.1f} | {k['crusher_wait_min']:.1f} | "
              f"{k['average_cycle_min']:.1f} | {r['rom_t']:.0f} | {r['mass_error_t']:.1e} |")


if __name__ == "__main__":
    main()
