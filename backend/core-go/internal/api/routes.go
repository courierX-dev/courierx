package api

import (
	"github.com/courierx/core-go/internal/config"
	"github.com/courierx/core-go/internal/middleware"
	"github.com/courierx/core-go/internal/observability"
	"github.com/courierx/core-go/internal/types"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/adaptor"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// SetupRoutes wires all routes, middleware, and handlers onto the Fiber app.
func SetupRoutes(app *fiber.App, dbPool *pgxpool.Pool, cfg *config.Config, prom *observability.Prom) {
	routes := buildRoutesFromConfig(cfg)

	idem := middleware.NewIdempotencyStore(cfg.IdempotencyTTLSeconds)
	handler := NewHandler(dbPool, routes, prom, idem, cfg.MaxWorkers)

	// ── Global middleware (applied to all routes) ─────────────────────────────
	app.Use(middleware.RequestID())
	app.Use(middleware.StructuredLogger())

	// ── Health probes (unauthenticated) ───────────────────────────────────────
	// /health/live  — liveness  (is the process running?)
	// /health/ready — readiness (are dependencies healthy?)
	// /health       — legacy combined (backward compat)
	app.Get("/health", handler.HealthCheck)
	app.Get("/health/live", handler.HealthLive)
	app.Get("/health/ready", handler.HealthReady)

	// ── Prometheus metrics scrape endpoint ────────────────────────────────────
	if cfg.EnableMetrics && prom != nil {
		promHandler := promhttp.HandlerFor(
			prom.Registry(),
			promhttp.HandlerOpts{EnableOpenMetrics: true},
		)
		app.Get("/metrics", adaptor.HTTPHandler(promHandler))
	}

	// ── Internal API (Rails → Go) ─────────────────────────────────────────────
	internal := app.Group("/internal", middleware.InternalAuth(cfg.InternalSecret))
	internal.Post("/verify-provider", handler.VerifyProvider)

	// ── Authenticated v1 API ──────────────────────────────────────────────────
	v1 := app.Group("/v1", middleware.InternalAuth(cfg.InternalSecret))
	v1.Post("/send", handler.Send)
	v1.Post("/send/batch", handler.BulkSend)
}

// buildRoutesFromConfig constructs the provider failover chain from environment config.
// Providers are assigned priorities in the order they appear below.
// If no real providers are configured, a mock pair is used (development mode).
func buildRoutesFromConfig(cfg *config.Config) []types.Route {
	var routes []types.Route
	priority := 1

	if cfg.SendGridAPIKey != "" {
		routes = append(routes, types.Route{
			Priority: priority,
			Role:     "primary",
			Provider: types.ProviderConfig{
				Type:   types.ProviderSendGrid,
				Config: map[string]interface{}{"apiKey": cfg.SendGridAPIKey},
			},
		})
		priority++
	}

	if cfg.MailgunAPIKey != "" && cfg.MailgunDomain != "" {
		routes = append(routes, types.Route{
			Priority: priority,
			Role:     primaryOrFallback(priority),
			Provider: types.ProviderConfig{
				Type: types.ProviderMailgun,
				Config: map[string]interface{}{
					"apiKey": cfg.MailgunAPIKey,
					"domain": cfg.MailgunDomain,
					"region": cfg.MailgunRegion,
				},
			},
		})
		priority++
	}

	if cfg.AWSAccessKeyID != "" && cfg.AWSSecretAccessKey != "" {
		routes = append(routes, types.Route{
			Priority: priority,
			Role:     primaryOrFallback(priority),
			Provider: types.ProviderConfig{
				Type: types.ProviderSES,
				Config: map[string]interface{}{
					"accessKeyId":     cfg.AWSAccessKeyID,
					"secretAccessKey": cfg.AWSSecretAccessKey,
					"region":          cfg.AWSRegion,
				},
			},
		})
		priority++
	}

	if cfg.PostmarkAPIKey != "" {
		routes = append(routes, types.Route{
			Priority: priority,
			Role:     primaryOrFallback(priority),
			Provider: types.ProviderConfig{
				Type:   types.ProviderPostmark,
				Config: map[string]interface{}{"serverToken": cfg.PostmarkAPIKey},
			},
		})
		priority++
	}

	if cfg.ResendAPIKey != "" {
		routes = append(routes, types.Route{
			Priority: priority,
			Role:     primaryOrFallback(priority),
			Provider: types.ProviderConfig{
				Type:   types.ProviderResend,
				Config: map[string]interface{}{"apiKey": cfg.ResendAPIKey},
			},
		})
		priority++
	}

	if cfg.SMTPHost != "" {
		routes = append(routes, types.Route{
			Priority: priority,
			Role:     primaryOrFallback(priority),
			Provider: types.ProviderConfig{
				Type: types.ProviderSMTP,
				Config: map[string]interface{}{
					"host":   cfg.SMTPHost,
					"port":   cfg.SMTPPort,
					"user":   cfg.SMTPUser,
					"pass":   cfg.SMTPPass,
					"useTLS": cfg.SMTPUseTLS,
				},
			},
		})
	}

	if len(routes) == 0 {
		return defaultMockRoutes()
	}
	return routes
}

func defaultMockRoutes() []types.Route {
	return []types.Route{
		{
			Priority: 1,
			Role:     "primary",
			Provider: types.ProviderConfig{
				Type: types.ProviderMock,
				Config: map[string]interface{}{
					"latency":     5.0,
					"failureRate": 0.3,
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
					"failureRate": 0.0,
				},
			},
		},
	}
}

func primaryOrFallback(priority int) string {
	if priority == 1 {
		return "primary"
	}
	return "fallback"
}
