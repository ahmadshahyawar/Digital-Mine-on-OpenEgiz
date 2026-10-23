# Ademix final to-do list

Combined from the Team's two reviews on 23 October 2026. This is a proposed work checklist, not a claim that its tests have passed or authorization to start every optional feature. Preserve the Team-written Concept and accepted scene. `RULES_CHECKLIST.md` remains the competition release gate.

Status: **Verify** = already implemented or previously tested; verify the final release rather than rebuild. **Fix** = a specific issue found in source. **Improve** = proposed addition. **Optional** = do only after the release gates pass. Every box starts unchecked because final acceptance has not been recorded here.

Ownership: Ahmad/Codex owns simulation, API, data and tests; Professor/Claude owns frontend and visual changes. One designated integrator owns shared release files. Record a task lock and handoff in `PROJECT_CONTEXT.md` before implementation.

The concrete two-person work split and cross-layer handoff sequence are in `TEAM_WORK_PLAN.md`. Use this checklist for acceptance tests and the work plan for who changes which files.

## P0 — Protect the submission first

- [ ] **1. Finalize one release candidate and check organizer updates.** Integrator — Verify.
  - Work: fetch origin, check missing organizer commits and `Contest update:` pull requests, reconcile contributor branches, preserve human changes, and identify the exact release commit. During the advisory review, fetched `origin/main` was still the initial template and the developed branch was 71 commits ahead.
  - Test: record the fetched refs and release SHA; inspect the integrated diff; confirm no needed branch or uncommitted asset is omitted. Verify open organizer PRs through an authenticated source; do not assume none exist if the listing fails.

- [ ] **2. Run the README on clean Ubuntu.** Integrator — Verify.
  - Work: use a fresh judge-like Ubuntu 24.04 amd64 environment with Docker; follow the README literally. Windows Docker success is existing evidence, not completion of this gate.
  - Test: no undocumented intervention, private credentials, or missing prerequisites; startup within the official 75-minute limit; services healthy; documented UI/API/Grafana URLs open. Record hardware, versions, elapsed time and disk use against the official limits.

- [ ] **3. Prove the complete OpenEgiz path on the release candidate.** Codex — Verify.
  - Work: retain simulator → MQTT → Eclipse Ditto → API → frontend as the production path. Keep LIVE, DEMO and REPLAY distinct.
  - Test: run `ademix/simulator/smoke_check.py` using the documented container command; require `source=eclipse-ditto`, 11 twins and the current 128-field/unit contract. Observe the LIVE badge in the browser. Stop/restart a dependency on a disposable stand: show loss of live state honestly and recover without false LIVE labeling.

- [ ] **4. Reconcile all final documentation and presentation.** Integrator — Fix/Verify.
  - Work: update `presentation.pdf`, README, SUBMISSION and relevant context sections to match the final stand. Preserve Concept wording. Remove stale rerouting claims and obsolete figures; distinguish road restriction from closure. Resolve stale ownership/handoff statements without erasing history.
  - Test: inspect every PDF page; follow the demo instructions literally; cross-check every claimed module, scenario, number and limitation against runtime or source evidence. A second reader should understand the user, decision, benefit and activation/reset steps.

- [ ] **5. Put the accepted release on official `main` before freeze.** Integrator — Verify, last release step.
  - Work: after final checks and human visual acceptance, integrate the complete accepted release into the official repository's `main` before **25 October 2026, 23:59 Astana time (UTC+5)**.
  - Test: fetch again and verify remote `main` resolves to the intended release; inspect that commit for root README, SUBMISSION, presentation PDF, code and all required assets. Reproduce smoke/startup from that commit. Work remaining only on another branch is not submitted.

## P1 — Correctness and trustworthy numbers

- [ ] **6. Run the existing simulation verification suite.** Codex — Verify.
  - Work: verify FIFO queues, exclusive loading/dumping, finite ROM capacity, complete truck lifecycle, interruption/recovery, non-negative inventory and mass conservation. Existing recorded total: 56 simulator-package plus 32 data-layer checks; rerun rather than treating that historical result as final evidence.
  - Test: all relevant suites pass on the release SHA and in the built image; processed ore plus ROM plus payload equals opening stock plus extraction within documented numerical tolerance. Include direct scenario switches and clean reset. Save actual command output; explain any changed test count.

- [ ] **7. Reconcile physical formulas, units and comparison windows.** Codex with integrator — Verify/Fix.
  - Work: check 77 t payload, 6 min loading, 3.2 km one-way travel, 25 km/h baseline, 1 min dumping and assumed 900 t/h crusher capacity. Label approximately 22.36 min as the no-queue cycle; approximately 36 min is the recorded baseline cycle including queues. Distinguish projected, rolling, cumulative and steady-window metrics.
  - Test: independently recompute 77 × 60/6 = 770 t/h loader supply and 6 + 1 + 2 × 3.2/25 × 60 = 22.36 min free cycle. Reconcile every measured cycle to its component durations. Compare results using identical warm-up, horizon and trigger conditions. Review rounding and finite-window effects rather than claiming breakdown improves long-run capacity.

