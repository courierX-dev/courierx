package providers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strings"
	"time"

	"github.com/courierx/core-go/internal/types"
)

// MailgunProvider sends email via the Mailgun Messages API.
// Supports US (api.mailgun.net) and EU (api.eu.mailgun.net) regions.
type MailgunProvider struct {
	apiKey string
	domain string
	baseURL string // region-aware base URL
	client *http.Client
}

// NewMailgunProvider validates config and returns a ready provider.
func NewMailgunProvider(config map[string]interface{}) (*MailgunProvider, error) {
	apiKey, ok := config["apiKey"].(string)
	if !ok || apiKey == "" {
		return nil, fmt.Errorf("mailgun: apiKey is required")
	}
	domain, ok := config["domain"].(string)
	if !ok || domain == "" {
		return nil, fmt.Errorf("mailgun: domain is required")
	}

	region, _ := config["region"].(string)
	baseURL := "https://api.mailgun.net"
	if strings.EqualFold(region, "eu") {
		baseURL = "https://api.eu.mailgun.net"
	}

	return &MailgunProvider{
		apiKey:  apiKey,
		domain:  domain,
		baseURL: baseURL,
		client:  &http.Client{Timeout: 30 * time.Second},
	}, nil
}

func (p *MailgunProvider) Send(ctx context.Context, req *types.SendRequest) (*types.SendResponse, error) {
	var body bytes.Buffer
	mw := multipart.NewWriter(&body)

	fields := map[string]string{
		"from":    req.From,
		"to":      req.To,
		"subject": req.Subject,
	}
	if req.HTML != "" {
		fields["html"] = req.HTML
		// Open/click tracking only meaningful for HTML — opens use a pixel,
		// clicks rewrite anchor tags. Mailgun ignores these for text-only.
		fields["o:tracking"] = "yes"
		fields["o:tracking-opens"] = "yes"
		fields["o:tracking-clicks"] = "yes"
	}
	if req.Text != "" {
		fields["text"] = req.Text
	}
	if req.ReplyTo != "" {
		fields["h:Reply-To"] = req.ReplyTo
	}
	if len(req.CC) > 0 {
		fields["cc"] = strings.Join(req.CC, ",")
	}
	if len(req.BCC) > 0 {
		fields["bcc"] = strings.Join(req.BCC, ",")
	}
	for k, v := range fields {
		if err := mw.WriteField(k, v); err != nil {
			return nil, fmt.Errorf("mailgun: write field %s: %w", k, err)
		}
	}

	// Tags
	for _, tag := range req.Tags {
		if err := mw.WriteField("o:tag", tag); err != nil {
			return nil, fmt.Errorf("mailgun: write tag: %w", err)
		}
	}

	// Attachments
	for _, att := range req.Attachments {
		ct := att.ContentType
		if ct == "" {
			ct = "application/octet-stream"
		}
		part, err := mw.CreateFormFile("attachment", att.Filename)
		if err != nil {
			return nil, fmt.Errorf("mailgun: create attachment part: %w", err)
		}
		// att.Content is base64 — Mailgun accepts raw bytes, so we decode first
		decoded, err := decodeBase64Content(att.Content)
		if err != nil {
			return nil, fmt.Errorf("mailgun: decode attachment %s: %w", att.Filename, err)
		}
		if _, err := part.Write(decoded); err != nil {
			return nil, fmt.Errorf("mailgun: write attachment: %w", err)
		}
	}

	if err := mw.Close(); err != nil {
		return nil, fmt.Errorf("mailgun: close writer: %w", err)
	}

	apiURL := fmt.Sprintf("%s/v3/%s/messages", p.baseURL, p.domain)
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, apiURL, &body)
	if err != nil {
		return nil, fmt.Errorf("mailgun: create request: %w", err)
	}
	httpReq.SetBasicAuth("api", p.apiKey)
	httpReq.Header.Set("Content-Type", mw.FormDataContentType())

	resp, err := p.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("mailgun: request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusAccepted {
		b, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("mailgun: status %d: %s", resp.StatusCode, string(b))
	}

	var result struct {
		ID      string `json:"id"`
		Message string `json:"message"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("mailgun: parse response: %w", err)
	}

	return &types.SendResponse{
		Success:   true,
		MessageID: result.ID,
		Provider:  "mailgun",
	}, nil
}

func (p *MailgunProvider) Name() string { return "mailgun" }

func (p *MailgunProvider) ValidateConfig() error {
	if p.apiKey == "" {
		return fmt.Errorf("mailgun: apiKey is required")
	}
	if p.domain == "" {
		return fmt.Errorf("mailgun: domain is required")
	}
	return nil
}
