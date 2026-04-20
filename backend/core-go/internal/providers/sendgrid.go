package providers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/courierx/core-go/internal/types"
	"github.com/google/uuid"
)

// SendGridProvider sends email via the SendGrid v3 Mail Send API.
type SendGridProvider struct {
	apiKey string
	client *http.Client
}

// NewSendGridProvider validates config and returns a ready provider.
func NewSendGridProvider(config map[string]interface{}) (*SendGridProvider, error) {
	apiKey, ok := config["apiKey"].(string)
	if !ok || apiKey == "" {
		return nil, fmt.Errorf("sendgrid: apiKey is required")
	}
	return &SendGridProvider{
		apiKey: apiKey,
		client: &http.Client{Timeout: 30 * time.Second},
	}, nil
}

func (p *SendGridProvider) Send(ctx context.Context, req *types.SendRequest) (*types.SendResponse, error) {
	personalization := map[string]interface{}{
		"to": []map[string]string{{"email": req.To}},
	}
	if len(req.CC) > 0 {
		cc := make([]map[string]string, len(req.CC))
		for i, addr := range req.CC {
			cc[i] = map[string]string{"email": addr}
		}
		personalization["cc"] = cc
	}
	if len(req.BCC) > 0 {
		bcc := make([]map[string]string, len(req.BCC))
		for i, addr := range req.BCC {
			bcc[i] = map[string]string{"email": addr}
		}
		personalization["bcc"] = bcc
	}

	payload := map[string]interface{}{
		"personalizations": []interface{}{personalization},
		"from":             map[string]string{"email": req.From},
		"subject":          req.Subject,
	}

	// Content
	var content []map[string]string
	if req.Text != "" {
		content = append(content, map[string]string{"type": "text/plain", "value": req.Text})
	}
	if req.HTML != "" {
		content = append(content, map[string]string{"type": "text/html", "value": req.HTML})
	}
	payload["content"] = content

	// Reply-To
	if req.ReplyTo != "" {
		payload["reply_to"] = map[string]string{"email": req.ReplyTo}
	}

	// Attachments
	if len(req.Attachments) > 0 {
		atts := make([]map[string]string, len(req.Attachments))
		for i, a := range req.Attachments {
			ct := a.ContentType
			if ct == "" {
				ct = "application/octet-stream"
			}
			atts[i] = map[string]string{
				"content":     a.Content, // already base64
				"type":        ct,
				"filename":    a.Filename,
				"disposition": "attachment",
			}
		}
		payload["attachments"] = atts
	}

	// Categories (tags)
	if len(req.Tags) > 0 {
		cats := make([]string, len(req.Tags))
		copy(cats, req.Tags)
		payload["categories"] = cats
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("sendgrid: marshal error: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://api.sendgrid.com/v3/mail/send", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("sendgrid: create request: %w", err)
	}
	httpReq.Header.Set("Authorization", "Bearer "+p.apiKey)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := p.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("sendgrid: request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusAccepted {
		b, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("sendgrid: status %d: %s", resp.StatusCode, string(b))
	}

	msgID := resp.Header.Get("X-Message-Id")
	if msgID == "" {
		msgID = "sg-unknown-" + uuid.New().String()
	}

	return &types.SendResponse{
		Success:   true,
		MessageID: msgID,
		Provider:  "sendgrid",
	}, nil
}

func (p *SendGridProvider) Name() string { return "sendgrid" }

func (p *SendGridProvider) ValidateConfig() error {
	if p.apiKey == "" {
		return fmt.Errorf("sendgrid: apiKey is required")
	}
	return nil
}
