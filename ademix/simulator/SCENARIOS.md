# Ademix What-If Scenario Engine

This file describes how the four operating conditions change the discrete-event model in `engine.py`, how the active constraint (bottleneck) is identified, and what the scenarios produce compared with normal operations. Section 7 adds Scenario C, smart dispatch: a dispatch policy that can be combined with any of the four conditions. The model structure, parameters and their sources are in `MODEL.md`.

**All figures here are synthetic simulation output.** They are not measurements from an operating mine. They have not been validated against site data and make no claim of engineering or safety accuracy.

## 1. What each scenario changes in the model

A scenario changes an input of the operating model; nothing is overwritten in the displayed values. Every effect on the twins follows from the event simulation.

| Scenario | Model input changed | Mechanism |
|---|---|---|
| Normal operations | None: 6 trucks at 25 km/h, crusher 900 t/h | Reference case |
| Truck HT-01 breakdown | HT-01 is removed from service. If it is on the road, the single lane is blocked for 20 min (`BREAKDOWN_RECOVERY_S`) | HT-01 keeps its payload. Other trucks travelling toward its position stop there (`blocked`). If it was being loaded or dumping, that server is released at once. After the tow, the road reopens and every moving truck is re-planned. |
| Main road restriction | Road speed limit 25 → 10.72 km/h | Every moving truck is re-planned from its current position at the new speed. New trips use the new speed. |
| Crusher capacity −45 % | Crusher rate 900 → 495 t/h | The ROM bin drains more slowly. A truck may tip only when the bin has room for its full load (600 t bin), otherwise it waits in the crusher queue. |

**Reset to normal operations** does the following:

- clears any blockage and re-plans every moving truck;
- restores 25 km/h and 900 t/h;
- returns HT-01 to service from where it stopped, joining the right queue or road direction for its payload;
- restarts the KPI windows.

Three guards keep resets and switches safe:

1. **Cycle guard (`_set_state`).** It rejects any illegal transition, such as a loaded truck returning without dumping, and any state that contradicts the payload (hauling or dumping must be full; returning or loading must be empty).
2. **Stale-event tokens.** Each truck has a token that cancels events made obsolete by a speed change, a blockage or a breakdown.
3. **Crusher token.** It re-times the "bin space available" event whenever the crusher rate changes.

## 2. Bottleneck analysis

The engine names one of five constraints: **loading resource**, **haul-road travel**, **available truck fleet**, **dump point** or **crusher processing capacity**.

### Analytical (steady state) — `projection()`

With *N* active trucks, payload *Q* = 77 t, one-way length *L* = 3.2 km, speed *v*, loading time *t_L* = 6 min and dump time *t_D* = 1 min:

| Stage | Capacity (t/h) |
|---|---|
| Haulage | N · Q · 3600 / (t_L + t_D + 2L/v · 3600). It is labelled *haul-road travel* when v is below 25 km/h, otherwise *available truck fleet*. |
| Loading resource | Q · 3600 / t_L = 770 |
| Dump point | Q · 3600 / t_D = 4 620 |
| Crusher | 900, or 495 when slowed |

The projected throughput is the minimum of these four, and the stage that gives the minimum is the bottleneck. This is the long-run throughput of a closed deterministic cyclic system. The DES converges to it in every scenario (tested to ±2 % over 16 h).

### Live (measured) — `live_bottleneck()`

The live analysis uses what actually happened in the last 30 simulated minutes. A server counts as saturated when it was busy at least 95 % of that time. The rules are checked in this order:

1. **A lane is blocked** by HT-01 → haul-road travel.
2. **The crusher is saturated**, and trucks are waiting to dump, or the ROM bin is accumulating (deliveries exceed processing by more than one truckload), or the bin is nearly full → crusher processing capacity.
3. **The dump bay is saturated** → dump point.
4. **The excavator is saturated** → loading resource.
5. **No server is saturated**, so the servers are waiting for trucks → haul-road travel if the speed limit is reduced, otherwise available truck fleet.

The rule picks the most downstream saturated server, because upstream servers are then held back by it. Both the analytical and live results are published on the twins:

