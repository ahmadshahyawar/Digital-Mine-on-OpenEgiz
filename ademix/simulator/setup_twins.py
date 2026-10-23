#!/usr/bin/env python3
"""Create or update all Ademix twins in Eclipse Ditto."""

import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request

DITTO_URL = os.environ.get("DITTO_URL", "http://localhost:8080").rstrip("/")
DITTO_USER = os.environ.get("DITTO_USER", "ditto")
DITTO_PASSWORD = os.environ["DITTO_PASSWORD"]
TWINS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "twins.json")
AUTH = "Basic " + base64.b64encode(f"{DITTO_USER}:{DITTO_PASSWORD}".encode()).decode()


def put(thing_id, body):
    request = urllib.request.Request(
        f"{DITTO_URL}/api/2/things/{thing_id}",
        data=json.dumps(body).encode(),
        method="PUT",
        headers={"Authorization": AUTH, "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.status


def put_with_retry(thing_id, body, attempts=20, delay_s=3):
    """Wait for a slowly starting Ditto gateway without hiding a final failure."""
    for attempt in range(attempts):
        try:
            return put(thing_id, body)
        except (urllib.error.URLError, TimeoutError):
            if attempt == attempts - 1:
                raise
            time.sleep(delay_s)


def main():
    with open(TWINS_FILE, encoding="utf-8") as source:
        twins = json.load(source)
    for thing_id, body in twins.items():
        try:
            status = put_with_retry(thing_id, body)
            print(f"{'created' if status == 201 else 'updated'}  {thing_id}")
        except (urllib.error.URLError, TimeoutError) as exc:
            print(f"FAILED {thing_id}: {exc}", file=sys.stderr)
            return 1
    print(f"{len(twins)} Ademix twins ready")
    return 0


if __name__ == "__main__":
    sys.exit(main())

