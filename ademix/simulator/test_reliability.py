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
    def test_deployment_publish_interval_limits_ditto_pressure(self):
        self.assertEqual(simulator_app.INTERVAL, 5)

    def test_ditto_read_cache_expires_before_the_next_publish(self):
        self.assertEqual(simulator_app.CACHE_TTL, 3)
        self.assertLess(simulator_app.CACHE_TTL, simulator_app.INTERVAL)

    def test_snapshot_publications_are_spread_across_the_tick(self):
        snapshot = {name: {"sim_time_s": index} for index, name in enumerate(("mine-01", "truck-01", "truck-02"))}
        client = mock.Mock()
        waits = []

        def wait(delay):
            waits.append(delay)
            return False

        with mock.patch.object(simulator_app, "mqtt_client", client), mock.patch.object(
            simulator_app.time, "monotonic", side_effect=(10.5, 12.0, 15.1)
        ), mock.patch.object(simulator_app.stop_event, "wait", side_effect=wait):
            simulator_app.publish_snapshot(snapshot, cycle_started=10.0)

        self.assertEqual(client.publish.call_count, 3)
        self.assertEqual([call.args[0] for call in client.publish.call_args_list], [
            "telemetry/mine-01", "telemetry/truck-01", "telemetry/truck-02",
        ])
        self.assertEqual(len(waits), 2)
        self.assertAlmostEqual(waits[0], 5 / 3 - 0.5)
        self.assertAlmostEqual(waits[1], 10 / 3 - 2.0)

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
        simulator_app.ditto_cache = None
        simulator_app.ditto_cache_time = 0.0
        simulator_app.ditto_retry_after = 0.0

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

    def test_state_uses_one_bulk_ditto_read_for_all_twins(self):
        response = mock.Mock()
        response.json.return_value = [
            {"thingId": f"{simulator_app.NAMESPACE}:{name}"}
            for name in simulator_app.THING_NAMES
        ]
        client = mock.MagicMock()
        client.__enter__.return_value.get.return_value = response
        with mock.patch.object(simulator_app, "DEMO_MODE", False), mock.patch.object(
            simulator_app, "DITTO_PASSWORD", "present"
        ), mock.patch.object(simulator_app.httpx, "Client", return_value=client):
            result = simulator_app.state()
        self.assertEqual(result["source"], "eclipse-ditto")
        self.assertEqual(len(result["twins"]), len(simulator_app.THING_NAMES))
        client.__enter__.return_value.get.assert_called_once_with(
            f"{simulator_app.DITTO_URL}/api/2/things",
            params={
                "ids": ",".join(
                    f"{simulator_app.NAMESPACE}:{name}"
                    for name in simulator_app.THING_NAMES
                )
            },
            auth=(simulator_app.DITTO_USER, "present"),
        )
        response.raise_for_status.assert_called_once()

    def test_incomplete_bulk_ditto_read_returns_503(self):
        response = mock.Mock()
        response.json.return_value = []
        client = mock.MagicMock()
        client.__enter__.return_value.get.return_value = response
        with mock.patch.object(simulator_app, "DEMO_MODE", False), mock.patch.object(
            simulator_app, "DITTO_PASSWORD", "present"
        ), mock.patch.object(simulator_app.httpx, "Client", return_value=client):
            with self.assertRaises(simulator_app.HTTPException) as raised:
                simulator_app.state()
        self.assertEqual(raised.exception.status_code, 503)
        self.assertIn("Ditto state incomplete", raised.exception.detail)

    def test_state_coalesces_frontend_polls_within_publish_interval(self):
        response = mock.Mock()
        response.json.return_value = [
            {"thingId": f"{simulator_app.NAMESPACE}:{name}"}
            for name in simulator_app.THING_NAMES
        ]
        client = mock.MagicMock()
        client.__enter__.return_value.get.return_value = response
        with mock.patch.object(simulator_app, "DEMO_MODE", False), mock.patch.object(
            simulator_app, "DITTO_PASSWORD", "present"
        ), mock.patch.object(simulator_app.httpx, "Client", return_value=client):
            first = simulator_app.state()
            second = simulator_app.state()
        self.assertEqual(first, second)
        client.__enter__.return_value.get.assert_called_once()

    def test_overlapping_poll_returns_last_snapshot_without_waiting_for_ditto(self):
        snapshot = [{"thingId": f"{simulator_app.NAMESPACE}:mine-01"}]
        simulator_app.ditto_cache = snapshot
        simulator_app.ditto_cache_time = 0.0
        simulator_app.ditto_read_lock.acquire()
        try:
            with mock.patch.object(simulator_app, "DEMO_MODE", False), mock.patch.object(
                simulator_app, "DITTO_PASSWORD", "present"
            ), mock.patch.object(simulator_app.httpx, "Client") as client:
                result = simulator_app.state()
        finally:
            simulator_app.ditto_read_lock.release()
        self.assertEqual(result, {"source": "eclipse-ditto", "twins": snapshot})
        client.assert_not_called()

    def test_temporary_read_failure_uses_cache_and_limits_retry_storm(self):
        snapshot = [{"thingId": f"{simulator_app.NAMESPACE}:mine-01"}]
        simulator_app.ditto_cache = snapshot
        simulator_app.ditto_cache_time = 0.0
        with mock.patch.object(simulator_app, "DEMO_MODE", False), mock.patch.object(
            simulator_app, "DITTO_PASSWORD", "present"
        ), mock.patch.object(
            simulator_app.httpx, "Client", side_effect=simulator_app.httpx.ConnectError("offline")
        ) as client, mock.patch.object(simulator_app.time, "monotonic", return_value=100.0):
            first = simulator_app.state()
            second = simulator_app.state()
        expected = {"source": "eclipse-ditto", "twins": snapshot}
        self.assertEqual(first, expected)
        self.assertEqual(second, expected)
        self.assertEqual(client.call_count, 1)
        self.assertEqual(simulator_app.ditto_retry_after, 102.0)

    def test_live_health_waits_for_a_complete_ditto_read(self):
        with mock.patch.object(simulator_app, "DEMO_MODE", False), mock.patch.object(
            simulator_app, "state", side_effect=simulator_app.HTTPException(status_code=503)
        ) as read_state:
            with self.assertRaises(simulator_app.HTTPException) as raised:
                simulator_app.health()
        self.assertEqual(raised.exception.status_code, 503)
        read_state.assert_called_once()

    def test_invalid_scenario_is_rejected_without_state_change(self):
        before = simulator_app.engine.snapshot()
        with self.assertRaises(simulator_app.HTTPException) as raised:
            simulator_app.scenario(simulator_app.ScenarioRequest(scenario="unsafe_magic"))
        self.assertEqual(raised.exception.status_code, 400)
        self.assertEqual(simulator_app.engine.scenario, "baseline")
        self.assertEqual(simulator_app.engine.snapshot(), before)

    def test_shift_reset_endpoint_resets_only_accounting_totals(self):
        simulator_app.engine.step(600)
        scenario_before = simulator_app.engine.scenario
        production_before = simulator_app.engine.production_t
        result = simulator_app.reset_shift()
        self.assertEqual(result["status"], "reset")
        self.assertEqual(result["shift_id"], 2)
        self.assertEqual(result["shift_start_sim_s"], 600)
        self.assertEqual(simulator_app.engine.shift_fuel_l, 0)
        self.assertEqual(simulator_app.engine.shift_co2_kg, 0)
        self.assertEqual(simulator_app.engine.scenario, scenario_before)
        self.assertEqual(simulator_app.engine.production_t, production_before)

    def test_health_and_demo_state_share_the_backend_clock(self):
        simulator_app.engine = MineEngine(simulation_speed_multiplier=5, simulation_mode="local_demo")
        simulator_app.engine.step(300)
        health = simulator_app.health()
        twins = {twin["thingId"]: twin for twin in simulator_app.demo_twins()}
        clock = twins["org.openegiz.ademix:mine-01"]["features"]
        self.assertEqual(health["sim_time_s"], 300)
        self.assertEqual(health["simulation_speed_multiplier"], 5)
        self.assertEqual(health["simulation_mode"], "local_demo")
        self.assertEqual(clock["sim_time_s"]["properties"]["value"], 300)
        self.assertEqual(clock["simulation_speed_multiplier"]["properties"]["value"], 5)
        self.assertEqual(clock["simulation_mode"]["properties"]["value"], "local_demo")


class FrontendReliabilityTests(unittest.TestCase):
    def test_ui_distinguishes_live_demo_and_replay_and_handles_poll_errors(self):
        source = FRONTEND_SOURCE.read_text(encoding="utf-8")
        for label in (
            "LIVE · Eclipse Ditto twins · checked every 2 s",
            "DEMO · local simulator (not via OpenEgiz) · checked every 2 s",
            "REPLAY · recorded synthetic log (stand offline)",
            "STALE ·",
        ):
            self.assertIn(label, source)
        self.assertIn("const STALE_MS = 7000", source)
        self.assertIn("const FAILS_TO_REPLAY = 3", source)
        self.assertIn("catch {", source)
        self.assertIn("setLive(false)", source)
        main = MAIN_SOURCE.read_text(encoding="utf-8")
        self.assertIn("data.source === 'eclipse-ditto' && !error", main)
        self.assertIn("setError(reason instanceof Error", main)
        self.assertIn("Waiting for OpenEgiz state…", main)


if __name__ == "__main__":
    unittest.main()
