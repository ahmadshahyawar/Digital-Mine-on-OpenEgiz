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

- Team decision: `claude/data-asset-layer` is the authoritative visual implementation. Its terrain scale, roads, turning loops, vehicles, buildings, FIFO queues, loading/dumping animations, camera, sensor/topology/data-flow overlays, fleet/ESG, weather, and safety presentation are preserved as designed. Codex contributions are limited to compatible nonvisual improvements such as platform integration, Docker/build reliability, tests, evidence, and documentation unless the Team explicitly requests a visual change.

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
- The deterministic model conserves ore through a ROM inventory, processes it at scenario-dependent crusher capacity, and has eleven passing unit tests.
- The root `README.md` now contains literal judge startup, verification, reset, Windows, architecture, and repository instructions. `SUBMISSION.md` documents every current module/scenario, data assumptions, verification status, and limitations.
- The complete OpenEgiz + Ademix Compose deployment now starts successfully on Windows. Eleven twins flow through MQTT into Eclipse Ditto, the API reports `source: eclipse-ditto`, and the 3D UI is healthy at `http://localhost:4173`.
- All four live scenario controls were exercised end to end. Ditto reported the expected breakdown, restricted-road, reduced-crusher, and reset states with projected throughput of 745.16, 647.6, 495, and 900 t/h respectively.
- Chrome rendered the live 3D command center successfully in software/headless mode. The first runtime review confirms functionality but also shows that terrain detail, route separation, and equipment legibility need visual refinement.
- The first placeholder scene was rejected during human review as visually inadequate. It is being replaced with a terraced open pit, curved bench road, richer plant geometry, a populated fleet panel, and optimized CC0 excavator/hauler GLBs from SELENE-ISRU.
- Visual work now follows explicit approval checkpoints. Stage 1 isolates a deterministic height-field open pit built with the MIT-licensed THREE.Terrain engine: natural surrounding relief, six engineered benches, a 23.5-unit-deep floor, vertex geology colors, and software-WebGL lighting. Roads and equipment are intentionally excluded from the `?stage=terrain` review view.
- Stage 2 adds a terrain-integrated 7.2-unit-wide spiral haul ramp, blended shoulders, an outer safety berm, center markings, and flattened loading/crusher pads. The first floating-road attempt was rejected before commit; the corrected `?stage=roads` view cuts the ramp into the height field.
- Stage 3 equipment review at `?stage=equipment` places six optimized CC0 haulers in alternating lanes along the approved spiral route and a CC0 excavator on the pit-floor loading pad. The Stage 1/2 URLs deliberately remain isolated without equipment for comparison.
- Stage 4 processing-plant review at `?stage=plant` adds a compact truck dump, primary-crusher module, transfer conveyors, access stairs, and coarse-ore stockpile assembled from five pinned CC0 Kenney Factory Kit GLBs. A first SELENE-based composition was visually rejected before commit because it read as lunar equipment and extended outside the camera frame.
- Stage 5 live-motion review at `?stage=motion` animates the six haulers along the approved spiral, oscillates the excavator only while its OpenEgiz twin reports loading, and moves ore markers through the plant at a rate controlled by crusher state. Truck state, reported speed, direction, and breakdown status drive movement and status markers.
- The Data and Asset Layer now has a single inspection point under `ademix/data/`: fleet specifications, a complete telemetry dictionary, a licensed model manifest, and consistency tests. It explicitly separates sourced references, team assumptions, derived metrics, and synthetic telemetry.
- Core Simulation Task 1 is complete: trucks now follow an explicit waiting-for-loader → loading → hauling → waiting-at-crusher → dumping → returning state sequence with deterministic queues and exclusive loading/dumping resources. The corrected resource-constrained baseline is 770 t/h rather than the crusher's 900 t/h rated capacity.
- Stage 5 traffic now uses physically separate directional lanes, with outbound and returning sides inverted after human review to match the team's intended traffic convention. Loading/crusher queues receive distinct stopped positions instead of overlapping.
- Core Simulation Task 2 is complete: each truck records its latest loading-queue wait, loading duration, loaded haul duration, crusher-queue wait, dumping duration, empty return duration, and full cycle time. The mine aggregate reports fleet-average cycle and queue waits.
- A clearly labeled local-simulator demo mode now supports visual review when Docker/OpenEgiz is unavailable. It runs the real deterministic engine without MQTT/Ditto, exposes 11 selectable demo twins, and leaves the production OpenEgiz path unchanged.
- Core Simulation Task 3 is complete: loading and crusher queues are deterministic FIFO resources, resource occupancy is reported explicitly, a breakdown releases its occupied resource immediately, and recovery requeues the interrupted truck without double service.
- Core Simulation Task 4 is complete: the engine explicitly balances initial ROM plus extracted ore against truck payloads, ROM inventory, and processed production. The six initially loaded trucks are included in extraction accounting, and the live mass-balance error remains zero across every scenario.
- Core Simulation Task 6 is complete: utilization is now time-based rather than a momentary count. The mine reports fleet, excavator, dump-point, and crusher utilization, time-weighted loading/crusher queues, trips per hour, queue waits, cycle time, production, inventory, and throughput.
- Core Simulation Task 5 is complete: breakdown, road restriction, and crusher reduction now have tested downstream effects on equipment state, speed, resources, cycle time, inventory, production, and throughput. Reset and cross-scenario switching remove stale effects while conserving ore.
- Stage 5 truck interpolation no longer wraps at route endpoints. Trucks clamp to the road and anchor at the loading or crusher facility while queued/serviced, eliminating mid-road disappearance and teleporting when direction changes.
- Stage 5 trucks now have six persistent identity colors and count markers, wider loading/crusher queue spacing, and a recognizable loading face with a marked bay, excavator, cut wall, muck pile, and individual blasted-rock fragments.
- Truck payload is now visually persistent and twin-driven: the bed fills progressively during loading, stays visibly full through loaded haul and crusher waiting, empties progressively during dumping, and remains empty on return. Active loading also shows an excavator-to-bed falling-rock stream.
- Human review found that the loading interaction still reads incorrectly: equipment can overlap and the transfer can appear truck-to-truck. `LOADING_REALISM_CHECKLIST.md` now defines 100 concrete corrections in five approval stages; collision-free layout and clear equipment roles are the first gate.
- Truck placement now follows authoritative `route_progress_pct` telemetry from the simulator, with smooth visual interpolation between updates, preventing client drift that could make a truck disappear. Loading-realism checklist item 1 is complete: the active loading bay is physically separated from the approach lane with its own pad and marking.
- Stage 5 now interpolates every road, queue, and service-position change, including lateral lane changes and heading reversals. Trucks no longer jump instantly across the road when loading/dumping completes or when a queue advances.
- Moving trucks now extrapolate continuously between two-second API snapshots at the simulator's accelerated road speed instead of rushing to each snapshot and stopping. A shared visual-position registry enforces a 5.4-unit same-direction safety gap, and opposing lane centers are widened to prevent truck overlap.
- The accepted terrain/road/equipment/plant scene is now the default live command-center view instead of a hidden review URL. Road-restriction twin state changes the haul-road color, center markings, and adds a visible barricade section so the scenario consequence is immediately legible to judges.
- The large-world environment now uses a 310 × 230 scene footprint with a controlled background mountain chain that does not occlude the working pit. The expanded site includes a maintenance workshop, fuel/service yard, mine control office, and engineered waste dump.
- The truck discharge destination is now presented as an explicit four-step material path: truck dump hopper → primary crusher → transfer conveyor → coarse-ore stockpile. In-scene labels make each function readable during the demo.
- The complete four-stage processing line now sits on one deep, graded industrial foundation with a concrete surface, embedded retaining skirt, and conveyor footings; the earlier placement over uneven terrain was rejected during human review because components appeared airborne.
- The processing plant was relocated and rotated onto the open right-hand bench: its dump hopper remains beside the haul-road exit while the crusher, conveyor, and stockpile extend away from the pit over the grounded pad.
- The dump area now includes a small PPE-equipped dust-control crew behind a yellow safety barrier. One worker operates a visible water-mist lance while the second monitors the exclusion zone; workers are deliberately separated from truck travel rather than shown manually handling dust beside moving equipment.
- The crusher approach now has a dedicated paved spur and a fixed dump-bay target outside all plant walls. The whole plant was shifted farther onto the right bench, and visual collision spacing now checks both same-direction and opposing trucks rather than only followers in the same lane.
- `TRAFFIC_SAFETY_CHECKLIST.md` records the completed ten-point traffic pass. The crusher now has distinct entry and exit spurs driven by the same curves used to render them, a set-back FIFO queue, an external marked dump bay, smooth position transitions, two-direction clearance checks, bollards, perimeter rails, and a separated pedestrian dust-control zone.
- Terrain quality pass 1 is complete without changing mine topology or simulation behavior: engineered bench faces are steeper and more legible, catch benches remain flat, slope-aware geology colors expose rock strata, a lightweight procedural gravel/rock surface map adds roughness, deterministic low-poly outcrops avoid haul-road clearances, and a bounded 1024 px shadow light improves pit depth while remaining suitable for software WebGL.
- Terrain quality pass 2 removes the causes identified during live review: the terrain grid is denser, bench-wall transitions use broad analytical profiles instead of narrow faceted steps, diamond noise is removed, uncontrolled base relief is reduced beneath the designed mountain forms, geological bands are limited to excavated walls, talus is integrated into bench-toe coloring instead of scattered meshes, and both traffic lanes receive subtle tracks from the unchanged haul-road centerline.
- The pit geometry has now been rebuilt rather than cosmetically masked: a rotated, skewed, strongly asymmetric superellipse defines the excavation; four explicit lifts each reserve 70% of their width for a flat bench and 24% for a controlled connecting face. The old circular funnel and narrow repeated wall teeth are removed. The existing haul-road centerline, vehicle movement, loading area, plant, facilities, and OpenEgiz integration remain unchanged.
- Targeted bench correction replaces the four 6.65-unit cliff-like lifts with five 5.1-unit lifts. Each lift now contains a true constant-elevation bench across 54% of its radial band, a planar face across 40%, and a 6% catch berm. This shortens and lays back the rock faces while preserving the exact haul-road function, camera, vehicles, buildings, and simulation logic.
- Large-scale mine pass expands the terrain to 680 × 500 and the excavation axes to roughly 316 × 208. The continuous haul route now descends through ten complete spiral turns using 321 control samples. Road carving measures distance to continuous line segments and interpolates elevation, preventing the spoke-like terrain artifacts found during the first ten-loop render. Mine roads now use compacted-earth colors, tire tracks, and berms without urban center markings. The plant and support facilities were moved well beyond the enlarged crest while retaining their functions.
- Depth and motion correction turns the enlarged shallow bowl into a deep ten-lift excavation: the floor is approximately −84.5, the crest is approximately +3.5, and each of the ten lifts rises 8.5 units with an actual flat bench and planar rock face. The ten-turn haul road descends continuously from +3.8 to −83.2. Truck display motion now converts reported km/h against the measured 3D curve length with a restrained 4× demo clock instead of using the obsolete fixed 3.2 km divisor and 20× visual acceleration.
- The two artificial dark circular endpoint pads and their yellow rings were removed after visual review. The pit-bottom loading area and crusher approach now transition directly into their existing compacted-earth road aprons instead of resembling marked urban turnarounds or helipads.
- Haul-road grounding and scale pass triples the main road width from 7.2 to 21.6, widens both lanes and terrain shoulders, and makes the rendered crusher connector and truck motion share the exact same curves. Terrain is flattened beneath both the main spiral and plant connector, removing airborne travel. A separate 12-unit compacted-earth waste road now connects the upper mine area to the engineered waste dump, with two slow visual-context haulers and wheel tracks; these trucks are deliberately excluded from OpenEgiz ore-production totals.
- Truck presentation now uses the audited bundled CC0 hauler at 2.15× scale with proportionally enlarged payloads and safety gaps. Production motion uses a 1.25× visual clock against measured route length; waste trucks take roughly 167 seconds per one-way trip. An online CC-BY construction-truck candidate was rejected because it omitted wheels and was not a credible upgrade.
- Two-way road clearance pass widens the main haul road to 36 units—five times the original 7.2—with opposing lane centers 22 units apart. Crusher entry/exit spurs, loading apron, shoulders, tire tracks, truck lateral targets, and the waste road were widened consistently. Because ten 36-unit spiral turns cannot fit inside the prior footprint without overlapping, the pit was proportionally expanded to a 1500 × 1150 terrain, roughly 1040 × 840 excavation axes, and a −213.5 floor with ten 21.5-unit lifts. This preserves ten separate road turns instead of producing one merged road slab.
- Camera repair for the enlarged world adds a centered high-angle overview, a wider 58° field of view, and an explicit 5000-unit far clipping plane. The previous blank/partial view was caused by placing the camera roughly 1700 units from the scene while leaving the Three.js default far plane at 1000. A responsive narrow-window layout now puts the 3D viewport first and removes the forced 1100 px horizontal overflow that previously centered the mine off-screen.
- Overview navigation now protects the enlarged site's visibility: zoom cannot move closer than 1120 units, the low rim-blocked viewing angle is capped at about 68°, and screen-space right-drag panning is explicitly enabled. The loading-face review retains its separate close-up distance and angle limits.
- The restrictive overview camera was replaced with Stronghold-style RTS navigation. Users can zoom from 2200 down to 150 units, pan with WASD/arrow keys or right-drag, orbit with left-drag, and use visible Overview, Pit, Plant, zoom-in, and zoom-out buttons. Presets reset both camera position and focus target, so a close inspection can always return to the complete mine without reloading.

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

