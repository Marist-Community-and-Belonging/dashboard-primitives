package main

import (
	"io/fs"
	"testing"
	"testing/fstest"
)

type testDataset struct {
	Release releaseMetadata `json:"release"`
}

func TestLoadDatasetCollectionPrefersLatestFinalRelease(t *testing.T) {
	content := fstest.MapFS{
		"data/2023.json": {Data: []byte(`{"release":{"collection_year":"2023–24","release_type":"final"}}`)},
		"data/2024.json": {Data: []byte(`{"release":{"collection_year":"2024–25","release_type":"provisional"}}`)},
	}
	collection, err := loadTestCollection(content)
	if err != nil {
		t.Fatalf("loadDatasetCollection() error = %v", err)
	}
	if collection.defaultYear != "2023–24" {
		t.Fatalf("default year = %q, want latest final year 2023–24", collection.defaultYear)
	}
	if got := collection.releases(); len(got) != 2 || got[0].CollectionYear != "2024–25" {
		t.Fatalf("releases = %#v, want descending collection years", got)
	}
}

func TestLoadDatasetCollectionRejectsDuplicateRelease(t *testing.T) {
	content := fstest.MapFS{
		"data/a.json": {Data: []byte(`{"release":{"collection_year":"2023–24","release_type":"final"}}`)},
		"data/b.json": {Data: []byte(`{"release":{"collection_year":"2023–24","release_type":"final"}}`)},
	}
	if _, err := loadTestCollection(content); err == nil {
		t.Fatal("loadDatasetCollection() accepted duplicate collection years")
	}
}

func TestLoadDatasetCollectionRequiresData(t *testing.T) {
	if _, err := loadTestCollection(fstest.MapFS{}); err == nil {
		t.Fatal("loadDatasetCollection() accepted an empty filesystem")
	}
}

func TestLoadDatasetCollectionRequiresFinalData(t *testing.T) {
	content := fstest.MapFS{
		"data/2024.json": {Data: []byte(`{"release":{"collection_year":"2024–25","release_type":"provisional"}}`)},
	}
	_, err := loadDatasetCollection(content, datasetDefinition[testDataset]{
		name:    "test",
		pattern: "data/*.json",
		release: func(dataset testDataset) releaseMetadata { return dataset.Release },
		export:  func(testDataset) ([]byte, error) { return []byte("export"), nil },
	})
	if err == nil {
		t.Fatal("loadDatasetCollection() accepted provisional-only data when a final release is required")
	}
}

func loadTestCollection(content fs.FS) (datasetCollection[testDataset], error) {
	return loadDatasetCollection(content, datasetDefinition[testDataset]{
		name:    "test",
		pattern: "data/*.json",
		release: func(dataset testDataset) releaseMetadata { return dataset.Release },
		export:  func(testDataset) ([]byte, error) { return []byte("export"), nil },
	})
}
