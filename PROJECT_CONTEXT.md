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
| Professor (`TurkenGulzat`) | Product decisions and final review; technical work assisted by Codex and Claude | Awaiting official repository invitation |

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

### Status summary — Professor + Claude B/C work — 2026-10-24 (written before context compaction)

```text
Purpose: one place for decisions, progress, open items and next steps of the Professor + Claude frontend stream.

Process decisions in force (from START_HERE.md / COLLABORATION.md / TEAM_WORK_PLAN.md and the Team's instructions):
- One task per claude/<task> branch, always created from the latest origin/codex/ademix; lock + handoff recorded in
  this file; PR targets codex/ademix; Claude never merges and never pushes to main.
- Ahmad + Codex integrate each PR (merge commit "Integrate …" then "Verify …" on codex/ademix) before the next
  dependent task starts. Claude polls origin/codex/ademix and continues automatically after integration.
- Claude edits only frontend/3D/visual files (IngestionLayer.tsx, ingestion.css, TerrainStage.tsx, evidence/claude-*),
  consumes Codex contracts exactly, never invents values; missing data → "unavailable" + request to Codex.
- Every visible number is tagged live (with source) or saved model evidence · synthetic · not measured.
- Visual evidence is produced with headless Chrome over the DevTools protocol against the local demo simulator
  (ADEMIX_DEMO_MODE=1 on 127.0.0.1:18088, Vite dev server on localhost:5173). Helper scripts live in Claude's
  scratchpad, not in the repo. Docker/Eclipse Ditto runs are done by Codex at integration.
- Codex's uncommitted presentation/build.mjs and presentation/render_pdf.py edits in this working tree belong to
  Codex and are never staged or committed by Claude.

Integrated in origin/codex/ademix (all by Ahmad + Codex, verified on live OpenEgiz):
- B1 opening operator view (PR #4) · B2 fuel & CO₂ from A1 (PR #5) · B3 Fixed vs Smart from A2 (PR #6)
- standby-bay entrance fix (PR #7) · B4 breakdown/recovery timeline from A3 (PR #8)
- B5 two-way road (A4) presentation, display-lag fix for failed trucks, crusher-pad triangle fix (PR #9)
- B6 guided three-minute demo on real controls (PR #10) · C1 11-twin mine model (PR #11)
- C2 Decision workspace (PR #12); Codex then bundled decisionExplanation (A8/A9), now rendered live.

Pushed, waiting for integration:
- C3 Show effect: branch claude/c3-show-effect, commit def7381 (PR to be opened against codex/ademix).

Not started (in order, each after the previous is integrated):
- C4 "Why trust this?" inside the Decision workspace from the integrated modelTruth contract (C4 model-truth
  handoff above): mass balance from the live twin (never a false success when missing), principal formula/constraint,
  sourced parameters vs team assumptions, synthetic telemetry meaning, "verified, not validated", link to Specs.
- C5 integrate the complete judge journey: mine → affected assets → Decision evidence → Why trust this → Overview;
  fix panel collisions, keyboard focus, contrast, narrow view; final desktop/narrow screenshots; Ahmad's acceptance.

Open questions / requests to Ahmad + Codex:
- A3 recovery rule (B4 handoff): throughput_recovered coincides with road_cleared because the 1 h rolling value still
  includes pre-breakdown output; the UI shows it as supplied with a note. Consider redefining and regenerating.
- Optional: CO₂ fields in dispatchComparison so the UI need not derive CO₂ per 1,000 t (B2 handoff).

Unverified by Claude (needs Codex integration runs or humans):
- Docker/Eclipse Ditto rendering of B1–C3 (Codex verifies at integration); real phone; keyboard-only truck selection
  (canvas); a first-time viewer completing the guided demo and stating the recommendation (Team acceptance).

Next step after C3 integration: start C4 on claude/c4-why-trust from the newest origin/codex/ademix.
```

### Lock — Claude — C3 spatial scenario cause and effect — 2026-10-24

```text
Owner: Professor + Claude
Branch: claude/c3-show-effect (from origin/codex/ademix 39f3da6, C2 integrated)
Task: C3. "Show effect" for an active disruption: focus the affected place (failed HT-01 and its held followers /
  the restricted haul road / crusher, ROM bin and dump queue), mark it in the scene from returned state, and show a
  short causal chain built from live twin fields that matches the model and road contracts (lane blockage only on
  the failed truck's lane; road_closure is a both-lane speed restriction with no reroute). Camera control and
  Overview recovery preserved.
Exact files: ademix/frontend/src/IngestionLayer.tsx, ademix/frontend/src/ingestion.css, evidence/claude-c3/*
Contracts consumed: ROAD_BREAKDOWN_CONTRACT.md, SCENARIOS.md semantics, existing twin fields (no change).
Expected handoff: commit SHA, build, per-scenario focus/text checks against the API, screenshots, limitations.
```

Handoff — Professor + Claude — C3 spatial scenario cause and effect — 2026-10-24

```text
Owner: Professor + Claude
Task: C3 — Spatial scenario cause and effect
Branch: claude/c3-show-effect (from origin/codex/ademix 39f3da6)
Commit SHA: def7381
Exact changed paths: ademix/frontend/src/IngestionLayer.tsx, ademix/frontend/src/ingestion.css,
  evidence/claude-c3/{c3-breakdown-lane-blocked.png,c3-breakdown-after-tow.png,c3-road-restriction.png,
  c3-crusher-congestion.png, c3-*-check.json}; PROJECT_CONTEXT.md
Contracts consumed (unchanged): ROAD_BREAKDOWN_CONTRACT.md; SCENARIOS.md semantics; live fields scenario-controller
  (active, breakdown_location, projected/baseline_throughput_tph), road-main (speed_limit_kmh, blockage_* counters),
  excavator-01 (queue_length, utilization_pct), crusher-01 (capacity_tph, rom_inventory_t, rom_bin_capacity_t,
  queue_length, average_wait_min), mine-01 (throughput_tph, average_cycle_min).
What changed: "Show effect ▸" (Scenarios panel, only while a disruption is live) focuses the affected place and opens
  an Effect card with a numbered causal chain from twin values. Breakdown: selects HT-01, camera on it, blocked lane
  and held followers by direction, opposing traffic continues (or towed clear / off-road, no lane blocked).
  Road restriction: whole road tinted, tag "10.72 km/h · both lanes · no reroute", cycle and excavator wait.
  Crusher slowdown: crusher view, ROM bin ring + "ROM bin X/600 t · N waiting to dump", queue and wait. Lines that
  depend on rolling windows say so; queue line says "bin still has room" until trucks actually wait.
  Right-hand column starts at 132 px on desktop (below three rows of view buttons).
Commands/checks actually run: tsc -b PASS; vite build PASS. Headless Chrome on the demo simulator, each condition set
  through the real API, every value in the chain compared with the page's own /api/state response:
  road restriction (speed 10.72, cycle 33.0 min, excavator 41 % / 0 queued, 634 vs 647 t/h); crusher slowdown after
  ~2 simulated hours (495 t/h, ROM 549/600 t, 4 waiting, 4.9 min); breakdown on the road (crusher-bound lane, red
  lane + "opposite lane open"), and after the tow ("both lanes are open again").
Known limitations / unverified: not run on Docker/Eclipse Ditto; held-truck counts are the instant of capture (0 held
  in one capture, 1 a few seconds later in the API); camera focus is a fixed offset from HT-01.
Request to Ahmad + Codex: none.
Integration instruction: merge claude/c3-show-effect into codex/ademix. C4 starts after integration.
```

### Lock — Claude — C2 dispatcher Decision workspace — 2026-10-24

```text
Owner: Professor + Claude
Branch: claude/c2-decision-workspace (from origin/codex/ademix 18d6974, C1 integrated)
Task: C2. One optional "Decision" workspace: live now (condition, policy, planned and measured constraint, trucks
  cycling/parked/down, truck-hours per 1,000 t, waits) clearly separated from saved model evidence (A2 fixed vs smart
  for the active condition; A3 breakdown timeline with observed vs projected); the recommended action read from the
  evidence (decisionExplanation when present, else the A2 smart outcome for the active condition); a real "Apply"
  control; direct return to the 3D mine.
Exact files: ademix/frontend/src/IngestionLayer.tsx, ademix/frontend/src/ingestion.css, evidence/claude-c2/*
Contracts consumed: DISPATCH_COMPARISON_CONTRACT.md, HISTORY_CONTRACT.md, DECISION_EXPLANATION_CONTRACT.md (rendered
  only if decisionExplanation is in the bundle). No contract change.
Request (blocking only the A8/A9 section): add ademix/data/evidence/decision_explanation.json to the generated
  frontend bundle as `decisionExplanation` (the frontend image is built from ademix/frontend only).
Expected handoff: commit SHA, build, saved-vs-fixture checks, live/saved separation, per-condition recommendation
  check, screenshots, limitations.
```

Handoff — Professor + Claude — C2 dispatcher Decision workspace — 2026-10-24

```text
Owner: Professor + Claude
Task: C2 — One dispatcher Decision workspace
Branch: claude/c2-decision-workspace (from origin/codex/ademix 18d6974)
Commit SHA: b57eaba (lock 787929d)
Exact changed paths: ademix/frontend/src/IngestionLayer.tsx, ademix/frontend/src/ingestion.css,
  evidence/claude-c2/{c2-baseline.png,c2-crusher_slowdown.png,c2-baseline-with-a8.png,c2-crusher_slowdown-with-a8.png,
  c2-check.json,c2-check-with-a8.json}; PROJECT_CONTEXT.md
Contracts consumed (unchanged): DISPATCH_COMPARISON_CONTRACT.md (steady window per condition), HISTORY_CONTRACT.md
  (embedded B4 timeline), DECISION_EXPLANATION_CONTRACT.md (rendered when bundle.decisionExplanation exists; rounding
  from presentation_contract.rounding); live scenario-controller / mine-01 / excavator-01 / crusher-01 fields.
What changed: "Decision" button → workspace: Now (live, source-tagged) | Recommended action (saved evidence) with Apply
  on the real dispatch control | Fixed vs Smart for the active condition | Fleet size and assumptions (A8/A9) |
  Breakdown and recovery (embedded B4). Saved sections tagged "saved model evidence · synthetic · not measured".
  Recommendation = A8/A9 recommended_action when bundled, else read from the A2 Smart outcome; Apply target comes
  from the evidence (Smart parks a truck or not). Missing evidence → unavailable, no recommendation.
Commands/checks actually run: tsc -b PASS; vite build PASS. Headless Chrome on the demo simulator, conditions set
  through the real API: 4/4 conditions, 48/48 saved cells equal A2; recommendations normal 4+2 / road all 6 / crusher
  3+3 / breakdown 4+1; live vs saved tags distinct; Apply at normal set dispatch_policy smart and the panel then read
  "In force now (confirmed by the twins)". Second pass serving the bundle with Codex's decision_explanation.json added
  (test harness only): the A8/A9 wording replaced the A2 wording for normal/road/crusher, baseline fleet table equals
  the JSON at contract rounding, Apply still correct.
Known limitations / unverified: not run on Docker/Eclipse Ditto; the shipped bundle has no decisionExplanation, so
  the A8/A9 section reads "unavailable" until Codex bundles it; the breakdown condition uses the A2 recommendation
  (the A8/A9 contract has no breakdown question); a one-minute new-viewer test needs a human.
Request to Ahmad + Codex: add ademix/data/evidence/decision_explanation.json to the generated frontend bundle as
  `decisionExplanation` (build_data_layer.py → public/data/ingestion.json). The frontend Docker image is built from
  ademix/frontend only, so it cannot import ademix/data directly. No frontend change is needed after that.
Integration instruction: merge claude/c2-decision-workspace into codex/ademix.
```

### Lock — Claude — C1 visible mine model and relationships — 2026-10-24

```text
Owner: Professor + Claude
Branch: claude/c1-mine-model (from origin/codex/ademix 104d2a5, B1–B6 integrated)
Task: C1. Optional "Mine model" panel built only from twinRelationships (ademix.twin-relationships.v1): the 11
  contract nodes joined to live /api/state by thing_id with their state_feature value (or "State unavailable"),
  the 38 directed relationships drawn by category (material solid, movement dotted, control dashed and distinct,
  hierarchy optional), loading face → truck → haul road → crusher readable; selecting a node opens the same live
  twin (truck card + 3D selection, or a twin card + camera focus); immediate return to Overview.
Exact files: ademix/frontend/src/IngestionLayer.tsx, ademix/frontend/src/ingestion.css, evidence/claude-c1/*
Contract consumed: TWIN_RELATIONSHIP_CONTRACT.md (no change).
Expected handoff: commit SHA, build, node/edge/join checks, per-node selection check, screenshots, limitations.
```

Handoff — Professor + Claude — C1 visible mine model and relationships — 2026-10-24

