"""Deterministic checks for the Ademix haulage and crusher model."""

import unittest

from engine import BASE_CRUSHER_TPH, CAPACITY_T, DUMP_SECONDS, LOAD_SECONDS, MineEngine


class MineEngineTests(unittest.TestCase):
    def test_same_seed_produces_same_initial_state(self):
        self.assertEqual(MineEngine(42).snapshot(), MineEngine(42).snapshot())

    def test_invalid_scenario_is_rejected(self):
        with self.assertRaises(ValueError):
            MineEngine().set_scenario("magic_output")

    def test_non_positive_step_is_rejected(self):
        with self.assertRaises(ValueError):
            MineEngine().step(0)

    def test_breakdown_stops_only_designated_truck_and_reset_recovers_it(self):
        mine = MineEngine()
        mine.set_scenario("truck_breakdown")
        mine.step(30)
        self.assertEqual(mine.trucks[0].state, "breakdown")
        self.assertNotEqual(mine.trucks[1].state, "breakdown")
        mine.set_scenario("baseline")
        mine.step(30)
        self.assertNotEqual(mine.trucks[0].state, "breakdown")

    def test_road_closure_reduces_reported_speed(self):
        mine = MineEngine()
        mine.set_scenario("road_closure")
        mine.step(1)
        truck = mine.snapshot()["truck-01"]
        self.assertEqual(truck["speed_kmh"]["value"], 10.72)

    def test_scenario_projection_exposes_baseline_comparison(self):
        mine = MineEngine()
        mine.set_scenario("road_closure")
        scenario = mine.snapshot()["scenario-controller"]
        self.assertEqual(scenario["baseline_throughput_tph"]["value"], 770.0)
        self.assertAlmostEqual(scenario["projected_throughput_tph"]["value"], 648.4, delta=1.0)
        self.assertEqual(scenario["impact_pct"]["value"], -16)

    def test_every_scenario_exposes_its_documented_projection(self):
        expected = {
            "baseline": (0, 770.0),
            "truck_breakdown": (-3, 745.2),
            "road_closure": (-16, 648.4),
            "crusher_slowdown": (-36, 495.0),
        }
        for name, (impact, projected) in expected.items():
            with self.subTest(scenario=name):
                mine = MineEngine()
                mine.set_scenario(name)
                controller = mine.snapshot()["scenario-controller"]
                self.assertEqual(controller["impact_pct"]["value"], impact)
                self.assertAlmostEqual(controller["projected_throughput_tph"]["value"], projected, delta=1.0)

    def test_reported_road_limit_matches_truck_speed_during_restriction(self):
        mine = MineEngine()
        mine.set_scenario("road_closure")
        state = mine.snapshot()
        self.assertEqual(
            state["road-main"]["speed_limit_kmh"]["value"],
            state["truck-01"]["speed_kmh"]["value"],
        )

    def test_crusher_slowdown_processes_less_without_losing_ore(self):
        baseline = MineEngine()
        slowdown = MineEngine()
        slowdown.set_scenario("crusher_slowdown")
        baseline.step(600)
        slowdown.step(600)
        self.assertGreater(baseline.production_t, slowdown.production_t)
        self.assertAlmostEqual(
            baseline.production_t,
            BASE_CRUSHER_TPH * 600 / 3600,
            places=5,
        )
        self.assertAlmostEqual(
            slowdown.production_t,
            BASE_CRUSHER_TPH * 0.55 * 600 / 3600,
            places=5,
        )
        self.assertAlmostEqual(
            slowdown.production_t + slowdown.rom_inventory_t,
            250.0 + slowdown.delivered_t,
            places=5,
        )

    def test_completed_dump_preserves_full_payload_as_inventory_or_product(self):
        mine = MineEngine()
        truck = mine.trucks[0]
        truck.progress = 1.0
        truck.state = "dumping"
        truck.timer_s = 59
        before_total = mine.production_t + mine.rom_inventory_t
        mine.step(1)
        after_total = mine.production_t + mine.rom_inventory_t
        self.assertAlmostEqual(after_total - before_total, CAPACITY_T, places=5)
        self.assertEqual(truck.payload_t, 0)

    def test_only_one_truck_uses_each_service_resource(self):
        mine = MineEngine()
        for truck in mine.trucks:
            truck.state = "waiting_loading"
            truck.queue_entered_s = 0
        mine.step(1)
        self.assertEqual(sum(truck.state == "loading" for truck in mine.trucks), 1)
        self.assertEqual(sum(truck.state == "waiting_loading" for truck in mine.trucks), 5)

        crusher_mine = MineEngine()
        for truck in crusher_mine.trucks:
            truck.state = "waiting_crusher"
            truck.queue_entered_s = 0
        crusher_mine.step(1)
        self.assertEqual(sum(truck.state == "dumping" for truck in crusher_mine.trucks), 1)
        self.assertEqual(sum(truck.state == "waiting_crusher" for truck in crusher_mine.trucks), 5)

    def test_full_truck_cycle_visits_every_stage_in_order(self):
        mine = MineEngine()
        target = mine.trucks[0]
        target.progress = 0.0
        target.direction = -1
        target.payload_t = 0.0
        target.state = "returning"
        target.state_history = ["returning"]
        for truck in mine.trucks[1:]:
            truck.state = "breakdown"

        mine.step(1000)

        expected = [
            "returning",
            "waiting_loading",
            "loading",
            "hauling",
            "waiting_crusher",
            "dumping",
            "returning",
        ]
        self.assertEqual(target.state_history[: len(expected)], expected)
        self.assertEqual(target.trips, 1)
        self.assertEqual(target.payload_t, 0.0)

    def test_waiting_trucks_are_reported_as_queue_not_active_service(self):
        mine = MineEngine()
        for truck in mine.trucks:
            truck.state = "waiting_loading"
            truck.queue_entered_s = 0
        mine.step(1)
        state = mine.snapshot()
        self.assertEqual(state["excavator-01"]["queue_length"]["value"], 5)

    def test_phase_durations_cover_the_complete_cycle(self):
        mine = MineEngine()
        target = mine.trucks[0]
        target.progress = 0.0
        target.direction = -1
        target.payload_t = 0.0
        target.state = "returning"
        target.state_history = ["returning"]
        target.movement_started_s = 0.0
        for truck in mine.trucks[1:]:
            truck.state = "breakdown"

        mine.step(1400)

        self.assertAlmostEqual(target.last_loading_s, 360.0, delta=1.0)
        self.assertAlmostEqual(target.last_haul_s, 461.0, delta=1.0)
        self.assertAlmostEqual(target.last_dump_s, 60.0, delta=1.0)
        self.assertAlmostEqual(target.last_return_s, 461.0, delta=1.0)
        self.assertAlmostEqual(
            target.last_cycle_s,
            target.last_loading_s + target.last_haul_s + target.last_crusher_wait_s + target.last_dump_s + target.last_return_s + target.last_loading_wait_s,
            delta=2.0,
        )

    def test_loading_queue_wait_is_measured(self):
        mine = MineEngine()
        first, second = mine.trucks[:2]
        for truck in mine.trucks:
            truck.state = "breakdown"
        first.state = "waiting_loading"
        second.state = "waiting_loading"
        first.queue_entered_s = 0.0
        second.queue_entered_s = 0.0

        mine.step(361)

        self.assertEqual(first.last_loading_wait_s, 1.0)
        self.assertAlmostEqual(second.last_loading_wait_s, 360.0, delta=1.0)

    def test_snapshot_reports_phase_and_fleet_wait_times(self):
        mine = MineEngine()
        truck = mine.trucks[0]
        truck.last_loading_wait_s = 120
        truck.last_crusher_wait_s = 60
        truck.last_loading_s = 360
        truck.last_haul_s = 461
        truck.last_dump_s = 60
        truck.last_return_s = 461
        truck.last_cycle_s = 1462
        truck.cycle_started_s = 1
        truck.trips = 1

        state = mine.snapshot()
        reported = state["truck-01"]
        self.assertEqual(reported["loading_wait_min"]["value"], 2.0)
        self.assertEqual(reported["crusher_wait_min"]["value"], 1.0)
        self.assertEqual(reported["loading_time_min"]["value"], 6.0)
        self.assertEqual(reported["dumping_time_min"]["value"], 1.0)
        self.assertEqual(state["mine-01"]["average_loading_wait_min"]["value"], 2.0)
        self.assertEqual(state["mine-01"]["average_crusher_wait_min"]["value"], 1.0)

    def test_loading_queue_is_first_in_first_out(self):
        mine = MineEngine()
        for truck in mine.trucks:
            truck.state = "breakdown"
        earlier, later = mine.trucks[1:3]
        earlier.state = "waiting_loading"
        earlier.queue_entered_s = 10
        later.state = "waiting_loading"
        later.queue_entered_s = 20

        mine.step(1)

        self.assertEqual(earlier.state, "loading")
        self.assertEqual(later.state, "waiting_loading")

    def test_crusher_queue_is_first_in_first_out(self):
        mine = MineEngine()
        for truck in mine.trucks:
            truck.state = "breakdown"
        earlier, later = mine.trucks[1:3]
        earlier.state = "waiting_crusher"
        earlier.queue_entered_s = 10
        later.state = "waiting_crusher"
        later.queue_entered_s = 20

        mine.step(1)

        self.assertEqual(earlier.state, "dumping")
        self.assertEqual(later.state, "waiting_crusher")

    def test_breakdown_releases_loader_and_recovery_requeues_safely(self):
        mine = MineEngine()
        interrupted, waiting = mine.trucks[:2]
        for truck in mine.trucks[2:]:
            truck.state = "breakdown"
        interrupted.state = "loading"
        interrupted.timer_s = 120
        waiting.state = "waiting_loading"
        waiting.queue_entered_s = 0

        mine.set_scenario("truck_breakdown")
        mine.step(1)
        self.assertEqual(interrupted.state, "breakdown")
        self.assertEqual(waiting.state, "loading")

        mine.set_scenario("baseline")
        self.assertEqual(interrupted.state, "waiting_loading")
        self.assertEqual(waiting.state, "loading")
        mine.step(360)
        self.assertEqual(interrupted.state, "loading")

    def test_resource_availability_is_reported(self):
        mine = MineEngine()
        mine.trucks[0].state = "loading"
        mine.trucks[1].state = "dumping"
        state = mine.snapshot()
        self.assertTrue(state["excavator-01"]["resource_busy"]["value"])
        self.assertTrue(state["crusher-01"]["dump_point_busy"]["value"])

    def assert_mass_conserved(self, mine):
        balance = mine.mass_balance()
        self.assertAlmostEqual(balance["balance_error_t"], 0.0, places=6)
        self.assertGreaterEqual(balance["extracted_t"], 0.0)
        self.assertGreaterEqual(balance["truck_payload_t"], 0.0)
        self.assertGreaterEqual(balance["rom_inventory_t"], 0.0)
        self.assertGreaterEqual(balance["processed_t"], 0.0)

    def test_mass_is_conserved_from_startup(self):
        mine = MineEngine()
        self.assertEqual(mine.extracted_t, 6 * CAPACITY_T)
        self.assert_mass_conserved(mine)

    def test_mass_is_conserved_during_short_run(self):
        mine = MineEngine()
        for _ in range(180):
            mine.step(1)
            self.assert_mass_conserved(mine)

    def test_mass_is_conserved_during_long_run_and_all_scenarios(self):
        for scenario in ("baseline", "truck_breakdown", "road_closure", "crusher_slowdown"):
            with self.subTest(scenario=scenario):
                mine = MineEngine()
                mine.set_scenario(scenario)
                for _ in range(720):
                    mine.step(10)
                self.assert_mass_conserved(mine)

    def test_reported_mass_balance_is_zero(self):
        mine = MineEngine()
        mine.step(3600)
        state = mine.snapshot()["mine-01"]
        self.assertEqual(state["mass_balance_error_t"]["value"], 0.0)
        self.assertEqual(
            state["truck_payload_total_t"]["value"],
            round(sum(truck.payload_t for truck in mine.trucks), 2),
        )

    def test_utilization_is_time_based_not_instantaneous(self):
        mine = MineEngine()
        for truck in mine.trucks:
            truck.state = "breakdown"
        active = mine.trucks[0]
        active.state = "hauling"
        mine.step(100)
        active.state = "breakdown"
        mine.step(100)

        state = mine.snapshot()["mine-01"]
        self.assertAlmostEqual(state["fleet_utilization"]["value"], 100 / (200 * 6) * 100, places=2)

    def test_resource_utilization_and_average_queues_are_time_weighted(self):
        mine = MineEngine()
        for truck in mine.trucks:
            truck.state = "breakdown"
        loader = mine.trucks[0]
        loader.state = "loading"
        waiting = mine.trucks[1]
        waiting.state = "waiting_loading"
        waiting.queue_entered_s = 0
        mine.step(60)

        state = mine.snapshot()["mine-01"]
        self.assertEqual(state["excavator_utilization"]["value"], 100.0)
        self.assertEqual(state["average_loading_queue"]["value"], 1.0)
        self.assertEqual(state["dump_point_utilization"]["value"], 0.0)

    def test_trip_rate_matches_completed_trips_and_elapsed_time(self):
        mine = MineEngine()
        mine.trucks[0].trips = 2
        mine.trucks[1].trips = 1
        mine.sim_time_s = 1800
        state = mine.snapshot()["mine-01"]
        self.assertEqual(state["trips_per_hour"]["value"], 6.0)

    def test_all_utilization_metrics_stay_between_zero_and_one_hundred(self):
        mine = MineEngine()
        mine.step(7200)
        state = mine.snapshot()["mine-01"]
        for key in ("fleet_utilization", "excavator_utilization", "dump_point_utilization", "crusher_utilization"):
            with self.subTest(metric=key):
                self.assertGreaterEqual(state[key]["value"], 0.0)
                self.assertLessEqual(state[key]["value"], 100.0)

    def test_breakdown_propagates_to_truck_fleet_and_road(self):
        mine = MineEngine()
        mine.set_scenario("truck_breakdown")
        mine.step(30)
        state = mine.snapshot()
        self.assertEqual(state["truck-01"]["state"]["value"], "breakdown")
        self.assertEqual(state["truck-01"]["speed_kmh"]["value"], 0)
        self.assertEqual(state["truck-02"]["speed_kmh"]["value"], 16.0)
        self.assertEqual(state["road-main"]["speed_limit_kmh"]["value"], 16.0)
        self.assertEqual(state["scenario-controller"]["affected_assets"]["value"], "truck-01,fleet,road")

    def test_road_restriction_increases_completed_cycle_time(self):
        baseline = MineEngine()
        restricted = MineEngine()
        restricted.set_scenario("road_closure")
        baseline.step(4 * 3600)
        restricted.step(4 * 3600)
        baseline_cycles = [truck.last_cycle_s for truck in baseline.trucks if truck.last_cycle_s]
        restricted_cycles = [truck.last_cycle_s for truck in restricted.trucks if truck.last_cycle_s]
        self.assertTrue(baseline_cycles)
        self.assertTrue(restricted_cycles)
        self.assertGreater(sum(restricted_cycles) / len(restricted_cycles), sum(baseline_cycles) / len(baseline_cycles))

    def test_crusher_slowdown_propagates_to_capacity_and_inventory(self):
        baseline = MineEngine()
        slowdown = MineEngine()
        slowdown.set_scenario("crusher_slowdown")
        baseline.step(4 * 3600)
        slowdown.step(4 * 3600)
        state = slowdown.snapshot()
        self.assertEqual(state["crusher-01"]["capacity_tph"]["value"], 495.0)
        self.assertEqual(state["crusher-01"]["state"]["value"], "constrained")
        self.assertGreater(slowdown.rom_inventory_t, baseline.rom_inventory_t)
        self.assertLess(slowdown.production_t, baseline.production_t)

    def test_reset_removes_all_scenario_effects(self):
        mine = MineEngine()
        mine.set_scenario("truck_breakdown")
        mine.step(30)
        mine.set_scenario("baseline")
        mine.step(1)
        state = mine.snapshot()
        self.assertNotEqual(state["truck-01"]["state"]["value"], "breakdown")
        self.assertEqual(state["road-main"]["state"]["value"], "open")
        self.assertEqual(state["road-main"]["speed_limit_kmh"]["value"], 25.0)
        self.assertEqual(state["crusher-01"]["capacity_tph"]["value"], 900.0)
        self.assertEqual(state["scenario-controller"]["active"]["value"], "baseline")
        self.assertEqual(state["scenario-controller"]["impact_pct"]["value"], 0)
        self.assertEqual(state["scenario-controller"]["affected_assets"]["value"], "none")

    def test_switching_scenarios_leaves_no_stale_effects_and_conserves_mass(self):
        mine = MineEngine()
        for scenario in ("truck_breakdown", "road_closure", "crusher_slowdown", "baseline"):
            mine.set_scenario(scenario)
            mine.step(600)
            self.assert_mass_conserved(mine)
        state = mine.snapshot()
        self.assertNotEqual(state["truck-01"]["state"]["value"], "breakdown")
        self.assertEqual(state["road-main"]["state"]["value"], "open")
        self.assertEqual(state["crusher-01"]["state"]["value"], "operating")

    def test_scenario_elapsed_time_restarts_on_activation(self):
        mine = MineEngine()
        mine.step(300)
        mine.set_scenario("road_closure")
        mine.step(120)
        controller = mine.snapshot()["scenario-controller"]
        self.assertEqual(controller["elapsed_min"]["value"], 2.0)

    def test_payload_fill_visualization_follows_truck_cycle(self):
        mine = MineEngine()
        truck = mine.trucks[0]
        truck.state = "loading"
        truck.timer_s = LOAD_SECONDS / 2
        self.assertEqual(mine.snapshot()["truck-01"]["payload_fill_pct"]["value"], 50.0)
        truck.state = "hauling"
        truck.payload_t = CAPACITY_T
        self.assertEqual(mine.snapshot()["truck-01"]["payload_fill_pct"]["value"], 100.0)
        truck.state = "waiting_crusher"
        self.assertEqual(mine.snapshot()["truck-01"]["payload_fill_pct"]["value"], 100.0)
        truck.state = "dumping"
        truck.timer_s = DUMP_SECONDS / 2
        self.assertEqual(mine.snapshot()["truck-01"]["payload_fill_pct"]["value"], 50.0)
        truck.state = "returning"
        truck.payload_t = 0
        self.assertEqual(mine.snapshot()["truck-01"]["payload_fill_pct"]["value"], 0.0)

    def test_route_progress_is_reported_for_visual_interpolation(self):
        mine = MineEngine()
        mine.trucks[0].progress = 0.375
        self.assertEqual(mine.snapshot()["truck-01"]["route_progress_pct"]["value"], 37.5)

    def test_long_run_throughput_converges_to_cycle_projection(self):
        for scenario in ("baseline", "truck_breakdown", "road_closure", "crusher_slowdown"):
            with self.subTest(scenario=scenario):
                mine = MineEngine()
                mine.set_scenario(scenario)
                for _ in range(8 * 360):
                    mine.step(10)
                warm_production = mine.production_t
                for _ in range(16 * 360):
                    mine.step(10)
                observed_tph = (mine.production_t - warm_production) / 16
                self.assertAlmostEqual(
                    observed_tph,
                    mine.projected_throughput_tph(),
                    delta=BASE_CRUSHER_TPH * 0.03,
                )


if __name__ == "__main__":
    unittest.main()
