#!/usr/bin/env python3
"""Regenerate the derived files of the Ademix Data & Asset Layer.

    python ademix/data/build_data_layer.py

Inputs (never modified): openmines/north_pit_mine.json (MIT, third-party source),
registry/parameters.csv (curated register) and ../simulator/engine.py.
Outputs: fleet/*.csv derived from the source file, and telemetry/logs/*.csv,
synthetic logs produced by the deterministic simulator, plus
telemetry/manifest.json recording the hashes that tie every output to its inputs.
Files are written with LF line endings so hashes are identical on every OS.
"""

from __future__ import annotations

import csv
import hashlib
import io
import json
import statistics
import sys
from pathlib import Path

DATA = Path(__file__).resolve().parent
SIMULATOR = DATA.parent / "simulator"
SOURCE = DATA / "openmines" / "north_pit_mine.json"
REGISTER = DATA / "registry" / "parameters.csv"
sys.path.insert(0, str(SIMULATOR))

from engine import SCENARIOS, MineEngine  # noqa: E402

USED_TRUCK, USED_SHOVEL, USED_DUMP = "OfficalTruck", "NorthPitMine-LoadSite2-Shovel-1", "NorthPitMine-DumpSite1"
LOG_SEED = 42
LOG_STEP_S = 20.0
LOG_SAMPLE_S = 300.0
LOG_WARMUP_H = 4
LOG_SCENARIO_H = 9


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def to_csv(header, rows) -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer, lineterminator="\n")
    writer.writerow(header)
    writer.writerows(rows)
    return buffer.getvalue()


def register_value(parameter_id: str) -> float:
    with REGISTER.open(encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            if row["parameter_id"] == parameter_id:
                return float(row["value"])
    raise KeyError(parameter_id)


def fleet_specs(source: dict) -> str:
    rows = []
    site = source["charging_site"]["name"]
    for truck in source["charging_site"]["trucks"]:
        rows.append(["haul_truck", site, truck["type"], truck["count"], truck["capacity"], truck["speed"], "", "",
                     "yes" if truck["type"] == USED_TRUCK else "no"])
    for load in source["load_sites"]:
        for shovel in load["shovels"]:
            rate = round(shovel["tons"] * 60 / shovel["cycle_time"], 2)
            rows.append(["shovel", load["name"], shovel["name"], 1, shovel["tons"], "", shovel["cycle_time"], rate,
                         "yes" if shovel["name"] == USED_SHOVEL else "no"])
    for dump in source["dump_sites"]:
        for dumper in dump["dumpers"]:
            rows.append(["dump_point", dump["name"], f"{dump['name']}-dumpers", dumper["count"], "", "",
                         dumper["cycle_time"], "", "yes" if dump["name"] == USED_DUMP else "no"])
    header = ["equipment_class", "site", "unit", "count", "capacity_t", "speed_kmh", "cycle_time_min",
              "pass_rate_tph", "used_by_ademix"]
    return to_csv(header, rows)


def route_tables(source: dict) -> tuple[str, str]:
    loads = [site["name"] for site in source["load_sites"]]
    dumps = [site["name"] for site in source["dump_sites"]]
    rows, summary = [], []
    model_km = register_value("route_length_km")
    for matrix in ("l2d_road_matrix", "d2l_road_matrix"):
        values = []
        for i, row in enumerate(source["road"][matrix]):
            for j, distance in enumerate(row):
                rows.append([matrix, loads[i], dumps[j], distance])
                values.append(distance)
        q1, median, q3 = statistics.quantiles(values, n=4, method="inclusive")
        share_at_or_below = sum(v <= model_km for v in values) / len(values)
        summary.append([matrix, len(values), min(values), round(q1, 3), round(median, 3), round(q3, 3), max(values),
                        round(statistics.fmean(values), 3), model_km, round(100 * share_at_or_below, 1)])
    distances = to_csv(["matrix", "load_site", "dump_site", "distance"], rows)
    stats = to_csv(["matrix", "n", "min", "q1", "median", "q3", "max", "mean", "ademix_route_km",
                    "pct_of_source_routes_at_or_below_ademix"], summary)
    return distances, stats


def flatten(snapshot: dict) -> dict:
    return {f"{thing}.{feature}": value["value"] for thing, features in snapshot.items()
            for feature, value in features.items()}


def telemetry_log(scenario: str) -> str:
    """Wide CSV: one row per sample, one column per twin feature (synthetic)."""
    mine = MineEngine(seed=LOG_SEED)
    rows, header = [], None
    steps_per_sample = int(LOG_SAMPLE_S / LOG_STEP_S)
    samples = int((LOG_WARMUP_H + LOG_SCENARIO_H) * 3600 / LOG_SAMPLE_S)
    for sample in range(samples + 1):
        if sample:
            for _ in range(steps_per_sample):
                mine.step(LOG_STEP_S)
        if sample * LOG_SAMPLE_S == LOG_WARMUP_H * 3600:
            mine.set_scenario(scenario)
        flat = flatten(mine.snapshot())
        if header is None:
            header = ["time_s", "phase"] + sorted(flat)
        phase = "warmup" if mine.sim_time_s < LOG_WARMUP_H * 3600 else "scenario"
        rows.append([mine.sim_time_s, phase] + [flat[key] for key in header[2:]])
    return to_csv(header, rows)


def build(write: bool = True) -> dict:
    source = json.loads(SOURCE.read_text(encoding="utf-8"))
    outputs = {"fleet/haulage_fleet_specs.csv": fleet_specs(source)}
    outputs["fleet/route_distances.csv"], outputs["fleet/route_distance_summary.csv"] = route_tables(source)
    for scenario in SCENARIOS:
        outputs[f"telemetry/logs/{scenario}.csv"] = telemetry_log(scenario)
    manifest = {
        "synthetic": "telemetry/logs/* are synthetic simulator output, not measurements from a mine.",
        "generator": "ademix/data/build_data_layer.py",
        "inputs_sha256": {
            "ademix/data/openmines/north_pit_mine.json": sha256(SOURCE.read_bytes()),
            "ademix/data/registry/parameters.csv": sha256(REGISTER.read_bytes()),
            "ademix/simulator/engine.py": sha256((SIMULATOR / "engine.py").read_bytes()),
        },
        "telemetry_settings": {
            "seed": LOG_SEED, "step_s": LOG_STEP_S, "sample_s": LOG_SAMPLE_S,
            "warmup_h": LOG_WARMUP_H, "scenario_h": LOG_SCENARIO_H,
            "scenario_switch_s": LOG_WARMUP_H * 3600,
        },
        "outputs": {},
    }
    for path, text in outputs.items():
        lines = text.splitlines()
        manifest["outputs"][path] = {
            "sha256": sha256(text.encode("utf-8")),
            "rows": len(lines) - 1,
            "columns": len(next(csv.reader([lines[0]]))),
        }
    outputs["telemetry/manifest.json"] = json.dumps(manifest, indent=2, ensure_ascii=False) + "\n"
    if write:
        for path, text in outputs.items():
            target = DATA / path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(text.encode("utf-8"))
    return outputs


if __name__ == "__main__":
    manifest = json.loads(build()["telemetry/manifest.json"])
    for name, info in manifest["outputs"].items():
        print(f"{name}: {info['rows']} rows, {info['columns']} columns")
