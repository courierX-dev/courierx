package main

import (
	"context"
	"encoding/json"
	"log"
	"os"
	"os/signal"
	"time"

	"github.com/courierx/core-go/internal/api"
	"github.com/courierx/core-go/internal/config"
	"github.com/courierx/core-go/internal/db"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Initialize database connection (optional for benchmark mode)
	var dbPool *pgxpool.Pool
	if cfg.DatabaseURL != "" && cfg.DatabaseURL != "skip" {
		var err error
		dbPool, err = db.NewPool(context.Background(), cfg.DatabaseURL)
		if err != nil {
			log.Printf("Warning: Failed to connect to database: %v (continuing without DB)", err)
			dbPool = nil
		} else {
			defer dbPool.Close()
		}
	} else {
		log.Println("Running in benchmark mode (no database)")
	}

	// Create Fiber app with optimized config
	app := fiber.New(fiber.Config{
		Prefork:               false,
		ServerHeader:          "CourierX-Core",
		AppName:               "CourierX Core v1.0.0",
		DisableStartupMessage: false,
		BodyLimit:             10 * 1024 * 1024, // 10MB
		ReadTimeout:           30 * time.Second,
		WriteTimeout:          30 * time.Second,
		IdleTimeout:           120 * time.Second,
		JSONEncoder:           json.Marshal,
		JSONDecoder:           json.Unmarshal,
	})

	// Middleware
	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} - ${latency} ${method} ${path}\n",
	}))
	app.Use(cors.New())

	// Initialize API routes
	api.SetupRoutes(app, dbPool, cfg)

	// Graceful shutdown
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt)
	go func() {
		<-c
		log.Println("Gracefully shutting down...")
		_ = app.Shutdown()
	}()

	// Start server
	port := cfg.Port
	log.Printf("🚀 CourierX Core starting on port %s", port)
	if err := app.Listen(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
