# Ademix Reuse Catalog

This catalog is the shortlist for building the submission quickly without copying incompatible or unnecessary material. A public repository is not automatically reusable. Every item must pass license, size, offline-build, and software-WebGL checks before it is committed.

Decision meanings:

- **Adopt** — already used or selected for near-term integration.
- **Shortlist** — useful candidate; inspect the exact files and license before copying.
- **Reference** — learn from the design or formulas, but do not copy now.
- **Reject** — incompatible license, unnecessary complexity, external-service dependency, or performance risk.

## Highest-value sources

| Source | License | Potential use | Decision | Why |
|---|---|---|---|---|
| [OpenEgiz team template](https://github.com/openegiz-contest/team-111) | MIT | Ditto, MQTT, InfluxDB, Grafana, Docker deployment | **Adopt** | Mandatory competition platform and official submission base. |
| [OpenMines](https://github.com/370025263/openmines) | MIT | North Pit parameters, haul-cycle structure, dispatch comparison | **Adopt** | Organizer-recommended and directly relevant. A licensed configuration is already included locally. |
| [3DAssets.dev Ore Processing and Haulage Plant](https://3dassets.dev/packs/ore-processing-and-haulage-plant) | CC0 1.0 | Crusher, truck-dump pocket, conveyors, bins, stockpile and plant props | **Adopt selected models** | Purpose-built 56-model mining pack, consistent scale/palette, 14.3 MB total; use only a few local GLBs. |
| [Kenney City Kit Industrial](https://kenney.nl/assets/city-kit-industrial) | CC0 | Low-poly industrial buildings and props | **Shortlist** | Small, coherent, safe visual filler. |
| [Kenney Factory Kit](https://kenney.nl/assets/factory-kit) | CC0 | Conveyor/factory details | **Shortlist** | Useful only where the dedicated processing pack has a gap. |
| [Kenney City Kit Roads](https://kenney.nl/assets/city-kit-roads) | CC0 | Signs, barriers and road furniture | **Shortlist** | Use sparingly; the haul road itself should stay procedural. |
| [Kenney 3D Road Tiles](https://kenney.nl/assets/3d-road-tiles) | CC0 | Road-layout reference or small props | **Reference** | Urban tiles do not naturally fit an open-pit haul road. |
| [Poly Haven](https://polyhaven.com/license) | CC0 | One compressed rock/soil texture or low-resolution HDRI | **Shortlist** | Excellent quality, but high-resolution assets would hurt software rendering. Bundle locally. |
| [CAOS MineHaul / minehaulsim](https://github.com/fsantibanezleal/CAOS_MINEHAUL) | Apache-2.0 | Grade-aware travel time, congestion, deterministic event design | **Reference** | Strong simulation concepts, but adopting a second simulator now would add scope and integration risk. |
| [MineFlow](https://github.com/MineFlowCSM/MineFlow) | MIT | Pit-limit and mine-planning concepts | **Reference** | Legitimate mining library but outside our dispatch/crusher decision scope. |
| [Procedural Open-Pit Mine Terrain Generator](https://github.com/GoyalKrish/open-pit-mine-terrain-generator) | No reusable license confirmed | Bench-index, explicit bench-height/width, and road-flattening design reference | **Reference only** | Blender-specific implementation and unclear redistribution terms prevent copying. Ademix independently implements the documented geometric method in TypeScript on its existing THREE.Terrain grid. |
| [Poly Pizza Dump Truck by Crachboss32](https://poly.pizza/m/gYWUCpb09B) | CC-BY | Possible construction dump-truck replacement | **Reject** | Requires attribution and is distributed without wheels; it is not a better competition-ready replacement for the audited bundled CC0 hauler. |

## Web and 3D engineering

| Source | License | Potential use | Decision | Notes |
|---|---|---|---|---|
| [React](https://github.com/facebook/react) | MIT | UI framework | **Adopt** | Already in the frontend. |
| [Three.js](https://github.com/mrdoob/three.js) | MIT | WebGL renderer and GLTF loading | **Adopt** | Already in the frontend. |
| [React Three Fiber](https://github.com/pmndrs/react-three-fiber) | MIT | Declarative Three.js scene | **Adopt** | Already in the frontend. |
| [Drei](https://github.com/pmndrs/drei) | MIT | Camera controls and small R3F helpers | **Adopt selectively** | Avoid helpers that load CDN content or add expensive rendering. |
| [detect-gpu](https://github.com/pmndrs/detect-gpu) | MIT | Automatic quality tier | **Shortlist** | Useful for the judge's software WebGL; benchmark data must be bundled locally or replaced with a direct capability test. |
| [glTF Transform](https://github.com/donmccurdy/glTF-Transform) | MIT | Optimize, deduplicate, prune and compress GLB assets | **Adopt as build tool** | Reproducible way to enforce mesh/texture budgets; not needed at runtime. |
| [meshoptimizer](https://github.com/zeux/meshoptimizer) | MIT | Mesh optimization and optional glTF compression | **Shortlist** | Use through glTF Transform only if decoder cost remains acceptable. |
| [Apache ECharts](https://github.com/apache/echarts) | Apache-2.0 | Throughput, queue and baseline-versus-scenario charts | **Shortlist** | Mature charts; tree-shake or use only when our lightweight UI charts become insufficient. |
| [Lucide](https://github.com/lucide-icons/lucide) | ISC | Consistent dashboard icons | **Shortlist** | Prefer a small local SVG subset, not the full icon set. Verify the copied package/version notice. |
| [Vite](https://github.com/vitejs/vite) | MIT | Frontend build | **Adopt** | Already in the frontend. |

## Simulation and analytics candidates

| Source | License | Potential use | Decision | Notes |
|---|---|---|---|---|
| [SimPy](https://github.com/simpx/simpy) | MIT | Queues, resources and discrete-event simulation | **Reference** | Our small deterministic engine is easier to explain and ship; reconsider only if queue logic grows substantially. |
| [NetworkX](https://github.com/networkx/networkx) | BSD-3-Clause | Road graph and rerouting | **Reference** | For our small fixed route, an internal graph is lighter. Useful if rerouting becomes complex. |
| [MI Sense](https://github.com/misense726/SIH26007) | MIT (verify exact files before reuse) | Fleet-supervision UI and spatial awareness patterns | **Reference** | Inspect architecture and interaction ideas; do not copy branding, screenshots, data, or assets without separate verification. |
| [Vivania](https://github.com/Yairama/vivania) | License file must be reviewed before reuse | Open-pit fleet simulation and reinforcement-learning ideas | **Reference** | Too large for the deadline and not needed for a credible deterministic demo. |

## Additional visual libraries to inspect only if needed

| Source | Expected licensing | Potential use | Decision | Gate before use |
|---|---|---|---|---|
| [ambientCG](https://ambientcg.com/) | CC0 | Soil, gravel or rock material | **Shortlist** | Confirm the exact asset page; download a low-resolution map set locally. |
| [Quaternius](https://quaternius.com/) | CC0 packs | Low-poly vehicles and industrial props | **Shortlist** | Confirm each pack's license and polygon/texture budget. |
| [KayKit](https://kaylousberg.com/game-assets) | Usually CC0; varies by distribution | Low-poly construction props | **Shortlist** | Verify the exact pack and included license file. |
| [pmndrs market](https://github.com/pmndrs/market) | Repository MIT; individual assets advertised as CC0 | R3F-ready models | **Shortlist** | Record the exact asset provenance and bundle locally. |
| [Innerscene free models](https://innerscene.com/) | Per-asset terms | Possible dump truck | **Reference** | Do not use unless an exact downloadable model carries a compatible redistribution license. |

## Rejected sources and approaches

| Source or approach | Decision | Reason |
|---|---|---|
| [3D Mine Lab](https://github.com/planwithdata/3D-Mine-Lab) | **Reject copying** | Public repository describes proprietary/internal ownership; no compatible reuse license established. |
| Haul Truck Digital Twin (`KhalidMohd99`) | **Reject copying** | “Research and educational use” wording is not a clear OSI-compatible redistribution license for our MIT submission. |
| Sketchfab/C​​GTrader search results | **Reject as a source category** | License varies per model and provenance is harder to audit under the deadline. |
| Runtime model/texture CDNs | **Reject** | Judge build must not depend on external availability; critical assets must be local. |
| Cesium/Mapbox terrain services | **Reject** | External services, tokens, and geospatial complexity do not improve our fictional/anonymized pit decision demo. |
| Heavy physics, post-processing and real-time shadows | **Reject** | The judge has WebGL without GPU acceleration. Motion and state clarity matter more than effects. |
| Copying an entire external application | **Reject** | Bloats the submission, obscures team work, increases security/license risk, and earns no credit by itself. |

## Planned reuse sequence

1. Keep the official OpenEgiz platform and the existing OpenMines calibration data.
2. Download and locally bundle only the crusher, dump pocket, one conveyor, one bin and one stockpile model from the CC0 processing pack.
3. Optimize those GLBs with glTF Transform and record original URL, version, checksum, output size and modifications in `DATA_LICENSES.md`.
4. Keep trucks, terrain, benches and routes procedural unless a smaller verified CC0 asset materially improves the scene.
5. Add a chart library only after the twin-data flow and scenario comparison are working.
6. Test every addition in software-rendering/low-quality mode and remove anything that harms usability.

## Acceptance checklist for every copied item

- Exact source URL and upstream revision/version recorded.
- Exact license confirmed; license/notice copied when required.
- Redistribution and modification permitted in a public MIT repository.
- No trademark, personal data, confidential data, or unclear AI-generated provenance included.
- Asset stored locally and works without a runtime CDN or API key.
- File size, polygon count, texture dimensions and draw-call effect checked.
- SHA-256 and local destination recorded in `DATA_LICENSES.md`.
- The submission explains what was reused and what Team Ademix changed.
