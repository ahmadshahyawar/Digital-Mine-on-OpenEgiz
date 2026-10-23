# Ademix Core Simulation Engine — Model Description

`engine.py` is a deterministic **discrete-event simulation** (DES) of one loading face, one single-lane haul road, one crusher dump bay and one run-of-mine (ROM) bin feeding a primary crusher. It produces the live state published to the Eclipse Ditto twins. This file records its structure, formulas, units, assumptions, verification and limitations.

All live values are **synthetic model output**. They are not measurements from an operating mine and the model has **not been validated against site data**.

## 1. Structure

| Element | Twin | Modelled as | Capacity |
|---|---|---|---|
| Haul trucks HT-01…HT-06 | `truck-01`…`truck-06` | Entities cycling through the states below | 77 t payload each |
| Excavator EX-01 | `excavator-01` | Single server, FIFO queue | One truck at a time, 6 min per truck |
| Main haul road | `road-main` | Shared single lane, one speed limit for all trucks; can be blocked at one point | 3.2 km one way |
| Crusher dump bay | `crusher-01` | Single server, FIFO queue; truck may tip only if the ROM bin has room for the full load | One truck at a time, 1 min |
| ROM bin + primary crusher | `crusher-01` | Continuous draw from the bin at the crusher rate while the bin is not empty | 600 t bin, 900 t/h crusher |
| Scenario controller | `scenario-controller` | Current operating condition and analytical projection | — |
| Mine | `mine-01` | Aggregated KPIs | — |

**Truck cycle:** `queued_at_excavator → loading → hauling → queued_at_crusher → dumping → returning → …`

There are two exception states:

- `blocked`: stopped behind a broken-down truck on the single lane.
- `breakdown`: out of service.

**Events:** `arrive`, `load_done`, `dump_done`, `bin_space` (the crusher has drawn the bin down far enough for the next load) and `road_cleared` (the broken truck has been towed aside). Events sit in a priority queue ordered by time, then by insertion sequence. Equal-time events therefore resolve in a fixed, reproducible order.

**Clock:** `step(dt)` processes every event up to `now + dt`. Between events, the crusher draw and the state-time accumulators are integrated exactly. Results do not depend on the publishing tick (`SIM_INTERVAL × SIM_SPEEDUP`, 20 s of simulated time per second by default); a test checks this. When a speed limit or blockage changes, each moving truck keeps its current position and is re-scheduled from there.

**Determinism:** the only random numbers are the initial fuel percentages, drawn from `random.Random(seed)` (seed 42). Two engines with the same seed and the same scenario commands produce identical snapshots.

## 2. Parameters and sources

| Parameter | Value | Unit | Source / status |
|---|---:|---|---|
| Truck payload | 77 | t | OpenMines `north_pit_mine.json` (MIT), "OfficalTruck" |
| Truck speed, normal | 25 | km/h | OpenMines `north_pit_mine.json` |
| Shovel pass | 20.32 t per 1.5 min | t, min | OpenMines `north_pit_mine.json`, LoadSite2–5 Shovel-1 |
| Passes per truck | ⌈77 / 20.32⌉ = 4 | — | Derived |
| Loading time | 4 × 1.5 = 6 | min | Derived |
| Dump time | 1 | min | OpenMines dump site `cycle_time` |
| Route length, one way | 3.2 | km | Team simplification at the OpenMines route-distance scale |
| Fleet size | 6 | trucks | Team choice: reduced from 9 OpenMines 77 t trucks so the 3D scene stays legible |
| Crusher capacity | 900 | t/h | **Team planning assumption**, not a manufacturer rating |
| ROM bin capacity | 600 | t | **Team assumption** (about 7.8 truckloads) |
| Initial ROM inventory | 250 | t | **Team assumption** |
| Road restriction speed | 10.72 | km/h | **Scenario input** chosen by the team |
| Crusher slowdown | 55 % of 900 = 495 | t/h | **Scenario input** chosen by the team |
| Breakdown lane blockage | 20 | min | **Scenario input**: time to tow HT-01 off the single lane |
| Fuel burn | 1.4 % loaded / 0.8 % empty per 3.2 km | % | **Synthetic display signal**, not calibrated; no refuelling is modelled |

## 3. Formulas

Symbols:

- N is the number of active trucks.
- Q = 77 t is the payload.
- L = 3.2 km is the one-way route length.
- v is the road speed (km/h).
- t_L = 360 s is the loading time and t_D = 60 s is the dump time.
- C is the crusher capacity (t/h) and B = 600 t is the bin capacity.

