package main

import (
	"bytes"
	"context"
	"embed"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

const (
	defaultReadHeaderTimeout = 5 * time.Second
	defaultReadTimeout       = 15 * time.Second
	defaultWriteTimeout      = 30 * time.Second
	defaultIdleTimeout       = 60 * time.Second
	defaultShutdownTimeout   = 10 * time.Second
)

//go:embed web
var webAssets embed.FS

func main() {
	var level slog.Level
	if rawLevel := os.Getenv("DASHBOARD_LOG_LEVEL"); rawLevel != "" {
		if err := level.UnmarshalText([]byte(rawLevel)); err != nil {
			slog.Error("invalid log level", "value", rawLevel, "error", err)
			os.Exit(1)
		}
	}
	var output io.Writer = os.Stderr
	if terminal, err := os.Stderr.Stat(); err == nil && terminal.Mode()&os.ModeCharDevice != 0 {
		output = colorWriter{output}
	}
	logger := slog.New(slog.NewTextHandler(output, &slog.HandlerOptions{
		Level: level,
		ReplaceAttr: func(_ []string, attribute slog.Attr) slog.Attr {
			if attribute.Key == slog.TimeKey {
				return slog.String(slog.TimeKey, attribute.Value.Time().Format("15:04:05"))
			}
			return attribute
		},
	}))

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	if err := run(ctx, logger); err != nil {
		logger.Error("dashboard stopped", "error", err)
		os.Exit(1)
	}
}

type colorWriter struct{ io.Writer }

func (writer colorWriter) Write(line []byte) (int, error) {
	color := "\x1b[36m"
	switch {
	case bytes.Contains(line, []byte("level=DEBUG")):
		color = "\x1b[90m"
	case bytes.Contains(line, []byte("level=WARN")):
		color = "\x1b[33m"
	case bytes.Contains(line, []byte("level=ERROR")):
		color = "\x1b[31m"
	}
	if _, err := io.WriteString(writer.Writer, color); err != nil {
		return 0, err
	}
	written, err := writer.Writer.Write(line)
	if err == nil {
		_, err = io.WriteString(writer.Writer, "\x1b[0m")
	}
	return written, err
}

func run(ctx context.Context, logger *slog.Logger) error {
	address := os.Getenv("DASHBOARD_ADDR")
	if address == "" {
		address = ":8080"
	}

	router, err := newRouterWithLogger(webAssets, logger)
	if err != nil {
		return err
	}
	server := &http.Server{
		Addr:              address,
		Handler:           router,
		ReadHeaderTimeout: defaultReadHeaderTimeout,
		ReadTimeout:       defaultReadTimeout,
		WriteTimeout:      defaultWriteTimeout,
		IdleTimeout:       defaultIdleTimeout,
	}

	serverErrors := make(chan error, 1)
	go func() {
		logger.Info("dashboard listening", "address", address)
		serverErrors <- server.ListenAndServe()
	}()

	select {
	case err := <-serverErrors:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return err
	case <-ctx.Done():
		logger.Info("dashboard shutting down")
		shutdownContext, cancel := context.WithTimeout(context.Background(), defaultShutdownTimeout)
		defer cancel()
		return server.Shutdown(shutdownContext)
	}
}
