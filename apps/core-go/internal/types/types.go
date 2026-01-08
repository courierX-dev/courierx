package types

import "time"

// SendRequest represents an email send request
type SendRequest struct {
	From        string                 `json:"from"`
	To          string                 `json:"to"`
	Subject     string                 `json:"subject"`
	HTML        string                 `json:"html"`
	Text        string                 `json:"text"`
	ReplyTo     string                 `json:"replyTo"`
	CC          []string               `json:"cc"`
	BCC         []string               `json:"bcc"`
	Attachments []Attachment           `json:"attachments"`
	Variables   map[string]interface{} `json:"variables"`
}

// Attachment represents an email attachment
type Attachment struct {
	Filename    string `json:"filename"`
	Content     string `json:"content"`
	ContentType string `json:"contentType"`
}

// SendResponse represents the API response
type SendResponse struct {
	Success   bool   `json:"success"`
	MessageID string `json:"messageId"`
	Provider  string `json:"provider"`
	Error     string `json:"error,omitempty"`
}

// BulkSendRequest represents a bulk send request
type BulkSendRequest struct {
	From       string      `json:"from"`
	Subject    string      `json:"subject"`
	HTML       string      `json:"html"`
	Text       string      `json:"text"`
	Recipients []Recipient `json:"recipients"`
}

// Recipient represents a single recipient in a bulk send
type Recipient struct {
	Email     string                 `json:"email"`
	Variables map[string]interface{} `json:"variables"`
}

// ProviderType represents supported provider types
type ProviderType string

const (
	ProviderSendGrid ProviderType = "sendgrid"
	ProviderMailgun  ProviderType = "mailgun"
	ProviderSES      ProviderType = "ses"
	ProviderSMTP     ProviderType = "smtp"
	ProviderMock     ProviderType = "mock"
)

// ProviderConfig represents provider configuration
type ProviderConfig struct {
	Type   ProviderType           `json:"type"`
	Config map[string]interface{} `json:"config"`
}

// Route represents a provider route
type Route struct {
	Priority int            `json:"priority"`
	Role     string         `json:"role"`
	Provider ProviderConfig `json:"provider"`
}

// Message represents a stored message
type Message struct {
	ID           string    `json:"id"`
	TenantID     string    `json:"tenantId"`
	ProductID    string    `json:"productId"`
	ToEmail      string    `json:"toEmail"`
	Subject      string    `json:"subject"`
	ProviderUsed string    `json:"providerUsed"`
	CreatedAt    time.Time `json:"createdAt"`
}