| Quantity | Formula | Unit |
|---|---|---|
| Free (no-queue) cycle time | T₀ = t_L + t_D + 2·L / v · 3600 | s |
| Fleet supply | S_F = N · Q · 3600 / T₀ | t/h |
| Excavator capacity | S_E = Q · 3600 / t_L = 770 | t/h |
| Dump bay capacity | S_D = Q · 3600 / t_D = 4 620 | t/h |
| Projected steady-state throughput | X = min(S_F, S_E, S_D, C); the argmin is the reported **bottleneck** (loading resource, haul-road travel, available truck fleet, dump point or crusher processing capacity; see `SCENARIOS.md` for the live bottleneck analysis) | t/h |
| Match factor | MF = N · t_L / T₀ (> 1: over-trucked, trucks queue at the face; < 1: under-trucked, the excavator waits) | — |
| Dump admission | a truck may tip only if ROM + Q ≤ B; otherwise it waits (ROM + Q − B) / (C / 3600) s | s |
| Crusher draw | dROM/dt = −C/3600 while ROM > 0, otherwise 0 (crusher starved) | t/s |
| Mass balance | opening stock + excavated = ore in trucks + ROM + processed | t |
| Cycle time (per truck) | time between two successive dump completions, including queueing | min |
| Throughput (`throughput_tph`) | processed tonnes in the last 60 simulated minutes ÷ 1 h | t/h |
| Utilization, excavator / crusher | busy time ÷ elapsed time since the current scenario started | % |
| Fleet utilization | truck-time in loading, hauling, dumping or returning ÷ total truck-time, over the same window | % |
| Queue wait | mean time from joining a queue to service start, over the same window | min |

The opening stock is 250 t of ROM plus six loaded trucks (462 t), because the demonstration starts mid-shift with all trucks loaded.

The minimum rule X = min(·) is the long-run throughput of a closed, deterministic cyclic system. The DES reproduces it in every scenario (see §5). The analytical projection is shown on the scenario-controller twin. The DES output is shown on the mine, crusher, excavator and truck twins.

## 4. Scenario propagation

| Scenario | Direct change | Propagated effects in the model |
|---|---|---|
| Truck HT-01 breakdown | HT-01 → `breakdown` and keeps its payload. If it was on the road, it blocks the single lane for 20 min. If it was at the face or dump, that server is released. | Trucks reaching HT-01's position become `blocked` with speed 0. The road twin shows `restricted` with a blockage description. Deliveries stop, so the ROM bin draws down and the crusher may become `starved`. After the tow, traffic resumes, the excavator queue is shorter and the match factor falls from 1.61 to 1.34. |
| Main road restriction | The road speed limit falls from 25 to 10.72 km/h for every truck, from its current position. | Cycle time rises from 22.4 to 42.8 min. The fleet becomes the bottleneck (MF 0.84), so the excavator starts waiting for trucks, and crusher utilization and throughput fall. |
| Crusher capacity −45 % | The crusher rate falls from 900 to 495 t/h. | The ROM bin fills toward 600 t. Trucks then queue at the dump bay (`queued_at_crusher`), cycle times lengthen and fewer trucks reach the face. Throughput is pinned at 495 t/h. |
| Normal operations | Restores 25 km/h and 900 t/h. If a lane is still blocked, it is cleared; HT-01 returns to service from where it stopped. | Queues and KPIs re-converge to the baseline. KPI windows restart at every scenario change. |

## 5. Baseline versus scenario results

Summary of the same runs that `python compare_scenarios.py` produces; the full comparison (every metric with its % change from baseline, the transient hour, live bottlenecks and breakdown timing sensitivity) is in `SCENARIOS.md`. Each run is 4 h of normal operation, then the scenario: the first hour is reported as the transient and the next 8 h as steady state. All figures are synthetic model output.

