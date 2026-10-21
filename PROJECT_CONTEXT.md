# Digital Mine on OpenEgiz — Shared Project Context

> This file is the shared source of truth for the two-person team and all AI assistants working on the repository. Read it before making changes and update it after completing meaningful work.

## Project Goal

Build a compelling digital twin of a mining enterprise on the open OpenEgiz platform for the **Digital Mine on OpenEgiz** competition.

The project should model a mine or one of its major facilities, such as:

- an open-pit mine;
- an underground mine; or
- a mineral processing plant.

The team may choose its own functional modules. Possible modules include equipment operations, haulage and transportation, ventilation, production systems, operational analytics, forecasting, and interactive **what-if scenarios**.

## Team

- Team size: **2 people**
- Team name: **Ademix**
- Registration status: **Submitted / participating**
- Working method: both team members will contribute to the same GitHub repository, with assistance from Codex and Claude.

| Team member | Primary responsibilities | Current focus |
| --- | --- | --- |
| Ahmad Shah Yawar (`ahmadshahyawar`) | Product decisions and final review; technical work assisted by Codex and Claude | Repository access and project initiation |
| Turken Gulzat (`TurkenGulzat`) | Product decisions and final review; technical work assisted by Codex and Claude | Awaiting official repository invitation |

## Competition Summary

- Organizer: **DigitalEgiz Laboratory**
- Competition: **Digital Mine on OpenEgiz**
- Grand prize: **1,000,000 KZT**
- Submission languages: Kazakh, Russian, or English
- Development tools: unrestricted; AI technologies are allowed
- Submission method: the completed project must be submitted through the team's GitHub repository in accordance with the organizers' requirements.
- Official rules and registration: <https://openegiz-contest.github.io/rules/>
- Announcement: <https://farabi.university/news/107347?lang=en>
- Implementation release gate: [`RULES_CHECKLIST.md`](RULES_CHECKLIST.md)

## Important Dates

All dates are in 2026. Confirm the applicable timezone in the official rules before relying on the deadline.

| Date | Milestone |
| --- | --- |
| October 25, 23:59 | Registration and project submission deadline |
| October 26–30 | Preliminary evaluation, results, and appeals |
| October 31 | Live final broadcast on YouTube |

## Evaluation Priorities

The fixed rubric published in the 12 October 2026 rules awards up to **100 points**:

| Criterion | Points |
| --- | ---: |
| Mine model | 25 |
| Mine visualization | 25 |
| Behavioral credibility | 20 |
| Concept and presentation | 15 |
| What-if scenarios | 10 |
| Modules | 5 |

The ten highest-scoring projects in preliminary evaluation advance to the live final.

## Product Direction

The current agreed concept is a **3D open-pit haulage and crusher optimization digital twin**. Its primary user is a mine dispatcher who needs to maximize ore movement and crusher throughput while reducing queues, idle time, cycle time, and avoidable fuel use.

The main experience should be a polished 3D mine command center, not a separate decorative animation. The 3D scene must visualize live state originating in OpenEgiz digital twins and make operational changes understandable.

Planned 3D elements include:

- terraced open-pit terrain and haul roads;
- moving haul trucks with operational status and payload;
- excavators, loading areas, crusher, stockpile, and waste dump;
- selectable equipment with live details;
- route highlighting, queue visualization, alerts, and status colors;
- purposeful motion such as loading, hauling, unloading, crusher activity, and stockpile growth;
- smooth camera presets and transitions; and
- visible effects of what-if scenarios with baseline-versus-scenario metrics.

Target scenarios are a truck breakdown, a road closure with rerouting, and reduced crusher capacity. The final selection may change after the competition repository is inspected.

The selected implementation direction is **React, TypeScript, and React Three Fiber** for the 3D command center, with **Python** for simulation and dispatch logic. It will integrate with OpenEgiz through MQTT, Eclipse Ditto, InfluxDB, and Docker Compose. Unity is intentionally avoided because its editor- and asset-heavy workflow is less suitable for AI-first, code-driven development and rapid automated review.

