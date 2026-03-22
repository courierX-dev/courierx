package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

const RequestIDKey = "requestID"

// RequestID injects a unique request ID into every request.
// It checks for an existing X-Request-ID header (set by a load balancer / upstream)
// and falls back to generating a new UUID. The value is:
//   - stored in c.Locals(RequestIDKey) for downstream handlers
//   - echoed back in the X-Request-ID response header
func RequestID() fiber.Handler {
	return func(c *fiber.Ctx) error {
		id := c.Get("X-Request-ID")
		if id == "" {
			id = uuid.New().String()
		}
		c.Locals(RequestIDKey, id)
		c.Set("X-Request-ID", id)
		return c.Next()
	}
}

// GetRequestID retrieves the request ID from Fiber locals.
func GetRequestID(c *fiber.Ctx) string {
	if id, ok := c.Locals(RequestIDKey).(string); ok {
		return id
	}
	return ""
}
