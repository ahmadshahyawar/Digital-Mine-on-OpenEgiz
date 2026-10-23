# 03 — High-score improvements before final examination

Purpose: strengthen the parts of the completed mine that the rubric rewards most before J1–J8 begin. Ahmad + Codex own this entire C phase. Codex may prepare nonvisual contracts while Professor + Claude complete B1–B6, but Codex begins C-phase frontend work only after B6 is integrated. These tasks do not replace the final examination in `04_AI_JUDGE_READINESS.md`.

No task can guarantee a perfect score. The goal is to give the judges strong, immediate evidence for level 4 while protecting the stable OpenEgiz path. Do not add a second loading face, alternate road, new simulation service or unrelated dashboard during this phase.

## Ownership and sequence

- **Ahmad + Codex own C1–C6 completely**, including their limited frontend work, integration, tests and evidence.
- **Professor + Claude own B1–B6 only** and stop after the accepted B6 handoff.
- While B work is active, Codex may prepare C1/C4 data contracts without editing React, CSS, 3D or presentation files. After B6 is integrated, ownership of the exact frontend paths needed for C transfers to Ahmad + Codex.
- Use a focused `codex/<feature>` branch for each C task and integrate one accepted task at a time through `origin/codex/ademix`.
- Required order: C1 → C2 → C3 → C4 → C5. C6 is optional and begins only when C1–C5 pass and sufficient time remains. J1–J8 always remain last.

## C1 — Make the mine model and relationships inspectable

Rubric target: **Mine model — 25 points**.

Goal: show that the submission is a connected operational model, not eleven unrelated objects.

- define a small machine-readable relationship contract for the existing twins;
- preserve the current `_parents` hierarchy and add only truthful operational links: excavator loads trucks, trucks travel on the road, trucks deliver to the crusher, crusher processes mine ore, and the scenario controller changes operating conditions/policy;
- document relationship names and direction, and verify every referenced twin exists.
- add an optional **Mine model** view showing the mine parent, five operational twin types, six truck instances and the material/control relationships;
- selecting an item must focus or open the same live twin in the 3D application;
- show current state on relationship nodes without hiding the mine.

Pass test:

1. Exactly 11 live twins appear once, with no invented asset twin.
2. Every parent and relationship target resolves to a real Ditto twin.
3. The material path reads loading face → truck → haul road → crusher, while control links are visually distinct.
4. Selecting each node opens the correct returned twin state.
5. Smoke, schema/data checks and the frontend production build pass after integration.

## C2 — Build one clear decision board

Rubric targets: **Modules, concept and presentation, behavioral credibility**.

Goal: answer the dispatcher's question on one screen: what is limiting production, what should I do, and what evidence supports that choice?

- combine the completed B3 comparison and B4 recovery timeline into one optional **Decision** workspace;
- show current condition, planned and measured bottleneck, fixed-versus-Smart results, cycling/standby trucks, truck-hours per 1,000 t, queue waits and the recommended action;
- show the matched comparison window and label saved model evidence separately from live rolling values;
- show observed recovery and projected capacity as different series;
- provide a direct return to the 3D mine and keep manual scenario controls available.

Pass test:

1. Every displayed saved value equals `fixed_vs_smart.json` or `production_recovery.json` within documented rounding.
2. Live and saved/model evidence are unmistakably labeled and never combined into one number.
3. Baseline explains why four cycling trucks can preserve the modeled 770 t/h loader-limited output.
4. Road restriction and crusher slowdown produce different, correct recommendations.
5. A new viewer can state the recommended action and its reason in under one minute after opening the workspace.

## C3 — Show cause and effect in the 3D mine

Rubric targets: **Mine visualization and what-if scenarios — 35 points combined**.

Goal: make each scenario consequence obvious spatially, not only in a table.

- when a scenario becomes active, provide a small non-blocking **Show effect** action;
- focus the affected area without removing camera control: failed truck and blocked followers, restricted road and moving traffic, or crusher/ROM/dump queue;
- use returned twin state for colors, warnings, counts and labels;
- show a short causal chain beside the view, such as restriction → slower travel → excavator starvation → lower throughput;
- let the viewer return to Overview immediately.

