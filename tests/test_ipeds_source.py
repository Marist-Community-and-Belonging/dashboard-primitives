import unittest

from scripts.ipeds import source as SOURCE


class IpedsSourceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = SOURCE.IpedsSource()

    def test_manifest_lists_final_release(self):
        self.assertEqual(
            self.source.list_releases(),
            [{"collection_year": "2023–24", "release_type": "final", "retrieved_at": "2026-09-25"}],
        )

    def test_components_and_dictionaries_are_validated(self):
        component = self.source.fetch_component("2023–24", "ADM_DERIVED")
        self.assertEqual(component.label, "DRVADM2023")
        self.assertIsNone(component.member)
        self.assertEqual(set(self.source.fetch_dictionary("2023–24")), {"ACCESS"})
        self.assertEqual(self.source.fetch_bundle("2023–24").member, "IPEDS202324.accdb")

    def test_institution_lookup_is_complete(self):
        unitids = {192819, 198516, 216597}
        institutions = self.source.fetch_institutions(unitids)
        self.assertEqual(set(institutions), unitids)
        self.assertEqual(institutions[192819]["INSTNM"], "Marist College")

    def test_unknown_release_fails_closed(self):
        with self.assertRaisesRegex(KeyError, "unknown collection year"):
            self.source.fetch_component("2099–00", "HD")


if __name__ == "__main__":
    unittest.main()
