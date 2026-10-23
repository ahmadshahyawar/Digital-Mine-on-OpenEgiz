# A6–A11 — Score-focused improvements for Ahmad + Codex

Owner: **Ahmad + Codex**

Purpose: add a small number of improvements that can help judges verify a credible digital twin and a useful dispatcher decision. These are product improvements. The tests under each task prove that the improvement works; they are not the improvement itself.

## Copy this prompt into Codex

```text
Read AGENTS.md and every required shared project file in full, then read A6_A11_SCORE_FOCUSED_IMPROVEMENTS.md. Work on A6–A11 in order, one task and one feature branch at a time, starting from the latest origin/codex/ademix. First inspect the current implementation and reuse existing A1–A5 and C1/C4 contracts instead of duplicating them. Treat the work items as improvements and the pass tests as proof.

Protect the two-person workflow. While Professor + Claude are still completing B1–B6, edit only Ahmad + Codex owned backend, data, contract and test paths. Do not edit their React, CSS, 3D, presentation or visual asset paths. Add any required frontend consumption only after the accepted B6 handoff is integrated and frontend ownership transfers to Ahmad + Codex. Push and integrate each accepted task before starting a dependent task. Update PROJECT_CONTEXT.md with exact files, commit, tests, evidence and limitations.

The goal is contest score and first-place readiness. Do not lengthen the map, add decorative workers, add extra buildings, create another route, or add visual objects without a scored operational purpose. Stop an optional task if it duplicates C1–C5, weakens performance, creates unsupported claims, or threatens the clean Ubuntu release. J1–J8 remain the final phase.
```

## Score rule

The official rubric rewards a connected mine model, understandable 3D consequences, credible behavior, a clear decision, useful scenarios and working modules. It does not award points simply for a larger map or more decorative objects.

Do **not** do these before submission:

- lengthen the road or map only to make the mine look larger;
- add more human workers only as decoration;
- add repair shops, offices or buildings that have no twin state or operational role;
- add a second route, second loading face or another service;
- increase scene density in a way that risks software-WebGL performance;
- claim field realism, measured savings or validation that the evidence does not support.

Professor + Claude should complete B1–B6 and make existing operations easy to understand. A building or worker is worth adding only when it represents a truthful live twin, changes a dispatcher decision, or makes an existing scenario consequence clearer. No such expansion is currently required.

## Order and release protection

1. Complete A6 first because it explains the intentionally accelerated simulation and removes a likely judge misunderstanding.
2. Complete A7 only if it stays a small bounded event record and does not replace the verified A3 history evidence.
3. Complete A8 as a reproducible offline planning experiment. It must not change the six visible trucks or the live mine topology.
4. Treat A9 as the implementation of optional C6 sensitivity evidence. Build it once, not twice.
5. Add A10 inside the C2 Decision workspace; do not build a second dashboard.
6. Add A11 only after the Decision workspace is stable and all required B/C tests still pass.
7. Run C5 after the accepted A6–A11 work. Then freeze the candidate and start J1–J8.

A6 is recommended. A7–A11 are optional and must be skipped when their release risk is larger than their provable score value. A skipped optional task is safer than a broken build.

## A6 — Make simulation time truthful and obvious

**Improvement:** publish one authoritative simulation clock and show clearly that the demonstration runs at accelerated simulated time.

Why it can raise the score: trucks can look unrealistically fast if a judge thinks the display uses real time. A truthful `Simulation time 20×` label and matching backend state make the behavior understandable and credible.

Work:

- define one backend-owned clock contract containing current simulated time, configured speed multiplier and simulation/demo mode;
- deliver the multiplier through the existing OpenEgiz/API path rather than keeping `20` as an unrelated frontend truth;
- make truck interpolation and the visible time label consume the same returned value;
- show both simulated elapsed time and the multiplier in a compact location;
- document that acceleration changes demonstration duration, not modeled travel time, loading time, dumping time or production equations.

Pass tests:

1. At multipliers 1×, 5× and 20×, one modeled hour produces the same tonnes, trips, queue times and mass balance.
2. Real waiting time scales with the configured multiplier within the documented tolerance.
3. The UI multiplier equals the value returned through the live path; it is never a separate hard-coded claim.
4. Truck movement, loading, dumping, scenario timing and history use the same clock.
5. Missing clock data displays `unavailable` or a truthful fallback state, never a false live multiplier.
6. Backend tests, data checks, frontend build and live smoke check pass.

## A7 — Record the actual live session event trail

**Improvement:** give the current running session a small, bounded operational event trail.

Why it can raise the score: the judge can see that a scenario request was acknowledged, affected real twin state, recovered and reset. This strengthens behavioral credibility and scenario evidence.

Work:

- record simulated timestamp, event type, affected twin, scenario, dispatch mode and concise returned-state summary;
- include scenario requested/acknowledged, breakdown/tow/recovery, restriction start/end, crusher slowdown start/end, Smart/Fixed change and reset;
- keep a bounded in-memory history or existing platform-compatible representation; do not add a new database or service;
- keep the reproducible A3 fixture separate and label it `saved model evidence`; label A7 as `current live session`;
- expose the trail in the existing timeline/Decision experience only after B6 is integrated.

Pass tests:

1. Event timestamps are monotonic simulated time and use the A6 clock.
2. Every scenario control produces an acknowledgement event only after returned state confirms it.
3. Breakdown, recovery and reset identify the correct twin and leave no stale active event.
4. The bounded trail cannot grow without limit and reset behavior is documented.
5. Live-session events are never mixed numerically with the saved A3 recovery fixture.
6. Restart, disconnect and demo fallback cannot be presented as an uninterrupted live session.

