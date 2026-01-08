# Test Examples Reference

Complete reference for all example tests included in the CourierX codebase.

## Overview

This repository includes comprehensive example tests that demonstrate best practices and serve as templates for writing your own tests. All tests follow industry standards and CourierX coding conventions.

---

## Rails Test Examples

### 1. Model Testing
**File**: `control-plane/spec/models/tenant_spec.rb` (145 lines)

**What it demonstrates:**
- ✅ Validation testing with Shoulda Matchers
- ✅ Association testing (has_many, belongs_to, dependent: destroy)
- ✅ Scope testing (active, not_deleted)
- ✅ Instance method testing (soft_delete, activate, suspend)
- ✅ Complex business logic testing
- ✅ Encryption testing for sensitive fields
- ✅ Timestamp tracking (created_at, updated_at, deleted_at)

**Key patterns:**
```ruby
# Validations
it { should validate_presence_of(:name) }
it { should validate_uniqueness_of(:slug) }

# Associations
it { should have_many(:users).dependent(:destroy) }

# Scopes
describe '.active' do
  it 'returns only active tenants' do
    active = create(:tenant, status: 'active')
    create(:tenant, status: 'deleted')
    expect(Tenant.active).to contain_exactly(active)
  end
end

# Methods
describe '#soft_delete' do
  it 'marks tenant as deleted' do
    tenant.soft_delete
    expect(tenant.status).to eq('deleted')
    expect(tenant.deleted_at).to be_present
  end
end
```

---

### 2. API Endpoint Testing
**File**: `control-plane/spec/requests/api/v1/products_spec.rb` (350+ lines)

**What it demonstrates:**
- ✅ JWT authentication testing
- ✅ API key authentication testing
- ✅ CRUD operations (Create, Read, Update, Delete)
- ✅ Pagination testing
- ✅ Filtering and search
- ✅ Permission checking (RBAC - owner, admin, member)
- ✅ Error handling (404, 401, 403, 422)
- ✅ Rate limiting
- ✅ JSON response parsing
- ✅ Soft delete verification

**Key patterns:**
```ruby
describe 'GET /api/v1/products' do
  let(:user) { create(:user) }
  let(:headers) { auth_headers(user) }

  it 'returns products for authenticated tenant' do
    create_list(:product, 3, tenant: user.tenant)

    get '/api/v1/products', headers: headers

    expect(response).to have_http_status(:ok)
    expect(json_response[:data].length).to eq(3)
  end

  it 'requires authentication' do
    get '/api/v1/products'

    expect(response).to have_http_status(:unauthorized)
    expect(json_response[:error]).to eq('Missing or invalid token')
  end
end

describe 'POST /api/v1/products' do
  it 'creates a new product' do
    expect {
      post '/api/v1/products', headers: headers, params: valid_params, as: :json
    }.to change(Product, :count).by(1)

    expect(response).to have_http_status(:created)
  end

  it 'requires owner or admin role' do
    member = create(:user, role: 'member')
    post '/api/v1/products', headers: auth_headers(member), params: valid_params

    expect(response).to have_http_status(:forbidden)
  end
end
```

---

### 3. Service Object Testing
**File**: `control-plane/spec/services/jwt_service_spec.rb` (150+ lines)

**What it demonstrates:**
- ✅ Service object pattern testing
- ✅ JWT encoding/decoding
- ✅ Token expiration testing
- ✅ Security testing (signature verification, tampering detection)
- ✅ Error handling (expired tokens, invalid tokens)
- ✅ Token refresh functionality
- ✅ Custom payload data

**Key patterns:**
```ruby
describe '.encode' do
  it 'generates a valid JWT token' do
    token = JwtService.encode(payload)

    expect(token).to be_a(String)
    expect(token.split('.').length).to eq(3)
  end

  it 'sets expiration to 24 hours by default' do
    token = JwtService.encode(payload)
    decoded = JwtService.decode(token)

    expected_exp = 24.hours.from_now.to_i
    expect(decoded[:exp]).to be_within(5).of(expected_exp)
  end
end

describe '.decode' do
  it 'raises error for expired token' do
    token = JwtService.encode(payload, exp: 1.second.ago)

    expect {
      JwtService.decode(token)
    }.to raise_error(JWT::ExpiredSignature)
  end
end
```

---

### 4. Integration Testing
**File**: `control-plane/spec/integration/email_sending_flow_spec.rb` (450+ lines)

