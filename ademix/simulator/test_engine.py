"""Deterministic checks for the Ademix discrete-event haulage and crusher model."""

import json
import unittest

from engine import (
    BASE_CRUSHER_TPH, BREAKDOWN_RECOVERY_S, CAPACITY_T, CRUSHER_SLOWDOWN_FACTOR, DUMP_SECONDS,
    LOAD_SECONDS, ROAD_RESTRICTION_SPEED_KMH, ROM_BIN_CAPACITY_T, ROUTE_KM, SCENARIOS,
    CRUSHER, DUMP, FLEET, LOADING, ROAD, MineEngine, projection,
)

SCENARIO_NAMES = tuple(SCENARIOS)


def run(mine, hours, dt=20.0, check=None):
    for _ in range(int(hours * 3600 / dt)):
        mine.step(dt)
        if check:
            check(mine)
    return mine


class DeterminismTests(unittest.TestCase):
    def test_same_seed_produces_same_state_after_a_run(self):
        first, second = MineEngine(42), MineEngine(42)
        for mine in (first, second):
            run(mine, 2)
            mine.set_scenario("road_closure")
            run(mine, 1)
        self.assertEqual(first.snapshot(), second.snapshot())

    def test_results_do_not_depend_on_publishing_tick_size(self):
        coarse, fine = MineEngine(), MineEngine()
        run(coarse, 3, dt=600)
        run(fine, 3, dt=8)
        self.assertAlmostEqual(coarse.production_t, fine.production_t, places=6)
        self.assertAlmostEqual(coarse.rom_inventory_t, fine.rom_inventory_t, places=6)
        self.assertEqual([t.trips for t in coarse.trucks], [t.trips for t in fine.trucks])
        self.assertEqual([t.state for t in coarse.trucks], [t.state for t in fine.trucks])

    def test_invalid_inputs_are_rejected(self):
        with self.assertRaises(ValueError):
            MineEngine().set_scenario("magic_output")
        with self.assertRaises(ValueError):
            MineEngine().step(0)


class MassConservationTests(unittest.TestCase):
    def assert_conserved(self, mine):
        self.assertAlmostEqual(mine.mass_balance_error_t(), 0.0, places=6)
        self.assertGreaterEqual(mine.rom_inventory_t, -1e-9)
        self.assertLessEqual(mine.rom_inventory_t, ROM_BIN_CAPACITY_T + 1e-6)
        for truck in mine.trucks:
            self.assertIn(truck.payload_t, (0.0, CAPACITY_T))

    def test_ore_is_conserved_through_every_scenario_and_switch(self):
        mine = MineEngine()
        for scenario in ("baseline", "truck_breakdown", "crusher_slowdown", "truck_breakdown",
                         "road_closure", "baseline"):
            mine.set_scenario(scenario)
            run(mine, 1.5, check=self.assert_conserved)
        self.assertGreater(mine.production_t, 0)

    def test_completed_dump_moves_full_payload_into_rom_bin(self):
        mine = MineEngine()
        truck = mine.trucks[-1]
        while truck.state != "dumping":
            mine.step(5)
        rom_before, delivered_before = mine.rom_inventory_t, mine.delivered_t
        while truck.state == "dumping":
            mine.step(1)
        self.assertEqual(mine.delivered_t - delivered_before, CAPACITY_T)
        self.assertEqual(truck.payload_t, 0)
        self.assertGreater(mine.rom_inventory_t, rom_before)


