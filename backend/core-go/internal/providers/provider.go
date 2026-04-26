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

// RecipientPermanentError signals that the recipient address itself is
// unfixable — invalid, malformed, or rejected in a way no provider could
// possibly accept. The router stops the failover chain on these because
// trying another provider would just re-fail.
type RecipientPermanentError struct {
	Code    int
	Message string
}

func (e *RecipientPermanentError) Error() string { return e.Message }

// ProviderPermanentError signals that *this specific provider* can't send
// the message — auth failure, sending domain not verified on this provider's
// side, account suspended at the provider, etc. Other providers in the chain
// may still succeed, so the router skips this one and tries the next.
type ProviderPermanentError struct {
	Provider string
	Code     int
	Message  string
}

func (e *ProviderPermanentError) Error() string { return e.Message }

// PermanentError is the legacy name for RecipientPermanentError. Aliased so
// existing call sites and tests keep compiling. New code should use the
// specific Recipient/ProviderPermanentError types.
//
// Deprecated: use RecipientPermanentError for recipient-side errors or
// ProviderPermanentError for provider-side errors.
type PermanentError = RecipientPermanentError

// RateLimitError signals that the provider is rate-limiting; failover to next.
type RateLimitError struct {
	Message string
}

func (e *RateLimitError) Error() string { return e.Message }

// ErrorClassification categorises send errors for routing decisions.
type ErrorClassification string

const (
	// ErrorRecipientPermanent — recipient is bad, stop the chain.
	ErrorRecipientPermanent ErrorClassification = "recipient_permanent"
	// ErrorProviderPermanent — this provider can't help, try the next one.
	ErrorProviderPermanent ErrorClassification = "provider_permanent"
	// ErrorTransient — temporary failure, try the next provider (and retry).
	ErrorTransient ErrorClassification = "transient"
	// ErrorRateLimit — provider is throttling, try the next or back off.
	ErrorRateLimit ErrorClassification = "rate_limit"

	// ErrorPermanent is the legacy alias for ErrorRecipientPermanent. Existing
	// callers comparing classification == ErrorPermanent keep working.
	//
	// Deprecated: prefer ErrorRecipientPermanent / ErrorProviderPermanent.
	ErrorPermanent = ErrorRecipientPermanent
)

// ClassifyError determines how an error should affect routing.
// Typed errors take precedence over string-matching so provider API changes
// don't silently flip classification.
//
// Buckets:
//   - RecipientPermanent — bad recipient/payload; no provider can fix it
//   - ProviderPermanent  — auth/setup broken on this provider; try next
//   - RateLimit          — throttled; try next provider, retry later
//   - Transient          — timeout / 5xx / unknown; try next, retry later
func ClassifyError(err error) ErrorClassification {
	if err == nil {
		return ""
	}

	// Typed errors first — most reliable signal.
	var provPermErr *ProviderPermanentError
	if errors.As(err, &provPermErr) {
		return ErrorProviderPermanent
	}

	var recipPermErr *RecipientPermanentError
	if errors.As(err, &recipPermErr) {
		return ErrorRecipientPermanent
	}

	var rlErr *RateLimitError
	if errors.As(err, &rlErr) {
		return ErrorRateLimit
	}

	s := strings.ToLower(err.Error())

	// Rate limits — check first; some providers include "rate limit" alongside
	// auth errors and we want to back off rather than skip.
	if containsAny(s, "rate limit", "too many requests", "quota exceeded",
		"sending limit", "throttl") {
		return ErrorRateLimit
	}

	// Recipient-permanent — the address or payload is bad in a way every
	// provider would reject. Match conservatively; ambiguous strings fall
	// through to provider-permanent (skip-and-continue) instead.
	if containsAny(s,
		"invalid email", "invalid recipient",
		"no such user", "user unknown",
		"address rejected", "mailbox does not exist",
		"malformed") {
		return ErrorRecipientPermanent
	}

	// Provider-permanent — this provider's auth or setup is broken. Other
	// providers in the chain may still send for us.
	if containsAny(s,
		"unauthorized", "authentication failed",
		"invalid api key", "invalid api token", "forbidden",
		"invalid sender", "sender not authorized",
		"domain not verified", "unverified", "not verified",
		"account suspended", "ip blocked",
		"bad request") {
		return ErrorProviderPermanent
	}

	return ErrorTransient
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
