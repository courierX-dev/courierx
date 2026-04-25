package api

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/smtp"
	"strings"
	"time"

	"github.com/courierx/core-go/internal/providers"
	"github.com/courierx/core-go/internal/types"
	"github.com/gofiber/fiber/v2"
)

// VerifyRequest is the payload for POST /internal/verify-provider.
type VerifyRequest struct {
	Provider string                 `json:"provider"`
	Config   map[string]interface{} `json:"config"`
}

// VerifyResponse is the result of a provider credential verification.
type VerifyResponse struct {
	Verified bool   `json:"verified"`
	Provider string `json:"provider"`
	Error    string `json:"error,omitempty"`
}

// VerifyProvider validates that provider credentials are functional by hitting
// a lightweight read-only API for the given provider. No email is sent.
func (h *Handler) VerifyProvider(c *fiber.Ctx) error {
	var req VerifyRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(VerifyResponse{
			Verified: false, Error: "invalid request body: " + err.Error(),
		})
	}

	if req.Provider == "" || req.Config == nil {
		return c.Status(fiber.StatusBadRequest).JSON(VerifyResponse{
			Verified: false, Error: "provider and config are required",
		})
	}

	ctx, cancel := context.WithTimeout(c.Context(), 15*time.Second)
	defer cancel()

	var verifyErr error

	switch types.ProviderType(req.Provider) {
	case types.ProviderSendGrid:
		verifyErr = verifySendGrid(ctx, req.Config)
	case types.ProviderMailgun:
		verifyErr = verifyMailgun(ctx, req.Config)
	case types.ProviderResend:
		verifyErr = verifyResend(ctx, req.Config)
	case types.ProviderPostmark:
		verifyErr = verifyPostmark(ctx, req.Config)
	case types.ProviderSES:
		verifyErr = verifySES(ctx, req.Config)
	case types.ProviderSMTP:
		verifyErr = verifySMTP(ctx, req.Config)
	default:
		return c.Status(fiber.StatusBadRequest).JSON(VerifyResponse{
			Verified: false, Error: fmt.Sprintf("unsupported provider: %s", req.Provider),
		})
	}

	if verifyErr != nil {
		return c.JSON(VerifyResponse{
			Verified: false,
			Provider: req.Provider,
			Error:    verifyErr.Error(),
		})
	}

	return c.JSON(VerifyResponse{
		Verified: true,
		Provider: req.Provider,
	})
}

// verifySendGrid checks the key via GET /v3/user/profile.
func verifySendGrid(ctx context.Context, config map[string]interface{}) error {
	apiKey, _ := config["apiKey"].(string)
	if apiKey == "" {
		return fmt.Errorf("apiKey is required")
	}

	req, _ := http.NewRequestWithContext(ctx, http.MethodGet,
		"https://api.sendgrid.com/v3/user/profile", nil)
	req.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := httpClient().Do(req)
	if err != nil {
		return fmt.Errorf("connection failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
		return fmt.Errorf("invalid API key (HTTP %d)", resp.StatusCode)
	}
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("unexpected response (HTTP %d): %s", resp.StatusCode, truncate(string(body), 200))
	}
	return nil
}

// verifyMailgun checks the key via GET /v3/domains.
func verifyMailgun(ctx context.Context, config map[string]interface{}) error {
	apiKey, _ := config["apiKey"].(string)
	if apiKey == "" {
		return fmt.Errorf("apiKey is required")
	}

	region, _ := config["region"].(string)
	baseURL := "https://api.mailgun.net"
	if strings.EqualFold(region, "eu") {
		baseURL = "https://api.eu.mailgun.net"
	}

	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, baseURL+"/v3/domains", nil)
	req.SetBasicAuth("api", apiKey)

	resp, err := httpClient().Do(req)
	if err != nil {
		return fmt.Errorf("connection failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
		return fmt.Errorf("invalid API key (HTTP %d)", resp.StatusCode)
	}
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("unexpected response (HTTP %d): %s", resp.StatusCode, truncate(string(body), 200))
	}
	return nil
}

