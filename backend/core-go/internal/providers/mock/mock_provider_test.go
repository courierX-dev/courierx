package mock

import (
	"context"
	"testing"
	"time"
)

func TestMockProvider_Send_Success(t *testing.T) {
	provider := NewMockProvider()
	ctx := context.Background()

	email := &Email{
		From:     "sender@example.com",
		To:       "recipient@example.com",
		Subject:  "Test Email",
		HTMLBody: "<p>Hello World</p>",
	}

	result, err := provider.Send(ctx, email)

	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	if !result.Success {
		t.Error("Expected success to be true")
	}

	if result.Provider != "mock" {
		t.Errorf("Expected provider to be 'mock', got: %s", result.Provider)
	}

	if len(provider.SentEmails) != 1 {
		t.Errorf("Expected 1 sent email, got: %d", len(provider.SentEmails))
	}

	sentEmail := provider.GetLastSentEmail()
	if sentEmail.Subject != "Test Email" {
		t.Errorf("Expected subject 'Test Email', got: %s", sentEmail.Subject)
	}
}

func TestMockProvider_Send_Failure(t *testing.T) {
	provider := NewMockProvider()
	provider.SetFailure("Intentional failure")
	ctx := context.Background()

	email := &Email{
		From:    "sender@example.com",
		To:      "recipient@example.com",
		Subject: "Test Email",
	}

	result, err := provider.Send(ctx, email)

	if err == nil {
		t.Fatal("Expected error, got nil")
	}

	if result != nil {
		t.Error("Expected result to be nil on failure")
	}

	if len(provider.SentEmails) != 0 {
		t.Errorf("Expected 0 sent emails on failure, got: %d", len(provider.SentEmails))
	}
}

func TestMockProvider_Send_WithDelay(t *testing.T) {
	provider := NewMockProvider()
	provider.SetDelay(100 * time.Millisecond)
	ctx := context.Background()

	email := &Email{
		From: "sender@example.com",
		To:   "recipient@example.com",
	}

	start := time.Now()
	_, err := provider.Send(ctx, email)
	elapsed := time.Since(start)

	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	if elapsed < 100*time.Millisecond {
		t.Errorf("Expected delay of at least 100ms, got: %v", elapsed)
	}
}

func TestMockProvider_HealthCheck_Success(t *testing.T) {
	provider := NewMockProvider()
	ctx := context.Background()

	err := provider.HealthCheck(ctx)

	if err != nil {
		t.Errorf("Expected no error, got: %v", err)
	}
}

func TestMockProvider_HealthCheck_Failure(t *testing.T) {
	provider := NewMockProvider()
	provider.HealthCheckFail = true
	ctx := context.Background()

	err := provider.HealthCheck(ctx)

	if err == nil {
		t.Error("Expected health check to fail, got nil error")
	}
}

func TestMockProvider_Reset(t *testing.T) {
	provider := NewMockProvider()
	provider.SetFailure("test failure")
	provider.SetDelay(time.Second)

	// Send an email
	ctx := context.Background()
	provider.ShouldFail = false // temporarily disable failure
	email := &Email{From: "test@example.com", To: "user@example.com"}
	provider.Send(ctx, email)

	if len(provider.SentEmails) != 1 {
		t.Fatal("Expected 1 sent email before reset")
	}

	// Reset
	provider.Reset()

	if len(provider.SentEmails) != 0 {
		t.Errorf("Expected 0 sent emails after reset, got: %d", len(provider.SentEmails))
	}

	if provider.ShouldFail {
		t.Error("Expected ShouldFail to be false after reset")
	}

	if provider.Delay != 0 {
		t.Error("Expected Delay to be 0 after reset")
	}
}

func TestMockProvider_MultipleSends(t *testing.T) {
	provider := NewMockProvider()
	ctx := context.Background()

	// Send 3 emails
	for i := 0; i < 3; i++ {
		email := &Email{
			From:    "sender@example.com",
			To:      "recipient@example.com",
			Subject: "Test Email",
		}
		provider.Send(ctx, email)
	}

	if len(provider.GetSentEmails()) != 3 {
		t.Errorf("Expected 3 sent emails, got: %d", len(provider.GetSentEmails()))
	}
}
