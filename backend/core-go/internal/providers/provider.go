package providers

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"

	"github.com/courierx/core-go/internal/types"
)

// Provider is the interface every email backend must implement.
type Provider interface {
	Send(ctx context.Context, req *types.SendRequest) (*types.SendResponse, error)
	Name() string
	ValidateConfig() error
}

// NewProvider instantiates the correct provider for the given config.
func NewProvider(config types.ProviderConfig) (Provider, error) {
	switch config.Type {
	case types.ProviderMock:
		return NewMockProvider(config.Config), nil
	case types.ProviderSendGrid:
		return NewSendGridProvider(config.Config)
	case types.ProviderMailgun:
		return NewMailgunProvider(config.Config)
	case types.ProviderSES:
		return NewSESProvider(config.Config)
	case types.ProviderSMTP:
		return NewSMTPProvider(config.Config)
	case types.ProviderPostmark:
		return NewPostmarkProvider(config.Config)
	case types.ProviderResend:
		return NewResendProvider(config.Config)
	default:
		return nil, fmt.Errorf("unsupported provider type: %q", config.Type)
	}
}

// PermanentError signals that the error is not retryable across providers.
// Providers should return this type for auth failures, invalid addresses, etc.
type PermanentError struct {
	Code    int
	Message string
}

func (e *PermanentError) Error() string { return e.Message }

// RateLimitError signals that the provider is rate-limiting; failover to next.
type RateLimitError struct {
	Message string
}

func (e *RateLimitError) Error() string { return e.Message }

// ErrorClassification categorises send errors for routing decisions.
type ErrorClassification string

const (
	ErrorPermanent ErrorClassification = "permanent"
	ErrorTransient ErrorClassification = "transient"
	ErrorRateLimit ErrorClassification = "rate_limit"
)

// ClassifyError determines whether an error warrants failover.
// Typed errors (*PermanentError, *RateLimitError) take precedence over
// string-matching so provider API changes don't silently flip classification.
func ClassifyError(err error) ErrorClassification {
	if err == nil {
		return ""
	}

	var permErr *PermanentError
	if errors.As(err, &permErr) {
		return ErrorPermanent
	}

	var rlErr *RateLimitError
	if errors.As(err, &rlErr) {
		return ErrorRateLimit
	}

	s := strings.ToLower(err.Error())
	switch {
	case containsAny(s, "invalid email", "unauthorized", "authentication failed",
		"invalid api key", "bad request", "malformed", "forbidden",
		"invalid sender", "domain not verified", "unverified"):
		return ErrorPermanent

	case containsAny(s, "rate limit", "too many requests", "quota exceeded",
		"sending limit", "throttl"):
		return ErrorRateLimit

	default:
		return ErrorTransient
	}
}

func containsAny(s string, patterns ...string) bool {
	for _, p := range patterns {
		if strings.Contains(s, p) {
			return true
		}
	}
	return false
}

// — shared helpers used across provider files —

// joinAddresses joins a slice of email addresses into a comma-separated string.
func joinAddresses(addrs []string) string {
	return strings.Join(addrs, ",")
}

// extractAddress strips "Name <email>" to return just "email".
func extractAddress(addr string) string {
	addr = strings.TrimSpace(addr)
	if start := strings.LastIndex(addr, "<"); start != -1 {
		if end := strings.Index(addr[start:], ">"); end != -1 {
			return addr[start+1 : start+end]
		}
	}
	return addr
}

// decodeBase64Content decodes a base64 string, handling both padded and URL-safe variants.
func decodeBase64Content(s string) ([]byte, error) {
	// Try standard encoding first, then URL-safe
	b, err := base64.StdEncoding.DecodeString(s)
	if err != nil {
		b, err = base64.URLEncoding.DecodeString(s)
	}
	return b, err
}
