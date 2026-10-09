import unittest

from scripts.ipeds import build_affordability_resources as AFFORDABILITY
from scripts.ipeds import build_success_equity as SUCCESS
from scripts.ipeds import refresh as REFRESH


class AdditionalPipelineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.success = SUCCESS.build("2023–24")
        cls.affordability = AFFORDABILITY.build("2023–24")

    def test_success_extract_dimensions_and_peer_counts(self):
        self.assertEqual(self.success["institution_count"], 19)
        self.assertEqual(len(self.success["outcomes"]), 4)
        self.assertEqual(len(self.success["subgroups"]), 14)
        self.assertTrue(all(item["peer"]["count"] == 10 for item in self.success["outcomes"]))

    def test_affordability_extract_dimensions_and_peer_counts(self):
        self.assertEqual(self.affordability["institution_count"], 19)
        self.assertEqual(len(self.affordability["headlines"]), 2)
        self.assertEqual(len(self.affordability["income_bands"]), 5)
        self.assertTrue(all(item["peer"]["count"] == 10 for item in self.affordability["headlines"]))

    def test_rounded_rate_handles_rounding_and_missing_values(self):
        self.assertEqual(REFRESH.rounded_rate(2, 3), 67)
        self.assertEqual(REFRESH.rounded_rate(1, 2), 50)
        self.assertIsNone(REFRESH.rounded_rate(None, 3))
        self.assertIsNone(REFRESH.rounded_rate(3, 0))


if __name__ == "__main__":
    unittest.main()