### Lock — Claude — illustrative pit-wall geometry — 2026-10-23

```text
Owner: Claude (for TurkenGulzat)
Branch: claude/pit-geometry (from origin/codex/ademix d4c320c)
Task: rebuild the 3D pit wall from the Team's illustrative design values (bench height 10 m, bench face 70°,
  working bench width 20 m, overall slope 45°; catch berm to be set by project design) and label them as
  "illustrative assumptions for a conceptual project — not approved Kazakhstan design values".
Exact files: ademix/frontend/src/TerrainStage.tsx, ademix/frontend/src/IngestionLayer.tsx, ademix/frontend/src/ingestion.css
Interfaces consumed or changed: no twin field or simulator change. Visual pit geometry changes, so
  ademix/data/topology/mine_topology.json (visual_pit_geometry) and its check in ademix/data/test_data_layer.py
  (Codex-owned) need updating: handoff request below on completion.
Expected handoff: commit SHA, files, build, screenshot, data-owner request.
```

Handoff — Claude — pit-wall geometry — 2026-10-23

- Commit `8f7c07c` on `claude/pit-geometry` (lock `ca62b7d`). Files: `ademix/frontend/src/TerrainStage.tsx`, `ademix/frontend/src/IngestionLayer.tsx`, `ademix/frontend/src/ingestion.css`.
- Pit wall is now built from `PIT_DESIGN` (illustrative assumptions for a conceptual project — not approved Kazakhstan design values): 10 m benches, 70° faces, 45° overall final wall, two 20 m working benches near the floor. At the 14.9 m/unit scene scale this gives 42 benches, ≈419 m depth, implied catch berm ≈6.4 m (left to project design; derived only to keep the 45° overall slope), final wall 45.0°, 43.5° including the working benches. Bench crest/toe lines are drawn off the haul road; terrain grid 128→192 segments. Layer 1 Specs panel shows a "Pit design · illustrative" card and the pit wall carries a label.
- Checks: `tsc -b` and Vite build pass; card text verified in the DOM. Full-size visual review not done (preview pane too small). Engine tests pass.
- Data tests: 3 failures that come from the `codex/ademix` base, not this change: bundle/log reproducibility float rounding (35.65 vs 35.66) and the manifest input hash for `north_pit_mine.json` (expects CRLF `271134…`, file is LF `a966…`).
- Request to Codex (data owner): `ademix/data/topology/mine_topology.json` `visual_pit_geometry` still says 6 benches × 4.35; update it to the values above, and update the geometry token check in `ademix/data/test_data_layer.py` (≈line 374: "4.35", "-23.5", "Math.PI * 2.35") to the new `PIT_DESIGN` constants. Claude has not edited these files.