```text
Owner: Professor + Claude
Task: C1 — Visible mine model and relationships
Branch: claude/c1-mine-model (from origin/codex/ademix 104d2a5)
Commit SHA: 7fb805e
Exact changed paths: ademix/frontend/src/IngestionLayer.tsx, ademix/frontend/src/ingestion.css,
  evidence/claude-c1/{c1-mine-model.png,c1-after-node-clicks.png,c1-check.json}; PROJECT_CONTEXT.md
Contract consumed (unchanged): TWIN_RELATIONSHIP_CONTRACT.md — twinRelationships schema v1: nodes (id, thing_id,
  label, kind, state_feature), relationships (id, type, category, source, target, label). Live join by id/thing_id.
What changed: "Mine model" button; SVG graph of the contract (excavator → trucks → road → crusher, mine above,
  controller below); node state = live twin's state_feature or "State unavailable"; edge styles per category with
  toggles and counts; node click opens the same live twin (truck → 3D selection + card with thing id; others → twin
  card of returned features + camera focus); keyboard-focusable nodes; Overview clears selection; header names the
  real source (Eclipse Ditto or the local demo simulator). Frame gained features(twin) to list returned fields.
Commands/checks actually run: tsc -b PASS; vite build PASS. Headless Chrome on the demo simulator (c1-check.json):
  11 nodes, 11 unique; 38/38 edges drawn with all categories on; every endpoint resolves; 11/11 node states equal
  the live /api/state value; clicking each of the 11 nodes opened the matching twin (5 twin cards with thing ids,
  6 truck cards HT-01…HT-06).
Known limitations / unverified: not run on Docker/Eclipse Ditto (the header then reads "Eclipse Ditto"); the graph is
  the contract's conceptual topology; mine-01's contract state feature is bottleneck_live, shown as-is.
Request to Ahmad + Codex: none.
Integration instruction: merge claude/c1-mine-model into codex/ademix.
```

### Integration result — Codex — C1 mine relationship view — 2026-10-24

- Integrated `origin/claude/c1-mine-model` (`c323d0a`, implementation `7fb805e`) into `codex/ademix`; merge commit `05c1347`.
- Ownership and contract review passed: only Professor + Claude frontend files, C1 evidence, and this shared context changed; the authoritative relationship contract was consumed unchanged.
- Combined verification passed: frontend TypeScript/Vite production build; 92 simulator/API/evidence tests; 47 data-contract tests; rebuilt live UI; judge smoke with Eclipse Ditto, all 11 twins, and all 143 required fields/units.
- The served production bundle contains the Mine model view and the live API returns exactly 11 twins: one mine, one excavator, one crusher, one road, one scenario controller, and six haul trucks.
- Existing non-fatal bundle-size warning remains. C1's conceptual graph was visually verified by Professor + Claude; final Team human acceptance remains part of C5.
- Next Professor + Claude task: C2 starts from the pushed `origin/codex/ademix` state.

### Lock — Claude — B6 guided three-minute demonstration — 2026-10-24

```text
Owner: Professor + Claude
Branch: claude/b6-guided-demo (rebased onto origin/codex/ademix 0fc7cd2, which contains Codex's B5 merge de5429f)
Task: B6. A cancelable "Guided demo" that walks a new viewer through baseline → HT-01 breakdown → consequence →
  Smart Dispatch → recovery/reset using the real scenario and dispatch controls. Every step sends the real
  request, then waits until the returned twin state shows it (scenario-controller.active / dispatch_policy /
  breakdown / standby / reset fields) before narrating; nothing is animated or faked. Cancel leaves the app usable.
Exact files: ademix/frontend/src/IngestionLayer.tsx, ademix/frontend/src/ingestion.css, evidence/claude-b6/*
Contract consumed: existing twin fields and POST /api/scenario, /api/dispatch (no change).
Expected handoff: commit SHA, build, recorded run of every step with the acknowledgement it waited for, cancel and
  reset checks, screenshots, limitations.
```

Handoff — Professor + Claude — B6 guided three-minute demonstration — 2026-10-24

```text
Owner: Professor + Claude
Task: B6 — Guided three-minute demonstration
Branch: claude/b6-guided-demo (rebased onto origin/codex/ademix 0fc7cd2)
Commit SHA: f8dcb17 (lock 754c004)
Exact changed paths: ademix/frontend/src/IngestionLayer.tsx, ademix/frontend/src/ingestion.css,
  evidence/claude-b6/{b6-step1..6.png,b6-after-cancel-and-reset.png,b6-guide-run.json}; PROJECT_CONTEXT.md
Contract consumed (unchanged): POST /api/scenario, POST /api/dispatch; scenario-controller.active, dispatch_policy,
  trucks_required, trucks_in_cycle, trucks_standby, projected_throughput_tph, breakdown_location; truck-0N.state;
  road-main blockage fields (A4); mine-01.throughput_tph, bottleneck_live, sim_time_s; excavator-01.queue_length.
What changed: "Guided demo ▶" button; six-step card (normal → breakdown → cost → Smart Dispatch → evidence → reset).
  Command steps send the real request and enable Next only when the returned twin state confirms the step; the card
  shows "Confirmed by the returned twin state at simulated N h". Evidence steps open the existing B3/B4 panels.
  60 s timeout → Retry. Cancel closes immediately and leaves state and controls untouched. No scripted animation.
Commands/checks actually run: tsc -b PASS; vite build PASS. Headless Chrome drove the real guide on the demo simulator
  (integrated engine) twice; final run (b6-guide-run.json): steps confirmed at simulated 17.12–17.28 h, Next disabled
  before confirmation on every command step (2, 4, 6; step 1 was already normal), timeline and evidence panels opened
  on steps 3 and 5, Finish closed the guide; Cancel after the breakdown left the guide closed, start and scenario
  buttons enabled and the breakdown banner (state untouched); manual A then reset the stand.
Known limitations / unverified: not run on Docker/Eclipse Ditto; whether a new viewer can explain the recommendation
  after the guide needs a human run (Team acceptance); the guide is ~30 s of clicks, about three minutes with reading.
Request to Ahmad + Codex: none.
Integration instruction: merge claude/b6-guided-demo into codex/ademix. After integration, C1 starts.
```

### Integration result — Codex — B6 guided demonstration — 2026-10-24

- Integrated `origin/claude/b6-guided-demo` (`200da6b`, implementation `f8dcb17`) into `codex/ademix`; merge commit `db39a9a`.
- Ownership review passed: only Professor + Claude frontend files, B6 evidence, and this shared context changed; no simulator, API, data contract, or OpenEgiz configuration was modified.
- Combined verification passed: frontend TypeScript/Vite production build; 92 simulator/API/evidence tests; 47 data-contract tests; rebuilt live UI; judge smoke with Eclipse Ditto, all 11 twins, and all 143 required fields/units.
- Live guide command path passed through the frontend proxy: fixed/baseline acknowledgement, HT-01 breakdown acknowledgement, Smart Dispatch acknowledgement, and clean fixed/baseline reset with zero stale breakdown/blocked/standby trucks.
- Existing non-fatal frontend bundle-size warning remains. Team human acceptance of whether a new viewer can explain the recommendation after the guide is still required.
- Next Professor + Claude task: C1 starts from the pushed `origin/codex/ademix` state.

### Integration — Codex — B5 operational animation and road acceptance — 2026-10-24

- Owner/branch: Ahmad + Codex, `codex/integrate-b5`, based on shared integration `7ddc060`.
- Merged `origin/claude/b5-operations-road` (`30f8794`, implementation `70fbc5d`) without conflicts;
  merge commit `de5429f`. Preserved B1–B4, the standby-bay access fix and all backend/data contracts.
- Frontend changes: contract-driven directional lane overlay and banner; pull-over keyed to actual blockage lane;
  interrupted dwell cancellation and quicker visual catch-up for failed/held trucks; loop-road surface normals.
- Verification: 92 simulator/API/evidence tests PASS; 47 data-contract tests PASS; host TypeScript/Vite production
  build PASS (existing non-fatal large-chunk warning). UI-only Docker image rebuild/start PASS and healthy.
  Live smoke PASS with Eclipse Ditto, 11 twins and 143 fields/units. Full Fixed/Smart four-condition live matrix
  PASS, with required/cycling/standby counts 4/4/2, 4/4/1, 8/6/0 and 3/3/3; clean fixed/baseline reset PASS.
- Browser check: rebuilt UI reports LIVE Eclipse Ditto, advancing simulated time and changed condition/KPI values
  during the matrix; fresh final-reset screenshot `evidence/claude-b5/b5-integrated-live-reset.png`.
- Reviewed Professor's supplied screenshots for crusher-bound and face-bound failures and `b5-checks.txt`.
- Limitations retained: drawn trucks may trail returned state by a few seconds, with 3× catch-up for failure/held
  states; the supplied full-cycle observation consists of separate captures, not a continuous recording.
- Handoff: publish the tested integration to `origin/codex/ademix`, then Professor + Claude start B6
  from that exact shared state. Do not merge to official main or mark final human/Ubuntu acceptance complete.

### Lock — Claude — B5 operational animation and road acceptance — 2026-10-24

```text
Owner: Professor + Claude
Branch: claude/b5-operations-road (from origin/codex/ademix 7ddc060)
Task: B5. Present the A4 two-way road contract: affected lane from road-main.blockage_lane / blockage_heading and
  the two directional blocked counters (never inferred from screen position, opposing lane never shown closed,
  road_closure always a speed restriction); in-scene marking of only the blocked lane; breakdown banner wording
  per contract; reset clears every warning. Then accept the operational story: loading passes and payload,
  dumping into the ROM bin, queue spacing, standby parking and both breakdown directions, with captured evidence.
Exact files: ademix/frontend/src/IngestionLayer.tsx, ademix/frontend/src/ingestion.css, evidence/claude-b5/*
Contract consumed: ROAD_BREAKDOWN_CONTRACT.md (ademix.road-breakdown.v1), no change.
Expected handoff: commit SHA, build, live checks for both lanes and reset, cycle evidence, limitations.
```

Handoff — Professor + Claude — B5 operational animation and road acceptance — 2026-10-24

```text
Owner: Professor + Claude
Task: B5 — Operational animation and road acceptance
Branch: claude/b5-operations-road (from origin/codex/ademix 7ddc060)
Commit SHA: 70fbc5d (lock on the branch)
Exact changed paths: ademix/frontend/src/IngestionLayer.tsx, ademix/frontend/src/ingestion.css,
  evidence/claude-b5/{b5-crusher-bound-blocked.png,b5-face-bound-blocked.png,b5-after-reset.png,
  b5-crusher-dumping-clean-pad.png,b5-loading-face-smart.png,b5-checks.txt}; PROJECT_CONTEXT.md
Contract consumed (unchanged): ROAD_BREAKDOWN_CONTRACT.md (ademix.road-breakdown.v1) — road-main.blockage_lane,
  blockage_heading, blocked_trucks, blocked_crusher_bound_trucks, blocked_face_bound_trucks, blockage, state.
What changed: banner wording per contract (blocked lane named, opposing traffic continues; after tow "both lanes open,
  out of service until Normal operations"; off-road failure blocks nothing); BlockedLane marks only the affected lane
  from the failed truck back to its followers, opposite lane labelled open; failed-truck pull-over keys on
  blockage_lane (not the road_closure speed restriction); failed/held trucks cancel any shown dwell and catch up 3×;
  loop-road link triangles wound upward with upward normals (removes dark triangles across the crusher pad).
Commands/checks actually run: tsc -b PASS; vite build PASS. Live on the demo simulator (integrated engine): crusher-bound
  failure → blockage_lane crusher_bound, heading 1, held 1/0, banner + lane tags matched; face-bound failure →
  face_bound, heading −1, held 0/1 then 2, banner + tags matched, followers drawn behind on the crusher side; tow →
  "towed clear; both lanes open"; UI reset (A) → banner/lane/breakdown tags gone and twin lane none, heading 0,
  counters 0, road open, no blocked/breakdown truck. Loading face (Smart) and crusher-while-dumping views captured.
Known limitations / unverified: not run on Docker/Eclipse Ditto; the drawn trucks still follow the twin forward-only and
  can trail it by a few seconds after a dwell (now shortened for failures only); a full empty→load→haul→dump→return cycle
  of one truck was observed across separate captures, not recorded as one continuous video.
Request to Ahmad + Codex: none.
Integration instruction: merge claude/b5-operations-road into codex/ademix.
```

### Integration result — Codex — B4 recovery timeline — 2026-10-24

- Integrated `origin/claude/b4-recovery-timeline` (`732d66c`, implementation `7826833`) into
  `codex/integrate-b4` from shared integration `cf58d18`; merge commit `07e0c3c`. No conflicts or backend
  behavior/contract changes. B3 and the accepted standby-bay access work are preserved.
- Combined checks: 92 simulator/API/evidence tests PASS; 47 data/schema tests PASS; TypeScript/Vite production
  build PASS (existing non-fatal large-chunk warning). Docker rebuild/start reached healthy state. Live smoke
  passed Eclipse Ditto source, exactly 11 twins and all 143 required fields/units.
- Full live Fixed/Smart four-condition matrix PASS, including required/cycling/standby counts 4/4/2,
  4/4/1, 8/6/0 and 3/3/3; final reset PASS with no stale breakdown, blocked or standby state.
- Browser acceptance on the rebuilt live stand: Breakdown timeline opens/closes; saved-model/not-live label,
  separate observed/projected/control series, supplied event labels and summary are present. Fresh screenshot:
  `evidence/claude-b4/b4-integrated-live.png`. Reviewed Claude's desktop and 375 px screenshots. Fresh fixture
  arithmetic confirms 137 plotted points, minimum 687.6 t/h at 0:40 and 2,231 vs 2,310 t over three hours.
- Known contract caveat retained: the supplied rolling-throughput recovery marker occurs at road clear before
  the delayed rolling-average dip. B4 explains this; changing its recovery definition is a separate backend
  task, not part of this frontend merge. Final Ubuntu/software-rendering and human release acceptance remain open.
- Handoff: after this integration is pushed to `origin/codex/ademix`, Professor + Claude may start the next
  incomplete B5 task from that updated shared branch; do not start from the old B4 branch. Official main unchanged.

### Lock — Claude — B4 production and recovery timeline — 2026-10-24

