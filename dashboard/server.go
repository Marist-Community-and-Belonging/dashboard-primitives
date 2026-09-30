package main

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

const (
	defaultReadHeaderTimeout = 5 * time.Second
	defaultReadTimeout       = 15 * time.Second
	defaultWriteTimeout      = 30 * time.Second
	defaultIdleTimeout       = 60 * time.Second
)

func newRouter(content fs.FS) (*gin.Engine, error) {
	features, err := loadDashboardFeatures()
	if err != nil {
		return nil, err
	}
	indexHTML, err := fs.ReadFile(content, "web/index.html")
	if err != nil {
		return nil, fmt.Errorf("read embedded index: %w", err)
	}
	overviews, defaultYear, err := loadOverviews(content)
	if err != nil {
		return nil, err
	}
	diversityHTML, err := fs.ReadFile(content, "web/diversity-access.html")
	if err != nil {
		return nil, fmt.Errorf("read embedded diversity page: %w", err)
	}
	diversity, diversityDefaultYear, err := loadDiversityDatasets(content)
	if err != nil {
		return nil, err
	}
	successHTML, err := fs.ReadFile(content, "web/success-equity.html")
	if err != nil {
		return nil, fmt.Errorf("read embedded success page: %w", err)
	}
	success, successDefaultYear, err := loadSuccessDatasets(content)
	if err != nil {
		return nil, err
	}
	affordabilityHTML, err := fs.ReadFile(content, "web/affordability-resources.html")
	if err != nil {
		return nil, fmt.Errorf("read embedded affordability page: %w", err)
	}
	affordability, affordabilityDefaultYear, err := loadAffordabilityDatasets(content)
	if err != nil {
		return nil, err
	}
	profileHTML, err := fs.ReadFile(content, "web/marist-profile.html")
	if err != nil {
		return nil, fmt.Errorf("read embedded Marist profile page: %w", err)
	}

	assets, err := fs.Sub(content, "web/assets")
	if err != nil {
		return nil, fmt.Errorf("open embedded assets: %w", err)
	}

	gin.SetMode(gin.ReleaseMode)
	router := gin.New()
	router.Use(gin.Recovery(), securityHeaders())
	router.StaticFS("/assets", http.FS(assets))

	serveIndex := func(c *gin.Context) {
		c.Data(http.StatusOK, "text/html; charset=utf-8", indexHTML)
	}
	router.GET("/", serveIndex)
	router.HEAD("/", serveIndex)
	serveDiversity := func(c *gin.Context) {
		c.Data(http.StatusOK, "text/html; charset=utf-8", diversityHTML)
	}
	router.GET("/diversity-access", serveDiversity)
	router.HEAD("/diversity-access", serveDiversity)
	serveSuccess := func(c *gin.Context) {
		c.Data(http.StatusOK, "text/html; charset=utf-8", successHTML)
	}
	router.GET("/success-equity", serveSuccess)
	router.HEAD("/success-equity", serveSuccess)
	serveAffordability := func(c *gin.Context) {
		c.Data(http.StatusOK, "text/html; charset=utf-8", affordabilityHTML)
	}
	router.GET("/affordability-resources", serveAffordability)
	router.HEAD("/affordability-resources", serveAffordability)
	serveProfile := func(c *gin.Context) {
		c.Data(http.StatusOK, "text/html; charset=utf-8", profileHTML)
	}
	router.GET("/marist-profile", serveProfile)
	router.HEAD("/marist-profile", serveProfile)
	router.GET("/api/v1/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "release": defaultYear})
	})
	router.GET("/api/v1/features", func(c *gin.Context) {
		c.Header("Cache-Control", "no-store")
		c.JSON(http.StatusOK, gin.H{"features": features})
	})
	router.GET("/api/v1/overview/releases", func(c *gin.Context) {
		releases := make([]releaseMetadata, 0, len(overviews))
		for _, overview := range overviews {
			releases = append(releases, overview.dataset.Release)
		}
		sort.Slice(releases, func(i, j int) bool {
			return releases[i].CollectionYear > releases[j].CollectionYear
		})
		c.JSON(http.StatusOK, gin.H{"default_year": defaultYear, "releases": releases})
	})
	router.GET("/api/v1/overview", func(c *gin.Context) {
		overview, ok := selectOverview(c, overviews, defaultYear)
		if !ok {
			return
		}
		c.Header("Cache-Control", "public, max-age=300")
		c.Data(http.StatusOK, "application/json; charset=utf-8", overview.json)
	})
	router.GET("/api/v1/export.csv", func(c *gin.Context) {
		overview, ok := selectOverview(c, overviews, defaultYear)
		if !ok {
			return
		}
		year := strings.SplitN(overview.dataset.Release.CollectionYear, "–", 2)[0]
		c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="marist-ipeds-overview-%s.csv"`, year))
		c.Data(http.StatusOK, "text/csv; charset=utf-8", overview.csv)
	})
	router.GET("/api/v1/diversity-access", func(c *gin.Context) {
		dataset, ok := selectDiversityDataset(c, diversity, diversityDefaultYear)
		if !ok {
			return
		}
		c.Header("Cache-Control", "public, max-age=300")
		c.Data(http.StatusOK, "application/json; charset=utf-8", dataset.json)
	})
	router.GET("/api/v1/diversity-access/export.csv", func(c *gin.Context) {
		dataset, ok := selectDiversityDataset(c, diversity, diversityDefaultYear)
		if !ok {
			return
		}
		year := strings.SplitN(dataset.dataset.Release.CollectionYear, "–", 2)[0]
		c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="marist-ipeds-diversity-access-%s.csv"`, year))
		c.Data(http.StatusOK, "text/csv; charset=utf-8", dataset.csv)
	})
	router.GET("/api/v1/success-equity", func(c *gin.Context) {
		dataset, ok := selectSuccessDataset(c, success, successDefaultYear)
		if !ok {
			return
		}
		c.Header("Cache-Control", "public, max-age=300")
		c.Data(http.StatusOK, "application/json; charset=utf-8", dataset.json)
	})
	router.GET("/api/v1/success-equity/export.csv", func(c *gin.Context) {
		dataset, ok := selectSuccessDataset(c, success, successDefaultYear)
		if !ok {
			return
		}
		year := strings.SplitN(dataset.dataset.Release.CollectionYear, "–", 2)[0]
		c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="marist-ipeds-success-equity-%s.csv"`, year))
		c.Data(http.StatusOK, "text/csv; charset=utf-8", dataset.csv)
	})
	router.GET("/api/v1/affordability-resources", func(c *gin.Context) {
		dataset, ok := selectAffordabilityDataset(c, affordability, affordabilityDefaultYear)
		if !ok {
			return
		}
		c.Header("Cache-Control", "public, max-age=300")
		c.Data(http.StatusOK, "application/json; charset=utf-8", dataset.json)
	})
	router.GET("/api/v1/affordability-resources/export.csv", func(c *gin.Context) {
		dataset, ok := selectAffordabilityDataset(c, affordability, affordabilityDefaultYear)
		if !ok {
			return
		}
		year := strings.SplitN(dataset.dataset.Release.CollectionYear, "–", 2)[0]
		c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="marist-ipeds-affordability-resources-%s.csv"`, year))
		c.Data(http.StatusOK, "text/csv; charset=utf-8", dataset.csv)
	})

	router.NoRoute(func(c *gin.Context) {
		if c.Request.Method == http.MethodGet && !strings.Contains(c.Request.URL.Path, ".") {
			c.Data(http.StatusOK, "text/html; charset=utf-8", indexHTML)
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
	})

	return router, nil
}