class ResourceTests(unittest.TestCase):
    def assert_single_servers(self, mine):
        states = [t.state for t in mine.trucks]
        self.assertLessEqual(states.count("loading"), 1)
        self.assertLessEqual(states.count("dumping"), 1)
        self.assertEqual(states.count("queued_at_excavator"), len(mine.excavator_queue))
        self.assertEqual(states.count("queued_at_crusher"), len(mine.dump_queue))

    def test_excavator_and_dump_bay_serve_one_truck_at_a_time(self):
        mine = MineEngine()
        for scenario in SCENARIO_NAMES:
            mine.set_scenario(scenario)
            run(mine, 1, dt=10, check=self.assert_single_servers)

    def test_excavator_queue_is_first_in_first_out(self):
        mine = MineEngine()
        arrivals, starts = [], []
        join, start = mine._join_excavator_queue, mine._try_start_loading

        def recording_join(truck):
            arrivals.append(truck.name)
            join(truck)

        def recording_start():
            serving = mine.excavator_truck
            start()
            if mine.excavator_truck is not serving and mine.excavator_truck:
                starts.append(mine.excavator_truck.name)

        mine._join_excavator_queue, mine._try_start_loading = recording_join, recording_start
        run(mine, 4)
        self.assertGreater(len(starts), 20)
        self.assertEqual(starts, arrivals[:len(starts)])

    def test_baseline_fleet_queues_at_the_excavator_bottleneck(self):
        mine = run(MineEngine(), 8)
        kpi = mine.kpis()
        self.assertEqual(projection("baseline")["bottleneck"], LOADING)
        self.assertGreater(kpi["excavator_utilization_pct"], 95)
        self.assertGreater(kpi["excavator_wait_min"], 5)
        self.assertEqual(kpi["crusher_wait_min"], 0)

    def test_cycle_time_includes_queueing_and_never_beats_free_cycle(self):
        mine = run(MineEngine(), 6)
        free_cycle_s = projection("baseline")["free_cycle_min"] * 60
        for truck in mine.trucks:
            self.assertGreaterEqual(truck.last_cycle_s, free_cycle_s - 1e-6)
            self.assertAlmostEqual(truck.last_cycle_s - truck.last_wait_s, free_cycle_s, places=6)

    def test_utilization_shares_are_bounded_and_complete(self):
        mine = run(MineEngine(), 3)
        kpi = mine.kpis()
        for key in ("fleet_utilization_pct", "excavator_utilization_pct", "crusher_utilization_pct"):
            self.assertGreaterEqual(kpi[key], 0)
            self.assertLessEqual(kpi[key], 100 + 1e-9)
        total = sum(kpi[k] for k in ("fleet_utilization_pct", "truck_queue_pct", "truck_blocked_pct", "truck_down_pct"))
        self.assertAlmostEqual(total, 100.0, places=6)


