package types

import "time"

// SendRequest represents an email send request from the Control Plane.
type SendRequest struct {
	From           string                 `json:"from"`
	To             string                 `json:"to"`
	Subject        string                 `json:"subject"`
	HTML           string                 `json:"html"`
	Text           string                 `json:"text"`
	ReplyTo        string                 `json:"replyTo,omitempty"`
	CC             []string               `json:"cc,omitempty"`
	BCC            []string               `json:"bcc,omitempty"`
	Attachments    []Attachment           `json:"attachments,omitempty"`
	Variables      map[string]interface{} `json:"variables,omitempty"`
	Tags           []string               `json:"tags,omitempty"`
	IdempotencyKey string                 `json:"idempotencyKey,omitempty"`
	Metadata       map[string]string      `json:"metadata,omitempty"`
	ProjectID      string                 `json:"projectId,omitempty"`
	TenantID       string                 `json:"tenantId,omitempty"`
	// Providers overrides the global provider chain for this request.
	// Set by the Control Plane to pass per-tenant BYOK provider credentials.
	// When empty the handler falls back to the globally configured provider chain.
	Providers []Route `json:"providers,omitempty"`
}

// Attachment represents a file attachment (content is base64-encoded).
type Attachment struct {
	Filename    string `json:"filename"`
	Content     string `json:"content"`     // base64-encoded bytes
	ContentType string `json:"contentType"` // e.g. "application/pdf"
}

// SendResponse represents the API response for a single send.
type SendResponse struct {
	Success    bool   `json:"success"`
	MessageID  string `json:"messageId,omitempty"`
	Provider   string `json:"provider,omitempty"`
	Error      string `json:"error,omitempty"`
	Idempotent bool   `json:"idempotent,omitempty"` // true = served from idempotency cache
	DurationMs int64  `json:"durationMs,omitempty"`
}

// BulkSendRequest represents a batch send request (up to 1,000 recipients).
type BulkSendRequest struct {
	From       string      `json:"from"`
	Subject    string      `json:"subject"`
	HTML       string      `json:"html"`
	Text       string      `json:"text"`
	ReplyTo    string      `json:"replyTo,omitempty"`
	Recipients []Recipient `json:"recipients"`
	Tags       []string    `json:"tags,omitempty"`
	ProjectID  string      `json:"projectId,omitempty"`
	TenantID   string      `json:"tenantId,omitempty"`
	// Providers overrides the global provider chain for this batch.
	Providers []Route `json:"providers,omitempty"`
}

// BulkSendResponse is the envelope returned for batch sends.
type BulkSendResponse struct {
	Success      bool           `json:"success"`
	Total        int            `json:"total"`
	SuccessCount int            `json:"successCount"`
	FailureCount int            `json:"failureCount"`
	Results      []SendResponse `json:"results"`
}

// Recipient represents a single recipient in a batch send.
type Recipient struct {
	Email     string                 `json:"email"`
	Variables map[string]interface{} `json:"variables,omitempty"`
}

// ProviderType is the name of a supported email provider.
type ProviderType string

const (
	ProviderSendGrid ProviderType = "sendgrid"
	ProviderMailgun  ProviderType = "mailgun"
	ProviderSES      ProviderType = "ses"
	ProviderSMTP     ProviderType = "smtp"
	ProviderPostmark ProviderType = "postmark"
	ProviderResend   ProviderType = "resend"
	ProviderMock     ProviderType = "mock"
)

// ProviderConfig carries the type and credential map for a provider.
type ProviderConfig struct {
	Type   ProviderType           `json:"type"`
	Config map[string]interface{} `json:"config"`
}

// Route is one entry in the failover chain, ordered by Priority (ascending).
type Route struct {
	Priority int            `json:"priority"`
	Role     string         `json:"role"` // "primary" | "fallback"
	Provider ProviderConfig `json:"provider"`
}

// Message is a stored delivery record written to the database.
type Message struct {
	ID             string            `json:"id"`
	TenantID       string            `json:"tenantId"`
	ProjectID      string            `json:"projectId"`
	ToEmail        string            `json:"toEmail"`
	FromEmail      string            `json:"fromEmail"`
	Subject        string            `json:"subject"`
	BodyHTML       string            `json:"bodyHtml,omitempty"`
	BodyText       string            `json:"bodyText,omitempty"`
	ProviderUsed   string            `json:"providerUsed"`
	Status         string            `json:"status"` // "sent" | "failed"
	Tags           []string          `json:"tags,omitempty"`
	Metadata       map[string]string `json:"metadata,omitempty"`
	IdempotencyKey string            `json:"idempotencyKey,omitempty"`
	DurationMs     int64             `json:"durationMs"`
	CreatedAt      time.Time         `json:"createdAt"`
}

// ProviderStats holds per-provider aggregate metrics.
type ProviderStats struct {
	Provider     string  `json:"provider"`
	Sent         int64   `json:"sent"`
	Failed       int64   `json:"failed"`
	AvgLatencyMs float64 `json:"avgLatencyMs"`
}