Pass test:

1. Each of the three disruptions focuses the correct physical area and live assets.
2. The causal text matches `MODEL.md`, `SCENARIOS.md` and returned twin fields.
3. Breakdown distinguishes the affected direction from continuing opposing traffic.
4. Crusher slowdown shows ROM/dump congestion; road restriction never claims an alternate route.
5. Overview, selection, camera controls, reset and software-rendering usability remain intact.

## C4 — Put model trust beside the recommendation

Rubric target: **Behavioral credibility — 20 points**.

Goal: let a judge see why the numbers are credible and where their limits are without reading all source files first.

- freeze a concise truth contract from existing verified evidence: source/assumption category, units, principal formula, mass-balance status, observed rolling value, projected capacity and known limitation;
- do not add unsupported validation, accuracy or site-performance claims.
- add an optional **Why trust this?** section to the Decision workspace;
- show the material-balance check, model constraint/formula, key sourced parameters, team assumptions and the meaning of synthetic telemetry;
- link the explanation to the existing specifications/provenance view without adding external runtime dependencies.

Pass test:

1. Units, formulas and categories agree with `MODEL.md`, telemetry dictionary and data manifest.
2. The view says the model is verified but not validated against an operating mine.
3. Mass balance is taken from the current returned state and shows no false success when unavailable.
4. Crusher capacity, ROM capacity and scenario magnitudes are labeled as team assumptions.
5. No measured saving, guaranteed forecast or safety certification is implied.

## C5 — Integrate the complete high-score experience

Rubric target: all six criteria without weakening release reliability.

Goal: combine B1–B6 and C1–C4 into one coherent operator journey.

- start from the fully integrated and accepted B1–B6 result;
- implement and integrate C branches one at a time;
- resolve contracts and generated assets deliberately;
- rerun backend/data checks, frontend production build, smoke check and the fixed/Smart scenario matrix.
- perform visual acceptance at the opening camera and reviewed narrow viewport;
- verify that Mine model, Decision, Show effect and Why trust this? are optional views rather than startup clutter;
- confirm readable contrast, keyboard focus, clear labels, no panel collisions and a quick return to Overview.

Pass test:

1. The default view remains simple and reaches useful live state without opening optional panels.
2. A reviewer can move from mine → affected assets → decision evidence → model explanation and back.
3. All existing B-task acceptance tests still pass.
4. All automated suites, production build, live smoke check, complete scenario matrix and clean reset pass on one commit.
5. Ahmad's human review accepts the final mine and no known regression is deferred into J1.

## C6 — Optional: small reproducible sensitivity evidence

Rubric targets: **Behavioral credibility and decision usefulness**.

Start only if C1–C5 pass, the candidate is stable and the Team has time to integrate and retest it. Skip it rather than endanger the release.

Goal: show whether the dispatch recommendation remains sensible when a documented planning assumption changes.

Work:

- generate a deterministic, versioned sensitivity fixture using the existing simulator;
- vary one documented input at a time within explicitly stated planning cases, keep the common start/method, and report throughput, bottleneck, queue wait and trucks required;
- show a compact read-only chart in the Decision workspace;
- label every range as a planning case, not uncertainty learned from field data.

Pass test:

1. One command reproduces the fixture exactly and tests verify common starts and expected constraint changes.
2. The UI matches the fixture and identifies which input changed.
3. The recommendation does not claim statistical confidence or field validation.
4. Removing the optional panel cannot affect live simulation, OpenEgiz delivery or scenario controls.
5. C5 integration checks pass again after the addition.

## Completion gate

When C1–C5 pass, record commit SHAs, tests, screenshots, limitations and skipped C6 status in `PROJECT_CONTEXT.md`. Freeze the integrated candidate. Only then begin `04_AI_JUDGE_READINESS.md`.