### Lock — Claude — wider haul road, broken trucks on the shoulder — 2026-10-23

```text
Owner: Claude (for TurkenGulzat)
Branch: claude/road-shoulder (from claude/pit-geometry 21078a8, PR #2)
Task: widen the drawn haul road and its loops so each direction has a lane plus a shoulder, and show a truck
  whose twin state is `breakdown` pulled to the right-hand edge (still encroaching its lane while
  road-main.state is `restricted`), then fully on the shoulder once the road reopens.
Exact files: ademix/frontend/src/TerrainStage.tsx, ademix/frontend/src/IngestionLayer.tsx
Interfaces consumed or changed: consumes truck-0N.state, road-main.state (unchanged); no simulator change.
Expected handoff: commit SHA, files, build, browser check.
```

Handoff — Claude — wider road / breakdown shoulder — 2026-10-23

- Commit `4be2758` on `claude/road-shoulder`. Files: `ademix/frontend/src/TerrainStage.tsx`, `ademix/frontend/src/IngestionLayer.tsx`.
- Road ribbon 7.2→13.6 units, terrain shelf flattened to 7.2 (blend to 10.6), outer berm 4.2→7.3, loop half-width 3.35→4.4, loop berms, loop speed signs, ramp lights and escape lane moved out to match. Broken-down truck eases to offset 3.7 (over its lane line) while `road-main.state` is `restricted`, then 5.1 (shoulder) once open.
- Checks: `tsc -b` passes; overview canvas captured in the browser shows the wider ramp shelf. Not done: a breakdown observed on the wider road, and the crusher-loop junction, where loop berm tubes cross the paved pad (may predate this change; needs a close review).

