package main

import (
	"bytes"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io/fs"
	"log/slog"
	"net/http"
	"strings"
	"testing"

	"github.com/valyala/fasthttp"
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
		{"/campus-involvement", "text/html"},
		{"/assets/dashboard.css", "text/css"},
		{"/assets/campus-involvement.css", "text/css"},
		{"/assets/dashboard.js", "text/javascript"},
		{"/assets/diversity-access.js", "text/javascript"},
		{"/assets/success-equity.js", "text/javascript"},
		{"/assets/affordability-resources.js", "text/javascript"},
		{"/assets/marist-profile.js", "text/javascript"},
		{"/assets/campus-involvement.js", "text/javascript"},
		{"/assets/collapsible.js", "text/javascript"},
		{"/assets/tooltips.js", "text/javascript"},
		{"/assets/year-selector.js", "text/javascript"},
		{"/assets/comparison-highlights.js", "text/javascript"},
		{"/assets/reveals.js", "text/javascript"},
		{"/assets/trends.js", "text/javascript"},
		{"/api/v1/health", "application/json"},
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
			response := testRequest(t, router, http.MethodGet, test.path)
			if response.StatusCode() != http.StatusOK {
				t.Fatalf("status = %d, want %d", response.StatusCode(), http.StatusOK)
			}
			if !strings.Contains(string(response.Header.Peek("Content-Type")), test.contentType) {
				t.Fatalf("content type = %q, want %q", string(response.Header.Peek("Content-Type")), test.contentType)
			}
		})
	}
}

func TestAffordabilityDatasetAndExport(t *testing.T) {
	router := testRouter(t)
	response := testRequest(t, router, http.MethodGet, "/api/v1/affordability-resources?year=2023%E2%80%9324")
	var dataset affordabilityDataset
	if err := json.Unmarshal(response.Body(), &dataset); err != nil {
		t.Fatalf("decode affordability dataset: %v", err)
	}
	if dataset.InstitutionCount != 19 || len(dataset.Headlines) != 2 || len(dataset.IncomeBands) != 5 || len(dataset.Institutions) != 19 {
		t.Fatalf("unexpected affordability dataset dimensions: institutions=%d headlines=%d bands=%d records=%d", dataset.InstitutionCount, len(dataset.Headlines), len(dataset.IncomeBands), len(dataset.Institutions))
	}
	if dataset.Headlines[0].Peer.Mean == nil || dataset.Headlines[0].Aspirant.Mean == nil {
		t.Fatal("affordability comparison means are unavailable")
	}
	exportResponse := testRequest(t, router, http.MethodGet, "/api/v1/affordability-resources/export.csv?year=2023%E2%80%9324")
	records, err := csv.NewReader(strings.NewReader(string(exportResponse.Body()))).ReadAll()
	if err != nil {
		t.Fatalf("read affordability export: %v", err)
	}
	if len(records) != 20 {
		t.Fatalf("affordability CSV rows = %d, want 20", len(records))
	}
}