Technology choices must favor Codex/Claude effectiveness and token efficiency:

- prefer code-first tools, declarative configuration, and small reusable components;
- extend the official OpenEgiz template instead of rebuilding platform infrastructure;
- keep one frontend and one simulation service rather than unnecessary microservices;
- use typed schemas and shared configuration to reduce duplicated logic;
- use procedural or reusable low-poly 3D elements where practical;
- avoid large generated files, copied boilerplate, and needless abstractions;
- keep documentation concise but sufficient for the AI builder and judges; and
- reserve context files for decisions, status, interfaces, and handoffs rather than verbose work logs.

A strong submission should ideally provide:

- a clear mine layout and understandable operational flow;
- a simulation based on explicit assumptions and units;
- useful real-time or simulated operational metrics;
- at least one meaningful what-if scenario with before/after comparison;
- attractive, legible visualization;
- reproducible setup and demo instructions;
- documented data sources, formulas, limitations, and assumptions; and
- a polished presentation suitable for an AI jury and a live final.

## Current Status

**Last updated:** 2026-10-22

- The team has registered for the competition.
- The submitted registration records team name **Ademix** with GitHub users `ahmadshahyawar` and `TurkenGulzat`.
- The organizer invitation was received and the official Team Repository is <https://github.com/openegiz-contest/team-111>.
- The local work now uses the organizer's OpenEgiz v1.0.4 template as its base; the previous personal repository remains configured only as the `personal` backup remote.
- The local project workspace has been created.
- The team has agreed to pursue a polished 3D solution.
- The working concept is an open-pit haulage and crusher optimization twin.
- The official rules have been converted into `RULES_CHECKLIST.md`.
- `RULES_CHECKLIST.md` is the internal rulebook for requirements, judging, licensing, integrity, appeals, final-stage duties, and release verification; agents must consult it before implementation and submission work.
- The judge provides WebGL without GPU acceleration, so the 3D scene must be optimized for software rendering.
- Codex and Claude will perform the principal planning, implementation, integration, testing, and documentation work.
- The human team does not need to install or manually operate every development tool; the final repository must nevertheless include everything required to run reliably in the judge's Ubuntu/Docker environment.
- The technology direction is React + TypeScript + React Three Fiber for 3D and Python for simulation, integrated with the OpenEgiz stack.
- Docker Desktop is installed and verified with Linux containers on the development computer: x86-64, 8 CPUs, and approximately 8 GB assigned memory.
- Official competition repository: <https://github.com/openegiz-contest/team-111>
- Personal backup repository: <https://github.com/ahmadshahyawar/Digital-Mine-on-OpenEgiz>
- The initial React/Python foundation, OpenMines calibration file, and Docker Compose overlay are present on local branch `codex/ademix`.
- `REUSE_CATALOG.md` records the license-checked reuse strategy. The first selected visual source is the CC0 Ore Processing and Haulage Plant pack; exact models are not yet committed.
- The simulator and frontend Docker images both build successfully. The frontend now has a dependency lock file and uses `npm ci` for reproducible builds.
- The deterministic model now conserves ore through a ROM inventory, processes it at scenario-dependent crusher capacity, and has eight passing unit tests.
- The root `README.md` now contains literal judge startup, verification, reset, Windows, architecture, and repository instructions. `SUBMISSION.md` documents every current module/scenario, data assumptions, verification status, and limitations.

## Immediate Decisions and Tasks

