# Contributing to Ademix

Thank you for your interest in Ademix. Contributions that improve reproducibility, simulation credibility, OpenEgiz integration, accessibility or software-rendering performance are welcome.

## Before you start

1. Read `README.md`, `ademix/simulator/MODEL.md`, `ademix/data/README.md` and the relevant contracts under `ademix/simulator/` and `ademix/data/`.
2. Open an issue describing the problem or proposed improvement before making a large change.
3. Create a focused branch from the latest `main`.
4. Preserve data provenance, units, scenario semantics and the distinction between synthetic telemetry and measured data.

## Development checks

Run the checks that match your change:

```bash
python -B -m unittest discover -s ademix/simulator -p 'test_*.py'
python -B -m unittest discover -s ademix/data -p 'test_*.py'
```

For frontend changes:

```bash
cd ademix/frontend
npm ci
npm run build
```

For integration changes, start the complete Compose stack and run the smoke test plus scenario matrix documented in `README.md`.

## Pull requests

- Keep each pull request limited to one coherent purpose.
- Explain the user-visible effect and the verification performed.
- Add or update tests for behavior changes.
- Do not commit credentials, generated `.env` files or private operational data.
- Record new data, models, textures and copied code in `DATA_LICENSES.md` and `NOTICE` as applicable.
- Do not present synthetic results as measured mine performance.

## Project areas

- `ademix/simulator/`: deterministic simulation, dispatch, MQTT/Ditto API and backend tests
- `ademix/frontend/`: React/Three.js interface and visual assets
- `ademix/data/`: schemas, evidence, calibration data and provenance
- `deploy/compose/` and `ademix/compose.yml`: deployment and OpenEgiz integration

By contributing, you agree that your contribution may be distributed under the repository's MIT License, while third-party material retains its own recorded license.
