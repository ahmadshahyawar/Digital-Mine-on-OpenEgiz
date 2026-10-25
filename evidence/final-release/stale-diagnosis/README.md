# Post-submission STALE diagnosis

Date: 2026-10-25

Branch: `codex/stale-performance-fix`

Official main used as the base: `94fda0ad97c051ff15c6b08db4e49ee959cbf313`

## Confirmed cause

The simulation engine did not freeze. A synchronized MQTT capture showed the authoritative `mine-01`
snapshot advancing by 100 simulated seconds every five wall-clock seconds, which is the configured 20x rate.
The delay was downstream: Ditto/MongoDB persistence and read contention occasionally delayed a fresh bulk read
long enough for the frontend's genuine simulated-clock check to report STALE.

Evidence supporting that conclusion:

- Ditto Things logged a 5,000 ms `AskTimeoutException` for `RetrieveThingResponse` during a reproduced stall.
- MongoDB logged many journaled slow writes, commonly 100–550 ms, and the retained developer volume contains a
  large Things journal accumulated during long test sessions.
- During a synchronized pre-fix route, MongoDB reached about 53% CPU and Ditto Things reached about 64% CPU,
  while MQTT continued publishing normally.
- `/api/health` called `/api/state` on every Docker health probe. After startup this duplicated the expensive
  11-twin Ditto bulk read every ten seconds, in addition to frontend polling.

## Minimal fix

`ademix/simulator/app.py` now performs the complete Ditto read from `/api/health` only until the cache is first
warmed. This preserves the startup readiness gate and removes the redundant steady-state probe load. It does not
change the 20x multiplier, five-second publication cadence, twin schema, model equations, frontend threshold, or
scenario behavior. A regression test proves that cold health still reads Ditto and warm health does not.

## Reliability result

The official-main recorded route contained one STALE transition and these API timings:

| Evidence | Routes | Reads | Mean | p95 | Maximum | STALE transitions |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Official-main route | 1 | 36 | 550.9 ms | 2,279 ms | 2,994 ms | 1 |
| Post-fix routes | 3 | 84 | 233.3 ms | 629 ms | 1,040 ms | 0 |

All three post-fix routes acknowledged initial LIVE, breakdown, Smart Dispatch and reset. All finished with
`source=eclipse-ditto`, baseline/fixed policy, no blockage, no console errors, and no STALE transition. After the
test sequence, Ditto Things logs contained zero `AskTimeoutException` and zero error entries. MongoDB continued
to report slow writes, so this is load reduction rather than a claim that the retained database is pristine.

Raw route results are `after-route.json`, `after-route-2.json`, and `after-route-3.json`. `before-route.json` is an
additional synchronized baseline that happened not to reproduce the intermittent warning; the tracked official
release route remains the reproducible before-fix comparison.

## Acceptance checks

- Simulator/API/evidence unit suite: 98 passed.
- Data-contract suite: 48 passed.
- Frontend TypeScript/Vite production build: passed; existing >500 kB chunk warning only.
- Live smoke: passed three consecutive times; Eclipse Ditto, 11 twins, 143 fields/units.
- Full fixed/Smart scenario matrix: passed all baseline, breakdown, road restriction, crusher slowdown and reset checks.
- Instrumented live browser route: passed three consecutive times; 84/84 state reads HTTP 200.
- Startup behavior: the simulator image was rebuilt and its container recreated; cold `/api/health` returned OK with
  the authoritative 20x OpenEgiz clock after the cache-warming Ditto read.

## Software-rendering review

No Professor-owned frontend source or asset was changed. The current automatic Light mode was measured again with
SwiftShader at 896 x 503: 7.2 average FPS and 6.0 low-5%, versus the recorded official-main spot check of 5.9 and
5.5. The browser was LIVE with no console errors or failed responses. This is a single spot check and should not be
presented as a guaranteed rendering improvement; no 3D optimization was merged without Professor agreement.

## Remaining limitations and recommendation

The long-lived local MongoDB volume still records slow journaled writes, and an intermittent failure can never be
proved impossible from three routes. Nevertheless, the fix removes a deterministic source of duplicate Ditto load,
is covered by a regression test, and passed every required gate without changing the simulation or frontend.
Recommendation: merge before the deadline only after Team approval. Keep official main unchanged until that approval.
