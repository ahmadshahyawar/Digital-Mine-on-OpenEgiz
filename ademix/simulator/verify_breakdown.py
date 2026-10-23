#!/usr/bin/env python3
"""Verify the HT-01 breakdown contract through the public Ademix API.

The state endpoint reads Eclipse Ditto in the normal Compose deployment, so a
passing run proves scenario API -> simulator -> MQTT -> Ditto -> API propagation.
The script always attempts to restore the baseline scenario before exiting.
"""

from __future__ import annotations

import argparse
import json
import time
import urllib.error
import urllib.request

from engine import MineEngine


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


def wait_for(base_url: str, description: str, predicate, timeout_s: float) -> tuple[dict, dict]:
    deadline = time.monotonic() + timeout_s
    last_state: dict = {}
    last_twins: dict = {}
    while time.monotonic() < deadline:
        last_state = request_json(f"{base_url}/api/state")
        last_twins = twins_by_name(last_state)
        if predicate(last_state, last_twins):
            return last_state, last_twins
        time.sleep(1)
    raise AssertionError(f"timed out waiting for {description}; last source={last_state.get('source')}")


def first_hour_throughput(scenario: str) -> float:
    """Reproduce the documented warm-start comparison with the production engine."""
    mine = MineEngine()
    for _ in range(4 * 360):
        mine.step(10)
    if scenario == "baseline":
        # Baseline is already active, so explicitly start the same comparison window.
        mine._reset_window()
    else:
        mine.set_scenario(scenario)
    for _ in range(360):
        mine.step(10)
    return float(mine.kpis()["window_throughput_tph"])


def verify(base_url: str, timeout_s: float) -> None:
    baseline_observed = first_hour_throughput("baseline")
    breakdown_observed = first_hour_throughput("truck_breakdown")
    if breakdown_observed >= baseline_observed:
        raise AssertionError(
            f"first-hour breakdown throughput did not decrease: "
            f"{breakdown_observed:.1f} >= {baseline_observed:.1f}"
        )

    base_url = base_url.rstrip("/")
    state, _ = wait_for(base_url, "all eleven twins", lambda s, t: len(t) == 11, timeout_s)
    if state.get("source") != "eclipse-ditto":
        raise AssertionError(f"expected eclipse-ditto, got {state.get('source')!r}")

    request_json(f"{base_url}/api/scenario", {"scenario": "baseline"})
    wait_for(base_url, "baseline in Ditto", lambda _s, t: value(t, "scenario-controller", "active") == "baseline", timeout_s)

    try:
        request_json(f"{base_url}/api/scenario", {"scenario": "truck_breakdown"})
        _, twins = wait_for(
            base_url,
            "HT-01 breakdown in Ditto",
            lambda _s, t: (
                value(t, "scenario-controller", "active") == "truck_breakdown"
                and value(t, "truck-01", "state") == "breakdown"
                and float(value(t, "truck-01", "speed_kmh")) == 0
            ),
            timeout_s,
        )

        broken = [name for name in (f"truck-{i:02d}" for i in range(1, 7)) if value(twins, name, "state") == "breakdown"]
        if broken != ["truck-01"]:
            raise AssertionError(f"expected only truck-01 broken, got {broken}")
        baseline_tph = float(value(twins, "scenario-controller", "baseline_throughput_tph"))
        projected_tph = float(value(twins, "scenario-controller", "projected_throughput_tph"))
        # Five healthy trucks can still feed the 770 t/h excavator in steady state,
        # so the analytical long-run projection correctly remains 770 t/h. The
        # operational loss is transient and is verified above over the first hour.
        if projected_tph != baseline_tph:
            raise AssertionError(
                f"unexpected steady-state projection: {projected_tph} != {baseline_tph}"
            )
        if value(twins, "scenario-controller", "breakdown_location") == "none":
            raise AssertionError("breakdown location was not published")

        healthy_states = [value(twins, f"truck-{i:02d}", "state") for i in range(2, 7)]
        if all(state in {"breakdown", "blocked"} for state in healthy_states):
            raise AssertionError("all healthy trucks stopped; FIFO operation did not continue")
        print(
            f"PASS breakdown propagated through {state['source']}: HT-01 stopped; "
            f"first-hour throughput {baseline_observed:.1f} -> {breakdown_observed:.1f} t/h; "
            f"steady-state projection {projected_tph:.0f} t/h"
        )
    finally:
        request_json(f"{base_url}/api/scenario", {"scenario": "baseline"})

    _, twins = wait_for(
        base_url,
        "clean baseline reset in Ditto",
        lambda _s, t: (
            value(t, "scenario-controller", "active") == "baseline"
            and value(t, "truck-01", "state") != "breakdown"
            and value(t, "road-main", "state") == "open"
            and value(t, "scenario-controller", "breakdown_location") == "none"
            and float(value(t, "scenario-controller", "impact_pct")) == 0
        ),
        timeout_s,
    )
    if any(value(twins, f"truck-{i:02d}", "state") in {"breakdown", "blocked"} for i in range(1, 7)):
        raise AssertionError("stale breakdown/blocked state remained after reset")
    print("PASS baseline reset propagated: road open, no stale breakdown or blocked trucks")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:8088")
    parser.add_argument("--timeout", type=float, default=90)
    args = parser.parse_args()
    try:
        verify(args.url, args.timeout)
    except (AssertionError, KeyError, urllib.error.URLError) as exc:
        raise SystemExit(f"FAIL {exc}") from exc
