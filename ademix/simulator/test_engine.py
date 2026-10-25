"""Deterministic checks for the Ademix discrete-event haulage and crusher model."""

import json
import math
import unittest

from engine import (
    BASE_CRUSHER_TPH, BASE_SPEED_KMH, BREAKDOWN_RECOVERY_S, CAPACITY_T, CRUSHER_SLOWDOWN_FACTOR, DUMP_SECONDS,
    DIESEL_CO2_KG_PER_L, EXCAVATOR_FUEL_LPH, LOAD_SECONDS, ROAD_RESTRICTION_SPEED_KMH,
    INITIAL_ROM_T, ROM_BIN_CAPACITY_T, ROUTE_KM, SCENARIOS, TRUCK_FUEL_LPH,
    CRUSHER, DUMP, FLEET, LOADING, ROAD, MineEngine, projection, trucks_required,
    wall_seconds_for_simulated,
)

SCENARIO_NAMES = tuple(SCENARIOS)


def run(mine, hours, dt=20.0, check=None):
    for _ in range(int(hours * 3600 / dt)):
        mine.step(dt)
        if check:
            check(mine)
    return mine


class DeterminismTests(unittest.TestCase):
    def test_metric_rounding_is_stable_at_half_cent_boundary(self):
        self.assertEqual(MineEngine.metric(35.6550000001)["value"], 35.66)
        self.assertEqual(MineEngine.metric(35.6549999999)["value"], 35.66)

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


class SimulationClockTests(unittest.TestCase):
    def test_multiplier_changes_wall_duration_not_one_hour_model_result(self):
        results = []
        for multiplier in (1, 5, 20):
            mine = MineEngine(simulation_speed_multiplier=multiplier)
            mine.step(3600)
            results.append({
                "production_t": mine.production_t,
                "trips": [truck.trips for truck in mine.trucks],
                "states": [truck.state for truck in mine.trucks],
                "queues": (len(mine.excavator_queue), len(mine.dump_queue)),
                "mass_balance_error_t": mine.mass_balance_error_t(),
            })
            self.assertEqual(wall_seconds_for_simulated(3600, multiplier), 3600 / multiplier)
            clock = mine.snapshot()["mine-01"]
            self.assertEqual(clock["sim_time_s"]["value"], 3600)
            self.assertEqual(clock["simulation_speed_multiplier"]["value"], multiplier)
            self.assertEqual(clock["simulation_mode"]["value"], "offline_model")
        self.assertEqual(results[0], results[1])
        self.assertEqual(results[1], results[2])

    def test_clock_rejects_false_multiplier_or_mode(self):
        for multiplier in (0, -1):
            with self.assertRaises(ValueError):
                MineEngine(simulation_speed_multiplier=multiplier)
            with self.assertRaises(ValueError):
                wall_seconds_for_simulated(60, multiplier)
        with self.assertRaises(ValueError):
            MineEngine(simulation_mode="pretend_live")


