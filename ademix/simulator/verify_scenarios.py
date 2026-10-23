#!/usr/bin/env python3
"""Verify every scenario through the UI proxy and Eclipse Ditto.

This is a release smoke test, not a simulator unit test. Requests go to the
frontend origin by default, then through nginx -> Ademix API -> simulator ->
MQTT -> Eclipse Ditto -> API -> nginx. Demo-mode state is rejected.
"""

from __future__ import annotations

import argparse
import json
import time
import urllib.error
import urllib.request


TRUCKS = [f"truck-{i:02d}" for i in range(1, 7)]
FRONTEND_FIELDS = {
    "mine-01": {"active_scenario", "bottleneck_live", "operating_fleet_utilization", "production_t", "sim_time_s", "throughput_tph", "truck_operating_h_per_kt"},
    "excavator-01": {"average_wait_min", "queue_length", "state"},
    "crusher-01": {"average_wait_min", "rom_inventory_t", "state"},
    "road-main": {"blockage", "blocked_trucks", "speed_limit_kmh", "state", "traffic_model",
                  "blockage_lane", "blockage_heading", "blocked_crusher_bound_trucks",
                  "blocked_face_bound_trucks"},
    "scenario-controller": {"active", "bottleneck", "breakdown_location", "dispatch_description", "dispatch_policy", "dispatch_reason", "match_factor", "projected_throughput_tph", "trucks_in_cycle", "trucks_required", "trucks_standby"},
}
TRUCK_FIELDS = {"fuel_pct", "heading", "payload_t", "route_progress_pct", "speed_kmh", "state"}


def request_json(url: str, payload: dict | None = None) -> dict:
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"} if data else {},
        method="POST" if data else "GET",
    )
    with urllib.request.urlopen(request, timeout=8) as response:
        return json.load(response)


def twins_by_name(state: dict) -> dict[str, dict]:
    return {twin["thingId"].split(":", 1)[-1]: twin for twin in state["twins"]}


def value(twins: dict[str, dict], thing: str, feature: str):
    return twins[thing]["features"][feature]["properties"]["value"]


def wait_for(base_url: str, scenario: str, predicate, timeout_s: float) -> tuple[dict, dict]:
    deadline = time.monotonic() + timeout_s
    last: dict = {}
    while time.monotonic() < deadline:
        last = request_json(f"{base_url}/api/state")
        twins = twins_by_name(last)
        if (
            last.get("source") == "eclipse-ditto"
            and len(twins) == 11
            and value(twins, "scenario-controller", "active") == scenario
            and value(twins, "mine-01", "active_scenario") == scenario
            and predicate(twins)
        ):
            return last, twins
        time.sleep(1)
    raise AssertionError(f"timed out waiting for {scenario}; last source={last.get('source')!r}")


def verify_contract(twins: dict[str, dict]) -> None:
    required = dict(FRONTEND_FIELDS)
    required.update({truck: TRUCK_FIELDS for truck in TRUCKS})
    for thing, fields in required.items():
        missing = fields - set(twins[thing].get("features", {}))
        if missing:
            raise AssertionError(f"frontend contract missing {thing}: {sorted(missing)}")


def activate(base_url: str, scenario: str) -> None:
    response = request_json(f"{base_url}/api/scenario", {"scenario": scenario})
    if response != {"scenario": scenario, "status": "activated"}:
        raise AssertionError(f"unexpected activation response for {scenario}: {response}")


def set_dispatch(base_url: str, policy: str) -> None:
    response = request_json(f"{base_url}/api/dispatch", {"policy": policy})
    if response != {"dispatch": policy, "status": "activated"}:
        raise AssertionError(f"unexpected dispatch response for {policy}: {response}")