```text
Owner: Professor + Claude
Branch: claude/b4-recovery-timeline (from origin/codex/ademix cf58d18)
Task: B4. A "Breakdown timeline" panel plotting productionRecovery (A3 schema v1) on simulated time: observed
  rolling throughput (solid), projected steady capacity (dashed), the baseline control run (thin), the supplied
  event markers only (breakdown, road cleared, recovered, reset) and period 2 after reset kept separate; a short
  derived summary (lowest observed, production after 3 h vs control); opened from the Scenarios panel.
Exact files: ademix/frontend/src/IngestionLayer.tsx, ademix/frontend/src/ingestion.css, evidence/claude-b4/*
Contract consumed: HISTORY_CONTRACT.md (no change).
Expected handoff: commit SHA, build, fixture-vs-chart check, screenshots, limitations, recovery-marker note.
```

Handoff — Professor + Claude — B4 production and recovery timeline — 2026-10-24

```text
Owner: Professor + Claude
Task: B4 — Production and recovery timeline
Branch: claude/b4-recovery-timeline (rebased onto origin/codex/ademix cf58d18, after B3 and standby-bay access)
Commit SHA: 7826833 (lock e477b7c)
Exact changed paths: ademix/frontend/src/IngestionLayer.tsx, ademix/frontend/src/ingestion.css,
  evidence/claude-b4/{b4-desktop-timeline.png,b4-phone-375-timeline.png,b4-checks.txt}; PROJECT_CONTEXT.md
Contract consumed (unchanged): HISTORY_CONTRACT.md — productionRecovery schema v1: methodology.sample_s /
  recovery_rule, baseline.samples, breakdown_recovery.events (kind, label, sim_time_s, period_id) and .periods
  (samples: sim_time_s, observed_rolling_throughput_tph, projected_steady_capacity_tph, production_t).
What changed: "Breakdown timeline" button in the Scenarios panel; SVG chart on simulated time (hours since the
  breakdown): observed rolling 1 h solid, projected steady capacity dashed, same-start baseline thin; numbered
  supplied event markers only (period_started is not drawn) with their supplied labels; period 2 shaded and drawn
  as its own segment; derived summary (lowest observed 687.6 t/h at 0:40; 2,231 vs 2,310 t over 3 h, −79 t);
  unknown schema shows nothing.
Commands/checks actually run: tsc -b PASS; vite build PASS. Headless Chrome: SVG read back into data equals the
  fixture for all 137 points (≤2.42 s, ≤0.049 t/h from 0.1 px rounding), labels equal; identical at two different
  live stand times. Desktop and 375 px screenshots.
Known limitations / unverified: not run on Docker/Eclipse Ditto; the chart is the saved fixture only (no live
  trend), as the contract allows.
Request to Ahmad + Codex (contract question, not blocking): with the current fixture the throughput_recovered event
  coincides with road_cleared (15600 s) because the 1 h rolling average still contains pre-breakdown output; the
  observed series then dips to 687.6 t/h (< 95 % of 770) between 0:40 and 1:30. The UI shows the event as supplied
  with an explanatory note. Consider defining recovery on a non-lagging measure or requiring the 95 % condition to
  hold after the rolling window has passed the stoppage, then regenerate the fixture.
Integration instruction: merge claude/b4-recovery-timeline into codex/ademix.
```

### Lock — Claude — standby bay access (human visual review) — 2026-10-24

```text
Owner: Professor + Claude
Branch: claude/standby-bay-access (from origin/codex/ademix 4aeb30b)
Task: Professor's review found the smart-dispatch standby bay has no entrance: the face loop's outer windrow runs
  between the loop and the bay. Open the windrow in front of the bay and pave a wide access apron so parked
  trucks visibly drive in and out. Visual only (part of B5 scope); no twin, simulator or data change.
Exact files: ademix/frontend/src/IngestionLayer.tsx, evidence/claude-bay-access/*
Expected handoff: commit SHA, build, before/after screenshots.
```

Handoff — Professor + Claude — standby bay access — 2026-10-24

```text
Branch / commit: claude/standby-bay-access / ad9574c
Paths: ademix/frontend/src/IngestionLayer.tsx; evidence/claude-bay-access/standby-bay-access-face-view.png;
  PROJECT_CONTEXT.md (this entry)
Change: face-loop windrow opens toward the standby bay (full bay width, in addition to the haul-road opening);
  paved access apron with edge lines between bay and loop; Loading face view aimed between loop and bay; bay sign
  smaller. No twin, contract, simulator or data change.
Checks: tsc -b PASS; vite build PASS (existing chunk warning). Headless Chrome on the demo simulator with Smart
  Dispatch: two trucks parked in bays, open entrance, no windrow between bay and loop (screenshot above).
Limitations: not run on Docker/Ditto; independent of open B3 PR #6 (both touch IngestionLayer.tsx in different
  functions; merge either order).
Integration: merge claude/standby-bay-access into codex/ademix.
```

Integration result — 2026-10-24: merged after B3 into `codex/ademix`; the combined frontend production build passed. The already-completed 92 simulator/API/evidence and 47 data-contract suites remained applicable because this change is visual-only and changes no contract or backend path.

Release rule: `05_FINAL_ACCEPTANCE.md` defines six mandatory gates for the exact final candidate: one real decision journey, cross-surface agreement, truthful failure handling, measured software-render usability, clean Ubuntu reproduction from official `main`, and evidence-backed rubric review. These gates are not optional and official `main` remains blocked until all pass.

Owner: Ahmad + Codex
Branch: `codex/a8-a9-decision-contract`
Exact files: `ademix/data/build_decision_explanation.py`, `ademix/data/test_decision_explanation.py`, `ademix/data/evidence/decision_explanation.json`, `ademix/data/DECISION_EXPLANATION_CONTRACT.md`, `ademix/data/DATA_CARD.md`, `PROJECT_CONTEXT.md`
Purpose: freeze a frontend-ready A8/A9 explanation contract for the existing Decision workspace without editing Professor-owned frontend files.
Expected handoff: Professor + Claude consume the generated JSON exactly, keep saved evidence separate from live state, and show unavailable instead of fabricating missing values.

### Lock — Claude — B3 fixed-versus-smart comparison — 2026-10-24

```text
Owner: Professor + Claude
Branch: claude/b3-fixed-vs-smart (from origin/codex/ademix 3bb976f)
Task: B3. A Fixed vs Smart Dispatch evidence panel built only from dispatchComparison (A2 schema v1): output,
  trucks cycling/parked, loading and crusher waits, cycle time, operating truck-hours per 1,000 t and the
  estimated fuel per 1,000 t for each condition, steady 8 h window (first hour selectable), with the measurement
  period stated, a plain explanation of why fewer trucks keep the loader-limited output, and no live values
  mixed in. Opened from the Scenarios panel; follows the live condition and returns to Normal on reset.
Exact files: ademix/frontend/src/IngestionLayer.tsx, ademix/frontend/src/ingestion.css, evidence/claude-b3/*
Contract consumed: DISPATCH_COMPARISON_CONTRACT.md (no change).
Expected handoff: commit SHA, build, fixture-vs-UI check for all four conditions, screenshots, limitations.
```

Handoff — Professor + Claude — B3 fixed-versus-smart comparison — 2026-10-24

```text
Owner: Professor + Claude
Task: B3 — Fixed-versus-smart comparison
Branch: claude/b3-fixed-vs-smart (from origin/codex/ademix 3bb976f)
Commit SHA: 3ba437f (lock 04fb1bd)
Exact changed paths: ademix/frontend/src/IngestionLayer.tsx, ademix/frontend/src/ingestion.css,
  evidence/claude-b3/{b3-desktop-normal.png,b3-desktop-road-restriction-live.png,b3-phone-375.png,b3-checks.txt};
  PROJECT_CONTEXT.md (this entry)
Contract consumed (unchanged): DISPATCH_COMPARISON_CONTRACT.md — dispatchComparison schema v1: scenarios.<condition>
  .label, .trucks_required, .periods.{steady,transient}.{window_h,fixed,smart,smart_minus_fixed}, claim. Register
  values (payload 77 t, load 6 min, dump 1 min, route 3.2 km, 25 km/h) only for the explanation sentence.
What changed: "Fixed vs Smart evidence" button in the Scenarios panel opens a right-column panel: condition tabs
  (Normal / HT-01 down / Road restricted / Crusher −45 %), window tabs (Steady 8 h / First 1 h), 8 metric rows
  Fixed | Smart | Change (smart_minus_fixed.percent; null → "new" or "—"; ±0.05 % → "same"), the stated window,
  a plain-language reason per condition, and the evidence claim. No live value inside; • marks the live condition.
Commands/checks actually run: tsc -b PASS; vite build PASS (existing chunk warning only). Headless Chrome on the
  demo simulator: 128/128 cells equal the served fixture; baseline shows 6.0/0.0 fixed vs 4.0/2.0 smart; the real
  road-restriction control moved the panel to Road restricted; A reset returned it to Normal. Details in
  evidence/claude-b3/b3-checks.txt.
Known limitations / unverified: not run on Docker/Eclipse Ditto; the explanation's 770 t/h and 22.4 min are computed
  here from register values (they agree with the evidence output); breakdown assumes 5 available trucks (one down).
Request to Ahmad + Codex: none.
Integration instruction: merge claude/b3-fixed-vs-smart into codex/ademix.
```

Integration result — 2026-10-24: B3 was merged into `codex/ademix` after preserving both sides of the shared-log conflict. The combined frontend production build passed, all 92 simulator/API/evidence tests passed, and all 47 data-contract tests passed. Professor + Claude may start B4 from the pushed combined commit.

### Lock — Claude — B2 fuel and ESG presentation — 2026-10-24

```text
Owner: Professor + Claude
Branch: claude/b2-fuel-esg (from origin/codex/ademix 5f2db02)
Task: B2. Replace the Fleet & ESG panel's frontend-recomputed fuel/CO2 with the A1 contract: estimated shift
  fuel, estimated tank-to-wheel CO2, current fuel rate and operating-truck count from mine-01; baseline versus
  active condition/policy from the A2 matched 8 h evidence (estimated_fuel_l, estimated_fuel_l_per_kt);
  a plain explanation of why values change; explicit simulated / derived / assumed labels (nothing measured);
  safe unavailable states; optional new-shift button using POST /api/shift/reset.
Exact files: ademix/frontend/src/IngestionLayer.tsx, ademix/frontend/src/ingestion.css, evidence/claude-b2/*
Contracts consumed: FUEL_CO2_CONTRACT.md (A1), DISPATCH_COMPARISON_CONTRACT.md (A2). No field renamed or added.
Expected handoff: commit SHA, build, live API-vs-UI check, screenshots, limitations.
```

Handoff — Professor + Claude — B2 fuel and ESG presentation — 2026-10-24

```text
Owner: Professor + Claude
Task: B2 — Correct fuel and ESG presentation
Branch: claude/b2-fuel-esg (from origin/codex/ademix 5f2db02)
Commit SHA: 4e5e338 (lock 72c923e)
Exact changed paths: ademix/frontend/src/IngestionLayer.tsx, ademix/frontend/src/ingestion.css,
  evidence/claude-b2/{b2-desktop-fuel-smart.png,b2-desktop-fuel-two-hour.png,b2-desktop-fuel-breakdown.png,
  b2-phone-375-fuel.png,b2-live-two-hour-check.txt}; PROJECT_CONTEXT.md (this entry)
Contracts consumed (unchanged): FUEL_CO2_CONTRACT.md — mine-01 shift_fuel_l, shift_co2_kg,
  current_fuel_rate_lph, operating_trucks_fuel_count, shift_id, shift_elapsed_s, fuel_estimate_basis and
  POST /api/shift/reset; DISPATCH_COMPARISON_CONTRACT.md — dispatchComparison schema v1, steady window
  estimated_fuel_l, estimated_fuel_l_per_kt, throughput_tph. Register values used for labels/derivations:
  truck/excavator L/h, diesel_co2_kg_per_l 2.677, diesel_energy_kwh_per_l 10.03.
What changed: new optional "Fuel & CO₂" layer (Fleet & ESG split into Fleet advisor + Fuel & CO₂). The old ESG
  panel recomputed L/h and a shift CO2 total from the current fleet × elapsed time; it is removed. Totals and
  rate are displayed as published; per-tonne fuel/energy are derived here and show "—" when throughput is 0;
  normal operations vs the active condition/policy come from A2 (unknown schema → "unavailable"); every value is
  tagged simulated / derived here / assumed and "Measured: none" plus exclusions are stated. Start new shift calls
  the reset endpoint. Truck card, sensors and fuel panel now share a right-hand column; phones show one panel.
Commands/checks actually run: tsc -b PASS; vite build PASS (existing >500 kB chunk warning only).
  Live (local demo simulator, 5f2db02 engine): UI = /api/state field-for-field within display rounding
  (e.g. 4526.62 L → 4,526.6 L; 12117.76 kg → 12,117.8 kg; 381.1 L/h, 6 trucks; 381.1/770 → 0.495 L/t);
  Start new shift moved shift_id 1→2 and restarted totals (3.13 L → 3.1 L); two-hour reproduction
  (Smart 4 operating 1 h → fixed 6 operating 1 h) reached exactly 663.0 L / 1774.85 kg at 7200 s and the panel
  text read 663.0 L / 1,774.9 kg at that poll; dispatch change kept the running total (281.9 L at 3600 s, then
  accruing at 381.1 L/h); comparison rows equal A2 (baseline fixed 494.9 → smart 366.1 L/kt, −26.0 %;
  breakdown fixed 430.5 L/kt, −13.0 % vs normal).
Screenshot paths: evidence/claude-b2/*.png (desktop 1440×900 via headless Chrome/DevTools; phone 375×812).
Known limitations / unverified: zero-throughput "—" path checked by code review only (live throughput never
  reached 0); the two-hour screenshot was taken one update after the 663.0 L text check (shows 671.5 L at
  2 h 01 min); comparison is the saved 8 h steady window, not the live shift; CO₂ per 1,000 t is derived here
  as A2 L/kt × 2.677; not run on Docker/Eclipse Ditto.
Request to Ahmad + Codex: none required. Optional: if the team wants CO₂ in the A2 evidence itself, add
  estimated_co2_kg / estimated_co2_kg_per_kt to dispatchComparison so the UI no longer derives it.
Integration instruction: merge claude/b2-fuel-esg into codex/ademix (frontend + evidence + this entry).
```

