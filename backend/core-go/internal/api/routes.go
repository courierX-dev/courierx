package api

import (
	"crypto/subtle"

	"github.com/courierx/core-go/internal/config"
	"github.com/courierx/core-go/internal/middleware"
	"github.com/courierx/core-go/internal/observability"
	"github.com/courierx/core-go/internal/ratelimit"
	"github.com/courierx/core-go/internal/types"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/adaptor"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

// SetupRoutes wires all routes, middleware, and handlers onto the Fiber app.
func SetupRoutes(app *fiber.App, dbPool *pgxpool.Pool, cfg *config.Config, prom *observability.Prom) {
	routes := buildRoutesFromConfig(cfg)

	idem    := middleware.NewIdempotencyStore(cfg.IdempotencyTTLSeconds, cfg.RedisURL)
	limiter := ratelimit.New(cfg.RateLimitProvider)
	handler := NewHandler(dbPool, routes, prom, idem, cfg.MaxWorkers)

	// ── Global middleware (applied to all routes) ─────────────────────────────
	app.Use(middleware.RequestID())
	app.Use(middleware.StructuredLogger())

	// ── Health probes (unauthenticated, no rate limit — used by load balancers) ─
	app.Get("/health",       handler.HealthCheck)
	app.Get("/health/live",  handler.HealthLive)
	app.Get("/health/ready", handler.HealthReady)

	// ── Prometheus metrics scrape endpoint ────────────────────────────────────
	// SECURITY: Protected by bearer token when METRICS_TOKEN is set.
	// Without a token, access is still restricted to loopback/private-range IPs
	// (enforced by the metricsAuth middleware below).
	// The CORS wildcard on the main app does NOT apply here — this group has
	// its own middleware chain.
	if cfg.EnableMetrics && prom != nil {
		promHandler := promhttp.HandlerFor(
			prom.Registry(),
			promhttp.HandlerOpts{EnableOpenMetrics: true},
		)
		app.Get("/metrics", metricsAuth(cfg.MetricsToken), adaptor.HTTPHandler(promHandler))
	}

	// ── Internal API (Rails → Go) ─────────────────────────────────────────────
	internal := app.Group("/internal", middleware.InternalAuth(cfg.InternalSecret))
	internal.Post("/verify-provider", handler.VerifyProvider)

	// ── Authenticated v1 API ──────────────────────────────────────────────────
	v1 := app.Group("/v1",
		middleware.InternalAuth(cfg.InternalSecret),
		providerRateLimitMiddleware(limiter),
	)
	v1.Post("/send",              handler.Send)
	v1.Post("/send/batch",        handler.BulkSend)
	v1.Get("/stats/providers",    handler.ProviderStats)
}

// metricsAuth returns middleware that protects the /metrics endpoint.
// If a token is configured: require "Authorization: Bearer <token>".
// If no token: allow only requests from loopback (127.x / ::1) addresses.
func metricsAuth(token string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if token != "" {
			provided := ""
			auth := c.Get("Authorization")
			if len(auth) > 7 && auth[:7] == "Bearer " {
				provided = auth[7:]
			}
			if subtle.ConstantTimeCompare([]byte(provided), []byte(token)) != 1 {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
					"error": "metrics endpoint requires authentication",
				})
			}
			return c.Next()
		}

		// No token configured — restrict to local addresses only
		ip := c.IP()
		if ip == "127.0.0.1" || ip == "::1" || ip == "localhost" {
			return c.Next()
		}
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "metrics endpoint is not publicly accessible; set METRICS_TOKEN to enable external access",
		})
	}
}

// providerRateLimitMiddleware applies the token-bucket limiter per provider.
// The provider name is extracted from the X-Provider-Name header (set by the
// Rails control plane when routing to a specific provider). Falls back to "global".
func providerRateLimitMiddleware(limiter *ratelimit.Limiter) fiber.Handler {
	return func(c *fiber.Ctx) error {
		provider := c.Get("X-Provider-Name")
		if provider == "" {
			provider = "global"
		}
		if !limiter.Allow(provider) {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":    "provider rate limit exceeded",
				"code":     "provider_rate_limit",
				"provider": provider,
			})
		}
		return c.Next()
	}
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
