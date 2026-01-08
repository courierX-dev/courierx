package api

import (
	"context"
	"log"

	"github.com/courierx/core-go/internal/providers"
	"github.com/courierx/core-go/internal/template"
	"github.com/courierx/core-go/internal/types"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Handler contains dependencies for API handlers
type Handler struct {
	db             *pgxpool.Pool
	router         *providers.Router
	templateEngine *template.Engine
}

// NewHandler creates a new API handler
func NewHandler(db *pgxpool.Pool, routes []types.Route) *Handler {
	return &Handler{
		db:             db,
		router:         providers.NewRouter(routes),
		templateEngine: template.NewEngine(),
	}
}

// HealthCheck returns service health status
func (h *Handler) HealthCheck(c *fiber.Ctx) error {
	// Check database connection if available
	dbStatus := "not configured"
	if h.db != nil {
		ctx := context.Background()
		if err := h.db.Ping(ctx); err != nil {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
				"status":   "unhealthy",
				"database": "disconnected",
				"error":    err.Error(),
			})
		}
		dbStatus = "connected"
	}

	return c.JSON(fiber.Map{
		"status":   "healthy",
		"database": dbStatus,
		"service":  "CourierX Core",
	})
}

// Send handles single email send requests
func (h *Handler) Send(c *fiber.Ctx) error {
	var req types.SendRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(types.SendResponse{
			Success: false,
			Error:   "invalid request body: " + err.Error(),
		})
	}

	// Validate required fields
	if req.From == "" || req.To == "" || req.Subject == "" {
		return c.Status(fiber.StatusBadRequest).JSON(types.SendResponse{
			Success: false,
			Error:   "from, to, and subject are required",
		})
	}

	if req.HTML == "" && req.Text == "" {
		return c.Status(fiber.StatusBadRequest).JSON(types.SendResponse{
			Success: false,
			Error:   "either html or text content is required",
		})
	}

	// Render template variables if provided
	if len(req.Variables) > 0 {
		if req.HTML != "" {
			rendered, err := h.templateEngine.RenderHTML(req.HTML, req.Variables)
			if err != nil {
				return c.Status(fiber.StatusBadRequest).JSON(types.SendResponse{
					Success: false,
					Error:   "template render error: " + err.Error(),
				})
			}
			req.HTML = rendered
		}

		if req.Subject != "" {
			rendered, err := h.templateEngine.RenderSubject(req.Subject, req.Variables)
			if err != nil {
				return c.Status(fiber.StatusBadRequest).JSON(types.SendResponse{
					Success: false,
					Error:   "subject template render error: " + err.Error(),
				})
			}
			req.Subject = rendered
		}
	}

	// Send via router (with failover)
	ctx := c.Context()
	resp, err := h.router.Send(ctx, &req)
	if err != nil {
		log.Printf("Send failed: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(types.SendResponse{
			Success: false,
			Error:   err.Error(),
		})
	}

	return c.JSON(resp)
}

// BulkSend handles bulk send requests
func (h *Handler) BulkSend(c *fiber.Ctx) error {
	var req types.BulkSendRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "invalid request body: " + err.Error(),
		})
	}

	// Validate required fields
	if req.From == "" || req.Subject == "" || len(req.Recipients) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "from, subject, and recipients are required",
		})
	}

	if req.HTML == "" && req.Text == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "either html or text content is required",
		})
	}

	// Limit batch size
	if len(req.Recipients) > 1000 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"error":   "maximum 1000 recipients per batch",
		})
	}

	ctx := c.Context()
	results := make([]types.SendResponse, 0, len(req.Recipients))
	successCount := 0
	failureCount := 0

	// Send to each recipient with personalization
	for _, recipient := range req.Recipients {
		sendReq := types.SendRequest{
			From:      req.From,
			To:        recipient.Email,
			Subject:   req.Subject,
			HTML:      req.HTML,
			Text:      req.Text,
			Variables: recipient.Variables,
		}

		// Render templates with recipient-specific variables
		if len(recipient.Variables) > 0 {
			if req.HTML != "" {
				rendered, err := h.templateEngine.RenderHTML(req.HTML, recipient.Variables)
				if err != nil {
					results = append(results, types.SendResponse{
						Success: false,
						Error:   "template render error: " + err.Error(),
					})
					failureCount++
					continue
				}
				sendReq.HTML = rendered
			}

			if req.Subject != "" {
				rendered, err := h.templateEngine.RenderSubject(req.Subject, recipient.Variables)
				if err != nil {
					results = append(results, types.SendResponse{
						Success: false,
						Error:   "subject template error: " + err.Error(),
					})
					failureCount++
					continue
				}
				sendReq.Subject = rendered
			}
		}

		// Send email
		resp, err := h.router.Send(ctx, &sendReq)
		if err != nil {
			results = append(results, types.SendResponse{
				Success: false,
				Error:   err.Error(),
			})
			failureCount++
		} else {
			results = append(results, *resp)
			successCount++
		}
	}

	return c.JSON(fiber.Map{
		"success":      successCount > 0,
		"total":        len(req.Recipients),
		"successCount": successCount,
		"failureCount": failureCount,
		"results":      results,
	})
}
