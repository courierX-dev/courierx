package api

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"github.com/courierx/core-go/internal/db"
	"github.com/courierx/core-go/internal/middleware"
	"github.com/courierx/core-go/internal/observability"
	"github.com/courierx/core-go/internal/providers"
	"github.com/courierx/core-go/internal/template"
	"github.com/courierx/core-go/internal/types"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Handler holds all dependencies for the API handlers.
type Handler struct {
	dbPool         *pgxpool.Pool
	router         *providers.Router
	templateEngine *template.Engine
	prom           *observability.Prom
	idempotency    *middleware.IdempotencyStore
	maxWorkers     int
	startTime      time.Time
}

// NewHandler creates a Handler.
func NewHandler(
	dbPool *pgxpool.Pool,
	routes []types.Route,
	prom *observability.Prom,
	idem *middleware.IdempotencyStore,
	maxWorkers int,
) *Handler {
	return &Handler{
		dbPool:         dbPool,
		router:         providers.NewRouter(routes, prom),
		templateEngine: template.NewEngine(),
		prom:           prom,
		idempotency:    idem,
		maxWorkers:     maxWorkers,
		startTime:      time.Now(),
	}
}

// ProviderStats returns aggregate delivery stats per provider for a project.
// Query params: project_id (required), since (optional, RFC3339 datetime, default 7 days ago).
func (h *Handler) ProviderStats(c *fiber.Ctx) error {
	projectID := c.Query("project_id")
	if projectID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "project_id query parameter is required",
		})
	}

	since := time.Now().UTC().AddDate(0, 0, -7)
	if raw := c.Query("since"); raw != "" {
		if t, err := time.Parse(time.RFC3339, raw); err == nil {
			since = t
		}
	}

	stats, err := db.GetProviderStats(c.Context(), h.dbPool, projectID, since)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to fetch provider stats: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{"stats": stats})
}

// HealthLive is the liveness probe — returns 200 if the process is alive.
// Kubernetes uses this to decide whether to restart the pod.
func (h *Handler) HealthLive(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"status":  "ok",
		"service": "courierx-core",
	})
}

// HealthReady is the readiness probe — returns 200 only when all required
// dependencies (database, etc.) are reachable.
// Kubernetes uses this to decide whether to send traffic to the pod.
func (h *Handler) HealthReady(c *fiber.Ctx) error {
	checks := fiber.Map{}
	ready := true

	// Database check
	if h.dbPool != nil {
		if err := h.dbPool.Ping(c.Context()); err != nil {
			checks["database"] = fiber.Map{"status": "unhealthy", "error": err.Error()}
			ready = false
		} else {
			checks["database"] = fiber.Map{"status": "healthy"}
		}
	} else {
		checks["database"] = fiber.Map{"status": "not_configured"}
	}

	if !ready {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"status": "not_ready",
			"checks": checks,
		})
	}
	return c.JSON(fiber.Map{
		"status":         "ready",
		"checks":         checks,
		"uptime_seconds": int64(time.Since(h.startTime).Seconds()),
		"template_cache": h.templateEngine.CacheSize(),
	})
}

// HealthCheck is the legacy combined health endpoint — kept for backward compatibility.
func (h *Handler) HealthCheck(c *fiber.Ctx) error {
	return h.HealthReady(c)
}

// Send handles a single email send with idempotency and template rendering.
func (h *Handler) Send(c *fiber.Ctx) error {
	requestID := middleware.GetRequestID(c)

	var req types.SendRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(types.SendResponse{
			Success: false, Error: "invalid request body: " + err.Error(),
		})
	}

	if req.From == "" || req.To == "" || req.Subject == "" {
		return c.Status(fiber.StatusBadRequest).JSON(types.SendResponse{
			Success: false, Error: "from, to, and subject are required",
		})
	}
	if req.HTML == "" && req.Text == "" {
		return c.Status(fiber.StatusBadRequest).JSON(types.SendResponse{
			Success: false, Error: "html or text body is required",
		})
	}

	// Idempotency check
	if req.IdempotencyKey != "" {
		if cached, ok := h.idempotency.Get(req.IdempotencyKey); ok {
			if h.prom != nil {
				h.prom.RecordIdempotentHit()
			}
			slog.Debug("idempotency cache hit",
				"request_id", requestID,
				"key", req.IdempotencyKey)
			return c.JSON(cached)
		}
	}

	// Template rendering
	if err := h.renderRequest(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(types.SendResponse{
			Success: false, Error: err.Error(),
		})
	}

	// BYOK: if the request carries per-tenant provider routes, build a
	// request-scoped router from them; otherwise fall back to the global router.
	router := h.routerForRequest(req.Providers)

	resp, err := router.Send(c.Context(), &req)
	if err != nil {
		slog.Error("send failed",
			"request_id", requestID,
			"to", req.To,
			"error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(types.SendResponse{
			Success: false, Error: err.Error(),
		})
	}

	// Update template cache gauge
	if h.prom != nil {
		h.prom.TemplateCacheSize.Set(float64(h.templateEngine.CacheSize()))
	}

	// Idempotency store
	if req.IdempotencyKey != "" {
		h.idempotency.Set(req.IdempotencyKey, *resp)
	}

	// Async message logging
	go h.logMessage(req, *resp)

	slog.Info("email sent",
		"request_id", requestID,
		"to", req.To,
		"provider", resp.Provider,
		"duration_ms", resp.DurationMs)

	return c.JSON(resp)
}

