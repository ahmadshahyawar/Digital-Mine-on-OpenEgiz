# Team collaboration protocol

This file prevents Ahmad/Codex and Turken/Claude from implementing or merging the same work twice.

## Current ownership

| Area | Owner | Paths |
| --- | --- | --- |
| 3D presentation and frontend UX | Turken + Claude | `ademix/frontend/src/TerrainStage.tsx`, `IngestionLayer.tsx`, `ingestion.css`, visual models and visual assets |
| Simulation, what-if behavior, OpenEgiz/API and automated tests | Ahmad + Codex | `ademix/simulator/`, scenario state transitions, MQTT/Ditto integration, Python tests |
| Data evidence and generated replay bundle | Codex generates; Claude consumes | `ademix/data/`, `ademix/frontend/public/data/ingestion.json` |
| Release integration | One designated integrator at a time | `main.tsx`, `README.md`, `SUBMISSION.md`, `PROJECT_CONTEXT.md`, `presentation/`, Compose files |

Ownership is temporary and may be changed in `PROJECT_CONTEXT.md` before work begins. An agent must not edit another owner's paths without recording a handoff first. Claude owns the accepted visual scene; Codex must not restyle or replace it unless the Team explicitly transfers that task. Claude must not change simulator behavior to make a visual effect work; it consumes the documented twin fields instead.

## Branch rules

1. Never work directly on `main`.
2. Each task uses one branch named for its owner and purpose: `codex/...` or `claude/...`.
3. Before coding, fetch `origin`, read `PROJECT_CONTEXT.md`, and add the task to **Active Work** with owner, branch, and exact paths.
4. Commit a coherent checkpoint before another agent integrates it. Do not hand off an uncommitted working tree.
5. Open one pull request into the integration branch. Do not merge related stacked branches separately.
6. The integrator reviews changed files, resolves conflicts deliberately, runs all checks, and only then merges to `main`.
7. At the start of every AI session, run `git fetch origin`, compare the working branch with both `origin/codex/ademix` and `origin/claude/data-asset-layer`, and report overlapping changed paths before editing.
8. Never use an automatic conflict resolution such as “take ours/theirs” for a shared file. The designated integrator composes shared files intentionally.

## Current Claude branch relationship

`claude/data-asset-layer` is stacked on `claude/what-if-scenarios`, which is stacked on `claude/core-simulation-engine`. Therefore, integrate only `claude/data-asset-layer` if the team wants the full Claude work. Merging all three would duplicate history and create unnecessary conflict resolution.

## Shared-file handoff

Files in the release-integration row are a lock zone. Before changing one, write a short message in **Active Work**:

```text
Owner / branch / exact files / purpose / expected handoff
```

Only the listed owner edits those files until the checkpoint is committed or the ownership entry is removed. Documentation is reconciled after code integration, not independently on both branches.

## Cross-layer contract: truck breakdown

Codex owns the behavior and publishes tested twin state: the selected truck enters `breakdown`, speed becomes zero, occupied resources are released, queues/throughput react, recovery is deterministic, and reset removes stale effects. Claude owns only the presentation of that state: the correct truck visibly stops, receives a breakdown marker/alert, and the UI explains the operational consequence. Neither side duplicates the other's logic.

## Integration order for current work

1. Each owner commits and pushes only owned files on their branch.
2. The owner writes a handoff containing commit SHA, exact paths, interface changes, tests, and screenshots if visual.
3. Use one temporary `integration/...` branch based on the chosen release candidate.
4. Integrate Codex engine/API commits first, then Claude frontend commits against the documented twin contract.
5. The integrator alone resolves `main.tsx`, documentation, Compose, generated replay data, and presentation files.
6. Run frontend build, all Python tests, Compose build/start, every what-if smoke check, and visual review before merging to `main`.

## Definition of done for a handoff

- changed files and purpose are listed;
- tests and unverified items are stated truthfully;
- third-party licenses are recorded;
- no credentials or generated junk are committed;
- the branch is pushed and has one clear pull request;
- the next owner knows whether to merge, cherry-pick, or reject it.
