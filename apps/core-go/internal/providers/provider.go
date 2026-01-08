package providers

import (
	"context"
	"fmt"

	"github.com/courierx/core-go/internal/types"
)

// Provider is the interface all email providers must implement
type Provider interface {
	Send(ctx context.Context, req *types.SendRequest) (*types.SendResponse, error)
	Name() string
	ValidateConfig() error
}

// Factory creates a provider instance based on config
func NewProvider(config types.ProviderConfig) (Provider, error) {
	switch config.Type {
	case types.ProviderMock:
		return NewMockProvider(config.Config), nil
	case types.ProviderSendGrid:
		return NewSendGridProvider(config.Config)
	case types.ProviderMailgun:
		return NewMailgunProvider(config.Config)
	default:
		return nil, fmt.Errorf("unsupported provider type: %s", config.Type)
	}
}

// ErrorClassification represents error types
type ErrorClassification string

const (
	ErrorPermanent  ErrorClassification = "permanent"
	ErrorTransient  ErrorClassification = "transient"
	ErrorRateLimit  ErrorClassification = "rate_limit"
)

// ClassifyError determines if an error is transient or permanent
func ClassifyError(err error) ErrorClassification {
	if err == nil {
		return ""
	}

	errStr := err.Error()

	// Permanent errors - don't retry
	permanentPatterns := []string{
		"invalid email",
		"unauthorized",
		"authentication failed",
		"invalid api key",
		"bad request",
		"malformed",
	}

	for _, pattern := range permanentPatterns {
		if contains(errStr, pattern) {
			return ErrorPermanent
		}
	}

	// Rate limit errors
	rateLimitPatterns := []string{
		"rate limit",
		"too many requests",
		"quota exceeded",
	}

	for _, pattern := range rateLimitPatterns {
		if contains(errStr, pattern) {
			return ErrorRateLimit
		}
	}

	// Default to transient (can retry with next provider)
	return ErrorTransient
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > len(substr) &&
		(s[:len(substr)] == substr || s[len(s)-len(substr):] == substr ||
		 stringContains(s, substr)))
}

func stringContains(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