### Lock — Claude — B1 simplify the opening operator view — 2026-10-24

```text
Owner: Professor + Claude
Branch: claude/b1-opening-view (from origin/codex/ademix 49a1d7a)
Task: B1. Default view (IngestionLayer) opens on the mine with four operator KPIs (production now,
  bottleneck now, trucks cycling/parked, the relevant queue wait), compact always-visible scenario controls,
  and technical layers (specifications, sensors, topology, data flow, fleet/ESG, weather, safety) off until
  chosen. Adds Overview / Loading face / Crusher camera presets and truck selection with its live twin state.
Exact files: ademix/frontend/src/IngestionLayer.tsx, ademix/frontend/src/ingestion.css
Contract: consumes existing twin fields only; no simulator, data or API change.
Expected handoff: commit SHA, build result, desktop + narrow screenshots, untested items.
```

Handoff — Professor + Claude — B1 simplify the opening operator view — 2026-10-24

```text
Owner: Professor + Claude
Task: B1 — Simplify the opening operator view
Branch: claude/b1-opening-view (from origin/codex/ademix 49a1d7a)
Commit SHA: 955c080 (lock c1d3318)
Exact changed paths: ademix/frontend/src/IngestionLayer.tsx, ademix/frontend/src/ingestion.css,
  evidence/claude-b1/{b1-desktop-1440.png,b1-phone-375.png,b1-loading-face-view.jpg}; PROJECT_CONTEXT.md (this entry)
Contract consumed: no contract change. Reads existing fields: mine-01.throughput_tph, mine-01.bottleneck_live,
  scenario-controller.trucks_in_cycle / trucks_standby (replay log lacks them: counted from truck states),
  excavator-01 / crusher-01 average_wait_min and queue_length, truck-0N state/speed/payload/progress/trips/
  cycle_time_min/queue_wait_min/fuel_pct. The constraint value is shown with an operator name
  (loading resource → Excavator, crusher processing capacity → Crusher, …); the value itself is unchanged.
What changed: four key figures at the top; compact Scenarios panel (A / B / C always visible, gauges and
  bottleneck reasons behind Details); all seven technical layers start closed under a Technical layers menu;
  Overview / Loading face / Crusher camera views; truck selection (click → live twin card, Zoom to truck,
  empty-ground click closes); standby-bay labels only with Topology or when trucks are parked; phone layout.
Commands/checks actually run: tsc -b PASS; vite build PASS (existing >500 kB chunk warning only).
  On the local demo simulator (ADEMIX_DEMO_MODE=1, integrated 49a1d7a engine), in-app browser:
  all 7 layers toggled on and off (aria-pressed and panel presence checked); Loading face, Crusher and Overview
  views captured; truck click opened HT-02's card with returned values, empty click closed it; Zoom to truck
  then Overview returned to the opening view; at 375×812 every panel's bounds fit inside the viewport and the
  camera buttons no longer overlap the status bar.
Observed results: as above. Headless Chrome 1440×900 screenshot shows face and crusher uncovered by panels.
Screenshot paths: evidence/claude-b1/b1-desktop-1440.png, evidence/claude-b1/b1-phone-375.png,
  evidence/claude-b1/b1-loading-face-view.jpg
Known limitations / unverified: not run against Docker/Eclipse Ditto; keyboard-only use of truck selection
  not provided (trucks are canvas objects; the Sensors layer table still lists every truck); a headless
  390 px capture cropped the right edge by ~10 px while the 375 px device emulation fitted — real-device check
  pending. The legacy styles.css body min-width is overridden only while the dispatcher view is mounted.
Request to Ahmad + Codex: none for B1. B2 can start once A1's frozen contract/fixture is confirmed (already
  handed off 2026-10-23 per A1 entry).
Integration instruction: merge claude/b1-opening-view into codex/ademix (frontend-only; no shared release file
  except this PROJECT_CONTEXT entry).
```

### Integration — Ahmad + Codex — B1 opening operator view — 2026-10-24

```text
Status: accepted, integrated and verified on codex/ademix.
Source: origin/claude/b1-opening-view; implementation 955c080; handoff 9d683eb.
Integration commit: 8e12af8.
Ownership review: only Professor + Claude frontend paths, B1 evidence images and this shared context changed.
Combined verification: 80 simulator/API tests pass; 41 data/schema tests pass; TypeScript/Vite production build
passes (existing >500 kB chunk warning only); complete Docker Compose rebuild reaches healthy state; judge smoke
passes source=eclipse-ditto, all 11 twins and all 143 required fields/units; live baseline, Smart Dispatch,
breakdown, road restriction, crusher slowdown, every Smart+scenario combination and reset pass.
Known visual limits remain those in the B1 handoff: real-device narrow-width inspection and keyboard-only canvas
truck selection were not added or claimed by integration.
Next Professor + Claude task: B2 may begin from the updated origin/codex/ademix using the frozen A1 contract.
```

### Handoff — Codex — A6 authoritative simulation clock backend — 2026-10-24

```text
Owner: Ahmad + Codex
Status: backend/data portion implemented and validated on its feature branch; not integrated because the newer
  score-first gate 4c3ea13 requires accepted B1–B6, visible C1–C4 and combined C5 before A6 integration.
Branch: codex/a6-simulation-clock (updated with origin/codex/ademix 4c3ea13)
Implementation commit: 7064c87; merge commit: ee7dacd
Exact files: README.md; PROJECT_CONTEXT.md; ademix/simulator/{engine.py,app.py,twins.json,test_engine.py,
  test_reliability.py,MODEL.md,SIMULATION_CLOCK_CONTRACT.md}; ademix/data/{build_data_layer.py,
  telemetry_dictionary.csv,telemetry/telemetry_dictionary.csv,telemetry/sensor_catalogue.csv,
  telemetry/manifest.json,telemetry/logs/*.csv,evidence/fixed_vs_smart.json,
  evidence/production_recovery.json}; ademix/frontend/public/data/ingestion.json.
Contract: mine-01 retains sim_time_s and adds simulation_speed_multiplier (x) plus simulation_mode
  (openegiz_live | local_demo | offline_model). The multiplier changes wall-clock demonstration speed only;
  modeled time, travel/loading/dumping durations and production equations remain unchanged.
Frontend ownership: no React, CSS, 3D, presentation or visual asset file will be edited. Visible clock label
  and truck-interpolation consumption remain the final A6 step after accepted B6 transfers frontend ownership.
Tests: 75 simulator/API tests PASS; 41 data/schema tests PASS; frontend production build PASS (619 modules,
  existing >500 kB chunk warning only); Docker rebuild/start PASS; judge smoke PASS for health, Eclipse Ditto,
  11 twins and 143 required fields/units; complete Fixed/Smart × four-scenario matrix and clean reset PASS.
Live evidence: /api/health and the Ditto-returned mine-01 twin both report multiplier 20 and mode openegiz_live;
  two returned-state samples advanced sim_time_s from 1360 to 1460 while remaining source=eclipse-ditto.
Limitation recorded by the feature handoff: A6 was not complete at handoff time. After the score-first prerequisite integration,
  Professor + Claude's hard-coded speed must be replaced by this returned field, the compact visible clock and
  truthful unavailable fallback must be added, combined visual behavior checked, then A6 can enter codex/ademix.
```

### Handoff — Codex — Ditto 503 read/write-pressure reliability — 2026-10-24

```text
Owner/branch: Ahmad + Codex; codex/ditto-timeout-reliability from origin/codex/ademix 02bf007.
Implementation commit: 87b3cf8 (Fix Ditto timeout under live polling).
Root cause: two independent request multipliers saturated Ditto on this Docker host. The simulator persisted all
  11 twins every wall second, while every frontend poll caused 11 sequential HTTP reads. During restart the latter
  produced overlapping cold-cluster reads. Evidence: things reached 322% CPU; stopping simulator reduced it to
  3.6% and direct reads returned in 0.23–0.24 s; Ditto bulk read returned all twins in one request.
Fix: keep SIM_SPEEDUP=20 and model equations unchanged; publish complete snapshots every two wall seconds;
  replace 11 sequential reads with one Ditto bulk `/api/2/things?ids=...` read; validate exactly 11 twins;
  coalesce polls within the publish interval; and report API health only after a complete Ditto read warms cache.
Changed implementation/data/docs: README.md; ademix/compose.yml; ademix/simulator/{app.py,test_reliability.py};
  ademix/data/{test_data_layer.py,telemetry/sensor_catalogue.csv}; generated
  ademix/frontend/public/data/ingestion.json. PROJECT_CONTEXT.md is the eighth path and only records coordination.
Professor + Claude protection: no frontend source, 3D, CSS, chart or animation file changed. The generated JSON
  contains only the documented 2 s wall / 40 s simulated interval update.
Validation: 76 backend tests pass; 41 data tests pass; frontend production build passes (existing chunk warning);
  judge smoke passes all 11 twins and 141 fields/units; full fixed/smart × baseline/breakdown/road/crusher matrix
  and reset pass. In-app browser verified live Eclipse-Ditto status, advancing values, six truck states, HT-01
  breakdown at 0 km/h, production/scenario changes and baseline recovery. A full rebuilt restart reached healthy;
  20 immediate state reads all returned 200, eclipse-ditto and 11 twins (no 503).
Remaining limitation: cold-start reads on this Windows/Docker host were successful but took roughly 2.9–6.1 s;
  the clean Ubuntu amd64 judge-host rehearsal remains a release gate. Integrate completed A6 first because it
  overlaps app.py, tests, sensor catalogue and generated ingestion data; resolve this commit on top and rerun gates.
```

### Integration — Codex — A6 plus Ditto reliability — 2026-10-24

```text
Shared branch: codex/ademix. A6 integrated first at 5a3d264; Ditto reliability integrated at 91f66e3.
Conflict resolution preserved A6's authoritative clock fields and health metadata plus the reliability fix's
  bulk read, cache/readiness protection and two-second publish contract. Generated data was rebuilt from the
  combined source. No Professor + Claude frontend source file was edited during resolution.
Combined verification: 80 simulator/API tests PASS; 41 data/schema/regeneration tests PASS; frontend production
  build PASS (619 modules, existing non-fatal >500 kB chunk warning); Docker build/start/health gates PASS;
  judge smoke PASS with Eclipse Ditto, 11 twins and 143 fields/units; full fixed/smart × four-scenario matrix and
  clean reset PASS. Official main remains untouched.
Remaining release gate: clean Ubuntu 24.04 amd64 rehearsal and final combined visual acceptance before main.
```

### Handoff — Team — Professor owns B1–B6 and visible C1–C5 — 2026-10-24

```text
Latest ownership decision: Professor + Claude complete B1–B6 and then the user-facing/frontend/3D work for
  C1–C5, one accepted and integrated task at a time.
Ahmad + Codex retain simulator/API meaning, existing C1 relationship and C4 model-truth contracts, generated
  evidence, backend/data tests and release integration. Codex does not edit Claude's C frontend paths concurrently.
Sequence: B1 → B2 → B3 → B4 → B5 → B6 → C1 → C2 → C3 → C4 → C5.
C inputs: C1 and C4 nonvisual contracts are already integrated and authoritative. Claude requests any missing
  field or contract change through a handoff rather than altering backend meaning.
Score guard: no longer map, decorative workers/buildings, second route or unrelated dashboard. The required
  judge journey and software-rendering reliability take priority.
Final gate: Ahmad + Codex integrate and run backend/data suites, frontend build, live smoke, scenario matrix
  and reset. J1–J8 remain last. C6/A9 stays optional and unassigned until the required candidate is stable.
Documentation branch: codex/professor-b-c-plan. No application behavior or completed-task claim is added here.
```

### Handoff — Codex — score-first execution order — 2026-10-24

```text
Owner: both AI workstreams follow the order; Ahmad + Codex maintain the shared documents
Branch: codex/score-first-order
Change: the existing A6–A11 plan now requires B1–B6 integration first, then visible C1–C4 and combined C5,
  then A6. A8/A9 run only if time remains. A7/A10/A11 are skipped when C2 already supplies their value.
Final phase: freeze the combined candidate and run J1–J8, prioritizing clean Ubuntu startup, claim-to-evidence
  indexing, a candidate-accurate presentation and software-rendering proof.
Reason: maximize provable rubric levels and avoid duplicated dashboards, decorative scope and release risk.
Application impact: documentation/order only; no implementation, runtime behavior or test result changed.
Verification: shared references and required task/order language checked; git diff check passes.
```

### Handoff — Codex — A6–A11 score-focused work definition — 2026-10-24

```text
Owner: Ahmad + Codex
Status: planning document prepared; no A6–A11 application behavior is claimed complete
Branch: codex/a6-a11-work-plan
Exact files: A6_A11_SCORE_FOCUSED_IMPROVEMENTS.md; START_HERE.md;
  01_AHMAD_CODEX_WORK.md; TEAM_WORK_PLAN.md; PROJECT_CONTEXT.md.
Decision: A6 is recommended. A7–A11 are optional and must yield to required B/C integration and release safety.
Score focus: authoritative simulation time, live event evidence, fleet right-sizing, bounded sensitivity,
  scenario-specific recommendations and a reproducible decision export.
Rejected scope before submission: a longer map, decorative workers, extra buildings, a second route/loading
  face or scene density without a scored operational purpose.
Ownership: Professor + Claude continue B1–B6 only. Ahmad + Codex may implement backend/data portions without
  touching their frontend paths; frontend consumption waits for accepted B6 integration and ownership transfer.
Verification: documentation consistency and repository diff review only. No implementation, runtime test,
  scenario mutation, visual change or completion claim is part of this planning branch.
Next action: give Codex the copyable prompt in the new document and execute A6 first on its own fresh branch.
```