def verify(base_url: str, timeout_s: float) -> None:
    base_url = base_url.rstrip("/")
    results: list[str] = []
    try:
        set_dispatch(base_url, "fixed")
        activate(base_url, "baseline")
        state, twins = wait_for(
            base_url, "baseline",
            lambda t: (
                value(t, "road-main", "state") == "open"
                and float(value(t, "road-main", "speed_limit_kmh")) == 25.0
                and float(value(t, "crusher-01", "capacity_tph")) == 900.0
                and all(value(t, truck, "state") not in {"breakdown", "blocked"} for truck in TRUCKS)
            ), timeout_s,
        )
        verify_contract(twins)
        results.append("baseline: road open, 25 km/h, crusher 900 t/h")

        set_dispatch(base_url, "smart")
        _, twins = wait_for(
            base_url, "baseline",
            lambda t: (
                value(t, "scenario-controller", "dispatch_policy") == "smart"
                and int(value(t, "scenario-controller", "trucks_required")) == 4
                and int(value(t, "scenario-controller", "trucks_in_cycle")) == 4
                and int(value(t, "scenario-controller", "trucks_standby")) == 2
                and sum(value(t, truck, "state") == "standby" for truck in TRUCKS) == 2
            ), timeout_s,
        )
        verify_contract(twins)
        results.append("smart dispatch: 4 trucks cycling, 2 parked on standby")
        set_dispatch(base_url, "fixed")
        wait_for(
            base_url, "baseline",
            lambda t: (
                value(t, "scenario-controller", "dispatch_policy") == "fixed"
                and int(value(t, "scenario-controller", "trucks_standby")) == 0
                and all(value(t, truck, "state") != "standby" for truck in TRUCKS)
            ), timeout_s,
        )

        activate(base_url, "truck_breakdown")
        _, twins = wait_for(
            base_url, "truck_breakdown",
            lambda t: (
                value(t, "truck-01", "state") == "breakdown"
                and float(value(t, "truck-01", "speed_kmh")) == 0.0
                and value(t, "scenario-controller", "breakdown_location") != "none"
                and all(value(t, truck, "state") != "breakdown" for truck in TRUCKS[1:])
            ), timeout_s,
        )
        verify_contract(twins)
        results.append("truck_breakdown: only HT-01 stopped at 0 km/h")

        activate(base_url, "baseline")
        wait_for(base_url, "baseline", lambda t: all(value(t, truck, "state") not in {"breakdown", "blocked"} for truck in TRUCKS), timeout_s)

        activate(base_url, "road_closure")
        _, twins = wait_for(
            base_url, "road_closure",
            lambda t: (
                value(t, "road-main", "state") == "restricted"
                and abs(float(value(t, "road-main", "speed_limit_kmh")) - 10.72) < 0.01
                and float(value(t, "scenario-controller", "projected_throughput_tph")) < 770.0
            ), timeout_s,
        )
        moving = [truck for truck in TRUCKS if value(twins, truck, "state") in {"hauling", "returning"}]
        if not moving or any(abs(float(value(twins, truck, "speed_kmh")) - 10.72) >= 0.01 for truck in moving):
            raise AssertionError(f"moving trucks do not match restricted road speed: {moving}")
        verify_contract(twins)
        results.append("road_closure: road and moving trucks restricted to 10.72 km/h")

        activate(base_url, "crusher_slowdown")
        _, twins = wait_for(
            base_url, "crusher_slowdown",
            lambda t: (
                value(t, "crusher-01", "state") == "constrained"
                and float(value(t, "crusher-01", "capacity_tph")) == 495.0
                and float(value(t, "scenario-controller", "projected_throughput_tph")) == 495.0
            ), timeout_s,
        )
        verify_contract(twins)
        results.append("crusher_slowdown: constrained at 495 t/h")
    finally:
        set_dispatch(base_url, "fixed")
        activate(base_url, "baseline")

    _, twins = wait_for(
        base_url, "baseline",
        lambda t: (
            value(t, "road-main", "state") == "open"
            and value(t, "scenario-controller", "breakdown_location") == "none"
            and value(t, "scenario-controller", "dispatch_policy") == "fixed"
            and all(value(t, truck, "state") not in {"breakdown", "blocked", "standby"} for truck in TRUCKS)
        ), timeout_s,
    )
    verify_contract(twins)
    results.append("reset: no stale breakdown/blockage state")
    print(f"PASS source={state['source']}; twins={len(twins)}; frontend contract=complete")
    for result in results:
        print(f"PASS {result}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:4173")
    parser.add_argument("--timeout", type=float, default=90)
    args = parser.parse_args()
    try:
        verify(args.url, args.timeout)
    except (AssertionError, KeyError, urllib.error.URLError) as exc:
        raise SystemExit(f"FAIL {exc}") from exc
