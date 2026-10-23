# Docker clean-start evidence — 2026-10-23

This record captures the P1 judge-environment rehearsal performed on the
Windows 10 development host using Docker Desktop Linux containers. It is
evidence of a clean Compose deployment, not a claim that the final native
Ubuntu 24.04 judge-VM gate has been completed.

## Environment and command

- Repository branch: `codex/ademix`
- Container OS/architecture: Linux/AMD64 for every resolved Compose image
- Host-only exception: local Windows Mosquitto owns port 1883, so the ignored
  `deploy/compose/.env` maps host port 1884 to container port 1883. Internal
  service addresses and the committed judge default remain unchanged.
- Existing project containers and volumes were removed with `down -v
  --remove-orphans` before the test.
- Startup used the literal README Compose files and options:

```text
docker compose --env-file deploy/compose/.env \
  -f deploy/compose/docker-compose.yml \
  -f ademix/compose.yml \
  up -d --build --wait --wait-timeout 900
```

Measured wall time: **85.93 seconds**, well below the 75-minute limit.

The three build targets completed successfully:

- `openegiz/ditto-extended-api:local-b49663d`
- `ademix/mine-simulator:local`
- `ademix/mine-ui:local`

The Ademix build contexts resolve inside this repository. The organizer's
extended API is built from its commit-pinned Git URL, so the first build still
requires internet access, as does pulling the declared base/service images.
No build reads an uncommitted local path outside the repository.

## Service and OpenEgiz checks

Compose reported all long-running services healthy or running and all setup
jobs exited successfully. The documented read-only smoke command returned:

```text
PASS API health is ok
PASS source is eclipse-ditto
PASS all 11 required twins exist
PASS all 120 required fields and units are valid
```

Documented browser/API endpoints:

| Endpoint | Result |
| --- | --- |
| `http://localhost:4173/` | HTTP 200 |
| `http://localhost:8088/api/health` | HTTP 200 |
| `http://localhost:8088/api/state` | HTTP 200 |
| `http://localhost:3000/api/health` | HTTP 200 |

The state endpoint returned the real Eclipse Ditto source rather than replay
or local demo data.

## Disk and architecture

Every one of the 16 unique resolved Compose images reported `linux/amd64`.
The conservative sum of their individual image sizes is **7.632 GiB**; this
over-counts shared layers. Docker's actual system report immediately after the
clean start was:

```text
Images          18 total, 16 active, 5.802 GB
Containers      19 total, 16 active, 1.843 MB
Local volumes    9 total,  8 active, 352.8 MB
Build cache     131 entries,          2.95 GB
```

Even the conservative image sum plus current volumes and build cache is far
below the judge's 60 GB disk limit. Build cache is not required at runtime.

## Runtime assets

A targeted scan of `ademix/frontend/src` and `ademix/frontend/public` found no
HTTP URLs or CSS `url(...)` references. All GLB models, dirt textures, and the
ingestion data file used at runtime are Git-tracked under
`ademix/frontend/public`; together they occupy **2.94 MiB**. The production UI
therefore does not fetch models, textures, fonts, scripts, or data from an
external CDN.

## Remaining release gate

Repeat the exact README procedure once on a clean Ubuntu 24.04 AMD64 machine.
That final run is required before checking the native judge-VM item in
`RULES_CHECKLIST.md`. Do not describe this Windows-host rehearsal as a native
Ubuntu verification.
