"""Contract tests for the A3 production/recovery history fixture."""

import json
import unittest

from history_evidence import BREAKDOWN_RECOVERY_S, generate_history, history_json


class HistoryEvidenceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.history = generate_history()

    def test_timestamps_are_monotonic_simulated_seconds(self):
        for series in [self.history["baseline"]["samples"]] + [
            period["samples"] for period in self.history["breakdown_recovery"]["periods"]
        ]:
            times = [point["sim_time_s"] for point in series]
            self.assertEqual(times, sorted(times))
            self.assertEqual(len(times), len(set(times)))
        event_times = [item["sim_time_s"] for item in self.history["breakdown_recovery"]["events"]]
        self.assertEqual(event_times, sorted(event_times))

    def test_breakdown_has_loss_tow_and_recovery(self):
        events = {item["kind"]: item for item in self.history["breakdown_recovery"]["events"]}
        self.assertEqual(events["road_cleared"]["sim_time_s"] - events["breakdown_started"]["sim_time_s"],
                         BREAKDOWN_RECOVERY_S)
        samples = self.history["breakdown_recovery"]["periods"][0]["samples"]
        baseline = self.history["baseline"]["samples"]
        self.assertLess(min(p["observed_rolling_throughput_tph"] for p in samples),
                        min(p["observed_rolling_throughput_tph"] for p in baseline))
        recovery = events["throughput_recovered"]
        point = next(p for p in samples if p["sim_time_s"] == recovery["sim_time_s"])
        self.assertGreaterEqual(point["observed_rolling_throughput_tph"],
                                0.95 * point["projected_steady_capacity_tph"])

    def test_reset_starts_new_period_and_clears_disruption_state(self):
        reset = next(e for e in self.history["breakdown_recovery"]["events"] if e["kind"] == "reset")
        self.assertEqual(reset["period_id"], 2)
        first = self.history["breakdown_recovery"]["periods"][1]["samples"][0]
        self.assertEqual(first["elapsed_s"], 0)
        self.assertEqual(first["active_scenario"], "baseline")
        self.assertEqual(first["road_state"], "open")
        self.assertEqual(first["blocked_trucks"], 0)

    def test_observed_and_projected_series_remain_distinct(self):
        points = self.history["breakdown_recovery"]["periods"][0]["samples"]
        self.assertTrue(any(p["observed_rolling_throughput_tph"] != p["projected_steady_capacity_tph"] for p in points))
        self.assertEqual(self.history["field_sources"]["observed_rolling_throughput_tph"], "mine-01.throughput_tph")
        self.assertEqual(self.history["field_sources"]["projected_steady_capacity_tph"],
                         "scenario-controller.projected_throughput_tph")

    def test_json_is_deterministic(self):
        self.assertEqual(history_json(), history_json())
        json.loads(history_json())


if __name__ == "__main__":
    unittest.main()
