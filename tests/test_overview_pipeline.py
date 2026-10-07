import statistics
import unittest

from scripts.ipeds import build_affordability_resources as AFFORDABILITY
from scripts.ipeds import build_overview as PIPELINE
from scripts.ipeds import build_success_equity as SUCCESS


class OverviewPipelineTests(unittest.TestCase):
    COLLECTION_YEAR = PIPELINE.SOURCE.list_releases()[-1]["collection_year"]

    def test_missing_and_sentinel_values_are_not_zero(self):
        self.assertIsNone(PIPELINE.number(""))
        self.assertIsNone(PIPELINE.number("."))
        self.assertIsNone(PIPELINE.number("-2"))
        self.assertEqual(PIPELINE.number("0"), 0)

    def test_percentile_uses_linear_interpolation(self):
        self.assertEqual(PIPELINE.percentile([1, 2, 3, 4], 0.25), 1.75)
        self.assertEqual(PIPELINE.percentile([1, 2, 3, 4], 0.75), 3.25)

    def test_extract_contains_the_verified_comparison_set(self):
        result = PIPELINE.build(self.COLLECTION_YEAR)
        self.assertEqual(result["institution_count"], 19)
        for metric in result["metrics"]:
            self.assertEqual(metric["peer"]["count"], 10)
            self.assertEqual(metric["aspirant"]["count"], 8)
            self.assertIsNotNone(metric["value"])

    def test_metric_variables_exist_in_final_source_tables(self):
        for definition in PIPELINE.load_metrics():
            mapping = PIPELINE.mapping_for(definition, self.COLLECTION_YEAR)
            rows = PIPELINE.SOURCE.read_component(self.COLLECTION_YEAR, mapping["component"])
            sample = next(iter(rows.values()))
            self.assertIn(mapping["variable"], sample)
            if mapping.get("flag_variable"):
                self.assertIn(mapping["flag_variable"], sample)

    def test_every_metric_has_plain_language_interpretation(self):
        result = PIPELINE.build(self.COLLECTION_YEAR)
        for metric in result["metrics"]:
            self.assertTrue(metric["interpretation"])

        net_price = next(metric for metric in result["metrics"] if metric["metric_id"] == "average_net_price")
        self.assertIn("after grants and scholarships", net_price["interpretation"])

    def test_marist_is_not_in_peer_or_aspirant_groups(self):
        result = PIPELINE.build(self.COLLECTION_YEAR)
        for metric in result["metrics"]:
            marist = [record for record in metric["institutions"] if record["group"] == "marist"]
            self.assertEqual(len(marist), 1)
            self.assertNotEqual(marist[0]["group"], "peer")
            self.assertNotEqual(marist[0]["group"], "aspirant")

    def test_means_use_available_group_values_and_exclude_marist(self):
        summary = PIPELINE.summary([
            {"group": "marist", "value": 999},
            {"group": "peer", "value": 2},
            {"group": "peer", "value": 4},
            {"group": "peer", "value": None},
        ], "peer")
        self.assertEqual(summary["mean"], 3)
        self.assertEqual(summary["count"], 2)
        for release in PIPELINE.SOURCE.list_releases():
            result = PIPELINE.build(release["collection_year"])
            for metric in result["metrics"]:
                for group in ("peer", "aspirant"):
                    values = [
                        record["value"]
                        for record in metric["institutions"]
                        if record["group"] == group and record["value"] is not None
                    ]
                    self.assertAlmostEqual(metric[group]["mean"], sum(values) / len(values))
                    self.assertEqual(metric[group]["median"], statistics.median(values))

    def test_all_dataset_means_match_available_institution_values(self):
        self.assertEqual(SUCCESS.summarize([2, None, 4])["mean"], 3)
        for release in PIPELINE.SOURCE.list_releases():
            year = release["collection_year"]
            success = SUCCESS.build(year)
            affordability = AFFORDABILITY.build(year)
            for outcome in success["outcomes"]:
                for group in ("peer", "aspirant"):
                    values = [record["outcomes"][outcome["metric_id"]] for record in success["institutions"] if record["group"] == group and record["outcomes"][outcome["metric_id"]] is not None]
                    self.assertAlmostEqual(outcome[group]["mean"], sum(values) / len(values))
            for subgroup in success["subgroups"]:
                for group in ("peer", "aspirant"):
                    values = [record["subgroups"][subgroup["subgroup_id"]] for record in success["institutions"] if record["group"] == group and record["subgroups"][subgroup["subgroup_id"]] is not None]
                    self.assertAlmostEqual(subgroup[group]["mean"], sum(values) / len(values))
            for headline in affordability["headlines"]:
                for group in ("peer", "aspirant"):
                    values = [record[headline["metric_id"]] for record in affordability["institutions"] if record["group"] == group and record[headline["metric_id"]] is not None]
                    self.assertAlmostEqual(headline[group]["mean"], sum(values) / len(values))
            for band in affordability["income_bands"]:
                for group in ("peer", "aspirant"):
                    values = [record["income_net_prices"][band["band_id"]] for record in affordability["institutions"] if record["group"] == group and record["income_net_prices"][band["band_id"]] is not None]
                    self.assertAlmostEqual(band[group]["mean"], sum(values) / len(values))


if __name__ == "__main__":
    unittest.main()
