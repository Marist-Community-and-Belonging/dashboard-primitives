package main

import (
	"bytes"
	"encoding/csv"
	"strconv"
)

type affordabilityHeadline struct {
	MetricID    string       `json:"metric_id"`
	DisplayName string       `json:"display_name"`
	Description string       `json:"description"`
	Variable    string       `json:"variable"`
	Unit        string       `json:"unit"`
	Value       *float64     `json:"value"`
	DataYear    string       `json:"data_year"`
	Peer        groupSummary `json:"peer"`
	Aspirant    groupSummary `json:"aspirant"`
}

type affordabilityIncomeBand struct {
	BandID      string       `json:"band_id"`
	DisplayName string       `json:"display_name"`
	Variable    string       `json:"variable"`
	Marist      *float64     `json:"marist"`
	Peer        groupSummary `json:"peer"`
	Aspirant    groupSummary `json:"aspirant"`
}

type affordabilityInstitution struct {
	UnitID          int                 `json:"unitid"`
	InstitutionName string              `json:"institution_name"`
	Group           string              `json:"group"`
	AverageNetPrice *float64            `json:"average_net_price"`
	PellShare       *float64            `json:"pell_share"`
	GraduationRate  *float64            `json:"graduation_rate"`
	IncomeNetPrices map[string]*float64 `json:"income_net_prices"`
}

type affordabilityDataset struct {
	Release          releaseMetadata            `json:"release"`
	InstitutionCount int                        `json:"institution_count"`
	DataYear         string                     `json:"data_year"`
	Headlines        []affordabilityHeadline    `json:"headlines"`
	IncomeBands      []affordabilityIncomeBand  `json:"income_bands"`
	Institutions     []affordabilityInstitution `json:"institutions"`
}

func buildAffordabilityCSV(dataset affordabilityDataset) ([]byte, error) {
	header := []string{"unitid", "institution", "group", "average_net_price", "pell_share", "six_year_graduation_rate"}
	for _, band := range dataset.IncomeBands {
		header = append(header, band.BandID+"_net_price")
	}
	header = append(header, "data_year", "collection_year", "release_type")

	var output bytes.Buffer
	writer := csv.NewWriter(&output)
	if err := writer.Write(header); err != nil {
		return nil, err
	}
	for _, institution := range dataset.Institutions {
		record := []string{
			strconv.Itoa(institution.UnitID), institution.InstitutionName, institution.Group,
			formatCSVNumber(institution.AverageNetPrice), formatCSVNumber(institution.PellShare), formatCSVNumber(institution.GraduationRate),
		}
		for _, band := range dataset.IncomeBands {
			record = append(record, formatCSVNumber(institution.IncomeNetPrices[band.BandID]))
		}
		record = append(record, dataset.DataYear, dataset.Release.CollectionYear, dataset.Release.ReleaseType)
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
