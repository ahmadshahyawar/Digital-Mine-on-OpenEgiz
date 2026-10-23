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

## Included Visual Assets

### THREE.Terrain — terrain generation engine

- Source: <https://github.com/IceCreamYou/THREE.Terrain>
- Package: `three.terrain.js` version `3.1.1`, pinned in `ademix/frontend/package-lock.json`.
- License: MIT; preserved at `ademix/frontend/third_party/three-terrain-LICENSE.txt`.
- Use: deterministic Perlin/Diamond-Square surrounding terrain. Ademix applies its own documented bench-and-wall height function to form the engineered open pit.
- Runtime: bundled locally by Vite; no CDN or external service is required.

### SELENE-ISRU — optimized equipment models

- Source repository: <https://github.com/dogum/selene-isru>
- Pinned source commit: `2dfe2000321cce7f10292f3671df655b3d2f7148`
- Upstream files: `packages/app/src/assets/models/excavator.glb` and `packages/app/src/assets/models/hauler.glb`
- Local files: `ademix/frontend/public/models/excavator.glb` and `ademix/frontend/public/models/hauler.glb`
- Local SHA-256: excavator `2CE9DAA0CC776DA8116F9C34C0BD3847381535367D50C4CC1DF8C7B6C2D8BCD9`; hauler `F3B4D96B5C2E69780FAA4CBF42909451A3C9D751B5E108DCFCBF1DDB55AD60BB`.
- License: Creative Commons CC0 1.0 Universal, as recorded by upstream in `assets/ASSET_LICENSES.md` and embedded model metadata.
- Authoring: original procedural geometry from the SELENE-ISRU project; no downloaded textures or paid assets.
- Optimization evidence: upstream reports 13,132 triangles / 240,868 bytes for the excavator and 11,284 triangles / 206,784 bytes for the hauler.
- Use: the excavator represents the loading unit; six cloned hauler scenes represent the live Ditto truck twins. Colors/status markers remain driven by runtime twin state.

### Kenney Factory Kit — processing plant modules

- Source repository: <https://github.com/shorepine/kenney> (mirror of Kenney's CC0 asset library); original pack: <https://kenney.nl/assets/factory-kit>.
- Pinned source commit: `3694c6879e487c108f55677be7dd2ca75b07cc3b`.
- License: Creative Commons CC0 1.0 Universal.
- Upstream files: `3d/factory/hopper-high-square.glb`, `machine-fortified.glb`, `conveyor-long-stripe-sides.glb`, `conveyor-bars-stripe-high-slope.glb`, and `catwalk-stairs.glb`.
- Local files and SHA-256:
  - `plant-hopper.glb` — `EBB427E3AB2BC1FABCA3A0DEADCA1F65164943630C073F61D1A01029EDB37F01` (11,308 bytes)
  - `plant-crusher.glb` — `0907F6616F49BBDAA20241AC4B568B780F30352F204851C53568B8E7DF59B528` (29,828 bytes)
  - `plant-conveyor.glb` — `727A56DFAE9A04D12437123B7B051EF76327887F02C837090178B9781FA56534` (26,632 bytes)
  - `plant-conveyor-slope.glb` — `EF043AC520572CEA0AB570873EF891D9BD8F0C748A1CAA4FEEA82F560CDC8C6F` (36,556 bytes)
  - `plant-stairs.glb` — `0356A040EBBF632CD20DFE384A13108270DF26426AD1DD51A2C767C8F6A6960C` (66,256 bytes)
- Use: assembled into the truck dump pocket, guarded primary-crusher module, inclined/transfer conveyors, and access stairs. A lightweight locally generated cone represents the coarse-ore stockpile.
- Modifications: only scene placement, scaling, and repetition; source GLBs are preserved unchanged and bundled locally.

## Approved Visual Asset Sources

Before another asset is added, record its exact name, creator, source URL, downloaded variant, local path, size, and checksum here.

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
- Status: evaluated but not included because the asset CDN was unavailable during implementation. The committed plant checkpoint uses the locally bundled Kenney Factory Kit subset above.

## Rejected or Reference-Only Sources

### 3D Mine Lab by planwithdata

- Repository: <https://github.com/planwithdata/3D-Mine-Lab>
- Status: **Do not copy or redistribute.**
- Reason: its README identifies it as an internal/proprietary InstaDigIN / UTCL project. It may be viewed only as general inspiration for product categories such as terrain and block-model visualization.

## Rules for Future Additions

### Poly Haven Dirt scan (2026-10-23)

- Source: https://polyhaven.com/a/dirt — Charlotte Baglioni.
- License: CC0, https://polyhaven.com/license . Redistribution permitted.
- Bundled in `ademix/frontend/public/textures/dirt/`: 1K JPEG Diffuse, rough, and nor_gl maps; originals unchanged. Download metadata from https://api.polyhaven.com/files/dirt ; each downloaded file matched its published MD5.
- Used for visual soil detail, not measured mine data. Color projection blends two scales; geometry is not displaced. No runtime CDN or new dependency.


1. Do not use a repository merely because it is public; verify an explicit compatible license.
2. Prefer CC0, MIT, BSD, or Apache-2.0 material.
3. Preserve attribution and license text whenever required.
4. Bundle critical assets locally; do not rely on runtime CDNs.
5. Select the smallest practical resolution and optimize 3D assets before committing.
6. Record modifications and the distinction between real and synthetic data.

