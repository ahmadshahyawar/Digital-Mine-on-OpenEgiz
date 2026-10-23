# Matched fixed-versus-smart comparison contract

This is the A2 evidence contract from Ahmad + Codex to Professor + Claude. It is a deterministic,
synthetic comparison of the existing `fixed` and `smart` dispatch policies. It is not measured mine
performance and it adds no live twin or command field.

## Delivery

- Source artifact: `ademix/data/evidence/fixed_vs_smart.json`
- Frontend artifact: `dispatchComparison` inside `ademix/frontend/public/data/ingestion.json`
- Schema version: `ademix.dispatch-comparison.v1`
- Reproduce both artifacts: `python ademix/data/build_data_layer.py`

The frontend should reject or deliberately migrate an unknown `schema_version`; field meanings must not
be inferred from display labels.

## Matched experiment

Every fixed/smart pair is constructed independently from the same deterministic engine seed and is
advanced through the same four-hour baseline warm-up. A SHA-256 hash of the full pre-command twin
snapshot proves that every pair and every condition branches from the same state. At the same simulated
instant, the dispatch policy and operating condition are applied. Both policies then use:

- a one-hour transient measurement window; and
- a separate eight-hour steady measurement window covering hours 2–9 after the switch.

Both measurement windows reset their KPI and A1 fuel counters at the boundary. They do not reset trucks,
queues, inventory or production state. The simulator advances in deterministic 20-second steps.

## JSON structure

```text
schema_version: string
synthetic: boolean (always true)
claim: string
methodology: {
  seed: integer,
  step_s: number,
  warmup_h: number,
  trigger: string,
  transient_window_h: number,
  steady_window_h: number,
  common_start_state_sha256: 64-character string,
  fuel_basis: string
}
metric_definitions: [{ key, label, unit }]
scenarios: {
  <baseline|truck_breakdown|road_closure|crusher_slowdown>: {
    label: string,
    start_state_sha256: string,
    trucks_required: integer,
    periods: {
      transient|steady: {
        window_h: number,
        fixed: { <metric>: number },
        smart: { <metric>: number },
        smart_minus_fixed: {
          <metric>: { absolute: number, percent: number|null }
        }
      }
    }
  }
}
```

`percent` is `null` when the fixed value is zero. The frontend should display this as `—` or `new`, not
as zero percent.

## Metrics and units

| Key | Unit | Meaning |
|---|---|---|
| `throughput_tph` | t/h | Tonnes processed inside the matched window divided by its duration. |
| `cycle_time_min` | min | Mean completed dump-to-dump cycle, including queues. |
| `loading_wait_min` | min | Mean FIFO wait before excavator service. |
| `crusher_wait_min` | min | Mean FIFO wait before dump-bay service. |
| `cycling_trucks_avg` | trucks | Time-average trucks neither parked nor broken down; includes queues and blocked trucks. |
| `standby_trucks_avg` | trucks | Time-average trucks in Smart Dispatch `standby`. |
| `truck_operating_h_per_kt` | h/kt | Non-standby, non-breakdown truck-hours per 1,000 t processed. |
| `estimated_fuel_l` | L | A1 interval-integrated comparable-equipment estimate for the window. |
| `estimated_fuel_l_per_kt` | L/kt | Estimated fuel divided by processed kilotonnes. |

## Baseline steady fixture

Over the matched eight-hour steady window, both policies produce 770.0 t/h. Fixed Dispatch averages six
cycling trucks and zero parked; Smart Dispatch averages four cycling and two parked. Operating truck-hours
fall from 7.792208 to 5.194805 h/kt (about 33.3%). Estimated fuel falls from 3048.8 to 2255.2 L (about
26.0%), because the documented excavator estimate remains active in both policies.

The correct claim is that Smart Dispatch preserves modeled throughput while reducing modeled truck
operating hours and estimated fuel under the stated assumptions. Do not claim measured savings, actual
site performance, lifecycle emissions, or a guaranteed 33% fuel reduction.
