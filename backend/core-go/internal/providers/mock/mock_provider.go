package mock

import (
	"context"
	"fmt"
	"time"
)

// Email represents an email to be sent
type Email struct {
	From     string
	To       string
	Subject  string
	HTMLBody string
	TextBody string
}

// SendResult represents the result of sending an email
type SendResult struct {
	MessageID string
	Provider  string
	Success   bool
	Error     error
}

// MockProvider is a mock email provider for testing
type MockProvider struct {
	ShouldFail      bool
	FailureMessage  string
	Delay           time.Duration
	SentEmails      []*Email
	HealthCheckFail bool
}

// NewMockProvider creates a new mock provider
func NewMockProvider() *MockProvider {
	return &MockProvider{
		SentEmails: make([]*Email, 0),
	}
}

// Send simulates sending an email
func (p *MockProvider) Send(ctx context.Context, email *Email) (*SendResult, error) {
	// Simulate delay if configured
	if p.Delay > 0 {
		time.Sleep(p.Delay)
	}

	// Check for failure scenario
	if p.ShouldFail {
		return nil, fmt.Errorf("mock provider error: %s", p.FailureMessage)
	}

	// Store the email
	p.SentEmails = append(p.SentEmails, email)

	// Return success result
	return &SendResult{
		MessageID: fmt.Sprintf("mock-%d", time.Now().UnixNano()),
		Provider:  "mock",
		Success:   true,
		Error:     nil,
	}, nil
}

// HealthCheck simulates a health check
func (p *MockProvider) HealthCheck(ctx context.Context) error {
	if p.HealthCheckFail {
		return fmt.Errorf("mock health check failed")
	}
	return nil
}

// Name returns the provider name
func (p *MockProvider) Name() string {
	return "mock"
}

// Reset clears sent emails and resets configuration
func (p *MockProvider) Reset() {
	p.SentEmails = make([]*Email, 0)
	p.ShouldFail = false
	p.FailureMessage = ""
	p.Delay = 0
	p.HealthCheckFail = false
}

// GetSentEmails returns all sent emails
func (p *MockProvider) GetSentEmails() []*Email {
	return p.SentEmails
}

// GetLastSentEmail returns the last sent email or nil
func (p *MockProvider) GetLastSentEmail() *Email {
	if len(p.SentEmails) == 0 {
		return nil
	}
	return p.SentEmails[len(p.SentEmails)-1]
}

// SetFailure configures the mock to fail
func (p *MockProvider) SetFailure(message string) {
	p.ShouldFail = true
	p.FailureMessage = message
}

// SetDelay configures send delay
func (p *MockProvider) SetDelay(delay time.Duration) {
	p.Delay = delay
}
