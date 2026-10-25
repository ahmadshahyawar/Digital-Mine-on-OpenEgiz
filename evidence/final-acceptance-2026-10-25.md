# Final competition acceptance and documentation audit

Date: 25 October 2026 (Astana, UTC+5).

Official repository: `openegiz-contest/team-111`.

Audited official application revision: **`221ae3ec69b1d21b4d5130273c5c9c31b6b1bfb6`**.

Cleanup branch: `codex/final-acceptance-cleanup`, created directly from that revision. This report and the
cleanup are a proposal; they do not authorize changing official `main`. Obtain the cleanup commit with
`git rev-parse origin/codex/final-acceptance-cleanup` after fetching.

## Acceptance decision

**Clean Ubuntu 24.04 amd64: NOT TESTED.** The exact-main workflow was dispatched, but remained queued with
no assigned job at 18:37 Astana during this audit. It has no successful build or startup result to cite:
[Ubuntu verification run 40197101825](https://github.com/openegiz-contest/team-111/actions/runs/40197101825).
Its recorded head SHA matches the audited revision above. Consult the run for any later result.

**40-point-cap risk: MEDIUM (engineering assessment, not an organizer decision).** The existing local
application passes integration checks through OpenEgiz, but a fresh Ubuntu startup has not been demonstrated
in this audit. Consequently this report cannot certify avoidance of the cap. Windows/Docker Desktop
success is not Ubuntu evidence.

**Recommendation:** the documentation cleanup is suitable for review and merge with explicit Team approval.
It changes no application behavior. Preserve the submitted main if there is insufficient time to review it;
cosmetic cleanup is less important than retaining the functional submission.

## Environment and scope

- Local acceptance used Windows with Docker Desktop Linux containers and existing deployment volumes/images.
  It was not a clean install or a fresh-volume rehearsal.
- The available WSL distributions were Ubuntu 18.04 and Docker Desktop, not Ubuntu 24.04.
- The submitted simulator's running `/app/simulator/app.py` SHA-256 matched the audited checkout:
  `2683cfe74abe149558c0b4cf09435845877d999ce81edcada1eccbece57a573d`.
- The local production bundle was rebuilt from the same application source. Cleanup changes are Markdown only.
- The existing Ubuntu workflow uses `ubuntu-24.04`, checks amd64, follows the README startup command, then
  exercises smoke/freshness/scenarios and stack recreation. It does not perform a browser-rendering test,
  and its runner resources are not proof of the exact judge-machine resource envelope.
- Full stack restart and fresh-volume startup were not repeated locally in this audit. Earlier dated
  evidence is retained, not relabeled as a new result.

## Fresh acceptance results

| Check | Result | Scope and observations |
| --- | --- | --- |
| Simulator/API/evidence unit suite | PASS | `python -B -m unittest discover -s ademix/simulator -p 'test_*.py'`: 98 tests |
| Data/contract/provenance suite | PASS | Corresponding discovery under `ademix/data`: 48 tests |
| Frontend production build | PASS | `npm run build` in `ademix/frontend`; 619 modules; existing large-chunk warning remains |
| Compose service state | PASS | Health-checked services healthy; one-shot setup jobs exited successfully |
| Live smoke | PASS twice | README Docker command, including after cleanup: API health, real Eclipse Ditto source, 11 twins, all 143 required fields/units |
| Complete scenario matrix | PASS | Fixed and Smart policies across baseline, breakdown, road restriction and crusher slowdown; clean reset |
| Corrected Docker-only matrix command | PASS | Second full matrix through `http://ademix-ui`, including reset; no host Python required |
| Authoritative time/source | PASS | Live `mine-01` reports multiplier `20.0`, mode `openegiz_live`; browser samples show advancing `sim_time_s` |
| Automated live browser route | PASS | Initial LIVE, breakdown, Smart Dispatch, reset; 28/28 state reads HTTP 200; zero console errors |
| Normal-running STALE observation | PASS within capture | No STALE after first LIVE during the approximately 55-second route; not an indefinite reliability guarantee |
| Clean Ubuntu startup | NOT TESTED | Workflow queued, no job/result at inspection |
| New software-rendering measurement | NOT TESTED | Previous dated SwiftShader measurements retained; this route used Intel UHD 620 / ANGLE D3D11 |
| Presentation file/rendering | PASS with content caveats | Required root PDF present; all nine pages render; limitations below |
| Protected file identity | PASS | No source, Docker/configuration, scripts, tests, existing evidence, licenses or presentation assets changed |
| Team Concept preservation | PASS | Original Concept section unchanged |

The matrix observed road speeds of 25 / 10.72 km/h and crusher capacities of 900 / 495 t/h as applicable.
Smart Dispatch required/cycling/standby counts were 4/4/2 in baseline, 4/4/1 in breakdown, 8/6/0 under
road restriction, and 3/3/3 under crusher slowdown. Final reset cleared breakdown, blockage and standby
state and restored fixed/baseline. These changes were verified through the frontend proxy, API, MQTT and
Ditto path; simulator-only output was not substituted for live integration.

The browser route used the existing `evidence/final-release/check-live-route.mjs` with screenshots disabled.
It reported initial LIVE at approximately 0.8 seconds, state-request durations of 17–531 ms, and simulation
time advancing from 30,000 to 31,000 seconds. Its initial pre-response REPLAY display ended when LIVE arrived.
The route finished with `source=eclipse-ditto`, baseline/fixed, no blockage and `staleBadgeSeen=false`.
The local diagnostic JSON is in ignored `tmp/final-acceptance-pdf/live-route.json`; the numerical results
are recorded here without modifying existing evidence. A separate in-app browser inspection was unavailable
because local browser use was disabled in Work settings; no fresh manual visual inspection is claimed.

No application test failure was observed in the completed checks. Diagnostic helper scripts initially hit
Windows console-encoding and command-length limits; ASCII-safe output and a changed-path comparison resolved
those tooling errors. All links in new/modified Markdown resolve, required artifacts are present, and the
protected-file comparison passes.

## Selective document removals

These files were individually reviewed. They are retired development instructions/backlogs, not runtime
dependencies. Their contents remain recoverable from the audited revision, for example
`git show 221ae3e:01_AHMAD_CODEX_WORK.md`. No Git history is rewritten.

| Removed file | Reason |
| --- | --- |
| `01_AHMAD_CODEX_WORK.md` | Completed implementation backlog; superseded by code, tests and dated evidence |
| `02_PROFESSOR_CLAUDE_WORK.md` | Completed frontend handoff checklist; technical contracts and history retained |
| `03_HIGH_SCORE_IMPROVEMENTS.md` | Retired feature planning, not installation or operational documentation |
| `04_AI_JUDGE_READINESS.md` | Duplicated development acceptance planning; factual evidence index retained |
| `05_FINAL_ACCEPTANCE.md` | Superseded acceptance plan; actual results recorded in this report |
| `A6_A11_SCORE_FOCUSED_IMPROVEMENTS.md` | Completed/deferred score-planning backlog; implemented evidence retained |
| `PROFESSOR_CLAUDE_PROMPT.md` | Obsolete copy-paste agent prompt |
| `TEAM_WORK_PLAN.md` | Stale implementation ownership/status duplicated by current maintenance guidance |
| `FINAL_TODO.md` | Outdated final-task list and historical verification counts |
| `START_HERE.md` | Old integration-branch workflow; current contributor procedure now in `COLLABORATION.md` |
| `CORE_SIMULATION_TASKS.md` | Superseded core development task list; model documentation/tests retained |
| `TRAFFIC_SAFETY_CHECKLIST.md` | Old feature checklist; current directional-traffic behavior documented and tested |
| `LOADING_REALISM_CHECKLIST.md` | Superseded visual/loading development checklist; technical contracts retained |

No executable startup, test or packaging dependency on these files was found. Active references were removed
from agent guidance. Historical mentions in `PROJECT_CONTEXT.md` remain explicitly labeled as history.

## Files retained and documentation corrections

- `README.md`, `SUBMISSION.md`, `presentation.pdf` and all presentation sources/assets: submission and reproduction.
- All application source/assets, deployment configuration, verification scripts/tests and existing evidence:
  unchanged to preserve the accepted application.
- `JUDGE_EVIDENCE.md`: factual claim-to-evidence navigation, including historical failures and limitations.
- `DATA_LICENSES.md`, `LICENSE`, third-party license/notice files and technical/data documents: attribution,
  reproducibility and model assumptions.
- `AGENTS.md` and `CLAUDE.md`: retained for ongoing contributor tooling; obsolete imports/instructions removed.
- `COLLABORATION.md`: reduced to current ownership, review and explicit-main-approval procedure.
- `PROJECT_CONTEXT.md`: retained development history and AI assistance provenance, with a current release note.
- `RULES_CHECKLIST.md`: retained rule references with the audited revision and environment caveat.

README corrections align LIVE/Scenarios/graphics labels with the current UI, describe realistic publication
delay, and run the optional scenario verifier inside its Docker image. Startup commands and application
configuration are unchanged. SUBMISSION corrections update test counts, graphics descriptions, affected-lane
behavior, standby location, historical performance context, and the omitted crusher-slowdown trips/h value
(6.88, already present in `ademix/simulator/SCENARIOS.md`). The Team's Concept is not rewritten.

The retained evidence index distinguishes earlier STALE captures from the later reliability fix. Historical
software rendering measured 5.9 average FPS before that fix and 7.2 average / 6.0 low-5% FPS in a later Light-mode
spot check. No rendering optimization or guaranteed performance improvement is claimed by this cleanup.

## Rules, truth and security review

Controlling source reviewed: [official rules, edition 12 October 2026](https://openegiz-contest.github.io/rules/).
Sections 6.2 and 9.3 make working OpenEgiz integration and README startup material to the 40-point cap;
section 6.5 requires the root README, SUBMISSION and presentation PDF. Synthetic data is allowed under
section 6.8 when explained. Section 11.1 prohibits instructions to the Builder/Judges intended to alter their
work or scores. Repository cleanup does not change those requirements or erase public history.

No prohibited judge-directed instruction was identified in the reviewed team documentation, presentation or
targeted tracked-text scan. Existing planning documents addressed implementation and acceptance work;
their removal is repository maintenance, not an assertion that they previously constituted disqualification.
This is a scoped review, not proof that every historical byte or binary has been exhaustively inspected.
The Team's authorship, AI assistance, synthetic-data status and material limitations remain disclosed.

The targeted current-tree credential-pattern scan found no matching access tokens. Deployment `.env` remains
ignored/untracked. Inherited Hono example certificate/key fixtures are preserved as upstream examples, not
treated as live deployment credentials. This was not an exhaustive historical secret audit.

## Remaining limitations and documentation risks

1. Clean Ubuntu execution is still unverified. Do not report PASS or cap avoidance until the exact revision
   completes startup and integration checks on that environment.
2. The bounded browser result does not rule out intermittent future Ditto/MongoDB delays. Earlier STALE
   observations and slow-write evidence remain in `evidence/final-release/`.
3. Software rendering remains slow in the recorded measurements. No new FPS fix was attempted.
4. The nine-page PDF is image-based. All pages render, but page 5 has partially clipped right-hand description
   text, and some screenshots crop information or predate final texture/badge/graphics fixes. Page 8 juxtaposes
   an older fixed/breakdown view with modeled baseline Smart claims; it is not direct evidence of that Smart run.
   The PDF/PPTX/source assets are unchanged as requested.
5. The preserved Concept mentions road closure/rerouting; the implemented scenario is a speed restriction,
   not alternate-route planning. The submission limitations and evidence index explicitly state this boundary.
6. Existing upstream documentation has unresolved links, including `CONTRIBUTING.md` from the OPENEGIZ guides.
   They are not introduced by this cleanup and are outside the README deployment path.
7. Registration eligibility and later organizer clarifications are not independently certified by runtime tests.

The cleanup is documentation only. It is not a new application release, an organizer ruling, or a guarantee
of competition score. Official main must remain at the verified submission unless the Team approves a merge.
