package main

import "io/fs"

type application struct {
	content       fs.FS
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

	return application{
		content:       content,
		pages:         pages,
		overview:      overview,
		diversity:     diversity,
		success:       success,
		affordability: affordability,
	}, nil
}
