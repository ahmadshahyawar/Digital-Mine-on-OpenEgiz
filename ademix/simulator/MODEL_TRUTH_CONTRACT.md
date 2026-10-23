# Ademix model-truth contract

Schema: `ademix.model-truth.v1`

The machine-readable contract is `ademix/data/evidence/model_truth.json` and is exposed in the generated
frontend bundle as `modelTruth`. It summarizes existing verified evidence; it does not add telemetry,
change formulas, validate the model against a mine, or authorize stronger claims.

## Required headline

> Verified against documented formulas and invariants; not validated against production data from an
> operating mine. Telemetry is synthetic model output delivered through OpenEgiz.

Do not shorten that statement in a way that removes either **verified** or **not validated**.

## Live values versus static explanation

The contract supplies labels, units, formulas, categories and safe wording. Current values must come from
`GET /api/state` and join by full `thing_id` plus `feature`:

- mass balance and observed rolling throughput: `org.openegiz.ademix:mine-01`;
- projected capacity and planned bottleneck: `org.openegiz.ademix:scenario-controller`;
- measured/live constraint: `org.openegiz.ademix:mine-01.bottleneck_live`.

Observed rolling throughput and projected steady capacity are different quantities. Never substitute one for
the other or blend them into a single value. If a returned field is missing, show **Unavailable**. In
particular, never show a successful mass-balance status when `mass_balance_error_t` is absent.

## Provenance categories

- `sourced`: copied from the bundled MIT OpenMines configuration.
- `derived`: calculated from documented parameters and formula.
- `assumption`: team planning choice, not a site/manufacturer figure.
- `scenario_input`: team-selected what-if magnitude.
- `kpi`: value computed from the current deterministic run.
- `analytical`: steady-state projection or its binding constraint.

The JSON values must agree with `registry/parameters.csv`; live field units/categories must agree with the
telemetry dictionary. The data tests enforce both joins.

## Limits

This is a deterministic conceptual model with one loading face, one two-way road twin, one dump bay, one ROM
bin and one crusher. It omits surveyed geometry, rolling resistance, stochastic failures, alternate routes,
crusher electricity and site calibration. Its checks demonstrate implementation consistency, not forecast
accuracy, safety certification or measured savings.

Regenerate the bundled fixture with:

```bash
python ademix/data/build_data_layer.py
```

