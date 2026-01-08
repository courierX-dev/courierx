package email

import (
	"context"
	"testing"
	"time"

	"github.com/courierx/core-go/internal/providers/mock"
)

// TestEmailSender_Send_Success demonstrates basic email sending
func TestEmailSender_Send_Success(t *testing.T) {
	provider := mock.NewMockProvider()
	sender := NewEmailSender(provider)
	ctx := context.Background()

	email := &Email{
		From:    "sender@example.com",
		To:      "recipient@example.com",
		Subject: "Test Email",
		Body:    "This is a test email",
	}

	result, err := sender.Send(ctx, email)

	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	if !result.Success {
		t.Error("Expected success to be true")
	}

	if result.MessageID == "" {
		t.Error("Expected message ID to be set")
	}

	if result.Provider != "mock" {
		t.Errorf("Expected provider 'mock', got: %s", result.Provider)
	}

	// Verify email was sent through provider
	sentEmails := provider.GetSentEmails()
	if len(sentEmails) != 1 {
		t.Fatalf("Expected 1 sent email, got: %d", len(sentEmails))
	}

	sent := sentEmails[0]
	if sent.To != email.To {
		t.Errorf("Expected To: %s, got: %s", email.To, sent.To)
	}
	if sent.Subject != email.Subject {
		t.Errorf("Expected Subject: %s, got: %s", email.Subject, sent.Subject)
	}
}

// TestEmailSender_Send_ValidationError demonstrates validation
func TestEmailSender_Send_ValidationError(t *testing.T) {
	provider := mock.NewMockProvider()
	sender := NewEmailSender(provider)
	ctx := context.Background()

	tests := []struct {
		name    string
		email   *Email
		wantErr string
	}{
		{
			name: "missing from address",
			email: &Email{
				To:      "recipient@example.com",
				Subject: "Test",
				Body:    "Test body",
			},
			wantErr: "from address is required",
		},
		{
			name: "missing to address",
			email: &Email{
				From:    "sender@example.com",
				Subject: "Test",
				Body:    "Test body",
			},
			wantErr: "to address is required",
		},
		{
			name: "invalid from email",
			email: &Email{
				From:    "invalid-email",
				To:      "recipient@example.com",
				Subject: "Test",
				Body:    "Test body",
			},
			wantErr: "invalid from address",
		},
		{
			name: "invalid to email",
			email: &Email{
				From:    "sender@example.com",
				To:      "invalid-email",
				Subject: "Test",
				Body:    "Test body",
			},
			wantErr: "invalid to address",
		},
		{
			name: "missing subject",
			email: &Email{
				From: "sender@example.com",
				To:   "recipient@example.com",
				Body: "Test body",
			},
			wantErr: "subject is required",
		},
		{
			name: "missing body",
			email: &Email{
				From:    "sender@example.com",
				To:      "recipient@example.com",
				Subject: "Test",
			},
			wantErr: "body is required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := sender.Send(ctx, tt.email)

			if err == nil {
				t.Fatal("Expected error, got nil")
			}

			if err.Error() != tt.wantErr {
				t.Errorf("Expected error: %s, got: %s", tt.wantErr, err.Error())
			}
		})
	}
}

// TestEmailSender_Send_ProviderFailure demonstrates error handling
func TestEmailSender_Send_ProviderFailure(t *testing.T) {
	provider := mock.NewMockProvider()
	provider.SetFailure("Service temporarily unavailable")
	sender := NewEmailSender(provider)
	ctx := context.Background()

	email := &Email{
		From:    "sender@example.com",
		To:      "recipient@example.com",
		Subject: "Test",
		Body:    "Test body",
	}

	result, err := sender.Send(ctx, email)

	if err == nil {
		t.Fatal("Expected error, got nil")
	}

	if result != nil {
		t.Error("Expected nil result on error")
	}

	// Verify error message
	expectedErr := "mock provider error: Service temporarily unavailable"
	if err.Error() != expectedErr {
		t.Errorf("Expected error: %s, got: %s", expectedErr, err.Error())
	}
}

// TestEmailSender_Send_WithRetry demonstrates retry logic
func TestEmailSender_Send_WithRetry(t *testing.T) {
	provider := mock.NewMockProvider()
	sender := NewEmailSender(provider, WithMaxRetries(3), WithRetryDelay(10*time.Millisecond))
	ctx := context.Background()

	email := &Email{
		From:    "sender@example.com",
		To:      "recipient@example.com",
		Subject: "Test",
		Body:    "Test body",
	}

	// First 2 attempts fail, 3rd succeeds
	callCount := 0
	provider.SetFailureFunc(func() error {
		callCount++
		if callCount < 3 {
			return fmt.Errorf("temporary failure")
		}
		return nil
	})

	result, err := sender.Send(ctx, email)

	if err != nil {
		t.Fatalf("Expected eventual success, got error: %v", err)
	}

	if !result.Success {
		t.Error("Expected success to be true")
	}

	if callCount != 3 {
		t.Errorf("Expected 3 attempts, got: %d", callCount)
	}
}