- **Analytical:** `scenario-controller.bottleneck` and `bottleneck_reason`.
- **Live:** `mine-01.bottleneck_live` and `bottleneck_live_reason`.

### Why the bottleneck moves between scenarios

| Scenario | Constraint | Explanation (model output) |
|---|---|---|
| Normal operations | Loading resource | Six trucks could supply 1 240 t/h, but one excavator loads at most 770 t/h (match factor 1.61). Trucks queue at the face; the crusher has spare capacity. |
| HT-01 breakdown | Haul-road travel while the lane is blocked, then briefly available truck fleet, then loading resource | The blockage stops all deliveries. After the tow the trucks arrive bunched, so the excavator is not saturated for a while. In steady state, five trucks (1 033 t/h) still out-supply the excavator, so loading is the constraint again. |
| Main road restriction | Haul-road travel | At 10.72 km/h the round trip takes 35.8 min. Six trucks then supply only 647 t/h, below the excavator's 770 t/h, so the excavator waits for trucks. |
| Crusher capacity −45 % | Crusher processing capacity | 495 t/h is below the 770 t/h the face can load. The ROM bin fills to its 600 t limit and trucks queue at the dump. |

No scenario makes the dump point binding: its 4 620 t/h is far above every other stage. The rule is still implemented so that the classifier is complete.

## 3. Results

These come from `python compare_scenarios.py`. Every run uses the same deterministic warm-up (4 h of normal operation), so all four start from an identical state; a test checks this. Each scenario then runs for the same 9 h. "Steady state" covers hours 2–9 after the switch; the transient is the first hour. Percentages are relative to normal operations over the same period.

### Steady state: hours 2–9 after the switch

| Metric | Normal operations | Truck HT-01 breakdown | Main road restriction | Crusher capacity −45% |
|---|---:|---:|---:|---:|
| Production t | 6,160 | 6,194 (+0.6%) | 5,163 (-16.2%) | 3,960 (-35.7%) |
| Throughput t/h | 770.0 | 774.3 (+0.6%) | 645.3 (-16.2%) | 495.0 (-35.7%) |
| Cycle min | 36.0 | 30.2 (-16.1%) | 42.8 (+18.9%) | 51.6 (+43.2%) |
| Avg queue at face | 2.27 | 1.27 (-44.0%) | 0.00 (-100.0%) | 0.38 (-83.4%) |
| Avg queue at crusher | 0.00 | 0.00 (—) | 0.00 (—) | 2.99 (new) |
| Wait at face min | 13.6 | 7.6 (-44.0%) | 0.0 (-100.0%) | 3.4 (-75.0%) |
| Wait at crusher min | 0.0 | 0.0 (—) | 0.0 (—) | 25.4 (new) |
| Truck util. % | 62.1 | 62.1 (+0.0%) | 100.0 (+61.0%) | 43.9 (-29.3%) |
| Excavator util. % | 100.0 | 100.0 (+0.0%) | 84.4 (-15.6%) | 72.1 (-27.9%) |
| Crusher util. % | 85.6 | 86.0 (+0.6%) | 71.7 (-16.2%) | 100.0 (+16.9%) |
| Trips / h | 10.00 | 10.00 (+0.0%) | 8.38 (-16.2%) | 6.88 (-31.2%) |
| Avg ROM t | 33 | 33 (+1.4%) | 28 (-16.2%) | 540 (+1539.3%) |
| ROM at end of period t | 0 | 0 | 28 | 555 |

### Transient: first 1 h after the switch

