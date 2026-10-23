# Digital Mine on OpenEgiz — Shared Project Context

> This file is the shared source of truth for the two-person team and all AI assistants working on the repository. Read it before making changes and update it after completing meaningful work.

## Project Goal

Build a compelling digital twin of a mining enterprise on the open OpenEgiz platform for the **Digital Mine on OpenEgiz** competition.

The project should model a mine or one of its major facilities, such as:

- an open-pit mine;
- an underground mine; or
- a mineral processing plant.

The team may choose its own functional modules. Possible modules include equipment operations, haulage and transportation, ventilation, production systems, operational analytics, forecasting, and interactive **what-if scenarios**.

## Team

- Team size: **2 people**
- Team name: **Ademix**
- Registration status: **Submitted / participating**
- Working method: both team members will contribute to the same GitHub repository, with assistance from Codex and Claude.

| Team member | Primary responsibilities | Current focus |
| --- | --- | --- |
| Ahmad Shah Yawar (`ahmadshahyawar`) | Product decisions and final review; technical work assisted by Codex and Claude | Repository access and project initiation |
| Turken Gulzat (`TurkenGulzat`) | Product decisions and final review; technical work assisted by Codex and Claude | Awaiting official repository invitation |

## Competition Summary

- Organizer: **DigitalEgiz Laboratory**
- Competition: **Digital Mine on OpenEgiz**
- Grand prize: **1,000,000 KZT**
- Submission languages: Kazakh, Russian, or English
- Development tools: unrestricted; AI technologies are allowed
- Submission method: the completed project must be submitted through the team's GitHub repository in accordance with the organizers' requirements.
- Official rules and registration: <https://openegiz-contest.github.io/rules/>
- Announcement: <https://farabi.university/news/107347?lang=en>
- Implementation release gate: [`RULES_CHECKLIST.md`](RULES_CHECKLIST.md)

## Important Dates

All dates are in 2026. Confirm the applicable timezone in the official rules before relying on the deadline.

| Date | Milestone |
| --- | --- |
| October 25, 23:59 | Registration and project submission deadline |
| October 26–30 | Preliminary evaluation, results, and appeals |
| October 31 | Live final broadcast on YouTube |

## Evaluation Priorities

The fixed rubric published in the 12 October 2026 rules awards up to **100 points**:

| Criterion | Points |
| --- | ---: |
| Mine model | 25 |
| Mine visualization | 25 |
| Behavioral credibility | 20 |
| Concept and presentation | 15 |
| What-if scenarios | 10 |
| Modules | 5 |

The ten highest-scoring projects in preliminary evaluation advance to the live final.

## Product Direction

The current agreed concept is a **3D open-pit haulage and crusher optimization digital twin**. Its primary user is a mine dispatcher who needs to maximize ore movement and crusher throughput while reducing queues, idle time, cycle time, and avoidable fuel use.

The main experience should be a polished 3D mine command center, not a separate decorative animation. The 3D scene must visualize live state originating in OpenEgiz digital twins and make operational changes understandable.

Planned 3D elements include:

- terraced open-pit terrain and haul roads;
- moving haul trucks with operational status and payload;
- excavators, loading areas, crusher, stockpile, and waste dump;
- selectable equipment with live details;
- route highlighting, queue visualization, alerts, and status colors;
- purposeful motion such as loading, hauling, unloading, crusher activity, and stockpile growth;
- smooth camera presets and transitions; and
- visible effects of what-if scenarios with baseline-versus-scenario metrics.

Target scenarios are a truck breakdown, a road closure with rerouting, and reduced crusher capacity. The final selection may change after the competition repository is inspected.

The selected implementation direction is **React, TypeScript, and React Three Fiber** for the 3D command center, with **Python** for simulation and dispatch logic. It will integrate with OpenEgiz through MQTT, Eclipse Ditto, InfluxDB, and Docker Compose. Unity is intentionally avoided because its editor- and asset-heavy workflow is less suitable for AI-first, code-driven development and rapid automated review.

Technology choices must favor Codex/Claude effectiveness and token efficiency:

- prefer code-first tools, declarative configuration, and small reusable components;
- extend the official OpenEgiz template instead of rebuilding platform infrastructure;
- keep one frontend and one simulation service rather than unnecessary microservices;
- use typed schemas and shared configuration to reduce duplicated logic;
- use procedural or reusable low-poly 3D elements where practical;
- avoid large generated files, copied boilerplate, and needless abstractions;
- keep documentation concise but sufficient for the AI builder and judges; and
- reserve context files for decisions, status, interfaces, and handoffs rather than verbose work logs.