### Handoff — Codex — C4 model-truth contract — 2026-10-24

```text
Owner: Ahmad + Codex
Status: nonvisual truth contract integrated and verified; Why trust this? UI remains deferred until B6 and C2–C3
Branch: codex/c4-model-truth-contract (from origin/codex/ademix 8609421)
Implementation commit: 8552566
Exact files: ademix/data/evidence/model_truth.json; ademix/data/build_data_layer.py;
  ademix/data/test_data_layer.py; ademix/data/telemetry/manifest.json;
  ademix/frontend/public/data/ingestion.json; ademix/simulator/MODEL_TRUTH_CONTRACT.md;
  PROJECT_CONTEXT.md.
Contract: additive static schema `ademix.model-truth.v1`; no new twin, field, API route, formula, scenario,
  simulation behavior or OpenEgiz delivery change. Live values remain authoritative from returned twins.
Contract contents: mandatory verified/not-validated/synthetic wording; five live joins for mass-balance error,
  observed rolling throughput, projected steady capacity, planned bottleneck and live constraint; five principal
  formulas; nine sourced/derived/assumption/scenario-input parameters; explicit safe and prohibited claims.
Unavailable behavior: a missing returned field displays unavailable. Mass balance must never show success when
  its field is absent; observed throughput and projected capacity must never be substituted or blended.
Evidence: all parameter values/units/categories join to the register; all live features exist in the engine
  snapshot and join to exact twin kind, telemetry unit and origin. The generated bundle exposes `modelTruth`.
Tests actually run: 41 data/schema/regeneration checks pass; 72 simulator/API tests pass; TypeScript/Vite
  production build passes with the existing non-fatal >500 kB chunk warning. No React/CSS/3D source changed.
Limitations: this is a concise view of existing evidence, not new validation. The conceptual deterministic
  model omits site calibration, surveyed geometry, rolling resistance, stochastic failures, alternate routes,
  crusher electricity and safety certification. It does not support measured or guaranteed claims.
Next C4 step: after accepted B6 integration and completion of C1–C3 UI, consume `modelTruth` in the optional
  Why trust this? view. Do not begin that frontend work early.
Integration: fast-forwarded into codex/ademix after a final fetch found no new Professor/Claude handoff.
  Combined results: 41 data/schema checks, 72 simulator/API tests and production build pass; rebuilt Compose
  services are healthy; the served v1 contract has five of five live joins from Eclipse Ditto; official smoke
  passes all 11 twins and 141 fields/units. Push codex/ademix only; do not merge to main.
```

### Handoff — Codex — C1 twin relationship contract — 2026-10-24

```text
Owner: Ahmad + Codex
Status: contract integrated and verified on codex/ademix; C1 UI waits for accepted B6 integration
Branch: codex/c1-twin-relationships (from origin/codex/ademix cfb4ec9)
Implementation commit: d903498
Exact files: ademix/data/topology/twin_relationships.json; ademix/data/build_data_layer.py;
  ademix/data/test_data_layer.py; ademix/simulator/TWIN_RELATIONSHIP_CONTRACT.md;
  ademix/frontend/public/data/ingestion.json; PROJECT_CONTEXT.md.
Contract: additive static schema `ademix.twin-relationships.v1`; no new twin, telemetry field, API route,
  simulation behavior or OpenEgiz delivery change. Every node joins to live `/api/state` by exact thing ID.
Contract contents: exactly 11 nodes and 38 directed edges: 10 hierarchy, 13 material, 6 movement and
  9 control. Every `_parents` value and relationship endpoint resolves to a seeded twin. Each truck has
  excavator loading, road travel, crusher delivery and dispatch-policy links; the crusher processes mine ore;
  scenario condition links target the excavator, road and crusher. Control links are not material flow.
Live join: select by full `thing_id`; read `features.<state_feature>.properties.value`; display state unavailable
  rather than inventing a value when absent. The generated ingestion bundle exposes `twinRelationships`.
Tests actually run: 38 data/schema/regeneration checks pass, including exact twin coverage, parent/target
  resolution, operational paths and bundled-fixture equality; all 72 simulator/API tests pass; TypeScript/Vite
  production build passes with the existing non-fatal >500 kB chunk warning. No React/CSS/3D source changed.
Limitations: static relationship metadata is team-authored conceptual topology, not field validation; one road
  twin represents both separated directions; the crusher twin combines dump bay, ROM bin and crusher; the
  scenario controller is software, not physical equipment. Current state remains authoritative only from Ditto.
Next C1 step for Ahmad + Codex: after the accepted B6 handoff is integrated, consume `twinRelationships` for
  the optional Mine model explorer, join node selection to returned live twins by exact `thing_id`, keep
  control links visually distinct, and do not add invented twins or relationships. Professor + Claude have
  no C-phase implementation assignment under the Team's 5821550 ownership decision.
Integration: feature branch fast-forwarded into codex/ademix after the Team's C-phase ownership update.
  Combined checks pass: 38 data/schema checks, 72 simulator/API tests, TypeScript/Vite production build,
  rebuilt healthy Compose stack and official smoke (Eclipse Ditto, 11 twins, 141 fields/units). The served
  bundle reports schema v1, 11 nodes, 38 relationships and zero missing live twin joins. Push codex/ademix;
  do not merge to main. The remaining C1 explorer UI begins only after accepted B6 integration.
```

### Handoff — Codex — A5 combined release verification — 2026-10-23

```text
Owner: Ahmad + Codex
Status: integrated and verified on codex/ademix; A5 work lock released
Branch: codex/a5-release-verification (from origin/codex/ademix 52e5f09)
Implementation commit: 2711e6e
Exact files: ademix/simulator/verify_scenarios.py; README.md; SUBMISSION.md; FINAL_TODO.md;
  RULES_CHECKLIST.md; PROJECT_CONTEXT.md.
Contract: no twin/API behavior change. Verification consumes the frozen A1–A4 contracts.
Frontend ownership: no React/3D source or presentation file will be edited. Human visual approval remains
  a named gate; automated checks will not be represented as human approval.
Live verification: fixed baseline, breakdown, road restriction and crusher slowdown all passed through the
  frontend proxy, API, simulator, MQTT, Eclipse Ditto and API. Smart Dispatch then passed the same four
  conditions with required/cycling/standby counts 4/4/2, 4/4/1, 8/6/0 and 3/3/3. Final fixed/baseline reset
  removed stale breakdown and blockage state.
Checks actually run: clean Compose down -v followed by documented build/start reached healthy state; judge
  smoke passed API health, Eclipse Ditto source, 11 twins and all 141 fields/units; UI, API health/state and
  Grafana URLs returned HTTP 200; 72 simulator/API tests and 35 data tests passed; TypeScript/Vite production
  build passed with the existing non-fatal >500 kB chunk warning. Built Ademix images report linux/amd64.
Docker footprint observed: 5.803 GB images, 353.9 MB volumes and 3.07 GB build cache, below the 60 GB cap.
Hygiene: tracked-file scan found no committed .env, dependency/build output, browser capture or generated
  cache paths; working tree was clean except for the expected branch-ahead state.
Clarification: an additional attempt to discover tests inside the lean production simulator image failed
  because that image intentionally does not copy the repository test directory. This is not counted as a
  product test failure; the repository suite passed and the production image passed the official smoke test.
Remaining gates: native clean Ubuntu 24.04 AMD64 rehearsal and Team human visual acceptance are unverified;
  presentation reconciliation is intentionally deferred. Do not merge to main until those gates are accepted.
Integration: feature branch pushed, then fast-forwarded into codex/ademix after a final fetch confirmed no
  newer Professor/Claude handoff. The combined branch again passed 72 simulator/API tests, 35 data tests and
  the production frontend build. Push only codex/ademix. Main remains untouched.
```

### Handoff — Codex — A4 two-way road and breakdown consistency — 2026-10-23

```text
Owner: Ahmad + Codex
Status: integrated and verified on codex/ademix; A4 work lock released
Branch: codex/a4-road-direction
Implementation commit: ee35325
Exact files: simulator engine/tests/twins/verification and ROAD_BREAKDOWN_CONTRACT.md; MODEL.md and
  SCENARIOS.md; data dictionaries/catalogue/build/tests plus regenerated logs, evidence, manifest and
  frontend ingestion bundle; SUBMISSION.md and PROJECT_CONTEXT.md. No frontend React/3D source changed.
Contract: `ademix.road-breakdown.v1`. road-main adds traffic_model, blockage_lane, blockage_heading,
  blocked_crusher_bound_trucks and blocked_face_bound_trucks. Existing APIs and fields remain compatible.
Behavior: HT-01 blocks only same-direction followers approaching its position. Opposing traffic continues.
  Both hauling/crusher-bound and returning/face-bound failures are covered. Tow occurs after exactly 1200
  simulated seconds; reset removes breakdown, blockage, directional counters and stale events. The separate
  road restriction remains a 10.72 km/h speed restriction on both lanes, not a closure or reroute.
Evidence: common returning-lane first hour is now 770.0 → 691.0 t/h (-10.3%), nine trips/h; steady output
  returns to 770.0 t/h. The prior 581.6 t/h shared-lane reference is explicitly superseded. Generated A2/A3
  fixtures and telemetry were regenerated from the changed model.
Tests actually run: 72 simulator/API tests pass; 35 data tests pass; frontend tsc + Vite build passes
  (existing >500 kB bundle warning only). Direction, progress, speed, counters, tow, reset, FIFO continuity
  and zero mass-balance error are asserted. After fast-forward integration, a clean Docker rebuild/start
  from empty project volumes reached healthy status. The judge smoke command passed 11 twins and all 141
  required fields/units; all 72 tests passed again inside the built image. The live scenario verifier passed
  baseline, Smart Dispatch, breakdown, road restriction, crusher slowdown and reset through MQTT/Ditto/API.
  A separate live travelling failure reported crusher_bound, heading 1, opposing lane open, then reset cleanly.
Frontend request: use blockage_lane and directional counters; do not show the opposing lane as closed and
  do not infer direction from screen position. Safe labels and reset rules are in ROAD_BREAKDOWN_CONTRACT.md.
Limitations: separated lanes share one speed limit; no passing, reroute or lane-change logic is modelled;
  breakdown/tow behavior and timing are synthetic team assumptions, not a site traffic-management plan.
Integration: fast-forwarded into codex/ademix and passed every combined release gate. Push codex/ademix
  only. Do not merge to main.
```

### Handoff — Codex — A3 production and recovery history — 2026-10-23

```text
Status: integrated and verified on codex/ademix; A3 work lock released
Owner: Ahmad + Codex
Branch: codex/a3-recovery-history
Implementation commit: a87dab0
Exact files: ademix/simulator/{history_evidence.py,test_history_evidence.py,HISTORY_CONTRACT.md};
  ademix/data/{build_data_layer.py,test_data_layer.py,evidence/production_recovery.json,
  telemetry/manifest.json}; ademix/frontend/public/data/ingestion.json; PROJECT_CONTEXT.md.
Contract: no live twin/API field change. `productionRecovery` in the generated bundle and source fixture
  use `ademix.production-recovery.v1`. HISTORY_CONTRACT.md freezes types, units, twin-source mappings,
  event kinds, reset behavior, chart semantics and label rules.
Fixture: identical hashed state after 4 h warm-up; 5-minute samples; breakdown at sim 14400 s;
  road cleared/tow at 15600 s (exactly 1200 s); observed rolling throughput recovers to >=95% of
  projected capacity at the first qualifying sample, 19200 s; reset starts period 2 at 25200 s.
  The incident series reaches 516.6 t/h; reset begins at elapsed 0 with baseline/open/0 blocked trucks.
Reproduction: `python ademix/data/build_data_layer.py` regenerates the history, manifest and frontend
  bundle byte-for-byte.
Tests actually run: 70 simulator/API tests pass; 34 data tests pass; frontend tsc + Vite build passes
  (existing >500 kB bundle warning only). After fast-forward integration, a clean Docker rebuild/start
  from empty project volumes reached healthy status. The judge smoke command passed all 11 twins and
  all 136 required fields/units; all 70 tests passed again inside the built image; live baseline, Smart
  Dispatch, breakdown, road restriction, crusher slowdown and reset passed through MQTT, Ditto and API.
  The built UI serves schema_version `ademix.production-recovery.v1` with event times 14400, 14400,
  15600, 19200 and 25200 simulated seconds and reset in period 2.
Frontend handoff: Professor + Claude should use simulated time, plot observed throughput as a solid line,
  projected steady capacity as a distinct dashed line, and use only supplied event markers. Preserve old
  period 1 after reset and begin period 2 at elapsed zero. Do not invent events or smooth away the dip.
Limitations: deterministic five-minute sampling and a one-hour rolling observed KPI; recovery marker uses
  a documented 95% threshold; this is synthetic model history, not field telemetry or validation.
Integration: fast-forwarded into codex/ademix and passed every combined release gate. Push
  codex/ademix only. Do not merge to main.
```

### Handoff — Codex — A2 matched fixed-versus-smart evidence — 2026-10-23

