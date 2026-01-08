package providers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/courierx/core-go/internal/types"
)

// MailgunProvider implements Mailgun email sending
type MailgunProvider struct {
	apiKey string
	domain string
	client *http.Client
}

// NewMailgunProvider creates a new Mailgun provider
func NewMailgunProvider(config map[string]interface{}) (*MailgunProvider, error) {
	apiKey, ok := config["apiKey"].(string)
	if !ok || apiKey == "" {
		return nil, fmt.Errorf("mailgun: apiKey is required")
	}

	domain, ok := config["domain"].(string)
	if !ok || domain == "" {
		return nil, fmt.Errorf("mailgun: domain is required")
	}

	return &MailgunProvider{
		apiKey: apiKey,
		domain: domain,
		client: &http.Client{
			Timeout: 30,
		},
	}, nil
}

func (p *MailgunProvider) Send(ctx context.Context, req *types.SendRequest) (*types.SendResponse, error) {
	// Build form data
	data := url.Values{}
	data.Set("from", req.From)
	data.Set("to", req.To)
	data.Set("subject", req.Subject)

	if req.HTML != "" {
		data.Set("html", req.HTML)
	}
	if req.Text != "" {
		data.Set("text", req.Text)
	}
	if req.ReplyTo != "" {
		data.Set("h:Reply-To", req.ReplyTo)
	}

	// Create HTTP request
	apiURL := fmt.Sprintf("https://api.mailgun.net/v3/%s/messages", p.domain)
	httpReq, err := http.NewRequestWithContext(ctx, "POST", apiURL, strings.NewReader(data.Encode()))
	if err != nil {
		return nil, fmt.Errorf("mailgun: failed to create request: %w", err)
	}

	httpReq.SetBasicAuth("api", p.apiKey)
	httpReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	// Send request
	resp, err := p.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("mailgun: request failed: %w", err)
	}
	defer resp.Body.Close()

	// Check response
	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("mailgun: unexpected status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	// Parse response to get message ID
	var result struct {
		ID      string `json:"id"`
		Message string `json:"message"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("mailgun: failed to parse response: %w", err)
	}

	return &types.SendResponse{
		Success:   true,
		MessageID: result.ID,
		Provider:  "mailgun",
	}, nil
}

func (p *MailgunProvider) Name() string {
	return "mailgun"
}

func (p *MailgunProvider) ValidateConfig() error {
	if p.apiKey == "" {
		return fmt.Errorf("mailgun: apiKey is required")
	}
	if p.domain == "" {
		return fmt.Errorf("mailgun: domain is required")
	}
	return nil
}
