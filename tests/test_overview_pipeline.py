import unittest

from scripts.ipeds import build_overview as PIPELINE


class OverviewPipelineTests(unittest.TestCase):
    def test_missing_and_sentinel_values_are_not_zero(self):
        self.assertIsNone(PIPELINE.number(""))
        self.assertIsNone(PIPELINE.number("."))
        self.assertIsNone(PIPELINE.number("-2"))
        self.assertEqual(PIPELINE.number("0"), 0)

    def test_percentile_uses_linear_interpolation(self):
        self.assertEqual(PIPELINE.percentile([1, 2, 3, 4], 0.25), 1.75)
        self.assertEqual(PIPELINE.percentile([1, 2, 3, 4], 0.75), 3.25)

    def test_extract_contains_the_verified_comparison_set(self):
        result = PIPELINE.build()
        self.assertEqual(result["institution_count"], 19)
        for metric in result["metrics"]:
            self.assertEqual(metric["peer"]["count"], 10)
            self.assertEqual(metric["aspirant"]["count"], 8)
            self.assertIsNotNone(metric["value"])

    def test_metric_variables_exist_in_final_source_tables(self):
        for definition in PIPELINE.load_metrics():
            mapping = definition["releases"][PIPELINE.COLLECTION_YEAR]
            rows = PIPELINE.SOURCE.read_component(PIPELINE.COLLECTION_YEAR, mapping["component"])
            sample = next(iter(rows.values()))
            self.assertIn(mapping["variable"], sample)
            if mapping.get("flag_variable"):
                self.assertIn(mapping["flag_variable"], sample)

    def test_every_metric_has_plain_language_interpretation(self):
        for metric in PIPELINE.build()["metrics"]:
            self.assertTrue(metric["interpretation"])

        net_price = next(metric for metric in PIPELINE.build()["metrics"] if metric["metric_id"] == "average_net_price")
        self.assertIn("not aid received", net_price["interpretation"])

    def test_marist_is_not_in_peer_or_aspirant_groups(self):
        result = PIPELINE.build()
        for metric in result["metrics"]:
            marist = [record for record in metric["institutions"] if record["group"] == "marist"]
            self.assertEqual(len(marist), 1)
            self.assertNotEqual(marist[0]["group"], "peer")
            self.assertNotEqual(marist[0]["group"], "aspirant")


if __name__ == "__main__":
    unittest.main()
