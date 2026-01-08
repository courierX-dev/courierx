package providers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/courierx/core-go/internal/types"
)

// SendGridProvider implements SendGrid email sending
type SendGridProvider struct {
	apiKey string
	client *http.Client
}

// NewSendGridProvider creates a new SendGrid provider
func NewSendGridProvider(config map[string]interface{}) (*SendGridProvider, error) {
	apiKey, ok := config["apiKey"].(string)
	if !ok || apiKey == "" {
		return nil, fmt.Errorf("sendgrid: apiKey is required")
	}

	return &SendGridProvider{
		apiKey: apiKey,
		client: &http.Client{
			Timeout: 30,
		},
	}, nil
}

func (p *SendGridProvider) Send(ctx context.Context, req *types.SendRequest) (*types.SendResponse, error) {
	// Build SendGrid request payload
	payload := map[string]interface{}{
		"personalizations": []map[string]interface{}{
			{
				"to": []map[string]string{
					{"email": req.To},
				},
			},
		},
		"from": map[string]string{
			"email": req.From,
		},
		"subject": req.Subject,
	}

	// Add content
	content := []map[string]string{}
	if req.HTML != "" {
		content = append(content, map[string]string{
			"type":  "text/html",
			"value": req.HTML,
		})
	}
	if req.Text != "" {
		content = append(content, map[string]string{
			"type":  "text/plain",
			"value": req.Text,
		})
	}
	payload["content"] = content

	// Add reply-to if provided
	if req.ReplyTo != "" {
		payload["reply_to"] = map[string]string{
			"email": req.ReplyTo,
		}
	}

	// Marshal payload
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("sendgrid: failed to marshal payload: %w", err)
	}

	// Create HTTP request
	httpReq, err := http.NewRequestWithContext(ctx, "POST", "https://api.sendgrid.com/v3/mail/send", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("sendgrid: failed to create request: %w", err)
	}

	httpReq.Header.Set("Authorization", "Bearer "+p.apiKey)
	httpReq.Header.Set("Content-Type", "application/json")

	// Send request
	resp, err := p.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("sendgrid: request failed: %w", err)
	}
	defer resp.Body.Close()

	// Check response
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusAccepted {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("sendgrid: unexpected status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	// Extract message ID from X-Message-Id header
	messageID := resp.Header.Get("X-Message-Id")
	if messageID == "" {
		messageID = "sendgrid-" + req.To
	}

	return &types.SendResponse{
		Success:   true,
		MessageID: messageID,
		Provider:  "sendgrid",
	}, nil
}

func (p *SendGridProvider) Name() string {
	return "sendgrid"
}

func (p *SendGridProvider) ValidateConfig() error {
	if p.apiKey == "" {
		return fmt.Errorf("sendgrid: apiKey is required")
	}
	return nil
}