type embeddedAffordabilityDataset struct {
	dataset affordabilityDataset
	json    []byte
	csv     []byte
}

func loadAffordabilityDatasets(content fs.FS) (map[string]embeddedAffordabilityDataset, string, error) {
	paths, err := fs.Glob(content, "web/data/affordability-resources-*.json")
	if err != nil {
		return nil, "", fmt.Errorf("find embedded affordability data: %w", err)
	}
	if len(paths) == 0 {
		return nil, "", fmt.Errorf("no embedded affordability data")
	}
	datasets := make(map[string]embeddedAffordabilityDataset, len(paths))
	defaultYear := ""
	for _, path := range paths {
		payload, err := fs.ReadFile(content, path)
		if err != nil {
			return nil, "", fmt.Errorf("read embedded affordability data %s: %w", path, err)
		}
		var dataset affordabilityDataset
		if err := json.Unmarshal(payload, &dataset); err != nil {
			return nil, "", fmt.Errorf("parse embedded affordability data %s: %w", path, err)
		}
		if dataset.Release.CollectionYear == "" {
			return nil, "", fmt.Errorf("embedded affordability data %s has no collection year", path)
		}
		csvPayload, err := buildAffordabilityCSV(dataset)
		if err != nil {
			return nil, "", fmt.Errorf("build affordability export %s: %w", path, err)
		}
		datasets[dataset.Release.CollectionYear] = embeddedAffordabilityDataset{dataset: dataset, json: payload, csv: csvPayload}
		if dataset.Release.ReleaseType == "final" && dataset.Release.CollectionYear > defaultYear {
			defaultYear = dataset.Release.CollectionYear
		}
	}
	if defaultYear == "" {
		return nil, "", fmt.Errorf("no final embedded affordability data")
	}
	return datasets, defaultYear, nil
}