// BulkSend processes up to 1,000 recipients in parallel using a bounded worker pool.
func (h *Handler) BulkSend(c *fiber.Ctx) error {
	requestID := middleware.GetRequestID(c)

	var req types.BulkSendRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false, "error": "invalid request body: " + err.Error(),
		})
	}

	if req.From == "" || req.Subject == "" || len(req.Recipients) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false, "error": "from, subject, and recipients are required",
		})
	}
	if req.HTML == "" && req.Text == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false, "error": "html or text body is required",
		})
	}
	if len(req.Recipients) > 1000 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false, "error": "maximum 1000 recipients per batch",
		})
	}

	n := len(req.Recipients)
	results := make([]types.SendResponse, n)

	workers := h.maxWorkers
	if workers <= 0 {
		workers = 10
	}
	if workers > n {
		workers = n
	}

	type job struct {
		index     int
		recipient types.Recipient
	}
	jobCh := make(chan job, n)
	for i, r := range req.Recipients {
		jobCh <- job{index: i, recipient: r}
	}
	close(jobCh)

	var wg sync.WaitGroup
	ctx := c.Context()
	for w := 0; w < workers; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := range jobCh {
				results[j.index] = h.sendOne(ctx, req, j.recipient)
			}
		}()
	}
	wg.Wait()

	successCount, failureCount := 0, 0
	for _, r := range results {
		if r.Success {
			successCount++
		} else {
			failureCount++
		}
	}

	if h.prom != nil {
		h.prom.RecordBatch(n, successCount, failureCount)
	}

	slog.Info("batch send complete",
		"request_id", requestID,
		"total", n,
		"success", successCount,
		"failed", failureCount)

	return c.JSON(types.BulkSendResponse{
		Success:      successCount > 0,
		Total:        n,
		SuccessCount: successCount,
		FailureCount: failureCount,
		Results:      results,
	})
}

// — internal helpers —

func (h *Handler) sendOne(ctx context.Context, batch types.BulkSendRequest, recipient types.Recipient) types.SendResponse {
	sendReq := types.SendRequest{
		From:      batch.From,
		To:        recipient.Email,
		Subject:   batch.Subject,
		HTML:      batch.HTML,
		Text:      batch.Text,
		ReplyTo:   batch.ReplyTo,
		Variables: recipient.Variables,
		Tags:      batch.Tags,
		ProjectID: batch.ProjectID,
		TenantID:  batch.TenantID,
		Providers: batch.Providers,
	}

	if err := h.renderRequest(&sendReq); err != nil {
		return types.SendResponse{Success: false, Error: err.Error()}
	}

	// BYOK: build a request-scoped router if providers were supplied.
	router := h.routerForRequest(sendReq.Providers)

	resp, err := router.Send(ctx, &sendReq)
	if err != nil {
		return types.SendResponse{Success: false, Error: err.Error()}
	}

	go h.logMessage(sendReq, *resp)
	return *resp
}

// routerForRequest returns a request-scoped Router when per-tenant provider
// routes are present in the request (BYOK mode), or the shared global router
// when no per-request routes are specified.
func (h *Handler) routerForRequest(requestRoutes []types.Route) *providers.Router {
	if len(requestRoutes) > 0 {
		return providers.NewRouter(requestRoutes, h.prom)
	}
	return h.router
}

func (h *Handler) renderRequest(req *types.SendRequest) error {
	if len(req.Variables) == 0 {
		return nil
	}
	if req.HTML != "" {
		rendered, err := h.templateEngine.RenderHTML(req.HTML, req.Variables)
		if err != nil {
			return err
		}
		req.HTML = rendered
	}
	if req.Text != "" {
		rendered, err := h.templateEngine.Render(req.Text, req.Variables)
		if err != nil {
			return err
		}
		req.Text = rendered
	}
	rendered, err := h.templateEngine.RenderSubject(req.Subject, req.Variables)
	if err != nil {
		return err
	}
	req.Subject = rendered
	return nil
}

func (h *Handler) logMessage(req types.SendRequest, resp types.SendResponse) {
	if h.dbPool == nil {
		return
	}
	status := "sent"
	if !resp.Success {
		status = "failed"
	}
	msg := &types.Message{
		ID:             uuid.New().String(),
		TenantID:       req.TenantID,
		ProjectID:      req.ProjectID,
		ToEmail:        req.To,
		FromEmail:      req.From,
		Subject:        req.Subject,
		BodyHTML:       req.HTML,
		BodyText:       req.Text,
		ProviderUsed:   resp.Provider,
		Status:         status,
		Tags:           req.Tags,
		Metadata:       req.Metadata,
		IdempotencyKey: req.IdempotencyKey,
		DurationMs:     resp.DurationMs,
		CreatedAt:      time.Now().UTC(),
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := db.LogMessage(ctx, h.dbPool, msg); err != nil {
		slog.Error("failed to log message", "message_id", msg.ID, "error", err)
	}
}