class FuelAndEmissionsTests(unittest.TestCase):
    def smart_engine_with_two_parked_trucks(self):
        mine = MineEngine()
        mine.set_dispatch("smart")
        while mine.operating_trucks_fuel_count() != 4:
            mine.step(10)
        self.assertEqual(sum(t.state == "standby" for t in mine.trucks), 2)
        return mine

    def test_two_hour_rate_fixture_totals_663_litres(self):
        mine = self.smart_engine_with_two_parked_trucks()
        mine.reset_shift_totals()
        self.assertAlmostEqual(mine.current_fuel_rate_lph(), 281.9, places=9)
        mine.step(3600)
        smart_hour = mine.shift_fuel_l
        mine.set_dispatch("fixed")
        self.assertAlmostEqual(mine.current_fuel_rate_lph(), 381.1, places=9)
        mine.step(3600)
        self.assertAlmostEqual(smart_hour, 281.9, places=6)
        self.assertAlmostEqual(mine.shift_fuel_l - smart_hour, 381.1, places=6)
        self.assertAlmostEqual(mine.shift_fuel_l, 663.0, places=6)

    def test_co2_is_fuel_times_configured_factor(self):
        mine = MineEngine()
        mine.step(1733)
        self.assertAlmostEqual(mine.shift_co2_kg, mine.shift_fuel_l * DIESEL_CO2_KG_PER_L, places=9)

    def test_parked_trucks_do_not_accrue_operating_rate(self):
        mine = self.smart_engine_with_two_parked_trucks()
        expected = EXCAVATOR_FUEL_LPH + 4 * TRUCK_FUEL_LPH
        self.assertAlmostEqual(mine.current_fuel_rate_lph(), expected, places=9)

    def test_current_fleet_change_does_not_rewrite_history(self):
        mine = self.smart_engine_with_two_parked_trucks()
        mine.reset_shift_totals()
        mine.step(3600)
        prior = mine.shift_fuel_l
        mine.set_dispatch("fixed")
        self.assertAlmostEqual(mine.shift_fuel_l, prior, places=9)
        self.assertAlmostEqual(mine.current_fuel_rate_lph(), 381.1, places=9)

    def test_scenario_switch_preserves_totals_and_explicit_reset_starts_new_shift(self):
        mine = MineEngine()
        mine.step(900)
        prior_fuel, prior_co2 = mine.shift_fuel_l, mine.shift_co2_kg
        mine.set_scenario("road_closure")
        self.assertEqual((mine.shift_fuel_l, mine.shift_co2_kg), (prior_fuel, prior_co2))
        previous_id = mine.shift_id
        mine.reset_shift_totals()
        self.assertEqual(mine.shift_id, previous_id + 1)
        self.assertEqual(mine.shift_start_sim_s, mine.sim_time_s)
        self.assertEqual((mine.shift_fuel_l, mine.shift_co2_kg), (0.0, 0.0))


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

    def test_named_mass_balance_components_reconcile_in_every_scenario(self):
        mine = MineEngine()
        for scenario in SCENARIO_NAMES:
            with self.subTest(scenario=scenario):
                mine.set_scenario(scenario)
                for _ in range(360):
                    mine.step(10)
                    available = mine.opening_stock_t + mine.excavated_t
                    accounted = mine.ore_in_trucks_t() + mine.rom_inventory_t + mine.production_t
                    self.assertAlmostEqual(available, accounted, places=6)


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

    def test_both_fifo_resources_serve_the_head_under_every_scenario(self):
        """Every service start must take the oldest truck still waiting."""
        for scenario in SCENARIO_NAMES:
            with self.subTest(scenario=scenario):
                mine = MineEngine()
                mine.set_scenario(scenario)
                load_starts, dump_starts = [], []
                start_loading = mine._try_start_loading
                start_dump = mine._try_start_dump

                def checked_loading():
                    head = mine.excavator_queue[0] if mine.excavator_queue else None
                    serving = mine.excavator_truck
                    start_loading()
                    if serving is None and mine.excavator_truck is not None:
                        self.assertIs(mine.excavator_truck, head)
                        load_starts.append(mine.excavator_truck.name)

                def checked_dump():
                    head = mine.dump_queue[0] if mine.dump_queue else None
                    serving = mine.dump_truck
                    start_dump()
                    if serving is None and mine.dump_truck is not None:
                        self.assertIs(mine.dump_truck, head)
                        dump_starts.append(mine.dump_truck.name)

                mine._try_start_loading = checked_loading
                mine._try_start_dump = checked_dump
                run(mine, 8, dt=10, check=self.assert_single_servers)
                self.assertGreater(len(load_starts), 5)
                self.assertGreater(len(dump_starts), 5)

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

    def test_each_cycle_stage_has_the_documented_duration(self):
        mine = MineEngine()
        entered, durations = {}, {state: [] for state in (
            "loading", "hauling", "queued_at_crusher", "dumping", "returning",
        )}
        set_state = mine._set_state

        def recording_set_state(truck, state):
            old = truck.state
            if (truck.name, old) in entered and old in durations:
                durations[old].append(mine.sim_time_s - entered[(truck.name, old)])
            set_state(truck, state)
            entered[(truck.name, state)] = mine.sim_time_s

        mine._set_state = recording_set_state
        run(mine, 8, dt=10)
        travel_s = ROUTE_KM / BASE_SPEED_KMH * 3600.0
        self.assertTrue(durations["loading"])
        self.assertTrue(durations["hauling"])
        self.assertTrue(durations["dumping"])
        self.assertTrue(durations["returning"])
        for observed in durations["loading"]:
            self.assertAlmostEqual(observed, LOAD_SECONDS, places=6)
        for observed in durations["hauling"]:
            self.assertAlmostEqual(observed, travel_s, places=6)
        for observed in durations["dumping"]:
            self.assertAlmostEqual(observed, DUMP_SECONDS, places=6)
        for observed in durations["returning"]:
            self.assertAlmostEqual(observed, travel_s, places=6)
        self.assertTrue(all(wait >= 0 for wait in durations["queued_at_crusher"]))

    def test_operating_values_match_documented_assumptions(self):
        self.assertEqual(CAPACITY_T, 77.0)
        self.assertEqual(BASE_SPEED_KMH, 25.0)
        self.assertEqual(LOAD_SECONDS, 6 * 60.0)
        self.assertEqual(DUMP_SECONDS, 60.0)
        mine = MineEngine()
        for scenario in SCENARIO_NAMES:
            mine.set_scenario(scenario)
            mine.step(1)
            expected_speed = ROAD_RESTRICTION_SPEED_KMH if scenario == "road_closure" else BASE_SPEED_KMH
            for truck in mine.trucks:
                self.assertIn(truck.payload_t, (0.0, CAPACITY_T))
                if truck.state in ("hauling", "returning"):
                    self.assertEqual(truck.travel_speed_kmh, expected_speed)

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
            self.assertEqual(truck.direction, broken.direction)
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

    def test_hauling_breakdown_blocks_only_crusher_bound_followers(self):
        mine = MineEngine()
        mine.step(60)
        broken = mine.trucks[0]
        self.assertEqual(broken.state, "hauling")
        # Arrange one legitimate empty opposing movement without changing the breakdown truck.
        opposing = mine.trucks[-1]
        opposing.token += 1
        opposing.state, opposing.payload_t = "returning", 0.0
        mine.opening_stock_t -= CAPACITY_T  # keep the controlled fixture mass-balanced
        opposing.direction, opposing.progress = -1, 0.9
        mine._start_travel(opposing)
        before = mine._progress_now(opposing)

        mine.set_scenario("truck_breakdown")
        road = mine.snapshot()["road-main"]
        self.assertEqual(road["traffic_model"]["value"], "two_way_separated_lanes")
        self.assertEqual(road["blockage_lane"]["value"], "crusher_bound")
        self.assertEqual(road["blockage_heading"]["value"], 1)
        mine.step(300)

        self.assertNotEqual(opposing.state, "blocked")
        self.assertLess(mine._progress_now(opposing), before)
        mine.step(BREAKDOWN_RECOVERY_S - 301)
        blocked = [t for t in mine.trucks if t.state == "blocked"]
        self.assertTrue(blocked)
        self.assertTrue(all(t.direction == 1 for t in blocked))
        road = mine.snapshot()["road-main"]
        self.assertEqual(road["blocked_crusher_bound_trucks"]["value"], len(blocked))
        self.assertEqual(road["blocked_face_bound_trucks"]["value"], 0)
        self.assertAlmostEqual(mine.mass_balance_error_t(), 0.0, places=6)

    def test_returning_breakdown_blocks_only_face_bound_followers(self):
        mine = MineEngine()
        broken = mine.trucks[0]
        deadline = 8 * 3600
        while broken.state != "returning" and mine.sim_time_s < deadline:
            mine.step(10)
        self.assertEqual(broken.state, "returning")

        mine.set_scenario("truck_breakdown")
        self.assertEqual(mine.blockage_direction, -1)
        road = mine.snapshot()["road-main"]
        self.assertEqual(road["blockage_lane"]["value"], "face_bound")
        mine.step(BREAKDOWN_RECOVERY_S - 1)
        blocked = [t for t in mine.trucks if t.state == "blocked"]
        self.assertTrue(all(t.direction == -1 for t in blocked))
        self.assertFalse([t for t in mine.trucks if t.state == "blocked" and t.direction == 1])
        road = mine.snapshot()["road-main"]
        self.assertEqual(road["blocked_crusher_bound_trucks"]["value"], 0)
        self.assertEqual(road["blocked_face_bound_trucks"]["value"], len(blocked))

        mine.step(2)
        road = mine.snapshot()["road-main"]
        self.assertEqual(road["blockage_lane"]["value"], "none")
        self.assertEqual(road["blockage_heading"]["value"], 0)
        self.assertEqual(road["blocked_trucks"]["value"], 0)
        mine.set_scenario("baseline")
        self.assertFalse([t for t in mine.trucks if t.state in {"breakdown", "blocked"}])
        self.assertAlmostEqual(mine.mass_balance_error_t(), 0.0, places=6)

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

    def test_breakdown_removes_crusher_queued_truck_without_reordering_fifo(self):
        mine = MineEngine()
        mine.set_scenario("crusher_slowdown")
        broken = mine.trucks[0]
        deadline = mine.sim_time_s + 12 * 3600
        while broken.state != "queued_at_crusher" and mine.sim_time_s < deadline:
            mine.step(10)
        self.assertEqual(broken.state, "queued_at_crusher")
        before = [truck.name for truck in mine.dump_queue]
        mine.set_scenario("truck_breakdown")
        after = [truck.name for truck in mine.dump_queue]
        self.assertEqual(broken.state, "breakdown")
        self.assertEqual(after, [name for name in before if name != broken.name])
        self.assertEqual(len(set(after)), len(after))
        self.assertAlmostEqual(mine.mass_balance_error_t(), 0.0, places=6)

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

    def test_every_direct_scenario_switch_clears_the_previous_effect(self):
        for previous in SCENARIO_NAMES:
            for current in SCENARIO_NAMES:
                if previous == current:
                    continue
                with self.subTest(previous=previous, current=current):
                    mine = MineEngine()
                    mine.set_scenario(previous)
                    run(mine, 0.5, dt=10)
                    mine.set_scenario(current)
                    run(mine, 0.1, dt=10)
                    state = mine.snapshot()
                    expected_speed = ROAD_RESTRICTION_SPEED_KMH if current == "road_closure" else BASE_SPEED_KMH
                    expected_crusher = (BASE_CRUSHER_TPH * CRUSHER_SLOWDOWN_FACTOR
                                        if current == "crusher_slowdown" else BASE_CRUSHER_TPH)
                    self.assertEqual(mine.scenario, current)
                    self.assertEqual(state["road-main"]["speed_limit_kmh"]["value"], expected_speed)
                    self.assertAlmostEqual(state["crusher-01"]["capacity_tph"]["value"], expected_crusher)
                    self.assertEqual(bool([t for t in mine.trucks if t.state == "breakdown"]),
                                     current == "truck_breakdown")
                    if current != "truck_breakdown":
                        self.assertIsNone(mine.blockage)
                        self.assertEqual(mine.breakdown_location, "none")
                    self.assertAlmostEqual(mine.mass_balance_error_t(), 0.0, places=6)


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

    def test_breakdown_reduces_feed_without_closing_opposing_lane(self):
        mine = MineEngine()
        run(mine, 4)
        mine.set_scenario("truck_breakdown")
        self.assertTrue(mine.breakdown_location.startswith("haul road"))
        mine.step(BREAKDOWN_RECOVERY_S - 30)
        self.assertGreater(mine.rom_inventory_t, 0.0)
        self.assertLess(mine.rom_inventory_t, INITIAL_ROM_T)
        self.assertEqual(mine.snapshot()["crusher-01"]["state"]["value"], "operating")
        self.assertTrue(all(t.direction == mine.blockage_direction for t in mine.trucks if t.state == "blocked"))
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