### Collaboration ownership — 2026-10-23

- `COLLABORATION.md` is the working protocol. Codex owns the current 3D terrain/equipment/camera/material paths; Claude owns simulator, scenarios, data ingestion and evidence generation. Shared entry points, documentation, presentation and Compose are edited by one designated integrator at a time.
- Remote inspection confirms `claude/data-asset-layer` contains the histories of both `claude/what-if-scenarios` and `claude/core-simulation-engine`; integrate the latest stacked branch once rather than merging all three.
- Current Codex worktree is not ready for integration because it contains uncommitted visual and release-audit changes. Commit a coherent Codex checkpoint before attempting any Claude merge. No branch was merged during this inspection.

- 2026-10-23: accelerated RTS navigation after human review: mouse pan 1.0→2.6, pointer wheel zoom 0.8→2.2, keyboard movement roughly doubled with a larger close-view minimum, and zoom buttons now change distance by 2×. Zoom-to-pointer, distance limits, overlays and presets are unchanged. Production build required before acceptance.

- 2026-10-23: four-wheel visual request: `paintHauler` removes middle-axle triangles from private copies of the GLB's merged material batches, shared by ore/waste trucks. Original licensed GLB unchanged. Named wheel nodes are empty anchors, so hiding them alone would do nothing. Rendered verification of the cut boundaries remains pending. Rules audit is unfinished: 40 tests and frontend build passed; Docker image rebuild was still pending when the wheel request arrived.

