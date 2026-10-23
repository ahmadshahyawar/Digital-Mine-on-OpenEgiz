"""OpenEgiz startup, API, twin-contract and frontend fallback checks."""

from __future__ import annotations

import os
from pathlib import Path
import unittest
import urllib.error
from unittest import mock

os.environ.setdefault("DITTO_PASSWORD", "test-only")
os.environ["ADEMIX_DEMO_MODE"] = "1"  # keeps host tests independent of the optional MQTT package

import app as simulator_app
import setup_twins
from engine import MineEngine


ADEMIX_ROOT = Path(__file__).resolve().parents[1]
FRONTEND_SOURCE = ADEMIX_ROOT / "frontend" / "src" / "IngestionLayer.tsx"
if not FRONTEND_SOURCE.exists():
    FRONTEND_SOURCE = Path("/app/frontend/src/IngestionLayer.tsx")
MAIN_SOURCE = ADEMIX_ROOT / "frontend" / "src" / "main.tsx"
if not MAIN_SOURCE.exists():
    MAIN_SOURCE = Path("/app/frontend/src/main.tsx")


class SlowDependencyTests(unittest.TestCase):
    def test_mqtt_connect_retries_then_recovers(self):
        client = mock.Mock()
        client.connect.side_effect = [OSError("starting"), OSError("starting"), None]
        simulator_app.stop_event.set()
        try:
            with mock.patch.object(simulator_app, "mqtt_client", client), mock.patch.object(
                simulator_app.time, "sleep"
            ) as sleep:
                simulator_app.simulation_loop()
        finally:
            simulator_app.stop_event.clear()
        self.assertEqual(client.connect.call_count, 3)
        self.assertEqual(sleep.call_count, 2)
        client.loop_start.assert_called_once()
        client.loop_stop.assert_called_once()

    def test_ditto_setup_retries_then_recovers(self):
        responses = [urllib.error.URLError("starting"), TimeoutError("starting"), 201]
        with mock.patch.object(setup_twins, "put", side_effect=responses) as put, mock.patch.object(
            setup_twins.time, "sleep"
        ) as sleep:
            status = setup_twins.put_with_retry("org.openegiz.ademix:mine-01", {}, attempts=3, delay_s=0)
        self.assertEqual(status, 201)
        self.assertEqual(put.call_count, 3)
        self.assertEqual(sleep.call_count, 2)


class ApiReliabilityTests(unittest.TestCase):
    def setUp(self):
        simulator_app.engine = MineEngine()

    def test_ditto_failure_returns_503_instead_of_crashing(self):
        with mock.patch.object(simulator_app, "DEMO_MODE", False), mock.patch.object(
            simulator_app, "DITTO_PASSWORD", "present"
        ), mock.patch.object(
            simulator_app.httpx, "Client", side_effect=simulator_app.httpx.ConnectError("offline")
        ):
            with self.assertRaises(simulator_app.HTTPException) as raised:
                simulator_app.state()
        self.assertEqual(raised.exception.status_code, 503)
        self.assertIn("Ditto state unavailable", raised.exception.detail)

    def test_invalid_scenario_is_rejected_without_state_change(self):
        before = simulator_app.engine.snapshot()
        with self.assertRaises(simulator_app.HTTPException) as raised:
            simulator_app.scenario(simulator_app.ScenarioRequest(scenario="unsafe_magic"))
        self.assertEqual(raised.exception.status_code, 400)
        self.assertEqual(simulator_app.engine.scenario, "baseline")
        self.assertEqual(simulator_app.engine.snapshot(), before)


class FrontendReliabilityTests(unittest.TestCase):
    def test_ui_distinguishes_live_demo_and_replay_and_handles_poll_errors(self):
        source = FRONTEND_SOURCE.read_text(encoding="utf-8")
        for label in (
            "LIVE · Eclipse Ditto twins · every 2 s",
            "DEMO · local simulator (not via OpenEgiz) · every 2 s",
            "REPLAY · recorded synthetic log (stand offline)",
        ):
            self.assertIn(label, source)
        self.assertIn("catch {", source)
        self.assertIn("setLive(false)", source)
        main = MAIN_SOURCE.read_text(encoding="utf-8")
        self.assertIn("data.source === 'eclipse-ditto' && !error", main)
        self.assertIn("setError(reason instanceof Error", main)
        self.assertIn("Waiting for OpenEgiz state…", main)


if __name__ == "__main__":
    unittest.main()
