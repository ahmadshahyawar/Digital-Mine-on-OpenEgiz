# 01 — Ahmad + Codex workstream

Owner: Ahmad Shah Yawar + Codex

Role: operational truth, OpenEgiz integration, evidence and release integration

Current branch family: `codex/<feature>`
Do not edit Professor + Claude's frontend/3D files unless a task-specific ownership transfer is recorded first.

Before every task:

1. Run `git fetch origin`.
2. Read `PROJECT_CONTEXT.md`, `RULES_CHECKLIST.md`, `COLLABORATION.md`, `TEAM_WORK_PLAN.md`, this file and the latest Claude handoff.
3. Compare the intended paths with current work on both workstreams.
4. Record an Active Work lock in `PROJECT_CONTEXT.md` with branch, exact paths, purpose and expected handoff.
5. Freeze the cross-layer field/API contract before asking Claude to consume it.

## A1 — Cumulative fuel and CO2 truth

Goal: make shift totals historically correct when trucks start, stop or enter standby.

Owned work:

- add interval-based fuel and CO2 accumulation to the simulator/data contract;
- define the shift start, reset and scenario-switch behavior;
- keep estimated L/h separate from synthetic tank percentage;
- publish fields with names, types, units and example values;
- update backend tests, telemetry dictionary and reproducible evidence.

Do not edit the ESG React panel. Give Claude the exact contract and fixture instead.

Tests:

1. One hour at 381.1 L/h plus one hour at 281.9 L/h equals 663.0 L.
2. CO2 equals accumulated fuel multiplied by the configured emission factor.
3. Two parked trucks do not accrue the operating truck rate.
4. Earlier consumption does not change when the current fleet state changes.
5. Scenario reset follows the documented shift-total policy.
6. Mass balance, queues and existing Smart Dispatch tests remain passing.

Handoff to Claude: field contract, two-hour fixture, labels that are scientifically valid, commit SHA and test results.

## A2 — Matched fixed-versus-smart comparison

Goal: prove Smart Dispatch's benefit using identical conditions.

Owned work:

- generate fixed and smart runs from the same initial state;
- use the same warm-up, scenario trigger and measurement window;
- report throughput, cycle time, queue waits, cycling/standby trucks, operating truck-hours per 1,000 t and estimated fuel only if A1 is complete;
- expose the comparison through stable evidence or twin/API fields agreed with Claude.

Tests:

1. Baseline fixed and smart runs start from identical state.
2. Smart baseline uses four cycling and two standby trucks after transition.
3. Steady modeled output remains approximately 770 t/h within the documented finite-window tolerance.
4. Operating truck-hours per 1,000 t decrease by the reproducible modeled amount.
5. Breakdown, road restriction and crusher slowdown comparisons use the same method.
6. Generated evidence reproduces exactly from one documented command.

Handoff to Claude: schema, complete comparison fixture, measurement-window explanation, commit SHA and reproduction command.

## A3 — Production and recovery history

Goal: supply real simulator history for a clear timeline.

Owned work:

- define the smallest history/event payload needed by the UI;
- use simulated timestamps;
- include scenario start, breakdown, road clear/tow, recovery and reset events;
- distinguish observed rolling throughput from projected steady capacity.

Tests:

1. Event timestamps are monotonic and use simulated time.
2. The documented breakdown run shows its temporary production loss and later recovery.
3. Reset begins a clearly labeled new comparison period or clears history according to contract.
4. History values match underlying simulator records and generated evidence.
5. MQTT/Ditto/API delivery does not change the meaning or unit of a field.

Handoff to Claude: history schema, baseline and breakdown fixtures, event-label rules, commit SHA and tests.

## A4 — Road and breakdown consistency

Goal: make simulator behavior agree with the visually two-way road.

Owned work:

- define which lane/direction is affected by a failed truck;
- define follower and opposing-traffic behavior;
- update simulator state, twin descriptions and model documentation;
- keep the current road restriction accurately described as reduced speed unless a real reroute is later implemented.

Tests:

1. Trigger breakdown while hauling and while returning.
2. Verify only the documented traffic becomes blocked.
3. Verify truck progress, speed, blockage fields and queue behavior.
4. Verify towing clears the road correctly.
5. Verify reset removes stale blockage/recovery events.
6. Verify ore mass balance remains zero-error.

Handoff to Claude: traffic behavior contract, example states for both directions, commit SHA and test results.

## A5 — Combined release verification

Goal: integrate both workstreams without changing the intent of either.

Owned work:

- integrate accepted backend/data commits first and Claude frontend commits second;
- deliberately reconcile generated/shared files;
- update README, SUBMISSION, presentation and project context after the application is final;
- run the full release verification.

Tests:

1. Backend/data automated suites pass on the combined commit.
2. Frontend production build passes.
3. Smoke check reports Eclipse Ditto, 11 twins and the final field/unit contract.
4. Baseline, all disruptions, Smart Dispatch combinations and reset pass through the live path.
5. Human visual review accepts the opening view, comparison, timeline and complete equipment cycle.
6. Clean Ubuntu README start passes before merging the accepted release to official `main`.

## Codex handoff format

```text
Owner: Ahmad + Codex
Task: A<number> — <name>
Branch:
Commit SHA:
Exact changed paths:
Contract fields/API:
Commands actually run:
Observed results:
Generated evidence/fixtures:
Known limitations:
Request to Professor + Claude:
Integration instruction: merge | cherry-pick | reject
```

**Current status:** A1–A5 are completed and integrated on `origin/codex/ademix`. While Professor + Claude complete B1–B6, Ahmad + Codex review and integrate their handoffs rather than starting an unrelated backend feature. `A6_A11_SCORE_FOCUSED_IMPROVEMENTS.md` defines the next score-focused extensions: A6 is recommended; A7–A11 are optional and must not displace required B/C integration or release stability. After all B tasks are accepted, continue with Codex-owned C work in `03_HIGH_SCORE_IMPROVEMENTS.md`; J1–J8 remain last.