| Metric | Normal operations | Truck HT-01 breakdown | Main road restriction | Crusher capacity −45% |
|---|---:|---:|---:|---:|
| Production t | 770 | 582 (-24.5%) | 584 (-24.1%) | 490 (-36.4%) |
| Throughput t/h | 770.0 | 581.6 (-24.5%) | 584.4 (-24.1%) | 489.7 (-36.4%) |
| Cycle min | 36.0 | 39.4 (+9.4%) | 44.2 (+22.7%) | 36.0 (+0.0%) |
| Avg queue at face | 2.27 | 1.01 (-55.4%) | 0.46 (-79.6%) | 2.27 (+0.0%) |
| Avg queue at crusher | 0.00 | 0.10 (new) | 0.00 (—) | 0.00 (—) |
| Wait at face min | 13.6 | 8.8 (-35.3%) | 4.6 (-66.4%) | 13.6 (+0.0%) |
| Wait at crusher min | 0.0 | 0.8 (new) | 0.0 (—) | 0.0 (—) |
| Truck util. % | 62.1 | 49.0 (-21.2%) | 92.3 (+48.5%) | 62.1 (+0.0%) |
| Excavator util. % | 100.0 | 79.9 (-20.1%) | 88.6 (-11.4%) | 100.0 (+0.0%) |
| Crusher util. % | 85.6 | 64.6 (-24.5%) | 64.9 (-24.1%) | 98.9 (+15.6%) |
| Trips / h | 10.00 | 8.00 (-20.0%) | 8.00 (-20.0%) | 10.00 (+0.0%) |
| Avg ROM t | 33 | 78 (+135.6%) | 26 (-21.7%) | 173 (+425.3%) |
| ROM at end of period t | 0 | 34 | 32 | 280 |

### Bottleneck analysis

| Scenario | Analytical bottleneck | Live, first hour | Live, steady state |
|---|---|---|---|
| Normal operations | loading resource (770 t/h) | loading resource | loading resource |
| Truck HT-01 breakdown | loading resource (770 t/h) | available truck fleet | loading resource |
| Main road restriction | haul-road travel (647 t/h) | haul-road travel | haul-road travel |
| Crusher capacity −45% | crusher processing capacity (495 t/h) | crusher processing capacity | crusher processing capacity |

### Breakdown trigger-time sensitivity

The breakdown's effect depends on where HT-01 is when it fails. To show this, the trigger was moved through one 36-minute baseline cycle in 3-minute steps, each compared with normal operations over the same hour.

| Trigger after warm-up | HT-01 location | First-hour production t | vs baseline first hour |
|---:|---|---:|---:|
| 0 min | haul road at 0.97 km, returning | 582 | -24.5% |
| 3 min | loading area, queued | 770 | +0.0% |
| 6 min | loading area, queued | 770 | +0.0% |
| 9 min | loading area, queued | 770 | +0.0% |
| 12 min | loading area, queued | 770 | +0.0% |
| 15 min | loading area, queued | 770 | +0.0% |
| 18 min | loading area, under the excavator | 743 | -3.5% |
| 21 min | loading area, under the excavator | 707 | -8.1% |
| 24 min | haul road at 0.85 km, hauling | 577 | -25.0% |
| 27 min | haul road at 2.10 km, hauling | 587 | -23.8% |
| 30 min | crusher dump bay | 693 | -10.0% |
| 33 min | haul road at 2.22 km, returning | 591 | -23.2% |

The largest mass-balance error across the four runs is 9.1e-13 t, which is floating-point rounding.

### What the results say

These are model results for the stated assumptions:

- **The fleet is over-trucked for one excavator.** A truck failing in a queue costs nothing; spare trucks absorb it.
- **What hurts is a failure on the single-lane road.** It loses about a quarter of the first hour's production, because the blockage stops every delivery.
- **The road restriction makes haulage the constraint** (−16 %). Truck utilization reaches 100 % while the excavator becomes idle 16 % of the time.
- **The crusher slowdown pushes back through the whole cycle** (−36 %). The ROM bin fills, trucks wait about 25 min per cycle at the dump, and the excavator idles 28 % of the time.

### Operational recommendations

