package main

import (
	"fmt"
	"io/fs"
	"net/http"
	"strconv"
	"strings"

	"github.com/Marist-Community-and-Belonging/report-gen-pdf/reportgen"
	"github.com/gin-gonic/gin"
)

var renderReportPDF = func(content fs.FS, year int) ([]byte, error) {
	report, err := reportgen.BuildFromFS(content, "web/data", year)
	if err != nil {
		return nil, err
	}
	return reportgen.Generate(report, reportgen.Options{})
}

func registerAPI(api *gin.RouterGroup, app application) {
	api.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "release": app.overview.defaultYear})
	})
	api.GET("/overview/releases", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"default_year": app.overview.defaultYear,
			"releases":     app.overview.releases(),
		})
	})

	registerDatasetRoutes(api, "/diversity-access", "diversity-access", app.diversity)
	registerDatasetRoutes(api, "/success-equity", "success-equity", app.success)
	registerDatasetRoutes(api, "/affordability-resources", "affordability-resources", app.affordability)

	campusEvents := &campusEventsCache{}
	api.GET("/campus-involvement/events", func(c *gin.Context) {
		payload, err := campusEvents.get()
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": "campus events feed unavailable"})
			return
		}
		c.Header("Cache-Control", "public, max-age=60")
		c.JSON(http.StatusOK, payload)
	})

	// Keep the original overview export URL for downstream compatibility.
	api.GET("/overview", func(c *gin.Context) {
		dataset, ok := app.overview.selectYear(c)
		if !ok {
			return
		}
		c.Header("Cache-Control", "public, max-age=300")
		c.Data(http.StatusOK, "application/json; charset=utf-8", dataset.json)
	})
	api.GET("/export.csv", func(c *gin.Context) {
		dataset, ok := app.overview.selectYear(c)
		if !ok {
			return
		}
		year := strings.SplitN(dataset.dataset.Release.CollectionYear, "–", 2)[0]
		c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="marist-ipeds-overview-%s.csv"`, year))
		c.Data(http.StatusOK, "text/csv; charset=utf-8", dataset.csv)
	})
	api.GET("/report.pdf", func(c *gin.Context) {
		dataset, ok := app.overview.selectYear(c)
		if !ok {
			return
		}
		yearLabel := dataset.dataset.Release.CollectionYear
		year, err := strconv.Atoi(strings.SplitN(yearLabel, "–", 2)[0])
		if err != nil {
			_ = c.Error(err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "report generation failed"})
			return
		}
		pdf, err := renderReportPDF(app.content, year)
		if err != nil {
			_ = c.Error(err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "report generation failed"})
			return
		}
		c.Header("Content-Disposition", fmt.Sprintf(`inline; filename="marist-ipeds-report-%d.pdf"`, year))
		c.Data(http.StatusOK, "application/pdf", pdf)
	})
}
