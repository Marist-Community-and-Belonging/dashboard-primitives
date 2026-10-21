package main

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"net/http"
	"strconv"
	"strings"

	"github.com/Marist-Community-and-Belonging/report-gen-pdf/reportgen"
	"github.com/deglebe/flare"
)

var renderReportPDF = func(content fs.FS, year int) ([]byte, error) {
	report, err := reportgen.BuildFromFS(content, "web/data", year)
	if err != nil {
		return nil, err
	}
	report, err = clarifyReportJSON(report)
	if err != nil {
		return nil, err
	}
	return reportgen.Generate(report, reportgen.Options{})
}

func clarifyReportJSON(payload []byte) ([]byte, error) {
	var report map[string]any
	if err := json.Unmarshal(payload, &report); err != nil {
		return nil, fmt.Errorf("decode report: %w", err)
	}
	intro, ok := report["intro"].(string)
	if !ok {
		return nil, fmt.Errorf("report intro is missing")
	}
	report["intro"] = intro + " IPEDS is the federal Integrated Postsecondary Education Data System. Peers are Marist's primary official comparison group; aspirants are a second official group used for additional context. Neither group is a ranking or prediction. A collection names the release, not one shared measurement period. Dollar amounts are nominal, not adjusted for inflation. Unavailable means missing or suppressed, never zero."
	chapters, ok := report["chapters"].([]any)
	if !ok {
		return nil, fmt.Errorf("report chapters are missing")
	}
	foundOverview := false
	for _, raw := range chapters {
		chapter, ok := raw.(map[string]any)
		if !ok || chapter["heading"] != "Overview" {
			continue
		}
		chapter["body"] = "Comparisons are descriptive; higher or lower is not automatically better."
		callouts, ok := chapter["callouts"].([]any)
		if !ok || len(callouts) == 0 {
			return nil, fmt.Errorf("overview comparison callout is missing")
		}
		callout, ok := callouts[0].(map[string]any)
		if !ok {
			return nil, fmt.Errorf("overview comparison callout is invalid")
		}
		callout["label"] = "How to read comparison bands"
		callout["body"] = "Each shaded band shows the middle half of the comparison group. The solid tick is the median (middle institution), the dashed tick is the mean (average), and the red line is Marist."
		foundOverview = true
		break
	}
	if !foundOverview {
		return nil, fmt.Errorf("overview report chapter is missing")
	}
	return json.Marshal(report)
}

func registerAPI(api *flare.Router, app application) {
	api.GET("/health", func(c *flare.Ctx) {
		c.JSON(http.StatusOK, map[string]any{"status": "ok", "release": app.overview.defaultYear})
	})
	api.GET("/overview/releases", func(c *flare.Ctx) {
		c.JSON(http.StatusOK, map[string]any{
			"default_year": app.overview.defaultYear,
			"releases":     app.overview.releases(),
		})
	})

	registerDatasetRoutes(api, "/diversity-access", "diversity-access", app.diversity)
	registerDatasetRoutes(api, "/success-equity", "success-equity", app.success)
	registerDatasetRoutes(api, "/affordability-resources", "affordability-resources", app.affordability)

	campusEvents := &campusEventsCache{}
	api.GET("/campus-involvement/events", func(c *flare.Ctx) {
		payload, err := campusEvents.get()
		if err != nil {
			c.JSON(http.StatusBadGateway, map[string]any{"error": "campus events feed unavailable"})
			return
		}
		c.Response.Header.Set("Cache-Control", "public, max-age=60")
		c.JSON(http.StatusOK, payload)
	})

	// Keep the original overview export URL for downstream compatibility.
	api.GET("/overview", func(c *flare.Ctx) {
		dataset, ok := app.overview.selectYear(c)
		if !ok {
			return
		}
		c.Response.Header.Set("Cache-Control", "public, max-age=300")
		c.SetContentType("application/json; charset=utf-8")
		c.SetBody(dataset.json)
	})
	api.GET("/export.csv", func(c *flare.Ctx) {
		dataset, ok := app.overview.selectYear(c)
		if !ok {
			return
		}
		year := strings.SplitN(dataset.dataset.Release.CollectionYear, "–", 2)[0]
		c.Response.Header.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="marist-ipeds-overview-%s.csv"`, year))
		c.SetContentType("text/csv; charset=utf-8")
		c.SetBody(dataset.csv)
	})
	api.GET("/report.pdf", func(c *flare.Ctx) {
		dataset, ok := app.overview.selectYear(c)
		if !ok {
			return
		}
		yearLabel := dataset.dataset.Release.CollectionYear
		year, err := strconv.Atoi(strings.SplitN(yearLabel, "–", 2)[0])
		if err != nil {
			c.SetUserValue("error", err)
			c.JSON(http.StatusInternalServerError, map[string]any{"error": "report generation failed"})
			return
		}
		pdf, err := renderReportPDF(app.content, year)
		if err != nil {
			c.SetUserValue("error", err)
			c.JSON(http.StatusInternalServerError, map[string]any{"error": "report generation failed"})
			return
		}
		c.Response.Header.Set("Content-Disposition", fmt.Sprintf(`inline; filename="marist-ipeds-report-%d.pdf"`, year))
		c.SetContentType("application/pdf")
		c.SetBody(pdf)
	})
}