class ScenarioTests(unittest.TestCase):
    def test_projections_identify_each_bottleneck(self):
        expected = {
            "baseline": (770.0, LOADING, 0),
            "truck_breakdown": (770.0, LOADING, 0),
            "road_closure": (647.3, ROAD, -16),
            "crusher_slowdown": (495.0, CRUSHER, -36),
        }
        for name, (tph, bottleneck, impact) in expected.items():
            with self.subTest(scenario=name):
                mine = MineEngine()
                mine.set_scenario(name)
                controller = mine.snapshot()["scenario-controller"]
                self.assertAlmostEqual(controller["projected_throughput_tph"]["value"], tph, delta=0.1)
                self.assertEqual(controller["bottleneck"]["value"], bottleneck)
                self.assertEqual(controller["impact_pct"]["value"], impact)
                self.assertEqual(controller["baseline_throughput_tph"]["value"], 770.0)

    def test_projection_formula_matches_hand_calculation(self):
        plan = projection("road_closure")
        travel_s = 2 * ROUTE_KM / ROAD_RESTRICTION_SPEED_KMH * 3600
        cycle_s = LOAD_SECONDS + DUMP_SECONDS + travel_s
        self.assertAlmostEqual(plan["throughput_tph"], 6 * CAPACITY_T * 3600 / cycle_s, places=9)
        self.assertAlmostEqual(projection("baseline")["limits_tph"][LOADING], CAPACITY_T * 3600 / LOAD_SECONDS)

    def test_long_run_throughput_converges_to_projection(self):
        for scenario in SCENARIO_NAMES:
            with self.subTest(scenario=scenario):
                mine = MineEngine()
                mine.set_scenario(scenario)
                run(mine, 8, dt=10)
                warm = mine.production_t
                run(mine, 16, dt=10)
                observed_tph = (mine.production_t - warm) / 16
                self.assertAlmostEqual(observed_tph, mine.projected_throughput_tph(), delta=BASE_CRUSHER_TPH * 0.02)

    def test_breakdown_stops_ht01_blocks_the_road_then_recovers(self):
        mine = MineEngine()
        mine.step(60)  # HT-01 is hauling on the ramp
        mine.set_scenario("truck_breakdown")
        broken = mine.trucks[0]
        self.assertEqual(broken.state, "breakdown")
        self.assertEqual(broken.payload_t, CAPACITY_T)
        stopped_at = broken.progress
        self.assertEqual(mine.snapshot()["road-main"]["state"]["value"], "restricted")
        mine.step(BREAKDOWN_RECOVERY_S - 1)
        blocked = [t for t in mine.trucks if t.state == "blocked"]
        self.assertTrue(blocked)
        for truck in blocked:
            self.assertAlmostEqual(truck.progress, stopped_at)
        mine.step(2)
        self.assertIsNone(mine.blockage)
        self.assertFalse([t for t in mine.trucks if t.state == "blocked"])
        self.assertEqual(mine.snapshot()["road-main"]["state"]["value"], "open")
        self.assertEqual(broken.state, "breakdown")
        self.assertEqual(mine.snapshot()["truck-01"]["speed_kmh"]["value"], 0)
        mine.set_scenario("baseline")
        self.assertNotEqual(broken.state, "breakdown")
        run(mine, 2)
        self.assertGreater(broken.trips, 0)

    def test_breakdown_at_the_face_releases_the_excavator(self):
        mine = MineEngine()
        broken = mine.trucks[0]
        while broken.state != "loading":
            mine.step(10)
        mine.set_scenario("truck_breakdown")
        self.assertIsNone(mine.blockage)
        self.assertIsNot(mine.excavator_truck, broken)
        run(mine, 1)
        self.assertEqual(broken.payload_t, 0)
        self.assertGreater(mine.window["loads"], 0)

    def test_breakdown_at_dump_releases_bay_and_preserves_ore(self):
        mine = MineEngine()
        broken = mine.trucks[0]
        while broken.state != "dumping":
            mine.step(10)
        payload_before = broken.payload_t
        delivered_before = mine.delivered_t
        mine.set_scenario("truck_breakdown")
        self.assertIsNone(mine.dump_truck)
        self.assertEqual(broken.state, "breakdown")
        self.assertEqual(broken.payload_t, payload_before)
        self.assertEqual(mine.delivered_t, delivered_before)
        self.assertAlmostEqual(mine.mass_balance_error_t(), 0.0, places=6)
        mine.set_scenario("baseline")
        placements = [broken in mine.dump_queue, broken is mine.dump_truck]
        self.assertEqual(sum(placements), 1)
        self.assertIn(broken.state, {"queued_at_crusher", "dumping"})
        self.assertEqual(len({truck.name for truck in mine.dump_queue}), len(mine.dump_queue))

    def test_breakdown_removes_waiting_truck_without_reordering_fifo(self):
        mine = MineEngine()
        broken = mine.trucks[0]
        while broken.state != "queued_at_excavator":
            mine.step(10)
        before = [truck.name for truck in mine.excavator_queue]
        self.assertIn(broken.name, before)
        mine.set_scenario("truck_breakdown")
        after = [truck.name for truck in mine.excavator_queue]
        self.assertNotIn(broken.name, after)
        self.assertEqual(after, [name for name in before if name != broken.name])
        self.assertEqual(len(set(after)), len(after))

    def test_reset_invalidates_breakdown_and_old_service_events(self):
        mine = MineEngine()
        broken = mine.trucks[0]
        while broken.state != "loading":
            mine.step(10)
        mine.set_scenario("truck_breakdown")
        mine.set_scenario("baseline")
        run(mine, 2)
        self.assertFalse([truck for truck in mine.trucks if truck.state in ("breakdown", "blocked")])
        self.assertIsNone(mine.blockage)
        self.assertEqual(mine.breakdown_location, "none")
        self.assertEqual(len({truck.name for truck in mine.excavator_queue}), len(mine.excavator_queue))
        self.assertEqual(len({truck.name for truck in mine.dump_queue}), len(mine.dump_queue))
        self.assertAlmostEqual(mine.mass_balance_error_t(), 0.0, places=6)

    def test_road_restriction_slows_trucks_and_matches_road_twin(self):
        mine = MineEngine()
        mine.set_scenario("road_closure")
        mine.step(1)
        state = mine.snapshot()
        self.assertEqual(state["truck-01"]["speed_kmh"]["value"], ROAD_RESTRICTION_SPEED_KMH)
        self.assertEqual(state["road-main"]["speed_limit_kmh"]["value"], state["truck-01"]["speed_kmh"]["value"])
        self.assertEqual(state["road-main"]["state"]["value"], "restricted")

    def test_speed_change_mid_route_is_applied_from_the_current_position(self):
        mine = MineEngine()
        truck = mine.trucks[0]
        mine.step(300)
        before = mine._progress_now(truck)
        mine.set_scenario("road_closure")
        mine.step(60)
        expected = before + ROAD_RESTRICTION_SPEED_KMH * 60 / 3600 / ROUTE_KM
        self.assertAlmostEqual(mine._progress_now(truck), expected, places=9)

    def test_crusher_slowdown_fills_rom_bin_and_backs_up_trucks(self):
        baseline = run(MineEngine(), 1)
        slowdown = MineEngine()
        slowdown.set_scenario("crusher_slowdown")
        run(slowdown, 1)
        self.assertGreater(baseline.production_t, slowdown.production_t)
        self.assertAlmostEqual(slowdown.production_t, BASE_CRUSHER_TPH * CRUSHER_SLOWDOWN_FACTOR, places=5)
        run(slowdown, 4)
        self.assertGreater(slowdown.rom_inventory_t, ROM_BIN_CAPACITY_T - CAPACITY_T - 1e-6)
        self.assertGreater(slowdown.kpis()["crusher_wait_min"], 5)
        self.assertEqual(slowdown.snapshot()["crusher-01"]["state"]["value"], "constrained")

    def test_reset_restores_baseline_conditions(self):
        mine = MineEngine()
        for scenario in ("truck_breakdown", "road_closure", "crusher_slowdown"):
            mine.set_scenario(scenario)
            run(mine, 0.5)
        mine.set_scenario("baseline")
        state = mine.snapshot()
        self.assertEqual(state["road-main"]["state"]["value"], "open")
        self.assertEqual(state["crusher-01"]["capacity_tph"]["value"], BASE_CRUSHER_TPH)
        self.assertEqual(state["scenario-controller"]["impact_pct"]["value"], 0)
        self.assertFalse([t for t in mine.trucks if t.state in ("breakdown", "blocked")])


