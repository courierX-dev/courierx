// Package middleware provides Fiber middleware for the Core service.
package middleware

import (
	"crypto/subtle"
	"log/slog"

	"github.com/gofiber/fiber/v2"
)

// InternalAuth returns a Fiber handler that validates the X-Internal-Secret header.
// The control plane must set this header on every request.
//
// SECURITY: This middleware ALWAYS enforces authentication — there is no bypass
// for empty secrets. An empty secret is treated as a misconfiguration and every
// request is rejected with 503 (Service Unavailable) so operators notice
// immediately rather than silently running an open endpoint.
//
// Previously this middleware allowed all requests when the secret was empty,
// which meant any deployment that forgot to set INTERNAL_SECRET was fully exposed.
func InternalAuth(secret string) fiber.Handler {
	if secret == "" {
		slog.Error("[InternalAuth] INTERNAL_SECRET is not configured. All requests to protected routes will be rejected. Set the INTERNAL_SECRET environment variable.")
	}

	return func(c *fiber.Ctx) error {
		// Fail-closed: if no secret is configured, reject all requests.
		// This surfaces the misconfiguration immediately rather than silently
		// running an unauthenticated service.
		if secret == "" {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
				"error": "service not configured: internal secret missing",
				"code":  "misconfiguration",
			})
		}

		provided := c.Get("X-Internal-Secret")
		if provided == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "missing X-Internal-Secret header",
				"code":  "missing_auth",
			})
		}

		// Constant-time comparison to prevent timing attacks
		if subtle.ConstantTimeCompare([]byte(provided), []byte(secret)) != 1 {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "invalid internal secret",
				"code":  "invalid_auth",
			})
		}

		return c.Next()
	}
}