### Truck appearance — 2026-10-23

- `TerrainStage.tsx`: shared `paintHauler` replaces whole-model pastel tint with named-material industrial liveries, dark frame/service materials and amber lamps. `TruckTrim` adds three side-reinforcement patterns and alternating spill guards; these are fictional fleet variants of the same bundled CC0 asset, not new real manufacturer models.
- Ore and waste truck visual groups enlarged 10% together with payload and markers. Routes, simulator and buildings unchanged. Existing safety gaps retained; actual asset-to-building proportions, added trim placement and bay clearance require rendered review before acceptance. No claim of photorealism or verified collision clearance. Next: inspect loaded/empty trucks at the hopper and loading bay using the close camera.

### Lighter rounded-square pit — 2026-10-23

- `TerrainStage.tsx`: `pitContourScale` defines a 3.4-exponent rounded-square contour with mild broad asymmetry. Both `pitMetric` and `haulRoadPoints` use it, replacing circular road cuts across unrelated bench outlines. Road samples increased to 641 for corners. Endpoints at angle .3 stay fixed, preserving plant and loading connections; depth, ten turns, road widths, camera controls and simulation code unchanged.
- `terrainColors` uses lighter sandstone colors and less artificial depth/slope darkening; `GroundMaterial.ts` blends dark scan values toward dry earth without raising global exposure.
- Numerical contour checks pass: both endpoints unchanged, all sampled radii finite/bounded, corners broader than axes. Rendered road clearances, terrain grounding and visual acceptance remain unverified because browser control is unavailable. Next: inspect rounded corners and connecting roads in the live scene. Additional road samples increase terrain generation cost; benchmark before final release.

