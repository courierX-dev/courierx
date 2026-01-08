package api

import (
	"github.com/courierx/core-go/internal/config"
	"github.com/courierx/core-go/internal/types"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
)

// SetupRoutes configures all API routes
func SetupRoutes(app *fiber.App, db *pgxpool.Pool, cfg *config.Config) {
	// Load provider routes from config (for benchmark, use mock provider)
	routes := getDefaultRoutes()

	// Initialize handler
	handler := NewHandler(db, routes)

	// Health check
	app.Get("/health", handler.HealthCheck)

	// API v1 routes
	v1 := app.Group("/v1")
	{
		v1.Post("/send", handler.Send)
		v1.Post("/send/batch", handler.BulkSend)
	}
}

// getDefaultRoutes returns default mock provider routes for benchmarking
func getDefaultRoutes() []types.Route {
	return []types.Route{
		{
			Priority: 1,
			Role:     "primary",
			Provider: types.ProviderConfig{
				Type: types.ProviderMock,
				Config: map[string]interface{}{
					"latency":     5.0,
					"failureRate": 0.3, // 30% failure for failover testing
				},
			},
		},
		{
			Priority: 2,
			Role:     "fallback",
			Provider: types.ProviderConfig{
				Type: types.ProviderMock,
				Config: map[string]interface{}{
					"latency":     5.0,
					"failureRate": 0.0, // Always succeeds
				},
			},
		},
	}
}
