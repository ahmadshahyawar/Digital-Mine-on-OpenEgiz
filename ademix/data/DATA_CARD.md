# Ademix Data & Asset Layer — Data Card

This card documents every data asset the Ademix digital twin uses: where each value comes from, how derived files are produced, and how the whole layer is checked. Its structure follows *Datasheets for Datasets* (Gebru et al., 2021, Communications of the ACM 64(12)), and its organisation aims at the FAIR principles (Wilkinson et al., 2016, Scientific Data 3:160018).

**No value in this layer is a measurement from an operating mine.** Every value is classified as one of three kinds:

- **Sourced:** taken from a published, licensed configuration file.
- **Derived:** computed from sourced values.
- **Team-set:** an assumption, scenario input, synthetic signal or model setting chosen by the team.

The telemetry logs are synthetic simulator output.

## 1. Purpose

The layer gives the Core Simulation Engine, the What-If Scenario Engine and the OpenEgiz twins one traceable set of parameters, asset definitions and signal definitions. It also gives reproducible reference logs that a reviewer can regenerate and check byte for byte.

## 2. Composition

| Path | Content | Kind | Size |
|---|---|---|---|
| `openmines/north_pit_mine.json` | OpenMines "North Pit Mine" configuration, unchanged | Third-party source (MIT) | 1 file |
| `openmines/LICENSE` | Upstream MIT licence | Licence | 1 file |
| `registry/parameters.csv` | Every model parameter with value, unit, status, source field or formula, engine constant and sanity range | Curated register | 27 parameters (2 are required inputs with no value) |
| `fleet/haulage_fleet_specs.csv` | All trucks, shovels and dump points in the source, marking the three the model uses | Derived from source | 28 rows |
| `fleet/route_distances.csv` | Source load-to-dump and dump-to-load distance matrices, long format | Derived from source | 50 rows |
| `fleet/route_distance_summary.csv` | Distribution statistics of those distances, and the model route's position in them | Derived from source | 2 rows |
| `assets/asset_types.json` | Twin kinds, required attributes with types and units, parent relationships, instance counts | Curated schema | 6 kinds |
| `telemetry/telemetry_dictionary.csv` | Every published twin feature with type, unit, bounds, allowed values, origin and meaning | Curated dictionary | 65 features |
| `telemetry/sensor_catalogue.csv` | IoT sensor catalogue: each simulated sensor, its real-world equivalent, the features it produces and its MQTT topic | Curated catalogue | 16 entries (14 sensors, 2 fixed locations) |
| `topology/mine_topology.json` | Haulage network (nodes, edges, servers, traffic rules), 3D pit geometry and what is not available | Curated topology | 5 nodes, 4 edges |
| `../frontend/public/data/ingestion.json` | Bundle of the above for the Layer 1 3D view (`?stage=ingestion`) | Generated | 1 file |
| `telemetry/logs/<scenario>.csv` | Twin state every 5 simulated minutes: 4 h of normal operation, then 9 h of the scenario | **Synthetic** | 4 × 157 rows × 122 columns |
| `telemetry/manifest.json` | SHA-256 of every input and output, plus generation settings | Provenance record | 1 file |
| `build_data_layer.py` | Regenerates every derived and synthetic file | Code | — |
| `test_data_layer.py` | 24 validation tests | Code | — |

The twin instances themselves remain in `ademix/simulator/twins.json`, because the setup container reads them from there.

## 3. Provenance and status of the parameters

| Status | Count | Meaning | Examples |
|---|---:|---|---|
| sourced | 7 | Value read from a named field of the OpenMines file; a test resolves the field and compares it | Truck payload 77 t, speed 25, shovel pass 20.32 t / 1.5 min, dump 1 min |
| derived | 4 | Computed from sourced values with the formula given in the register; a test recomputes it | 4 passes, 6 min loading, 770 t/h excavator, 4 620 t/h dump bay |
| assumption | 5 | Team planning choice without an external source | 6 trucks, 3.2 km route, 900 t/h crusher, 600 t bin, 250 t opening ROM |
| scenario_input | 3 | What-if magnitude chosen for the demonstration | 10.72 km/h restriction, 55 % crusher factor, 20 min blockage |
| synthetic | 2 | Display-only signal with no physical calibration | Fuel burn per route, loaded and empty |
| model_setting | 4 | Numerical or analysis setting | KPI window, bottleneck window, 95 % saturation, random seed |
| required_input | 2 | Needed by the specification but not available in any source the team holds; no value is stored | Truck and excavator fuel consumption (L/h) |

The source file states **no units**. Reading them as tonnes, km/h, minutes and km is an interpretation consistent across the file (77 t trucks at 25 km/h), but it has not been confirmed against the OpenMines code or documentation. The register says this for each affected value. The source's road-repair parameters (`lambda_repair` 0.00833, `mu_repair_duration` 50) are recorded for completeness but are not used, because the Ademix model has no random road events.

## 4. Findings from building the layer

1. **The source file's checksum was recorded for a Windows copy.** `DATA_LICENSES.md` recorded SHA-256 `2711…`, which is the file with CRLF line endings. Git stores it with LF line endings, whose SHA-256 is `a966…`; the record now gives both. The file has not been re-checked against the upstream repository.
2. **Twin seed values disagreed with the model.** In `twins.json`:
   - the excavator's `bucket_t` was 22 t, while the sourced shovel pass is 20.32 t;
   - the road's initial `speed_limit_kmh` was 35, while the model uses 25;
   - the initial excavator and crusher states were `idle`, which the engine never publishes.

   All four are corrected. The live values were already right after the first publish, so only the seed values changed.