class WhatIfScenarioTests(unittest.TestCase):
    """Activation, propagation, reset, comparison and bottleneck identification."""

    @staticmethod
    def started(scenario, warmup_h=4, hours=3, truck_count=6):
        mine = MineEngine(truck_count=truck_count)
        run(mine, warmup_h)
        mine.set_scenario(scenario)
        run(mine, hours)
        return mine

    def assert_valid_operation(self, mine):
        self.assertAlmostEqual(mine.mass_balance_error_t(), 0.0, places=6)
        self.assertGreaterEqual(mine.rom_inventory_t, 0.0)
        self.assertLessEqual(mine.rom_inventory_t, ROM_BIN_CAPACITY_T + 1e-6)
        queued_exc = list(mine.excavator_queue)
        queued_dump = list(mine.dump_queue)
        self.assertEqual(len({t.name for t in queued_exc}), len(queued_exc))
        self.assertEqual(len({t.name for t in queued_dump}), len(queued_dump))
        for truck in mine.trucks:
            places = [truck in queued_exc, truck in queued_dump, truck is mine.excavator_truck, truck is mine.dump_truck]
            self.assertLessEqual(sum(places), 1, truck.name)
            self.assertGreaterEqual(truck.fuel_pct, 0.0)
            self.assertTrue(0.0 <= mine._progress_now(truck) <= 1.0)
            if truck.state in ("hauling", "dumping", "queued_at_crusher"):
                self.assertEqual(truck.payload_t, CAPACITY_T, truck.name)
            if truck.state in ("returning", "loading", "queued_at_excavator"):
                self.assertEqual(truck.payload_t, 0.0, truck.name)

    def test_each_scenario_changes_the_operating_model(self):
        base = MineEngine()
        run(base, 1)
        for scenario in ("truck_breakdown", "road_closure", "crusher_slowdown"):
            with self.subTest(scenario=scenario):
                mine = MineEngine()
                run(mine, 1)
                mine.set_scenario(scenario)
                changed = (
                    mine.speed_kmh() != base.speed_kmh(),
                    mine.projection()["limits_tph"][CRUSHER] != base.projection()["limits_tph"][CRUSHER],
                    mine.projection()["active_trucks"] != base.projection()["active_trucks"],
                )
                self.assertTrue(any(changed))
                moving = [t for t in mine.trucks if t.state in ("hauling", "returning")]
                for truck in moving:
                    self.assertEqual(truck.travel_speed_kmh, mine.speed_kmh())

    def test_effects_propagate_against_identical_baseline(self):
        base = self.started("baseline").kpis()
        road = self.started("road_closure").kpis()
        crusher = self.started("crusher_slowdown").kpis()
        breakdown = self.started("truck_breakdown").kpis()
        self.assertGreater(road["average_cycle_min"], base["average_cycle_min"])
        self.assertLess(road["excavator_utilization_pct"], base["excavator_utilization_pct"])
        self.assertLess(road["excavator_queue_avg"], base["excavator_queue_avg"])
        self.assertLess(road["production_t"], base["production_t"])
        self.assertGreater(crusher["crusher_queue_avg"], base["crusher_queue_avg"])
        self.assertGreater(crusher["rom_avg_t"], base["rom_avg_t"])
        self.assertLess(crusher["excavator_utilization_pct"], base["excavator_utilization_pct"])
        self.assertLess(crusher["production_t"], base["production_t"])
        self.assertGreater(breakdown["truck_down_pct"], 0)
        self.assertGreater(breakdown["truck_blocked_pct"], 0)
        self.assertLess(breakdown["excavator_queue_avg"], base["excavator_queue_avg"])
        self.assertLess(breakdown["production_t"], base["production_t"])

    def test_breakdown_on_the_road_starves_the_crusher_until_cleared(self):
        mine = MineEngine()
        run(mine, 4)
        mine.set_scenario("truck_breakdown")
        self.assertTrue(mine.breakdown_location.startswith("haul road"))
        mine.step(BREAKDOWN_RECOVERY_S - 30)
        self.assertEqual(mine.rom_inventory_t, 0.0)
        self.assertEqual(mine.snapshot()["crusher-01"]["state"]["value"], "starved")
        mine.step(60)
        self.assertIsNone(mine.blockage)

    def test_reset_restores_valid_state_from_any_trigger_time(self):
        for scenario in ("truck_breakdown", "road_closure", "crusher_slowdown"):
            for offset_min in range(0, 40, 4):
                with self.subTest(scenario=scenario, offset_min=offset_min):
                    mine = MineEngine()
                    run(mine, 2 + offset_min / 60, dt=10)
                    mine.set_scenario(scenario)
                    run(mine, 0.4 + offset_min / 120, dt=10, check=self.assert_valid_operation)
                    mine.set_scenario("baseline")
                    self.assertIsNone(mine.blockage)
                    self.assertEqual(mine.speed_kmh(), 25.0)
                    self.assertFalse([t for t in mine.trucks if t.state in ("breakdown", "blocked")])
                    moving = [t for t in mine.trucks if t.state in ("hauling", "returning")]
                    self.assertTrue(all(t.travel_speed_kmh == 25.0 for t in moving))
                    run(mine, 3, dt=10, check=self.assert_valid_operation)
                    warm = mine.production_t
                    run(mine, 4, dt=10)
                    self.assertAlmostEqual((mine.production_t - warm) / 4, 770.0, delta=900 * 0.02)

    def test_scenario_runs_share_an_identical_baseline_until_the_switch(self):
        runs = {}
        for scenario in SCENARIO_NAMES:
            mine = MineEngine()
            run(mine, 4)
            runs[scenario] = mine.snapshot()
            mine.set_scenario(scenario)
        first = runs["baseline"]
        for scenario, state in runs.items():
            self.assertEqual(state, first, scenario)

    def test_illegal_cycle_transition_is_rejected(self):
        mine = MineEngine()
        truck = mine.trucks[0]
        with self.assertRaises(RuntimeError):
            mine._set_state(truck, "returning")  # loaded hauling -> returning would skip dumping

    def test_live_bottleneck_follows_the_active_constraint(self):
        expected = {"baseline": LOADING, "road_closure": ROAD, "crusher_slowdown": CRUSHER, "truck_breakdown": LOADING}
        for scenario, constraint in expected.items():
            with self.subTest(scenario=scenario):
                mine = self.started(scenario)
                live = mine.live_bottleneck()
                self.assertEqual(live["constraint"], constraint)
                self.assertEqual(live["constraint"], mine.projection()["bottleneck"])
                self.assertTrue(live["reason"])

    def test_live_bottleneck_shifts_during_a_breakdown(self):
        mine = MineEngine()
        run(mine, 4)
        mine.set_scenario("truck_breakdown")
        mine.step(60)
        self.assertEqual(mine.live_bottleneck()["constraint"], ROAD)
        run(mine, 2)
        self.assertEqual(mine.live_bottleneck()["constraint"], LOADING)

    def test_small_fleet_is_fleet_limited(self):
        mine = self.started("baseline", truck_count=3)
        self.assertEqual(mine.projection()["bottleneck"], FLEET)
        self.assertEqual(mine.live_bottleneck()["constraint"], FLEET)

    def test_bottleneck_reasons_quote_the_binding_numbers(self):
        self.assertIn("770", projection("baseline")["reason"])
        self.assertIn("10.72", projection("road_closure")["reason"])
        self.assertIn("495", projection("crusher_slowdown")["reason"])
        self.assertEqual(projection("baseline")["limits_tph"][DUMP], CAPACITY_T * 60)


