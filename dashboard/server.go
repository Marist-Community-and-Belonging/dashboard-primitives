package main

import (
	"fmt"
	"io"
	"io/fs"
	"log/slog"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

const apiPrefix = "/api/v1"

// newRouter keeps construction convenient for tests and small integrations.
// Production uses newRouterWithLogger so request logs share the process logger.
func newRouter(content fs.FS) (*gin.Engine, error) {
	return newRouterWithLogger(content, slog.New(slog.NewTextHandler(io.Discard, nil)))
}

func newRouterWithLogger(content fs.FS, logger *slog.Logger) (*gin.Engine, error) {
	application, err := loadApplication(content)
	if err != nil {
		return nil, err
	}

	gin.SetMode(gin.ReleaseMode)
	router := gin.New()
	router.Use(requestLogger(logger), recoveryLogger(logger), securityHeaders())

	assets, err := fs.Sub(content, "web/assets")
	if err != nil {
		return nil, fmt.Errorf("open embedded assets: %w", err)
	}
	router.StaticFS("/assets", http.FS(assets))

	registerPages(router, application.pages)
	registerAPI(router.Group(apiPrefix), application)

	indexHTML := application.pages["/"]
	router.NoRoute(func(c *gin.Context) {
		if c.Request.Method == http.MethodGet &&
			!strings.HasPrefix(c.Request.URL.Path, apiPrefix+"/") &&
			!strings.Contains(c.Request.URL.Path, ".") {
			c.Data(http.StatusOK, "text/html; charset=utf-8", indexHTML)
			return
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
	})

	return router, nil
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