3. **The model route is short compared with its source.** The 3.2 km one-way route is at or below only 24 % of the source's 25 load-to-dump distances (median 5.15 km, interquartile range 3.26–7.41 km) and 12 % of its dump-to-load distances (median 5.62 km). A route at the source median would lengthen the free cycle from 22.4 to 31.7 min. At 25 km/h, six trucks would still out-supply one excavator: 6 × 77 × 60 / 31.72 ≈ 874 t/h, against the excavator's 770 t/h. So the baseline bottleneck would not change, but every haulage-sensitive result would. This is a model choice to keep the 3D scene compact, and it is now visible.
4. **The source's largest truck class has 9 units;** the model uses 6 of them, by team choice.

## 4a. The three element groups of the layer

| Element group | Where it is | Status |
|---|---|---|
| Technical specifications of trucks and excavators: speed, capacity | `registry/parameters.csv`, `fleet/haulage_fleet_specs.csv` | Sourced from OpenMines; derived loading and dumping capacities |
| Fuel consumption | `registry/parameters.csv` (`truck_fuel_consumption_lph`, `excavator_fuel_consumption_lph`) | **Required input.** No source the team holds gives it. The formula fuel (L/h) = power (kW) × load factor × brake-specific fuel consumption (g/kWh) ÷ (1000 × diesel density, kg/L) is recorded; a manufacturer or site figure must be supplied. |
| Historical telemetry logs | `telemetry/logs/*.csv` | Synthetic, deterministic, hash-verified |
| Real-time IoT sensor data | `telemetry/sensor_catalogue.csv` → MQTT `telemetry/<thing>` → Ditto | Simulated sensors, labelled with their real-world equivalents |
| Mine topological parameters | `topology/mine_topology.json`, `fleet/route_distance*.csv` | Modelled layout plus OpenMines distance matrices; no surveyed elevations or grades |

The 3D view `http://localhost:4173/?stage=ingestion` shows all of this: on the stand, or at `http://localhost:5173/?stage=ingestion` with `npm run dev` in `ademix/frontend`. It includes source cards, clickable topology markers, equipment spec sheets with status labels, the sensor catalogue, a topology diagram with the route-distance histogram, and a replay of the historical logs that drives the 3D fleet.

## 5. Reproducibility

```bash
python ademix/data/build_data_layer.py
```

```bash
python -m unittest discover -s ademix/data -p "test_*.py" -v
```

Generation is deterministic: random seed 42, a 20 s event step and 5-minute samples. Files are written with LF line endings, so they hash identically on every operating system. `telemetry/manifest.json` records the SHA-256 of the source file, the register and `engine.py` used to produce the logs, plus the hash, row count and column count of every output.

If the engine or the register changes, a test fails until the generator is rerun. The logs therefore can't silently drift away from the code that claims to have produced them.

## 6. Validation

All 24 tests pass. They check the following:

- **Source integrity:** the stored source file matches its recorded checksum, and its MIT licence is present.
- **Register:**
  - every row has a known status, a unit, a source and notes;
  - each value sits within its sanity range;
  - sourced rows have a field path, and derived rows a formula.
- **Traceability:**
  - each sourced value equals the source field it names;
  - each derived value is recomputed from its formula.
- **Engine consistency:**
  - every registered engine constant equals the register value times its unit factor;
  - every numeric engine constant is registered, apart from two numerical tolerances.
- **Fleet files:** they regenerate byte for byte, keep the source's equipment counts, and the route percentile is recomputed.
- **Assets:**
  - every twin in `twins.json` has its kind, its required attributes with the correct types, and a parent of the right kind;
  - the instance counts are correct;
  - the register-linked attributes (`bucket_t`, `rated_tph`, `length_km`, `capacity_t`) equal the register.
- **Dictionary:**
  - rows are unique and classified;
  - the engine publishes exactly the documented features with the documented units;
  - twin seed values respect the bounds and allowed values.
- **Logs:**
  - manifest inputs match the current files, and outputs match the manifest;
  - a log regenerates byte for byte;
  - every one of the 4 × 157 × 120 logged values respects its dictionary bounds or allowed values;
  - mass balance holds within 1e-6 t in every row;
  - the scenario switch happens at the recorded time.

- **Sensors:** every published feature is produced by exactly the documented sensor kinds, and the publish interval matches the simulator settings.
- **Topology:** every node and edge references registered parameters and existing twins, and the 3D pit geometry matches the scene code.
- **Frontend bundle:** it regenerates byte for byte, its statuses match the register, and fuel consumption stays empty until it is supplied.

These tests verify internal consistency and traceability. They do not validate the model against a real mine, and no such data is available to the team.

## 7. FAIR mapping

| Principle | How the layer addresses it |
|---|---|
| Findable | One folder, stable file names, every parameter with a unique `parameter_id`, every signal identified by twin kind plus feature |
| Accessible | Plain CSV and JSON in the public repository, no account or service needed |
| Interoperable | Units on every value; the source is unchanged; derived tables use long format with explicit columns; twin features use the Ditto features model |
| Reusable | Licence recorded (MIT source, MIT team code); provenance per value; regeneration command; checksums |

## 8. Licences

- **OpenMines file:** MIT, © 2023 stone meng (see `openmines/LICENSE`).
- **Derived tables:** carry the same attribution.
- **Register, schema, dictionary, synthetic logs and code:** the team's work, released under the repository's MIT licence.

## 9. Limitations and maintenance

- **No measured data:** the layer contains no operational measurements. The synthetic logs are not a substitute for telemetry from a real fleet.
- **Units are interpreted:** the source states none, so the units are inferred (see §3).
- **Sanity ranges are team-chosen:** the `check_min` and `check_max` columns are ranges for automated checks only, not sourced tolerances.
- **Maintenance:**
  - when a model constant changes, update the register, rerun `build_data_layer.py` and the tests;
  - when a published feature is added, add it to the dictionary, since a test enforces this.
