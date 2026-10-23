# 03 — AI judge readiness

Purpose: make the finished mine easy to build, inspect and score from the exact evidence the contest judges use. This is a final verification layer over `FINAL_TODO.md`, not a new feature backlog.

An AI builder follows `README.md` literally. AI judges then inspect the build report, source, `SUBMISSION.md`, `presentation.pdf` and the running interface. They award rubric levels only for behavior they can verify. A strong feature can therefore lose credit when it is hard to find, contradicts another file, or depends on an unrecorded manual step.

## Ownership

- **Ahmad + Codex:** J1, J2 and J6; release integration for J7 and J8.
- **Professor + Claude:** J3, J4 and J5; visual evidence for J7.
- **Both humans:** accept the final visual result and the honest rubric rehearsal.
- Use separate `codex/<feature>` and `claude/<feature>` branches. Integrate through `origin/codex/ademix`; do not edit the other workstream's owned files.

## J1 — Freeze and reproduce the exact candidate

Goal: prove the builder can reach a working stand without team knowledge.

Work:

- choose and record one candidate commit;
- run every `README.md` command literally on clean Ubuntu 24.04 AMD64;
- record start time, finish time, versions, disk use, service health and any failed command;
- run the documented smoke check and scenario matrix from that same commit;
- keep the clean-start log with the candidate evidence.

Pass test:

1. No undocumented command, credential, file or manual repair is needed.
2. The UI, health endpoint and Grafana open within the contest limit.
3. The smoke check reports Eclipse Ditto, exactly 11 twins and the final field/unit contract.
4. Fixed and Smart Dispatch across all four operating conditions pass and reset cleanly.
5. The log names the exact commit and environment; Windows evidence is not used as Ubuntu evidence.

## J2 — Build a claim-to-evidence index

Goal: let a judge verify every high-value claim without searching the repository blindly.

Work:

- create `JUDGE_EVIDENCE.md` after the candidate is frozen;
- map each rubric criterion and every important claim to: the UI action, expected observation, source path, automated check or evidence file, and limitation;
- include the 11-twin model/relationships, simulator → MQTT → Ditto → API → UI path, scenario controls, matched fixed-versus-smart evidence, production history, data provenance and software-rendering evidence;
- link the index from `README.md` and `SUBMISSION.md` using factual navigation only.

Pass test:

1. Every claim in `SUBMISSION.md` and `presentation.pdf` has a verifiable row or is removed.
2. Every row points to a real path and a result from the frozen candidate.
3. A reader can locate proof for all six rubric criteria without guessing a route, command or filename.
4. The file contains no text aimed at influencing or instructing judges; it only describes the product and evidence.

## J3 — Make the first three minutes prove the decision

Goal: show the user, problem, consequence and response before a judge needs deep exploration.

Work:

- finish B1–B6 on Professor + Claude's branch and use only returned OpenEgiz state;
- make the default view show the mine, current production, current bottleneck, cycling/standby trucks and one queue/wait measure;
- provide a short route: baseline → one disruption → visible consequence → Smart Dispatch response → recovery/reset;
- keep technical layers available but closed until requested.

Pass test:

1. A new viewer can identify the dispatcher, the operating decision and the recommendation in three minutes.
2. Every step waits for backend acknowledgement and the header remains truthful about LIVE/DEMO/REPLAY state.
3. Fixed versus Smart values match the frozen comparison fixture.
4. Cancel and reset leave the application in a valid fixed/baseline state.
5. No panel hides the loading face, road consequence or crusher at the reviewed desktop viewport.

## J4 — Rebuild the presentation from the frozen candidate

Goal: ensure the PDF gives the same story and numbers as the application the judges run.

Work:

- preserve the Team's Concept wording;
- use current candidate screenshots, never an earlier mock-up;
- show the decision problem, 11-twin architecture, OpenEgiz flow, working modules/scenarios, matched results, data sources, limitations and exact demo path;
- distinguish synthetic modeled results from measured mine data;
- remove obsolete rerouting, field-count, test-count or fuel claims.

