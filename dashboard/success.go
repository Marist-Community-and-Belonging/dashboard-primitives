package main

import (
	"bytes"
	"encoding/csv"
)

type successOutcome struct {
	MetricID    string       `json:"metric_id"`
	DisplayName string       `json:"display_name"`
	Description string       `json:"description"`
	Variable    string       `json:"variable"`
	DataYear    string       `json:"data_year"`
	CohortYear  *string      `json:"cohort_year"`
	Value       *float64     `json:"value"`
	Peer        groupSummary `json:"peer"`
	Aspirant    groupSummary `json:"aspirant"`
}

type successSubgroup struct {
	Category    string       `json:"category"`
	SubgroupID  string       `json:"subgroup_id"`
	DisplayName string       `json:"display_name"`
	Variable    string       `json:"variable"`
	Value       *float64     `json:"value"`
	Gap         *float64     `json:"gap"`
	Numerator   *float64     `json:"numerator"`
	Denominator *float64     `json:"denominator"`
	Peer        groupSummary `json:"peer"`
	Aspirant    groupSummary `json:"aspirant"`
}

type smallCohortPolicy struct {
	Minimum         int    `json:"minimum"`
	CountsAvailable bool   `json:"counts_available"`
	Message         string `json:"message"`
}

type successDataset struct {
	Release           releaseMetadata   `json:"release"`
	InstitutionCount  int               `json:"institution_count"`
	CohortYear        string            `json:"cohort_year"`
	InstitutionRate   *float64          `json:"institution_rate"`
	Outcomes          []successOutcome  `json:"outcomes"`
	Subgroups         []successSubgroup `json:"subgroups"`
	SmallCohortPolicy smallCohortPolicy `json:"small_cohort_policy"`
}

func buildSuccessCSV(dataset successDataset) ([]byte, error) {
	var output bytes.Buffer
	writer := csv.NewWriter(&output)
	header := []string{"category", "subgroup", "marist_rate", "gap_from_marist_overall", "peer_median", "peer_mean", "aspirant_median", "aspirant_mean", "numerator", "denominator", "cohort_year", "collection_year", "release_type", "source_variable"}
	if err := writer.Write(header); err != nil {
		return nil, err
	}
	for _, subgroup := range dataset.Subgroups {
		record := []string{
			subgroup.Category, subgroup.DisplayName, formatCSVNumber(subgroup.Value), formatCSVNumber(subgroup.Gap),
			formatCSVNumber(subgroup.Peer.Median), formatCSVNumber(subgroup.Peer.Mean),
			formatCSVNumber(subgroup.Aspirant.Median), formatCSVNumber(subgroup.Aspirant.Mean),
			formatCSVNumber(subgroup.Numerator), formatCSVNumber(subgroup.Denominator), dataset.CohortYear,
			dataset.Release.CollectionYear, dataset.Release.ReleaseType, subgroup.Variable,
		}
		if err := writer.Write(record); err != nil {
			return nil, err
		}
	}
	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, err
	}
	return output.Bytes(), nil
}
