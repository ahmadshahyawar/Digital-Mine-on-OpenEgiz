# 02 — Professor + Claude workstream

Owner: Professor + Claude

Role: operator experience, 3D presentation and visual acceptance

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

## Claude handoff format

```text
Owner: Professor + Claude
Task: B<number> — <name>
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

Start now with **B1 only**. B2 begins after the Codex A1 contract is available.
