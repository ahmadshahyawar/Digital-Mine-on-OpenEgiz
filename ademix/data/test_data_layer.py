"""Validation of the Ademix Data & Asset Layer.

    python -m unittest discover -s ademix/data -p "test_*.py" -v

Checks that every register value traces to its source or formula, that the engine
uses the registered values, that twin definitions and telemetry match their
schemas, and that the synthetic logs are exactly reproducible from their inputs.
"""

import csv
import hashlib
import io
import json
import math
import re
import sys
import unittest
from pathlib import Path

DATA = Path(__file__).resolve().parent
sys.path.insert(0, str(DATA))
sys.path.insert(0, str(DATA.parent / "simulator"))

import build_data_layer as build  # noqa: E402
import engine  # noqa: E402

STATUSES = {"sourced", "derived", "assumption", "scenario_input", "synthetic", "model_setting"}
ORIGINS = {"simulated_state", "kpi", "analytical", "configuration", "static", "synthetic_signal"}
SOURCE_SHA256_LF = "a966a72a6bfa91a86bcd6c3cdcccd9df5d4e83cdb36217a4ac4505ee77c0f16c"


def read_csv(path):
    with open(path, encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def resolve(document, path):
    """Resolve paths such as ``a.b[key=value].c[0].d`` in the OpenMines JSON."""
    node = document
    for part in path.split("."):
        match = re.fullmatch(r"([\w]+)(?:\[(.+)\])?", part)
        node = node[match.group(1)]
        if match.group(2):
            selector = match.group(2)
            if "=" in selector:
                key, value = selector.split("=", 1)
                node = next(item for item in node if str(item.get(key)) == value)
            else:
                node = node[int(selector)]
    return node


REGISTER = {row["parameter_id"]: row for row in read_csv(DATA / "registry" / "parameters.csv")}
SOURCE = json.loads((DATA / "openmines" / "north_pit_mine.json").read_text(encoding="utf-8"))
DICTIONARY = read_csv(DATA / "telemetry" / "telemetry_dictionary.csv")
ASSETS = json.loads((DATA / "assets" / "asset_types.json").read_text(encoding="utf-8"))
TWINS = json.loads((DATA.parent / "simulator" / "twins.json").read_text(encoding="utf-8"))
MANIFEST = json.loads((DATA / "telemetry" / "manifest.json").read_text(encoding="utf-8"))


def value(parameter_id):
    return float(REGISTER[parameter_id]["value"])


class SourceIntegrityTests(unittest.TestCase):
    def test_source_file_matches_its_recorded_checksum(self):
        digest = hashlib.sha256((DATA / "openmines" / "north_pit_mine.json").read_bytes()).hexdigest()
        self.assertEqual(digest, SOURCE_SHA256_LF)
        self.assertIn(SOURCE_SHA256_LF.upper(), (DATA.parent.parent / "DATA_LICENSES.md").read_text(encoding="utf-8").upper())

    def test_source_license_is_present(self):
        self.assertIn("MIT", (DATA / "openmines" / "LICENSE").read_text(encoding="utf-8"))


class RegisterTests(unittest.TestCase):
    def test_every_row_is_complete_and_classified(self):
        for pid, row in REGISTER.items():
            with self.subTest(parameter=pid):
                self.assertIn(row["status"], STATUSES)
                self.assertTrue(row["unit"] and row["source"] and row["notes"])
                self.assertFalse(math.isnan(float(row["value"])))
                self.assertLessEqual(float(row["check_min"]), float(row["value"]))
                self.assertLessEqual(float(row["value"]), float(row["check_max"]))
                if row["status"] == "sourced":
                    self.assertTrue(row["source_field"], "sourced values need a field path")
                if row["status"] == "derived":
                    self.assertTrue(row["derivation"], "derived values need a formula")

    def test_sourced_values_equal_the_source_file(self):
        for pid, row in REGISTER.items():
            if row["status"] == "sourced":
                with self.subTest(parameter=pid):
                    self.assertEqual(float(resolve(SOURCE, row["source_field"])), float(row["value"]))

    def test_derived_values_reproduce_from_their_formula(self):
        passes = math.ceil(value("truck_payload_t") / value("shovel_pass_t"))
        load_min = passes * value("shovel_cycle_min")
        self.assertEqual(value("load_passes"), passes)
        self.assertEqual(value("load_time_min"), load_min)
        self.assertAlmostEqual(value("excavator_capacity_tph"), value("truck_payload_t") * 60 / load_min)
        self.assertAlmostEqual(value("dump_capacity_tph"), value("truck_payload_t") * 60 / value("dump_time_min"))

    def test_engine_uses_the_registered_values(self):
        for pid, row in REGISTER.items():
            if row["engine_constant"]:
                with self.subTest(parameter=pid, constant=row["engine_constant"]):
                    expected = float(row["value"]) * float(row["engine_factor"])
                    self.assertAlmostEqual(getattr(engine, row["engine_constant"]), expected, places=9)

    def test_every_numeric_engine_parameter_is_registered(self):
        registered = {row["engine_constant"] for row in REGISTER.values() if row["engine_constant"]}
        unregistered_ok = {"QUEUE_PRESENT_TRUCKS", "EPS_T"}
        for name in dir(engine):
            if name.isupper() and isinstance(getattr(engine, name), (int, float)) and not isinstance(getattr(engine, name), bool):
                with self.subTest(constant=name):
                    self.assertIn(name, registered | unregistered_ok)


class FleetDataTests(unittest.TestCase):
    def test_derived_fleet_files_regenerate_identically(self):
        outputs = build.build(write=False)
        for path in ("fleet/haulage_fleet_specs.csv", "fleet/route_distances.csv", "fleet/route_distance_summary.csv"):
            with self.subTest(file=path):
                self.assertEqual((DATA / path).read_bytes(), outputs[path].encode("utf-8"))

    def test_fleet_specs_preserve_source_counts(self):
        rows = read_csv(DATA / "fleet" / "haulage_fleet_specs.csv")
        trucks = sum(int(r["count"]) for r in rows if r["equipment_class"] == "haul_truck")
        self.assertEqual(trucks, sum(t["count"] for t in SOURCE["charging_site"]["trucks"]))
        shovels = [r for r in rows if r["equipment_class"] == "shovel"]
        self.assertEqual(len(shovels), sum(len(site["shovels"]) for site in SOURCE["load_sites"]))
        used = [r["unit"] for r in rows if r["used_by_ademix"] == "yes"]
        self.assertEqual(len(used), 3)

    def test_route_summary_places_the_model_route_in_the_source_distribution(self):
        summary = {r["matrix"]: r for r in read_csv(DATA / "fleet" / "route_distance_summary.csv")}
        l2d = [d for row in SOURCE["road"]["l2d_road_matrix"] for d in row]
        share = sum(d <= value("route_length_km") for d in l2d) / len(l2d)
        self.assertAlmostEqual(float(summary["l2d_road_matrix"]["pct_of_source_routes_at_or_below_ademix"]), 100 * share)


class AssetDefinitionTests(unittest.TestCase):
    def test_every_twin_matches_its_asset_type(self):
        kinds = ASSETS["kinds"]
        counts = {kind: 0 for kind in kinds}
        for thing_id, twin in TWINS.items():
            with self.subTest(twin=thing_id):
                self.assertTrue(thing_id.startswith(ASSETS["namespace"] + ":"))
                attributes = twin["attributes"]
                kind = attributes["kind"]
                self.assertIn(kind, kinds)
                counts[kind] += 1
                spec = dict(ASSETS["common_attributes"], **kinds[kind]["attributes"])
                for name, attr in spec.items():
                    if attr.get("required"):
                        self.assertIn(name, attributes)
                    if name in attributes:
                        expected_type = {"string": str, "number": (int, float), "boolean": bool}[attr["type"]]
                        self.assertIsInstance(attributes[name], expected_type)
                    if "register" in attr:
                        self.assertEqual(float(attributes[name]), value(attr["register"]))
                parent_kind = kinds[kind]["parent_kind"]
                if parent_kind:
                    parent = TWINS[attributes["_parents"]]
                    self.assertEqual(parent["attributes"]["kind"], parent_kind)
        for kind, spec in kinds.items():
            self.assertEqual(counts[kind], spec["instances"], kind)

    def test_twin_seed_values_respect_the_dictionary(self):
        rules = {(r["thing_kind"], r["feature"]): r for r in DICTIONARY}
        for thing_id, twin in TWINS.items():
            kind = twin["attributes"]["kind"]
            for feature, body in twin.get("features", {}).items():
                with self.subTest(twin=thing_id, feature=feature):
                    self.assertIn((kind, feature), rules)
                    check_value(self, rules[(kind, feature)], body["properties"]["value"])


def check_value(test, rule, raw):
    if rule["allowed_values"]:
        test.assertIn(str(raw), rule["allowed_values"].split("|"))
        return
    if rule["value_type"] in ("number", "integer"):
        number = float(raw)
        if rule["value_type"] == "integer":
            test.assertEqual(number, int(number))
        if rule["min"]:
            test.assertGreaterEqual(number, float(rule["min"]) - 1e-9)
        if rule["max"]:
            test.assertLessEqual(number, float(rule["max"]) + 1e-9)


class TelemetryDictionaryTests(unittest.TestCase):
    def test_dictionary_rows_are_unique_and_classified(self):
        keys = [(r["thing_kind"], r["feature"]) for r in DICTIONARY]
        self.assertEqual(len(keys), len(set(keys)))
        for row in DICTIONARY:
            with self.subTest(feature=row["feature"]):
                self.assertIn(row["origin"], ORIGINS)
                self.assertIn(row["value_type"], {"number", "integer", "string", "text"})
                self.assertTrue(row["description"])

    def test_dictionary_and_engine_publish_the_same_features_and_units(self):
        snapshot = engine.MineEngine().snapshot()
        kind_of = {thing_id.split(":")[1]: twin["attributes"]["kind"] for thing_id, twin in TWINS.items()}
        published = {}
        for name, features in snapshot.items():
            for feature, body in features.items():
                published[(kind_of[name], feature)] = body.get("unit", "")
        documented = {(r["thing_kind"], r["feature"]): r["unit"] for r in DICTIONARY}
        self.assertEqual(set(published), set(documented))
        for key, unit in published.items():
            if unit:
                with self.subTest(feature=key):
                    self.assertEqual(documented[key], unit)


class TelemetryLogTests(unittest.TestCase):
    def test_manifest_inputs_match_the_current_files(self):
        root = DATA.parent.parent
        for path, digest in MANIFEST["inputs_sha256"].items():
            with self.subTest(input=path):
                self.assertEqual(hashlib.sha256((root / path).read_bytes()).hexdigest(), digest,
                                 "input changed: rerun build_data_layer.py")

    def test_outputs_match_the_manifest(self):
        for path, info in MANIFEST["outputs"].items():
            with self.subTest(output=path):
                self.assertEqual(hashlib.sha256((DATA / path).read_bytes()).hexdigest(), info["sha256"])

    def test_a_log_is_reproduced_exactly_from_its_inputs(self):
        regenerated = build.telemetry_log("truck_breakdown").encode("utf-8")
        self.assertEqual(regenerated, (DATA / "telemetry" / "logs" / "truck_breakdown.csv").read_bytes())

    def test_every_logged_value_respects_the_dictionary(self):
        rules = {(r["thing_kind"], r["feature"]): r for r in DICTIONARY}
        kind_of = {thing_id.split(":")[1]: twin["attributes"]["kind"] for thing_id, twin in TWINS.items()}
        for path in MANIFEST["outputs"]:
            if not path.startswith("telemetry/logs/"):
                continue
            rows = read_csv(DATA / path)
            for column in rows[0]:
                if column in ("time_s", "phase"):
                    continue
                thing, feature = column.split(".", 1)
                rule = rules[(kind_of[thing], feature)]
                with self.subTest(log=path, column=column):
                    for row in rows:
                        check_value(self, rule, row[column])

    def test_logs_conserve_mass_and_switch_at_the_recorded_time(self):
        switch = MANIFEST["telemetry_settings"]["scenario_switch_s"]
        for path in MANIFEST["outputs"]:
            if path.startswith("telemetry/logs/"):
                rows = read_csv(DATA / path)
                scenario = Path(path).stem
                with self.subTest(log=path):
                    for row in rows:
                        self.assertLessEqual(abs(float(row["mine-01.mass_balance_error_t"])), 1e-6)
                        expected = scenario if float(row["time_s"]) >= switch else "baseline"
                        self.assertEqual(row["scenario-controller.active"], expected)


if __name__ == "__main__":
    unittest.main()
