package main

import (
	"log/slog"
	"net/http"
	"runtime/debug"
	"time"

	"github.com/gin-gonic/gin"
)

func requestLogger(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		started := time.Now()
		c.Next()

		status := c.Writer.Status()
		fields := []any{
			"status", status,
			"duration", time.Since(started).Round(time.Microsecond),
		}
		if len(c.Errors) > 0 {
			fields = append(fields, "error", c.Errors.Last().Err)
		}
		message := c.Request.Method + " " + c.Request.URL.Path
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

func recoveryLogger(logger *slog.Logger) gin.HandlerFunc {
	return gin.CustomRecovery(func(c *gin.Context, recovered any) {
		logger.Error("panic recovered",
			"error", recovered,
			"method", c.Request.Method,
			"path", c.Request.URL.Path,
			"stack", string(debug.Stack()),
		)
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
	})
}
