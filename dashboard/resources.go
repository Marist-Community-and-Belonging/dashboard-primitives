package main

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"net/http"
	"sort"
	"strings"

	"github.com/gin-gonic/gin"
)

type embeddedDataset[T any] struct {
	dataset T
	json    []byte
	csv     []byte
}

type datasetCollection[T any] struct {
	byYear      map[string]embeddedDataset[T]
	defaultYear string
	release     func(T) releaseMetadata
}

type datasetDefinition[T any] struct {
	name    string
	pattern string
	release func(T) releaseMetadata
	export  func(T) ([]byte, error)
}

func loadDatasetCollection[T any](content fs.FS, definition datasetDefinition[T]) (datasetCollection[T], error) {
	paths, err := fs.Glob(content, definition.pattern)
	if err != nil {
		return datasetCollection[T]{}, fmt.Errorf("find embedded %s data: %w", definition.name, err)
	}
	if len(paths) == 0 {
		return datasetCollection[T]{}, fmt.Errorf("no embedded %s data", definition.name)
	}

	collection := datasetCollection[T]{
		byYear:  make(map[string]embeddedDataset[T], len(paths)),
		release: definition.release,
	}
	latestFinalYear := ""
	for _, path := range paths {
		payload, err := fs.ReadFile(content, path)
		if err != nil {
			return datasetCollection[T]{}, fmt.Errorf("read embedded %s data %s: %w", definition.name, path, err)
		}
		var dataset T
		if err := json.Unmarshal(payload, &dataset); err != nil {
			return datasetCollection[T]{}, fmt.Errorf("parse embedded %s data %s: %w", definition.name, path, err)
		}
		release := definition.release(dataset)
		if release.CollectionYear == "" {
			return datasetCollection[T]{}, fmt.Errorf("embedded %s data %s has no collection year", definition.name, path)
		}
		if _, exists := collection.byYear[release.CollectionYear]; exists {
			return datasetCollection[T]{}, fmt.Errorf("duplicate embedded %s year %s", definition.name, release.CollectionYear)
		}
		export, err := definition.export(dataset)
		if err != nil {
			return datasetCollection[T]{}, fmt.Errorf("build %s export %s: %w", definition.name, path, err)
		}
		collection.byYear[release.CollectionYear] = embeddedDataset[T]{dataset: dataset, json: payload, csv: export}
		if release.ReleaseType == "final" && release.CollectionYear > latestFinalYear {
			latestFinalYear = release.CollectionYear
		}
	}
	collection.defaultYear = latestFinalYear
	if collection.defaultYear == "" {
		return datasetCollection[T]{}, fmt.Errorf("no final embedded %s data", definition.name)
	}
	return collection, nil
}

func (collection datasetCollection[T]) selectYear(c *gin.Context) (embeddedDataset[T], bool) {
	year := c.Query("year")
	if year == "" {
		year = collection.defaultYear
	}
	dataset, ok := collection.byYear[year]
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "collection year is unavailable", "year": year})
		return embeddedDataset[T]{}, false
	}
	return dataset, true
}

func (collection datasetCollection[T]) releases() []releaseMetadata {
	releases := make([]releaseMetadata, 0, len(collection.byYear))
	for _, dataset := range collection.byYear {
		releases = append(releases, collection.release(dataset.dataset))
	}
	sort.Slice(releases, func(i, j int) bool {
		return releases[i].CollectionYear > releases[j].CollectionYear
	})
	return releases
}

func registerDatasetRoutes[T any](group *gin.RouterGroup, path, exportName string, collection datasetCollection[T]) {
	group.GET(path, func(c *gin.Context) {
		dataset, ok := collection.selectYear(c)
		if !ok {
			return
		}
		c.Header("Cache-Control", "public, max-age=300")
		c.Data(http.StatusOK, "application/json; charset=utf-8", dataset.json)
	})
	group.GET(path+"/export.csv", func(c *gin.Context) {
		dataset, ok := collection.selectYear(c)
		if !ok {
			return
		}
		year := strings.SplitN(collection.release(dataset.dataset).CollectionYear, "–", 2)[0]
		c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="marist-ipeds-%s-%s.csv"`, exportName, year))
		c.Data(http.StatusOK, "text/csv; charset=utf-8", dataset.csv)
	})
}