| Scenario | Bottleneck | Analytical t/h | Transient t/h | Steady t/h | vs baseline | Fleet util. % | Truck queue % | Excavator util. % | Crusher util. % | Wait at excavator min | Wait at crusher min | Cycle min | ROM at end t | Mass error t |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Normal operations | loading resource | 770.0 | 770.0 | 770.0 | +0.0% | 62.1 | 37.9 | 100.0 | 85.6 | 13.6 | 0.0 | 36.0 | 0 | 0.0e+00 |
| Truck HT-01 breakdown | loading resource | 770.0 | 581.6 | 774.3 | +0.6% | 62.1 | 21.2 | 100.0 | 86.0 | 7.6 | 0.0 | 30.2 | 0 | 0.0e+00 |
| Main road restriction | haul-road travel | 647.3 | 584.4 | 645.3 | -16.2% | 100.0 | 0.0 | 84.4 | 71.7 | 0.0 | 0.0 | 42.8 | 28 | 0.0e+00 |
| Crusher capacity −45% | crusher processing capacity | 495.0 | 489.7 | 495.0 | -35.7% | 43.9 | 56.1 | 72.1 | 100.0 | 3.4 | 25.4 | 51.6 | 555 | -9.1e-13 |

How to read these results:

- **The baseline is excavator-limited at 770 t/h, not crusher-limited.** One 4-pass excavator loads one 77 t truck every 6 min. With six trucks, the match factor is 1.61, so trucks spend about 38 % of their time queueing at the face, and the 900 t/h crusher runs about 86 % of the time.
- **A single truck breakdown costs throughput only while the lane is blocked.** Throughput falls by about 190 t/h in the first hour. After the tow, five trucks still out-supply the excavator, so steady-state throughput is unchanged. In this model, HT-01 is effectively a spare truck. This is the kind of insight the dispatcher needs; it is a model result, not a field observation.
- **The road restriction makes haulage the constraint** (−16 %). The excavator now waits for trucks.
- **The crusher slowdown backs up through the system** (−36 %). The ROM bin fills, trucks wait about 25 min per cycle at the dump bay, and the excavator falls to about 72 % utilization.
- The rolling-hour throughput on the stand moves in steps of about 77 t, because ore arrives one truckload at a time. Short-window values therefore fluctuate around the projection.

## 6. Verification performed

`python -m unittest test_engine` runs 41 deterministic tests (the What-If tests are described in `SCENARIOS.md`). Together with the three simulator-package data-contract checks, `python -m unittest discover -s ademix/simulator -p "test_*.py"` runs 44 checks. They cover:

- reproducibility with the same seed;
- invariance to the tick size;
- mass conservation at every step through all scenario switches, together with ROM-bin bounds and whole-payload transfers;
- single-truck service and queue/state consistency at the excavator and dump bay;
- FIFO head-of-line service at both the excavator and dump bay under every scenario;
- single-truck occupancy at both service resources under every scenario;
- exact 6 min loading, 7.68 min loaded haul, 1 min dumping and 7.68 min empty-return stages at the documented baseline speed, plus non-negative crusher waiting;
- cycle time ≥ the free cycle, with cycle − wait = the free cycle;
- direct reconciliation of opening stock + extracted ore against truck payload + ROM inventory + processed production throughout every scenario;
- utilization shares that sum to 100 %;
- the projection formula against a hand calculation;
- 24 h convergence of the DES to the analytical projection (±2 % of 900 t/h);
- breakdown blocking, recovery and reset, including interruption while loading, dumping, or waiting in either FIFO queue;
- every ordered direct scenario-to-scenario switch clearing the previous speed, crusher and breakdown effects;
- speed changes applied mid-route;
- the crusher-slowdown bin backup;
- reset to baseline;
- presence, order and JSON serialisability of every twin feature the interface reads.
- equality between the generated evidence window and the frontend-facing twin metrics for every scenario.

These checks confirm that the code implements the stated model consistently. They are **verification, not validation**: no comparison with real mine production data has been made.

## 7. Limitations

- There is one face, one road, one dump and one crusher. The model has no dispatching between multiple faces, no passing, no intersections, no grade or rimpull speed curves, and no separate loaded and empty speeds.
- All durations are deterministic. There is no variability in loading, travel or dumping, no operator effects, no shift changes, meal breaks or refuelling, and no random failures. Breakdowns occur only when the scenario is triggered.
- The road restriction is modelled as a speed limit. Rerouting onto an alternative road is not modelled.
- Excavator loading is counted as one event: a full 77 t is added when loading finishes. A breakdown during loading discards the partial load, which stays at the face and is not counted as excavated.
- The crusher has no product stockpile or downstream plant constraint. Processed ore leaves the system.
- Fuel is a visual signal only and eventually reaches 0 % during long runs.
- The crusher capacity, ROM bin size, initial inventory and scenario magnitudes are team assumptions. They are not data from a specific site or manufacturer.
- The KPI windows restart at every scenario change, so utilization and wait times shortly after a switch are based on little data.
