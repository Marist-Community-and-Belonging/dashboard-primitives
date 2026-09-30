package main

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

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
}
