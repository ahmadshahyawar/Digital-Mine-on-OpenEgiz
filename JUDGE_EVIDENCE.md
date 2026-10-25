# Ademix claim-to-evidence index

Audited official application: `221ae3ec69b1d21b4d5130273c5c9c31b6b1bfb6`. Historical evidence below identifies earlier checkpoints where applicable. Current acceptance results and remaining environment limitations are in [the final audit](evidence/final-acceptance-2026-10-25.md).

This index provides factual navigation. Live values come from Eclipse Ditto. Saved comparison and sensitivity files contain synthetic deterministic model evidence, not measured mine performance.

| Rubric criterion or claim | Runtime action and expected observation | Source and automated evidence | Limitation |
|---|---|---|---|
| Mine model: 11 connected twins | Open **Mine model**. It lists the mine, six trucks, excavator, road, crusher and scenario controller. Selecting a node opens that twin. | `ademix/simulator/twins.json`; `ademix/data/topology/twin_relationships.json`; data relationship tests; `evidence/claude-c1/` | The boundary is the load-haul-crush circuit, not the entire mining enterprise. |
| OpenEgiz path | Wait for **LIVE · Eclipse Ditto twins · checked every 2 s**. Twin state and timestamps continue advancing. | `ademix/simulator/app.py`; `ademix/simulator/smoke_check.py`; final audit | Local demo and replay are labelled separately and are not end-to-end OpenEgiz evidence. |
| 3D operational visualization | Use **Overview**, select a truck and inspect the loading face, two-way road, dump bay and crusher flow. | `ademix/frontend/src/IngestionLayer.tsx`; `ademix/frontend/src/TerrainStage.tsx`; `evidence/claude-c5/` | Geometry is fictional and simplified. Support buildings and two waste trucks are context, not operational twins. |
| Behavioral credibility | Observe FIFO loading/dumping, payload growth, queues, movement, crusher processing and mass balance. | `ademix/simulator/engine.py`; 98 simulator/API/evidence tests; `ademix/simulator/SCENARIOS.md` | No passing, intersections, grade-dependent rimpull or multi-face dispatch. |
| Truck breakdown | Activate **HT-01 breakdown**, open **Show effect**, then tow/reset. The affected lane blocks until tow while the opposing lane remains open. | `verify_scenarios.py`; directional breakdown tests; `ademix/data/evidence/production_recovery.json`; `evidence/claude-c3/` | The steady five-truck fleet can recover to the loader limit. The matched returning-lane first hour is 691 t/h. |
| Road restriction | Activate **Main road restriction**. Both directions fall from 25 to 10.72 km/h and haulage becomes the constraint. | Scenario tests; `ademix/data/evidence/fleet_sizing.json`; `evidence/claude-c3/c3-road-restriction.png` | This is a speed restriction, not a road closure or alternate-route model. |
| Crusher slowdown | Activate **Crusher capacity -45%**. Capacity becomes 495 t/h, crusher utilization reaches its limit and ROM inventory grows. | Scenario tests; `ademix/data/evidence/fixed_vs_smart.json`; `evidence/claude-c3/c3-crusher-congestion.png` | Capacity is a team planning assumption, not a manufacturer rating. |
| Smart Dispatch decision | Open **Decision**, inspect the matched Fixed/Smart table, then apply Smart Dispatch. Baseline uses four cycling and two ready reserves while preserving modeled throughput. | `ademix/data/evidence/fixed_vs_smart.json`; `fleet_sizing.json`; `fleet_sensitivity.json`; equality/regeneration tests | Results are synthetic model comparisons and do not claim measured site savings or a universal optimum. |
| Recovery history | Open the production timeline after breakdown. Observed history, projection, disruption, tow, recovery and reset periods remain distinct. | `ademix/data/evidence/production_recovery.json`; history tests; `evidence/claude-b4/` | The rolling observed series can lag the physical road-clear event. |
| Fuel and emissions | Inspect the shift Fuel/ESG view. Cumulative totals integrate each interval and reset explicitly. | A1 tests; telemetry dictionary; `evidence/claude-b2/` | Tank percentage is a synthetic visual signal. Fuel/CO2 are modeled estimates, not measurements. |
| Model trust | Open **Why trust this?**. Live mass balance, observed throughput, projected capacity, bottleneck and constraint join the current twin state. Missing values show unavailable. | `ademix/simulator/MODEL_TRUTH_CONTRACT.md`; model-truth tests; `evidence/claude-c4/` | The twin is a decision demonstration, not an engineering design, safety system or production forecast. |
| Three-minute route | Follow Overview, breakdown, Show effect, Decision, Why trust this, Smart response and reset. Controls wait for returned state. | Guided-demo implementation; `evidence/claude-b6/`; `evidence/claude-c5/c5-regression.txt` | Final usability still depends on the judge host and viewport. |
| Data and asset provenance | Open the Data and Asset layer or inspect the repository records. | `ademix/data/DATA_CARD.md`; `OPENMINES_UNIT_AUDIT.md`; `DATA_LICENSES.md`; `REUSE_CATALOG.md`; data tests | The included source configuration is anonymized; the displayed layout remains fictional. |
| Software rendering | The current SwiftShader spot check auto-selected Light mode and rendered the scene. | `evidence/final-release/software-rendering.md`, `software-rendering.json`, `software-rendering.png` | 5.9 fps average and the screenshot shows STALE at 8 s; smooth, uninterrupted software-rendering acceptance is not claimed. |
| Reproducible release | Follow `README.md`, then run smoke and scenario verification. | `.github/workflows/ubuntu-release-verification.yml`; `evidence/final-release/`; Compose configuration | Windows Docker Desktop evidence does not substitute for a successful native Ubuntu workflow. |

## Main evidence commands

```bash
python -B -m unittest discover -s ademix/simulator -p 'test_*.py'
python -B -m unittest discover -s ademix/data -p 'test_*.py'
docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml -f ademix/compose.yml run --rm --no-deps ademix-simulator python smoke_check.py --base-url http://ademix-ui
python -B ademix/simulator/verify_scenarios.py
```

The repository records exact observed results only after these commands finish on the named candidate and environment.

## Current release spot-check

`evidence/final-release/live-route-final.json` is an earlier browser route on the Windows candidate. It records all
scenario acknowledgements, HTTP 200 state reads, and a clean final Eclipse Ditto reset, alongside the intermittent
STALE clock interval. The interval is a known limitation; the route must not be cited as a pass for “STALE never
appears.”

The later `221ae3e` reliability candidate passed three browser routes with 84 HTTP 200 state reads and no STALE
transition during those captures; records remain in `evidence/final-release/stale-diagnosis/`. Its SwiftShader
spot check measured 7.2 average / 6.0 low-5% FPS with LIVE data. These bounded observations do not establish
permanent absence of intermittent delay. The final audit reports fresh checks separately and does not infer
Ubuntu compatibility from Windows results.
