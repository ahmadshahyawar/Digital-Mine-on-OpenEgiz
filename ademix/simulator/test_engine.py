"""Deterministic checks for the Ademix discrete-event haulage and crusher model."""

import json
import unittest

from engine import (
    BASE_CRUSHER_TPH, BREAKDOWN_RECOVERY_S, CAPACITY_T, CRUSHER_SLOWDOWN_FACTOR, DUMP_SECONDS,
    LOAD_SECONDS, ROAD_RESTRICTION_SPEED_KMH, ROM_BIN_CAPACITY_T, ROUTE_KM, SCENARIOS,
    MineEngine, projection,
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
        self.assertEqual(projection("baseline")["bottleneck"], "excavator")
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
            "baseline": (770.0, "excavator", 0),
            "truck_breakdown": (770.0, "excavator", 0),
            "road_closure": (647.3, "haulage fleet", -16),
            "crusher_slowdown": (495.0, "crusher", -36),
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
        self.assertAlmostEqual(projection("baseline")["limits_tph"]["excavator"], CAPACITY_T * 3600 / LOAD_SECONDS)

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