func selectAffordabilityDataset(c *gin.Context, datasets map[string]embeddedAffordabilityDataset, defaultYear string) (embeddedAffordabilityDataset, bool) {
	year := c.Query("year")
	if year == "" {
		year = defaultYear
	}
	dataset, ok := datasets[year]
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "collection year is unavailable", "year": year})
		return embeddedAffordabilityDataset{}, false
	}
	return dataset, true
}

type embeddedSuccessDataset struct {
	dataset successDataset
	json    []byte
	csv     []byte
}

func loadSuccessDatasets(content fs.FS) (map[string]embeddedSuccessDataset, string, error) {
	paths, err := fs.Glob(content, "web/data/success-equity-*.json")
	if err != nil {
		return nil, "", fmt.Errorf("find embedded success data: %w", err)
	}
	if len(paths) == 0 {
		return nil, "", fmt.Errorf("no embedded success data")
	}
	datasets := make(map[string]embeddedSuccessDataset, len(paths))
	defaultYear := ""
	for _, path := range paths {
		payload, readErr := fs.ReadFile(content, path)
		if readErr != nil {
			return nil, "", fmt.Errorf("read embedded success data %s: %w", path, readErr)
		}
		var dataset successDataset
		if err := json.Unmarshal(payload, &dataset); err != nil {
			return nil, "", fmt.Errorf("parse embedded success data %s: %w", path, err)
		}
		if dataset.Release.CollectionYear == "" {
			return nil, "", fmt.Errorf("embedded success data %s has no collection year", path)
		}
		if _, exists := datasets[dataset.Release.CollectionYear]; exists {
			return nil, "", fmt.Errorf("duplicate embedded success year %s", dataset.Release.CollectionYear)
		}
		csvPayload, err := buildSuccessCSV(dataset)
		if err != nil {
			return nil, "", fmt.Errorf("build success export %s: %w", path, err)
		}
		datasets[dataset.Release.CollectionYear] = embeddedSuccessDataset{dataset: dataset, json: payload, csv: csvPayload}
		if dataset.Release.ReleaseType == "final" && dataset.Release.CollectionYear > defaultYear {
			defaultYear = dataset.Release.CollectionYear
		}
	}
	if defaultYear == "" {
		return nil, "", fmt.Errorf("no final embedded success data")
	}
	return datasets, defaultYear, nil
}

func selectSuccessDataset(c *gin.Context, datasets map[string]embeddedSuccessDataset, defaultYear string) (embeddedSuccessDataset, bool) {
	year := c.Query("year")
	if year == "" {
		year = defaultYear
	}
	dataset, ok := datasets[year]
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "collection year is unavailable", "year": year})
		return embeddedSuccessDataset{}, false
	}
	return dataset, true
}

type embeddedDiversityDataset struct {
	dataset diversityDataset
	json    []byte
	csv     []byte
}

