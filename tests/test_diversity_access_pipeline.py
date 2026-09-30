import unittest

from scripts.ipeds import build_diversity_access as PIPELINE


class DiversityAccessPipelineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.result = PIPELINE.build()

    def test_extract_contains_all_institutions_and_categories(self):
        self.assertEqual(self.result["institution_count"], 19)
        self.assertEqual(len(self.result["categories"]), 9)
        self.assertEqual(len(self.result["institutions"]), 19)

    def test_stacked_bar_shares_normalize_to_one_hundred(self):
        for group in self.result["groups"]:
            shares = [value for value in group["normalized_shares"].values() if value is not None]
            self.assertAlmostEqual(sum(shares), 100)

    def test_partial_composition_remains_unavailable(self):
        self.assertEqual(
            PIPELINE.normalize_shares({"reported": 60, "missing": None}),
            {"reported": None, "missing": None},
        )

    def test_impossible_percentage_fails_closed(self):
        with self.assertRaises(ValueError):
            PIPELINE.percentage("101")

    def test_group_composition_is_enrollment_weighted(self):
        peers = [record for record in self.result["institutions"] if record["group"] == "peer"]
        denominator = sum(record["enrollment"] for record in peers)
        expected = sum(record["enrollment"] * record["share_hispanic"] for record in peers) / denominator
        peer_group = next(group for group in self.result["groups"] if group["group"] == "peer")
        self.assertAlmostEqual(peer_group["reported_shares"]["hispanic"], expected)

    def test_reported_sex_distribution_sums_to_one_hundred(self):
        for record in self.result["institutions"]:
            self.assertAlmostEqual(record["women_share"] + record["men_share"], 100)

    def test_diversity_index_uses_normalized_category_shares(self):
        marist = next(record for record in self.result["institutions"] if record["group"] == "marist")
        shares = [value / 100 for value in marist["normalized_shares"].values()]
        self.assertAlmostEqual(marist["diversity_index"], 1 - sum(value**2 for value in shares))

    def test_historical_trend_is_explicitly_unavailable(self):
        self.assertFalse(self.result["trend"]["available"])
        self.assertIn("earlier final releases", self.result["trend"]["message"])


if __name__ == "__main__":
    unittest.main()
