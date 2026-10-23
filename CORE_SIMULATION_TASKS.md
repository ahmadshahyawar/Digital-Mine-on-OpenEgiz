# Ademix Core Simulation Tasks

This is the working checklist for our part of the project. Complete, test, and review **one task at a time**. Do not begin the next task until the current task is accepted.

## Working boundary

- Our responsibility: Core Simulation Engine.
- Professor's responsibility: Data & Asset Layer.
- Preserve the team's open-pit haulage and crusher concept.
- Do not make unsupported accuracy claims. Accuracy means correct behavior against the documented model, assumptions, units, and tests.

## Task 1 — Map the full truck cycle

**Status:** Complete — awaiting human acceptance before Task 2 begins.

Required sequence:

`waiting for loader → loading → hauling → waiting at crusher → dumping → returning`

Acceptance checks:

- [x] Every stage exists as an explicit truck state.
- [x] A truck cannot skip a stage.
- [x] Only one truck uses the excavator at a time.
- [x] Only one truck uses the dumping point at a time.
- [x] Waiting trucks are counted separately from trucks receiving service.
- [x] Queue order is deterministic.
- [x] Payload becomes full after loading.
- [x] Payload becomes zero after dumping.
- [x] Completed dumps increase delivered ore without losing mass.
- [x] A completed cycle returns the truck to the loading side.
- [x] All automated tests pass (17/17 on 2026-10-22).
- [ ] Human review accepts Task 1.

## Task 2 — Record cycle and waiting times

**Status:** Complete — awaiting human acceptance before Task 3 begins.

- [x] Track loading-queue waiting time.
- [x] Track crusher-queue waiting time.
- [x] Track loading, hauling, dumping, and returning durations.
- [x] Report complete cycle time per truck and fleet average.
- [x] Report fleet-average loading and crusher waiting times.
- [x] Verify timing boundaries and full-cycle reconciliation (20/20 tests pass on 2026-10-22).

## Task 3 — Improve queue and resource behavior

**Status:** Complete — awaiting human acceptance before Task 4 begins.

- [x] Validate first-in, first-out loading and crusher queues.
- [x] Define excavator and dump-point occupancy.
- [x] Release a resource immediately when its truck is interrupted.
- [x] Requeue an interrupted truck safely without double-occupying a resource.
- [x] Verify resource behavior and recovery (24/24 tests pass on 2026-10-22).

## Task 4 — Validate production and mass conservation

**Status:** Complete — awaiting human acceptance before Task 5 begins.

- [x] Reconcile extracted, truck-carried, inventoried, and processed ore.
- [x] Include the six loaded startup trucks in the initial ore balance.
- [x] Expose the total extracted ore, current truck payload, and mass-balance error.
- [x] Test startup, every second of a short run, long runs, and all scenarios.
- [x] Verify non-negative extraction, inventory, payload, and production.
- [x] Verify exact mass conservation (28/28 tests pass on 2026-10-22).

## Task 5 — Improve operational scenarios

**Status:** Complete — awaiting human acceptance before Task 7 begins.

- [x] Truck breakdown affects HT-01, fleet speed, road speed, and resource availability.
- [x] Road restriction reduces fleet speed and increases completed cycle time.
- [x] Crusher-capacity reduction constrains processing and increases ROM inventory.
- [x] Clean reset removes truck, road, crusher, and controller scenario effects.
- [x] Scenario switching preserves mass and leaves no stale effects.
- [x] Scenario description, affected assets, and elapsed time are reported.
- [x] Verify propagation and reset behavior (38/38 tests pass on 2026-10-22).

## Task 6 — Operational metrics

**Status:** Complete — awaiting human acceptance before Task 7 begins.

- [x] Time-based truck-fleet utilization.
- [x] Time-based excavator utilization.
- [x] Time-based dump-point utilization.
- [x] Time-based crusher utilization.
- [x] Current and time-weighted average queue lengths.
- [x] Queue waiting times.
- [x] Trips per hour, production, inventory, cycle time, and throughput.
- [x] Verify utilization bounds and time-weighted calculations (32/32 tests pass on 2026-10-22).

## Task 7 — Baseline-versus-scenario comparison

**Status:** Not started.

- Use identical starting conditions and simulation duration.
- Compare production, throughput, queues, waiting, utilization, and cycle time.
- Explain every formula and limitation.

## Task 8 — Final simulation verification

**Status:** Not started.

- Deterministic repeatability.
- Long-duration stability.
- Full automated test suite.
- Documentation and submission claims match verified behavior.

## Separate visual task — Redesign the mine map

**Status:** In progress. Directional lanes and queue separation are complete; overall map scale and quality still require redesign.

- Make the mine fill more of the available screen.
- Increase pit, road, equipment, loading-area, and crusher legibility.
- Improve scale, composition, camera framing, detail, and visual hierarchy.
- Keep the scene usable without GPU acceleration.
- [x] Put loaded outbound trucks in the right-hand lane.
- [x] Put empty returning trucks in the left-hand lane.
- [x] Stop waiting trucks and give loading/crusher queues separate positions.
- [x] Give all six trucks persistent identity colors and marker counts.
- [x] Space queue slots far enough apart to keep full truck models visible.
- [x] Replace the arbitrary loading endpoint with a marked loading bay, excavator, cut face, and blasted-rock pile.
- [ ] Complete the 100-point loading realism plan in `LOADING_REALISM_CHECKLIST.md`, using its five approval stages.
