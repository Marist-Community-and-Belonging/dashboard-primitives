package main

import (
	"bytes"
	"encoding/csv"
	"strconv"
)

type releaseMetadata struct {
	CollectionYear string `json:"collection_year"`
	ReleaseType    string `json:"release_type"`
	RetrievedAt    string `json:"retrieved_at"`
	Source         string `json:"source"`
}

type groupSummary struct {
	Count  int      `json:"count"`
	Median *float64 `json:"median"`
	Q1     *float64 `json:"q1"`
	Q3     *float64 `json:"q3"`
}

type overviewMetric struct {
	MetricID        string       `json:"metric_id"`
	DisplayName     string       `json:"display_name"`
	Description     string       `json:"description"`
	Interpretation  string       `json:"interpretation"`
	Unit            string       `json:"unit"`
	Value           *float64     `json:"value"`
	DataYear        string       `json:"data_year"`
	CollectionYear  string       `json:"collection_year"`
	CohortYear      *string      `json:"cohort_year"`
	ReleaseType     string       `json:"release_type"`
	SourceComponent string       `json:"source_component"`
	SourceVariable  string       `json:"source_variable"`
	Peer            groupSummary `json:"peer"`
	Aspirant        groupSummary `json:"aspirant"`
}

type overviewDataset struct {
	Release          releaseMetadata  `json:"release"`
	InstitutionCount int              `json:"institution_count"`
	Metrics          []overviewMetric `json:"metrics"`
}

var exportHeader = []string{
	"metric_id", "metric", "interpretation", "marist", "peer_median", "aspirant_median", "unit",
	"data_year", "cohort_year", "collection_year", "release_type", "source_component", "source_variable",
}

func buildCSV(dataset overviewDataset) ([]byte, error) {
	var output bytes.Buffer
	writer := csv.NewWriter(&output)

	if err := writer.Write(exportHeader); err != nil {
		return nil, err
	}
	for _, metric := range dataset.Metrics {
		if err := writer.Write([]string{
			metric.MetricID,
			metric.DisplayName,
			metric.Interpretation,
			formatCSVNumber(metric.Value),
			formatCSVNumber(metric.Peer.Median),
			formatCSVNumber(metric.Aspirant.Median),
			metric.Unit,
			metric.DataYear,
			stringValue(metric.CohortYear),
			metric.CollectionYear,
			metric.ReleaseType,
			metric.SourceComponent,
			metric.SourceVariable,
		}); err != nil {
			return nil, err
		}
	}
	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, err
	}
	return output.Bytes(), nil
}

func formatCSVNumber(value *float64) string {
	if value == nil {
		return ""
	}
	return strconv.FormatFloat(*value, 'f', -1, 64)
}

func stringValue(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