- [x] Add the GitHub repository URL.
- [x] Add both team members' names and GitHub usernames.
- [x] Review the official rules and record the scoring weights.
- [x] Convert the official rules into a release checklist.
- [x] Select an initial facility and concept: 3D open-pit haulage and crusher optimization.
- [x] Define the initial user story: help a dispatcher respond to disruption and improve production flow.
- [x] Select React Three Fiber instead of Unity for AI-first, code-driven implementation.
- [x] Define the simulation assumptions, inputs, outputs, and validation method.
- [x] Select the what-if scenarios.
- [ ] Create an implementation plan split between the two team members.
- [ ] Define the final demo, screenshots/video, documentation, and presentation deliverables.
- [ ] Confirm submission mechanics and deadline timezone.

## Collaboration Rules

### Before starting work

1. Read this entire file.
2. Inspect the repository and recent Git history.
3. Check the current status, active tasks, decisions, and known issues below.
4. Avoid duplicating work already assigned to the other team member or assistant.
5. Do not overwrite unrelated or uncommitted changes.

### While working

- Keep changes focused and reviewable.
- Use a separate branch for substantial work when practical.
- Record important architectural and product decisions in this file.
- Document assumptions, units, formulas, and data sources next to simulation code.
- Never fabricate mining data or claim simulation accuracy without stating the validation basis.
- Keep secrets, tokens, credentials, and private datasets out of Git.
- Keep the human workflow simple: ask the team for repository access, business choices, and visual feedback, while AI assistants handle technical implementation wherever possible.
- Treat the 3D scene as a live view of OpenEgiz twin state. Do not create a disconnected mock animation and present it as a digital twin.
- Review licenses and preserve required attribution for all reused code, models, textures, fonts, datasets, and other assets.
- Prefer adapting proven free/open-source components and organizer-recommended datasets over rebuilding commodity functionality, but verify each license before copying and record included material in `DATA_LICENSES.md`.

### After meaningful work

Update the following sections before handing off:

- **Current Status**
- **Active Work**
- **Completed Work Log**
- **Decisions**
- **Known Issues and Risks**
- **Next Recommended Action**

Include changed paths, tests or checks performed, and anything the next contributor must know.

## Active Work

| Owner | Task | Branch | Status | Notes |
| --- | --- | --- | --- | --- |
| Codex | Integrate and validate the Ademix foundation on the official template | `codex/ademix` | In progress | Source and local tests progressing; complete OpenEgiz pull is blocked until the Windows C: drive has substantially more free space |

## Completed Work Log

| Date | Contributor | Work completed | Verification |
| --- | --- | --- | --- |
| 2026-10-21 | Codex | Created the shared project context and assistant guidance files | Files reviewed locally |
| 2026-10-21 | Codex | Reviewed the official rubric and recorded the agreed 3D project direction | Context updated locally |
| 2026-10-21 | Codex | Connected the workspace to the competition repository and verified its current state | Remote is reachable but contains no branches or commits |
| 2026-10-21 | Codex | Converted the official rules and judge-environment constraints into a release checklist | `RULES_CHECKLIST.md` created |
| 2026-10-22 | Codex | Verified Docker Desktop, Compose, Linux-container mode, engine resources, registry download, and container execution | Official `hello-world` container completed successfully |
| 2026-10-22 | Codex | Rebased the project foundation onto the official `openegiz-contest/team-111` template while retaining the personal repository as a backup remote | Official `origin/main` fetched; local branch `codex/ademix` contains the preserved work |
| 2026-10-22 | Codex | Created a license-first reuse catalog covering mining simulation, CC0 mining/industrial assets, 3D performance tooling, charts, and rejected sources | Sources classified as Adopt, Shortlist, Reference, or Reject in `REUSE_CATALOG.md` |
| 2026-10-22 | Codex | Filled the organizer's required Concept and Team sections from the team's agreed direction and added team copyright | `SUBMISSION.md` and `LICENSE` updated locally |
| 2026-10-22 | Codex | Built the React/Three.js production image and locked frontend dependencies | `docker build -t ademix/mine-ui:test ademix/frontend` passed; Vite produced the production bundle |
| 2026-10-22 | Codex | Corrected crusher mass flow, added ROM inventory and visible baseline/scenario projections, and added deterministic tests | Eight `unittest` checks pass; Python compilation and JSON parsing pass |
| 2026-10-22 | Codex | Replaced the organizer placeholder README and completed the current submission narrative | Local frontend `npm ci && npm run build` passed; README instructions and SUBMISSION claims reviewed against implemented code |
| 2026-10-22 | Codex | Attempted the first full OpenEgiz + Ademix startup and recovered Docker after its WSL2 backend timed out | Compose configuration passed; pull could not finish because C: reached zero free space, so no end-to-end success is claimed |

