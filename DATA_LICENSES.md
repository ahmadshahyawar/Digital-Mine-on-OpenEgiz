# Data and Asset Licenses

This file records every external dataset, code reference, model, texture, and visual asset considered or included in the Ademix submission. The submission code is MIT-licensed; third-party material retains its own license.

## Included Data

### OpenMines — North Pit Mine configuration

- Source: <https://github.com/370025263/openmines>
- File: `ademix/data/openmines/north_pit_mine.json`
- Upstream path: `openmines/src/conf/north_pit_mine.json`
- License: MIT
- Copyright: Copyright (c) 2023 stone meng
- License copy: `ademix/data/openmines/LICENSE`
- Local SHA-256: `271134D6BBB46BC00162FAD87D0E10510B0BF4D1FEC4A2860F9784D663A7BBD8`
- Use: calibration reference for fleet size, truck capacity, truck speed, shovel capacity/cycle time, dump time, route distances, and road-repair event parameters.
- Modifications: the Ademix live simulation uses a reduced six-truck demonstration fleet and a simplified spatial route for judge-environment performance. It does not claim to reproduce the full OpenMines simulation.

The competition organizer explicitly lists this dataset as a recommended MIT-licensed source for open-pit haulage.

## Approved Visual Asset Sources

Assets are not yet committed from these sources. Before an asset is added, record its exact name, creator, source URL, downloaded variant, local path, size, and checksum here.

### Kenney

- Candidate packs: City Kit (Industrial), Factory Kit, City Kit (Roads), and 3D Road Tiles.
- License: Creative Commons CC0.
- Intended use: optimized low-poly industrial props, crusher/conveyor elements, barriers, and road furniture.
- Sources:
  - <https://kenney.nl/assets/city-kit-industrial>
  - <https://kenney.nl/assets/factory-kit>
  - <https://kenney.nl/assets/city-kit-roads>
  - <https://kenney.nl/assets/3d-road-tiles>

### Poly Haven

- License: Creative Commons CC0.
- Intended use: one low-resolution local ground/rock material or environment asset if performance testing permits.
- License: <https://polyhaven.com/license>

### 3DAssets.dev — Ore Processing and Haulage Plant

- Candidate pack: <https://3dassets.dev/packs/ore-processing-and-haulage-plant>
- License: Creative Commons CC0 1.0 Universal.
- Pack description: 56 GLB models, 14.3 MB total, built to a shared metre scale and visual palette.
- Intended use: a small local subset for the truck dump pocket, crusher, conveyor, bin, and stockpile.
- Status: selected in principle but no model is committed yet. Record every exact asset URL, checksum, size, and optimization step before inclusion.

## Rejected or Reference-Only Sources

### 3D Mine Lab by planwithdata

- Repository: <https://github.com/planwithdata/3D-Mine-Lab>
- Status: **Do not copy or redistribute.**
- Reason: its README identifies it as an internal/proprietary InstaDigIN / UTCL project. It may be viewed only as general inspiration for product categories such as terrain and block-model visualization.

## Rules for Future Additions

1. Do not use a repository merely because it is public; verify an explicit compatible license.
2. Prefer CC0, MIT, BSD, or Apache-2.0 material.
3. Preserve attribution and license text whenever required.
4. Bundle critical assets locally; do not rely on runtime CDNs.
5. Select the smallest practical resolution and optimize 3D assets before committing.
6. Record modifications and the distinction between real and synthetic data.