- [ ] **8. Fix cumulative fuel and CO₂ totals.** Codex data/model; Claude display — Fix.
  - Work: replace current-rate × elapsed-time accounting for “CO₂ this shift” with accumulation over each actual simulated interval. Use a shared authoritative accumulator for any cumulative fuel/emissions totals; define shift boundaries and reset behavior.
  - Test: use a controlled two-hour example: first hour 381.1 L/h, second hour 281.9 L/h gives **663.0 L**, not 563.8 L. CO₂ equals accumulated litres × the configured factor. Pausing presentation or changing replay speed must not alter totals for the same simulated history. Verify mixed states, resets and live/replay behavior.

- [ ] **9. Make fuel estimates and energy labels honest.** Codex assumptions; Claude frontend — Fix.
  - Work: label diesel rates as estimates using reference duty cycles. Label energy as **diesel fuel energy**, not electricity or useful mechanical work. State that crusher electricity is excluded. Distinguish synthetic tank percentage from the separate litres/hour estimate.
  - Test: all six counted trucks plus excavator gives 6 × 49.6 + 83.5 = 381.1 L/h; four counted trucks gives 281.9 L/h. Standby/broken trucks are already excluded from the truck-rate estimate: retain and verify this. Recompute L/t, fuel kWh/t and kg CO₂/t from configured factors; at zero throughput show unavailable per-tonne metrics. UI and documents state assumptions consistently.

- [ ] **10. Decide whether to deepen the fuel model.** Team decision; Codex implementation — Optional after item 9.
  - Work: if justified inputs are available, distinguish loaded travel, empty travel, working, idling and engine-off use, including excavator idle state. Do not add idle consumption on top of a duty-cycle rate that already incorporates idle time.
  - Test: controlled state sequences integrate to independently calculated fuel totals; parked engine-off equipment has the documented rate; idle equipment uses the chosen idle rate. Record sources/assumptions and sensitivity. No measured fuel-saving claim without matching evidence.

- [ ] **11. Align road behavior, geometry and documentation.** Codex + Claude coordinated — Fix/Verify.
  - Work: reconcile the two-way visual road with the model's single-lane blockage wording. Define which direction is blocked and how followers/opposing traffic react. Describe current restriction as reduced speed; no alternative route currently exists. Explain conceptual route scale and grade limits.
  - Test: fail a truck during loaded and empty travel; verify the documented affected traffic stops, other permitted traffic behaves consistently, twin speed/progress matches the scene, towing clears the intended restriction and reset leaves no stale blockage. Observe approach, road and turning-loop clearances in close views.

## P1 — Demonstrate the existing decision features

- [ ] **12. Verify every disruption from the actual UI.** Codex verification; Claude visual acceptance — Verify.
  - Work: exercise breakdown, road restriction and crusher slowdown with final controls; retain existing underlying state changes.
  - Test: run `verify_scenarios.py`, then observe the browser. Breakdown: correct truck stops and consequences appear. Restriction: speed changes from 25 to approximately 10.72 km/h. Slowdown: capacity changes to 495 t/h, ROM fills and queues react over simulated time. Every case changes Ditto twins, has a visible consequence and resets cleanly.

- [ ] **13. Verify Smart Dispatch and combined disruption + dispatch.** Codex + Claude — Verify.
  - Work: retain actual standby/release decisions. Under baseline, four trucks cycle and two park after transition; under crusher slowdown three are required; under restriction demand is eight but only six exist. Keep desired count distinct from available count.
  - Test: compare fixed/smart using the same initial state, event timing and measurement window; confirm approximately unchanged steady production and documented operating-truck-hour reductions. Test breakdown + smart, restriction + smart and slowdown + smart. Verify reserve release, payload preservation, no duplicate service, Ditto policy/count fields, visible parking, and A reset to fixed/baseline.

- [ ] **14. Add an obvious fixed-versus-smart comparison.** Claude frontend; Codex evidence — Improve.
  - Work: show throughput, cycling/standby counts, queue time and operating truck-hours per 1,000 t together, with a plain-language recommendation. Use estimated fuel only with item 9's labels. Existing Smart Dispatch need not be rebuilt.
  - Test: displayed comparison comes from reproducible matched runs or clearly labeled saved model evidence, not unrelated live snapshots. Show the baseline result of six versus four cycling trucks at approximately 770 t/h; disclose transitions and measurement period. No unsupported fuel-saving or extra-throughput claim.

- [ ] **15. Show production and recovery over time.** Claude frontend; Codex evidence/telemetry — Improve.
  - Work: add a compact throughput trend with event and recovery markers; distinguish expected steady capacity from current observed production.
  - Test: timestamps use simulated time; baseline is stable after warm-up; the documented breakdown reference shows its temporary first-hour loss and later recovery. Changing scenario/reset cannot mix unlabeled measurement windows. Match plotted points to underlying records/twins.