## Decisions

| Date | Decision | Reason | Owner |
| --- | --- | --- | --- |
| 2026-10-21 | Use `PROJECT_CONTEXT.md` as the shared project memory | Keeps human and AI contributors aligned through one maintained source of truth | Team |
| 2026-10-21 | Build a 3D open-pit haulage and crusher optimization twin | Strong fit for spatial visualization, credible simulation, and visible what-if scenarios | Team |
| 2026-10-21 | AI assistants handle most technical work | The human team should focus on access, decisions, feedback, and final review rather than complex setup | Team |
| 2026-10-21 | Keep 3D but optimize for CPU/software WebGL rendering | The official judge environment has no graphics acceleration | Team |
| 2026-10-22 | Use React, TypeScript, React Three Fiber, and Python; avoid Unity | Codex and Claude work most effectively with code-first stacks, enabling faster implementation, review, and repair with lower context overhead | Team |
| 2026-10-22 | Optimize the collaboration process for token efficiency | The short deadline favors concise interfaces, limited services, reusable components, and minimal duplicated context | Team |
| 2026-10-22 | Reuse licensed open data and visual assets where practical | Adapting proven components saves time, while license-first review protects submission eligibility | Team |
| 2026-10-22 | Use the official `team-111` repository as `origin` and retain the personal repository as `personal` | The frozen official repository is the evaluated submission; retaining the old remote preserves a separate backup destination | Team |
| 2026-10-22 | Use a small subset of the CC0 3DAssets.dev Ore Processing and Haulage Plant pack | It provides coherent mining-specific plant visuals without requiring the team to model the crusher system from scratch | Team |

## Known Issues and Risks

- The remaining competition schedule is short; scope must be chosen quickly.
- The detailed simulation validation method and baseline-versus-scenario evidence still need to be completed.
- A visually impressive scene that does not receive its operational state through OpenEgiz would fail the core platform requirement.
- Third-party repositories and 3D assets create licensing, attribution, compatibility, and performance risks that must be checked before use.
- The initial frontend JavaScript bundle is about 990 kB before gzip (274 kB gzip); it builds successfully but should be split or reduced after the full data path works.
- The selected CC0 mining asset service was temporarily unavailable on 2026-10-22; no unverified or incomplete asset was committed.
- The development computer's C: drive has effectively no free space. The full OpenEgiz image set cannot be downloaded and Docker cleanup cannot complete reliably at that capacity. A clean end-to-end run requires freeing several gigabytes on C: or moving Docker's disk image to a larger drive; this is a local validation blocker, not a judge-environment dependency.
- Local ports 1883 and 8090 were already occupied during preflight. After storage is resolved, identify the owners or use non-default development ports in the ignored `.env`; keep judge defaults unchanged.
- AI-based judging makes explicit documentation, reproducibility, and visible evidence especially important.
- Concurrent work in one repository can cause conflicts unless task ownership and branches are kept current.

## Next Recommended Action

Free substantial C: storage or move Docker Desktop's data disk to a larger drive, then complete the full MQTT → Ditto → UI smoke test. Meanwhile, continue source-level UI, simulation, documentation, and static validation without adding large assets.

## Handoff Template

Copy and complete this block after each work session:

```text
Date:
Contributor:
Goal:
Completed:
Files changed:
Checks/tests run:
Decisions made:
Known issues:
Next action:
```

