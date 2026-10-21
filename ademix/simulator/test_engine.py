"""Deterministic checks for the Ademix haulage and crusher model."""

import unittest

from engine import BASE_CRUSHER_TPH, CAPACITY_T, MineEngine


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
        self.assertEqual(truck["speed_kmh"]["value"], 15.5)

    def test_scenario_projection_exposes_baseline_comparison(self):
        mine = MineEngine()
        mine.set_scenario("road_closure")
        scenario = mine.snapshot()["scenario-controller"]
        self.assertEqual(scenario["baseline_throughput_tph"]["value"], 900.0)
        self.assertEqual(scenario["projected_throughput_tph"]["value"], 648.0)
        self.assertEqual(scenario["impact_pct"]["value"], -28)

    def test_every_scenario_exposes_its_documented_projection(self):
        expected = {
            "baseline": (0, 900.0),
            "truck_breakdown": (-17, 747.0),
            "road_closure": (-28, 648.0),
            "crusher_slowdown": (-45, 495.0),
        }
        for name, (impact, projected) in expected.items():
            with self.subTest(scenario=name):
                mine = MineEngine()
                mine.set_scenario(name)
                controller = mine.snapshot()["scenario-controller"]
                self.assertEqual(controller["impact_pct"]["value"], impact)
                self.assertEqual(controller["projected_throughput_tph"]["value"], projected)

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
            250.0,
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


if __name__ == "__main__":
    unittest.main()