### Camera navigation handoff — 2026-10-23

- `TerrainStage.tsx` / `RtsCameraControls`: enabled installed OrbitControls zoom-to-cursor; left-drag pans, right-drag rotates, touch pans/pinches. Distance range is now 2–2600, near clip .1. Double-click raycasts a mesh for a 35-unit inspection view. Keyboard speed scales down for close inspection; input widgets and window blur are handled.
- Camera and graphics Html overlays now use viewport-center positioning rather than projecting the world origin, so zoom/pan no longer shifts the controls. `responsive.css` adds hand cursor and navigation help; narrow-screen controls are separated vertically.
- No mine geometry, paths, or OpenEgiz changes. RTS-inspired interaction, not a verified exact Stronghold reproduction. Browser interaction validation remains pending (browser control unavailable); no collision-constrained camera is claimed. Next review: edge-of-screen zoom, deep-pit inspection, drag selection, fixed panels, and overview recovery.

### Graphics material handoff — 2026-10-23

- Replaced stretched procedural grayscale ground with bundled CC0 Poly Haven Dirt color/roughness/normal maps. `GroundMaterial.ts` uses two-scale triplanar color projection, retaining existing vertex geology and all geometry/routes. Normal/roughness still use terrain UVs; steep-face detail needs visual review.
- `GraphicsSettings.tsx` adds Balanced (1× pixel ratio, 1024 shadows) and optional High (up to 2×, 2048 shadows). Balanced remains default for the software-rendering judge. Expanded light shadow coverage and far plane for the large site.
- Changed `TerrainStage.tsx`, added those two modules and `public/textures/dirt/`, updated `DATA_LICENSES.md`. No simulator/OpenEgiz edits in this pass. Downloaded textures match provider checksums.
- Actual visual acceptance and frame-rate measurements remain pending: local browser control was unavailable. Build does not validate runtime shader compilation or appearance. Existing low-poly trucks/buildings remain a realism limitation; this is a ground-material pass, not a completed photorealistic scene.
- Validation: TypeScript and Vite production build passed (620 modules); existing large-bundle warning remains. No runtime screenshot or performance result claimed.
- Next: review High and Balanced in the running scene, including steep faces, close ground, camera-control overlap on narrow screens, and software-render frame rate before accepting or expanding the pass.