class DispatchTests(unittest.TestCase):
    """Scenario C: smart dispatch right-sizes the cycling fleet without losing production."""

    @staticmethod
    def steady(scenario, dispatch, warmup_h=4, transient_h=1, hours=8):
        mine = run(MineEngine(), warmup_h)
        mine.set_dispatch(dispatch)
        mine.set_scenario(scenario)
        run(mine, transient_h)
        mine._reset_window()
        run(mine, hours)
        return mine, mine.kpis()

    def test_required_fleet_matches_hand_calculation(self):
        free_cycle_s = LOAD_SECONDS + DUMP_SECONDS + 2 * ROUTE_KM / 25.0 * 3600
        loader_tph = CAPACITY_T * 3600 / LOAD_SECONDS
        self.assertEqual(trucks_required("baseline")["trucks"], math.ceil(loader_tph * free_cycle_s / (CAPACITY_T * 3600)))
        self.assertEqual(trucks_required("baseline")["trucks"], 4)
        self.assertEqual(trucks_required("crusher_slowdown")["trucks"], 3)
        self.assertEqual(trucks_required("crusher_slowdown")["server"], CRUSHER)
        self.assertEqual(trucks_required("road_closure")["trucks"], 8)  # more than the fleet: nothing to park
        for scenario in SCENARIO_NAMES:
            self.assertEqual(projection(scenario, dispatch="smart")["throughput_tph"], projection(scenario)["throughput_tph"])

    def test_unknown_policy_is_rejected(self):
        with self.assertRaises(ValueError):
            MineEngine().set_dispatch("greedy")
        with self.assertRaises(ValueError):
            projection("baseline", dispatch="greedy")

    def test_smart_dispatch_keeps_production_with_fewer_truck_hours(self):
        for scenario in SCENARIO_NAMES:
            _, fixed = self.steady(scenario, "fixed")
            mine, smart = self.steady(scenario, "smart")
            self.assertAlmostEqual(smart["production_t"], fixed["production_t"], delta=1e-6, msg=scenario)
            self.assertLessEqual(smart["truck_operating_h_per_kt"], fixed["truck_operating_h_per_kt"] + 1e-9, scenario)
            self.assertAlmostEqual(mine.mass_balance_error_t(), 0.0, places=6)
        _, fixed = self.steady("baseline", "fixed")
        _, smart = self.steady("baseline", "smart")
        self.assertLess(smart["truck_operating_h_per_kt"], 0.7 * fixed["truck_operating_h_per_kt"])
        self.assertAlmostEqual(smart["truck_standby_pct"], 100 * 2 / 6, delta=0.5)  # two of six trucks parked
        self.assertLess(smart["excavator_wait_min"], fixed["excavator_wait_min"])

    def test_parked_trucks_are_empty_and_stopped_at_the_face(self):
        def check(mine):
            for truck in mine.trucks:
                if truck.state == "standby":
                    self.assertEqual(truck.payload_t, 0.0)
                    self.assertEqual(truck.progress, 0.0)
        mine = MineEngine()
        mine.set_dispatch("smart")
        run(mine, 3, check=check)
        state = mine.snapshot()
        parked = [n for n in state if n.startswith("truck-") and state[n]["state"]["value"] == "standby"]
        self.assertTrue(parked)
        for name in parked:
            self.assertEqual(state[name]["speed_kmh"]["value"], 0)
            self.assertEqual(state[name]["route_progress_pct"]["value"], 0)
        self.assertEqual(state["scenario-controller"]["trucks_standby"]["value"], len(parked))
        self.assertEqual(state["scenario-controller"]["dispatch_policy"]["value"], "smart")
        json.dumps(state)

    def test_road_restriction_parks_no_truck(self):
        mine, smart = self.steady("road_closure", "smart")
        self.assertEqual(smart["truck_standby_pct"], 0.0)
        self.assertNotIn("standby", {t.state for t in mine.trucks})

    def test_breakdown_releases_a_parked_truck_and_never_costs_production(self):
        mine = MineEngine()
        mine.set_dispatch("smart")
        run(mine, 4)
        mine.set_scenario("truck_breakdown")
        self.assertGreaterEqual(len(mine._in_cycle()) + sum(t.state == "blocked" for t in mine.trucks),
                                min(mine.dispatch_need(), sum(t.state != "breakdown" for t in mine.trucks)))
        for offset_min in (0, 24, 27, 33):  # failures on either direction lane, the costly case
            first_hour = {}
            for policy in ("fixed", "smart"):
                mine = run(MineEngine(), 4 + offset_min / 60)
                mine.set_dispatch(policy)
                mine.set_scenario("truck_breakdown")
                mine._reset_window()
                run(mine, 1)
                first_hour[policy] = mine.kpis()["production_t"]
            self.assertGreaterEqual(first_hour["smart"], first_hour["fixed"] - 1e-6, offset_min)

    def test_switching_back_to_fixed_releases_every_parked_truck(self):
        mine = MineEngine()
        mine.set_dispatch("smart")
        run(mine, 3)
        self.assertIn("standby", {t.state for t in mine.trucks})
        mine.set_dispatch("fixed")
        self.assertNotIn("standby", {t.state for t in mine.trucks})
        run(mine, 1)
        self.assertAlmostEqual(mine.mass_balance_error_t(), 0.0, places=6)


class DispatchEvidenceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from compare_scenarios import comparison_evidence
        cls.evidence = comparison_evidence()

    def test_every_pair_uses_the_same_initial_state_and_windows(self):
        common = self.evidence["methodology"]["common_start_state_sha256"]
        self.assertEqual(self.evidence["methodology"]["warmup_h"], 4)
        self.assertEqual(self.evidence["methodology"]["transient_window_h"], 1)
        self.assertEqual(self.evidence["methodology"]["steady_window_h"], 8)
        for scenario, result in self.evidence["scenarios"].items():
            with self.subTest(scenario=scenario):
                self.assertEqual(result["start_state_sha256"], common)
                self.assertEqual(result["periods"]["transient"]["window_h"], 1)
                self.assertEqual(result["periods"]["steady"]["window_h"], 8)

    def test_baseline_smart_parks_two_without_losing_steady_throughput(self):
        steady = self.evidence["scenarios"]["baseline"]["periods"]["steady"]
        self.assertEqual(steady["fixed"]["cycling_trucks_avg"], 6)
        self.assertEqual(steady["smart"]["cycling_trucks_avg"], 4)
        self.assertEqual(steady["smart"]["standby_trucks_avg"], 2)
        self.assertAlmostEqual(steady["fixed"]["throughput_tph"], 770, delta=1)
        self.assertAlmostEqual(steady["smart"]["throughput_tph"], 770, delta=1)
        self.assertAlmostEqual(steady["smart"]["estimated_fuel_l"], 8 * 281.9, places=6)
        self.assertAlmostEqual(steady["fixed"]["estimated_fuel_l"], 8 * 381.1, places=6)

    def test_operating_hours_reduction_is_reproducible_for_every_condition(self):
        expected_pct = {
            "baseline": -33.333338,
            "truck_breakdown": -20.0,
            "road_closure": 0.0,
            "crusher_slowdown": -50.0,
        }
        for scenario, expected in expected_pct.items():
            with self.subTest(scenario=scenario):
                steady = self.evidence["scenarios"][scenario]["periods"]["steady"]
                self.assertAlmostEqual(
                    steady["smart_minus_fixed"]["truck_operating_h_per_kt"]["percent"], expected, delta=1e-5
                )
                self.assertAlmostEqual(steady["fixed"]["throughput_tph"], steady["smart"]["throughput_tph"], places=6)


