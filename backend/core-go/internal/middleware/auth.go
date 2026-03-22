// Package middleware provides Fiber middleware for the Core service.
package middleware

import (
	"crypto/subtle"

	"github.com/gofiber/fiber/v2"
)

// InternalAuth returns a Fiber handler that validates the X-Internal-Secret header.
// The control plane must set this header on every request.
// When secret is empty (development / no secret configured) the middleware is bypassed.
func InternalAuth(secret string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if secret == "" {
			// No secret configured — allow all (non-production mode)
			return c.Next()
		}

		provided := c.Get("X-Internal-Secret")
		if provided == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "missing X-Internal-Secret header",
			})
		}

		// Constant-time comparison to prevent timing attacks
		if subtle.ConstantTimeCompare([]byte(provided), []byte(secret)) != 1 {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "invalid internal secret",
			})
		}

		return c.Next()
	}
}