func loadDiversityDatasets(content fs.FS) (map[string]embeddedDiversityDataset, string, error) {
	paths, err := fs.Glob(content, "web/data/diversity-access-*.json")
	if err != nil {
		return nil, "", fmt.Errorf("find embedded diversity data: %w", err)
	}
	if len(paths) == 0 {
		return nil, "", fmt.Errorf("no embedded diversity data")
	}
	datasets := make(map[string]embeddedDiversityDataset, len(paths))
	defaultYear := ""
	for _, path := range paths {
		payload, readErr := fs.ReadFile(content, path)
		if readErr != nil {
			return nil, "", fmt.Errorf("read embedded diversity data %s: %w", path, readErr)
		}
		var dataset diversityDataset
		if unmarshalErr := json.Unmarshal(payload, &dataset); unmarshalErr != nil {
			return nil, "", fmt.Errorf("parse embedded diversity data %s: %w", path, unmarshalErr)
		}
		if dataset.Release.CollectionYear == "" {
			return nil, "", fmt.Errorf("embedded diversity data %s has no collection year", path)
		}
		csvPayload, csvErr := buildDiversityCSV(dataset)
		if csvErr != nil {
			return nil, "", fmt.Errorf("build diversity export %s: %w", path, csvErr)
		}
		datasets[dataset.Release.CollectionYear] = embeddedDiversityDataset{dataset: dataset, json: payload, csv: csvPayload}
		if dataset.Release.ReleaseType == "final" && dataset.Release.CollectionYear > defaultYear {
			defaultYear = dataset.Release.CollectionYear
		}
	}
	if defaultYear == "" {
		return nil, "", fmt.Errorf("no final embedded diversity data")
	}
	return datasets, defaultYear, nil
}

func selectDiversityDataset(c *gin.Context, datasets map[string]embeddedDiversityDataset, defaultYear string) (embeddedDiversityDataset, bool) {
	year := c.Query("year")
	if year == "" {
		year = defaultYear
	}
	dataset, ok := datasets[year]
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "collection year is unavailable", "year": year})
		return embeddedDiversityDataset{}, false
	}
	return dataset, true
}

type embeddedOverview struct {
	dataset overviewDataset
	json    []byte
	csv     []byte
}

func loadOverviews(content fs.FS) (map[string]embeddedOverview, string, error) {
	paths, err := fs.Glob(content, "web/data/overview-*.json")
	if err != nil {
		return nil, "", fmt.Errorf("find embedded overview data: %w", err)
	}
	if len(paths) == 0 {
		return nil, "", fmt.Errorf("no embedded overview data")
	}

	overviews := make(map[string]embeddedOverview, len(paths))
	latestYear := ""
	latestFinalYear := ""
	for _, path := range paths {
		payload, readErr := fs.ReadFile(content, path)
		if readErr != nil {
			return nil, "", fmt.Errorf("read embedded overview data %s: %w", path, readErr)
		}
		var dataset overviewDataset
		if unmarshalErr := json.Unmarshal(payload, &dataset); unmarshalErr != nil {
			return nil, "", fmt.Errorf("parse embedded overview data %s: %w", path, unmarshalErr)
		}
		if dataset.Release.CollectionYear == "" {
			return nil, "", fmt.Errorf("embedded overview data %s has no collection year", path)
		}
		if _, exists := overviews[dataset.Release.CollectionYear]; exists {
			return nil, "", fmt.Errorf("duplicate embedded overview year %s", dataset.Release.CollectionYear)
		}
		csvPayload, csvErr := buildCSV(dataset)
		if csvErr != nil {
			return nil, "", fmt.Errorf("build overview export %s: %w", path, csvErr)
		}
		overviews[dataset.Release.CollectionYear] = embeddedOverview{dataset: dataset, json: payload, csv: csvPayload}
		if dataset.Release.CollectionYear > latestYear {
			latestYear = dataset.Release.CollectionYear
		}
		if dataset.Release.ReleaseType == "final" && dataset.Release.CollectionYear > latestFinalYear {
			latestFinalYear = dataset.Release.CollectionYear
		}
	}
	defaultYear := latestFinalYear
	if defaultYear == "" {
		defaultYear = latestYear
	}
	return overviews, defaultYear, nil
}

func selectOverview(c *gin.Context, overviews map[string]embeddedOverview, defaultYear string) (embeddedOverview, bool) {
	year := c.Query("year")
	if year == "" {
		year = defaultYear
	}
	overview, ok := overviews[year]
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "collection year is unavailable", "year": year})
		return embeddedOverview{}, false
	}
	return overview, true
}

func securityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Next()
	}
}
