package main

import (
	"fmt"
	"io"
	"io/fs"
	"log/slog"
	"net/http"
	"strings"

	"github.com/deglebe/flare"
	"github.com/valyala/fasthttp"
)

const apiPrefix = "/api/v1"

// newRouter keeps construction convenient for tests and small integrations.
// Production uses newRouterWithLogger so request logs share the process logger.
func newRouter(content fs.FS) (*flare.Engine, error) {
	return newRouterWithLogger(content, slog.New(slog.NewTextHandler(io.Discard, nil)))
}

func newRouterWithLogger(content fs.FS, logger *slog.Logger) (*flare.Engine, error) {
	application, err := loadApplication(content)
	if err != nil {
		return nil, err
	}

	router := flare.New()
	router.Use(requestLogger(logger), securityHeaders(), recoveryLogger(logger), assetCacheHeaders())

	assets, err := fs.Sub(content, "web/assets")
	if err != nil {
		return nil, fmt.Errorf("open embedded assets: %w", err)
	}
	assetHandler := (&fasthttp.FS{
		FS:              assets,
		IndexNames:      []string{"index.html"},
		AcceptByteRange: true,
		PathRewrite:     fasthttp.NewPathPrefixStripper(len("/assets")),
	}).NewRequestHandler()
	serveAsset := func(c *flare.Ctx) { assetHandler(c.RequestCtx) }
	router.GET("/assets/", serveAsset)
	router.HEAD("/assets/", serveAsset)
	router.GET("/assets/*filepath", serveAsset)
	router.HEAD("/assets/*filepath", serveAsset)

	registerPages(router, application.pages)
	registerAPI(router.Group(apiPrefix), application)

	indexHTML := application.pages["/"]
	fallback := func(c *flare.Ctx) {
		if string(c.Method()) == http.MethodGet &&
			!strings.HasPrefix(string(c.Path()), apiPrefix+"/") &&
			!strings.Contains(string(c.Path()), ".") {
			c.SetContentType("text/html; charset=utf-8")
			c.SetBody(indexHTML)
			return
		}
		c.JSON(http.StatusNotFound, map[string]any{"error": "not found"})
	}
	router.NoRoute(fallback)
	router.NoMethod(fallback)

	return router, nil
}

func securityHeaders() flare.Handler {
	return func(c *flare.Ctx) {
		c.Next()
		c.Response.Header.Set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'")
		c.Response.Header.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Response.Header.Set("X-Content-Type-Options", "nosniff")
		c.Response.Header.Set("X-Frame-Options", "DENY")
	}
}

func assetCacheHeaders() flare.Handler {
	return func(c *flare.Ctx) {
		c.Next()
		if strings.HasPrefix(string(c.Path()), "/assets/") {
			c.Response.Header.Set("Cache-Control", "public, max-age=3600")
		}
	}
}
