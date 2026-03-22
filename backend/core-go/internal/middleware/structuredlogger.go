package middleware

import (
	"log/slog"
	"time"

	"github.com/gofiber/fiber/v2"
)

// StructuredLogger replaces Fiber's default text logger with slog JSON output.
// It logs method, path, status, latency, IP, and request ID on every request.
// 4xx/5xx responses are logged at Warn/Error level; 2xx/3xx at Info.
func StructuredLogger() fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()
		err := c.Next()
		latencyMs := time.Since(start).Milliseconds()

		status := c.Response().StatusCode()
		requestID := GetRequestID(c)

		attrs := []any{
			"request_id", requestID,
			"method", c.Method(),
			"path", c.Path(),
			"status", status,
			"latency_ms", latencyMs,
			"ip", c.IP(),
			"user_agent", c.Get("User-Agent"),
		}

		switch {
		case status >= 500:
			if err != nil {
				attrs = append(attrs, "error", err.Error())
			}
			slog.Error("request", attrs...)
		case status >= 400:
			slog.Warn("request", attrs...)
		default:
			slog.Info("request", attrs...)
		}

		return err
	}
}
