# Competition Rules Checklist

Source of truth: <https://openegiz-contest.github.io/rules/>  
Controlling edition reviewed: **12 October 2026**. If translations differ, the Russian rules control.

Use this file as a release gate. A checked item means it has been verified in the final `main` branch, not merely planned.

## Authority and Rule Changes

- The official competition rules govern the submission.
- Official organizer answers in the competition's GitHub Discussions interpret the rules.
- Other informal answers do not have official status.
- The rules are published in Russian, English, and Kazakh; the Russian text prevails if translations differ.
- All competition times use Astana time (UTC+5).
- The scoring rubric dated 12 October 2026 and the final-word tie rule will not change.
- Other rule changes must be published as a dated revision and announced in GitHub Discussions; deadlines may only move later.
- [ ] Recheck the rules revision and official GitHub Discussions before final submission.

## Eligibility and Team

- Individuals may participate; participants under 18 require legal-representative consent.
- A participant may belong to only one team.
- Teams may contain one to four registered participants.
- Any development tools, including AI tools, are allowed.
- Team membership becomes fixed when registration closes.
- The winner's cash prize is divided equally among the registered team members at the registration deadline.
- [x] Both team members are included in the submitted registration before the freeze.
- [x] Registered team: Ademix; GitHub users `ahmadshahyawar` and `TurkenGulzat`.

## Deadline and Submission

- [ ] Final work is merged into `main` before **25 October 2026, 23:59 Astana time (UTC+5)**.
- [ ] `main` differs materially from the organizer's template.
- [ ] All required files and assets are committed; nothing depends on an uncommitted local file.
- [ ] Team composition and GitHub usernames match registration.

At the freeze, write access is removed, the final commit on `main` is recorded, and the repository becomes public and read-only. Other branches, open pull requests, and post-freeze changes are ignored.

## Mandatory Root Files

- [ ] `README.md` contains complete installation and launch instructions from a clean machine.
- [ ] `SUBMISSION.md` follows the organizer's template and begins with the team-authored Concept section.
- [x] `presentation.pdf` clearly explains the verified solution and how to view it on the running stand.
- [ ] The repository is licensed under MIT as required by the competition.

The official solution consists of the complete contents and Git history of the team repository's frozen `main` branch. Do not include secrets, private data, credentials, or material that cannot be made public.

## Concept Requirements

The first section of `SUBMISSION.md` must state:

- [ ] What mine, enterprise, or facility is represented.
- [ ] Who uses the digital twin.
- [ ] What operational decision it helps that user make.
- [ ] Why the team selected this problem.
- [ ] For a fictional mine, which real operations it resembles and the sources of numerical parameters.

Our current concept: a 3D open-pit haulage and crusher optimization twin for a mine dispatcher.

## OpenEgiz Architecture — Non-Negotiable

- [x] Mine objects are represented as Eclipse Ditto twins.
- [x] Operational data flows through the platform using MQTT to Ditto.
- [x] The user interface obtains operational state from the platform.
- [x] The 3D scene displays actual twin data rather than an independent mock simulation.
- [x] Simulation/application services are included in the Docker Compose deployment.

Failure to launch from `README.md`, or failure to build genuinely on OpenEgiz, caps the score at 40 and makes the solution ineligible to win.

## Modules and What-If Scenarios

For every claimed module:

- [ ] `SUBMISSION.md` explains what it does.
- [ ] `SUBMISSION.md` explains exactly how to observe it on the running stand.
- [ ] Its operation can be verified in the interface or source code.

For every claimed what-if scenario:

- [x] It can be launched from the running stand without editing code.
- [x] It changes underlying twin state.
- [x] Its effects propagate to related twins.
- [x] Its effects appear in the 3D visualization and metrics.
- [x] `SUBMISSION.md` explains how to activate it.
- [x] `SUBMISSION.md` explains how to cancel/reset it.

Planned scenarios: truck breakdown, road closure with rerouting, and reduced crusher capacity.

HT-01 breakdown gate verified on 2026-10-23: the running stand changed Ditto
twin state, stopped only HT-01 at zero speed, preserved FIFO/resource progress,
reduced first-hour throughput from 770.0 to 581.6 t/h, and reset without stale
breakdown or blocked state.

Final scenario integration gate verified on 2026-10-23 with
`ademix/simulator/verify_scenarios.py`: baseline, truck breakdown, road
restriction, and crusher slowdown all propagated through the frontend proxy,
API, simulator, MQTT, and Eclipse Ditto. All 11 twins and every field consumed
by the frontend were present; the final reset removed stale scenario state.

## Data and Assumptions

- [ ] `SUBMISSION.md` contains a `Data and Assumptions` section.
- [ ] Synthetic and real data are clearly distinguished.
- [ ] Every significant simulation parameter has a credible source or explicit justification.
- [ ] Dataset sources and licenses are recorded.
- [ ] Copied datasets permit redistribution.
- [ ] Required datasets are committed or downloaded reliably by `README.md`.
- [ ] No confidential organizational data or personal data is used.
- [ ] Required attribution and original license text are preserved.

Preferred haulage reference: the organizer-listed OpenMines `north_pit_mine.json` dataset, calibrated with cited equipment specifications where necessary.

## Judge Environment

The final solution must work in:

