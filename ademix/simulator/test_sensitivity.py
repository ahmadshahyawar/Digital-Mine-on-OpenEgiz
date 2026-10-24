from pathlib import Path
import unittest

import engine
from sensitivity import BASE_INPUTS, build_evidence, evidence_json


FIXTURE = Path(__file__).parents[1] / "data" / "evidence" / "fleet_sensitivity.json"


class SensitivityEvidenceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.evidence = build_evidence()

    def test_fixture_regenerates_byte_for_byte(self):
        self.assertEqual(FIXTURE.read_text(encoding="utf-8"), evidence_json())

    def test_exactly_one_input_changes_in_each_case(self):
        for name, study in self.evidence["studies"].items():
            for case in study["cases"]:
                changed = [key for key, base in BASE_INPUTS.items() if case["inputs"][key] != base]
                if case["inputs"][name] == BASE_INPUTS[name]:
                    self.assertEqual(changed, [])
                else:
                    self.assertEqual(changed, [name])
                self.assertEqual(case["changed_input"], name)

    def test_each_study_changes_the_model_recommendation(self):
        for name, study in self.evidence["studies"].items():
            recommendations = {
                case["recommendation"]["recommended_active_trucks"] for case in study["cases"]
            }
            self.assertGreater(len(recommendations), 1, name)

    def test_every_case_reconciles_and_has_no_mass_error(self):
        for study in self.evidence["studies"].values():
            for case in study["cases"]:
                for fleet_case in case["fleet_cases"]:
                    self.assertAlmostEqual(fleet_case["production_t"] / 8.0,
                                           fleet_case["throughput_tph"], places=6)
                    self.assertAlmostEqual(fleet_case["mass_balance_error_t"], 0.0, places=6)

    def test_generator_restores_live_engine_constants(self):
        self.assertEqual(engine.ROUTE_KM, BASE_INPUTS["route_length_km"])
        self.assertEqual(engine.LOAD_SECONDS / 60.0, BASE_INPUTS["loading_duration_min"])
        self.assertEqual(engine.BASE_CRUSHER_TPH, BASE_INPUTS["crusher_capacity_tph"])

    def test_claim_does_not_imply_statistical_or_field_validation(self):
        self.assertTrue(self.evidence["synthetic"])
        claim = self.evidence["claim"]
        self.assertIn("not measured uncertainty", claim)
        self.assertIn("site validation", claim)


if __name__ == "__main__":
    unittest.main()
