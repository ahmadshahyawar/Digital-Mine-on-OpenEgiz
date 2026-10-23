# Ademix two-person improvement plan

This is the working split for Ahmad + Codex and Professor + Claude. The two workstreams are separate in code ownership, but they are not isolated: both read the same project context, use the same twin/API contract, and exchange a tested handoff for every feature.

`PROJECT_CONTEXT.md` and `RULES_CHECKLIST.md` remain the shared source of truth. `COLLABORATION.md` defines the branch and integration rules. This file assigns the remaining product improvements.

Start with `START_HERE.md`. The executable numbered notes are `01_AHMAD_CODEX_WORK.md` and `02_PROFESSOR_CLAUDE_WORK.md`; the reusable Claude prompt is `PROFESSOR_CLAUDE_PROMPT.md`.

## The simple rule

- **Ahmad + Codex own what the mine does and what the numbers mean.**
- **Professor + Claude own what the operator sees and how the mine is understood.**
- **The interface between them is agreed before either side implements a cross-layer feature.**
- **One integrator, currently Ahmad + Codex, combines completed handoffs and edits release files.**

Neither AI starts without reading the shared context. Neither AI edits the other workstream's owned source files merely to make its own work easier.

## File ownership

| Workstream | Owner | May edit without a new transfer |
|---|---|---|
| Simulation, dispatch, state transitions, calculations | Ahmad + Codex | `ademix/simulator/**` |
| Twin definitions, telemetry dictionary, comparison evidence | Ahmad + Codex | `ademix/data/**`, except generated UI bundle handoff below |
| OpenEgiz integration and automated backend tests | Ahmad + Codex | simulator/API/MQTT/Ditto verification scripts and backend tests |
| 3D scene, panels, charts, labels, animation, camera and responsive UX | Professor + Claude | `ademix/frontend/src/**`, `ademix/frontend/public/models/**`, visual assets |
| Generated frontend replay bundle | Ahmad + Codex generates; Professor + Claude consumes | `ademix/frontend/public/data/ingestion.json` changes only as part of a recorded data handoff |
| Shared release files | One named integrator at a time | `README.md`, `SUBMISSION.md`, `PROJECT_CONTEXT.md`, `RULES_CHECKLIST.md`, `FINAL_TODO.md`, `presentation/**`, `presentation.pdf`, Compose files |

If a task needs a file in the other lane, write a request in the handoff instead of editing that file. Ownership may be transferred for one task by recording the exact files, purpose and return condition in `PROJECT_CONTEXT.md`.

## Shared feature contract

For every improvement that crosses simulator and frontend, agree on this contract first:

```text
Feature:
Backend owner:
Frontend owner:
Twin/API fields: name, type, unit, allowed values
Command/API request:
Reset behavior:
Example baseline response:
Example changed response:
Backend test:
Frontend acceptance check:
```

Ahmad + Codex publish the field names, units, examples and behavior. Professor + Claude may question or request changes before the contract is frozen. Once frozen, both sides implement against it. A field is never silently renamed or reinterpreted.

## Assigned improvement work

### Stream A — Ahmad + Codex: operational truth

Work in this order:

1. **Correct cumulative fuel and emissions.** Add authoritative interval-based fuel/CO2 totals, shift/reset semantics and tests. Keep estimates clearly separate from synthetic tank percentage.
2. **Produce matched fixed-versus-smart evidence.** Generate comparison data from identical starting conditions and measurement windows for throughput, queues, cycling/standby trucks and operating truck-hours per 1,000 t.
3. **Provide timeline/history data.** Expose or generate the minimum data needed to plot baseline, disruption, tow/recovery and reset using simulated timestamps.
4. **Reconcile road behavior.** Define and test which traffic is affected by a breakdown on the visually two-way road; update twin descriptions and model documentation without changing frontend-owned geometry.
5. **Verify all combinations.** Test baseline, each disruption, Smart Dispatch with each disruption, and clean reset through simulator, MQTT, Ditto and API.
6. **Optional only after those pass:** implement simulator-enforced following distance, weather-driven road behavior or a shift-planning calculation if the Team selects one.

Stream A completion evidence:

- backend and data tests pass;
- exact twin/API contract and example payloads are handed to Stream B;
- reproducible comparison/timeline evidence is generated;
- limitations and assumptions are explicit;
- no frontend-owned source file is changed.

### Stream B — Professor + Claude: operator experience

Work in this order, consuming Stream A contracts:

