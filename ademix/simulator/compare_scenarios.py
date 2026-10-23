#!/usr/bin/env python3
"""Reproduce the baseline-versus-scenario tables in SCENARIOS.md.

Every run starts from the same deterministic state and operates normally for the
same warm-up period, so all scenarios branch from an identical baseline. Each then
runs for the same duration: the first hour (transient response) and the following
hours (steady state) are reported separately. All results are synthetic model
output. Output is Markdown.

    python compare_scenarios.py
"""

import hashlib
import json
import sys

from engine import DISPATCH_POLICIES, SCENARIOS, MineEngine, projection, trucks_required

WARMUP_H = 4
TRANSIENT_H = 1
STEADY_H = 8
STEP_S = 20.0
BREAKDOWN_OFFSETS_MIN = range(0, 36, 3)  # one baseline cycle (36 min) of trigger times
EVIDENCE_SCHEMA_VERSION = "ademix.dispatch-comparison.v1"

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
    ("trips_per_hour", "Trips / h", "{:.2f}"),
    ("rom_avg_t", "Avg ROM t", "{:.0f}"),
]


def advance(mine, hours):
    for _ in range(int(round(hours * 3600 / STEP_S))):
        mine.step(STEP_S)


DISPATCH_METRICS = [
    ("production_t", "Production t", "{:,.0f}"),
    ("window_throughput_tph", "Throughput t/h", "{:,.1f}"),
    ("cycling_trucks_avg", "Average trucks cycling", "{:.2f}"),
    ("standby_trucks_avg", "Average trucks parked", "{:.2f}"),
    ("truck_operating_h_per_kt", "Truck operating h per kt", "{:.2f}"),
    ("estimated_fuel_l", "Estimated fuel L", "{:,.1f}"),
    ("estimated_fuel_l_per_kt", "Estimated fuel L/kt", "{:,.1f}"),
    ("truck_standby_pct", "Truck time parked %", "{:.1f}"),
    ("operating_fleet_utilization_pct", "Operating-truck util. %", "{:.1f}"),
    ("excavator_wait_min", "Wait at face min", "{:.1f}"),
    ("crusher_wait_min", "Wait at crusher min", "{:.1f}"),
    ("excavator_utilization_pct", "Excavator util. %", "{:.1f}"),
]

COMPARISON_METRICS = [
    {"key": "throughput_tph", "label": "Throughput", "unit": "t/h"},
    {"key": "cycle_time_min", "label": "Average cycle time", "unit": "min"},
    {"key": "loading_wait_min", "label": "Average loading wait", "unit": "min"},
    {"key": "crusher_wait_min", "label": "Average crusher wait", "unit": "min"},
    {"key": "cycling_trucks_avg", "label": "Average trucks cycling", "unit": "trucks"},
    {"key": "standby_trucks_avg", "label": "Average trucks parked", "unit": "trucks"},
    {"key": "truck_operating_h_per_kt", "label": "Operating truck-hours per 1,000 t", "unit": "h/kt"},
    {"key": "estimated_fuel_l", "label": "Estimated fuel", "unit": "L"},
    {"key": "estimated_fuel_l_per_kt", "label": "Estimated fuel per 1,000 t", "unit": "L/kt"},
]