| Scenario | Why the metrics change | Dispatcher recommendation |
|---|---|---|
| Normal operations | The 6 min single excavator limits throughput to 770 t/h. Extra trucks wait 13.6 min at the face, so fleet utilization is 62.1%; the crusher runs at 85.6% and ten loads are completed per hour. | Keep five trucks productive and treat the sixth as standby, or add loading capacity before adding trucks. |
| HT-01 breakdown | A road failure blocks deliveries and cuts the first hour to 581.6 t/h, eight trips/h and 49.0% fleet utilization. After towing, five trucks still saturate the excavator, so steady throughput and crusher utilization recover while the face queue becomes shorter. | Tow the truck off the lane first; then continue with five trucks. Do not add another truck unless monitoring shows the excavator becoming starved. |
| Main road restriction | Lower speed lengthens the free cycle, removes the face queue, raises fleet utilization to 100%, lowers trips to 8.38/h and leaves both excavator and crusher waiting; throughput falls to about 645 t/h. | Restore road speed/availability first. If the restriction must remain, add one suitable truck rather than changing crusher capacity. |
| Crusher −45% | The crusher is continuously busy at 495 t/h. ROM fills, crusher wait rises to 25.4 min, cycle time reaches 51.6 min, and truck utilization/trips fall because trucks cannot dump. | Restore crusher capacity; meanwhile park surplus trucks or reduce loading to prevent dump congestion and excess idling. |

## 4. Assumptions specific to the scenarios

All of these are team scenario inputs, not site data:

- **Restriction speed:** 10.72 km/h.
- **Crusher slowdown:** 45 % of the 900 t/h planning capacity.
- **Lane blockage:** 20 minutes.
- **The broken truck is always HT-01.**

The single haul road is modelled as one lane in both directions, so a stopped truck blocks traffic both ways. A truck broken down at the face or the dump is assumed to be moved aside at once, without blocking the server. The scenario stays in force until reset; no repair time is modelled.

## 5. Verification performed

`python -m unittest test_engine` runs 41 tests, all passing. The What-If and evidence tests check:

- each scenario changes a model input, and moving trucks adopt the new speed;
- every propagated effect against an identical baseline (cycle time, queues, utilizations, ROM, production);
- that a road breakdown starves the crusher and then clears;
- reset from 30 trigger times (3 scenarios × 10 offsets across a cycle), checking at every step:
  - mass balance;
  - ROM bounds;
  - no duplicate queue entries and each truck in at most one server or queue;
  - payload consistent with state;
  - non-negative fuel;
  - speed restored, no stale blockage or broken trucks;
  - recovery to 770 ± 18 t/h;
- identical starting states for all scenarios;
- rejection of illegal cycle transitions;
- live and analytical bottlenecks agreeing in each scenario's steady state;
- the live bottleneck shifting during a breakdown;
- a 3-truck fleet identified as fleet-limited;
- the bottleneck explanations quoting the binding numbers.
- the frontend-facing throughput, cycle, wait, fleet-utilization and crusher-utilization twin values matching the generated steady-state evidence for all four scenarios.

The reset test found a real defect in the previous engine. Trucks still driving toward a breakdown blockage at the moment it was cleared kept their old target and stayed `blocked` indefinitely. `_clear_blockage` now re-plans every moving truck.

These tests verify that the code implements the stated model consistently. They are **not validation** against real operations.

## 6. Limitations

- **Breakdown:** the effect depends on the trigger time (table above), only one truck can break down, there is no repair duration, and the failure is not random.
- **Road restriction:** it applies to the whole route at a single speed. Rerouting onto an alternative road, segment-specific limits and separate loaded or empty speeds are not modelled.
- **Live bottleneck:**
  - It uses a 30-minute window, so it lags a change of scenario.
  - The 95 % saturation threshold is a modelling choice.
  - Short windows can show a temporary constraint, such as "available truck fleet" while trucks are bunched after a blockage.
- **Single scenario at a time:** scenarios are mutually exclusive (one active condition), which keeps comparisons controlled; combinations are not modelled.
- **Dump point:** with the current parameters it can never be the bottleneck.

## 7. Scenario C: smart dispatch

The architecture's What-If Scenario Engine has three scenario families:

| Diagram | In the model |
|---|---|
| Scenario A: normal operations (baseline) | condition `baseline`, dispatch `fixed` |
| Scenario B: fault injection and breakdown | conditions `truck_breakdown`, `road_closure`, `crusher_slowdown` |
| Scenario C: smart dispatch (optimized) | dispatch `smart`, combinable with any condition |
| Dynamic bottleneck analysis | `projection()` and `live_bottleneck()` (section 2) |