**What it demonstrates:**
- ✅ Complete system flow testing (Rails → Go → Provider → Webhooks)
- ✅ HTTP stubbing with WebMock
- ✅ Background job testing (perform_enqueued_jobs)
- ✅ Multi-step workflow verification
- ✅ Webhook signature verification
- ✅ Event tracking and logging
- ✅ Retry logic with exponential backoff
- ✅ Rate limiting enforcement
- ✅ Provider failure handling
- ✅ Tenant suspension checks

**Key patterns:**
```ruby
describe 'complete email sending flow' do
  before do
    # Stub external Go Core API
    stub_request(:post, "#{ENV['GO_CORE_URL']}/api/send")
      .to_return(status: 200, body: { message_id: 'msg_123' }.to_json)
  end

  it 'successfully sends an email through the complete system' do
    # Step 1: Send API request
    post '/api/v1/messages', headers: api_key_headers, params: email_params

    expect(response).to have_http_status(:accepted)
    message_id = json_response[:data][:id]

    # Step 2: Process background job
    perform_enqueued_jobs { SendEmailJob.perform_later(message_id) }

    # Step 3: Verify Go Core was called
    expect(WebMock).to have_requested(:post, "#{ENV['GO_CORE_URL']}/api/send")

    # Step 4: Verify status updated
    message = Message.find(message_id)
    expect(message.status).to eq('sent')
    expect(message.provider_message_id).to eq('msg_123')
  end

  it 'handles provider failure gracefully' do
    stub_request(:post, "#{ENV['GO_CORE_URL']}/api/send")
      .to_return(status: 500)

    post '/api/v1/messages', headers: api_key_headers, params: email_params
    perform_enqueued_jobs { SendEmailJob.perform_later(json_response[:data][:id]) }

    message = Message.find(json_response[:data][:id])
    expect(message.status).to eq('failed')
  end
end
```

---

## Go Test Examples

### 1. Email Sender Testing
**File**: `apps/core-go/internal/email/sender_test.go` (400+ lines)

**What it demonstrates:**
- ✅ Basic email sending with mock provider
- ✅ Validation testing (missing fields, invalid emails)
- ✅ Error handling and provider failures
- ✅ Retry logic with configurable attempts
- ✅ Timeout handling with context
- ✅ Batch sending operations
- ✅ Partial batch failure handling
- ✅ Benchmarking email operations
- ✅ Table-driven tests for validation
- ✅ Mock provider configuration

**Key patterns:**
```go
func TestEmailSender_Send_Success(t *testing.T) {
    provider := mock.NewMockProvider()
    sender := NewEmailSender(provider)
    ctx := context.Background()

    email := &Email{
        From:    "sender@example.com",
        To:      "recipient@example.com",
        Subject: "Test",
        Body:    "Test body",
    }

    result, err := sender.Send(ctx, email)

    if err != nil {
        t.Fatalf("Expected no error, got: %v", err)
    }

    sentEmails := provider.GetSentEmails()
    if len(sentEmails) != 1 {
        t.Fatalf("Expected 1 sent email, got: %d", len(sentEmails))
    }
}

// Table-driven validation tests
func TestEmailSender_Send_ValidationError(t *testing.T) {
    tests := []struct {
        name    string
        email   *Email
        wantErr string
    }{
        {"missing from", &Email{To: "..."}, "from address is required"},
        {"invalid email", &Email{From: "invalid"}, "invalid from address"},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            _, err := sender.Send(ctx, tt.email)
            if err == nil || err.Error() != tt.wantErr {
                t.Errorf("Expected error: %s, got: %v", tt.wantErr, err)
            }
        })
    }
}

// Timeout testing
func TestEmailSender_Send_Timeout(t *testing.T) {
    provider := mock.NewMockProvider()
    provider.SetDelay(100 * time.Millisecond)

    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Millisecond)
    defer cancel()

    _, err := sender.Send(ctx, email)
    if err != context.DeadlineExceeded {
        t.Errorf("Expected DeadlineExceeded, got: %v", err)
    }
}

// Benchmarking
func BenchmarkEmailSender_Send(b *testing.B) {
    provider := mock.NewMockProvider()
    sender := NewEmailSender(provider)

    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        sender.Send(ctx, email)
    }
}
```

---

### 2. Mock Provider Testing
**File**: `apps/core-go/internal/providers/mock/mock_provider_test.go` (150+ lines)

**What it demonstrates:**
- ✅ Mock provider functionality
- ✅ Configurable failures
- ✅ Configurable delays
- ✅ Email tracking and verification
- ✅ Health check testing
- ✅ Reset functionality
- ✅ Multiple send tracking

