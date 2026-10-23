# 02 — Professor + Claude workstream

Owner: Professor + Claude

Role: operator experience, 3D presentation, score-focused C views and visual acceptance

Current branch family: `claude/<feature>`
Do not edit Ahmad + Codex's simulator, data model or backend tests unless a task-specific ownership transfer is recorded first.

## Reusable prompt

Use `PROFESSOR_CLAUDE_PROMPT.md` at the start of every Claude request. It tells Claude to repeat the GitHub sync, integration check, implementation, testing, push and handoff cycle.

Before every task:

1. Fetch and read the shared files listed in the prompt.
2. Read the latest Codex contract/handoff for any cross-layer task.
3. Record an Active Work lock before editing.
4. Edit only owned frontend/visual files.
5. Commit a coherent checkpoint and provide screenshots plus truthful verification.

## B1 — Simplify the opening operator view

Goal: make the mine and its decision controls understandable immediately. This can run in parallel with Codex A1 because it does not need new backend fields.

Owned work:

- keep the accepted mine scene and existing features;
- show four essential KPIs: current production, current bottleneck, cycling/standby trucks and the most relevant queue/wait indicator;
- keep scenario controls compact and visible;
- make ingestion, specifications, sensors, topology, data flow, ESG, weather and safety optional layers rather than visual clutter at startup;
- use operator-facing language while keeping the technical views accessible.

Tests:

1. Production build passes.
2. At desktop and narrow viewport, the mine remains visible and controls stay on-screen.
3. Labels/panels do not cover the loading face and crusher in the selected opening camera.
4. Every existing technical layer opens and closes.
5. Truck selection, camera movement, presets and Overview recovery still work.
6. Capture the opening view and at least one narrow-window view.

Handoff to Codex: commit SHA, exact frontend files, build result, screenshots and any visual item not tested.

## B2 — Correct fuel and ESG presentation

Start only after Codex A1 provides a frozen contract and fixture.

Goal: show correct accumulated totals and clear estimate labels.

Owned work:

- consume authoritative live/fixture totals;
- label diesel estimates, diesel fuel energy and excluded crusher electricity clearly;
- distinguish current rate from shift total and synthetic tank percentage;
- avoid recalculating authoritative history from only the current state.

Tests:

1. The supplied two-hour fixture displays 663.0 L total.
2. Current L/h and accumulated litres are visibly different concepts.
3. Zero throughput shows unavailable per-tonne values.
4. Fixed/smart and reset transitions display the supplied totals correctly.
5. UI values match fixture/live twin fields exactly within display rounding.

## B3 — Fixed-versus-smart comparison

Start only after Codex A2 provides matched evidence.

Goal: make the Smart Dispatch decision obvious.

Owned work:

- compare throughput, cycling/standby trucks, queue/wait and operating truck-hours per 1,000 t;
- state the measurement period;
- explain in plain language why fewer trucks can maintain the loader-limited output;
- avoid claiming measured fuel savings or extra output unless the supplied evidence supports it.

Tests:

1. Every displayed value equals the supplied matched comparison fixture.
2. Baseline clearly shows six fixed versus four cycling/two standby under smart operation.
3. The comparison does not mix live snapshots with a different historical window.
4. Breakdown, restriction and slowdown comparisons remain labeled and understandable.
5. Reset returns to the documented normal/fixed presentation.

## B4 — Production and recovery timeline

Start only after Codex A3 provides the history contract.

Goal: show the effect of a disruption and the recovery over time.

Owned work:

- plot actual supplied history using simulated time;
- mark scenario activation, breakdown, tow/road clear, recovery and reset;
- distinguish observed output from projected steady capacity.

Tests:

1. Timeline points and event markers match the supplied fixture.
2. The known breakdown dip and recovery are visible.
3. Scenario switches do not silently combine incompatible windows.
4. Replay speed or pausing does not alter the historical values.
5. The chart remains legible without covering the mine.

## B5 — Operational animation and road acceptance

Start road explanation changes only after Codex A4 freezes the behavior contract.

Goal: make loading, dumping, standby and breakdown consequences visually credible.

Owned work:

- verify bucket-to-bed loading and progressive payload;
- verify dumping into the intended facility;
- verify queue spacing, standby parking and breakdown presentation;
- present the documented lane/direction consequence without inventing frontend traffic logic.

Tests:

1. Watch one complete empty → loading → loaded haul → dump → empty return cycle.
2. Payload and animation agree with authoritative twin state.
3. No obvious overlap, floating travel or unexplained teleport occurs on reviewed paths.
4. Breakdown presentation matches both directions supplied by Codex.
5. Reset removes warnings and returns equipment to valid motion.

## B6 — Guided three-minute demonstration

Goal: help a new viewer understand the decision without reading source code.

Owned work:

- guide baseline → disruption → consequence → Smart Dispatch → recovery/reset;
- use real controls and wait for returned twin state;
- keep the guide cancelable and preserve manual operation.

Tests:

1. A new viewer can complete the path and explain the recommendation.
2. Every step waits for the real backend acknowledgement.
3. Cancel leaves the application usable.
4. Reset returns simulator and presentation to the documented baseline.
5. The guide contains no independent animation that pretends a scenario succeeded.

## C-phase ownership after B6