// verifyResend checks the key via GET /domains.
func verifyResend(ctx context.Context, config map[string]interface{}) error {
	apiKey, _ := config["apiKey"].(string)
	if apiKey == "" {
		return fmt.Errorf("apiKey is required")
	}

	req, _ := http.NewRequestWithContext(ctx, http.MethodGet,
		"https://api.resend.com/domains", nil)
	req.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := httpClient().Do(req)
	if err != nil {
		return fmt.Errorf("connection failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
		return fmt.Errorf("invalid API key (HTTP %d)", resp.StatusCode)
	}
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("unexpected response (HTTP %d): %s", resp.StatusCode, truncate(string(body), 200))
	}
	return nil
}

// verifyPostmark checks the key via GET /server.
func verifyPostmark(ctx context.Context, config map[string]interface{}) error {
	token, _ := config["serverToken"].(string)
	if token == "" {
		return fmt.Errorf("serverToken is required")
	}

	req, _ := http.NewRequestWithContext(ctx, http.MethodGet,
		"https://api.postmarkapp.com/server", nil)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("X-Postmark-Server-Token", token)

	resp, err := httpClient().Do(req)
	if err != nil {
		return fmt.Errorf("connection failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
		return fmt.Errorf("invalid server token (HTTP %d)", resp.StatusCode)
	}
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("unexpected response (HTTP %d): %s", resp.StatusCode, truncate(string(body), 200))
	}
	return nil
}

// verifySES checks credentials by issuing a signed GET to the SES v2
// GetAccount endpoint via the shared SESProvider implementation.
func verifySES(ctx context.Context, config map[string]interface{}) error {
	p, err := providers.NewSESProvider(config)
	if err != nil {
		return err
	}
	return p.Verify(ctx)
}

// verifySMTP attempts an EHLO + AUTH handshake without sending a message.
func verifySMTP(ctx context.Context, config map[string]interface{}) error {
	host, _ := config["host"].(string)
	if host == "" {
		return fmt.Errorf("host is required")
	}

	port := 587
	switch v := config["port"].(type) {
	case float64:
		port = int(v)
	case int:
		port = v
	case json.Number:
		if n, err := v.Int64(); err == nil {
			port = int(n)
		}
	}

	user, _ := config["user"].(string)
	pass, _ := config["pass"].(string)
	useTLS, _ := config["useTLS"].(bool)

	addr := fmt.Sprintf("%s:%d", host, port)

	var conn net.Conn
	var err error

	dialer := &net.Dialer{Timeout: 10 * time.Second}

	if useTLS || port == 465 {
		// Implicit TLS (port 465)
		conn, err = tls.DialWithDialer(dialer, "tcp", addr, &tls.Config{ServerName: host})
	} else {
		conn, err = dialer.DialContext(ctx, "tcp", addr)
	}
	if err != nil {
		return fmt.Errorf("connection failed: %w", err)
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, host)
	if err != nil {
		return fmt.Errorf("SMTP handshake failed: %w", err)
	}
	defer client.Close()

	// STARTTLS for non-implicit-TLS connections
	if !useTLS && port != 465 {
		if ok, _ := client.Extension("STARTTLS"); ok {
			if err := client.StartTLS(&tls.Config{ServerName: host}); err != nil {
				return fmt.Errorf("STARTTLS failed: %w", err)
			}
		}
	}

	// Auth if credentials provided
	if user != "" && pass != "" {
		auth := smtp.PlainAuth("", user, pass, host)
		if err := client.Auth(auth); err != nil {
			return fmt.Errorf("authentication failed: %w", err)
		}
	}

	return nil
}

func httpClient() *http.Client {
	return &http.Client{Timeout: 15 * time.Second}
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "..."
}
