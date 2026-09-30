package main

import (
	"encoding/csv"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestDashboardRoutes(t *testing.T) {
	router := testRouter(t)

	tests := []struct {
		path        string
		contentType string
	}{
		{"/", "text/html"},
		{"/diversity-access", "text/html"},
		{"/success-equity", "text/html"},
		{"/affordability-resources", "text/html"},
		{"/marist-profile", "text/html"},
		{"/assets/dashboard.css", "text/css"},
		{"/assets/dashboard.js", "text/javascript"},
		{"/assets/diversity-access.js", "text/javascript"},
		{"/assets/success-equity.js", "text/javascript"},
		{"/assets/affordability-resources.js", "text/javascript"},
		{"/assets/marist-profile.js", "text/javascript"},
		{"/assets/features.js", "text/javascript"},
		{"/assets/collapsible.js", "text/javascript"},
		{"/assets/tooltips.js", "text/javascript"},
		{"/assets/year-selector.js", "text/javascript"},
		{"/assets/comparison-highlights.js", "text/javascript"},
		{"/assets/reveals.js", "text/javascript"},
		{"/assets/trends.js", "text/javascript"},
		{"/api/v1/health", "application/json"},
		{"/api/v1/features", "application/json"},
		{"/api/v1/overview/releases", "application/json"},
		{"/api/v1/overview", "application/json"},
		{"/api/v1/export.csv", "text/csv"},
		{"/api/v1/diversity-access", "application/json"},
		{"/api/v1/diversity-access/export.csv", "text/csv"},
		{"/api/v1/success-equity", "application/json"},
		{"/api/v1/success-equity/export.csv", "text/csv"},
		{"/api/v1/affordability-resources", "application/json"},
		{"/api/v1/affordability-resources/export.csv", "text/csv"},
	}

	for _, test := range tests {
		t.Run(test.path, func(t *testing.T) {
			response := httptest.NewRecorder()
			request := httptest.NewRequest(http.MethodGet, test.path, nil)
			router.ServeHTTP(response, request)
			if response.Code != http.StatusOK {
				t.Fatalf("status = %d, want %d", response.Code, http.StatusOK)
			}
			if !strings.Contains(response.Header().Get("Content-Type"), test.contentType) {
				t.Fatalf("content type = %q, want %q", response.Header().Get("Content-Type"), test.contentType)
			}
		})
	}
}

func TestAffordabilityDatasetAndExport(t *testing.T) {
	router := testRouter(t)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/api/v1/affordability-resources?year=2023%E2%80%9324", nil))
	var dataset affordabilityDataset
	if err := json.Unmarshal(response.Body.Bytes(), &dataset); err != nil {
		t.Fatalf("decode affordability dataset: %v", err)
	}
	if dataset.InstitutionCount != 19 || len(dataset.Headlines) != 2 || len(dataset.IncomeBands) != 5 || len(dataset.Institutions) != 19 {
		t.Fatalf("unexpected affordability dataset dimensions: institutions=%d headlines=%d bands=%d records=%d", dataset.InstitutionCount, len(dataset.Headlines), len(dataset.IncomeBands), len(dataset.Institutions))
	}
	exportResponse := httptest.NewRecorder()
	router.ServeHTTP(exportResponse, httptest.NewRequest(http.MethodGet, "/api/v1/affordability-resources/export.csv?year=2023%E2%80%9324", nil))
	records, err := csv.NewReader(strings.NewReader(exportResponse.Body.String())).ReadAll()
	if err != nil {
		t.Fatalf("read affordability export: %v", err)
	}
	if len(records) != 20 {
		t.Fatalf("affordability CSV rows = %d, want 20", len(records))
	}
}

func TestSuccessEquityDatasetAndExport(t *testing.T) {
	router := testRouter(t)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/api/v1/success-equity?year=2023%E2%80%9324", nil))
	var dataset successDataset
	if err := json.Unmarshal(response.Body.Bytes(), &dataset); err != nil {
		t.Fatalf("decode success dataset: %v", err)
	}
	if dataset.InstitutionCount != 19 || len(dataset.Outcomes) != 4 || len(dataset.Subgroups) != 14 {
		t.Fatalf("unexpected success dataset dimensions: institutions=%d outcomes=%d subgroups=%d", dataset.InstitutionCount, len(dataset.Outcomes), len(dataset.Subgroups))
	}
	if dataset.InstitutionRate == nil || *dataset.InstitutionRate != 80 {
		t.Fatalf("institution rate = %v, want 80", dataset.InstitutionRate)
	}
	if dataset.SmallCohortPolicy.CountsAvailable {
		t.Fatal("derived success extract unexpectedly claims cohort counts")
	}
	exportResponse := httptest.NewRecorder()
	router.ServeHTTP(exportResponse, httptest.NewRequest(http.MethodGet, "/api/v1/success-equity/export.csv?year=2023%E2%80%9324", nil))
	records, err := csv.NewReader(strings.NewReader(exportResponse.Body.String())).ReadAll()
	if err != nil {
		t.Fatalf("read success export: %v", err)
	}
	if len(records) != 15 {
		t.Fatalf("success CSV rows = %d, want 15", len(records))
	}
}

func TestDiversityAccessDatasetAndExport(t *testing.T) {
	router := testRouter(t)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/api/v1/diversity-access?year=2023%E2%80%9324", nil))
	var dataset diversityDataset
	if err := json.Unmarshal(response.Body.Bytes(), &dataset); err != nil {
		t.Fatalf("decode diversity dataset: %v", err)
	}
	if dataset.InstitutionCount != 19 || len(dataset.Categories) != 9 || len(dataset.Institutions) != 19 {
		t.Fatalf("unexpected diversity dataset dimensions: institutions=%d categories=%d records=%d", dataset.InstitutionCount, len(dataset.Categories), len(dataset.Institutions))
	}

	exportResponse := httptest.NewRecorder()
	router.ServeHTTP(exportResponse, httptest.NewRequest(http.MethodGet, "/api/v1/diversity-access/export.csv?year=2023%E2%80%9324", nil))
	records, err := csv.NewReader(strings.NewReader(exportResponse.Body.String())).ReadAll()
	if err != nil {
		t.Fatalf("read diversity export: %v", err)
	}
	if len(records) != 20 {
		t.Fatalf("diversity CSV rows = %d, want 20", len(records))
	}
}

func TestOverviewReleaseCatalogAndYearSelection(t *testing.T) {
	router := testRouter(t)

	catalogResponse := httptest.NewRecorder()
	router.ServeHTTP(catalogResponse, httptest.NewRequest(http.MethodGet, "/api/v1/overview/releases", nil))
	var catalog struct {
		DefaultYear string            `json:"default_year"`
		Releases    []releaseMetadata `json:"releases"`
	}
	if err := json.Unmarshal(catalogResponse.Body.Bytes(), &catalog); err != nil {
		t.Fatalf("decode release catalog: %v", err)
	}
	if catalog.DefaultYear != "2023–24" || len(catalog.Releases) != 5 {
		t.Fatalf("release catalog = %#v, want five final releases through 2023–24", catalog)
	}

	yearResponse := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/v1/overview?year=2023%E2%80%9324", nil)
	router.ServeHTTP(yearResponse, request)
	if yearResponse.Code != http.StatusOK {
		t.Fatalf("selected year status = %d, want %d", yearResponse.Code, http.StatusOK)
	}

	missingResponse := httptest.NewRecorder()
	router.ServeHTTP(missingResponse, httptest.NewRequest(http.MethodGet, "/api/v1/overview?year=2018%E2%80%9319", nil))
	if missingResponse.Code != http.StatusBadRequest {
		t.Fatalf("unavailable year status = %d, want %d", missingResponse.Code, http.StatusBadRequest)
	}
}

func TestEveryHistoricalDatasetIsSelectable(t *testing.T) {
	router := testRouter(t)
	years := []string{"2019%E2%80%9320", "2020%E2%80%9321", "2021%E2%80%9322", "2022%E2%80%9323", "2023%E2%80%9324"}
	endpoints := []string{"/api/v1/overview", "/api/v1/diversity-access", "/api/v1/success-equity", "/api/v1/affordability-resources"}
	for _, endpoint := range endpoints {
		for _, year := range years {
			response := httptest.NewRecorder()
			router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, endpoint+"?year="+year, nil))
			if response.Code != http.StatusOK {
				t.Fatalf("%s year %s status = %d, want %d", endpoint, year, response.Code, http.StatusOK)
			}
		}
	}
}

