package main

import (
	"bytes"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestRequestLoggerWritesStructuredRequestContext(t *testing.T) {
	var output bytes.Buffer
	router := gin.New()
	router.Use(requestLogger(slog.New(slog.NewTextHandler(&output, nil))))
	router.GET("/test", func(c *gin.Context) { c.Status(http.StatusNoContent) })

	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/test", nil))
	for _, field := range []string{"GET /test", "status=204", "duration="} {
		if !strings.Contains(output.String(), field) {
			t.Fatalf("log output %q does not contain %q", output.String(), field)
		}
	}
}

func TestColorWriterUsesLogLevel(t *testing.T) {
	var output bytes.Buffer
	line := []byte("level=ERROR msg=failed\n")
	written, err := (colorWriter{&output}).Write(line)
	if err != nil || written != len(line) {
		t.Fatalf("Write() = %d, %v", written, err)
	}
	if got := output.String(); got != "\x1b[31m"+string(line)+"\x1b[0m" {
		t.Fatalf("colored log = %q", got)
	}
}
