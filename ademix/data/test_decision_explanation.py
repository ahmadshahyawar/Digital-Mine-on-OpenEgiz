import json
from pathlib import Path
import unittest

import build_decision_explanation as decision


DATA = Path(__file__).resolve().parent


class DecisionExplanationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.contract = decision.build()
        cls.a8 = json.loads((DATA / "evidence" / "fleet_sizing.json").read_text(encoding="utf-8"))

    def test_fixture_regenerates_byte_for_byte(self):
        fixture = (DATA / "evidence" / "decision_explanation.json").read_text(encoding="utf-8")
        self.assertEqual(fixture, decision.output_json())

    def test_all_four_judge_questions_are_answered(self):
        self.assertEqual(set(self.contract["questions"]),
                         {"baseline", "road_closure", "crusher_slowdown", "sensitivity"})
        for item in self.contract["questions"].values():
            self.assertTrue(item["question"])
            self.assertTrue(item["answer"])
            self.assertTrue(item["recommended_action"])
            self.assertTrue(item["evidence_pointer"])

    def test_scenario_numbers_are_copied_from_a8_not_recalculated(self):
        for scenario in ("baseline", "road_closure", "crusher_slowdown"):
            source = {case["fleet_size_trucks"]: case for case in self.a8["scenarios"][scenario]["cases"]}
            for shown in self.contract["questions"][scenario]["comparison"]:
                original = source[shown["trucks"]]
                for key, value in shown.items():
                    if key != "trucks":
                        self.assertEqual(value, original[key], f"{scenario}.{key}")

    def test_decision_boundaries_match_a8(self):
        self.assertEqual(self.a8["scenarios"]["baseline"]["recommendation"]["recommended_active_trucks"], 4)
        self.assertFalse(self.a8["scenarios"]["road_closure"]["recommendation"]["plateau_observed"])
        self.assertEqual(self.a8["scenarios"]["crusher_slowdown"]["recommendation"]["recommended_active_trucks"], 3)

    def test_truth_and_failure_contract_is_explicit(self):
        self.assertTrue(self.contract["synthetic"])
        self.assertTrue(self.contract["not_live_control"])
        presentation = self.contract["presentation_contract"]
        self.assertIn("unavailable", presentation["missing_data_behavior"])
        self.assertIn("Do not present", presentation["live_state_separation"])


if __name__ == "__main__":
    unittest.main()