1. **Create a clear normal-versus-smart comparison.** Show throughput, queue/wait, trucks cycling/parked and operating truck-hours per 1,000 t from the matched evidence.
2. **Add the dispatcher recommendation.** Explain the current bottleneck and the recommended action in plain language, using simulator fields rather than frontend guesses.
3. **Add the production/recovery timeline.** Plot actual history supplied by Stream A and mark disruption and recovery events.
4. **Simplify the opening view.** Keep the mine, four essential KPIs and scenario controls readable; make technical overlays optional.
5. **Improve the close operational story.** Verify and refine loading, payload growth, dumping, queues, standby movement and breakdown presentation without changing simulation rules.
6. **Create a guided three-minute demonstration.** It must activate real controls and wait for returned twin state; it must not fake scenario outcomes with a separate animation.
7. **Optional only after those pass:** present enforced safety/weather behavior supplied by Stream A or add the UI for a selected larger extension.

Stream B completion evidence:

- production build passes;
- screenshots or a short capture show desktop and narrow-window behavior;
- displayed numbers match supplied fixtures/live twins;
- scenario controls acknowledge actual backend state and reset cleanly;
- no simulator/data-owned source file is changed.

## How the two AIs cooperate

For each cross-layer feature:

1. Both agents fetch and read `PROJECT_CONTEXT.md`, `RULES_CHECKLIST.md`, this plan and the latest handoff.
2. Ahmad + Codex write and test the contract, then commit it with example responses.
3. Professor + Claude fetch that commit and build the presentation against the frozen contract.
4. Each agent commits only owned files and writes a handoff: commit SHA, files, contract used, tests, screenshots, known limits and exact integration instruction.
5. The integrator combines backend first, frontend second, then deliberately reconciles generated/shared files.
6. The integrator runs backend tests, frontend build, live Ditto verification and visual acceptance on the combined commit.
7. If integration reveals a contract defect, the responsible owner fixes it in their lane; the integrator does not invent behavior during conflict resolution.

The agents may work in parallel only after the contract is frozen. Before that, one side would be guessing what the other will provide.

## Branches and integration

- Ahmad + Codex: one focused `codex/<feature>` branch per task.
- Professor + Claude: one focused `claude/<feature>` branch per task.
- Shared integration: one temporary `integration/<release>` branch controlled by the named integrator.
- `main`: final accepted release only.

Each feature should be one reviewable commit or a small coherent series. Do not merge stacked branches separately. Never resolve a shared-file conflict with an automatic “ours” or “theirs” choice.

## First coordinated batch

| Order | Ahmad + Codex | Professor + Claude | Integration test |
|---:|---|---|---|
| 1 | Fuel/CO2 accumulator, fields and tests | Prepare labels/layout only after contract fixture exists | Two-rate shift total stays historically correct; UI matches twin total |
| 2 | Fixed/smart matched comparison generator | Fixed/smart comparison card | Same conditions and window; displayed values equal generated evidence |
| 3 | Event/history payload with simulated timestamps | Production/recovery timeline | Breakdown dip, tow and recovery markers match source records |
| 4 | Road-direction behavior and verification | Road/breakdown explanation and visual acceptance | Simulator, Ditto, UI and documentation tell the same traffic story |
| 5 | Full combined scenario verification | Opening view and guided demo | A new viewer completes the demo; all state changes are real and reset passes |

Task numbering maps directly between the two notes: Codex A1 supplies Claude B2, A2 supplies B3, A3 supplies B4 and A4 supplies the road portion of B5. Claude B1 may run in parallel with Codex A1 because it uses the existing contract.

## Definition of a safe handoff

A handoff is ready only when it contains:

- branch and commit SHA;
- exact changed paths;
- twin/API contract version or confirmation that it is unchanged;
- commands actually run and their results;
- screenshots for visual work;
- generated artifacts and how to reproduce them;
- known limitations;
- exact instruction: merge, cherry-pick or reject.

This structure keeps each person's work independent at the file level while keeping both people and both AIs informed about the complete product.

## Score-focused phase before final examination

Professor + Claude own the user-facing implementation and visual acceptance of C1–C5 after their accepted B6 handoff is integrated. Ahmad + Codex own the existing C1/C4 contracts, any required simulator/API/data work, automated backend/data verification and release integration. Required C1–C5 add visible mine relationships, a unified dispatcher decision board, spatial scenario cause/effect and an honest model-trust view. C6/A9 sensitivity evidence is optional and must be skipped if it threatens release stability or time.

`04_AI_JUDGE_READINESS.md` remains the last phase. J1–J8 examine the frozen combined application; they do not replace unfinished A, B or C implementation.

`A6_A11_SCORE_FOCUSED_IMPROVEMENTS.md` contains the score-first order shared by both AIs: integrate Professor + Claude B1–B6; Professor + Claude complete visible C1–C4 and combined C5 with Codex contract/integration support; implement A6; add A8/A9 only if time remains; skip A7/A10/A11 when C2 already supplies their value; then run J1–J8. Professor + Claude are not assigned a longer map, more decorative workers or extra buildings.