## A8 — Prove the right fleet size with a reproducible experiment

**Improvement:** generate a small planning study that shows when additional trucks stop increasing output.

Why it can raise the score: it directly proves the dispatcher's fleet decision and demonstrates connected constraints instead of merely stating that four cycling trucks are enough.

Work:

- run deterministic fresh-start experiments for practical active-fleet counts, using the existing engine and the same documented warm-up and measurement window;
- report throughput, bottleneck, queue wait, utilization and truck operating hours per 1,000 t;
- include baseline and only the existing three disruptions where results remain understandable;
- generate one versioned JSON fixture from a documented command;
- keep the live scene at the existing six truck twins; represent unused trucks as standby rather than changing topology;
- add a compact curve or table inside the C2 Decision workspace after B6.

Pass tests:

1. One command regenerates the fixture byte-for-byte from a clean checkout.
2. Every fleet-size run uses a fresh engine, common start method, common window and documented units.
3. The baseline result identifies the saturation point supported by the model and does not assume the answer in the test.
4. Throughput, queue and truck-hour calculations agree with raw simulator counters.
5. The six live truck twins and all existing relationships remain unchanged.
6. The UI values equal the fixture within documented display rounding.

## A9 — Show when the recommendation changes

**Improvement:** add a small sensitivity study that identifies the planning boundary at which the recommended fleet action changes.

Why it can raise the score: it shows the recommendation is based on constraints and assumptions, rather than a single hand-picked result.

Relationship to C6: this task **is the enhanced C6 implementation**. Completing A9 satisfies C6; do not create a second sensitivity feature.

Work:

- vary one documented planning input at a time, preferably route length, loading cycle time or crusher capacity;
- use a small set of explicitly labeled planning cases, not invented probability distributions;
- report the resulting bottleneck, throughput, queue wait and recommended active fleet;
- state the boundary where the recommendation changes and which assumption caused it;
- reuse the A8 experiment generator and the C2 Decision workspace.

Pass tests:

1. The fixture regenerates exactly and records all input values, units and categories.
2. Only one input changes in each comparison.
3. At least one tested case changes the active constraint or recommendation for a model-supported reason.
4. Results never claim statistical confidence, measured uncertainty or operating-mine validation.
5. Removing this optional panel cannot affect live control, twin delivery or simulation behavior.
6. Full C5 integration checks pass again.

## A10 — Give a scenario-specific dispatcher response

**Improvement:** turn existing evidence into one clear recommended action for each current operating condition.

Why it can raise the score: judges can see what decision the twin helps the dispatcher make, why that action is recommended and what evidence supports it.

Work:

- add a small deterministic recommendation contract for baseline, truck breakdown, road restriction and crusher slowdown;
- for each condition provide current constraint, recommended Fixed/Smart action, expected modeled effect, supporting fixture fields and limitation;
- show it inside the existing C2 Decision workspace rather than creating another page;
- update the recommendation only from returned state and verified evidence;
- make the recommendation explain `why`, including when extra trucks do not help.

Pass tests:

1. Every recommendation maps to an existing scenario and a verified A2/A8/A9 evidence record.
2. Baseline, breakdown, road restriction and crusher slowdown do not all show a generic identical explanation.
3. Observed live values and projected/model evidence remain visibly separate.
4. Missing or contradictory inputs produce `insufficient evidence`, not a fabricated recommendation.
5. Reset returns to the documented baseline recommendation.
6. A new viewer can state the action and reason in under one minute.

## A11 — Export a reproducible decision record

**Improvement:** let a reviewer download the exact evidence behind the currently displayed recommendation.

Why it can raise the score: it makes a useful module easy to verify and gives the team consistent evidence for the submission and presentation.

Work:

- add one lightweight JSON export and, only if easy, a CSV summary;
- include candidate/app version, mode, simulation clock, active scenario, dispatch policy, current returned KPIs, recommendation, evidence fixture identifiers, assumptions and limitations;
- calculate no new result in the export; serialize already verified live and saved evidence with clear source labels;
- generate the file locally in the browser or existing API; add no external service;
- use a stable schema and safe filename.

Pass tests:

1. Exported live KPIs equal the currently returned twin/API state.
2. Saved/model results include their schema version and evidence identifier.
3. LIVE, DEMO and unavailable states are represented truthfully.
4. The export includes units, source category and the verified/not-validated limitation.
5. Repeating an export without a state change preserves the substantive data; only documented metadata such as export time may differ.
6. No credential, private path, browser data or unsupported claim appears in the file.

## Combined acceptance gate

After the last accepted task:

1. Run all simulator/API and data/schema checks.
2. Run the frontend production build.
3. Run the live smoke check for Eclipse Ditto, 11 twins and the complete field/unit contract.
4. Run Fixed and Smart Dispatch across baseline and all three disruptions, then reset.
5. Confirm the opening view still performs under software WebGL and remains visually clear.
6. Confirm B1–B6 and C1–C5 acceptance behavior still works.
7. Record implemented and skipped A tasks honestly in `PROJECT_CONTEXT.md`, `SUBMISSION.md` and the final evidence index.

Do not mark an A6–A11 task complete because code exists. It is complete only after its improvement is integrated on `origin/codex/ademix`, its pass tests run, and the combined application still works.