func TestSuccessEquityDatasetAndExport(t *testing.T) {
	router := testRouter(t)
	response := testRequest(t, router, http.MethodGet, "/api/v1/success-equity?year=2023%E2%80%9324")
	var dataset successDataset
	if err := json.Unmarshal(response.Body(), &dataset); err != nil {
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
	exportResponse := testRequest(t, router, http.MethodGet, "/api/v1/success-equity/export.csv?year=2023%E2%80%9324")
	records, err := csv.NewReader(strings.NewReader(string(exportResponse.Body()))).ReadAll()
	if err != nil {
		t.Fatalf("read success export: %v", err)
	}
	if len(records) != 15 {
		t.Fatalf("success CSV rows = %d, want 15", len(records))
	}
	if !strings.Contains(strings.Join(records[0], ","), "peer_mean") || !strings.Contains(strings.Join(records[0], ","), "aspirant_mean") {
		t.Fatalf("success CSV header omits means: %v", records[0])
	}
}

func TestDiversityAccessDatasetAndExport(t *testing.T) {
	router := testRouter(t)
	response := testRequest(t, router, http.MethodGet, "/api/v1/diversity-access?year=2023%E2%80%9324")
	var dataset diversityDataset
	if err := json.Unmarshal(response.Body(), &dataset); err != nil {
		t.Fatalf("decode diversity dataset: %v", err)
	}
	if dataset.InstitutionCount != 19 || len(dataset.Categories) != 9 || len(dataset.Institutions) != 19 {
		t.Fatalf("unexpected diversity dataset dimensions: institutions=%d categories=%d records=%d", dataset.InstitutionCount, len(dataset.Categories), len(dataset.Institutions))
	}

	exportResponse := testRequest(t, router, http.MethodGet, "/api/v1/diversity-access/export.csv?year=2023%E2%80%9324")
	records, err := csv.NewReader(strings.NewReader(string(exportResponse.Body()))).ReadAll()
	if err != nil {
		t.Fatalf("read diversity export: %v", err)
	}
	if len(records) != 20 {
		t.Fatalf("diversity CSV rows = %d, want 20", len(records))
	}
}

func TestOverviewReleaseCatalogAndYearSelection(t *testing.T) {
	router := testRouter(t)

	catalogResponse := testRequest(t, router, http.MethodGet, "/api/v1/overview/releases")
	var catalog struct {
		DefaultYear string            `json:"default_year"`
		Releases    []releaseMetadata `json:"releases"`
	}
	if err := json.Unmarshal(catalogResponse.Body(), &catalog); err != nil {
		t.Fatalf("decode release catalog: %v", err)
	}
	if catalog.DefaultYear != "2023–24" || len(catalog.Releases) != 5 {
		t.Fatalf("release catalog = %#v, want five final releases through 2023–24", catalog)
	}

	yearResponse := testRequest(t, router, http.MethodGet, "/api/v1/overview?year=2023%E2%80%9324")
	if yearResponse.StatusCode() != http.StatusOK {
		t.Fatalf("selected year status = %d, want %d", yearResponse.StatusCode(), http.StatusOK)
	}

	missingResponse := testRequest(t, router, http.MethodGet, "/api/v1/overview?year=2018%E2%80%9319")
	if missingResponse.StatusCode() != http.StatusBadRequest {
		t.Fatalf("unavailable year status = %d, want %d", missingResponse.StatusCode(), http.StatusBadRequest)
	}
}

func TestEveryHistoricalDatasetIsSelectable(t *testing.T) {
	router := testRouter(t)
	years := []string{"2019%E2%80%9320", "2020%E2%80%9321", "2021%E2%80%9322", "2022%E2%80%9323", "2023%E2%80%9324"}
	endpoints := []string{"/api/v1/overview", "/api/v1/diversity-access", "/api/v1/success-equity", "/api/v1/affordability-resources"}
	for _, endpoint := range endpoints {
		for _, year := range years {
			response := testRequest(t, router, http.MethodGet, endpoint+"?year="+year)
			if response.StatusCode() != http.StatusOK {
				t.Fatalf("%s year %s status = %d, want %d", endpoint, year, response.StatusCode(), http.StatusOK)
			}
		}
	}
}

func TestDashboardHead(t *testing.T) {
	router := testRouter(t)
	response := testRequest(t, router, http.MethodHead, "/")
	if response.StatusCode() != http.StatusOK {
		t.Fatalf("status = %d, want %d", response.StatusCode(), http.StatusOK)
	}
}

func TestOverviewDataset(t *testing.T) {
	router := testRouter(t)
	response := testRequest(t, router, http.MethodGet, "/api/v1/overview")

	var dataset overviewDataset
	if err := json.Unmarshal(response.Body(), &dataset); err != nil {
		t.Fatalf("decode overview: %v", err)
	}
	if dataset.InstitutionCount != 19 {
		t.Fatalf("institution count = %d, want 19", dataset.InstitutionCount)
	}
	if len(dataset.Metrics) != 6 {
		t.Fatalf("metric count = %d, want 6", len(dataset.Metrics))
	}
	for _, metric := range dataset.Metrics {
		if metric.Value == nil || metric.Peer.Median == nil || metric.Peer.Mean == nil || metric.Aspirant.Median == nil || metric.Aspirant.Mean == nil {
			t.Fatalf("metric %s contains an unavailable headline value", metric.MetricID)
		}
	}
}

func TestCSVExportMatchesOverview(t *testing.T) {
	router := testRouter(t)
	response := testRequest(t, router, http.MethodGet, "/api/v1/export.csv")
	records, err := csv.NewReader(strings.NewReader(string(response.Body()))).ReadAll()
	if err != nil {
		t.Fatalf("read export: %v", err)
	}
	if len(records) != 7 {
		t.Fatalf("CSV rows = %d, want 7", len(records))
	}
	if !strings.Contains(strings.Join(records[0], ","), "peer_mean") || !strings.Contains(strings.Join(records[0], ","), "aspirant_mean") {
		t.Fatalf("overview CSV header omits means: %v", records[0])
	}
}

func TestPDFReportExport(t *testing.T) {
	original := renderReportPDF
	renderReportPDF = func(_ fs.FS, year int) ([]byte, error) {
		if year != 2023 {
			t.Fatalf("report year = %d, want 2023", year)
		}
		return []byte("%PDF-test"), nil
	}
	t.Cleanup(func() { renderReportPDF = original })

	router := testRouter(t)
	response := testRequest(t, router, http.MethodGet, "/api/v1/report.pdf?year=2023%E2%80%9324")
	if response.StatusCode() != http.StatusOK || string(response.Header.Peek("Content-Type")) != "application/pdf" {
		t.Fatalf("PDF response = %d %q", response.StatusCode(), string(response.Header.Peek("Content-Type")))
	}
	if got := string(response.Header.Peek("Content-Disposition")); got != `inline; filename="marist-ipeds-report-2023.pdf"` {
		t.Fatalf("Content-Disposition = %q", got)
	}
}

func TestClarifyReportJSON(t *testing.T) {
	report, err := clarifyReportJSON([]byte(`{"intro":"Source data.","chapters":[{"heading":"Overview","body":"old","callouts":[{"label":"old","body":"old"}]}]}`))
	if err != nil {
		t.Fatal(err)
	}
	text := string(report)
	for _, want := range []string{"Integrated Postsecondary Education Data System", "not automatically better", "middle half"} {
		if !strings.Contains(text, want) {
			t.Fatalf("clarified report omits %q: %s", want, text)
		}
	}
}

func TestSecurityHeaders(t *testing.T) {
	router := testRouter(t)
	response := testRequest(t, router, http.MethodGet, "/")
	if string(response.Header.Peek("Content-Security-Policy")) == "" {
		t.Fatal("Content-Security-Policy header is missing")
	}
}

func TestUnknownAPIRouteReturnsJSONNotDashboardShell(t *testing.T) {
	router := testRouter(t)
	response := testRequest(t, router, http.MethodGet, "/api/v1/not-a-route")
	if response.StatusCode() != http.StatusNotFound {
		t.Fatalf("status = %d, want %d", response.StatusCode(), http.StatusNotFound)
	}
	if !strings.Contains(string(response.Header.Peek("Content-Type")), "application/json") {
		t.Fatalf("content type = %q, want application/json", string(response.Header.Peek("Content-Type")))
	}
}

func TestDashboardShellFallback(t *testing.T) {
	router := testRouter(t)
	response := testRequest(t, router, http.MethodGet, "/future-page")
	if response.StatusCode() != http.StatusOK {
		t.Fatalf("status = %d, want %d", response.StatusCode(), http.StatusOK)
	}
	if !strings.Contains(string(response.Header.Peek("Content-Type")), "text/html") {
		t.Fatalf("content type = %q, want text/html", string(response.Header.Peek("Content-Type")))
	}
}

func TestDatasetResponseHeaders(t *testing.T) {
	router := testRouter(t)

	response := testRequest(t, router, http.MethodGet, "/api/v1/overview")

	if got := string(response.Header.Peek("Cache-Control")); got != "public, max-age=300" {
		t.Fatalf("Cache-Control = %q, want public, max-age=300", got)
	}
}

func TestAssetCacheHeaders(t *testing.T) {
	router := testRouter(t)
	response := testRequest(t, router, http.MethodGet, "/assets/dashboard.css")
	if got := string(response.Header.Peek("Cache-Control")); got != "public, max-age=3600" {
		t.Fatalf("Cache-Control = %q, want public, max-age=3600", got)
	}
}

func testRouter(t *testing.T) fasthttp.RequestHandler {
	t.Helper()
	router, err := newRouter(webAssets)
	if err != nil {
		t.Fatalf("newRouter() error = %v", err)
	}
	return router.Handler()
}

func testRequest(t *testing.T, handler fasthttp.RequestHandler, method, path string) *fasthttp.Response {
	t.Helper()
	var ctx fasthttp.RequestCtx
	ctx.Init(&fasthttp.Request{}, nil, nil)
	ctx.Request.SetRequestURI(path)
	ctx.Request.Header.SetMethod(method)
	handler(&ctx)
	t.Cleanup(ctx.Response.Reset)
	return &ctx.Response
}

func TestAssetHTTPContracts(t *testing.T) {
	router := testRouter(t)
	for _, test := range []struct {
		method, path, rangeHeader string
		status                    int
	}{
		{http.MethodHead, "/assets/dashboard.css", "", http.StatusOK},
		{http.MethodGet, "/assets/dashboard.css", "bytes=0-9", http.StatusPartialContent},
		{http.MethodGet, "/assets/missing.css", "", http.StatusNotFound},
		{http.MethodGet, "/assets/", "", http.StatusForbidden},
		{http.MethodPost, "/api/v1/overview", "", http.StatusNotFound},
		{http.MethodGet, "/missing.json", "", http.StatusNotFound},
	} {
		t.Run(test.method+" "+test.path, func(t *testing.T) {
			var ctx fasthttp.RequestCtx
			ctx.Init(&fasthttp.Request{}, nil, nil)
			ctx.Request.SetRequestURI(test.path)
			ctx.Request.Header.SetMethod(test.method)
			ctx.Request.Header.Set("Range", test.rangeHeader)
			router(&ctx)
			response := &ctx.Response
			defer response.Reset()
			if response.StatusCode() != test.status {
				t.Fatalf("status = %d, want %d", response.StatusCode(), test.status)
			}
			if string(response.Header.Peek("Content-Security-Policy")) == "" {
				t.Fatal("security headers missing")
			}
			if test.rangeHeader != "" && len(response.Body()) != 10 {
				t.Fatalf("range body length = %d", len(response.Body()))
			}
		})
	}
}

func TestPDFReportFailure(t *testing.T) {
	original := renderReportPDF
	renderReportPDF = func(fs.FS, int) ([]byte, error) { return nil, fmt.Errorf("render unavailable") }
	t.Cleanup(func() { renderReportPDF = original })
	var output bytes.Buffer
	router, err := newRouterWithLogger(webAssets, slog.New(slog.NewTextHandler(&output, nil)))
	if err != nil {
		t.Fatal(err)
	}
	response := testRequest(t, router.Handler(), http.MethodGet, "/api/v1/report.pdf")
	if response.StatusCode() != http.StatusInternalServerError || string(response.Body()) != `{"error":"report generation failed"}` {
		t.Fatalf("failure response = %d %q", response.StatusCode(), string(response.Body()))
	}
	if !strings.Contains(output.String(), "render unavailable") {
		t.Fatalf("failure log = %s", output.String())
	}
}
