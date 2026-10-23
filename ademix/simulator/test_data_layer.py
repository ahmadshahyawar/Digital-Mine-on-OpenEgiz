"""Consistency checks for the documented Ademix data and asset layer."""

import csv
import hashlib
import json
from pathlib import Path
import unittest


ADEMIX_ROOT = Path(__file__).resolve().parents[1]
DATA_ROOT = ADEMIX_ROOT / "data"


class DataLayerTests(unittest.TestCase):
    def test_every_twin_kind_has_documented_live_fields(self):
        twins = json.loads((Path(__file__).parent / "twins.json").read_text(encoding="utf-8"))
        with (DATA_ROOT / "telemetry_dictionary.csv").open(encoding="utf-8", newline="") as handle:
            rows = list(csv.DictReader(handle))
        documented = {(row["entity_kind"], row["field"]) for row in rows}
        kind_alias = {"haul-truck": "haul-truck", "mine": "mine", "excavator": "excavator", "crusher": "crusher", "road": "road", "scenario": "scenario"}
        for twin in twins.values():
            kind = kind_alias[twin["attributes"]["kind"]]
            for field in twin["features"]:
                self.assertIn((kind, field), documented, f"Undocumented field: {kind}.{field}")

    def test_bundled_models_match_manifest(self):
        with (DATA_ROOT / "model_manifest.csv").open(encoding="utf-8", newline="") as handle:
            rows = list(csv.DictReader(handle))
        self.assertGreaterEqual(len(rows), 7)
        for row in rows:
            path = ADEMIX_ROOT / row["local_file"]
            self.assertTrue(path.is_file(), f"Missing bundled model: {path}")
            self.assertEqual(path.stat().st_size, int(row["size_bytes"]))
            self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest().upper(), row["sha256"])

    def test_fleet_inventory_covers_operating_assets(self):
        with (DATA_ROOT / "fleet_specs.csv").open(encoding="utf-8", newline="") as handle:
            entity_types = {row["entity_type"] for row in csv.DictReader(handle)}
        self.assertTrue({"haul_truck", "excavator", "crusher", "haul_road"}.issubset(entity_types))


if __name__ == "__main__":
    unittest.main()