After B6 is accepted, integrated and pushed to `origin/codex/ademix`, Professor + Claude continue with the **user-facing implementation and visual acceptance of C1–C5**. Ahmad + Codex keep ownership of simulator behavior, OpenEgiz/API contracts, generated evidence, backend/data tests and release integration. Never edit the same frontend paths concurrently.

The C1 relationship contract and C4 model-truth contract are already prepared by Ahmad + Codex. Consume them as authoritative inputs. Request a contract change through a handoff instead of silently changing field meaning, units, relationships, formulas or limitations.

## C1 — Visible mine model and relationships

Goal: make the connected 11-twin mine model easy for a judge to inspect.

Owned work:

- build an optional **Mine model** view from the existing relationship contract;
- show the mine parent, five operational twin types, six truck instances and truthful material/control links;
- show current returned state on nodes;
- selecting a node must focus or open the same live twin in the 3D application;
- keep the mine visible and provide an immediate return to Overview.

Tests:

1. Exactly 11 returned twins appear once and no asset is invented.
2. Every displayed relationship matches the supplied contract and resolves to a real twin.
3. Loading face → truck → haul road → crusher is readable; control links look different.
4. Every selectable node opens the correct live twin.
5. Production build, responsive layout and visual acceptance pass.

## C2 — One dispatcher Decision workspace

Goal: answer on one screen: what limits production, what should the dispatcher do, and what evidence supports it?

Owned work:

- combine the accepted B3 comparison and B4 recovery timeline into one optional **Decision** workspace;
- show current condition, bottleneck, Fixed-versus-Smart evidence, cycling/standby trucks, truck-hours per 1,000 t, queue waits and the recommended action;
- separate current live values, saved model evidence, observed recovery and projected capacity;
- provide a direct return to the 3D mine and preserve manual controls.

Tests:

1. Saved values equal `fixed_vs_smart.json` and `production_recovery.json` within display rounding.
2. Live and saved/model evidence cannot be mistaken for each other.
3. Baseline explains why four cycling trucks preserve the modeled loader-limited output.
4. Road restriction and crusher slowdown show different evidence-based recommendations.
5. A new viewer can state the recommended action and reason in under one minute.

## C3 — Spatial scenario cause and effect

Goal: make every disruption understandable in the 3D mine, not only in metrics.

Owned work:

- add a small **Show effect** action for an active scenario;
- focus the failed truck/followers, restricted road/traffic or crusher/ROM/dump queue as appropriate;
- use returned state for warnings, colors, counts and labels;
- show a short truthful causal chain beside the view;
- preserve camera control and immediate Overview recovery.

Tests:

1. Each disruption focuses the correct physical area and live assets.
2. Breakdown distinguishes the affected direction from continuing opposing traffic.
3. Crusher slowdown shows congestion; road restriction never claims an alternate route.
4. Causal text matches the supplied model/scenario contracts.
5. Selection, camera, reset, responsive layout and software-rendering usability remain intact.

## C4 — Visible model trust and limitations

Goal: show why the recommendation is credible and where the model stops being evidence.

Owned work:

- add an optional **Why trust this?** section inside the Decision workspace;
- consume the existing model-truth contract;
- show current mass balance, principal formula/constraint, sourced parameters, team assumptions and the meaning of synthetic telemetry;
- state that the model is verified but not validated against an operating mine;
- link to the existing specifications/provenance view.

Tests:

1. Units, formulas, categories and limitations equal the supplied contract.
2. Missing mass-balance state never displays a false success.
3. Crusher/ROM capacities and scenario magnitudes are labeled as team assumptions.
4. No measured saving, guaranteed forecast or safety certification is implied.
5. The section stays optional, readable and does not hide the mine.

## C5 — Integrate the complete high-score experience

Goal: make B1–B6 and C1–C4 feel like one clear judge journey.

Owned work:

- integrate accepted C branches one at a time from the latest shared state;
- preserve the simple default mine view;
- verify the route mine → affected assets → decision evidence → model explanation → Overview;
- correct panel collisions, keyboard focus, contrast, labels and narrow-view behavior;
- provide final desktop/narrow screenshots and human visual acceptance evidence.

Tests:

1. All B1–B6 acceptance behavior still works.
2. Mine model, Decision, Show effect and Why trust this? remain optional views.
3. Frontend production build and visual checks pass.
4. Ahmad + Codex run backend/data suites, live smoke and the full scenario matrix on the combined commit.
5. Ahmad accepts the opening view and complete judge route before candidate freeze.

## Claude handoff format

```text
Owner: Professor + Claude
Task: B<number> or C<number> — <name>
Branch:
Commit SHA:
Exact changed paths:
Contract consumed or "no contract change":
Commands/checks actually run:
Observed results:
Screenshot paths:
Known limitations/unverified items:
Request to Ahmad + Codex:
Integration instruction: merge | cherry-pick | reject
```

Start with the next incomplete B task from the latest `origin/codex/ademix`. Continue B1–B6 one accepted and integrated task at a time. After B6 is accepted and integrated, continue C1–C5 in order using the authoritative Codex contracts. C6/A9 remains optional and is not part of Professor's assignment unless the Team explicitly adds it later. Ahmad + Codex integrate and run the combined backend/live release checks. J1–J8 remain last.
