import json
from pathlib import Path
import unittest

from engine import MineEngine
from fleet_sizing import FLEET_SIZES, build_evidence, evidence_json


FIXTURE = Path(__file__).parents[1] / "data" / "evidence" / "fleet_sizing.json"


class FleetSizingEvidenceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.evidence = build_evidence()

    def test_fixture_regenerates_byte_for_byte(self):
        self.assertEqual(FIXTURE.read_text(encoding="utf-8"), evidence_json())

    def test_every_case_uses_the_same_method_and_a_fresh_expected_fleet(self):
        self.assertTrue(self.evidence["methodology"]["fresh_engine_per_case"])
        self.assertFalse(self.evidence["methodology"]["live_twin_topology_changed"])
        for scenario in self.evidence["scenarios"].values():
            self.assertEqual([c["fleet_size_trucks"] for c in scenario["cases"]], list(FLEET_SIZES))
            self.assertEqual(len({c["start_state_sha256"] for c in scenario["cases"]}), len(FLEET_SIZES))

    def test_metrics_are_reconciled_and_have_declared_units(self):
        units = self.evidence["units"]
        required = {
            "production_t", "throughput_tph", "loading_queue_trucks_avg",
            "crusher_queue_trucks_avg", "truck_operating_h_per_1000_t",
        }
        self.assertTrue(required <= units.keys())
        window_h = self.evidence["methodology"]["measurement_window_h"]
        for scenario in self.evidence["scenarios"].values():
            for case in scenario["cases"]:
                self.assertAlmostEqual(case["production_t"] / window_h, case["throughput_tph"], places=6)
                expected_ratio = case["truck_operating_h"] / (case["production_t"] / 1000.0)
                self.assertAlmostEqual(expected_ratio, case["truck_operating_h_per_1000_t"], places=5)
                self.assertAlmostEqual(case["mass_balance_error_t"], 0.0, places=6)
                self.assertGreater(case["truck_operating_h_per_1000_t"], 0.0)

    def test_baseline_saturation_is_discovered_from_results(self):
        baseline = self.evidence["scenarios"]["baseline"]
        recommendation = baseline["recommendation"]
        self.assertTrue(recommendation["plateau_observed"])
        chosen = recommendation["recommended_active_trucks"]
        by_size = {c["fleet_size_trucks"]: c for c in baseline["cases"]}
        self.assertIn(chosen, by_size)
        self.assertIn(chosen + 1, by_size)
        gain = by_size[chosen + 1]["throughput_tph"] / by_size[chosen]["throughput_tph"] - 1
        self.assertLessEqual(gain, 0.01)
        for size in range(min(FLEET_SIZES), chosen):
            earlier_gain = by_size[size + 1]["throughput_tph"] / by_size[size]["throughput_tph"] - 1
            self.assertGreater(earlier_gain, 0.01)

    def test_evidence_is_explicitly_synthetic(self):
        self.assertTrue(self.evidence["synthetic"])
        self.assertIn("not measured", self.evidence["claim"])

    def test_live_default_topology_stays_at_six_truck_twins(self):
        truck_twins = [name for name in MineEngine().snapshot() if name.startswith("truck-")]
        self.assertEqual(len(truck_twins), 6)


if __name__ == "__main__":
    unittest.main()
