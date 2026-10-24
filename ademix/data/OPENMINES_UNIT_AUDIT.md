# OpenMines source and unit audit

Audit date: 2026-10-24

Upstream: `370025263/openmines` commit
`acd77e23de2c3b743485ec87cabdbbf7779ceb3e`.

The included `openmines/north_pit_mine.json` has normalized-LF SHA-256
`a966a72a6bfa91a86bcd6c3cdcccd9df5d4e83cdb36217a4ac4505ee77c0f16c`.
It is byte-identical to that file at the audited upstream commit. The MIT
license is retained beside it.

## Result

The JSON uses short field names without an embedded unit schema. The units are
nevertheless recoverable from the upstream simulator that consumes those
fields. `registry/openmines_unit_evidence.csv` records the exact evidence and
distinguishes two confidence levels:

- `confirmed_explicit`: upstream code names the unit directly;
- `confirmed_executable_semantics`: the unit follows from the equation and the
  simulator's minute time base, although the JSON field itself is unlabeled.

| Input | Ademix unit | Finding |
| --- | --- | --- |
| truck capacity | t | Explicitly documented as tons in `truck.py`. |
| truck speed | km/h | Explicitly documented as km/h in `truck.py`. |
| road matrices | km | Confirmed by `(distance / speed_kmh) * 60` minutes. The JSON alone does not label this unit. |
| shovel `tons` | t/pass | Used against truck capacity in tons and accumulated into produced tons. |
| shovel `cycle_time` | min/pass | Used directly on the minute-based simulation clock. |
| dumper `cycle_time` | min/truck | Used directly on the minute-based simulation clock. |
| road repair `lambda_repair` | 1/min | Used by an exponential interval on the minute clock. Not used by Ademix. |
| road repair `mu_repair_duration` | min | Upstream explicitly reports the duration in minutes. Not used by Ademix. |

## What remains assumed or derived

- Ademix's 3.2 km route is a team-selected one-way route, close to the source
  matrix value 3.18 km; it is not a surveyed alignment.
- Six trucks, 900 t/h crusher capacity, ROM capacity and scenario magnitudes
  remain clearly classified team assumptions or scenario inputs.
- Four shovel passes and six minutes per truck are Ademix derivations:
  `ceil(77 / 20.32) = 4`, then `4 * 1.5 min = 6 min`. OpenMines itself uses
  the unrounded ratio for loading time, so this rounding choice is explicitly
  Ademix's conservative discrete-pass model.
- None of these values is measured operating-mine telemetry, and internal
  consistency verification is not field validation.

## Stable upstream references

- Configuration: <https://github.com/370025263/openmines/blob/acd77e23de2c3b743485ec87cabdbbf7779ceb3e/openmines/src/conf/north_pit_mine.json>
- Truck equations: <https://github.com/370025263/openmines/blob/acd77e23de2c3b743485ec87cabdbbf7779ceb3e/openmines/src/truck.py>
- Loading model: <https://github.com/370025263/openmines/blob/acd77e23de2c3b743485ec87cabdbbf7779ceb3e/openmines/src/load_site.py>
- Road event model: <https://github.com/370025263/openmines/blob/acd77e23de2c3b743485ec87cabdbbf7779ceb3e/openmines/src/road.py>