| Owner | Task | Branch | Status | Notes |
| --- | --- | --- | --- | --- |
| Codex | Refine the live 3D command center and complete release evidence | `codex/ademix` | In progress | End-to-end OpenEgiz integration passes; improve visual quality, performance evidence, and final documentation next |

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
| 2026-10-22 | Codex | Organized and documented the Data and Asset Layer without changing simulation behavior | Fleet specification, telemetry dictionary, and model manifest added; automated schema and checksum checks pass |
| 2026-10-22 | Codex | Completed Core Simulation Task 1: explicit full truck lifecycle and exclusive service resources | Seventeen automated tests pass, including state order, queue separation, resource exclusivity, mass conservation, scenarios, and long-run convergence |
| 2026-10-22 | Codex | Corrected Stage 5 truck traffic and queue placement | Production frontend build passes; local 1440×720 render confirms separated opposing lanes and non-moving queue states |
| 2026-10-22 | Codex | Completed Core Simulation Task 2: phase, queue-wait, and full-cycle timing | Twenty automated checks pass; a full cycle reconciles its loading, travel, waiting, dumping, and return durations |
| 2026-10-22 | Codex | Added a local visual-review mode and clickable staged trucks | Browser verification shows non-zero live demo state, 11 twins, selectable trucks, and cycle-phase timing fields; production build and 20 tests pass |
| 2026-10-22 | Codex | Completed Core Simulation Task 3: FIFO queues, resource occupancy, and interruption recovery | Twenty-four automated checks pass, including both queue orders, exclusive resources, breakdown release, and safe requeue |
| 2026-10-22 | Codex | Completed Core Simulation Task 4: complete production and ore mass accounting | Twenty-eight automated checks pass, including startup, per-second short-run, long-run, and every-scenario mass conservation with non-negative quantities |
| 2026-10-22 | Codex | Completed Core Simulation Task 6: time-based utilization and operational metrics | Thirty-two automated checks pass, including metric bounds, time weighting, queue averages, and trip-rate normalization |
| 2026-10-22 | Codex | Completed Core Simulation Task 5: scenario propagation and clean reset | Thirty-eight automated checks pass; local demo restarted and reports 11 twins with the corrected 770 t/h baseline |
| 2026-10-22 | Codex | Removed Stage 5 truck endpoint wrapping and teleporting | Production frontend build passes; local review URL returns HTTP 200 |
| 2026-10-22 | Codex | Improved truck differentiation, queue visibility, and loading-face credibility | Production frontend build passes; local visual-review URL returns HTTP 200 |
| 2026-10-22 | Codex | Added state-driven visible truck payload and loading transfer | Thirty-nine automated checks pass; production frontend build passes; local demo reports a hauling truck at 100% fill and 77 t payload |
| 2026-10-22 | Codex | Prevented truck disappearance and completed loading-realism checklist item 1: separate active bay from approach traffic | Forty automated checks and the production frontend build pass; local review reports 11 twins and authoritative route progress for all six trucks |
| 2026-10-22 | Codex | Replaced abrupt truck lane, queue, service-bay, and direction changes with continuous interpolation | Forty simulator tests and the production frontend build pass; local visual-review URL returns HTTP 200 |
| 2026-10-22 | Codex | Corrected sprint-stop motion and restored collision-safe truck separation | Trucks move continuously between telemetry snapshots, same-direction following distance is enforced, opposing lanes are wider, and the production frontend build passes |
| 2026-10-22 | Codex | Expanded the mine environment and clarified the truck-to-plant material flow | Production frontend build passes; software-rendered review confirms an unobstructed pit, background mountain range, surrounding facilities, and labeled hopper/crusher/conveyor/stockpile sequence |
| 2026-10-22 | Codex | Completed terrain quality pass 1 using the existing React Three Fiber terrain | Production frontend build and simulator test discovery pass; live review confirms clearer terraces, rock outcrops, granular materials, and deeper wall shading without route changes |
| 2026-10-22 | Codex | Corrected repetitive terrain artifacts and improved controlled mine-surface detail | Frontend production build passes; 3 data-layer tests and 3 route/lifecycle FIFO tests pass; live review was used iteratively to remove wall spikes, desert banding, and disconnected dark rock props |
| 2026-10-22 | Codex | Rebuilt the underlying open-pit height field as an irregular four-lift terraced excavation | Live integrated render confirms an asymmetric footprint, four broad horizontal benches, separated faces, and the connected spiral road; production build, 3 data-layer checks, and 3 route/FIFO tests pass |
| 2026-10-22 | Codex | Corrected bench widths and excessive wall heights without changing the mine layout | Live integrated render shows five distinguishable actual bench surfaces and shorter planar faces; production build, 3 data-layer checks, and 3 route/FIFO tests pass |
| 2026-10-22 | Codex | Expanded the mine into a ten-turn large-scale excavation and converted roads to unpaved haul roads | Live review caught and rejected point-sampled road-carving spokes; segment-based carving removed them. Final production build, 3 data checks, and 3 route/FIFO tests pass |
| 2026-10-22 | Codex | Deepened the large pit and corrected unrealistic truck speed | Live render confirms ten deep stepped levels and a connected bottom road; truck interpolation now uses physical route length. Production build, 3 data checks, and 3 route/FIFO tests pass |
| 2026-10-23 | Codex | Completed the HT-01 breakdown release gate, including service interruption, FIFO continuity, throughput impact, recovery, and stale-event cleanup | 37 simulator and 32 data tests pass; live API → MQTT → Eclipse Ditto → API smoke test reports HT-01 stopped, first-hour throughput 770.0→581.6 t/h, and a clean baseline reset |

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