Dispatch is a **policy**, not an operating condition, so it is a separate switch: `POST /api/dispatch {"policy": "smart"}` or `{"policy": "fixed"}`. This lets the twin answer "what does smart dispatch change during a breakdown?" as well as "what does it change in normal operations?".

### The dispatch rule

The section 3 results show the fleet is over-trucked: with six trucks, the excavator is the constraint and trucks queue for about 14 minutes per cycle. Smart dispatch removes that surplus without touching the constraint.

1. **Required fleet.** It is computed from the steady-state model, with C the slowest single server (excavator, dump bay or crusher) and T the free cycle (load + dump + travel at the current road speed):

   n = ⌈C × T / (payload × 3600)⌉

   For normal operations, C = 770 t/h, T = 22.36 min and the payload is 77 t, so n = ⌈3.73⌉ = 4. The crusher slowdown gives 3, and the road restriction 8, which is more than the six trucks available.
2. **Parking.** An empty truck arriving at the face parks on a ready line beside the excavator (state `standby`) if more than n trucks are cycling. Trucks that are broken down or held behind a blockage do not count as cycling.
3. **Protecting the bottleneck.** When the excavator is the binding server and would otherwise stand idle, it loads a parked truck at once.
4. **Release.** Parked trucks rejoin the loading queue as soon as the cycling count falls below n. This happens on a breakdown, when trucks are held behind a road blockage, on a scenario change, or on a switch back to `fixed`.

Rule 3 is needed. Without it, smart dispatch lost 7–9 % of first-hour production after a breakdown on the haul road: a parked truck sat beside an idle excavator while the cycling trucks were still bunched after the blockage. The ready line is at the face, not the dump, because parked trucks at the dump would be on the wrong side of a road blockage to feed the excavator.

### Results (`python compare_scenarios.py`)

Every run uses the same 4 h warm-up; the policy and the condition switch at the same moment. Each cell reads fixed → smart.

**Truck operating hours per kt** is the time trucks spend in the cycle (not parked or broken down) per 1,000 t crushed. A1 now separately integrates estimated fuel for every event interval using documented comparable-equipment medium-load rates. Queued and blocked trucks are treated as engine-on; parked and broken-down trucks do not accrue the truck rate, while the excavator rate remains active. These are synthetic estimates, not measured fuel savings. The versioned matched fixture, units and scientifically valid claim are defined in `DISPATCH_COMPARISON_CONTRACT.md` and generated as `ademix/data/evidence/fixed_vs_smart.json`.

### Steady state: hours 2–9 after the switch

| Metric | Normal operations | Truck HT-01 breakdown | Main road restriction | Crusher capacity −45% |
|---|---:|---:|---:|---:|
| Trucks needed (model) | 4 | 4 | 8 | 3 |
| Production t | 6,160 → 6,160 (+0.0%) | 6,194 → 6,194 (+0.0%) | 5,163 → 5,163 (+0.0%) | 3,960 → 3,960 (-0.0%) |
| Throughput t/h | 770.0 → 770.0 (+0.0%) | 774.3 → 774.3 (+0.0%) | 645.3 → 645.3 (+0.0%) | 495.0 → 495.0 (-0.0%) |
| Truck operating h per kt | 7.79 → 5.19 (-33.3%) | 6.46 → 5.17 (-20.0%) | 9.30 → 9.30 (+0.0%) | 12.12 → 6.06 (-50.0%) |
| Truck time parked % | 0.0 → 33.3 (new) | 0.0 → 16.7 (new) | 0.0 → 0.0 (—) | 0.0 → 50.0 (new) |
| Operating-truck util. % | 62.1 → 93.2 (+50.0%) | 74.5 → 93.2 (+25.0%) | 100.0 → 100.0 (+0.0%) | 43.9 → 87.3 (+98.7%) |
| Wait at face min | 13.6 → 1.6 (-88.0%) | 7.6 → 1.6 (-78.5%) | 0.0 → 0.0 (—) | 3.4 → 0.0 (-100.0%) |
| Wait at crusher min | 0.0 → 0.0 (—) | 0.0 → 0.0 (—) | 0.0 → 0.0 (—) | 25.4 → 3.2 (-87.2%) |
| Excavator util. % | 100.0 → 100.0 (+0.0%) | 100.0 → 100.0 (+0.0%) | 84.4 → 84.4 (+0.0%) | 72.1 → 70.1 (-2.7%) |

