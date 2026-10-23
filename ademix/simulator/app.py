"""Ademix simulator, MQTT publisher, Ditto read API, and scenario controls."""

from __future__ import annotations

import base64
import copy
import json
import logging
import os
from threading import Event, Thread
import time

from fastapi import FastAPI, HTTPException
import httpx
from pydantic import BaseModel

from engine import MineEngine

DEMO_MODE = os.environ.get("ADEMIX_DEMO_MODE", "0") == "1"
if not DEMO_MODE:
    import paho.mqtt.client as mqtt

NAMESPACE = "org.openegiz.ademix"
MQTT_HOST = os.environ.get("MQTT_HOST", "localhost")
MQTT_PORT = int(os.environ.get("MQTT_PORT", "1883"))
DITTO_URL = os.environ.get("DITTO_URL", "http://localhost:8080").rstrip("/")
DITTO_USER = os.environ.get("DITTO_USER", "ditto")
DITTO_PASSWORD = os.environ.get("DITTO_PASSWORD", "")
SPEEDUP = float(os.environ.get("SIM_SPEEDUP", "20"))
INTERVAL = float(os.environ.get("SIM_INTERVAL", "1"))
THING_NAMES = ["mine-01", "excavator-01", "crusher-01", "road-main", "scenario-controller"] + [f"truck-{i:02d}" for i in range(1, 7)]
TWINS_PATH = os.path.join(os.path.dirname(__file__), "twins.json")

log = logging.getLogger("ademix")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
engine = MineEngine()
stop_event = Event()
mqtt_client = None if DEMO_MODE else mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="ademix-simulator")
app = FastAPI(title="Ademix Mine API", version="0.1.0")


class ScenarioRequest(BaseModel):
    scenario: str


class DispatchRequest(BaseModel):
    policy: str


def ditto_message(name, features):
    return {
        "topic": f"{NAMESPACE}/{name}/things/twin/commands/modify",
        "path": "/features",
        "value": {key: {"properties": value} for key, value in features.items()},
    }


def simulation_loop():
    for attempt in range(60):
        try:
            mqtt_client.connect(MQTT_HOST, MQTT_PORT, keepalive=30)
            mqtt_client.loop_start()
            break
        except OSError as exc:
            if attempt == 59:
                log.error("MQTT unavailable: %s", exc)
                return
            time.sleep(2)
    while not stop_event.is_set():
        engine.step(INTERVAL * SPEEDUP)
        for name, features in engine.snapshot().items():
            mqtt_client.publish(f"telemetry/{name}", json.dumps(ditto_message(name, features)), qos=0)
        stop_event.wait(INTERVAL)
    mqtt_client.loop_stop()
    mqtt_client.disconnect()


def demo_loop():
    """Advance the real engine locally without MQTT/Ditto for UI review only."""
    while not stop_event.is_set():
        engine.step(INTERVAL * SPEEDUP)
        stop_event.wait(INTERVAL)


def demo_twins():
    with open(TWINS_PATH, encoding="utf-8") as handle:
        definitions = json.load(handle)
    snapshot = engine.snapshot()
    twins = []
    for thing_id, definition in definitions.items():
        twin = copy.deepcopy(definition)
        name = thing_id.split(":", 1)[1]
        twin["thingId"] = thing_id
        twin["features"] = {
            key: {"properties": value}
            for key, value in snapshot[name].items()
        }
        twins.append(twin)
    return twins


@app.on_event("startup")
def startup():
    target = demo_loop if DEMO_MODE else simulation_loop
    Thread(target=target, name="mine-simulation", daemon=True).start()


@app.on_event("shutdown")
def shutdown():
    stop_event.set()


@app.get("/api/health")
def health():
    return {"status": "ok", "scenario": engine.scenario, "dispatch": engine.dispatch}


@app.get("/api/state")
def state():
    if DEMO_MODE:
        return {"source": "local-simulator-demo", "twins": demo_twins()}
    if not DITTO_PASSWORD:
        raise HTTPException(status_code=503, detail="Ditto credentials unavailable")
    auth = (DITTO_USER, DITTO_PASSWORD)
    twins = []
    try:
        with httpx.Client(timeout=5.0) as client:
            for name in THING_NAMES:
                response = client.get(f"{DITTO_URL}/api/2/things/{NAMESPACE}:{name}", auth=auth)
                response.raise_for_status()
                twins.append(response.json())
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail=f"Ditto state unavailable: {exc}") from exc
    return {"source": "eclipse-ditto", "twins": twins}


@app.post("/api/scenario")
def scenario(request: ScenarioRequest):
    try:
        engine.set_scenario(request.scenario)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"scenario": engine.scenario, "status": "activated"}


@app.post("/api/dispatch")
def dispatch(request: DispatchRequest):
    """Scenario C: switch between the fixed fleet and smart dispatch, independently of the scenario."""
    try:
        engine.set_dispatch(request.policy)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"dispatch": engine.dispatch, "status": "activated"}

