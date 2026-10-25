# Ademix claim-to-evidence index

Candidate basis: the completed B1-B6 and C1-C5 experience integrated at `caf6ee0`, plus release-only documentation and presentation updates on `codex/final-release-audit`.

This index provides factual navigation. Live values come from Eclipse Ditto. Saved comparison and sensitivity files contain synthetic deterministic model evidence, not measured mine performance.

| Rubric criterion or claim | Runtime action and expected observation | Source and automated evidence | Limitation |
|---|---|---|---|
| Mine model: 11 connected twins | Open **Mine model**. It lists the mine, six trucks, excavator, road, crusher and scenario controller. Selecting a node opens that twin. | `ademix/simulator/twins.json`; `ademix/data/topology/twin_relationships.json`; data relationship tests; `evidence/claude-c1/` | The boundary is the load-haul-crush circuit, not the entire mining enterprise. |
| OpenEgiz path | Wait for **LIVE VIA ECLIPSE-DITTO**. Twin state and timestamps continue advancing. | `ademix/simulator/app.py`; `ademix/simulator/smoke_check.py`; final smoke log | Local demo and replay are labelled separately and are not end-to-end OpenEgiz evidence. |
| 3D operational visualization | Use **Overview**, select a truck and inspect the loading face, two-way road, dump bay and crusher flow. | `ademix/frontend/src/IngestionLayer.tsx`; `ademix/frontend/src/TerrainStage.tsx`; `evidence/claude-c5/` | Geometry is fictional and simplified. Support buildings and two waste trucks are context, not operational twins. |
| Behavioral credibility | Observe FIFO loading/dumping, payload growth, queues, movement, crusher processing and mass balance. | `ademix/simulator/engine.py`; 93 simulator/API/evidence tests; `ademix/simulator/SCENARIOS.md` | No passing, intersections, grade-dependent rimpull or multi-face dispatch. |
| Truck breakdown | Activate **HT-01 breakdown**, open **Show effect**, then tow/reset. The affected lane blocks until tow while the opposing lane remains open. | `verify_scenarios.py`; directional breakdown tests; `ademix/data/evidence/production_recovery.json`; `evidence/claude-c3/` | The steady five-truck fleet can recover to the loader limit. The matched returning-lane first hour is 691 t/h. |
| Road restriction | Activate **Main road restriction**. Both directions fall from 25 to 10.72 km/h and haulage becomes the constraint. | Scenario tests; `ademix/data/evidence/fleet_sizing.json`; `evidence/claude-c3/c3-road-restriction.png` | This is a speed restriction, not a road closure or alternate-route model. |
| Crusher slowdown | Activate **Crusher capacity -45%**. Capacity becomes 495 t/h, crusher utilization reaches its limit and ROM inventory grows. | Scenario tests; `ademix/data/evidence/fixed_vs_smart.json`; `evidence/claude-c3/c3-crusher-congestion.png` | Capacity is a team planning assumption, not a manufacturer rating. |
| Smart Dispatch decision | Open **Decision**, inspect the matched Fixed/Smart table, then apply Smart Dispatch. Baseline uses four cycling and two ready reserves while preserving modeled throughput. | `ademix/data/evidence/fixed_vs_smart.json`; `fleet_sizing.json`; `fleet_sensitivity.json`; equality/regeneration tests | Results are synthetic model comparisons and do not claim measured site savings or a universal optimum. |
| Recovery history | Open the production timeline after breakdown. Observed history, projection, disruption, tow, recovery and reset periods remain distinct. | `ademix/data/evidence/production_recovery.json`; history tests; `evidence/claude-b4/` | The rolling observed series can lag the physical road-clear event. |
| Fuel and emissions | Inspect the shift Fuel/ESG view. Cumulative totals integrate each interval and reset explicitly. | A1 tests; telemetry dictionary; `evidence/claude-b2/` | Tank percentage is a synthetic visual signal. Fuel/CO2 are modeled estimates, not measurements. |
| Model trust | Open **Why trust this?**. Live mass balance, observed throughput, projected capacity, bottleneck and constraint join the current twin state. Missing values show unavailable. | `ademix/simulator/MODEL_TRUTH_CONTRACT.md`; model-truth tests; `evidence/claude-c4/` | The twin is a decision demonstration, not an engineering design, safety system or production forecast. |
| Three-minute route | Follow Overview, breakdown, Show effect, Decision, Why trust this, Smart response and reset. Controls wait for returned state. | Guided-demo implementation; `evidence/claude-b6/`; `evidence/claude-c5/c5-regression.txt` | Final usability still depends on the judge host and viewport. |
| Data and asset provenance | Open the Data and Asset layer or inspect the repository records. | `ademix/data/DATA_CARD.md`; `OPENMINES_UNIT_AUDIT.md`; `DATA_LICENSES.md`; `REUSE_CATALOG.md`; data tests | The included source configuration is anonymized; the displayed layout remains fictional. |
| Software rendering | Use Balanced quality on the recorded no-GPU browser configuration and complete the short route. | `evidence/final-release/software-rendering.md` and final screenshots when recorded | Performance evidence applies only to the recorded machine, browser, viewport and candidate. |
| Reproducible release | Follow `README.md`, then run smoke and scenario verification. | `.github/workflows/ubuntu-release-verification.yml`; `evidence/final-release/`; Compose configuration | Windows Docker Desktop evidence does not substitute for a successful native Ubuntu workflow. |

## Main evidence commands

```bash
python -B -m unittest discover -s ademix/simulator -p 'test_*.py'
python -B -m unittest discover -s ademix/data -p 'test_*.py'
docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml -f ademix/compose.yml run --rm --no-deps ademix-simulator python smoke_check.py --base-url http://ademix-ui
python -B ademix/simulator/verify_scenarios.py
```

The repository records exact observed results only after these commands finish on the named candidate and environment.