- [ ] **16. Provide a three-minute guided demonstration.** Claude frontend; integrator script — Improve.
  - Work: guide a viewer through baseline → disruption → consequence → Smart Dispatch → recovery/reset, using real controls and returned twin state. This may be a short manual walkthrough if an automated tour would jeopardize release.
  - Test: a new viewer can follow it and explain the operational decision and benefit. An automated tour waits for actual state acknowledgement, can be canceled and resets reliably; it must not use an independent animation to imply simulator outcomes.

## P2 — Make the final scene clear and credible

- [ ] **17. Simplify the opening view and operator language.** Claude — Improve.
  - Work: preserve the accepted mine; reduce default overlays, avoid overlapping labels, show the main operational KPIs and a compact scenario panel. Use a user-facing title such as Ademix Mine Operations; keep technical ingestion/topology views available.
  - Test: at a normal desktop viewport and a narrow window, pit, loading face and plant remain visible; important controls/labels do not overlap or leave the screen. Open/close each panel, select trucks and return to Overview. Confirm all technical inspection tools remain accessible.

- [ ] **18. Visually accept benches, loading, dumping and traffic.** Claude; Team final acceptance — Verify.
  - Work: inspect actual bench surfaces, not only crest lines; bucket-to-bed transfer, progressive payload, dumping, grounded wheels, turning loops, standby bays and facility clearance. Keep illustrative geometry clearly labeled and respect the existing scene/checklists.
  - Test: watch complete loaded and empty truck cycles at close range; inspect across bench cross-sections; no truck/equipment overlap, unexplained teleporting or floating travel in the reviewed paths. Confirm animation/payload agrees with authoritative state. Record screenshots or a short clip and any remaining limitations.

- [ ] **19. Verify safety and weather claims; enforce only if selected.** Codex + Claude — Verify/Clarify; enforcement Optional.
  - Work: clearly distinguish advisory 50 m following gap/15 km/h loop signs, visual spacing and simulator-enforced constraints. Weather is a synthetic demonstration signal; it does not currently prove weather-driven operational control. Do not claim certified safety behavior.
  - Test: trigger each advisory threshold using controlled data and verify correct warning/clear behavior. Confirm documentation states which constraints affect simulation. If enforcement is added, verify simulator speed/progress and Ditto state actually respond, queues remain valid, mass balance holds and reset works; visual slowing alone does not pass.

- [ ] **20. Measure software-rendering performance and startup usability.** Claude + integrator — Verify.
  - Work: benchmark the final scene without GPU acceleration, with Balanced as default. Check whether an additional lightweight mode is necessary; keep high-cost effects optional.
  - Test: record renderer, hardware, viewport, first usable frame time and frame-rate range during baseline and scenarios. Exercise selection, panels and camera movement without prolonged freezes or WebGL errors. Choose and document an acceptance target before measuring; a successful frontend build is not runtime performance evidence. Verify all critical assets load from the repository.

## P2 — Evidence and reproducibility

- [ ] **21. Complete the evidence, provenance and claim audit.** Codex + integrator — Verify.
  - Work: save current scene/scenario captures, matched comparison tables, architecture/twin relationships, actual test logs and clean-start evidence. Distinguish sourced parameters, team assumptions, synthetic signals and derived metrics. Mark waste trucks/support facilities as visual context, not extra operational twins.
  - Test: regenerate data/replay artifacts and check reproducibility; verify bundled asset licenses/checksums and required notices; check no secrets or private data enter Git history/submission. Review all module claims against working behavior. A dashboard alone is not an additional operational module. Optional video must show the final stand.

## Optional — Only after the release gates are secure

- [ ] **22. Choose at most one larger operational extension.** Team choice; coordinated implementation — Optional.
  - Option A: second loading face, so dispatch chooses between waiting nearby and traveling farther. Test both faces as real twins/resources; changing availability/travel time changes assignments and queues; tonnes are conserved and the policy comparison uses matched runs.
  - Option B: genuine alternative route, so a closure reroutes trucks. Test closure removes a usable link, simulator path choice changes, trucks visibly follow that route, travel time/production respond, and reopening/reset restores valid paths.
  - Do not attempt both before the current release is complete. Avoid unrelated modules, wholesale scene redesigns or unverified claims merely to increase feature count.

## Recommended execution order

Establish candidate and Ubuntu feasibility (1–3); fix numbers and consistency (6–9, 11); verify scenarios and dispatch (12–13); select the small presentation improvements that fit (14–20); assemble evidence and reconcile the PDF/docs (21, 4); finally submit and verify official `main` (5). Items 10 and 22 are optional extensions, not release requirements.

For each completed task, record: release/commit SHA, exact command or manual steps, expected result, observed result, evidence path, owner and remaining limitations. Mark a box only after its stated acceptance test has passed; mark skipped optional tasks explicitly.