### Transient: first 1 h after the switch

| Metric | Normal operations | Truck HT-01 breakdown | Main road restriction | Crusher capacity −45% |
|---|---:|---:|---:|---:|
| Trucks needed (model) | 4 | 4 | 8 | 3 |
| Production t | 770 → 770 (+0.0%) | 582 → 582 (+0.0%) | 584 → 584 (+0.0%) | 490 → 490 (-0.0%) |
| Throughput t/h | 770.0 → 770.0 (+0.0%) | 581.6 → 581.6 (+0.0%) | 584.4 → 584.4 (+0.0%) | 489.7 → 489.7 (-0.0%) |
| Truck operating h per kt | 7.79 → 5.43 (-30.4%) | 8.60 → 7.88 (-8.3%) | 10.27 → 10.27 (+0.0%) | 12.25 → 6.98 (-43.1%) |
| Truck time parked % | 0.0 → 30.4 (new) | 0.0 → 6.9 (new) | 0.0 → 0.0 (—) | 0.0 → 43.1 (new) |
| Operating-truck util. % | 62.1 → 89.2 (+43.6%) | 58.7 → 64.1 (+9.1%) | 92.3 → 92.3 (+0.0%) | 62.1 → 93.2 (+50.1%) |
| Wait at face min | 13.6 → 4.0 (-70.4%) | 8.8 → 6.2 (-30.2%) | 4.6 → 4.6 (+0.0%) | 13.6 → 3.4 (-75.0%) |
| Wait at crusher min | 0.0 → 0.0 (—) | 0.8 → 0.8 (+0.0%) | 0.0 → 0.0 (—) | 0.0 → 0.0 (—) |
| Excavator util. % | 100.0 → 100.0 (+0.0%) | 79.9 → 79.9 (+0.0%) | 88.6 → 88.6 (+0.0%) | 100.0 → 85.5 (-14.5%) |

With smart dispatch, first-hour production after a breakdown is identical to the fixed fleet at all 12 trigger times in the sensitivity sweep (section 3), including the four road failures.

### What the results say

These are model results for the stated assumptions:

- **Smart dispatch does not raise throughput.** Throughput is set by the bottleneck, and the dispatcher does not change any server.
- **It produces the same tonnage with about a third fewer truck operating hours** in normal operations: 4 trucks cycle and 2 are parked. Queueing at the face falls from 13.6 to 1.6 min per cycle.
- **The gain is largest when the crusher is slowed** (−50 % truck hours). Only 3 trucks are needed, and the 25 min wait at the dump almost disappears.
- **During a truck breakdown** the reserve covers the lost truck at once, and production is never below the fixed fleet.
- **Under the road restriction there is nothing to optimize.** The model needs 8 trucks and 6 exist, so none is parked. This is a fleet-sizing signal for the planner.

### Verification

`python -m unittest test_engine` adds 7 tests in `DispatchTests`:

- the required fleet is checked against the hand calculation;
- unknown policies are rejected;
- production is equal and truck hours are never higher in every condition, with mass conserved;
- parked trucks are empty and stopped at the face, and the twin fields agree;
- the road restriction parks no truck;
- a breakdown releases a parked truck, and smart is never below fixed in first-hour production for road failures;
- switching back to `fixed` releases every parked truck.

### Limitations

- **Required fleet:** it comes from the deterministic steady-state model, with no allowance for variability in load, travel or dump times. A real dispatcher would hold a margin.
- **What the dispatcher controls:** only how many trucks cycle and when a parked truck is released. It does not assign trucks among several excavators (there is one), route around the blockage, or optimize speed.
- **Parked trucks:** they are assumed to be available instantly when released, and parked time is treated as engine-off.