Pass test:

1. Render and visually inspect every PDF page.
2. Every number and feature matches `SUBMISSION.md`, the evidence index and the frozen runtime.
3. Text remains readable at normal page view; no clipping, overlap or broken image appears.
4. A second team member follows the PDF demo steps successfully on the frozen stand.

## J5 — Prove software-rendering usability

Goal: show that the 3D command center remains understandable in the judge's no-GPU environment.

Work:

- test the final default route with software WebGL rendering and Balanced quality;
- record browser, renderer, machine, viewport, time to first usable frame and frame-rate range;
- exercise Overview, selection, camera movement, panels, each scenario and reset;
- capture the opening view and the most important disruption/response view from the frozen candidate.

Pass test:

1. The complete three-minute route finishes without a WebGL error, prolonged freeze or missing local asset.
2. Controls remain usable and essential state remains readable at the tested viewport.
3. The Team records and applies one acceptance threshold chosen before measurement.
4. Evidence identifies the exact candidate commit and does not use a faster development configuration.

## J6 — Run an adversarial truth and integrity audit

Goal: remove contradictions and disqualification risks before submission.

Work:

- scan tracked text, source, generated data, UI strings and presentation content for judge-manipulation instructions, secrets, private data and unsupported claims;
- check stale terms such as road closure/rerouting, obsolete twin/field/test counts, old screenshots and inconsistent units;
- verify all runtime assets are local or reliably built, with license and provenance recorded;
- check that LIVE cannot appear when the API is using fallback/demo data.

Pass test:

1. Repository-wide searches and manual review find no judge-directed prompt, credential or private data.
2. README, SUBMISSION, PDF, source and UI agree on behavior, counts, units and limitations.
3. Each third-party asset/data item has a compatible license and attribution.
4. Disconnect/recovery testing never displays false live state.

## J7 — Perform a strict rubric rehearsal

Goal: find the weakest provable criterion before the real judges do.

Work:

- Ahmad/Codex and Professor/Claude independently score the frozen candidate from 0–4 for all six rubric criteria;
- use only the build log, source, documents, PDF and runtime evidence available in the repository;
- write one evidence paragraph and one remaining weakness for every score;
- fix the lowest scoring release-safe weakness, then repeat once.

Pass test:

1. All six criteria have evidence-based scores; no score relies on team memory or an unfinished branch.
2. Differences between the two reviews are reconciled by inspecting evidence, not averaging guesses.
3. Any criterion below level 3 has an explicit fix or an honest limitation recorded before J8.
4. The rehearsal is an internal quality check and contains no content intended for the contest judges.

## J8 — Submit and verify official `main`

Goal: ensure the evaluated branch contains the exact accepted candidate.

Work:

- complete all mandatory `RULES_CHECKLIST.md` gates and obtain human visual acceptance;
- merge the accepted candidate to official `main` before the deadline;
- fetch GitHub again, record remote `main` SHA and inspect the root files/assets;
- perform a final clean-clone startup and smoke check from that SHA;
- preserve final logs, screenshots and hashes for a factual appeal if needed.

Pass test:

1. `origin/main` resolves to the accepted candidate and has no missing committed asset.
2. Root README, SUBMISSION, presentation, license and implementation are present.
3. Clean-clone startup, smoke check and the short judge route pass from remote `main`.
4. The final checklist records exact commands, observed results, evidence paths, owners and remaining limitations.

## Order and stop rule

Run J1 first. J2 can start from the frozen candidate while Professor + Claude complete J3 and J5. Complete J4 after the interface is final, then J6, J7 and J8. Any failed J1, J4, J5 or J6 test blocks release to `main` until the cause is fixed or the unsupported claim is removed.

Do not start a large new mine feature now. A second face, alternate route or new model helps only after J1–J8 pass; before that, it increases the chance of build failure, contradiction or weak evidence.
