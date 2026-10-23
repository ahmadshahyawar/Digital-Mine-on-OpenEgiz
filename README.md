# Ademix: 3D Open-Pit Operations Twin on OpenEgiz

Ademix is a live 3D digital twin for an open-pit mine dispatcher. Six haul trucks move between an excavator and primary crusher while OpenEgiz tracks equipment state, production, queues, road conditions, and scenario effects.

The browser scene does not read the simulator directly. Operational updates travel through MQTT into Eclipse Ditto, and the UI reads the resulting twins back from Ditto through the Ademix API.

## Run on a clean Ubuntu machine

Requirements match the competition judge environment:

- Ubuntu 24.04 amd64;
- Docker Engine 29 or compatible; and
- Docker Compose v2 (`docker compose`).

No API key, paid service, GPU, Node.js, Python, `make`, or external dataset download is required. The first run downloads the declared container images and builds two small Ademix images.

From the repository root, run exactly:

```bash
bash scripts/compose-env.sh
docker compose --env-file deploy/compose/.env \
  -f deploy/compose/docker-compose.yml \
  -f ademix/compose.yml \
  up -d --build --wait --wait-timeout 900
```

Expected result: the command exits successfully after OpenEgiz, the twin setup job, simulator, and UI are ready.

The latest recorded clean-start rehearsal, including startup time, disk use,
image architecture, URL checks, and the remaining Ubuntu verification gate, is
in [`evidence/docker-clean-start-2026-10-23.md`](evidence/docker-clean-start-2026-10-23.md).

## What to open

- **Ademix 3D Command Center:** <http://localhost:4173>
- OpenEgiz/Grafana: <http://localhost:3000>
- Ademix health endpoint: <http://localhost:8088/api/health>

The generated Grafana, Ditto, and InfluxDB credentials are stored in the ignored `deploy/compose/.env` file. They are not needed to use the 3D Command Center.

## Five-minute judging path

1. Open <http://localhost:4173> and wait for the header to show `LIVE VIA ECLIPSE-DITTO`.
2. Left-drag to move around the mine, right-drag to rotate, and use the wheel to zoom toward the pointer. Double-click equipment for a close view; **Overview** restores the whole mine. Keep **Balanced** graphics for software rendering.
3. Select a truck to inspect payload, fuel, speed, position, trips, and cycle time from its Ditto twin.
4. Choose **Truck HT-01 breakdown**. Truck 01 turns red and stops; utilization falls.
5. Choose **Main road restriction**. The road turns orange and moving truck speed falls from 25 to approximately 10.72 km/h.
6. Choose **Crusher capacity −45%**. Crusher state becomes constrained, capacity falls from 900 to 495 t/h, and run-of-mine inventory accumulates.
7. Choose **Normal operations** to reset the active operating condition.

Scenario controls change the underlying simulation state. Their effects are published through MQTT and only become visible after Ditto returns the updated twins, normally within two seconds.

## Verify from the terminal

Run the read-only judge smoke check. It waits for slow startup, requires the
real Eclipse Ditto source, and validates all 11 mine twins plus every required
field and unit:

```bash
docker compose --env-file deploy/compose/.env \
  -f deploy/compose/docker-compose.yml \
  -f ademix/compose.yml \
  run --rm --no-deps ademix-simulator \
  python smoke_check.py --base-url http://ademix-ui
```

Expected result: four `PASS` lines for API health, Ditto source, twin inventory,
and the complete field/unit contract. This command is read-only and does not
change the active scenario.

```bash
curl --fail http://localhost:8088/api/health
curl --fail http://localhost:8088/api/state

curl --fail -X POST http://localhost:8088/api/scenario \
  -H 'Content-Type: application/json' \
  -d '{"scenario":"crusher_slowdown"}'

sleep 3
curl --fail http://localhost:8088/api/state
```

Verify all four operating states through the frontend proxy, scenario API,
MQTT, Eclipse Ditto, and the read API, including the exact frontend field
contract and a clean reset back to baseline:

```bash
python ademix/simulator/verify_scenarios.py
```

The check fails unless `/api/state` reports `source: eclipse-ditto`; local demo
mode therefore cannot be mistaken for an end-to-end OpenEgiz verification.

The state response must report `"source":"eclipse-ditto"` and include 11 twins in namespace `org.openegiz.ademix`.

Run the deterministic simulation checks in the already-built simulator image:

```bash
docker compose --env-file deploy/compose/.env \
  -f deploy/compose/docker-compose.yml \
  -f ademix/compose.yml \
  run --rm --no-deps ademix-simulator \
  python -m unittest discover -s /app/simulator -p 'test_*.py' -v
```

## Stop or reset

Stop containers while keeping data:

```bash
docker compose --env-file deploy/compose/.env \
  -f deploy/compose/docker-compose.yml \
  -f ademix/compose.yml down
```

To remove this deployment's containers and volumes, add `-v` to the final command. Delete `deploy/compose/.env` only when deleting the volumes too, because existing services retain the credentials with which they were initialized.

## Windows 10 development

Docker Desktop with Linux containers is sufficient; WSL Ubuntu is not required. Run `scripts/compose-env.sh` with Git Bash once, then run the same `docker compose` command in PowerShell. A clean Ubuntu run of the commands above remains a release gate; Windows checks are not proof of judge-environment compatibility.

## Architecture

```text
Deterministic Python simulation
           │ Ditto Protocol messages
           ▼
      MQTT / Mosquitto
           │ OpenEgiz connection
           ▼
      Eclipse Ditto twins
           │ authenticated HTTP reads
           ▼
       Ademix API ─────► React + Three.js 3D Command Center
           │
           └──────────► OpenEgiz telemetry pipeline / InfluxDB / Grafana
```

## Repository contents

| Path | Purpose |
|---|---|
| `ademix/simulator/` | Deterministic haulage/crusher model, twin definitions, MQTT publisher, Ditto read API, and tests |
| `ademix/data/` | Fleet specification, telemetry dictionary, model manifest, and included OpenMines calibration data |
| `ademix/frontend/` | CPU-conscious React Three Fiber command center served by Nginx |
| `ademix/data/openmines/` | Included MIT-licensed North Pit reference configuration and its license |
| `ademix/compose.yml` | Services layered onto the official OpenEgiz Compose deployment |
| `SUBMISSION.md` | Concept, modules, scenarios, verification path, data, and limitations |
| `DATA_LICENSES.md` | Exact data/asset provenance and licensing record |
| `REUSE_CATALOG.md` | License-reviewed reuse decisions and rejected sources |
| `RULES_CHECKLIST.md` | Internal competition release gate |

The included mine layout is a reduced fictional visualization calibrated from the anonymized North Pit configuration in OpenMines. Live values are synthetic simulation telemetry, not measurements from an operating mine.

## License

Team code is released under the [MIT License](LICENSE). Included third-party data retains its recorded license; see [DATA_LICENSES.md](DATA_LICENSES.md).

Platform: OpenEgiz v1.0.4 from [aleka07/openegiz](https://github.com/aleka07/openegiz).
