# SUBMISSION

## Concept

**Enterprise:** A 3D digital twin of an open-pit mine's loading, haulage, road and primary-crusher system.

**Users:** The mine dispatcher and shift supervisor.

**Decision:** It helps them decide how to keep ore moving safely and steadily when a truck breaks down, a haul road closes, or crusher capacity falls. The operator compares throughput, queue, cycle-time and utilization effects before choosing a response.

**Why this choice:** Haulage connects several mine facilities, so its problems and consequences are understandable in a live 3D view. Moving equipment, queues, rerouting and crusher flow also make a strong demonstration of connected twins rather than a decorative dashboard.

**Real or fictional:** The displayed mine is a fictional, reduced demonstration layout calibrated from the anonymized North Pit Mine configuration published by the MIT-licensed OpenMines project. Synthetic live telemetry is clearly distinguished from the sourced reference parameters.

## Team

| GitHub |
|---|
| `ahmadshahyawar` |
| `TurkenGulzat` |

## Mine

The submission represents the production chain from an open-pit loading face, along a 3.2 km haul route, to a primary crusher and run-of-mine bin. It uses 11 Eclipse Ditto twins:

- one mine aggregate;
- six 77 t haul trucks;
- one excavator/loading face;
- one haul road;
- one primary crusher; and
- one scenario controller.

Equipment and infrastructure twins refer to the mine as their parent. Their initial definitions are in `ademix/simulator/twins.json`. `ademix/simulator/engine.py` advances the deterministic operating model. `ademix/simulator/app.py` publishes Ditto Protocol updates to `telemetry/<thing>` over MQTT and reads every displayed state back through Ditto's HTTP API.

## Modules and What-if Scenarios

| Module or What-if Scenario | What it does | How to see it on the Stand | How to undo it (scenarios) |
|---|---|---|---|
| Live fleet supervision | Displays truck position, activity, payload, fuel, speed, completed trips, and cycle time from Ditto twins. | Select any moving truck in the 3D command center. | Not applicable |
| Production-flow monitor | Shows processed tonnes, crusher throughput, fleet utilization, cycle time, crusher capacity, queues, and ROM inventory. | Open the command center and observe the KPI row and facility/twin details. | Not applicable |
| Smart Dispatch | Calculates the fleet needed for the active bottleneck and parks surplus empty trucks in the standby bay, reducing operating truck-hours without claiming extra throughput. | In the **Scenarios** panel, select **C — Smart dispatch**; inspect required, cycling, and standby truck counts and the parked trucks. It can be combined with each operating condition. | Select **C** again to return to fixed dispatch, or select **A — Normal operations** to reset condition and policy. |
| Scenario comparison | Shows projected scenario throughput against the 770 t/h modeled operating baseline and the current observed metrics. | Activate a scenario in the left panel and inspect the comparison card and KPI row. | Select **Normal operations**. |
| Truck breakdown | Stops HT-01 at 0 km/h, releases any loading/dumping resource it occupied, and blocks following traffic in the affected direction until it is towed clear; the opposing lane remains open. | Select **Truck HT-01 breakdown**; the stopped truck, breakdown marker, location, blocked-truck count, and operational alert are driven by returned twin fields. | Select **Normal operations**. |
| Road restriction | Restricts the main haul road and reduces moving-truck speed from 25 to 10.72 km/h. | Select **Main road restriction**; the road changes color and truck twins report lower speed. | Select **Normal operations**. |
| Crusher slowdown | Reduces crusher capacity from 900 to 495 t/h while trucks continue delivering ore, causing ROM inventory to accumulate. | Select **Crusher capacity −45%** and inspect the crusher twin and comparison card. | Select **Normal operations**. |

## What works and what does not

Verified on the final combined Windows candidate:

- 98 simulator/API/evidence checks and 48 data-layer checks pass, including Smart Dispatch, directional breakdown behavior, convergence, scenario propagation, FIFO/exclusive resources, stage timing, evidence-to-frontend equality, startup recovery, API failure handling, cross-platform deterministic rounding, twin fields/units, provenance, sensitivity and mass conservation;
- simulator Python sources compile and twin JSON parses;
- simulator and frontend container images build;
- the production React/Three.js bundle compiles; and
- Docker Compose accepts the combined official OpenEgiz and Ademix configuration.

The earlier Windows software-rendering spot check measured 5.9 average frames/s and captured a temporary STALE
badge. The subsequent reliability candidate measured 7.2 average / 6.0 low-5% frames/s in Light mode with LIVE
data and no console/HTTP errors. These are short spot checks on one host, not proof of smooth or continuously
fresh software rendering. Both records are preserved in `evidence/final-release/`; see
`evidence/final-release/stale-diagnosis/README.md` and the final acceptance audit.

The complete local OpenEgiz deployment has started successfully from fresh volumes on the development machine. Eleven twins flowed through MQTT into Eclipse Ditto, the API reported `source: eclipse-ditto`, the interface returned HTTP 200, and all operating conditions were exercised through the frontend proxy. `smoke_check.py` validates the live API, real Ditto source, exact 11-twin inventory, and all 143 required fields/units without changing state; `verify_scenarios.py` performs the complete fixed/smart × four-condition matrix and clean reset through the live path. Native Ubuntu 24.04 evidence remains separate from Windows/Docker Desktop evidence and is reported only if its workflow completes.

### Baseline-versus-scenario evidence

The table reports hours 2–9 after a common four-hour baseline warm-up, generated by `python ademix/simulator/compare_scenarios.py`. These are synthetic model results, not mine measurements. Frontend cards show live rolling/window values; an automated test reproduces the same window and checks those displayed twin metrics against this evidence.

| Scenario | Throughput t/h | Cycle min | Load wait min | Crusher wait min | Fleet util. % | Crusher util. % | Trips/h | Operational recommendation |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Baseline | 770.0 | 36.0 | 13.6 | 0.0 | 62.1 | 85.6 | 10.00 | The loader is limiting; keep one truck as standby or add loading capacity before adding fleet. |
| HT-01 breakdown | 770.0 | 30.1 | 7.6 | 0.0 | 62.1 | 85.6 | 10.00 | Tow the affected lane first while opposing traffic continues, then continue with five trucks; they still saturate the loader. |
| Road restriction | 645.3 | 42.8 | 0.0 | 0.0 | 100.0 | 71.7 | 8.38 | Restore road speed first; if restriction persists, add one truck rather than crusher capacity. |
| Crusher −45% | 495.0 | 51.6 | 3.4 | 25.4 | 43.9 | 100.0 | 6.88 | Restore crusher capacity; meanwhile park surplus trucks or reduce loading to limit dump congestion. |

Why the metrics move: baseline trucks queue because the six-minute loader is the constraint. In the common returning-lane breakdown fixture, same-direction followers stop while opposing loaded traffic continues; first-hour throughput is 691.0 t/h and trips fall to 9/h. After towing, five trucks still feed the loader fully, so steady output recovers and the face wait falls. The road restriction lengthens travel, eliminating the loading queue while trucks remain continuously busy and the crusher becomes underfed. The crusher slowdown saturates processing, fills the ROM buffer, creates a 25.4-minute dump wait, lengthens cycles and leaves trucks queued rather than productive. The complete transient and steady tables, bottleneck reasons and trigger-time sensitivity are in `ademix/simulator/SCENARIOS.md`.

Smart Dispatch is evaluated separately from the operating condition. Under the deterministic assumptions it preserves modeled throughput while reducing truck operating-hours per 1,000 t by 33% in baseline, 20% after breakdown recovery, and 50% under crusher slowdown; it cannot reduce truck use during the road restriction because the model requires eight trucks and only six exist. These are synthetic model comparisons, not measured savings or a fuel claim. Exact fixed-versus-smart results and the fleet-sizing formula are in `ademix/simulator/SCENARIOS.md`.