class InterfaceTests(unittest.TestCase):
    def test_snapshot_keeps_every_feature_the_interface_reads(self):
        state = MineEngine().snapshot()
        required = {
            "mine-01": ["production_t", "throughput_tph", "fleet_utilization", "average_cycle_min", "active_scenario", "sim_time_s"],
            "excavator-01": ["state", "queue_length", "position_x", "position_z"],
            "crusher-01": ["state", "capacity_tph", "queue_length", "rom_inventory_t", "processed_total_t", "position_x", "position_z"],
            "road-main": ["state", "speed_limit_kmh", "traffic_count"],
            "scenario-controller": ["active", "description", "impact_pct", "baseline_throughput_tph", "projected_throughput_tph"],
        }
        for name in [f"truck-{i:02d}" for i in range(1, 7)]:
            required[name] = ["state", "payload_t", "fuel_pct", "speed_kmh", "position_x", "position_z", "heading", "trips_total", "cycle_time_min"]
        self.assertEqual(set(state), set(required))
        for thing, keys in required.items():
            self.assertEqual(list(state[thing])[:len(keys)], keys, thing)

    def test_snapshot_is_json_serializable_during_every_scenario(self):
        mine = MineEngine()
        mine.step(60)
        for scenario in SCENARIO_NAMES:
            mine.set_scenario(scenario)
            mine.step(120)
            json.dumps(mine.snapshot())


if __name__ == "__main__":
    unittest.main()
