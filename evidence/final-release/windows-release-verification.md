# Windows release verification

Date: 2026-10-25  
Branch: `codex/final-release-audit`  
Candidate base: `caf6ee0`

## Passed checks

- 92 simulator, API and evidence unit tests passed.
- 48 data-layer and evidence tests passed.
- Frontend TypeScript and Vite production build passed (619 modules).
- Three consecutive live smoke runs passed before restart: API healthy, source `eclipse-ditto`, 11 required twins, 143 required fields and units.
- Full live scenario matrix passed: baseline, Smart Dispatch, truck breakdown, road restriction, crusher slowdown, all combined Smart cases, and clean reset.
- A clean Compose recreate that preserved volumes reached the complete health gate in 296.2 seconds on the two-second candidate.
- Three consecutive live smoke runs passed after the recreate with the same 11 twins and 143 fields/units.
- SwiftShader software rendering loaded the live route at 1280 × 720 with no console errors or failed HTTP responses on the stable run.

## Sustained-load correction

The two-second candidate later reproduced intermittent 503s during simultaneous browser and software-render checks. Logs showed 30-second Akka `RetrieveThing` timeouts while Things and Connectivity consumed multiple CPU cores. The minimum evidence-based correction changes `SIM_INTERVAL` from 2 to 4 seconds while leaving `SIM_SPEEDUP=20`; every batch advances 80 simulated seconds, so simulation time remains exactly 20× while persistence and cache-read pressure are halved.

After rebuilding and cleanly recreating the stack with that setting:

- three immediate smoke runs passed;
- the full baseline/Smart/breakdown/road/crusher matrix and reset passed;
- three further sustained-load smoke runs passed;
- the SwiftShader run reported the live Ditto source with zero console errors and zero failed HTTP responses.

## Restart finding and safe operation

`docker compose restart` is not a valid whole-stack recovery test for this topology. It restarts the one-shot `init` and `ademix-setup` jobs alongside the long-running services, and the restarted Akka cluster initially retained remote stream references to the previous Things actor incarnation. Gateway reads and setup writes then timed out with HTTP 502/503 even though shallow container health checks were green.

The safe recovery is a coordinated container recreate, preserving named volumes:

```powershell
docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml -f ademix/compose.yml down --remove-orphans
docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml -f ademix/compose.yml up -d --wait --wait-timeout 900
```

This clears stale cluster membership, executes the one-shot jobs only after their declared dependencies, and passed the post-recreate smoke sequence. No data volumes were deleted.

## Remaining external gate

The repository now contains `.github/workflows/ubuntu-release-verification.yml` for a fresh Ubuntu 24.04 AMD64 runner. Its result must be taken from GitHub Actions after this branch is pushed; Windows results are not mislabeled as native Ubuntu proof.
