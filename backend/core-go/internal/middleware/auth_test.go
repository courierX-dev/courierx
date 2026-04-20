package middleware

import (
	"io"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func newTestApp(secret string) *fiber.App {
	app := fiber.New()
	app.Use(InternalAuth(secret))
	app.Get("/test", func(c *fiber.Ctx) error {
		return c.SendString("ok")
	})
	return app
}

// ── Fail-closed behaviour ─────────────────────────────────────────────────────

func TestInternalAuth_FailsClosedWhenSecretEmpty(t *testing.T) {
	app := newTestApp("")
	req := httptest.NewRequest("GET", "/test", nil)

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != fiber.StatusServiceUnavailable {
		t.Errorf("expected 503, got %d", resp.StatusCode)
	}
}

func TestInternalAuth_FailsClosedEvenWithValidHeader_WhenSecretEmpty(t *testing.T) {
	app := newTestApp("")
	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("X-Internal-Secret", "some-secret")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != fiber.StatusServiceUnavailable {
		t.Errorf("expected 503 when server secret is empty, got %d", resp.StatusCode)
	}
}

// ── Missing header ─────────────────────────────────────────────────────────────

func TestInternalAuth_Returns401WhenHeaderMissing(t *testing.T) {
	app := newTestApp("correct-secret")
	req := httptest.NewRequest("GET", "/test", nil)

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != fiber.StatusUnauthorized {
		t.Errorf("expected 401 for missing header, got %d", resp.StatusCode)
	}
}

// ── Wrong secret ──────────────────────────────────────────────────────────────

func TestInternalAuth_Returns401WhenSecretWrong(t *testing.T) {
	app := newTestApp("correct-secret")
	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("X-Internal-Secret", "wrong-secret")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != fiber.StatusUnauthorized {
		t.Errorf("expected 401 for wrong secret, got %d", resp.StatusCode)
	}
}

// ── Correct secret ────────────────────────────────────────────────────────────

func TestInternalAuth_AllowsCorrectSecret(t *testing.T) {
	app := newTestApp("my-secret")
	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("X-Internal-Secret", "my-secret")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}

	body, _ := io.ReadAll(resp.Body)
	if string(body) != "ok" {
		t.Errorf("expected body 'ok', got %q", string(body))
	}
}

// ── Timing-safe comparison ────────────────────────────────────────────────────

func TestInternalAuth_RejectsEmptyHeaderValue(t *testing.T) {
	app := newTestApp("my-secret")
	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("X-Internal-Secret", "")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// An empty header value is the same as a missing header
	if resp.StatusCode != fiber.StatusUnauthorized {
		t.Errorf("expected 401 for empty header, got %d", resp.StatusCode)
	}
}

func TestInternalAuth_RejectsPrefixMatch(t *testing.T) {
	app := newTestApp("full-secret")
	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("X-Internal-Secret", "full-secre") // one char short

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != fiber.StatusUnauthorized {
		t.Errorf("expected 401 for partial match, got %d", resp.StatusCode)
	}
}