```text
Status: integrated and verified on codex/ademix; A2 work lock released
Owner: Ahmad + Codex
Branch: codex/a2-dispatch-evidence
Implementation commit: 284259c
Exact files: ademix/simulator/{compare_scenarios.py,test_engine.py,SCENARIOS.md,
  DISPATCH_COMPARISON_CONTRACT.md}; ademix/data/{build_data_layer.py,test_data_layer.py,
  evidence/fixed_vs_smart.json,telemetry/manifest.json};
  ademix/frontend/public/data/ingestion.json; PROJECT_CONTEXT.md.
Contract: no live twin/API change. `dispatchComparison` in the generated ingestion bundle and
  `ademix/data/evidence/fixed_vs_smart.json` use schema `ademix.dispatch-comparison.v1`.
  The full schema, units, null-delta rule, window semantics and safe claims are frozen in
  ademix/simulator/DISPATCH_COMPARISON_CONTRACT.md.
Method: seed 42; one common hashed state after 4 h warm-up; policy and condition triggered at the
  same simulated instant; matched 1 h transient and 8 h steady windows; 20 s deterministic step.
Baseline steady fixture: fixed 6.0 cycling / 0 parked vs smart 4.0 cycling / 2.0 parked;
  both 770.0 t/h; operating truck-hours 7.792208 → 5.194805 h/kt (-33.3%);
  estimated fuel 3048.8 → 2255.2 L (-26.0%).
All-condition fixture: steady operating truck-hours change is -33.3% baseline, -20.0% breakdown,
  0.0% road restriction and -50.0% crusher slowdown; matched throughput is unchanged in each pair.
Reproduction: `python ademix/data/build_data_layer.py` regenerates the JSON evidence, manifest and
  frontend ingestion bundle byte-for-byte.
Tests actually run: 65 simulator/API tests pass; 33 data tests pass, including identical hashes,
  matched windows, all four scenarios and exact regeneration; frontend tsc + Vite build passes
  (existing >500 kB bundle warning only). After fast-forward integration, a clean Docker rebuild/start
  reached healthy status; the judge smoke command passed 11 twins and all 136 live fields/units; all
  65 tests passed inside the built image; live baseline, Smart Dispatch, three disruptions and reset passed.
  The built UI served schema v1 with the common start hash and the exact 770/770 t/h, 6→4 cycling,
  0→2 parked, -33.333338% operating-hours and -26.029913% estimated-fuel baseline fixture.
Frontend handoff: Professor + Claude may build the fixed/smart comparison card solely from
  `dispatchComparison`. Display `percent: null` as `—` or `new`; label results as synthetic modeled
  estimates. Do not recompute metrics, change window definitions or claim measured/guaranteed savings.
Limitations: deterministic conceptual model, one seed and one parameter set; fuel uses A1 comparable
  rates; the evidence does not quantify uncertainty and is not a field validation.
Integration: codex/a2-dispatch-evidence was fast-forwarded onto codex/ademix after confirming the latest
  Claude branch was already contained. Push this tested codex/ademix branch only. Do not merge to main.
```

### Handoff — Codex — A1 cumulative fuel and CO2 truth — 2026-10-23

```text
Status: integrated and verified on codex/ademix; A1 work lock released
Branch: codex/a1-fuel-co2
Implementation commit: 953b97f
Files: ademix/simulator/{engine.py,app.py,test_engine.py,test_reliability.py,MODEL.md,FUEL_CO2_CONTRACT.md};
  ademix/data/{build_data_layer.py,registry/parameters.csv,telemetry/telemetry_dictionary.csv,
  telemetry/sensor_catalogue.csv,telemetry/logs/*.csv,telemetry/manifest.json};
  ademix/frontend/public/data/ingestion.json; .gitattributes; PROJECT_CONTEXT.md.
Contract: mine-01 now publishes shift_fuel_l (L), shift_co2_kg (kg CO2),
  current_fuel_rate_lph (L/h), operating_trucks_fuel_count (trucks), shift_start_sim_s (s),
  shift_elapsed_s (s), shift_id and fuel_estimate_basis. Full types, ranges, examples and reset
  semantics are frozen in ademix/simulator/FUEL_CO2_CONTRACT.md.
Reset: scenario/dispatch changes preserve history. POST /api/shift/reset alone increments shift_id,
  records the simulation time and zeroes only the two cumulative estimates.
Evidence: four operating trucks + excavator = 281.9 L/h; six + excavator = 381.1 L/h;
  one hour at each = 663.0 L and 1774.851 kg tank-to-wheel CO2.
Tests actually run: 62 host simulator/API tests pass; 32 data tests pass; verify_scenarios.py passes
  Eclipse-Ditto source, 11 twins, frontend contract and all scenarios; frontend tsc + Vite build passes
  (existing >500 kB bundle warning only). After fast-forward integration, the exact README clean Docker
  startup reached healthy status; the judge smoke command passed all 11 twins and 136 required fields/units;
  62 tests passed again inside the built simulator image; live scenario propagation and reset passed.
  A live POST /api/shift/reset advanced shift_id to 2 and the reset totals then accumulated through
  MQTT → Eclipse Ditto → API with the required comparable-equipment basis label.
Frontend handoff: Professor + Claude should consume the cumulative twin fields directly and label them
  "estimated shift fuel" and "estimated tank-to-wheel CO2". Do not recompute past totals from the current
  fleet and do not derive them from synthetic truck fuel_pct. No Claude-owned source file was edited.
Limitations: comparable-equipment medium-load estimates, not measurements; queued/blocked trucks are
  treated as engine-on; excavator rate is continuous; crusher electricity, upstream diesel, CH4 and N2O
  are excluded.
Integration: codex/a1-fuel-co2 was fast-forwarded onto codex/ademix after confirming the latest Claude
  branch was already included. The generated frontend bundle is forced to LF in .gitattributes so its
  byte-reproducibility test also passes after Windows checkout. Push this tested integration branch only;
  do not merge to main.
```

### Lock — Claude — Scenario C: Smart Dispatch — 2026-10-23

```text
Owner: Claude (for Professor). The simulator is Codex-owned; Professor explicitly approved Claude
  building Smart Dispatch in the simulator on its own branch and informing Codex (2026-10-23).
Branch: claude/smart-dispatch (from origin/codex/ademix 8d8a30e)
Task: add a dispatch policy (fixed | smart) orthogonal to the four operating scenarios. Smart dispatch
  right-sizes the active fleet from the steady-state model, parks surplus empty trucks on a ready line at the
  crusher, and releases them when the need rises (breakdown, road restriction, policy switch). Add twin
  fields, an API endpoint, tests, a policy comparison in compare_scenarios.py and SCENARIOS.md, and a
  What-If panel (Scenario A/B/C + bottleneck) in Layer 1.
Exact files: ademix/simulator/engine.py, ademix/simulator/app.py, ademix/simulator/test_engine.py,
  ademix/simulator/compare_scenarios.py, ademix/simulator/SCENARIOS.md, ademix/frontend/src/IngestionLayer.tsx,
  ademix/frontend/src/ingestion.css
Interfaces changed (additive): truck state `standby`; scenario-controller fields dispatch_policy,
  dispatch_description, trucks_required, trucks_in_cycle, trucks_standby, dispatch_reason; mine-01 fields
  truck_operating_h_per_kt, operating_fleet_utilization; POST /api/dispatch {"policy": "fixed"|"smart"}.
  twins.json, verify_scenarios.py and Compose are not edited.
Expected handoff: commit SHAs, tests, comparison table, Codex request (verify_scenarios.py + docs).
```

Handoff — Claude — Scenario C: Smart Dispatch — 2026-10-23

- Commits on `claude/smart-dispatch`: `f41a51e` (simulator: engine.py, app.py, test_engine.py, compare_scenarios.py, SCENARIOS.md section 7), merge of `claude/road-shoulder` (wider road, breakdown shoulder; see its handoff), `08c9d25` (Layer 1 What-If panel: IngestionLayer.tsx, ingestion.css).
- Rule: required fleet n = ceil(C_server × T_free / (77 t × 3600)) — 4 normal, 4 breakdown, 8 road restriction (all 6 cycle), 3 crusher slowdown. Surplus empty trucks park (`standby`) on a ready line at the face; the excavator, when binding, loads a parked truck rather than idle; parked trucks rejoin when a cycling truck is lost (breakdown, held behind a blockage), on a scenario change, or on `fixed`.
- Model results (`compare_scenarios.py`, steady state hours 2–9): production identical in all four conditions; truck operating h per kt −33 % normal, −20 % breakdown, −50 % crusher slowdown, 0 % road restriction; wait at face 13.6 → 1.6 min. First-hour production after a breakdown equals the fixed fleet at all 12 trigger times. Synthetic model output, no fuel saving claimed.
- Checks: `python -m unittest test_engine` 41 tests pass (7 new `DispatchTests`); `tsc -b` and Vite build pass; demo stand (ADEMIX_DEMO_MODE=1): `/api/dispatch` switches policy, 4 cycling / 2 parked appear in the panel and sensor table, breakdown with smart on releases one parked truck. Not run on the Docker/Ditto stand.
- Interfaces (additive): truck state `standby`; scenario-controller `dispatch_policy`, `dispatch_description`, `trucks_required`, `trucks_in_cycle`, `trucks_standby`, `dispatch_reason`; mine-01 `truck_operating_h_per_kt`, `operating_fleet_utilization`; `POST /api/dispatch {"policy": "fixed"|"smart"}`; `/api/health` reports `dispatch`.
- Request to Codex (simulator/data owner; Professor approved Claude editing the simulator for this task):
  1. Review the engine change; add a smart-dispatch step to `verify_scenarios.py` (POST /api/dispatch, check the new fields through Ditto) and run it on the Docker stand.
  2. If the replay bundle should show Scenario C, add smart-dispatch logs and the new fields to `build_data_layer.py` / `ingestion.json`.
  3. Integrator: mention Scenario C in `SUBMISSION.md` / `README.md` (how to activate: What-if panel → C; reset: A).
- Fixed later on this branch: loop berms no longer cross the paved turning areas (one outer windrow per loop, open at the road; road windrows stop short of the loops). Trucks also keep a truck length apart on the circuit and stop at the back of queues.
- Follow-up (same branch): standby trucks park in a four-bay standby pad on the free pit floor west of the face loop (off every road); the excavator animates the simulator's 4 × 90 s passes (dig at a muck pile, swing, dump into the body, swing back) and the truck load rises per bucket; OrbitControls minDistance 62 → 14 with zoomToCursor (TerrainStage.tsx). Checked in the browser on the demo stand: two trucks parked in bays; dig/swing/dump cycle visible. Visual only, no twin change.

### Lock — Claude — truck-breakdown visualization — 2026-10-23

```text
Owner: Claude (for Professor)
Branch: claude/breakdown-visual (from origin/codex/ademix c10fba1)
Task: present the simulator's truck-breakdown state in the Layer 1 scene: the broken truck visibly stops, carries a breakdown marker, the UI names the affected truck and shows the operational consequence, and recovery removes the warning. No scenario logic in React.
Exact files: ademix/frontend/src/IngestionLayer.tsx, ademix/frontend/src/ingestion.css (this Active Work entry is the only PROJECT_CONTEXT.md change)
Interfaces consumed or changed: consumes truck-0N.state/speed_kmh/route_progress_pct/heading, road-main.state/blocked_trucks/blockage, scenario-controller.breakdown_location/projected_throughput_tph/bottleneck, mine-01.throughput_tph/bottleneck_live; no twin field added or changed.
Expected handoff: commit SHA, files, build result and screenshots; request to Codex to add road-main.blockage and scenario-controller.breakdown_location to the replay bundle.
```

Handoff — 2026-10-23 — status: ready for integration (lock released after integration)

```text
Commit: 618defb on claude/breakdown-visual (lock record c0c38eb; base origin/codex/ademix c10fba1)
Files changed: ademix/frontend/src/IngestionLayer.tsx, ademix/frontend/src/ingestion.css (plus this Active Work entry)
What it does: the truck whose twin state is 'breakdown' gets a flashing beacon, warning triangles and an
  "HT-0N · BREAKDOWN · 0 km/h" tag; a banner names the truck and the consequence (location, lane blocked /
  trucks held / towed / off-road, live vs projected throughput, live constraint) and disappears on recovery.
  Layer 1 also accepts source "local-simulator-demo" with a DEMO badge (not presented as OpenEgiz).
Interface: consumes existing twin fields only; no field added, renamed or reinterpreted; no scenario logic in React.
Checks: tsc + vite production build pass. Against the simulator's demo mode (ADEMIX_DEMO_MODE=1, port 18088):
  breakdown in loading queue -> banner "parked off the haul road; traffic is not blocked";
  breakdown while hauling at 17% -> "haul road at 0.69 km", simulator blockage text, constraint haul-road travel;
  after the 20 min blockage -> "towed onto the shoulder; the road is open again";
  reset to baseline -> banner and tag removed, HT-01 back in the loading queue. Not run on the Docker/Ditto stand.
Requests to Codex (data/simulator owner):
  1. Add road-main.blockage and scenario-controller.breakdown_location to LOG_THINGS in
     ademix/data/build_data_layer.py and regenerate ingestion.json; in replay mode the banner currently derives
     the location from route_progress_pct.
  2. vite.config.ts proxies /api to 127.0.0.1:18088; document in README how to start the demo simulator for
     local review, or the dev server logs ECONNREFUSED every 2 s.
Integrator notes: GraphicsSettings.tsx, GroundMaterial.ts, responsive.css, timing.css and public/textures/dirt/
  exist on codex/ademix but are not imported by the scene; decide whether to wire or remove them.
  This file's "Collaboration ownership — 2026-10-23" paragraph states the opposite ownership of COLLABORATION.md
  (Codex = 3D, Claude = simulator); COLLABORATION.md and the Team's instruction say Claude = 3D, Codex = simulator.
```
### Lock — Claude — illustrative pit-wall geometry — 2026-10-23

