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
)

// ResendProvider sends email via the Resend API (api.resend.com).
type ResendProvider struct {
	apiKey string
	client *http.Client
}

// NewResendProvider validates config and returns a ready provider.
func NewResendProvider(config map[string]interface{}) (*ResendProvider, error) {
	apiKey, _ := config["apiKey"].(string)
	if apiKey == "" {
		return nil, fmt.Errorf("resend: apiKey is required")
	}
	return &ResendProvider{
		apiKey: apiKey,
		client: &http.Client{Timeout: 30 * time.Second},
	}, nil
}

type resendRequest struct {
	From        string               `json:"from"`
	To          []string             `json:"to"`
	Cc          []string             `json:"cc,omitempty"`
	Bcc         []string             `json:"bcc,omitempty"`
	ReplyTo     []string             `json:"reply_to,omitempty"`
	Subject     string               `json:"subject"`
	Html        string               `json:"html,omitempty"`
	Text        string               `json:"text,omitempty"`
	Tags        []resendTag          `json:"tags,omitempty"`
	Attachments []resendAttachment   `json:"attachments,omitempty"`
}

type resendTag struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

type resendAttachment struct {
	Filename string `json:"filename"`
	Content  string `json:"content"` // base64
}

func (p *ResendProvider) Send(ctx context.Context, req *types.SendRequest) (*types.SendResponse, error) {
	rsReq := resendRequest{
		From:    req.From,
		To:      []string{req.To},
		Cc:      req.CC,
		Bcc:     req.BCC,
		Subject: req.Subject,
		Html:    req.HTML,
		Text:    req.Text,
	}

	if req.ReplyTo != "" {
		rsReq.ReplyTo = []string{req.ReplyTo}
	}

	for _, tag := range req.Tags {
		rsReq.Tags = append(rsReq.Tags, resendTag{Name: tag, Value: tag})
	}

	for _, att := range req.Attachments {
		rsReq.Attachments = append(rsReq.Attachments, resendAttachment{
			Filename: att.Filename,
			Content:  att.Content, // already base64
		})
	}

	body, err := json.Marshal(rsReq)
	if err != nil {
		return nil, fmt.Errorf("resend: marshal error: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://api.resend.com/emails", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("resend: create request: %w", err)
	}
	httpReq.Header.Set("Authorization", "Bearer "+p.apiKey)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := p.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("resend: request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		b, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("resend: status %d: %s", resp.StatusCode, string(b))
	}

	var result struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("resend: parse response: %w", err)
	}

	return &types.SendResponse{
		Success:   true,
		MessageID: result.ID,
		Provider:  "resend",
	}, nil
}

func (p *ResendProvider) Name() string { return "resend" }

func (p *ResendProvider) ValidateConfig() error {
	if p.apiKey == "" {
		return fmt.Errorf("resend: apiKey is required")
	}
	return nil
}
