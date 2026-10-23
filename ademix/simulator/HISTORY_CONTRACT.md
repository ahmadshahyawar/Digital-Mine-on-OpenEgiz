# Production and recovery history contract

This is the A3 timeline contract from Ahmad + Codex to Professor + Claude. It provides actual deterministic
simulator history for a production/recovery chart; it is not a decorative animation or measured mine data.

## Delivery

- Source fixture: `ademix/data/evidence/production_recovery.json`
- Frontend fixture: `productionRecovery` inside `ademix/frontend/public/data/ingestion.json`
- Schema: `ademix.production-recovery.v1`
- Reproduce: `python ademix/data/build_data_layer.py`
- Live twin/API fields are unchanged.

## Samples

Samples occur every 300 simulated seconds after a four-hour deterministic warm-up. Each sample contains:

| Field | Type | Unit | Existing twin source |
|---|---|---|---|
| `period_id` | integer | — | Comparison-period identifier |
| `sim_time_s` | number | s | `mine-01.sim_time_s` clock |
| `elapsed_s` | number | s | Derived from period start |
| `observed_rolling_throughput_tph` | number | t/h | `mine-01.throughput_tph` |
| `projected_steady_capacity_tph` | number | t/h | `scenario-controller.projected_throughput_tph` |
| `production_t` | number | t | `mine-01.production_t` |
| `active_scenario` | string | — | `mine-01.active_scenario` |
| `road_state` | string | — | `road-main.state` |
| `blocked_trucks` | integer | trucks | `road-main.blocked_trucks` |

The observed series is the rolling one-hour processed-production result. The projected series is the
analytical steady capacity under the active condition. They must be shown as different series and must not
be relabelled as equivalent, predicted actuals or measured output.

## Events

Events are ordered by `sim_time_s` and use these fixed kinds:

| Kind | Meaning and label rule |
|---|---|
| `period_started` | A new comparison began; informational marker. |
| `breakdown_started` | HT-01 entered breakdown and the disruption became active. |
| `road_cleared` | Exactly 1,200 simulated seconds later, HT-01 was towed aside and the blockage cleared. This is not yet throughput recovery. |
| `throughput_recovered` | First five-minute sample after road clear where observed rolling throughput reaches at least 95% of projected steady capacity. |
| `reset` | Scenario returned to baseline and a new `period_id` began at elapsed time zero. |

Reset does not delete the historical period in the fixture. It starts period 2, allowing the UI to preserve
the incident for review while clearly separating post-reset observations. The first reset sample must show
`baseline`, road `open` and zero blocked trucks.

## Fixture structure

`baseline.samples` is the control trajectory from the same hashed warm-up state. `breakdown_recovery.events`
contains event markers. `breakdown_recovery.periods[0]` contains the three-hour incident/recovery trajectory;
`periods[1]` contains one hour after reset. Both baseline and breakdown records share
`methodology.common_start_state_sha256`.

Frontend guidance: use simulated time on the x-axis, solid line for observed throughput, dashed line for
projected capacity, and event markers from the supplied array. Do not manufacture intermediate events,
smooth away the production dip, or claim field validation. Live mode may collect the same documented twin
fields at its polling interval, but it must preserve these names, units and meanings.
