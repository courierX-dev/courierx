package main

import (
	"context"
	"encoding/json"
	"log/slog"
	"os"
	"os/signal"
	"time"

	"github.com/courierx/core-go/internal/api"
	"github.com/courierx/core-go/internal/config"
	"github.com/courierx/core-go/internal/db"
	"github.com/courierx/core-go/internal/observability"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	cfg := config.Load()

	// ── Structured logging & Observability ───────────────────────────────────
	observability.InitLogger(cfg.Environment, cfg.LogLevel)
	observability.InitSentry()
	defer observability.FlushSentry()

	if err := cfg.Validate(); err != nil {
		slog.Error("configuration error", "error", err)
		os.Exit(1)
	}

	// ── Database ─────────────────────────────────────────────────────────────
	var dbPool *pgxpool.Pool
	if cfg.DatabaseURL != "" && cfg.DatabaseURL != "skip" {
		var err error
		dbPool, err = db.NewPool(context.Background(), cfg.DatabaseURL)
		if err != nil {
			slog.Warn("database unavailable — message logging disabled", "error", err)
		} else {
			defer dbPool.Close()
			slog.Info("database connected")
		}
	} else {
		slog.Info("running without database (benchmark / dev mode)")
	}

	// ── Prometheus metrics ────────────────────────────────────────────────────
	var prom *observability.Prom
	if cfg.EnableMetrics {
		prom = observability.NewProm()
		slog.Info("prometheus metrics enabled", "endpoint", "GET /metrics")
	}

	// ── Fiber app ────────────────────────────────────────────────────────────
	app := fiber.New(fiber.Config{
		ServerHeader:          "CourierX-Core",
		AppName:               "CourierX Core v1.0.0",
		DisableStartupMessage: true, // we log our own startup message below
		BodyLimit:             10 * 1024 * 1024,
		ReadTimeout:           30 * time.Second,
		WriteTimeout:          30 * time.Second,
		IdleTimeout:           120 * time.Second,
		JSONEncoder:           json.Marshal,
		JSONDecoder:           json.Unmarshal,
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			slog.Error("unhandled error", "path", c.Path(), "error", err)
			return c.Status(code).JSON(fiber.Map{"error": err.Error()})
		},
	})

	// Panic recovery + CORS (request ID + structured logger are added in SetupRoutes)
	app.Use(recover.New(recover.Config{
		EnableStackTrace: cfg.IsDevelopment(),
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept, X-Internal-Secret, X-Request-ID, X-Idempotency-Key",
	}))

	// ── Routes ───────────────────────────────────────────────────────────────
	api.SetupRoutes(app, dbPool, cfg, prom)

	// ── Graceful shutdown ─────────────────────────────────────────────────────
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt)
	go func() {
		<-quit
		slog.Info("shutting down gracefully...")
		_ = app.ShutdownWithTimeout(10 * time.Second)
	}()

	// ── Start ─────────────────────────────────────────────────────────────────
	slog.Info("CourierX Core starting",
		"port", cfg.Port,
		"env", cfg.Environment,
		"providers_configured", cfg.HasAnyProvider(),
		"metrics", cfg.EnableMetrics,
		"db", dbPool != nil,
	)

	if err := app.Listen("[::]:" + cfg.Port); err != nil {
		slog.Error("server error", "error", err)
		os.Exit(1)
	}
}
