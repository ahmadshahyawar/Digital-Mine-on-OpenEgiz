# Contributor maintenance workflow

Ademix was developed by Ahmad Shah Yawar and Professor with assistance from Codex and Claude.
The contribution history and dated handoffs are retained in `PROJECT_CONTEXT.md` and Git.

## Ownership

| Area | Owner |
| --- | --- |
| Simulator, dispatch, MQTT/Ditto API, data contracts and backend tests | Ahmad + Codex |
| Frontend, 3D scene, interface, visual assets and visual acceptance | Professor + Claude |
| Release integration, shared documentation, deployment and presentation integration | Ahmad + Codex, coordinating with the relevant owner |

Preserve existing contributor work. Review the latest changes and agree on a handoff before editing another
owner's paths. Field names, units, scenario semantics and reset behavior are defined by the technical contracts
under `ademix/simulator/` and `ademix/data/`.

## Change procedure

1. Fetch `origin`, inspect the working tree and current contributor handoffs.
2. Start a focused `codex/<task>` or `claude/<task>` branch from the latest official `origin/main`.
3. Record the owner, paths and purpose in the current section of `PROJECT_CONTEXT.md` before shared-file edits.
4. Make only the requested changes. Preserve the Team's Concept, source attribution, licenses and limitations.
5. Run appropriate checks. Application changes require the unit/data suites, production build, live Ditto smoke,
   scenario matrix/reset and affected browser route. Documentation-only changes require reference/dependency
   checks and verification that protected code and assets are unchanged.
6. Push a coherent feature branch and record its commit, changed paths, actual test results and limitations.
7. The integrator combines approved work and verifies the remote commit. Official `main` changes require explicit
   Team approval.

The former A/B/C implementation plans have been retired after integration. Their history is recoverable from
Git; they are not an active feature backlog. Avoid concurrent edits to shared files and never resolve conflicts
by blindly taking one contributor's entire version.

## Release records

Use `README.md` for startup and operation, `SUBMISSION.md` for scope and limitations, `DATA_LICENSES.md` for
provenance, and `JUDGE_EVIDENCE.md` for factual evidence navigation. Report clean Ubuntu results separately from
Windows/Docker Desktop results. Never fabricate test results, hide limitations, or commit deployment credentials.