- amd64 KVM virtual machine;
- Ubuntu 24.04.5 LTS;
- 8 vCPU;
- 16 GiB RAM;
- 60 GB disk, approximately 55 GB initially free;
- Docker Engine 29.1.3;
- Docker Compose 2.40.3;
- Buildx 0.30.1; and
- a **75-minute total startup limit**.

Release checks:

- [ ] Installation does not assume `make` or other non-default software is already installed.
- [ ] All prerequisites are installed by explicit `README.md` steps.
- [ ] No API keys, paid services, organizer accounts, or private network access are required.
- [ ] Services bind to `localhost`/`127.0.0.1` where appropriate.
- [ ] Critical scripts, fonts, models, textures, and UI assets are stored in or built from the repository.
- [ ] The complete `README.md` procedure succeeds literally without manual intervention.
- [ ] A clean judge-like VM test has been completed and recorded.

## 3D Performance Requirements

The judge environment supports WebGL but renders **without GPU acceleration**.

- [ ] The scene remains usable under software rendering.
- [ ] Low-poly or optimized GLB models are used.
- [ ] Texture resolution and total download size are controlled.
- [ ] Repeated trucks and props use instancing where supported.
- [ ] Expensive shadows, reflections, post-processing, particles, and physics are limited or optional.
- [ ] A quality setting or automatic low-quality mode is available.
- [ ] Essential state remains understandable even if decorative effects are disabled.
- [ ] The scene loads without relying on fragile external CDNs.

## Fixed Scoring Rubric

| Criterion | Maximum | Evidence we must provide |
| --- | ---: | --- |
| Mine model | 25 | Rich twin types, states, hierarchy, and meaningful relationships |
| Mine visualization | 25 | Spatial 3D view showing twin data, processes, and scenario consequences |
| Behavioral credibility | 20 | Plausible values, connected processes, constraints, and cited assumptions |
| Concept and presentation | 15 | Real decision problem, coherent design, sourced figures, accurate PDF |
| What-if scenarios | 10 | On-stand controls with propagated twin effects and reset behavior |
| Modules | 5 | Working functionality that changes operations or produces a decision |

Only work created by the team and verified on the stand or in source code earns points. Unchanged parts of the Example Mine do not earn points.

Each judge assigns a level from 0 to 4 for each criterion. The criterion score is its maximum multiplied by the level and divided by four. The preliminary score is the arithmetic mean of the judges' scores. The ten highest-scoring eligible solutions advance to the final; if fewer than ten solutions exist, all advance.

The AI evaluation process is:

1. An AI builder follows `README.md` literally in an isolated judge environment and writes a build report.
2. AI judges independently inspect the build report, source code, `SUBMISSION.md`, `presentation.pdf`, and the running interface.
3. Unsupported claims in documents or slides earn no credit.
4. Published build reports, scores, reasoning, and judge logs form the evidence for any appeal.

## Integrity and Disqualification

- [ ] Repository text, source, data, presentation, and interface contain no instructions intended to manipulate the builder or AI judges.
- [ ] Prompts used by the solution's own features are clearly part of product functionality, if any.
- [ ] Third-party source code and assets have compatible licenses and required attribution.
- [ ] Claims in `SUBMISSION.md` and `presentation.pdf` match what can actually be demonstrated.

Any hidden or explicit instruction intended to manipulate the AI builder or judges can disqualify the solution. Human-facing instructions and prompts genuinely used by the solution's own AI features are permitted.

## Results, Appeals, and Final

- Preliminary evaluation runs from 26–28 October 2026.
- Preliminary reports must be published no later than 28 October 2026 at 12:00 Astana time.
- An appeal may be filed within 48 hours after reports are published.
- Appeals are limited to factual errors in the build report or an incorrect prompt-injection finding; disagreement with a score is not appealable.
- A successful appeal triggers a corrected build report and reevaluation, and the final score cannot be reduced as a result.
- The final takes place live on YouTube on 31 October 2026.
- Judges choose first through third place by majority. If no majority is reached after the final permitted round, the remaining finalist with the highest preliminary score wins the place; a remaining tie is broken first by Mine Model score, then by earlier registration.
- [ ] Preserve clean-start logs and test evidence that could support a factual appeal.
- [ ] Team members remain available during the preliminary-results and appeal period.

## Prize and Winner Obligations

- First prize is 1,000,000 KZT, divided equally among registered members of the winning team.
- Second and third place receive certificates plus an internship or employment offer; their solutions are published on the OpenEgiz website.
- No cash prize is awarded if no solution scores more than 40 points.
- The winner must confirm participation within 72 hours of the result by email to the organizer or through the competition's GitHub Discussions.
- The winner must give an in-person or online presentation by 30 November 2026 as a condition of receiving the prize.
- Each winner is responsible for applicable taxes, fees, and banking costs on their share.
- [ ] If selected as winner, confirm within 72 hours.
- [ ] If selected as winner, arrange and deliver the required presentation by 30 November 2026.

## Final Evidence Package

- [ ] Screenshot showing the entire 3D mine and live operating state.
- [ ] Screenshots or short demo showing each scenario and its effects.
- [ ] Architecture diagram showing simulator → MQTT → Ditto → data store/UI/3D.
- [ ] Twin schema and relationship diagram.
- [ ] Baseline-versus-scenario metrics.
- [ ] Clean-start logs and smoke-test results.
- [ ] Optional video link included in `SUBMISSION.md` if completed.

