# Fuel and CO2 frontend contract

This is the A1 data contract between Ahmad + Codex and Professor + Claude. The fields are
published on the `org.openegiz.ademix:mine-01` Eclipse Ditto twin and are also present in the local
demo API. They are synthetic model estimates, not measurements from an operating mine.

## Fields

| Field | Type | Unit | Allowed values | Example after fixture | Meaning |
|---|---|---|---|---:|---|
| `shift_fuel_l` | number | `L` | >= 0 | 663.0 | Interval-integrated fuel estimate since the explicit shift reset. |
| `shift_co2_kg` | number | `kg CO2` | >= 0 | 1774.851 | `shift_fuel_l × 2.677`; tank-to-wheel diesel CO2 only. |
| `current_fuel_rate_lph` | number | `L/h` | 83.5–381.1 | 381.1 | 83.5 L/h excavator plus 49.6 L/h per operating truck. |
| `operating_trucks_fuel_count` | integer | `trucks` | 0–6 | 6 | Trucks accruing the comparable operating rate. |
| `shift_start_sim_s` | number | `s` | >= 0 | 760.0 | Simulation clock when the current reporting shift began. |
| `shift_elapsed_s` | number | `s` | >= 0 | 7200.0 | Simulated seconds since `shift_start_sim_s`. |
| `shift_id` | integer | none | >= 1 | 2 | Monotonic identifier incremented by an explicit reset. |
| `fuel_estimate_basis` | string | none | `comparable-equipment medium-load rates` | same | Required truth label for the estimate. |

Every Ditto feature uses the existing `{ "properties": { "value": ..., "unit": ... } }` shape.
Unitless fields omit `unit`.

## Accounting and reset behavior

- Operating trucks are all states except `standby` and `breakdown`. Queued and blocked trucks are
  conservatively treated as engine-on.
- The excavator's 83.5 L/h comparable rate is included continuously during the demonstration shift.
- Integration occurs for every event interval, so changing the current fleet cannot rewrite prior
  consumption.
- Scenario and dispatch changes do **not** reset shift totals.
- `POST /api/shift/reset` is the only reset. It increments `shift_id`, records the current simulation
  time, and zeroes only `shift_fuel_l` and `shift_co2_kg`. It does not reset production, queues,
  trucks, scenario or dispatch.
- Per-truck `fuel_pct` remains an independent synthetic visual signal. Do not derive litres or CO2
  from it and do not imply that it reconciles with these totals.

## Reproducible fixture

With four operating trucks and two parked in Smart Dispatch, the rate is
`83.5 + 4 × 49.6 = 281.9 L/h`. Releasing all six trucks gives
`83.5 + 6 × 49.6 = 381.1 L/h`. One hour at each rate gives `663.0 L` and
`663.0 × 2.677 = 1774.851 kg CO2`.

Frontend labels should say **estimated shift fuel** and **estimated tank-to-wheel CO2**. They must
not say measured, actual, lifecycle emissions, or total mine energy. The frontend should consume
the cumulative fields directly rather than recomputing historical totals from the current fleet.