## Known Issues and Risks

- The remaining competition schedule is short; scope must be chosen quickly.
- The detailed simulation validation method and baseline-versus-scenario evidence still need to be completed.
- A visually impressive scene that does not receive its operational state through OpenEgiz would fail the core platform requirement.
- Third-party repositories and 3D assets create licensing, attribution, compatibility, and performance risks that must be checked before use.
- The frontend JavaScript bundle is about 1.12 MB before gzip (317 kB gzip); it builds successfully but should be split or reduced after the staged scene is integrated into the live view.
- The selected CC0 mining asset service was temporarily unavailable on 2026-10-22; no unverified or incomplete asset was committed.
- The current presentation uses a clearly labeled conceptual interface composition. Replace it with a real application screenshot only after the clean end-to-end stack passes; do not present the concept graphic as runtime evidence.
- Local MQTT port 1883 was unavailable during Windows validation, so the host-only development override `MQTT_PORT=1884` was used. Container-to-container traffic and judge defaults remain unchanged.
- The staged scene is operational and trucks use separated lanes and queues, but the loading interaction still needs checklist items 2–100 and final human visual approval.
- AI-based judging makes explicit documentation, reproducibility, and visible evidence especially important.
- Concurrent work in one repository can cause conflicts unless task ownership and branches are kept current.
- The expanded world facilities are currently visual context rather than independent simulated twins; do not claim them as operational modules until their states are modeled.

## Next Recommended Action

Obtain the Team's visual approval of the rebuilt terraced pit at `?stage=world`; then continue the loading-realism checklist one approved item at a time without changing the accepted terrain or haul-road centerline.

### Breakdown verification handoff — 2026-10-23

- `ademix/simulator/verify_breakdown.py` is the repeatable release check. It rejects demo data, exercises the public scenario endpoint, observes all 11 twins through Eclipse Ditto, and always restores baseline.
- The deterministic first-hour comparison is 770.0 t/h baseline versus 581.6 t/h after HT-01 fails (−24.5%). The analytical steady-state projection remains 770 t/h because five healthy trucks can still saturate the single excavator; this is expected, not a missing impact.
- Added edge tests cover breakdown while dumping, removal from the excavator FIFO without reordering, preserved ore/mass balance, and reset invalidation of stale service/recovery events.
- Windows validation used host MQTT port 1884 because the machine's Mosquitto service owns 1883. No committed Compose default changed.

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

