#!/usr/bin/env python3
"""Read-only judge smoke check for the Ademix API and Eclipse Ditto twins."""

from __future__ import annotations

import argparse
import json
import time
import urllib.error
import urllib.request

from engine import MineEngine

NAMESPACE = "org.openegiz.ademix"


def get_json(url: str, timeout_s: float) -> dict:
    with urllib.request.urlopen(url, timeout=timeout_s) as response:
        return json.load(response)


def wait_json(url: str, deadline_s: float) -> dict:
    deadline = time.monotonic() + deadline_s
    last_error: Exception | None = None
    while time.monotonic() < deadline:
        try:
            return get_json(url, min(10.0, deadline_s))
        except (OSError, urllib.error.URLError, json.JSONDecodeError) as exc:
            last_error = exc
            time.sleep(2)
    raise AssertionError(f"timed out waiting for {url}: {last_error}")


def validate(base_url: str, timeout_s: float = 120.0) -> list[str]:
    base = base_url.rstrip("/")
    health = wait_json(f"{base}/api/health", timeout_s)
    if health.get("status") != "ok":
        raise AssertionError(f"API unhealthy: {health}")

    state = wait_json(f"{base}/api/state", timeout_s)
    if state.get("source") != "eclipse-ditto":
        raise AssertionError(f"expected eclipse-ditto, got {state.get('source')!r}")
    twins = {twin.get("thingId"): twin for twin in state.get("twins", [])}
    expected = MineEngine().snapshot()
    expected_ids = {f"{NAMESPACE}:{name}" for name in expected}
    if set(twins) != expected_ids:
        missing = sorted(expected_ids - set(twins))
        extra = sorted(set(twins) - expected_ids)
        raise AssertionError(f"twin inventory mismatch; missing={missing}, extra={extra}")

    checked = 0
    for name, features in expected.items():
        thing_id = f"{NAMESPACE}:{name}"
        actual = twins[thing_id].get("features", {})
        for field, properties in features.items():
            if field not in actual:
                raise AssertionError(f"{thing_id} missing field {field}")
            actual_properties = actual[field].get("properties", {})
            if "value" not in actual_properties:
                raise AssertionError(f"{thing_id}.{field} missing value")
            expected_unit = properties.get("unit")
            actual_unit = actual_properties.get("unit")
            if actual_unit != expected_unit:
                raise AssertionError(
                    f"{thing_id}.{field} unit {actual_unit!r}; expected {expected_unit!r}"
                )
            checked += 1
    return [
        "API health is ok",
        f"source is eclipse-ditto",
        f"all {len(expected_ids)} required twins exist",
        f"all {checked} required fields and units are valid",
    ]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:4173")
    parser.add_argument("--timeout", type=float, default=120.0)
    args = parser.parse_args()
    try:
        messages = validate(args.base_url, args.timeout)
    except (AssertionError, OSError, urllib.error.URLError, json.JSONDecodeError) as exc:
        print(f"FAIL {exc}")
        return 1
    for message in messages:
        print(f"PASS {message}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
