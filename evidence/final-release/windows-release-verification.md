# Windows release verification

Date: 2026-10-25  
Branch: `codex/final-release-audit`  
Candidate base: `caf6ee0`

## Passed checks

- 93 simulator, API and evidence unit tests passed.
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

## Cross-platform evidence correction

Professor's independent audit found that the OpenMines input checksum depended on CRLF versus LF checkout bytes,
and an exact `.005` display boundary could produce 35.65 or 35.66 on different Python versions. Input hashes now
canonicalize tracked text to LF. Metric display values first stabilize to six decimals and then use explicit
decimal half-up quantization. Python 3.11 and bundled Python 3.12 generated identical SHA-256 values for every
data-layer output; both test suites passed, including byte-for-byte regeneration.

The complete Docker stack was then rebuilt from commit `6b8582b`. All services reached the health gate; three
live smoke runs passed 11 twins and 143 required fields/units; the full baseline, Smart Dispatch, breakdown, road
restriction, crusher slowdown, combined-policy matrix and final reset passed through Eclipse Ditto.

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

The candidate was pushed as commit `d290063` on `codex/final-release-audit`. A read-only authenticated GitHub API
check immediately afterward reported `total_count: 0` for repository workflow runs, so no Ubuntu run was created.
The workflow may require repository Actions to be enabled or the workflow to be accepted on the default branch.
No native Ubuntu success is claimed.

## Final-day Windows acceptance spot-check — 2026-10-25

Candidate: `2b7f5d4c61ddb83852f8299b281e6a20e59564b9` on `origin/codex/ademix` and `origin/main`, based on the
integrated Professor audit fixes plus current release updates. The tests ran against the exact source tree later
committed as this SHA; only documentation/checklist status was amended afterward.

- Simulator/API/evidence suite: 97 passed.
- Data-layer suite: 48 passed.
- Frontend production build: passed (619 modules; existing large-chunk warning, 1.249 MB uncompressed).
- Three sequential live smoke checks: all returned Eclipse Ditto, 11 twins and 143 required fields/units.
- Full live fixed/Smart scenario matrix: baseline, breakdown, road restriction, crusher slowdown, all Smart
  combinations and final clean reset passed.
- Final headless browser route: all control acknowledgements succeeded; all observed state requests returned
  HTTP 200; final state was Eclipse Ditto baseline/fixed/no blockage; no browser console errors. The live route
  briefly entered STALE because simulated time stopped advancing, then recovered to LIVE. Raw record:
  `live-route-final.json`.
- Final SwiftShader spot check: automatic Light mode, 5.9 average / 5.5 low-5% fps at 896 × 503; zero console
  errors and failed HTTP responses, but screenshot captured STALE at 8 s. This is not a passing smooth-render or
  uninterrupted-live acceptance result: `software-rendering.json` and `software-rendering.png`.
- A candidate lower-write-rate experiment still showed STALE and was reverted. It is not part of the release
  source. Its browser record and step screenshots remain under `live-route.json` and `live-route/` for diagnosis.
- The unrelated native Ubuntu 24.04 AMD64 gate remains unverified. The earlier coordinated Docker recreate
  preserved named volumes and passed; no volumes were removed in this final-day work.

The remaining intermittent stale clock and low measured SwiftShader cadence are reported as limitations rather
than represented as release passes. The current scripts do not hide these states.
