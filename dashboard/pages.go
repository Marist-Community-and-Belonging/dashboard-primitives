package main

import (
	"fmt"
	"io/fs"
	"net/http"

	"github.com/gin-gonic/gin"
)

// pageFiles is the only backend registration needed for a new static page.
var pageFiles = map[string]string{
	"/":                        "web/index.html",
	"/affordability-resources": "web/affordability-resources.html",
	"/diversity-access":        "web/diversity-access.html",
	"/marist-profile":          "web/marist-profile.html",
	"/success-equity":          "web/success-equity.html",
}

func loadPages(content fs.FS) (map[string][]byte, error) {
	pages := make(map[string][]byte, len(pageFiles))
	for route, path := range pageFiles {
		payload, err := fs.ReadFile(content, path)
		if err != nil {
			return nil, fmt.Errorf("read page %s: %w", path, err)
		}
		pages[route] = payload
	}
	return pages, nil
}

func registerPages(router *gin.Engine, pages map[string][]byte) {
	for route, payload := range pages {
		page := payload
		handler := func(c *gin.Context) {
			c.Data(http.StatusOK, "text/html; charset=utf-8", page)
		}
		router.GET(route, handler)
		router.HEAD(route, handler)
	}
}