**Key patterns:**
```go
func TestMockProvider_Send_Success(t *testing.T) {
    provider := NewMockProvider()

    result, err := provider.Send(ctx, email)

    if err != nil || !result.Success {
        t.Error("Expected successful send")
    }
}

func TestMockProvider_Send_WithFailure(t *testing.T) {
    provider := NewMockProvider()
    provider.SetFailure("Service unavailable")

    _, err := provider.Send(ctx, email)

    if err == nil {
        t.Error("Expected error")
    }
}

func TestMockProvider_Reset(t *testing.T) {
    provider := NewMockProvider()
    provider.Send(ctx, email)
    provider.Send(ctx, email)

    provider.Reset()

    if len(provider.GetSentEmails()) != 0 {
        t.Error("Expected empty sent emails after reset")
    }
}
```

---

## Test Helpers and Utilities

### Rails Test Helpers
**File**: `control-plane/spec/support/request_spec_helper.rb`

**Available helpers:**
```ruby
# JWT authentication
headers = auth_headers(user)

# API key authentication
headers = api_key_headers(product)

# Parse JSON response
data = json_response
expect(json_response[:data]).to be_present
```

### Go Test Helpers
**File**: `apps/core-go/testhelpers/testhelpers.go`

**Available helpers:**
```go
// Assert no error
testhelpers.AssertNoError(t, err)

// Assert equal
testhelpers.AssertEqual(t, expected, actual)

// Create test email
email := testhelpers.NewTestEmail()
```

---

## Factories

### Rails Factories
**Location**: `control-plane/spec/factories/`

**Available factories:**

#### Tenants
```ruby
# Basic tenant
tenant = create(:tenant)

# With associations
tenant = create(:tenant, :with_users, :with_products)

# Suspended tenant
tenant = create(:tenant, :suspended)

# Deleted tenant
tenant = create(:tenant, :deleted)
```

#### Users
```ruby
# Basic user
user = create(:user)

# With role
owner = create(:user, :owner)
admin = create(:user, :admin)
member = create(:user, :member)

# With specific tenant
user = create(:user, tenant: my_tenant)
```

#### Products
```ruby
# Basic product
product = create(:product)

# With API key
product = create(:product, :with_api_key)

# Inactive product
product = create(:product, :inactive)
```

---

## Running the Example Tests

### Rails
```bash
# All example tests
bundle exec rspec spec/models/tenant_spec.rb
bundle exec rspec spec/requests/api/v1/products_spec.rb
bundle exec rspec spec/services/jwt_service_spec.rb
bundle exec rspec spec/integration/email_sending_flow_spec.rb

# All tests
bundle exec rspec
```

### Go
```bash
# Email sender tests
go test ./internal/email/... -v

# Mock provider tests
go test ./internal/providers/mock/... -v

# All tests
go test ./... -v

# With coverage
go test ./... -cover

# Benchmarks
go test ./internal/email/... -bench=.
```

---

## Test Coverage

All example tests are written to achieve high coverage:

- **Rails**: >80% overall, >90% critical paths
- **Go**: >80% overall, >90% critical paths

Run coverage reports:
```bash
# Rails
COVERAGE=true bundle exec rspec
open coverage/index.html

# Go
go test ./... -coverprofile=coverage.out
go tool cover -html=coverage.out
```

---

## Best Practices Demonstrated

1. ✅ **Clear test names**: Describe what is being tested
2. ✅ **Arrange-Act-Assert pattern**: Clear test structure
3. ✅ **One assertion per test**: Focused tests
4. ✅ **Use factories**: Flexible test data
5. ✅ **Mock external services**: Fast, reliable tests
6. ✅ **Test edge cases**: Not just happy paths
7. ✅ **Table-driven tests**: Efficient testing (Go)
8. ✅ **Context usage**: Proper cancellation and timeouts (Go)
9. ✅ **Benchmarking**: Performance testing (Go)

---

## Additional Resources

- **Rails Testing Guide**: `control-plane/spec/README.md`
- **Go Testing Guide**: `apps/core-go/internal/email/README.md`
- **Main Testing Guide**: `TESTING.md`
- **Infrastructure Guide**: `INFRASTRUCTURE.md`

---

## Need Help?

All example tests include detailed comments explaining:
- What is being tested
- Why it's important
- How to adapt for your use case

Start with the example closest to what you're implementing, then customize!
