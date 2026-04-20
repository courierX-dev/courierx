// Package providers — AWS SES v2 provider.
// Uses the SES v2 SendEmail API with manual AWS Signature V4 signing
// so no external AWS SDK dependency is required.
package providers

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/courierx/core-go/internal/types"
)

// SESProvider sends email via the AWS SES v2 API.
type SESProvider struct {
	accessKey string
	secretKey string
	region    string
	client    *http.Client
}

// NewSESProvider validates config and returns a ready provider.
func NewSESProvider(config map[string]interface{}) (*SESProvider, error) {
	accessKey, _ := config["accessKeyId"].(string)
	secretKey, _ := config["secretAccessKey"].(string)
	region, _ := config["region"].(string)

	if accessKey == "" || secretKey == "" {
		return nil, fmt.Errorf("ses: accessKeyId and secretAccessKey are required")
	}
	if region == "" {
		region = "us-east-1"
	}

	return &SESProvider{
		accessKey: accessKey,
		secretKey: secretKey,
		region:    region,
		client:    &http.Client{Timeout: 30 * time.Second},
	}, nil
}

// SES v2 request types
type sesEmailRequest struct {
	FromEmailAddress  string          `json:"FromEmailAddress"`
	ReplyToAddresses  []string        `json:"ReplyToAddresses,omitempty"`
	Destination       sesDestination  `json:"Destination"`
	Content           sesEmailContent `json:"Content"`
	EmailTags         []sesTag        `json:"EmailTags,omitempty"`
}

type sesDestination struct {
	ToAddresses  []string `json:"ToAddresses"`
	CcAddresses  []string `json:"CcAddresses,omitempty"`
	BccAddresses []string `json:"BccAddresses,omitempty"`
}

type sesEmailContent struct {
	Simple *sesSimpleContent `json:"Simple,omitempty"`
}

type sesSimpleContent struct {
	Subject sesCharset `json:"Subject"`
	Body    sesBody    `json:"Body"`
}

type sesBody struct {
	Html *sesCharset `json:"Html,omitempty"`
	Text *sesCharset `json:"Text,omitempty"`
}

type sesCharset struct {
	Data    string `json:"Data"`
	Charset string `json:"Charset"`
}

type sesTag struct {
	Name  string `json:"Name"`
	Value string `json:"Value"`
}

func (p *SESProvider) Send(ctx context.Context, req *types.SendRequest) (*types.SendResponse, error) {
	sesReq := sesEmailRequest{
		FromEmailAddress: req.From,
		Destination: sesDestination{
			ToAddresses:  []string{req.To},
			CcAddresses:  req.CC,
			BccAddresses: req.BCC,
		},
	}

	if req.ReplyTo != "" {
		sesReq.ReplyToAddresses = []string{req.ReplyTo}
	}

	body := sesBody{}
	if req.HTML != "" {
		body.Html = &sesCharset{Data: req.HTML, Charset: "UTF-8"}
	}
	if req.Text != "" {
		body.Text = &sesCharset{Data: req.Text, Charset: "UTF-8"}
	}
	sesReq.Content = sesEmailContent{
		Simple: &sesSimpleContent{
			Subject: sesCharset{Data: req.Subject, Charset: "UTF-8"},
			Body:    body,
		},
	}

	// Tags: SES requires distinct Name and Value per tag with strict character
	// constraints. Omitted until a sanitized name:value convention is established.

	payload, err := json.Marshal(sesReq)
	if err != nil {
		return nil, fmt.Errorf("ses: marshal error: %w", err)
	}

	endpoint := fmt.Sprintf("https://email.%s.amazonaws.com/v2/email/outbound-emails", p.region)
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(payload))
	if err != nil {
		return nil, fmt.Errorf("ses: create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	// Sign with AWS Sig V4
	p.signV4(httpReq, payload)

	resp, err := p.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("ses: request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("ses: status %d: %s", resp.StatusCode, string(b))
	}

	var result struct {
		MessageId string `json:"MessageId"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("ses: parse response: %w", err)
	}

	return &types.SendResponse{
		Success:   true,
		MessageID: result.MessageId,
		Provider:  "ses",
	}, nil
}

// signV4 attaches AWS Signature V4 authorization to the request.
func (p *SESProvider) signV4(req *http.Request, body []byte) {
	now := time.Now().UTC()
	datetime := now.Format("20060102T150405Z")
	date := now.Format("20060102")

	payloadHash := sesSHA256Hex(body)
	host := req.URL.Host

	req.Header.Set("X-Amz-Date", datetime)
	req.Header.Set("X-Amz-Content-Sha256", payloadHash)

	// Canonical headers — must be lowercase and sorted
	canonicalHeaders := fmt.Sprintf(
		"content-type:%s\nhost:%s\nx-amz-content-sha256:%s\nx-amz-date:%s\n",
		req.Header.Get("Content-Type"), host, payloadHash, datetime,
	)
	signedHeaders := "content-type;host;x-amz-content-sha256;x-amz-date"

	canonicalURI := req.URL.EscapedPath()
	if canonicalURI == "" {
		canonicalURI = "/"
	}

	canonicalRequest := strings.Join([]string{
		req.Method,
		canonicalURI,
		"", // query string
		canonicalHeaders,
		signedHeaders,
		payloadHash,
	}, "\n")

	credentialScope := fmt.Sprintf("%s/%s/ses/aws4_request", date, p.region)
	stringToSign := strings.Join([]string{
		"AWS4-HMAC-SHA256",
		datetime,
		credentialScope,
		sesSHA256Hex([]byte(canonicalRequest)),
	}, "\n")

	signingKey := sesHMACSHA256(
		sesHMACSHA256(
			sesHMACSHA256(
				sesHMACSHA256([]byte("AWS4"+p.secretKey), []byte(date)),
				[]byte(p.region),
			),
			[]byte("ses"),
		),
		[]byte("aws4_request"),
	)

	signature := hex.EncodeToString(sesHMACSHA256(signingKey, []byte(stringToSign)))

	req.Header.Set("Authorization", fmt.Sprintf(
		"AWS4-HMAC-SHA256 Credential=%s/%s, SignedHeaders=%s, Signature=%s",
		p.accessKey, credentialScope, signedHeaders, signature,
	))
}

func (p *SESProvider) Name() string { return "ses" }

func (p *SESProvider) ValidateConfig() error {
	if p.accessKey == "" || p.secretKey == "" {
		return fmt.Errorf("ses: accessKeyId and secretAccessKey are required")
	}
	return nil
}

// — Sig V4 crypto helpers (SES-private) —

func sesSHA256Hex(data []byte) string {
	h := sha256.Sum256(data)
	return hex.EncodeToString(h[:])
}

func sesHMACSHA256(key, data []byte) []byte {
	h := hmac.New(sha256.New, key)
	h.Write(data)
	return h.Sum(nil)
}