A strong submission should ideally provide:

- a clear mine layout and understandable operational flow;
- a simulation based on explicit assumptions and units;
- useful real-time or simulated operational metrics;
- at least one meaningful what-if scenario with before/after comparison;
- attractive, legible visualization;
- reproducible setup and demo instructions;
- documented data sources, formulas, limitations, and assumptions; and
- a polished presentation suitable for an AI jury and a live final.

## Current Status

**Last updated:** 2026-10-22

- The team has registered for the competition.
- The submitted registration records team name **Ademix** with GitHub users `ahmadshahyawar` and `TurkenGulzat`.
- The organizer invitation was received and the official Team Repository is <https://github.com/openegiz-contest/team-111>.
- The local work now uses the organizer's OpenEgiz v1.0.4 template as its base; the previous personal repository remains configured only as the `personal` backup remote.
- The local project workspace has been created.
- The team has agreed to pursue a polished 3D solution.
- The working concept is an open-pit haulage and crusher optimization twin.
- The official rules have been converted into `RULES_CHECKLIST.md`.
- `RULES_CHECKLIST.md` is the internal rulebook for requirements, judging, licensing, integrity, appeals, final-stage duties, and release verification; agents must consult it before implementation and submission work.
- The judge provides WebGL without GPU acceleration, so the 3D scene must be optimized for software rendering.
- Codex and Claude will perform the principal planning, implementation, integration, testing, and documentation work.
- The human team does not need to install or manually operate every development tool; the final repository must nevertheless include everything required to run reliably in the judge's Ubuntu/Docker environment.
- The technology direction is React + TypeScript + React Three Fiber for 3D and Python for simulation, integrated with the OpenEgiz stack.
- Docker Desktop is installed and verified with Linux containers on the development computer: x86-64, 8 CPUs, and approximately 8 GB assigned memory.
- Official competition repository: <https://github.com/openegiz-contest/team-111>
- Personal backup repository: <https://github.com/ahmadshahyawar/Digital-Mine-on-OpenEgiz>
- The initial React/Python foundation, OpenMines calibration file, and Docker Compose overlay are present on local branch `codex/ademix`.
- `REUSE_CATALOG.md` records the license-checked reuse strategy. The first selected visual source is the CC0 Ore Processing and Haulage Plant pack; exact models are not yet committed.
- The simulator and frontend Docker images both build successfully. The frontend now has a dependency lock file and uses `npm ci` for reproducible builds.
- The deterministic model conserves ore through a ROM inventory, processes it at scenario-dependent crusher capacity, and has eleven passing unit tests. *(Superseded on 2026-10-22 by the discrete-event engine described below.)*
- The root `README.md` now contains literal judge startup, verification, reset, Windows, architecture, and repository instructions. `SUBMISSION.md` documents every current module/scenario, data assumptions, verification status, and limitations.
- The complete OpenEgiz + Ademix Compose deployment now starts successfully on Windows. Eleven twins flow through MQTT into Eclipse Ditto, the API reports `source: eclipse-ditto`, and the 3D UI is healthy at `http://localhost:4173`.
- All four live scenario controls were exercised end to end. Ditto reported the expected breakdown, restricted-road, reduced-crusher, and reset states with projected throughput of 745.16, 647.6, 495, and 900 t/h respectively. *(Those figures came from the previous engine. The new engine projects 770, 770, 647.3 and 495 t/h and has not yet been run end to end through Ditto.)*
- Chrome rendered the live 3D command center successfully in software/headless mode. The first runtime review confirms functionality but also shows that terrain detail, route separation, and equipment legibility need visual refinement.
- The first placeholder scene was rejected during human review as visually inadequate. It is being replaced with a terraced open pit, curved bench road, richer plant geometry, a populated fleet panel, and optimized CC0 excavator/hauler GLBs from SELENE-ISRU.
- Visual work now follows explicit approval checkpoints. Stage 1 isolates a deterministic height-field open pit built with the MIT-licensed THREE.Terrain engine: natural surrounding relief, six engineered benches, a 23.5-unit-deep floor, vertex geology colors, and software-WebGL lighting. Roads and equipment are intentionally excluded from the `?stage=terrain` review view.
- Stage 2 adds a terrain-integrated 7.2-unit-wide spiral haul ramp, blended shoulders, an outer safety berm, center markings, and flattened loading/crusher pads. The first floating-road attempt was rejected before commit; the corrected `?stage=roads` view cuts the ramp into the height field.
- Stage 3 equipment review at `?stage=equipment` places six optimized CC0 haulers in alternating lanes along the approved spiral route and a CC0 excavator on the pit-floor loading pad. The Stage 1/2 URLs deliberately remain isolated without equipment for comparison.
- Stage 4 processing-plant review at `?stage=plant` adds a compact truck dump, primary-crusher module, transfer conveyors, access stairs, and coarse-ore stockpile assembled from five pinned CC0 Kenney Factory Kit GLBs. A first SELENE-based composition was visually rejected before commit because it read as lunar equipment and extended outside the camera frame.
- Stage 5 live-motion review at `?stage=motion` animates the six haulers along the approved spiral, oscillates the excavator only while its OpenEgiz twin reports loading, and moves ore markers through the plant at a rate controlled by crusher state. Truck state, reported speed, direction, and breakdown status drive movement and status markers.
- **Core Simulation Engine rewrite (branch `claude/core-simulation-engine`, based on `codex/ademix`):** `ademix/simulator/engine.py` is now an event-driven DES. It models one single-server excavator (FIFO), one crusher dump bay (FIFO), a 600 t ROM bin that can block dumping, and a single-lane road with a shared speed limit and breakdown blockage. It reports full cycle time, queue waits, utilization, rolling-hour throughput, trips and a mass balance. With the team's OpenMines parameters, the baseline is **excavator-limited at 770 t/h** (match factor 1.61), not 900 t/h. Road restriction gives 647 t/h (haulage-limited) and crusher slowdown 495 t/h (crusher-limited). A single breakdown costs about 190 t/h during the 20-minute lane blockage and nothing in steady state. 21 deterministic tests pass. Formulas, assumptions, results and limitations are in `ademix/simulator/MODEL.md`.
- **What-If Scenario Engine (branch `claude/what-if-scenarios`, based on `claude/core-simulation-engine`):** scenarios now carry a cycle guard (illegal truck-state transitions and payload/state contradictions raise), report HT-01's breakdown location, and publish a live bottleneck measured over the last 30 simulated minutes next to the analytical one. Both use the five constraint names: loading resource, haul-road travel, available truck fleet, dump point and crusher processing capacity. `compare_scenarios.py` compares all scenarios from an identical 4 h baseline over the same 9 h, with every metric and its % change, plus a breakdown trigger-time sensitivity table. The reset test found and fixed a stale-blockage bug. 31 tests pass. Details and results: `ademix/simulator/SCENARIOS.md`. `CORE_SIMULATION_TASKS.md`, named in the request, does not exist in the repository.
- **Data & Asset Layer (branch `claude/data-asset-layer`, based on `claude/what-if-scenarios`; built at TurkenGulzat's request, who is informing the professor who owns this layer):** `ademix/data/` now holds a 25-parameter register with field-level source traceability, fleet and route tables derived from OpenMines, a twin-type schema, a 65-feature telemetry dictionary, four reproducible synthetic telemetry logs with a SHA-256 manifest, a data card (`DATA_CARD.md`) and 19 validation tests. Findings: the recorded OpenMines checksum was for a CRLF copy; four `twins.json` seed values disagreed with the model (`bucket_t` 22 → 20.32, road speed 35 → 25, two `idle` states); the 3.2 km route is shorter than 76 % of the source load-to-dump distances.
- **2026-10-23 presentation update:** Slide 7 now covers baseline operations, breakdown injection, dynamic bottleneck shifts and smart dispatch as future work. It uses DES projections (770, 770, 647.3 and 495 t/h), identifies the 581.6 t/h breakdown first-hour transient, and states that automatic dispatch/rerouting is not implemented. Slide 6's baseline and road values and slide 8's engine test count were corrected. Editable PPTX/PDF exports are in `presentation/output/`.

## Immediate Decisions and Tasks

- [x] Add the GitHub repository URL.
- [x] Add both team members' names and GitHub usernames.
- [x] Review the official rules and record the scoring weights.
- [x] Convert the official rules into a release checklist.
- [x] Select an initial facility and concept: 3D open-pit haulage and crusher optimization.
- [x] Define the initial user story: help a dispatcher respond to disruption and improve production flow.
- [x] Select React Three Fiber instead of Unity for AI-first, code-driven implementation.
- [x] Define the simulation assumptions, inputs, outputs, and validation method.
- [x] Select the what-if scenarios.
- [ ] Create an implementation plan split between the two team members.
- [x] Define the final demo, screenshots/video, documentation, and presentation deliverables.
- [ ] Confirm submission mechanics and deadline timezone.

## Collaboration Rules

### Before starting work

1. Read this entire file.
2. Inspect the repository and recent Git history.
3. Check the current status, active tasks, decisions, and known issues below.
4. Avoid duplicating work already assigned to the other team member or assistant.
5. Do not overwrite unrelated or uncommitted changes.

### While working

- Keep changes focused and reviewable.
- Use a separate branch for substantial work when practical.
- Record important architectural and product decisions in this file.
- Document assumptions, units, formulas, and data sources next to simulation code.
- Never fabricate mining data or claim simulation accuracy without stating the validation basis.
- Keep secrets, tokens, credentials, and private datasets out of Git.
- Keep the human workflow simple: ask the team for repository access, business choices, and visual feedback, while AI assistants handle technical implementation wherever possible.
- Treat the 3D scene as a live view of OpenEgiz twin state. Do not create a disconnected mock animation and present it as a digital twin.
- Review licenses and preserve required attribution for all reused code, models, textures, fonts, datasets, and other assets.
- Prefer adapting proven free/open-source components and organizer-recommended datasets over rebuilding commodity functionality, but verify each license before copying and record included material in `DATA_LICENSES.md`.

### After meaningful work

Update the following sections before handing off:

- **Current Status**
- **Active Work**
- **Completed Work Log**
- **Decisions**
- **Known Issues and Risks**
- **Next Recommended Action**

Include changed paths, tests or checks performed, and anything the next contributor must know.

## Active Work

| Owner | Task | Branch | Status | Notes |
| --- | --- | --- | --- | --- |
| Codex | Refine the live 3D command center and complete release evidence | `codex/ademix` | In progress | End-to-end OpenEgiz integration passes; improve visual quality, performance evidence, and final documentation next |
| Claude (for TurkenGulzat) | Core Simulation Engine review and improvement | `claude/core-simulation-engine` | Ready for review | Engine, tests, MODEL.md, comparison script and SUBMISSION/README figures are done. Still needed: merge into `codex/ademix`, a Docker/Ditto end-to-end rerun, and the one-line UI label fix (see Known Issues) |
| Claude (for TurkenGulzat) | What-If Scenario Engine review and improvement | `claude/what-if-scenarios` | Ready for review | Builds on the engine branch; merge that first or merge this branch instead. Stand not rerun (Docker was uninstalled from this laptop on 2026-10-23) |
| Claude (for TurkenGulzat) | Data & Asset Layer | `claude/data-asset-layer` | Ready for review | Professor owns this layer; TurkenGulzat approved building it and is informing the professor. Contains the engine and What-If branches |

## Completed Work Log

| Date | Contributor | Work completed | Verification |
| --- | --- | --- | --- |
| 2026-10-21 | Codex | Created the shared project context and assistant guidance files | Files reviewed locally |
| 2026-10-21 | Codex | Reviewed the official rubric and recorded the agreed 3D project direction | Context updated locally |
| 2026-10-21 | Codex | Connected the workspace to the competition repository and verified its current state | Remote is reachable but contains no branches or commits |
| 2026-10-21 | Codex | Converted the official rules and judge-environment constraints into a release checklist | `RULES_CHECKLIST.md` created |
| 2026-10-22 | Codex | Verified Docker Desktop, Compose, Linux-container mode, engine resources, registry download, and container execution | Official `hello-world` container completed successfully |
| 2026-10-22 | Codex | Rebased the project foundation onto the official `openegiz-contest/team-111` template while retaining the personal repository as a backup remote | Official `origin/main` fetched; local branch `codex/ademix` contains the preserved work |
| 2026-10-22 | Codex | Created a license-first reuse catalog covering mining simulation, CC0 mining/industrial assets, 3D performance tooling, charts, and rejected sources | Sources classified as Adopt, Shortlist, Reference, or Reject in `REUSE_CATALOG.md` |
| 2026-10-22 | Codex | Filled the organizer's required Concept and Team sections from the team's agreed direction and added team copyright | `SUBMISSION.md` and `LICENSE` updated locally |
| 2026-10-22 | Codex | Built the React/Three.js production image and locked frontend dependencies | `docker build -t ademix/mine-ui:test ademix/frontend` passed; Vite produced the production bundle |
| 2026-10-22 | Codex | Corrected crusher mass flow, added ROM inventory and visible baseline/scenario projections, and added deterministic tests | Eight `unittest` checks pass; Python compilation and JSON parsing pass |
| 2026-10-22 | Codex | Replaced the organizer placeholder README and completed the current submission narrative | Local frontend `npm ci && npm run build` passed; README instructions and SUBMISSION claims reviewed against implemented code |
| 2026-10-22 | Codex | Attempted the first full OpenEgiz + Ademix startup and recovered Docker after its WSL2 backend timed out | Compose configuration passed; pull could not finish because C: reached zero free space, so no end-to-end success is claimed |
| 2026-10-22 | Codex | Created the required nine-slide judge presentation plus an editable source deck | PPTX passed package, layout, font-policy, chart, and first-party import validation; the nine-page PDF was rendered with Poppler and every page was visually inspected |
| 2026-10-22 | Codex | Tightened scenario consistency and interface failure handling | Ten deterministic simulator tests pass; road restriction twin state matches truck speed; UI distinguishes connection state and prevents duplicate scenario requests |
| 2026-10-22 | Codex | Replaced fixed scenario percentages with a transparent steady-state fleet/cycle calculation | Eleven tests pass, including a 24-hour convergence check; projected throughput is approximately 900, 745, 648, and 495 t/h |
| 2026-10-22 | Codex | Completed the first full OpenEgiz + Ademix integration run and repaired cross-platform Compose paths/script endings | All required services healthy; setup jobs exited successfully; API returned eleven twins from Eclipse Ditto; UI returned HTTP 200 |
| 2026-10-22 | Codex | Exercised every scenario through the running HTTP control and verified propagated Ditto state | Breakdown stopped HT-01; road restriction changed road state; crusher slowdown reduced capacity; reset restored baseline |
| 2026-10-22 | Codex | Captured and reviewed the first real Chrome render of the 3D interface | WebGL scene, live KPI state, controls, and Ditto connection badge rendered under headless/software Chrome |
| 2026-10-22 | Codex | Built isolated Stage 1 terrain review using a pinned MIT terrain engine | Production build passes; software/headless Chrome rendered `/?stage=terrain` at 1440×1000 |
| 2026-10-22 | Codex | Built isolated Stage 2 haul-road review and rejected the initial floating-road geometry | Corrected ramp is carved into the height field; production build and 1440×1000 software-Chrome render pass |
| 2026-10-22 | Codex | Added the first Stage 3 equipment layer to the accepted terrain and road | Six haulers and one excavator render from bundled CC0 GLBs; production build and 1440×1000 software-Chrome render pass |
| 2026-10-22 | Codex | Added the Stage 4 processing-plant checkpoint and rejected an unsuitable first asset composition | Production build passes; 1440×1000 software-Edge render shows the full dump-to-crusher-to-stockpile flow inside frame |
| 2026-10-22 | Codex | Added Stage 5 purposeful motion linked to OpenEgiz truck, excavator, and crusher twin properties | Production build passes; 1440×1000 software-Edge capture confirms the moving fleet remains separated and the full scene stays in frame |
| 2026-10-22 | Claude | Rewrote the simulator as a deterministic discrete-event model with excavator/dump-bay queues, a limited ROM bin, breakdown lane blockage, full cycle time, utilization and a mass-balance ledger; added `MODEL.md` and `compare_scenarios.py`; corrected the SUBMISSION/README scenario figures | `python -m unittest test_engine`: 21 tests pass; `compare_scenarios.py` reproduces the MODEL.md table; `py_compile` passes for app.py, engine.py and compare_scenarios.py. Docker/Ditto end-to-end was **not** rerun (Docker unavailable on this machine) |
| 2026-10-23 | Claude | What-If Scenario Engine: live and analytical bottleneck analysis with five named constraints, cycle-transition guard, breakdown location, time-averaged queues and ROM, identical-baseline comparison with % impacts and breakdown timing sensitivity; fixed trucks staying `blocked` after a blockage cleared | `python -m unittest test_engine`: 31 tests pass; `compare_scenarios.py` reproduces SCENARIOS.md; mass-balance error ≤ 9.1e-13 t. Not run on the Docker stand |
| 2026-10-23 | Claude | Data & Asset Layer: parameter register with source traceability, derived fleet and route tables, twin-type schema, telemetry dictionary, synthetic logs with provenance manifest, data card; corrected the OpenMines checksum record and four `twins.json` seed values; pinned LF endings for data and simulator files | `python -m unittest discover -s ademix/data`: 19 tests pass; simulator: 31 tests pass |
| 2026-10-23 | Codex | Rebuilt the scenario presentation section from the DES model, corrected adjacent baseline/validation figures, and documented smart dispatch as future work | PPTX finalizer reports 9 slides, one editable chart, clean package/layout checks and successful Artifact Tool import; rendered slides reviewed. GitHub fetch could not connect, so organizer updates were not checked |

## Decisions

| Date | Decision | Reason | Owner |
| --- | --- | --- | --- |
| 2026-10-21 | Use `PROJECT_CONTEXT.md` as the shared project memory | Keeps human and AI contributors aligned through one maintained source of truth | Team |
| 2026-10-21 | Build a 3D open-pit haulage and crusher optimization twin | Strong fit for spatial visualization, credible simulation, and visible what-if scenarios | Team |
| 2026-10-21 | AI assistants handle most technical work | The human team should focus on access, decisions, feedback, and final review rather than complex setup | Team |
| 2026-10-21 | Keep 3D but optimize for CPU/software WebGL rendering | The official judge environment has no graphics acceleration | Team |
| 2026-10-22 | Use React, TypeScript, React Three Fiber, and Python; avoid Unity | Codex and Claude work most effectively with code-first stacks, enabling faster implementation, review, and repair with lower context overhead | Team |
| 2026-10-22 | Optimize the collaboration process for token efficiency | The short deadline favors concise interfaces, limited services, reusable components, and minimal duplicated context | Team |
| 2026-10-22 | Reuse licensed open data and visual assets where practical | Adapting proven components saves time, while license-first review protects submission eligibility | Team |
| 2026-10-22 | Use the official `team-111` repository as `origin` and retain the personal repository as `personal` | The frozen official repository is the evaluated submission; retaining the old remote preserves a separate backup destination | Team |
| 2026-10-22 | Use a small subset of the CC0 3DAssets.dev Ore Processing and Haulage Plant pack | It provides coherent mining-specific plant visuals without requiring the team to model the crusher system from scratch | Team |
| 2026-10-22 | Require visual checkpoint approval before adding the next scene layer | Prevents weak terrain, roads, equipment, motion, and UI from being combined into an incoherent final scene | Team |
| 2026-10-22 | Use a five-model CC0 Kenney Factory Kit subset for the plant checkpoint | The preferred mining pack CDN was unavailable; Kenney's pinned local GLBs are small, consistent, license-safe, and render reliably in software WebGL | Team |
| 2026-10-22 | Drive motion from existing twin properties rather than a disconnected animation timeline | Truck state/speed/direction, excavator state, and crusher state now visibly affect the 3D review scene while interpolation keeps movement smooth between two-second API updates | Team |
| 2026-10-22 | Use an event-driven simulation with an explicit single-server excavator and dump bay, and report the binding bottleneck | The time-stepped model let several trucks load from one excavator at once, which overstated baseline throughput (900 t/h against a physical limit of 770 t/h). Event scheduling also makes results independent of the publishing tick | Claude (for TurkenGulzat) |
| 2026-10-22 | Model the breakdown as a 20-minute single-lane blockage followed by a 5-truck fleet, replacing the unexplained 0.64 fleet-wide speed factor | The effect now follows from a stated mechanism and can be observed on the road and truck twins | Claude (for TurkenGulzat) |
| 2026-10-23 | Detect the live bottleneck as the most downstream saturated server (≥ 95 % busy over 30 min) with trucks waiting or the ROM bin accumulating; otherwise haulage (road if speed-limited, else fleet); a blocked lane overrides | A measured rule that agrees with the analytical bound in steady state but shows transient shifts, such as the blocked road and post-blockage truck bunching | Claude (for TurkenGulzat) |
| 2026-10-23 | Keep the engine's constants in code and enforce agreement with `ademix/data/registry/parameters.csv` by tests, instead of reading the register at runtime | The simulator image's build context is `ademix/simulator`, so a runtime dependency on `ademix/data` would break the stand | Claude (for TurkenGulzat) |

## Known Issues and Risks

- The remaining competition schedule is short; scope must be chosen quickly.
- The detailed simulation validation method and baseline-versus-scenario evidence still need to be completed.
- A visually impressive scene that does not receive its operational state through OpenEgiz would fail the core platform requirement.
- Third-party repositories and 3D assets create licensing, attribution, compatibility, and performance risks that must be checked before use.
- The frontend JavaScript bundle is about 1.12 MB before gzip (317 kB gzip); it builds successfully but should be split or reduced after the staged scene is integrated into the live view.
- The selected CC0 mining asset service was temporarily unavailable on 2026-10-22; no unverified or incomplete asset was committed.
- The current presentation uses a clearly labeled conceptual interface composition. Replace it with a real application screenshot only after the clean end-to-end stack passes; do not present the concept graphic as runtime evidence.
- Local MQTT port 1883 was unavailable during Windows validation, so the host-only development override `MQTT_PORT=1884` was used. Container-to-container traffic and judge defaults remain unchanged.
- The first live render is operational but visually sparse: trucks overlap on the single route and the procedural pit lacks enough benches and landmarks for a competition-grade overview.
- AI-based judging makes explicit documentation, reproducibility, and visible evidence especially important.
- Concurrent work in one repository can cause conflicts unless task ownership and branches are kept current.
- Commit `aa0156d` on `claude/core-simulation-engine` (pushed) was made with `git commit -a` and unintentionally included Codex's then-uncommitted edits to `presentation/build.mjs`, `presentation/render_pdf.py` and two PROJECT_CONTEXT.md lines, under TurkenGulzat's name. Nothing was lost; Codex has newer uncommitted presentation edits in the working tree. Decide whether to keep or revert those presentation changes on that branch before merging.
- The breakdown scenario's first-hour effect depends on where HT-01 is when triggered (0 % to −25 % of first-hour production; table in SCENARIOS.md). The demo should trigger it while HT-01 is on the road to show the blockage.
- The Data & Asset Layer belongs to the professor; the `claude/data-asset-layer` branch should be reviewed with them before merging. If `engine.py` or the register changes, rerun `python ademix/data/build_data_layer.py`, or the provenance tests fail.
- The scenario comparison label in `ademix/frontend/src/main.tsx` now reads `baseline_throughput_tph` from the scenario-controller twin (commit 3e5d5ad) instead of the hard-coded 900 t/h. Verified on 2026-10-23 with Node.js 24.22.1: `npm ci && npm run build` (which runs `tsc -b` then `vite build`) passes. The Docker image uses Node 22, which was not tested locally.
- Root `presentation.pdf` and `presentation.pptx` remain the original exports. Use the refreshed editable exports in `presentation/output/` for review and submission.
- The new truck states (`queued_at_excavator`, `queued_at_crusher`, `blocked`) have no dedicated colour in `fleet.css` or `MineScene.tsx`, so they render in the default green. These trucks report speed 0, so the motion review stops them correctly.
- Fuel is synthetic and has no refuelling. It reaches 0 % after roughly 13 simulated hours (about 40 real minutes at 20× speed).

## Next Recommended Action

Data & Asset branch: review `claude/data-asset-layer` with the professor (it contains the engine and What-If work), then merge it into `codex/ademix`.

What-If branch: review `claude/what-if-scenarios` (it contains the engine branch). When a 16 GB machine with Docker is available, rerun the stand and confirm `bottleneck_live` on `mine-01` changes as SCENARIOS.md describes.

Review and merge `claude/core-simulation-engine` into `codex/ademix`, then replace the hard-coded 900 t/h UI label and rerun the scenarios through Docker and Ditto. The refreshed presentation figures now match the DES model, but its end-to-end integration still needs that rerun.

After human review of `?stage=motion`, promote the accepted staged scene into the default live command center, add selection feedback and scenario-specific road visualization, then capture scenario evidence and run the documented release checks.

## Handoff Template

Copy and complete this block after each work session:

```text
Date:
Contributor:
Goal:
Completed:
Files changed:
Checks/tests run:
Decisions made:
Known issues:
Next action:
```

### Handoff — 2026-10-22 — Core Simulation Engine

```text
Date: 2026-10-22
Contributor: Claude (for TurkenGulzat)
Goal: Review and improve the Core Simulation Engine (DES, resources, KPIs, scenarios, determinism, mass conservation, documentation).
Completed: Event-driven engine with a single-server excavator and dump bay (FIFO); a 600 t ROM bin with dump admission; breakdown lane blockage and recovery; speed changes applied from each truck's current position; full cycle time, queue waits, utilization, rolling-hour throughput, trips and a mass-balance ledger; analytical bottleneck projection and match factor; 21 tests; MODEL.md; compare_scenarios.py; SUBMISSION/README figures corrected.
Files changed: ademix/simulator/engine.py, ademix/simulator/test_engine.py, ademix/simulator/MODEL.md (new), ademix/simulator/compare_scenarios.py (new), SUBMISSION.md, README.md, PROJECT_CONTEXT.md. Not touched: app.py, twins.json, data/openmines, frontend, models, licences, asset documentation.
Checks/tests run: python -m unittest test_engine (21 pass, Python 3.13); python compare_scenarios.py; py_compile app.py/engine.py/compare_scenarios.py.
Decisions made: excavator-limited 770 t/h baseline derived from the team's own OpenMines parameters; breakdown modelled as a 20-minute lane blockage; KPI windows restart at each scenario change.
Known issues: Docker/Ditto end-to-end not rerun; presentation figures are stale; no colours yet for the new queue/blocked truck states.
Next action: merge into codex/ademix, rerun the stand scenarios, refresh the presentation figures.
```

### Handoff — 2026-10-23 — What-If Scenario Engine

```text
Date: 2026-10-23
Contributor: Claude (for TurkenGulzat)
Goal: Review and improve the What-If Scenario Engine (activation, propagation, reset, identical-baseline comparison, dynamic bottleneck analysis, documentation).
Completed: cycle-transition guard; breakdown location reporting; cumulative counters with exact rolling windows (bin-empty breakpoints); time-averaged queues and ROM; live bottleneck with reasons; analytical bottleneck with reasons under five named constraints; optional truck_count for the fleet-limited case; fix for trucks left blocked after a blockage cleared; comparison report with % impacts, transient hour, bottlenecks and breakdown timing sensitivity; 10 new tests.
Files changed: ademix/simulator/engine.py, ademix/simulator/test_engine.py, ademix/simulator/compare_scenarios.py, ademix/simulator/SCENARIOS.md (new), ademix/simulator/MODEL.md, SUBMISSION.md, PROJECT_CONTEXT.md. Not touched: app.py, twins.json, data/openmines, frontend, presentation, models, licences, asset documentation.
Checks/tests run: python -m unittest test_engine (31 pass, Python 3.13); python compare_scenarios.py.
Decisions made: live bottleneck rule and 30 min / 95 % thresholds; bottleneck label names; scenarios stay mutually exclusive.
Known issues: Docker stand not rerun; breakdown effect depends on trigger time; dump point can never bind with current parameters; misattributed presentation edits in aa0156d (see Known Issues).
Next action: review and merge; rerun the stand on a 16 GB machine; optionally show bottleneck_live in the UI.
```

### Handoff — 2026-10-23 — Data & Asset Layer

```text
Date: 2026-10-23
Contributor: Claude (for TurkenGulzat; layer owned by the professor, who is being informed)
Goal: Complete the Data & Asset Layer of the architecture at research-data standard without inventing measurements.
Completed: registry/parameters.csv (25 parameters, status vocabulary, field paths, formulas, engine constants); fleet/haulage_fleet_specs.csv, route_distances.csv, route_distance_summary.csv (generated from OpenMines); assets/asset_types.json; telemetry/telemetry_dictionary.csv (65 features); telemetry/logs/*.csv (4 synthetic scenario logs) + manifest.json; build_data_layer.py; test_data_layer.py (19 tests); DATA_CARD.md.
Files changed: ademix/data/** (new files), ademix/simulator/twins.json (4 seed values), DATA_LICENSES.md (checksum record), .gitattributes (LF for data/simulator), README.md (optional data-test command), SUBMISSION.md (data paragraph), PROJECT_CONTEXT.md. Not touched: engine logic, frontend, models, presentation.
Checks/tests run: python -m unittest discover -s ademix/data (19 pass); python -m unittest test_engine in ademix/simulator (31 pass); build_data_layer.py regenerates identical files.
Decisions made: register is enforced by tests rather than read at runtime; sanity ranges are team-chosen; source units are interpreted, not confirmed.
Known issues: OpenMines checksum not re-verified against upstream; no measured data exists; stand not rerun (Docker removed from this laptop).
Next action: professor review; merge; rerun the stand on a 16 GB machine.
```
