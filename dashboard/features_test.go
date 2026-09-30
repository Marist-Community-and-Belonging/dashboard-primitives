package main

import "testing"

func TestDashboardFeatureEnvironmentOverride(t *testing.T) {
	t.Setenv("DASHBOARD_FEATURE_SUCCESS_EQUITY_GAPS", "false")
	features, err := loadDashboardFeatures()
	if err != nil {
		t.Fatalf("loadDashboardFeatures() error = %v", err)
	}
	if features["success_equity_gaps"] {
		t.Fatal("success_equity_gaps = true, want false")
	}
	if !features["success_outcomes"] {
		t.Fatal("success_outcomes default = false, want true")
	}
}

func TestDashboardFeatureRejectsInvalidValue(t *testing.T) {
	t.Setenv("DASHBOARD_FEATURE_DIVERSITY_SCATTER", "sometimes")
	if _, err := loadDashboardFeatures(); err == nil {
		t.Fatal("loadDashboardFeatures() accepted an invalid boolean")
	}
}
