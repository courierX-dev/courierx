package tracking

import (
	"context"
	"log/slog"
	"net/url"
	"time"

	"github.com/courierx/core-go/internal/db"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
)

// transparentGIF is a 1x1 transparent GIF89a — the standard tracking pixel
// payload, embedded so we don't depend on a static asset on disk.
var transparentGIF = []byte{
	0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00,
	0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0x21, 0xf9, 0x04, 0x01, 0x00,
	0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
	0x00, 0x02, 0x01, 0x44, 0x00, 0x3b,
}

// Handler exposes the public open/click endpoints. These are unauthenticated
// — the security boundary is the HMAC-signed token embedded in the URL.
type Handler struct {
	signer *Signer
	pool   *pgxpool.Pool
}

// NewHandler wires the public tracking handlers to a signer + DB pool.
func NewHandler(signer *Signer, pool *pgxpool.Pool) *Handler {
	return &Handler{signer: signer, pool: pool}
}

// Open serves the 1x1 beacon and records an `opened` event. We always return
// the GIF (200) even when verification fails, so a forged or mangled link
// doesn't degrade the recipient's inbox experience.
func (h *Handler) Open(c *fiber.Ctx) error {
	token := c.Params("token")
	kind, emailID, tenantID, err := h.signer.Verify(token)
	if err == nil && kind == EventOpen {
		h.recordEvent(c, emailID, tenantID, "opened", "")
	} else if err != nil {
		slog.Warn("tracking open: invalid token", "error", err)
	}

	c.Set("Cache-Control", "no-store, no-cache, must-revalidate, private")
	c.Set("Pragma", "no-cache")
	c.Set("Content-Type", "image/gif")
	return c.Status(fiber.StatusOK).Send(transparentGIF)
}

// Click verifies the token, records a `clicked` event, then 302s to the
// original URL. On any verification failure we redirect to the raw `u` param
// if it looks safe; otherwise return 400. The recipient's click should never
// silently land them on a broken page just because logging failed.
func (h *Handler) Click(c *fiber.Ctx) error {
	token := c.Params("token")
	target := c.Query("u")
	if target == "" {
		return c.Status(fiber.StatusBadRequest).SendString("missing target")
	}
	parsed, perr := url.Parse(target)
	if perr != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return c.Status(fiber.StatusBadRequest).SendString("invalid target")
	}

	kind, emailID, tenantID, err := h.signer.Verify(token)
	if err == nil && kind == EventClick {
		h.recordEvent(c, emailID, tenantID, "clicked", target)
	} else if err != nil {
		slog.Warn("tracking click: invalid token", "error", err)
	}

	c.Set("Cache-Control", "no-store, no-cache, must-revalidate, private")
	return c.Redirect(target, fiber.StatusFound)
}

// recordEvent writes to email_events out-of-band. Failures are logged and
// swallowed — we never block the recipient on event ingestion.
func (h *Handler) recordEvent(c *fiber.Ctx, emailID, tenantID, eventType, linkURL string) {
	if h.pool == nil || emailID == "" {
		return
	}
	ip := c.IP()
	ua := c.Get("User-Agent")
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := db.InsertEmailEvent(ctx, h.pool, db.EmailEventInput{
			EmailID:   emailID,
			EventType: eventType,
			Provider:  "courierx",
			LinkURL:   linkURL,
			IPAddress: ip,
			UserAgent: ua,
		}); err != nil {
			slog.Warn("tracking: insert email_event failed",
				"email_id", emailID,
				"tenant_id", tenantID,
				"event_type", eventType,
				"error", err)
		}
	}()
}
