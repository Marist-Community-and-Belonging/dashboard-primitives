package main

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

var defaultDashboardFeatures = map[string]bool{
	"overview_headlines":      true,
	"diversity_composition":   true,
	"diversity_access":        true,
	"diversity_gaps":          true,
	"diversity_scatter":       true,
	"diversity_trend":         true,
	"success_outcomes":        true,
	"success_equity_gaps":     true,
	"success_trend":           true,
	"affordability_headlines": true,
	"affordability_income":    true,
	"affordability_scatter":   true,
	"affordability_trend":     true,
}

func loadDashboardFeatures() (map[string]bool, error) {
	features := make(map[string]bool, len(defaultDashboardFeatures))
	for name, defaultValue := range defaultDashboardFeatures {
		value := defaultValue
		environmentName := "DASHBOARD_FEATURE_" + strings.ToUpper(name)
		if raw, present := os.LookupEnv(environmentName); present {
			parsed, err := strconv.ParseBool(raw)
			if err != nil {
				return nil, fmt.Errorf("parse %s: %w", environmentName, err)
			}
			value = parsed
		}
		features[name] = value
	}
	return features, nil
}
