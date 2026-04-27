// Package tracking implements first-party open/click tracking. The rewriter
// injects a 1x1 beacon image and rewrites <a href> targets to a Go endpoint
// that records the event and 302s to the original URL. Tokens are HMAC-signed
// so a recipient cannot forge events for another tenant's emails.
package tracking

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"
)

// EventKind enumerates the event types embedded in a tracking token.
type EventKind string

const (
	EventOpen  EventKind = "o"
	EventClick EventKind = "c"
)

// payload is the data carried inside a tracking token. Kept small — every
// rewritten link in every email contains one.
type payload struct {
	Kind     EventKind `json:"k"`
	EmailID  string    `json:"e"`
	TenantID string    `json:"t,omitempty"`
	IssuedAt int64     `json:"i"`
}

// Signer creates and verifies HMAC-signed tracking tokens.
type Signer struct {
	secret []byte
	maxAge time.Duration
}

// NewSigner constructs a Signer. maxAge=0 disables expiry (tokens valid forever).
// In practice we keep tokens valid for a long window — a recipient might open
// an email weeks after delivery, and we still want to record that.
func NewSigner(secret string, maxAge time.Duration) *Signer {
	return &Signer{secret: []byte(secret), maxAge: maxAge}
}

// Enabled reports whether the signer can produce tokens. False when the
// secret is empty — caller should treat tracking as disabled in that case.
func (s *Signer) Enabled() bool {
	return s != nil && len(s.secret) > 0
}

// Sign produces a URL-safe token string of the form base64url(payload).base64url(hmac).
func (s *Signer) Sign(kind EventKind, emailID, tenantID string) (string, error) {
	if !s.Enabled() {
		return "", errors.New("tracking: signer not configured")
	}
	if emailID == "" {
		return "", errors.New("tracking: emailID is required")
	}
	body, err := json.Marshal(payload{
		Kind:     kind,
		EmailID:  emailID,
		TenantID: tenantID,
		IssuedAt: time.Now().Unix(),
	})
	if err != nil {
		return "", err
	}
	bodyB64 := base64.RawURLEncoding.EncodeToString(body)
	sig := s.mac([]byte(bodyB64))
	return bodyB64 + "." + base64.RawURLEncoding.EncodeToString(sig), nil
}

// Verify parses and authenticates a token. Returns the embedded fields.
func (s *Signer) Verify(token string) (kind EventKind, emailID, tenantID string, err error) {
	if !s.Enabled() {
		return "", "", "", errors.New("tracking: signer not configured")
	}
	bodyB64, sigB64, ok := strings.Cut(token, ".")
	if !ok {
		return "", "", "", errors.New("tracking: malformed token")
	}
	gotSig, err := base64.RawURLEncoding.DecodeString(sigB64)
	if err != nil {
		return "", "", "", fmt.Errorf("tracking: bad signature encoding: %w", err)
	}
	wantSig := s.mac([]byte(bodyB64))
	if !hmac.Equal(gotSig, wantSig) {
		return "", "", "", errors.New("tracking: signature mismatch")
	}
	body, err := base64.RawURLEncoding.DecodeString(bodyB64)
	if err != nil {
		return "", "", "", fmt.Errorf("tracking: bad payload encoding: %w", err)
	}
	var p payload
	if err := json.Unmarshal(body, &p); err != nil {
		return "", "", "", fmt.Errorf("tracking: bad payload: %w", err)
	}
	if s.maxAge > 0 && time.Since(time.Unix(p.IssuedAt, 0)) > s.maxAge {
		return "", "", "", errors.New("tracking: token expired (issued " + strconv.FormatInt(p.IssuedAt, 10) + ")")
	}
	return p.Kind, p.EmailID, p.TenantID, nil
}

func (s *Signer) mac(in []byte) []byte {
	h := hmac.New(sha256.New, s.secret)
	h.Write(in)
	return h.Sum(nil)
}