```text
Owner: Claude (for Professor)
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
Owner: Claude (for Professor)
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

### Superseded collaboration ownership — 2026-10-23

- This earlier ownership statement is superseded because it inverted the Team's intended lanes. The authoritative split is now: Ahmad + Codex own simulator, scenarios, OpenEgiz/API, data evidence and backend tests; Professor + Claude own 3D presentation and frontend UX. `COLLABORATION.md` and `TEAM_WORK_PLAN.md` define the current protocol. Shared entry points, documentation, presentation and Compose are edited by one designated integrator at a time.
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
| 2026-10-23 | Codex | Completed the original HT-01 breakdown release gate, later superseded by A4's two-way-lane contract | The original shared-lane fixture was valid then; A4 replaces its 581.6 t/h reference and must be used for current claims |
| 2026-10-23 | Codex | Integrated Claude's breakdown presentation and completed the four-scenario release gate from fresh Compose volumes | All services healthy; 69 local tests, 37 container tests, and the frontend production build pass; all four states propagated frontend proxy → API → MQTT → Ditto → API and reset cleanly |
| 2026-10-23 | Codex | Integrated Claude's illustrative pit geometry and revalidated the final combined images | Updated pit-design evidence is bundled; the production image rebuilt successfully, all services are healthy, 37 in-image simulator tests pass, and all four live scenario checks pass through Eclipse Ditto |
| 2026-10-23 | Codex | Completed the P1 simulation-credibility verification matrix without changing the model | 43 simulator-package and 32 data checks pass; both FIFO resources, exclusive service, stage timing, four-part mass balance, interruption transitions, documented assumptions, and every direct scenario switch are explicitly covered |
| 2026-10-23 | Codex | Completed reproducible P1 what-if evidence and recommendations | The generator now reports seven requested KPIs including trips/h; `SUBMISSION.md` contains a concise steady comparison plus transient breakdown warning; an automated check proves frontend-facing metrics match each generated scenario run |
| 2026-10-23 | Codex | Completed the P1 OpenEgiz/API reliability gate | The exact judge smoke command passed against live Ditto: 11 twins and 120 fields/units; delayed dependency recovery, graceful API errors, invalid controls, and LIVE/DEMO/REPLAY distinction are covered by tests |
| 2026-10-23 | Codex | Completed A1 cumulative fuel and tank-to-wheel CO2 accounting | Interval integration preserves history across fleet/scenario changes; explicit shift reset, 8-field frontend contract, 663.0 L fixture, 62 simulator/API tests, 32 data tests, scenario verifier and frontend build pass |
| 2026-10-23 | Codex | Completed A2 matched fixed-versus-smart evidence | Versioned JSON fixture proves identical starts and matched windows for all four conditions; baseline preserves 770 t/h with 4 cycling + 2 parked, -33.3% operating truck-hours and -26.0% estimated fuel |
| 2026-10-23 | Codex | Completed A3 production and recovery history | Versioned five-minute history separates observed rolling throughput from projection and marks breakdown, 20-minute tow, recovery threshold and reset into a new comparison period |
| 2026-10-23 | Codex | Completed A4 two-way-road breakdown consistency | Same-direction followers stop behind HT-01 while opposing traffic continues; directional Ditto fields, hauling/returning tests, tow/reset behavior and regenerated evidence are ready for integration |
| 2026-10-23 | Codex | Completed A5 combined release verification | Full fixed/smart four-condition live matrix, clean reset, 107 automated checks, production build, clean Docker start and judge smoke all pass; Ubuntu and human visual approval remain explicit gates |
| 2026-10-24 | Codex | Completed C1 twin relationship contract | Exactly 11 existing twins and 38 truthful hierarchy/material/movement/control links are validated and bundled for the optional Mine model explorer; no live behavior or frontend source changed |
| 2026-10-24 | Codex | Completed the nonvisual C4 model-truth contract | Verified/not-validated wording, live evidence joins, formulas, provenance categories, assumptions, unavailable behavior and prohibited claims are validated and bundled without frontend changes |

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
- A visually impressive scene that does not receive its operational state through OpenEgiz would fail the core platform requirement.
- Third-party repositories and 3D assets create licensing, attribution, compatibility, and performance risks that must be checked before use.
- The frontend JavaScript bundle is about 1.12 MB before gzip (317 kB gzip); it builds successfully but should be split or reduced after the staged scene is integrated into the live view.
- The selected CC0 mining asset service was temporarily unavailable on 2026-10-22; no unverified or incomplete asset was committed.
- Presentation work is intentionally deferred until the application and submission evidence are final; do not present any concept graphic as runtime evidence.
- Local MQTT port 1883 was unavailable during Windows validation, so the host-only development override `MQTT_PORT=1884` was used. Container-to-container traffic and judge defaults remain unchanged.
- The staged scene is operational and trucks use separated lanes and queues, but the loading interaction still needs checklist items 2–100 and final human visual approval.
- AI-based judging makes explicit documentation, reproducibility, and visible evidence especially important.
- Concurrent work in one repository can cause conflicts unless task ownership and branches are kept current.
- The expanded world facilities are currently visual context rather than independent simulated twins; do not claim them as operational modules until their states are modeled.

## Next Recommended Action

Obtain the Team's final visual approval of the combined pit and breakdown interface at `?stage=world`; keep further visual changes on the professor/Claude branch and preserve the validated simulator contract.

### Breakdown verification handoff — 2026-10-23

- `ademix/simulator/verify_breakdown.py` is the repeatable release check. It rejects demo data, exercises the public scenario endpoint, observes all 11 twins through Eclipse Ditto, and always restores baseline.
- Superseded A4 note: the earlier 581.6 t/h shared-lane fixture is historical. The current two-way returning-lane fixture is 770.0 t/h baseline versus 691.0 t/h after HT-01 fails (−10.3%); the analytical steady-state projection remains 770 t/h because five healthy trucks can still saturate the single excavator.
- Added edge tests cover breakdown while dumping, removal from the excavator FIFO without reordering, preserved ore/mass balance, and reset invalidation of stale service/recovery events.
- Windows validation used host MQTT port 1884 because the machine's Mosquitto service owns 1883. No committed Compose default changed.

### Final scenario integration handoff — 2026-10-23

- Integrated `origin/claude/breakdown-visual` without overwriting the simulator verification work. The frontend now presents the stopped truck, marker, location, road consequence, throughput, and active constraint from twin fields.
- `ademix/simulator/verify_scenarios.py` exercises baseline, breakdown, road restriction, crusher slowdown, and reset through `http://127.0.0.1:4173/api`, rejecting demo mode and checking the exact fields consumed by `IngestionLayer.tsx`.
- Clean Windows deployment removed the OpenEgiz Compose volumes, regenerated ignored credentials, rebuilt all images, and reached healthy state. The literal README Compose command was used; only the ignored host MQTT mapping was changed to 1884 because an administrator-owned Windows Mosquitto service occupies 1883. A clean Ubuntu judge-VM run remains unclaimed.
- After merging `origin/claude/pit-geometry`, the final combined UI and simulator images were rebuilt. All services reached healthy state, all 37 in-image simulator tests passed, and `verify_scenarios.py` passed baseline, truck breakdown, road restriction, crusher slowdown, and clean reset through Eclipse Ditto.

### P1 simulation credibility handoff — 2026-10-23

- `ademix/simulator/test_engine.py` explicitly checks head-of-line FIFO service at both the excavator and crusher under all four scenarios while enforcing one-truck occupancy at each resource.
- Cycle verification checks 6 min loading, 7.68 min loaded haul, non-negative crusher waiting, 1 min dumping, and 7.68 min empty return against the documented 77 t / 25 km/h / 3.2 km assumptions.
- Every step reconciles opening stock plus extracted ore with payload in trucks, ROM inventory, and processed production. Additional cases cover breakdown while loading, dumping, or waiting in either queue and all 12 ordered direct switches between distinct scenarios.
- Local and rebuilt-container result: all 43 simulator-package checks pass; all 32 data-layer checks pass locally. The live verifier also passed baseline, breakdown, road restriction, crusher slowdown, and reset through Eclipse Ditto. No simulator behavior or frontend-owned file was changed.

### P1 what-if evidence handoff — 2026-10-23

- Run `python ademix/simulator/compare_scenarios.py` to regenerate transient and steady results for throughput, cycle time, loading wait, crusher wait, fleet utilization, crusher utilization, and trips per hour.
- `ademix/simulator/SCENARIOS.md` explains each causal change and records a dispatcher recommendation for baseline, truck breakdown, road restriction, and crusher slowdown.
- `SUBMISSION.md` contains the concise steady-state comparison and explicitly calls out the location-dependent first-hour breakdown loss so the recovered long-run result is not misleading.
- `test_frontend_metrics_match_the_generated_steady_evidence` reconstructs the evidence window and checks the frontend-facing Ditto twin metrics for every scenario.
- Verification result: 44 simulator-package checks pass locally and in the rebuilt Docker image, 32 data-layer checks pass, and the frontend production build succeeds (the existing bundle-size warning remains non-fatal).

### P1 OpenEgiz/API reliability handoff — 2026-10-23

- `smoke_check.py` is the read-only judge check documented in `README.md`. Running it inside the simulator image against `http://ademix-ui` passed API health, `source=eclipse-ditto`, all 11 required twin IDs, and all 120 fields/units.
- `test_reliability.py` verifies MQTT retry/recovery, Ditto setup retry/recovery, a 503 rather than a crash when Ditto is unavailable, rejection of an invalid scenario without any engine mutation, and explicit frontend LIVE/DEMO/REPLAY labels with offline fallback.
- `setup_twins.py` now isolates its bounded retry helper so slow-start recovery is directly testable while final failures still make setup exit non-zero.
- The simulator package now has 49 passing checks; the 32 data-layer checks remain passing. No professor-owned frontend source or Smart Dispatch implementation was edited.

### P1 Docker/judge-environment handoff — 2026-10-23

- A destructive-to-containers-only clean rehearsal removed this project's containers and volumes, then ran the literal README Compose build/start command. All services became healthy or exited successfully in 85.93 seconds.
- All 16 unique resolved Compose images report `linux/amd64`. Their deliberately conservative summed size is 7.632 GiB; Docker reported 5.802 GB of images, 352.8 MB of volumes, and 2.95 GB of disposable build cache, comfortably below the 60 GB judge limit.
- The documented UI, API health, API state, and Grafana health URLs all returned HTTP 200. The read-only smoke check passed real Eclipse Ditto state, all 11 required twins, and all 120 required fields/units.
- Runtime frontend assets are Git-tracked and total 2.94 MiB. A targeted source/public scan found no HTTP/CDN references for models, textures, fonts, scripts, or runtime data.
- `evidence/docker-clean-start-2026-10-23.md` records the commands and results. This was a Windows 10 Docker Desktop Linux-container rehearsal with host MQTT mapped to 1884; a native clean Ubuntu 24.04 AMD64 run remains an explicit release gate.

### P2 documentation and release-candidate integration handoff — 2026-10-23

- Fetched and integrated `origin/claude/smart-dispatch` twice: first the Smart Dispatch simulator/frontend handoff, then the professor's follow-up standby-bay, loading-pass animation, queue spacing, truck-length separation, and turning-loop berm-clearance commits. The follow-up changed only professor-owned frontend files plus this shared handoff.
- Updated the authoritative telemetry dictionary and sensor catalogue for all eight Smart Dispatch fields, widened the documented visual ramp to 13.6 scene units, regenerated all four deterministic replay logs and `frontend/public/data/ingestion.json`, and extended `verify_scenarios.py` to exercise Smart Dispatch through Ditto and restore fixed/baseline state.
- Preserved the Team-written Concept section verbatim. README and SUBMISSION now explain Scenario A/B/C activation and reset, list Smart Dispatch as a working module, distinguish its synthetic modeled savings from fuel or site claims, and report the current 88-check total and 128-field live contract. DATA_LICENSES now records exact SHA-256 values for the bundled Poly Haven textures.
- The professor's authoritative Layer 1 scene is now the default `http://localhost:4173` entry point; explicit legacy review-stage query strings remain available. This prevents judges from landing on the obsolete minimal command-center scene.
- Final integrated checks after the professor update: 56 simulator-package tests pass, 32 data-layer tests pass, TypeScript/Vite production build passes, all Docker images rebuild and services become healthy, the read-only live smoke test passes 11 twins and 128 fields/units, and the mutating verifier passes baseline, Smart Dispatch (4 cycling/2 standby), breakdown, restriction, slowdown, and fixed/baseline reset through Eclipse Ditto.
- Browser-control access to localhost was disabled in the current Work settings, and headless screenshot attempts were not reliable, so final human visual acceptance of the rebuilt default route remains required before merging to `main`. Native Ubuntu 24.04 clean-start and presentation reconciliation also remain release gates.

### Advisory review handoff — 2026-10-23

- Owner: Codex on `codex/ademix`; scope: read-only product/rules review requested by the Team, plus this context entry. No frontend, simulation, Concept, or release branch was changed.
- Read the shared context/checklist, submission, README, collaboration protocol, model description, relevant frontend code, and saved `evidence/release-candidate-ingestion.png`. Reviewed the contest home, rules, Mine Map, data, judge environment, FAQ, and the two visible official Discussions. The university announcement repeatedly failed to load; private repository pull-request listings could not be verified in this environment.
- `git fetch origin` succeeded. No `origin/main` commits are missing from HEAD; fetched `origin/main` remains the initial template (`5db0a87`), with the developed branch 71 commits ahead. Final integration into `main` remains essential. HEAD matches `origin/codex/ademix`; no missing commits from `origin/claude/data-asset-layer` were found.
- Read-only live API checks through port 4173 returned healthy baseline/fixed dispatch, `source=eclipse-ditto`, and 11 twins. Automated tests, browser interaction, software-render frame rate, PDF layout, and Ubuntu startup were not rerun in this advisory review.
- Recommendations for Team consideration, not approved implementation: make existing Smart Dispatch results directly comparable on screen; provide a short guided demonstration; open with fewer overlays and clearer operator language; reconcile model/visual road assumptions and all documentation; then complete presentation reconciliation, Ubuntu/software-WebGL evidence, human visual acceptance, and final `main` integration. Optional larger extensions are a second route or loading face, only after release gates are secure.
- Preserve current ownership: Professor + Claude handle frontend proposals; Codex handles simulator/data changes; one integrator handles shared release files. No feature work was assigned or started by this review.

