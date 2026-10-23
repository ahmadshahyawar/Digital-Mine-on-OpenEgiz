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

STATUSES = {"sourced", "derived", "assumption", "scenario_input", "synthetic", "model_setting", "required_input", "external_reference"}
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
        source_bytes = (DATA / "openmines" / "north_pit_mine.json").read_bytes().replace(b"\r\n", b"\n")
        digest = hashlib.sha256(source_bytes).hexdigest()
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
                if row["status"] == "required_input":
                    self.assertEqual(row["value"], "", "a required input must not carry an invented value")
                    self.assertTrue(row["derivation"], "state how the value would be computed once supplied")
                    continue
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
            if not path.startswith("telemetry/logs/") or path.endswith("weather_station.csv"):
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
            if path.startswith("telemetry/logs/") and not path.endswith("weather_station.csv"):
                rows = read_csv(DATA / path)
                scenario = Path(path).stem
                with self.subTest(log=path):
                    for row in rows:
                        self.assertLessEqual(abs(float(row["mine-01.mass_balance_error_t"])), 1e-6)
                        expected = scenario if float(row["time_s"]) >= switch else "baseline"
                        self.assertEqual(row["scenario-controller.active"], expected)


class FuelReferenceTests(unittest.TestCase):
    REFS = {r["model"]: r for r in read_csv(DATA / "registry" / "fuel_references.csv")}
    GAL_TO_L = 3.785411784

    def test_references_cite_a_source_and_page(self):
        for model, ref in self.REFS.items():
            with self.subTest(model=model):
                self.assertIn("Caterpillar Performance Handbook", ref["fuel_source"])
                self.assertTrue(ref["payload_source"].startswith(("Caterpillar", "Peterson Cat")))
                self.assertTrue(ref["fuel_page"].isdigit())
                low, med, high = (float(ref[k]) for k in ("low_gal_h", "medium_gal_h", "high_gal_h"))
                self.assertLess(low, med)
                self.assertLess(med, high)

    def test_truck_fuel_is_payload_interpolated_between_bracketing_trucks(self):
        a, b = self.REFS["Cat 775G"], self.REFS["Cat 777G"]
        self.assertLess(float(a["payload_t"]), value("truck_payload_t"))
        self.assertLess(value("truck_payload_t"), float(b["payload_t"]))
        weight = (value("truck_payload_t") - float(a["payload_t"])) / (float(b["payload_t"]) - float(a["payload_t"]))
        row = REGISTER["truck_fuel_consumption_lph"]
        for column, key in (("value", "medium_gal_h"), ("check_min", "low_gal_h"), ("check_max", "high_gal_h")):
            expected = (float(a[key]) + weight * (float(b[key]) - float(a[key]))) * self.GAL_TO_L
            self.assertAlmostEqual(float(row[column]), expected, delta=0.05)

    def test_excavator_fuel_uses_the_closest_shovel_class(self):
        ref = self.REFS["Cat 6020B"]
        self.assertAlmostEqual(float(ref["payload_t"]), value("shovel_pass_t"), delta=2.5)
        row = REGISTER["excavator_fuel_consumption_lph"]
        for column, key in (("value", "medium_gal_h"), ("check_min", "low_gal_h"), ("check_max", "high_gal_h")):
            self.assertAlmostEqual(float(row[column]), float(ref[key]) * self.GAL_TO_L, delta=0.05)

    def test_fuel_values_are_labelled_as_external_references(self):
        for pid in ("truck_fuel_consumption_lph", "excavator_fuel_consumption_lph"):
            self.assertEqual(REGISTER[pid]["status"], "external_reference")
            self.assertIn("not a measurement", REGISTER[pid]["notes"])


