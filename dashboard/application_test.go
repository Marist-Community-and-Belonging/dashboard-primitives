package main

import "testing"

func TestDatasetYearsMustMatch(t *testing.T) {
	year := "2023–24"
	err := validateDatasetYears(
		map[string]embeddedDataset[overviewDataset]{year: {}},
		map[string]embeddedDataset[diversityDataset]{},
		map[string]embeddedDataset[successDataset]{year: {}},
		map[string]embeddedDataset[affordabilityDataset]{year: {}},
	)
	if err == nil {
		t.Fatal("validateDatasetYears() accepted a missing diversity collection")
	}
}