### Consolidated checklist handoff — 2026-10-23

- Team requested one clear to-do list combining both advisory reviews, with a test for every task. Added `FINAL_TODO.md`: 22 ordered verification, correction, presentation and optional-extension items, with ownership, acceptance tests and an execution sequence.
- The checklist distinguishes existing tested features from proposed improvements. It records the specific current-rate-times-elapsed-shift CO₂ issue, existing standby exclusion in estimated diesel, no-queue versus queued cycle time, advisory safety limits, road-model consistency, final Ubuntu/performance evidence, PDF reconciliation and official `main` submission.
- No implementation, test execution, scenario mutation, visual redesign or release merge was performed for this checklist request. Optional features remain proposals; contributor ownership and final visual acceptance remain unchanged.

### Two-person work-plan handoff — 2026-10-23

- Added `TEAM_WORK_PLAN.md` to assign the remaining improvements without isolating the contributors: Ahmad + Codex own operational truth and verification; Professor + Claude own operator presentation and visual acceptance; both consume the complete shared context and a frozen twin/API contract.
- Defined five coordinated batches: cumulative fuel/CO2, fixed-versus-smart comparison, event timeline, road-direction consistency, and final guided demo/opening view. Each batch lists separate owned work and a combined integration test.
- `COLLABORATION.md` now names Ahmad + Codex as the current release integrator, requires contract-first cross-layer work, and points to the work plan. The earlier inverted ownership paragraph is explicitly marked superseded rather than silently deleted.
- No simulator or frontend implementation was changed. Existing uncommitted advisory documents and the user's screenshot evidence were preserved.

### Numbered two-person startup notes — 2026-10-23

- Added `01_AHMAD_CODEX_WORK.md` with tasks A1–A5 and `02_PROFESSOR_CLAUDE_WORK.md` with tasks B1–B6. Every task includes owned scope, dependency/handoff and acceptance tests.
- Claude's note begins with a copyable prompt that requires the shared context/rules/collaboration files, protects backend ownership, starts B1 independently, and waits for Codex's frozen A1 contract before B2.
- Cross-stream mapping: A1 → B2 fuel/ESG, A2 → B3 fixed/smart comparison, A3 → B4 timeline, and A4 → the road behavior portion of B5. B1 can run in parallel with A1.
- No application code or behavior was changed. Markdown consistency checks remain the only verification needed for this planning change.

### Reusable AI collaboration cycle — 2026-10-23

- Added `START_HERE.md`, a plain-language page for both humans and AIs: sync, confirm prior handoffs are integrated, branch from `origin/codex/ademix`, stay within file ownership, test, push the feature branch, integrate both streams, push the tested combined branch, then repeat.
- Added `PROFESSOR_CLAUDE_PROMPT.md`, a short reusable prompt that Professor can give Claude for every new request. It requires checking both workstreams and prevents dependent work from being stacked before completed work is integrated.
- Updated `AGENTS.md` so all AI agents read the collaboration files and follow the repeating cycle. Updated `CLAUDE.md` so Claude loads the same guidance and its numbered work note automatically.
- The shared integration branch is currently `origin/codex/ademix`; Ahmad + Codex remain the designated integrator. Feature branches are pushed for handoff, while official `main` remains reserved for the final accepted release.
- No application behavior was changed. These planning files are intended for GitHub so future AI sessions receive the workflow directly from the repository.

### AI judge readiness tasks — 2026-10-24

- Added `04_AI_JUDGE_READINESS.md` as a shared final verification layer, based on the official evaluation path: literal README build, build report, source, SUBMISSION, presentation and runtime inspection.
- Defined eight numbered tasks with owners and pass tests: frozen Ubuntu candidate, claim-to-evidence index, three-minute decision route, candidate-accurate presentation, software-rendering evidence, adversarial truth/integrity audit, independent rubric rehearsal and verified submission on official `main`.
- Kept workstream boundaries explicit: Ahmad + Codex own release/evidence/integrity work; Professor + Claude own the opening experience, presentation and visual-performance acceptance; both reconcile a strict rubric rehearsal.
- These tasks add no new runtime claim and do not mark any release gate complete. The latest local/Windows verification remains 107 automated checks, 11 Ditto twins and 141 required fields/units; native Ubuntu, final frontend acceptance, presentation reconciliation and official `main` are still open.
- `git fetch origin` succeeded at the start of this session. No missing `origin/main` commit was reported, and no organizer update was found in the fetched commit range.
- Team sequencing clarification: J1–J8 examine the finished combined application. They run last, after all required A, B and C tasks are completed and integrated; they do not replace or interrupt the remaining implementation work.

### High-score improvement plan — 2026-10-24

- Owner/branch: Ahmad + Codex planning on `codex/high-score-improvements`; no application source is changed by this planning task.
- Added `03_HIGH_SCORE_IMPROVEMENTS.md` between the A/B implementation streams and the final J examination. Required C1–C5 target visible twin relationships, one dispatcher decision board, spatial scenario cause/effect, model trust/limitations and combined acceptance. Optional C6 adds reproducible sensitivity evidence only if release safety and time permit.
- The plan is based on the current verified strengths: 11 Ditto twins, deterministic constrained material flow, matched fixed/Smart evidence, production/recovery evidence, and three live disruptions. It avoids a second face, alternate route, new service or unrelated dashboard because those would add more release risk than score evidence at this stage.
- Team ownership decision: Professor + Claude implement B1–B6 only. Ahmad + Codex own C1–C6 completely, including limited frontend/3D edits after B6 is accepted and integrated. Codex may prepare nonvisual C contracts in parallel with B work; neither AI edits the same frontend paths concurrently.
- J1–J8 were renumbered into `04_AI_JUDGE_READINESS.md` and remain the final phase after required C work is complete. No score, runtime result or completed task is claimed by this plan.

## Handoff Template

### Verified C3 spatial cause/effect integration — 2026-10-25

- Integrated completed Professor + Claude branch `origin/claude/c3-show-effect` (implementation `def7381`, handoff `648301f`) into `codex/ademix`. Its merge base is the verified C2 commit `39f3da6`; changes are limited to Professor-owned frontend files, C3 evidence, and this shared context. No simulator, API, twin, or data contract was changed.
- Combined checks passed: frontend TypeScript/Vite production build; 92 simulator/API tests; 48 data-layer tests; Docker UI rebuild; judge smoke against `source=eclipse-ditto`, all 11 twins, and all 143 required fields/units.
- The complete live scenario verifier passed baseline, truck breakdown, road restriction at 10.72 km/h, crusher slowdown at 495 t/h, all four Smart Dispatch allocations, and final fixed/baseline reset with no stale breakdown, blocked, or standby state. This validates the returned fields that drive C3's `Show effect` causal chains.
- Professor + Claude's saved rendered evidence covers breakdown before/after tow, road restriction, and crusher congestion. Final Team human visual acceptance and the later combined C5 journey remain required; the existing non-fatal Vite large-chunk warning also remains.
- Official `main` is unchanged. After this integration record is pushed, C4 may start only from the new `origin/codex/ademix` head.

### Verified C2 Decision workspace integration — 2026-10-24

- Integrated completed Professor + Claude branch `origin/claude/c2-decision-workspace` into `codex/ademix`. The branch was based on the latest verified shared state `18d6974` and its implementation changes are limited to Professor-owned frontend files, C2 evidence, and its shared handoff.
- Completed the requested Codex contract wiring without changing Professor-owned source: `ademix/data/evidence/decision_explanation.json` is now included as `decisionExplanation` in the generated frontend bundle, and its SHA-256 is recorded in bundle provenance. This exposes the existing A8/A9 baseline, road-restriction, crusher-slowdown, and one-at-a-time sensitivity explanations instead of C2's truthful unavailable state.
- Verification passed: frontend TypeScript/Vite production build; 92 simulator/API tests; 48 data-layer tests; Docker UI image rebuild; judge smoke against the live stack with `source=eclipse-ditto`, all 11 required twins, and all 143 required fields/units. The served bundle reports schema `ademix.decision-explanation.v1` and all four expected question groups.
- Windows browser accessibility confirmed the live OpenEgiz source and advancing simulated time before the final page reload. Automated screenshot capture/reload then stopped because Computer Use could not determine Chrome's URL with enough confidence; no visual state was guessed. Professor's saved C2 evidence remains in `evidence/claude-c2/`, and final human visual acceptance remains required.
- Integration sequence: merge commit `6a1c012`; the following verification commit contains the bundle/provenance test and this handoff. Official `main` remains unchanged. C3 may branch only after this verified combined state is pushed to `origin/codex/ademix`.

### OpenMines source and unit verification handoff — 2026-10-24

- Owner/branch: Ahmad + Codex on `codex/source-unit-verification`; scope is source provenance and unit evidence only. No Professor + Claude frontend source, simulator behavior or Team Concept wording was changed.
- Audited the bundled `north_pit_mine.json` against upstream OpenMines commit `acd77e23de2c3b743485ec87cabdbbf7779ceb3e`. Its normalized-LF SHA-256 exactly matches the upstream file: `a966a72a6bfa91a86bcd6c3cdcccd9df5d4e83cdb36217a4ac4505ee77c0f16c`.
- Added a machine-readable eight-item unit evidence register and a human audit. Capacity and speed are explicit upstream units; distance, shovel/dumper time and road-event rate are confirmed from executable equations and the minute simulation clock. The audit keeps the 3.2 km Ademix route, six-truck fleet, crusher capacity and scenario magnitudes classified as assumptions rather than measurements.
- Verification: all 42 data-layer tests pass, including exact audit-item, unit, confidence and evidence-path checks. The existing 80 simulator/API tests also pass. No generated frontend data artifact was changed while B2 frontend work was active.
- Integration note: a completed `origin/claude/b2-fuel-esg` handoff appeared after this audit began. Integrate and test B2 after this independent audit is committed, before starting A8 fleet-sizing work.

### Verified B2 integration — 2026-10-24

- Integrated completed Professor + Claude branch `origin/claude/b2-fuel-esg` after the independent source/unit audit. Its implementation changes are limited to Professor-owned `IngestionLayer.tsx`, `ingestion.css`, B2 evidence and this shared handoff; no Codex simulator or data-contract code was overwritten.
- Combined verification passed: 80 simulator/API tests, 42 data-layer tests and the frontend TypeScript/Vite production build. The rebuilt Docker stack reached healthy state; the judge smoke check passed real `eclipse-ditto` state, all 11 twins and all 143 required fields/units.
- The full live fixed/smart scenario matrix passed baseline, breakdown, road restriction and crusher slowdown plus clean reset. B2 is therefore integrated before A8 fleet-sizing work begins.

### A8 fleet-sizing evidence handoff — 2026-10-24

- Owner/branch: Ahmad + Codex on `codex/a8-fleet-sizing`; backend-generated evidence only. No Professor + Claude frontend file, runtime engine behavior, live twin topology or Team Concept wording changed.
- Added one deterministic generator and a versioned JSON fixture for 2–6 fixed-dispatch trucks under baseline, breakdown, road restriction and crusher slowdown. Every one of the 20 cases uses a fresh seed-42 engine, the same four-hour warm-up, one excluded transition hour and eight-hour measurement window.
- The result discovers rather than assumes the first <=1% throughput plateau: four active trucks in baseline, five total during the one-truck breakdown, three under crusher slowdown, and no plateau through six trucks under the road restriction. Baseline throughput stays 770 t/h from four trucks onward while operating truck-hours rise from 5.19 to 6.49 and 7.79 h/1,000 t for four, five and six trucks.
- Reproduce with `python ademix/simulator/fleet_sizing.py --write`. The fixture records production, throughput, bottleneck, cycle time, both queues and waits, fleet/excavator/crusher utilization, operating truck-hours, trips and mass-balance error with explicit units and a synthetic/not-measured warning.
- Verification: all 86 simulator/API/evidence tests and all 42 data-layer tests pass; fixture regeneration is byte-for-byte, production reconciles to the common window, truck-hours reconcile per 1,000 t, every mass-balance error is zero, and the default live engine still exposes six truck twins.

### A9 one-at-a-time sensitivity evidence handoff — 2026-10-24

- Owner/branch: Ahmad + Codex on `codex/a9-sensitivity`; optional backend evidence only. No frontend file, live runtime configuration, simulator default, twin topology or control behavior changed.
- Reused A8's full fresh-engine 2–6 truck curve while varying exactly one input at a time: one-way route length (2.0/3.2/5.0 km), loading duration (6/9/12 min per truck), or crusher capacity (500/700/900 t/h). Every alternative is explicitly a planning case, not a sourced site measurement.
- Model boundaries are visible: route length changes the recommendation from 3 to 4 to at least 6 trucks; slower loading changes it from 4 to 3; crusher capacity changes it from 3 at 500 t/h to 4 at 700–900 t/h. The 5 km route has no observed plateau through six trucks and is labelled accordingly rather than presented as an optimum.
- Reproduce with `python ademix/simulator/sensitivity.py --write`. The generator temporarily changes one engine constant in a guarded context and restores it even on failure; the fixture records input units/categories, all 45 underlying runs, queues, bottlenecks, throughput, truck-hours and mass balance.
- Verification: all 92 simulator/API/evidence tests and all 42 data-layer tests pass. Tests prove byte-for-byte regeneration, one changed input per case, a changed recommendation in every study, reconciled production/throughput, zero mass-balance error and restored live defaults.

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