## Data and Assumptions

Live telemetry is synthetic and deterministic. It is not presented as measurements from an operating mine.

The inspectable Data and Asset Layer is indexed in `ademix/data/README.md`. Its fleet specification, telemetry dictionary, and 3D model manifest distinguish sourced references, team assumptions, derived metrics, synthetic telemetry, and bundled assets.

The main calibration source is OpenMines' anonymized `north_pit_mine.json`, included at `ademix/data/openmines/north_pit_mine.json` with its MIT license. The submitted reduced model uses its 77 t truck capacity, 25 km/h travel speed, approximately 20.32 t shovel pass, 1.5 minute shovel cycle, one minute dump duration, and route-distance scale. Four shovel passes give a rounded six-minute loading duration for the 77 t truck. Team Ademix deliberately uses six trucks instead of the full source fleet so the state is understandable and the 3D scene remains usable under software rendering.

The displayed route geometry and terraced pit are fictional and simplified. The rated crusher capacity is an explicit 900 t/h planning assumption, not an equipment-manufacturer claim. With one six-minute loading resource, the modeled baseline supply is 770 t/h. Projected steady-state throughput is constrained by the minimum of fleet supply, loader supply, and crusher capacity. Five healthy trucks can still saturate the loader after one truck fails, so the breakdown's long-run analytical limit remains 770 t/h; its location-dependent transient is material, with the documented returning-lane first-hour reference falling from 770.0 to 691.0 t/h when triggered after the common four-hour warm-up. Restricted-road operation projects approximately 647.3 t/h and crusher slowdown 495 t/h. Actual processed ore remains mass-conserving: unprocessed deliveries accumulate in the ROM inventory, so observed cumulative throughput takes time to converge after a scenario change.

Exact provenance, checksum, license, modifications, and rejected asset sources are recorded in `DATA_LICENSES.md` and `REUSE_CATALOG.md`. No confidential or personal operational data is used.

## Mine visualization

Open <http://localhost:4173> after following `README.md`. The command center shows a terraced pit, haul route, loading face, primary crusher, stockpile, and six production trucks. Production-truck state, payload, route progress, KPIs and scenario comparison come from Eclipse Ditto; paint schemes are fixed identifiers. Left-drag pans, right-drag rotates, the wheel zooms toward the pointer, and double-click inspects equipment. Software rendering automatically selects Light graphics; the Graphics button switches between Light and Balanced. Models and soil textures are bundled locally. The authoritative Layer 1 scene is the default route; `?stage=ingestion` is retained as an equivalent explicit inspection URL.

## Limitations

- This is a decision-demonstration model, not an engineering design, safety system, or production forecast.
- Route traffic is simplified; trucks do not yet model passing, intersections, grade-dependent rimpull, or dispatch to multiple faces.
- The enlarged ten-turn visual route is not a surveyed 3.2 km alignment. Progress maps to the simulated route; visual scale/grade and timing are not a validated engineering model.
- Two waste trucks and surrounding support facilities are visual context, not additional operational twins or scored simulation modules. Road restriction slows traffic; alternate-route dispatch is not implemented.
- Only one operating condition is active at a time, allowing a clear controlled comparison and reliable reset.
- Fuel percentage is a synthetic visualization signal and is not calibrated to a specific engine or duty cycle.
- Scenario projections use a simplified steady-state cycle calculation; observed cumulative throughput takes simulated time to converge after a scenario change.
- The current procedural low-poly mine prioritizes reliable software rendering. Any third-party visual asset will be included only after exact license and performance verification.

## Presentation

`presentation.pdf` in the repository root uses current C5 interface evidence, current model counts and the verified decision results. `JUDGE_EVIDENCE.md` maps its claims to the running interface, source, fixtures and limitations. No video is required for the repository submission.

---

Platform: OpenEgiz v1.0.4.
