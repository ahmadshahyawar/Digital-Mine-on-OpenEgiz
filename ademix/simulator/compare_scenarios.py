#!/usr/bin/env python3
"""Reproduce the baseline-versus-scenario tables in SCENARIOS.md.

Every run starts from the same deterministic state and operates normally for the
same warm-up period, so all scenarios branch from an identical baseline. Each then
runs for the same duration: the first hour (transient response) and the following
hours (steady state) are reported separately. All results are synthetic model
output. Output is Markdown.

    python compare_scenarios.py
"""

import sys

from engine import SCENARIOS, MineEngine, projection

WARMUP_H = 4
TRANSIENT_H = 1
STEADY_H = 8
STEP_S = 20.0
BREAKDOWN_OFFSETS_MIN = range(0, 36, 3)  # one baseline cycle (36 min) of trigger times

METRICS = [
    ("production_t", "Production t", "{:,.0f}"),
    ("window_throughput_tph", "Throughput t/h", "{:,.1f}"),
    ("average_cycle_min", "Cycle min", "{:.1f}"),
    ("excavator_queue_avg", "Avg queue at face", "{:.2f}"),
    ("crusher_queue_avg", "Avg queue at crusher", "{:.2f}"),
    ("excavator_wait_min", "Wait at face min", "{:.1f}"),
    ("crusher_wait_min", "Wait at crusher min", "{:.1f}"),
    ("fleet_utilization_pct", "Truck util. %", "{:.1f}"),
    ("excavator_utilization_pct", "Excavator util. %", "{:.1f}"),
    ("crusher_utilization_pct", "Crusher util. %", "{:.1f}"),
    ("rom_avg_t", "Avg ROM t", "{:.0f}"),
]


def advance(mine, hours):
    for _ in range(int(round(hours * 3600 / STEP_S))):
        mine.step(STEP_S)


def evaluate(scenario, offset_min=0):
    mine = MineEngine()
    advance(mine, WARMUP_H + offset_min / 60)
    mine.set_scenario(scenario)
    mine._reset_window()  # also restarts the window when "baseline" is already active
    location = mine.breakdown_location
    advance(mine, TRANSIENT_H)
    transient = mine.kpis()
    live_transient = mine.live_bottleneck()["constraint"]
    mine._reset_window()  # steady state is measured without the transition
    advance(mine, STEADY_H)
    return {
        "plan": projection(scenario),
        "transient": transient,
        "steady": mine.kpis(),
        "live_transient": live_transient,
        "live": mine.live_bottleneck(),
        "location": location,
        "mass_error_t": mine.mass_balance_error_t(),
    }


def impact(value, base):
    if base == 0:
        return "—" if value == 0 else "new"
    return f"{100 * (value / base - 1):+.1f}%"


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    results = {name: evaluate(name) for name in SCENARIOS}
    base = results["baseline"]

    print(f"All runs: {WARMUP_H} h of identical normal operation, then the scenario for "
          f"{TRANSIENT_H + STEADY_H} h. Synthetic model output, not mine measurements.\n")

    for period, hours in (("steady", STEADY_H), ("transient", TRANSIENT_H)):
        title = (f"Steady state: hours {TRANSIENT_H + 1}–{TRANSIENT_H + STEADY_H} after the switch"
                 if period == "steady" else f"Transient: first {TRANSIENT_H} h after the switch")
        print(f"### {title}\n")
        print("| Metric | " + " | ".join(SCENARIOS.values()) + " |")
        print("|---|" + "---:|" * len(SCENARIOS))
        for key, label, fmt in METRICS:
            cells = []
            for name, r in results.items():
                value = r[period][key]
                cell = fmt.format(value)
                if name != "baseline":
                    cell += f" ({impact(value, base[period][key])})"
                cells.append(cell)
            print(f"| {label} | " + " | ".join(cells) + " |")
        rom_end = [f"{r[period]['rom_end_t']:.0f}" for r in results.values()]
        print("| ROM at end of period t | " + " | ".join(rom_end) + " |\n")

    print("### Bottleneck analysis\n")
    print("| Scenario | Analytical bottleneck | Live, first hour | Live, steady state | Why (analytical) |")
    print("|---|---|---|---|---|")
    for name, r in results.items():
        print(f"| {SCENARIOS[name]} | {r['plan']['bottleneck']} ({r['plan']['throughput_tph']:.0f} t/h) | "
              f"{r['live_transient']} | {r['live']['constraint']} | {r['plan']['reason']} |")
    print()

    print("### Breakdown trigger-time sensitivity\n")
    print("Same warm-up, breakdown triggered 0–33 min later in 3 min steps (one baseline cycle).\n")
    print("| Trigger after warm-up | HT-01 location | First-hour production t | vs baseline first hour |")
    print("|---:|---|---:|---:|")
    for offset in BREAKDOWN_OFFSETS_MIN:
        b = evaluate("baseline", offset)
        r = evaluate("truck_breakdown", offset)
        print(f"| {offset} min | {r['location']} | {r['transient']['production_t']:,.0f} | "
              f"{impact(r['transient']['production_t'], b['transient']['production_t'])} |")
    print()
    worst = max(abs(r["mass_error_t"]) for r in results.values())
    print(f"Largest mass-balance error across the four runs: {worst:.1e} t.")


if __name__ == "__main__":
    main()
