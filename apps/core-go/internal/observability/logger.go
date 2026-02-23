// Package observability — structured logger setup using log/slog (Go 1.21+).
//
// Call observability.InitLogger(cfg) once in main.go.
// All packages then use the global slog.Default() logger, e.g.:
//
//	slog.Info("email sent", "provider", p, "ms", ms)
//	slog.Error("send failed", "error", err, "to", req.To)
package observability

import (
	"log/slog"
	"os"
	"strings"
)

// InitLogger configures the global slog logger.
// In production (GO_ENV=production) it emits structured JSON.
// In development it emits human-readable text with colour-like alignment.
func InitLogger(env, level string) {
	var lvl slog.Level
	switch strings.ToLower(level) {
	case "debug":
		lvl = slog.LevelDebug
	case "warn", "warning":
		lvl = slog.LevelWarn
	case "error":
		lvl = slog.LevelError
	default:
		lvl = slog.LevelInfo
	}

	opts := &slog.HandlerOptions{
		Level:     lvl,
		AddSource: env == "production",
	}

	var handler slog.Handler
	if env == "production" {
		handler = slog.NewJSONHandler(os.Stdout, opts)
	} else {
		handler = slog.NewTextHandler(os.Stdout, opts)
	}

	slog.SetDefault(slog.New(handler))
}
