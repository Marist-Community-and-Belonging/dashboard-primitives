package main

import (
	"log/slog"
	"net/http"
	"runtime/debug"
	"time"

	"github.com/deglebe/flare"
)

func requestLogger(logger *slog.Logger) flare.Handler {
	return func(c *flare.Ctx) {
		started := time.Now()
		c.Next()

		status := c.Response.StatusCode()
		fields := []any{
			"status", status,
			"duration", time.Since(started).Round(time.Microsecond),
		}
		if err := c.UserValue("error"); err != nil {
			fields = append(fields, "error", err)
		}
		message := string(c.Method()) + " " + string(c.Path())
		switch {
		case status >= http.StatusInternalServerError:
			logger.Error(message, fields...)
		case status >= http.StatusBadRequest:
			logger.Warn(message, fields...)
		default:
			logger.Info(message, fields...)
		}
	}
}

func recoveryLogger(logger *slog.Logger) flare.Handler {
	return flare.RecoverWith(func(c *flare.Ctx, recovered any) {
		logger.Error("panic recovered",
			"error", recovered,
			"method", string(c.Method()),
			"path", string(c.Path()),
			"stack", string(debug.Stack()),
		)
		c.AbortWithStatusJSON(http.StatusInternalServerError, map[string]any{"error": "internal server error"})
	})
}
