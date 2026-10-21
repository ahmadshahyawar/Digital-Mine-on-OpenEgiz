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
- Competition repository: <https://github.com/ahmadshahyawar/Digital-Mine-on-OpenEgiz>
- Repository inspection on 2026-10-21 found no remote branches or commits; it is currently empty.

## Immediate Decisions and Tasks

- [x] Add the GitHub repository URL.
- [x] Add both team members' names and GitHub usernames.
- [x] Review the official rules and record the scoring weights.
- [x] Convert the official rules into a release checklist.
- [x] Select an initial facility and concept: 3D open-pit haulage and crusher optimization.
- [x] Define the initial user story: help a dispatcher respond to disruption and improve production flow.
- [x] Select React Three Fiber instead of Unity for AI-first, code-driven implementation.
- [ ] Define the simulation assumptions, inputs, outputs, and validation method.
- [ ] Select the what-if scenarios.
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
| Codex | Create the initial project foundation in the empty competition repository | Not set | Ready | Awaiting approval of the first implementation plan |

## Completed Work Log

| Date | Contributor | Work completed | Verification |
| --- | --- | --- | --- |
| 2026-10-21 | Codex | Created the shared project context and assistant guidance files | Files reviewed locally |
| 2026-10-21 | Codex | Reviewed the official rubric and recorded the agreed 3D project direction | Context updated locally |
| 2026-10-21 | Codex | Connected the workspace to the competition repository and verified its current state | Remote is reachable but contains no branches or commits |
| 2026-10-21 | Codex | Converted the official rules and judge-environment constraints into a release checklist | `RULES_CHECKLIST.md` created |
| 2026-10-22 | Codex | Verified Docker Desktop, Compose, Linux-container mode, engine resources, registry download, and container execution | Official `hello-world` container completed successfully |

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

## Known Issues and Risks

- The official rules have not yet been converted into a requirements checklist.
- The remaining competition schedule is short; scope must be chosen quickly.
- Data sources and the detailed simulation methodology remain undecided until the official competition repository is inspected.
- A visually impressive scene that does not receive its operational state through OpenEgiz would fail the core platform requirement.
- Third-party repositories and 3D assets create licensing, attribution, compatibility, and performance risks that must be checked before use.
- AI-based judging makes explicit documentation, reproducibility, and visible evidence especially important.
- Concurrent work in one repository can cause conflicts unless task ownership and branches are kept current.

## Next Recommended Action

Create the initial repository foundation from the official OpenEgiz template and convert the selected React/Python architecture into an implementation plan divided between Codex and Claude.

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

