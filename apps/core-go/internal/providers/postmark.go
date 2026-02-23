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

// PostmarkProvider sends email via the Postmark API.
type PostmarkProvider struct {
	serverToken string
	client      *http.Client
}

// NewPostmarkProvider validates config and returns a ready provider.
func NewPostmarkProvider(config map[string]interface{}) (*PostmarkProvider, error) {
	token, _ := config["serverToken"].(string)
	if token == "" {
		return nil, fmt.Errorf("postmark: serverToken is required")
	}
	return &PostmarkProvider{
		serverToken: token,
		client:      &http.Client{Timeout: 30 * time.Second},
	}, nil
}

type postmarkRequest struct {
	From        string               `json:"From"`
	To          string               `json:"To"`
	Cc          string               `json:"Cc,omitempty"`
	Bcc         string               `json:"Bcc,omitempty"`
	Subject     string               `json:"Subject"`
	HtmlBody    string               `json:"HtmlBody,omitempty"`
	TextBody    string               `json:"TextBody,omitempty"`
	ReplyTo     string               `json:"ReplyTo,omitempty"`
	Tag         string               `json:"Tag,omitempty"`
	Attachments []postmarkAttachment `json:"Attachments,omitempty"`
	TrackOpens  bool                 `json:"TrackOpens"`
	TrackLinks  string               `json:"TrackLinks"`
}

type postmarkAttachment struct {
	Name        string `json:"Name"`
	Content     string `json:"Content"` // base64
	ContentType string `json:"ContentType"`
}

func (p *PostmarkProvider) Send(ctx context.Context, req *types.SendRequest) (*types.SendResponse, error) {
	pmReq := postmarkRequest{
		From:       req.From,
		To:         req.To,
		Subject:    req.Subject,
		HtmlBody:   req.HTML,
		TextBody:   req.Text,
		ReplyTo:    req.ReplyTo,
		TrackOpens: true,
		TrackLinks: "HtmlAndText",
	}

	if len(req.CC) > 0 {
		pmReq.Cc = joinAddresses(req.CC)
	}
	if len(req.BCC) > 0 {
		pmReq.Bcc = joinAddresses(req.BCC)
	}
	if len(req.Tags) > 0 {
		pmReq.Tag = req.Tags[0] // Postmark only supports one tag per message
	}

	for _, att := range req.Attachments {
		ct := att.ContentType
		if ct == "" {
			ct = "application/octet-stream"
		}
		pmReq.Attachments = append(pmReq.Attachments, postmarkAttachment{
			Name:        att.Filename,
			Content:     att.Content, // already base64
			ContentType: ct,
		})
	}

	body, err := json.Marshal(pmReq)
	if err != nil {
		return nil, fmt.Errorf("postmark: marshal error: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://api.postmarkapp.com/email", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("postmark: create request: %w", err)
	}
	httpReq.Header.Set("Accept", "application/json")
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("X-Postmark-Server-Token", p.serverToken)

	resp, err := p.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("postmark: request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("postmark: status %d: %s", resp.StatusCode, string(b))
	}

	var result struct {
		MessageID string `json:"MessageID"`
		ErrorCode int    `json:"ErrorCode"`
		Message   string `json:"Message"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("postmark: parse response: %w", err)
	}
	if result.ErrorCode != 0 {
		return nil, fmt.Errorf("postmark: error %d: %s", result.ErrorCode, result.Message)
	}

	return &types.SendResponse{
		Success:   true,
		MessageID: result.MessageID,
		Provider:  "postmark",
	}, nil
}

func (p *PostmarkProvider) Name() string { return "postmark" }

func (p *PostmarkProvider) ValidateConfig() error {
	if p.serverToken == "" {
		return fmt.Errorf("postmark: serverToken is required")
	}
	return nil
}