class EnvironmentAndEmissionTests(unittest.TestCase):
    WEATHER = read_csv(DATA / "telemetry" / "logs" / "weather_station.csv")
    REFS = {r["factor"]: float(r["value"]) for r in read_csv(DATA / "registry" / "emission_references.csv")}

    def test_weather_log_regenerates_identically_and_stays_physical(self):
        self.assertEqual((DATA / "telemetry" / "logs" / "weather_station.csv").read_bytes(), build.weather_log().encode("utf-8"))
        bounds = {"temperature_c": (-50, 50), "wind_speed_ms": (0, 40), "wind_direction_deg": (0, 360),
                  "precipitation_mm_h": (0, 50), "humidity_pct": (0, 100), "pm10_ugm3": (0, 1000)}
        for row in self.WEATHER:
            for column, (low, high) in bounds.items():
                self.assertTrue(low <= float(row[column]) <= high, (column, row[column]))
        times = [float(r["time_s"]) for r in self.WEATHER]
        self.assertEqual(times, [float(r["time_s"]) for r in read_csv(DATA / "telemetry" / "logs" / "baseline.csv")])

    def test_rain_washes_out_dust(self):
        wet = [float(r["pm10_ugm3"]) for r in self.WEATHER if float(r["precipitation_mm_h"]) > 0]
        dry = [float(r["pm10_ugm3"]) for r in self.WEATHER if float(r["precipitation_mm_h"]) == 0]
        self.assertTrue(wet)
        self.assertLess(sum(wet) / len(wet), sum(dry) / len(dry))

    def test_diesel_factors_follow_from_ipcc_defaults(self):
        density = value("diesel_density_kg_per_l")
        co2 = self.REFS["diesel_net_calorific_value"] * self.REFS["diesel_co2_emission_factor"] * density / 1e6
        self.assertAlmostEqual(value("diesel_co2_kg_per_l"), co2, delta=0.001)
        self.assertAlmostEqual(value("diesel_energy_kwh_per_l"), self.REFS["diesel_net_calorific_value"] * density / 3.6, delta=0.01)
        self.assertEqual(REGISTER["crusher_power_kw"]["status"], "required_input")

    def test_bundle_carries_weather_and_labels_it_synthetic(self):
        bundle = json.loads((DATA / build.BUNDLE_PATH).read_text(encoding="utf-8"))
        self.assertIn("Synthetic", bundle["weather"]["note"])
        self.assertEqual(len(bundle["weather"]["rows"]), len(self.WEATHER))
        self.assertIn("scenario-controller.match_factor", bundle["logs"]["baseline"]["columns"])


