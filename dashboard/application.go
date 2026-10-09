package main

import (
	"fmt"
	"io/fs"
)

type application struct {
	pages         map[string][]byte
	overview      datasetCollection[overviewDataset]
	diversity     datasetCollection[diversityDataset]
	success       datasetCollection[successDataset]
	affordability datasetCollection[affordabilityDataset]
}

func loadApplication(content fs.FS) (application, error) {
	pages, err := loadPages(content)
	if err != nil {
		return application{}, err
	}

	overview, err := loadDatasetCollection(content, datasetDefinition[overviewDataset]{
		name:    "overview",
		pattern: "web/data/overview-*.json",
		release: func(dataset overviewDataset) releaseMetadata { return dataset.Release },
		export:  buildCSV,
	})
	if err != nil {
		return application{}, err
	}
	diversity, err := loadDatasetCollection(content, datasetDefinition[diversityDataset]{
		name:    "diversity",
		pattern: "web/data/diversity-access-*.json",
		release: func(dataset diversityDataset) releaseMetadata { return dataset.Release },
		export:  buildDiversityCSV,
	})
	if err != nil {
		return application{}, err
	}
	success, err := loadDatasetCollection(content, datasetDefinition[successDataset]{
		name:    "success",
		pattern: "web/data/success-equity-*.json",
		release: func(dataset successDataset) releaseMetadata { return dataset.Release },
		export:  buildSuccessCSV,
	})
	if err != nil {
		return application{}, err
	}
	affordability, err := loadDatasetCollection(content, datasetDefinition[affordabilityDataset]{
		name:    "affordability",
		pattern: "web/data/affordability-resources-*.json",
		release: func(dataset affordabilityDataset) releaseMetadata { return dataset.Release },
		export:  buildAffordabilityCSV,
	})
	if err != nil {
		return application{}, err
	}
	if err := validateDatasetYears(overview.byYear, diversity.byYear, success.byYear, affordability.byYear); err != nil {
		return application{}, err
	}

	return application{
		pages:         pages,
		overview:      overview,
		diversity:     diversity,
		success:       success,
		affordability: affordability,
	}, nil
}

func validateDatasetYears(overview map[string]embeddedDataset[overviewDataset], diversity map[string]embeddedDataset[diversityDataset], success map[string]embeddedDataset[successDataset], affordability map[string]embeddedDataset[affordabilityDataset]) error {
	if len(overview) != len(diversity) || len(overview) != len(success) || len(overview) != len(affordability) {
		return fmt.Errorf("embedded dataset collections do not match")
	}
	for year := range overview {
		if _, ok := diversity[year]; !ok {
			return fmt.Errorf("diversity dataset missing collection %s", year)
		}
		if _, ok := success[year]; !ok {
			return fmt.Errorf("success dataset missing collection %s", year)
		}
		if _, ok := affordability[year]; !ok {
			return fmt.Errorf("affordability dataset missing collection %s", year)
		}
	}
	return nil
}