func TestDashboardHead(t *testing.T) {
	router := testRouter(t)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest(http.MethodHead, "/", nil))
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusOK)
	}
}

func TestOverviewDataset(t *testing.T) {
	router := testRouter(t)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/api/v1/overview", nil))

	var dataset overviewDataset
	if err := json.Unmarshal(response.Body.Bytes(), &dataset); err != nil {
		t.Fatalf("decode overview: %v", err)
	}
	if dataset.InstitutionCount != 19 {
		t.Fatalf("institution count = %d, want 19", dataset.InstitutionCount)
	}
	if len(dataset.Metrics) != 6 {
		t.Fatalf("metric count = %d, want 6", len(dataset.Metrics))
	}
	for _, metric := range dataset.Metrics {
		if metric.Value == nil || metric.Peer.Median == nil || metric.Aspirant.Median == nil {
			t.Fatalf("metric %s contains an unavailable headline value", metric.MetricID)
		}
	}
}

func TestCSVExportMatchesOverview(t *testing.T) {
	router := testRouter(t)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/api/v1/export.csv", nil))
	records, err := csv.NewReader(strings.NewReader(response.Body.String())).ReadAll()
	if err != nil {
		t.Fatalf("read export: %v", err)
	}
	if len(records) != 7 {
		t.Fatalf("CSV rows = %d, want 7", len(records))
	}
}

func TestSecurityHeaders(t *testing.T) {
	router := testRouter(t)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/", nil))
	if response.Header().Get("Content-Security-Policy") == "" {
		t.Fatal("Content-Security-Policy header is missing")
	}
}

func testRouter(t *testing.T) http.Handler {
	t.Helper()
	router, err := newRouter(webAssets)
	if err != nil {
		t.Fatalf("newRouter() error = %v", err)
	}
	return router
}