def evaluate(scenario, offset_min=0, dispatch="fixed"):
    mine = MineEngine()
    advance(mine, WARMUP_H + offset_min / 60)
    start_state_sha256 = hashlib.sha256(
        json.dumps(mine.snapshot(), sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    mine.set_dispatch(dispatch)
    mine.set_scenario(scenario)
    mine._reset_window()  # also restarts the window when "baseline" is already active
    mine.reset_shift_totals()
    location = mine.breakdown_location
    advance(mine, TRANSIENT_H)
    transient = mine.kpis()
    transient["trips_per_hour"] = transient["window_trips"] / transient["window_h"]
    transient_fuel_l = mine.shift_fuel_l
    _add_dispatch_evidence_metrics(transient, transient_fuel_l)
    live_transient = mine.live_bottleneck()["constraint"]
    mine._reset_window()  # steady state is measured without the transition
    mine.reset_shift_totals()
    advance(mine, STEADY_H)
    steady = mine.kpis()
    steady["trips_per_hour"] = steady["window_trips"] / steady["window_h"]
    _add_dispatch_evidence_metrics(steady, mine.shift_fuel_l)
    return {
        "start_state_sha256": start_state_sha256,
        "plan": projection(scenario, dispatch=dispatch),
        "transient": transient,
        "transient_fuel_l": transient_fuel_l,
        "steady": steady,
        "steady_fuel_l": mine.shift_fuel_l,
        "live_transient": live_transient,
        "live": mine.live_bottleneck(),
        "location": location,
        "mass_error_t": mine.mass_balance_error_t(),
    }


def _add_dispatch_evidence_metrics(kpis: dict, fuel_l: float, truck_count: int = 6):
    """Add only new report keys; preserve every established KPI key and meaning."""
    values = _comparison_values(kpis, fuel_l, truck_count)
    for key in ("cycling_trucks_avg", "standby_trucks_avg", "estimated_fuel_l", "estimated_fuel_l_per_kt"):
        kpis[key] = values[key]


def _comparison_values(kpis: dict, fuel_l: float, truck_count: int = 6) -> dict:
    standby = truck_count * kpis["truck_standby_pct"] / 100.0
    down = truck_count * kpis["truck_down_pct"] / 100.0
    production_kt = kpis["production_t"] / 1000.0
    values = {
        "throughput_tph": kpis["window_throughput_tph"],
        "cycle_time_min": kpis["average_cycle_min"],
        "loading_wait_min": kpis["excavator_wait_min"],
        "crusher_wait_min": kpis["crusher_wait_min"],
        "cycling_trucks_avg": truck_count - standby - down,
        "standby_trucks_avg": standby,
        "truck_operating_h_per_kt": kpis["truck_operating_h_per_kt"],
        "estimated_fuel_l": fuel_l,
        "estimated_fuel_l_per_kt": fuel_l / production_kt if production_kt else 0.0,
    }
    return {key: round(value, 6) for key, value in values.items()}


def _metric_deltas(fixed: dict, smart: dict) -> dict:
    return {
        key: {
            "absolute": round(smart[key] - value, 6),
            "percent": round(100 * (smart[key] / value - 1), 6) if value else None,
        }
        for key, value in fixed.items()
    }


def comparison_evidence() -> dict:
    """Versioned fixed-versus-smart fixture for the frontend and judges."""
    scenarios, common_start_hash = {}, None
    for scenario, label in SCENARIOS.items():
        runs = {policy: evaluate(scenario, dispatch=policy) for policy in ("fixed", "smart")}
        hashes = {run["start_state_sha256"] for run in runs.values()}
        if len(hashes) != 1:
            raise RuntimeError(f"{scenario}: fixed and smart runs did not share the same starting state")
        start_hash = hashes.pop()
        if common_start_hash is None:
            common_start_hash = start_hash
        elif start_hash != common_start_hash:
            raise RuntimeError(f"{scenario}: scenario comparison did not share the common starting state")
        periods = {}
        for period, hours in (("transient", TRANSIENT_H), ("steady", STEADY_H)):
            fixed = _comparison_values(runs["fixed"][period], runs["fixed"][f"{period}_fuel_l"])
            smart = _comparison_values(runs["smart"][period], runs["smart"][f"{period}_fuel_l"])
            periods[period] = {
                "window_h": hours,
                "fixed": fixed,
                "smart": smart,
                "smart_minus_fixed": _metric_deltas(fixed, smart),
            }
        scenarios[scenario] = {
            "label": label,
            "start_state_sha256": start_hash,
            "trucks_required": trucks_required(scenario)["trucks"],
            "periods": periods,
        }
    return {
        "schema_version": EVIDENCE_SCHEMA_VERSION,
        "synthetic": True,
        "claim": "Matched deterministic model comparison; not measured mine performance.",
        "methodology": {
            "seed": 42,
            "step_s": STEP_S,
            "warmup_h": WARMUP_H,
            "trigger": "dispatch policy and operating condition are applied at the same simulated instant",
            "transient_window_h": TRANSIENT_H,
            "steady_window_h": STEADY_H,
            "common_start_state_sha256": common_start_hash,
            "fuel_basis": "A1 interval-integrated comparable-equipment medium-load rates",
        },
        "metric_definitions": COMPARISON_METRICS,
        "scenarios": scenarios,
    }


def comparison_json() -> str:
    return json.dumps(comparison_evidence(), indent=2, ensure_ascii=False) + "\n"


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

    smart = {name: evaluate(name, dispatch="smart") for name in SCENARIOS}
    print("### Scenario C: smart dispatch versus fixed fleet\n")
    print("Same warm-up; at the switch the dispatch policy changes together with the scenario. "
          "Each cell is fixed → smart, with the change.\n")
    for period, hours in (("steady", STEADY_H), ("transient", TRANSIENT_H)):
        title = (f"Steady state: hours {TRANSIENT_H + 1}–{TRANSIENT_H + STEADY_H} after the switch"
                 if period == "steady" else f"Transient: first {TRANSIENT_H} h after the switch")
        print(f"#### {title}\n")
        print("| Metric | " + " | ".join(SCENARIOS.values()) + " |")
        print("|---|" + "---:|" * len(SCENARIOS))
        print("| Trucks needed (model) | " + " | ".join(str(trucks_required(n)["trucks"]) for n in SCENARIOS) + " |")
        for key, label, fmt in DISPATCH_METRICS:
            cells = []
            for name in SCENARIOS:
                a, b = results[name][period][key], smart[name][period][key]
                cells.append(f"{fmt.format(a)} → {fmt.format(b)} ({impact(b, a)})")
            print(f"| {label} | " + " | ".join(cells) + " |")
        print()

    print("#### Breakdown trigger-time sensitivity under smart dispatch\n")
    print("| Trigger after warm-up | HT-01 location (fixed / smart) | First-hour production t, fixed | smart | smart vs fixed |")
    print("|---:|---|---:|---:|---:|")
    for offset in BREAKDOWN_OFFSETS_MIN:
        f = evaluate("truck_breakdown", offset)
        g = evaluate("truck_breakdown", offset, dispatch="smart")
        print(f"| {offset} min | {f['location']} / {g['location']} | {f['transient']['production_t']:,.0f} | "
              f"{g['transient']['production_t']:,.0f} | {impact(g['transient']['production_t'], f['transient']['production_t'])} |")
    print()
    worst = max(abs(r["mass_error_t"]) for r in list(results.values()) + list(smart.values()))
    print(f"Largest mass-balance error across the {len(results) + len(smart)} runs: {worst:.1e} t.")
    print(f"Dispatch policies: {', '.join(DISPATCH_POLICIES)}.")


if __name__ == "__main__":
    main()