// TestEmailSender_Send_Timeout demonstrates timeout handling
func TestEmailSender_Send_Timeout(t *testing.T) {
	provider := mock.NewMockProvider()
	provider.SetDelay(100 * time.Millisecond) // Delay longer than timeout
	sender := NewEmailSender(provider)

	// Create context with short timeout
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Millisecond)
	defer cancel()

	email := &Email{
		From:    "sender@example.com",
		To:      "recipient@example.com",
		Subject: "Test",
		Body:    "Test body",
	}

	_, err := sender.Send(ctx, email)

	if err == nil {
		t.Fatal("Expected timeout error, got nil")
	}

	if err != context.DeadlineExceeded {
		t.Errorf("Expected DeadlineExceeded error, got: %v", err)
	}
}

// TestEmailSender_SendBatch demonstrates batch sending
func TestEmailSender_SendBatch(t *testing.T) {
	provider := mock.NewMockProvider()
	sender := NewEmailSender(provider)
	ctx := context.Background()

	emails := []*Email{
		{
			From:    "sender@example.com",
			To:      "recipient1@example.com",
			Subject: "Test 1",
			Body:    "Body 1",
		},
		{
			From:    "sender@example.com",
			To:      "recipient2@example.com",
			Subject: "Test 2",
			Body:    "Body 2",
		},
		{
			From:    "sender@example.com",
			To:      "recipient3@example.com",
			Subject: "Test 3",
			Body:    "Body 3",
		},
	}

	results, err := sender.SendBatch(ctx, emails)

	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	if len(results) != 3 {
		t.Fatalf("Expected 3 results, got: %d", len(results))
	}

	// Verify all succeeded
	for i, result := range results {
		if !result.Success {
			t.Errorf("Email %d failed to send", i)
		}
	}

	// Verify all emails were sent
	sentEmails := provider.GetSentEmails()
	if len(sentEmails) != 3 {
		t.Fatalf("Expected 3 sent emails, got: %d", len(sentEmails))
	}
}

// TestEmailSender_SendBatch_PartialFailure demonstrates partial batch failure
func TestEmailSender_SendBatch_PartialFailure(t *testing.T) {
	provider := mock.NewMockProvider()
	sender := NewEmailSender(provider)
	ctx := context.Background()

	emails := []*Email{
		{
			From:    "sender@example.com",
			To:      "valid@example.com",
			Subject: "Test 1",
			Body:    "Body 1",
		},
		{
			From:    "sender@example.com",
			To:      "invalid-email", // Invalid
			Subject: "Test 2",
			Body:    "Body 2",
		},
		{
			From:    "sender@example.com",
			To:      "another-valid@example.com",
			Subject: "Test 3",
			Body:    "Body 3",
		},
	}

	results, err := sender.SendBatch(ctx, emails)

	// Batch operations don't fail completely, but track individual failures
	if err != nil {
		t.Fatalf("Unexpected batch error: %v", err)
	}

	if len(results) != 3 {
		t.Fatalf("Expected 3 results, got: %d", len(results))
	}

	// Check individual results
	if !results[0].Success {
		t.Error("First email should have succeeded")
	}
	if results[1].Success {
		t.Error("Second email should have failed (invalid address)")
	}
	if !results[2].Success {
		t.Error("Third email should have succeeded")
	}
}

// BenchmarkEmailSender_Send benchmarks email sending performance
func BenchmarkEmailSender_Send(b *testing.B) {
	provider := mock.NewMockProvider()
	sender := NewEmailSender(provider)
	ctx := context.Background()

	email := &Email{
		From:    "sender@example.com",
		To:      "recipient@example.com",
		Subject: "Benchmark Test",
		Body:    "This is a benchmark test email",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := sender.Send(ctx, email)
		if err != nil {
			b.Fatalf("Unexpected error: %v", err)
		}
	}
}

// BenchmarkEmailSender_SendBatch benchmarks batch sending
func BenchmarkEmailSender_SendBatch(b *testing.B) {
	provider := mock.NewMockProvider()
	sender := NewEmailSender(provider)
	ctx := context.Background()

	// Create batch of 100 emails
	emails := make([]*Email, 100)
	for i := 0; i < 100; i++ {
		emails[i] = &Email{
			From:    "sender@example.com",
			To:      fmt.Sprintf("recipient%d@example.com", i),
			Subject: fmt.Sprintf("Test %d", i),
			Body:    "Test body",
		}
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := sender.SendBatch(ctx, emails)
		if err != nil {
			b.Fatalf("Unexpected error: %v", err)
		}
		provider.Reset()
	}
}
