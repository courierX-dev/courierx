# Email Package

High-performance email sending engine for CourierX.

## Overview

This package handles all email sending operations, including:
- Email validation
- Provider abstraction
- Retry logic with exponential backoff
- Batch sending
- Rate limiting
- Metrics and logging

## Architecture

```
email/
├── sender.go          # Main email sender implementation
├── sender_test.go     # Comprehensive test suite
├── validator.go       # Email validation
├── types.go          # Email types and interfaces
└── README.md         # This file
```

## Testing

### Running Tests

```bash
# All tests
go test ./internal/email/...

# Verbose output
go test -v ./internal/email/...

# With coverage
go test -cover ./internal/email/...

# Coverage report (HTML)
go test -coverprofile=coverage.out ./internal/email/...
go tool cover -html=coverage.out

# Race detector
go test -race ./internal/email/...

# Benchmarks
go test -bench=. ./internal/email/...
```

### Test Examples

We've included a comprehensive test suite in `sender_test.go` that demonstrates:

#### Basic Email Sending
```go
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
    // Assertions...
}
```

#### Validation Testing
```go
func TestEmailSender_Send_ValidationError(t *testing.T) {
    tests := []struct {
        name    string
        email   *Email
        wantErr string
    }{
        {"missing from", &Email{To: "..."}, "from address is required"},
        {"invalid email", &Email{From: "invalid"}, "invalid from address"},
    }
    // Table-driven tests...
}
```

#### Error Handling
```go
func TestEmailSender_Send_ProviderFailure(t *testing.T) {
    provider := mock.NewMockProvider()
    provider.SetFailure("Service unavailable")
    // Test error handling...
}
```

#### Retry Logic
```go
func TestEmailSender_Send_WithRetry(t *testing.T) {
    sender := NewEmailSender(provider,
        WithMaxRetries(3),
        WithRetryDelay(10*time.Millisecond))
    // Test retry behavior...
}
```

#### Timeout Handling
```go
func TestEmailSender_Send_Timeout(t *testing.T) {
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Millisecond)
    defer cancel()
    // Test timeout behavior...
}
```

#### Batch Sending
```go
func TestEmailSender_SendBatch(t *testing.T) {
    emails := []*Email{...}
    results, err := sender.SendBatch(ctx, emails)
    // Verify batch results...
}
```

#### Benchmarks
```go
func BenchmarkEmailSender_Send(b *testing.B) {
    for i := 0; i < b.N; i++ {
        sender.Send(ctx, email)
    }
}
```

## Writing Tests

### Using the Mock Provider

The mock provider (`internal/providers/mock`) is designed for testing:

```go
// Create mock provider
provider := mock.NewMockProvider()
sender := NewEmailSender(provider)

// Configure failure
provider.SetFailure("Service unavailable")

// Configure delay
provider.SetDelay(100 * time.Millisecond)

// Send email
result, err := sender.Send(ctx, email)

// Verify sent emails
emails := provider.GetSentEmails()
lastEmail := provider.GetLastSentEmail()

// Reset for next test
provider.Reset()
```

### Table-Driven Tests

Use table-driven tests for validation and edge cases:

```go
tests := []struct {
    name    string
    email   *Email
    wantErr bool
    errMsg  string
}{
    {"valid email", validEmail(), false, ""},
    {"missing from", emailWithoutFrom(), true, "from required"},
    {"invalid format", invalidEmail(), true, "invalid format"},
}

for _, tt := range tests {
    t.Run(tt.name, func(t *testing.T) {
        err := validateEmail(tt.email)
        if (err != nil) != tt.wantErr {
            t.Errorf("got error = %v, wantErr %v", err, tt.wantErr)
        }
    })
}
```

### Testing with Context

Always test context cancellation and timeouts:

```go
func TestWithCancellation(t *testing.T) {
    ctx, cancel := context.WithCancel(context.Background())

    // Start operation
    go sender.Send(ctx, email)

    // Cancel immediately
    cancel()

    // Verify operation was cancelled
    // ...
}
```

## Best Practices

1. **Always use context**: Pass `context.Context` to all operations
   ```go
   result, err := sender.Send(ctx, email)
   ```

2. **Handle timeouts**: Set reasonable timeouts for operations
   ```go
   ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
   defer cancel()
   ```

3. **Use mock provider in tests**: Never make real API calls in tests
   ```go
   provider := mock.NewMockProvider()
   ```

4. **Test error paths**: Don't just test happy paths
   ```go
   provider.SetFailure("error message")
   _, err := sender.Send(ctx, email)
   // Verify error handling
   ```

5. **Use table-driven tests**: Test multiple scenarios efficiently
   ```go
   tests := []struct{ name string; input Email; want Result }{ ... }
   ```

6. **Write benchmarks**: Measure performance for critical paths
   ```go
   func BenchmarkOperation(b *testing.B) { ... }
   ```

7. **Test concurrency**: Use `-race` flag to detect race conditions
   ```bash
   go test -race ./...
   ```

## Coverage Goals

- **Overall coverage**: >80%
- **Critical paths**: >90%
- **New code**: 100% (all new code should have tests)

## Example Usage

### Basic Send

```go
sender := email.NewEmailSender(provider)

email := &email.Email{
    From:    "sender@example.com",
    To:      "recipient@example.com",
    Subject: "Hello",
    Body:    "Hello, World!",
    HTML:    "<p>Hello, World!</p>",
}

result, err := sender.Send(context.Background(), email)
if err != nil {
    log.Printf("Failed to send: %v", err)
    return
}

log.Printf("Sent! Message ID: %s", result.MessageID)
```

### Batch Send

```go
emails := []*email.Email{
    {From: "...", To: "user1@example.com", ...},
    {From: "...", To: "user2@example.com", ...},
    {From: "...", To: "user3@example.com", ...},
}

results, err := sender.SendBatch(context.Background(), emails)
if err != nil {
    log.Printf("Batch failed: %v", err)
    return
}

for i, result := range results {
    if result.Success {
        log.Printf("Email %d sent: %s", i, result.MessageID)
    } else {
        log.Printf("Email %d failed: %s", i, result.Error)
    }
}
```

### With Retry

```go
sender := email.NewEmailSender(
    provider,
    email.WithMaxRetries(3),
    email.WithRetryDelay(1*time.Second),
    email.WithRetryBackoff(2.0), // Exponential backoff multiplier
)

result, err := sender.Send(ctx, email)
```

### With Timeout

```go
ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()

result, err := sender.Send(ctx, email)
```

## Integration with Providers

The email sender works with any provider that implements the `Provider` interface:

```go
type Provider interface {
    Send(ctx context.Context, email *Email) (*SendResult, error)
    HealthCheck(ctx context.Context) error
    Name() string
}
```

### Available Providers

- **Mock Provider** (`internal/providers/mock`): For testing
- **AWS SES** (Milestone 2): Production email sending
- **SendGrid** (Milestone 3): Alternative provider
- **Mailgun** (Milestone 3): Alternative provider

## Metrics and Monitoring

(Coming in Milestone 3)

The email sender will emit metrics for:
- Send success/failure rates
- Send duration (p50, p95, p99)
- Retry counts
- Provider performance
- Queue depth

## Additional Resources

- [Go Testing Documentation](https://golang.org/pkg/testing/)
- [Table-Driven Tests in Go](https://go.dev/blog/table-driven-tests)
- [Benchmarking in Go](https://golang.org/pkg/testing/#hdr-Benchmarks)
- [TESTING.md](../../../TESTING.md) - Complete testing guide
- [Provider Documentation](../providers/README.md) - Provider implementation guide
