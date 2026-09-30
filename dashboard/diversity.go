package main

import (
	"bytes"
	"encoding/csv"
	"strconv"
)

type diversityCategory struct {
	CategoryID  string `json:"category_id"`
	DisplayName string `json:"display_name"`
	Variable    string `json:"variable"`
}

type diversityInstitution struct {
	UnitID           int                 `json:"unitid"`
	InstitutionName  string              `json:"institution_name"`
	Group            string              `json:"group"`
	Enrollment       *float64            `json:"enrollment"`
	WomenShare       *float64            `json:"women_share"`
	MenShare         *float64            `json:"men_share"`
	PellShare        *float64            `json:"pell_share"`
	GraduationRate   *float64            `json:"graduation_rate"`
	DiversityIndex   *float64            `json:"diversity_index"`
	ReportedShares   map[string]*float64 `json:"reported_shares"`
	NormalizedShares map[string]*float64 `json:"normalized_shares"`
}

type diversityDataset struct {
	Release          releaseMetadata        `json:"release"`
	InstitutionCount int                    `json:"institution_count"`
	DataYear         string                 `json:"data_year"`
	Categories       []diversityCategory    `json:"categories"`
	Institutions     []diversityInstitution `json:"institutions"`
}

func buildDiversityCSV(dataset diversityDataset) ([]byte, error) {
	header := []string{
		"unitid", "institution", "group", "undergraduate_enrollment", "women_share", "men_share",
		"pell_share", "six_year_graduation_rate", "diversity_index",
	}
	for _, category := range dataset.Categories {
		header = append(header, category.CategoryID+"_share")
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
			formatCSVNumber(institution.Enrollment), formatCSVNumber(institution.WomenShare),
			formatCSVNumber(institution.MenShare), formatCSVNumber(institution.PellShare),
			formatCSVNumber(institution.GraduationRate), formatCSVNumber(institution.DiversityIndex),
		}
		for _, category := range dataset.Categories {
			record = append(record, formatCSVNumber(institution.ReportedShares[category.CategoryID]))
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
