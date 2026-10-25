"""Ademix simulator, MQTT publisher, Ditto read API, and scenario controls."""

from __future__ import annotations

import base64
import copy
import json
import logging
import os
from threading import Event, Lock, Thread
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
INTERVAL = float(os.environ.get("SIM_INTERVAL", "5"))
CACHE_TTL = float(os.environ.get("DITTO_CACHE_TTL", "3"))
THING_NAMES = ["mine-01", "excavator-01", "crusher-01", "road-main", "scenario-controller"] + [f"truck-{i:02d}" for i in range(1, 7)]
TWINS_PATH = os.path.join(os.path.dirname(__file__), "twins.json")

log = logging.getLogger("ademix")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
SIMULATION_MODE = "local_demo" if DEMO_MODE else "openegiz_live"
engine = MineEngine(simulation_speed_multiplier=SPEEDUP, simulation_mode=SIMULATION_MODE)
stop_event = Event()
ditto_read_lock = Lock()
ditto_cache = None
ditto_cache_time = 0.0
ditto_retry_after = 0.0
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


def publish_snapshot(snapshot, cycle_started):
    """Spread twin writes through the tick instead of bursting all writes together."""
    if not snapshot:
        return
    for index, (name, features) in enumerate(snapshot.items()):
        mqtt_client.publish(f"telemetry/{name}", json.dumps(ditto_message(name, features)), qos=0)
        deadline = cycle_started + INTERVAL * (index + 1) / len(snapshot)
        remaining = deadline - time.monotonic()
        if remaining > 0 and stop_event.wait(remaining):
            return


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
        cycle_started = time.monotonic()
        engine.step(INTERVAL * SPEEDUP)
        publish_snapshot(engine.snapshot(), cycle_started)
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
    if not DEMO_MODE:
        # Do not report the API ready (and therefore start the polling UI) until
        # one complete bulk read has warmed the Ditto cache.
        state()
    return {
        "status": "ok", "scenario": engine.scenario, "dispatch": engine.dispatch,
        "sim_time_s": engine.sim_time_s,
        "simulation_speed_multiplier": engine.simulation_speed_multiplier,
        "simulation_mode": engine.simulation_mode,
    }


@app.get("/api/state")
def state():
    global ditto_cache, ditto_cache_time, ditto_retry_after
    if DEMO_MODE:
        return {"source": "local-simulator-demo", "twins": demo_twins()}
    if not DITTO_PASSWORD:
        raise HTTPException(status_code=503, detail="Ditto credentials unavailable")
    now = time.monotonic()
    if ditto_cache is not None and now - ditto_cache_time < CACHE_TTL:
        return {"source": "eclipse-ditto", "twins": ditto_cache}
    if ditto_cache is not None and now < ditto_retry_after:
        return {"source": "eclipse-ditto", "twins": ditto_cache}

    # Do not queue every overlapping browser poll behind a slow Ditto read.
    # A cached twin snapshot remains subject to the frontend's simulated-clock
    # stale check; this only avoids multiplying one delayed read into a backlog.
    if ditto_cache is not None:
        if not ditto_read_lock.acquire(blocking=False):
            return {"source": "eclipse-ditto", "twins": ditto_cache}
    else:
        ditto_read_lock.acquire()
    try:
        auth = (DITTO_USER, DITTO_PASSWORD)
        now = time.monotonic()
        if ditto_cache is not None and now - ditto_cache_time < CACHE_TTL:
            return {"source": "eclipse-ditto", "twins": ditto_cache}
        if ditto_cache is not None and now < ditto_retry_after:
            return {"source": "eclipse-ditto", "twins": ditto_cache}
        if ditto_cache is None and now < ditto_retry_after:
            raise HTTPException(status_code=503, detail="Ditto state temporarily unavailable")
        try:
            with httpx.Client(timeout=5.0) as client:
                thing_ids = ",".join(f"{NAMESPACE}:{name}" for name in THING_NAMES)
                response = client.get(
                    f"{DITTO_URL}/api/2/things",
                    params={"ids": thing_ids},
                    auth=auth,
                )
                response.raise_for_status()
                twins = response.json()
                if not isinstance(twins, list) or len(twins) != len(THING_NAMES):
                    count = len(twins) if isinstance(twins, list) else "invalid response"
                    raise ValueError(f"expected {len(THING_NAMES)} twins, got {count}")
                ditto_cache = twins
                ditto_cache_time = time.monotonic()
                ditto_retry_after = 0.0
        except httpx.HTTPError as exc:
            ditto_retry_after = time.monotonic() + min(INTERVAL, 2.0)
            if ditto_cache is not None:
                log.warning("Ditto snapshot refresh failed; serving last confirmed twin snapshot: %s", exc)
                return {"source": "eclipse-ditto", "twins": ditto_cache}
            raise HTTPException(status_code=503, detail=f"Ditto state unavailable: {exc}") from exc
        except ValueError as exc:
            ditto_retry_after = time.monotonic() + min(INTERVAL, 2.0)
            if ditto_cache is not None:
                log.warning("Ditto returned an incomplete snapshot; serving last confirmed twin snapshot: %s", exc)
                return {"source": "eclipse-ditto", "twins": ditto_cache}
            raise HTTPException(status_code=503, detail=f"Ditto state incomplete: {exc}") from exc
    finally:
        ditto_read_lock.release()
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


@app.post("/api/shift/reset")
def reset_shift():
    """Explicitly start a new cumulative fuel/CO2 reporting shift."""
    engine.reset_shift_totals()
    return {
        "status": "reset",
        "shift_id": engine.shift_id,
        "shift_start_sim_s": engine.shift_start_sim_s,
    }