class SensorTopologyBundleTests(unittest.TestCase):
    SENSORS = read_csv(DATA / "telemetry" / "sensor_catalogue.csv")
    TOPOLOGY = json.loads((DATA / "topology" / "mine_topology.json").read_text(encoding="utf-8"))

    def test_sensors_cover_exactly_the_published_features(self):
        documented = {(r["thing_kind"], r["feature"]) for r in DICTIONARY}
        covered = set()
        for sensor in self.SENSORS:
            for feature in sensor["features"].split("|"):
                with self.subTest(sensor=sensor["sensor_id"], feature=feature):
                    self.assertIn((sensor["asset_kind"], feature), documented)
                covered.add((sensor["asset_kind"], feature))
        self.assertEqual(covered, documented)

    def test_sensor_publish_interval_matches_the_simulator_settings(self):
        app = (DATA.parent / "simulator" / "app.py").read_text(encoding="utf-8")
        self.assertIn('"SIM_SPEEDUP", "20"', app)
        self.assertIn('"SIM_INTERVAL", "1"', app)
        for sensor in self.SENSORS:
            self.assertEqual((sensor["publish_interval_s_wall"], sensor["publish_interval_s_simulated"]), ("1", "20"))

    def test_topology_references_registered_parameters(self):
        for item in self.TOPOLOGY["nodes"] + self.TOPOLOGY["edges"]:
            for key, ref in item.items():
                if key.endswith("_register") and ref:
                    with self.subTest(item=item.get("id", item.get("from")), key=key):
                        self.assertIn(ref, REGISTER)
        twins = {thing_id.split(":")[1] for thing_id in TWINS}
        for node in self.TOPOLOGY["nodes"]:
            self.assertIn(node["twin"], twins)

    def test_visual_pit_geometry_matches_the_3d_scene_code(self):
        scene = (DATA.parent / "frontend" / "src" / "TerrainStage.tsx").read_text(encoding="utf-8")
        geometry = self.TOPOLOGY["visual_pit_geometry"]
        for token in (
            "benchHeightM: 10", "benchFaceAngleDeg: 70", "workingBenchWidthM: 20",
            "overallSlopeDeg: 45", "workingBenches: 2", "-23.5",
            "ribbonGeometry(path, 13.6)", "lerp(4.8, -22.8", "59", "41", "Math.PI * 2.35",
        ):
            self.assertIn(token, scene)
        self.assertAlmostEqual(geometry["ramp_turns"], 2.35 / 2)
        self.assertEqual(geometry["benches"], 42)
        self.assertEqual(geometry["bench_height_m"], 10)
        self.assertEqual(geometry["bench_face_angle_deg"], 70)
        self.assertEqual(geometry["working_bench_width_m"], 20)
        self.assertEqual(geometry["working_benches"], 2)
        self.assertEqual(geometry["overall_slope_deg"], 45)
        self.assertEqual(geometry["ramp_width"], 13.6)
        self.assertAlmostEqual(geometry["catch_berm_m"], 6.36, places=2)
        self.assertIn("not approved Kazakhstan design values", geometry["design_status"])

    def test_frontend_bundle_regenerates_identically_and_cites_the_register(self):
        outputs = build.build(write=False)
        bundle_text = outputs[build.BUNDLE_PATH]
        self.assertEqual((DATA / build.BUNDLE_PATH).read_bytes(), bundle_text.encode("utf-8"))
        self.assertNotIn("NaN", bundle_text)
        bundle = json.loads(bundle_text)
        for equipment in bundle["equipment"]:
            for spec in equipment["specs"]:
                self.assertEqual(spec["status"], REGISTER[spec["parameter_id"]]["status"])
        fuel = [s for e in bundle["equipment"] for s in e["specs"] if s["parameter_id"].endswith("fuel_consumption_lph")]
        self.assertTrue(fuel and all(s["value"] == value(s["parameter_id"]) for s in fuel))

    def test_dispatch_comparison_is_reproducible_and_bundled_for_the_frontend(self):
        outputs = build.build(write=False)
        path = "evidence/fixed_vs_smart.json"
        generated = outputs[path]
        self.assertEqual((DATA / path).read_bytes(), generated.encode("utf-8"))
        evidence = json.loads(generated)
        self.assertEqual(evidence["schema_version"], "ademix.dispatch-comparison.v1")
        self.assertTrue(evidence["synthetic"])
        self.assertEqual(set(evidence["scenarios"]), {"baseline", "truck_breakdown", "road_closure", "crusher_slowdown"})
        common = evidence["methodology"]["common_start_state_sha256"]
        self.assertTrue(common)
        for scenario in evidence["scenarios"].values():
            self.assertEqual(scenario["start_state_sha256"], common)
            for period in ("transient", "steady"):
                self.assertEqual(set(scenario["periods"][period]), {"window_h", "fixed", "smart", "smart_minus_fixed"})
        bundle = json.loads(outputs[build.BUNDLE_PATH])
        self.assertEqual(bundle["dispatchComparison"], evidence)

    def test_production_recovery_history_is_reproducible_and_bundled(self):
        outputs = build.build(write=False)
        path = "evidence/production_recovery.json"
        generated = outputs[path]
        self.assertEqual((DATA / path).read_bytes(), generated.encode("utf-8"))
        history = json.loads(generated)
        self.assertEqual(history["schema_version"], "ademix.production-recovery.v1")
        self.assertTrue(history["synthetic"])
        events = history["breakdown_recovery"]["events"]
        self.assertEqual([e["sim_time_s"] for e in events], sorted(e["sim_time_s"] for e in events))
        self.assertEqual({e["kind"] for e in events}, {
            "period_started", "breakdown_started", "road_cleared", "throughput_recovered", "reset"
        })
        bundle = json.loads(outputs[build.BUNDLE_PATH])
        self.assertEqual(bundle["productionRecovery"], history)

    def test_breakdown_log_uses_directional_two_way_road_contract(self):
        outputs = build.build(write=False)
        rows = list(csv.DictReader(io.StringIO(outputs["telemetry/logs/truck_breakdown.csv"])))
        required = {
            "road-main.traffic_model", "road-main.blockage_lane", "road-main.blockage_heading",
            "road-main.blocked_crusher_bound_trucks", "road-main.blocked_face_bound_trucks",
        }
        self.assertTrue(required.issubset(rows[0]))
        blocked = [row for row in rows if int(row["road-main.blocked_trucks"]) > 0]
        self.assertTrue(blocked)
        for row in blocked:
            self.assertEqual(row["road-main.traffic_model"], "two_way_separated_lanes")
            crusher_bound = int(row["road-main.blocked_crusher_bound_trucks"])
            face_bound = int(row["road-main.blocked_face_bound_trucks"])
            self.assertEqual(crusher_bound + face_bound, int(row["road-main.blocked_trucks"]))
            self.assertFalse(crusher_bound and face_bound)
            expected = "crusher_bound" if crusher_bound else "face_bound"
            self.assertEqual(row["road-main.blockage_lane"], expected)


if __name__ == "__main__":
    unittest.main()
