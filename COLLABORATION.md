# Team collaboration protocol

This file prevents Ahmad/Codex and Turken/Claude from implementing or merging the same work twice.

## Current ownership

| Area | Owner | Paths |
| --- | --- | --- |
| 3D mine, terrain, roads, equipment, camera, materials | Ahmad + Codex | `ademix/frontend/src/TerrainStage.tsx`, `GroundMaterial.ts`, `GraphicsSettings.tsx`, visual CSS and bundled visual assets |
| Simulation, scenarios, data/asset ingestion and evidence generation | Turken + Claude | `ademix/simulator/`, `ademix/data/`, `IngestionLayer.tsx`, ingestion data and CSS |
| Release integration | One designated integrator at a time | `main.tsx`, `README.md`, `SUBMISSION.md`, `PROJECT_CONTEXT.md`, `presentation/`, Compose files |

Ownership is temporary and may be changed in `PROJECT_CONTEXT.md` before work begins. An agent must not edit another owner's paths without recording a handoff first.

## Branch rules

1. Never work directly on `main`.
2. Each task uses one branch named for its owner and purpose: `codex/...` or `claude/...`.
3. Before coding, fetch `origin`, read `PROJECT_CONTEXT.md`, and add the task to **Active Work** with owner, branch, and exact paths.
4. Commit a coherent checkpoint before another agent integrates it. Do not hand off an uncommitted working tree.
5. Open one pull request into the integration branch. Do not merge related stacked branches separately.
6. The integrator reviews changed files, resolves conflicts deliberately, runs all checks, and only then merges to `main`.

## Current Claude branch relationship

`claude/data-asset-layer` is stacked on `claude/what-if-scenarios`, which is stacked on `claude/core-simulation-engine`. Therefore, integrate only `claude/data-asset-layer` if the team wants the full Claude work. Merging all three would duplicate history and create unnecessary conflict resolution.

## Shared-file handoff

Files in the release-integration row are a lock zone. Before changing one, write a short message in **Active Work**:

```text
Owner / branch / exact files / purpose / expected handoff
```

Only the listed owner edits those files until the checkpoint is committed or the ownership entry is removed. Documentation is reconciled after code integration, not independently on both branches.

## Integration order for the current work

1. Commit the current Codex visual work on `codex/ademix`.
2. Create a temporary integration branch from that checkpoint.
3. Merge or selectively cherry-pick `origin/claude/data-asset-layer` once.
4. Keep Claude's simulator/data additions; keep Codex's current terrain, camera, truck and material implementation unless the team explicitly chooses the alternative ingestion scene.
5. Resolve `main.tsx` as an intentional UI composition, then reconcile `README.md`, `SUBMISSION.md`, `PROJECT_CONTEXT.md`, and the presentation.
6. Run frontend build, every Python test, Compose build/start, scenario smoke checks, and visual review before merging to `main`.

## Definition of done for a handoff

- changed files and purpose are listed;
- tests and unverified items are stated truthfully;
- third-party licenses are recorded;
- no credentials or generated junk are committed;
- the branch is pushed and has one clear pull request;
- the next owner knows whether to merge, cherry-pick, or reject it.
