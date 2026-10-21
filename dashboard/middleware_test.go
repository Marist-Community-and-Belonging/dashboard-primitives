package main

import (
	"bytes"
	"log/slog"
	"net/http"
	"strings"
	"testing"

	"github.com/deglebe/flare"
)

func TestRequestLoggerWritesStructuredRequestContext(t *testing.T) {
	var output bytes.Buffer
	router := flare.New()
	router.Use(requestLogger(slog.New(slog.NewTextHandler(&output, nil))))
	router.GET("/test", func(c *flare.Ctx) { c.SetStatusCode(http.StatusNoContent) })

	testRequest(t, router.Handler(), http.MethodGet, "/test")
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

func TestRecoveryLoggerReturnsJSONAndLogsFailure(t *testing.T) {
	var output bytes.Buffer
	logger := slog.New(slog.NewTextHandler(&output, nil))
	router := flare.New()
	router.Use(requestLogger(logger), recoveryLogger(logger))
	router.GET("/panic", func(c *flare.Ctx) { panic("test failure") })
	handler := router.Handler()

	for range 2 {
		response := testRequest(t, handler, http.MethodGet, "/panic")
		if response.StatusCode() != http.StatusInternalServerError || string(response.Body()) != `{"error":"internal server error"}` {
			t.Fatalf("panic response = %d %q", response.StatusCode(), string(response.Body()))
		}
	}
	for _, field := range []string{"panic recovered", "test failure", "GET /panic", "status=500", "stack="} {
		if !strings.Contains(output.String(), field) {
			t.Fatalf("log output omits %q: %s", field, output.String())
		}
	}
}