class InterfaceTests(unittest.TestCase):
    def test_snapshot_keeps_every_feature_the_interface_reads(self):
        state = MineEngine().snapshot()
        required = {
            "mine-01": ["production_t", "throughput_tph", "fleet_utilization", "average_cycle_min", "active_scenario", "sim_time_s",
                        "simulation_speed_multiplier", "simulation_mode"],
            "excavator-01": ["state", "queue_length", "position_x", "position_z"],
            "crusher-01": ["state", "capacity_tph", "queue_length", "rom_inventory_t", "processed_total_t", "position_x", "position_z"],
            "road-main": ["state", "speed_limit_kmh", "traffic_count", "blockage", "blocked_trucks",
                          "traffic_model", "blockage_lane", "blockage_heading",
                          "blocked_crusher_bound_trucks", "blocked_face_bound_trucks"],
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

    def test_frontend_metrics_match_the_generated_steady_evidence(self):
        """UI-facing twins and evidence use the same scenario window and formulas."""
        from compare_scenarios import evaluate

        for scenario in SCENARIO_NAMES:
            with self.subTest(scenario=scenario):
                evidence = evaluate(scenario)["steady"]
                mine = MineEngine()
                run(mine, 4)
                mine.set_scenario(scenario)
                mine._reset_window()
                run(mine, 1)
                mine._reset_window()
                run(mine, 8)
                twins = mine.snapshot()
                self.assertAlmostEqual(twins["mine-01"]["throughput_tph"]["value"],
                                       evidence["throughput_tph"], delta=0.01)
                self.assertAlmostEqual(twins["mine-01"]["average_cycle_min"]["value"],
                                       evidence["average_cycle_min"], delta=0.01)
                self.assertAlmostEqual(twins["mine-01"]["fleet_utilization"]["value"],
                                       evidence["fleet_utilization_pct"], delta=0.01)
                self.assertAlmostEqual(twins["excavator-01"]["average_wait_min"]["value"],
                                       evidence["excavator_wait_min"], delta=0.01)
                self.assertAlmostEqual(twins["crusher-01"]["average_wait_min"]["value"],
                                       evidence["crusher_wait_min"], delta=0.01)
                self.assertAlmostEqual(twins["crusher-01"]["utilization_pct"]["value"],
                                       evidence["crusher_utilization_pct"], delta=0.01)


if __name__ == "__main__":
    unittest.main()
