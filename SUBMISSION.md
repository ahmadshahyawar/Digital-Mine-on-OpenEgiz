# SUBMISSION

<!-- Fill in every section. The AI Jury studies this file together with the code, the Build Report, the presentation and the Stand's interface. Accepted languages: English, Kazakh, Russian. These hint comments may be deleted. -->

## Concept

<!-- Written by the Team before the code: your own choice, a few sentences per answer. Everything else in the Submission follows from it. -->

**Enterprise:** A 3D digital twin of an open-pit mine's loading, haulage, road and primary-crusher system.

**Users:** The mine dispatcher and shift supervisor.

**Decision:** It helps them decide how to keep ore moving safely and steadily when a truck breaks down, a haul road closes, or crusher capacity falls. The operator compares throughput, queue, cycle-time and utilization effects before choosing a response.

**Why this choice:** Haulage connects several mine facilities, so its problems and consequences are understandable in a live 3D view. Moving equipment, queues, rerouting and crusher flow also make a strong demonstration of connected twins rather than a decorative dashboard.

**Real or fictional:** The displayed mine is a fictional, reduced demonstration layout calibrated from the anonymized North Pit Mine configuration published by the MIT-licensed OpenMines project. Synthetic live telemetry is clearly distinguished from the sourced reference parameters.

## Team

<!-- GitHub usernames of the Participants. Other personal data are not required: the repository becomes public after the Freeze (Rules, section 15). -->

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

<!-- Modules: functions on top of the twin, from the Mine Map or your own. What-if Scenarios: changes of an operating condition that can be run on the Stand without changing the code (close a road, stop equipment…). Only what works on the Stand is taken into account. -->

| Module or What-if Scenario | What it does | How to see it on the Stand | How to undo it (scenarios) |
|---|---|---|---|
| Live fleet supervision | Displays truck position, activity, payload, fuel, speed, completed trips, and cycle time from Ditto twins. | Select any moving truck in the 3D command center. | Not applicable |
| Production-flow monitor | Shows processed tonnes, crusher throughput, fleet utilization, cycle time, crusher capacity, queues, and ROM inventory. | Open the command center and observe the KPI row and facility/twin details. | Not applicable |
| Scenario comparison | Shows projected scenario throughput against the 900 t/h planning baseline and the current observed metrics. | Activate a scenario in the left panel and inspect the comparison card and KPI row. | Select **Normal operations**. |
| Truck breakdown | Stops HT-01, marks it red, and constrains the remaining fleet to 16 km/h while the blocked single haul lane is cleared. | Select **Truck HT-01 breakdown**, then inspect HT-01 and another truck. | Select **Normal operations**. |
| Road restriction | Restricts the main haul road and reduces moving-truck speed from 25 to 10.72 km/h. | Select **Main road restriction**; the road changes color and truck twins report lower speed. | Select **Normal operations**. |
| Crusher slowdown | Reduces crusher capacity from 900 to 495 t/h while trucks continue delivering ore, causing ROM inventory to accumulate. | Select **Crusher capacity −45%** and inspect the crusher twin and comparison card. | Select **Normal operations**. |

## What works and what does not

Verified locally:

- all eleven deterministic engine tests pass, including 24-hour convergence of observed and projected throughput;
- simulator Python sources compile and twin JSON parses;
- simulator and frontend container images build;
- the production React/Three.js bundle compiles; and
- Docker Compose accepts the combined official OpenEgiz and Ademix configuration.

The complete local OpenEgiz startup is awaiting a clean run after the development machine's Docker virtual disk ran out of host storage during the first large image pull. This is recorded here rather than claiming an end-to-end check that has not completed. The final release checklist will only mark that path verified after a successful clean startup.

## Data and Assumptions

Live telemetry is synthetic and deterministic. It is not presented as measurements from an operating mine.

The main calibration source is OpenMines' anonymized `north_pit_mine.json`, included at `ademix/data/openmines/north_pit_mine.json` with its MIT license. The submitted reduced model uses its 77 t truck capacity, 25 km/h travel speed, approximately 20.32 t shovel pass, 1.5 minute shovel cycle, one minute dump duration, and route-distance scale. Four shovel passes give a rounded six-minute loading duration for the 77 t truck. Team Ademix deliberately uses six trucks instead of the full source fleet so the state is understandable and the 3D scene remains usable under software rendering.

The displayed route geometry and terraced pit are fictional and simplified. The planning baseline crusher capacity is an explicit 900 t/h assumption, not an equipment-manufacturer claim. Projected steady-state throughput is calculated from active trucks, payload, loading and dumping time, round-trip distance, scenario speed, and crusher capacity. This produces approximately 745 t/h for a breakdown that blocks the single active haul lane, 648 t/h for restricted-road operation, and 495 t/h for crusher slowdown. Actual processed ore remains mass-conserving: unprocessed deliveries accumulate in the ROM inventory, so observed cumulative throughput takes time to converge after a scenario change.

Exact provenance, checksum, license, modifications, and rejected asset sources are recorded in `DATA_LICENSES.md` and `REUSE_CATALOG.md`. No confidential or personal operational data is used.

## Mine visualization

Open <http://localhost:4173> after following `README.md`. The command center shows a terraced pit, haul route, loading face, primary crusher, stockpile, and six moving trucks. Equipment color, position, motion, KPIs, scenario comparison, and the selected-equipment panel all derive from state read from Eclipse Ditto. Camera orbit and zoom are interactive. The visual deliberately avoids expensive shadows, physics, post-processing, and external runtime assets for the judge's software-WebGL environment.

## Limitations

- This is a decision-demonstration model, not an engineering design, safety system, or production forecast.
- Route traffic is simplified; trucks do not yet model passing, intersections, grade-dependent rimpull, or dispatch to multiple faces.
- Only one operating condition is active at a time, allowing a clear controlled comparison and reliable reset.
- Fuel percentage is a synthetic visualization signal and is not calibrated to a specific engine or duty cycle.
- Scenario projections use a simplified steady-state cycle calculation; observed cumulative throughput takes simulated time to converge after a scenario change.
- The current procedural low-poly mine prioritizes reliable software rendering. Any third-party visual asset will be included only after exact license and performance verification.

## Presentation

`presentation.pdf` in the repository root. Video (optional): <link>

---

Platform: OpenEgiz v1.0.4.
