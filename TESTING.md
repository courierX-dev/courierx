# CourierX Testing Guide

Comprehensive testing infrastructure for CourierX.

## Quick Start - Example Tests Available! 🎯

We've created comprehensive example tests to help you get started quickly:

**Rails Examples:**
- `control-plane/spec/models/tenant_spec.rb` - Complete model testing example
- `control-plane/spec/requests/api/v1/products_spec.rb` - API endpoint testing example
- `control-plane/spec/services/jwt_service_spec.rb` - Service object testing example
- `control-plane/spec/integration/email_sending_flow_spec.rb` - Full system integration test
- `control-plane/spec/README.md` - Complete Rails testing guide

**Go Examples:**
- `apps/core-go/internal/email/sender_test.go` - Comprehensive Go testing examples
- `apps/core-go/internal/providers/mock/mock_provider_test.go` - Mock provider tests
- `apps/core-go/internal/email/README.md` - Go testing guide with examples

These files demonstrate best practices and can be used as templates for writing your own tests.

---

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Rails Testing](#rails-testing)
3. [Go Testing](#go-testing)
4. [Load Testing](#load-testing)
5. [Integration Testing](#integration-testing)
6. [Development Tools](#development-tools)
7. [CI/CD](#cicd)

---

## Testing Philosophy

**Test Coverage Goals:**
- Unit tests: >80% coverage
- Critical paths: >90% coverage
- Integration tests for all API endpoints
- Load tests before major releases

**Testing Pyramid:**
```
        /\
       /  \     E2E Tests (Few)
      /----\
     /      \   Integration Tests (Some)
    /--------\
   /          \ Unit Tests (Many)
  /____________\
```

---

## Rails Testing

### Setup

```bash
cd control-plane

# Install test dependencies
bundle install

# Set up test database
RAILS_ENV=test bundle exec rails db:create db:schema:load

# Run tests
bundle exec rspec
```

### Test Structure

```
spec/
├── models/           # Model tests
├── controllers/      # Controller tests
├── requests/         # Request specs (API endpoints)
├── services/         # Service object tests
├── jobs/            # Background job tests
├── integration/     # Integration tests
├── factories/       # FactoryBot factories
└── support/         # Test helpers
```

### Running Tests

```bash
# All tests
bundle exec rspec

# Specific file
bundle exec rspec spec/models/tenant_spec.rb

# Specific test
bundle exec rspec spec/models/tenant_spec.rb:10

# With coverage
COVERAGE=true bundle exec rspec

# Fast (parallel)
bundle exec rspec --format progress
```

### Writing Tests

#### Model Test Example
```ruby
# spec/models/tenant_spec.rb
require 'rails_helper'

RSpec.describe Tenant, type: :model do
  describe 'validations' do
    it { should validate_presence_of(:name) }
    it { should validate_uniqueness_of(:slug) }
  end

  describe 'associations' do
    it { should have_many(:users) }
    it { should have_many(:products) }
  end

  describe '#soft_delete' do
    it 'marks tenant as deleted' do
      tenant = create(:tenant)
      tenant.soft_delete

      expect(tenant.deleted_at).to be_present
      expect(tenant.status).to eq('deleted')
    end
  end
end
```

#### Request Test Example
```ruby
# spec/requests/api/v1/products_spec.rb
require 'rails_helper'

RSpec.describe 'Products API', type: :request do
  let(:user) { create(:user) }
  let(:headers) { auth_headers(user) }

  describe 'GET /api/v1/products' do
    it 'returns products for authenticated user' do
      create_list(:product, 3, tenant: user.tenant)

      get '/api/v1/products', headers: headers

      expect(response).to have_http_status(:ok)
      expect(json_response[:data].length).to eq(3)
    end

    it 'requires authentication' do
      get '/api/v1/products'

      expect(response).to have_http_status(:unauthorized)
    end
  end
end
```

### Factories

Located in `spec/factories/`:
- `tenants.rb`
- `users.rb`
- `products.rb`
- `api_keys.rb`

Example usage:
```ruby
# Create single record
tenant = create(:tenant)

# Create with overrides
user = create(:user, role: 'owner')

# Create without saving
user = build(:user)

# Create with traits
tenant = create(:tenant, :with_users, :with_products)

# Create multiple
products = create_list(:product, 5)
```

---

## Go Testing

### Setup

```bash
cd apps/core-go

# Run tests
go test ./...

# With coverage
go test ./... -cover

# With race detector
go test ./... -race
```

### Test Structure

```
apps/core-go/
├── internal/
│   └── providers/
│       ├── aws_ses.go
│       ├── aws_ses_test.go
│       └── mock/
│           ├── mock_provider.go
│           └── mock_provider_test.go
└── testhelpers/
    └── testhelpers.go
```

### Running Tests

```bash
# All tests
make test

# Verbose
make test-verbose

# Coverage report (generates HTML)
make test-coverage

# Race detection
make test-race

# Benchmarks
make bench

# All checks (format, lint, test)
make check
```

### Writing Tests

#### Unit Test Example
```go
package providers

import (
    "context"
    "testing"
)

func TestMockProvider_Send_Success(t *testing.T) {
    provider := NewMockProvider()
    ctx := context.Background()

    email := &Email{
        From:    "sender@example.com",
        To:      "recipient@example.com",
        Subject: "Test Email",
    }

    result, err := provider.Send(ctx, email)

    if err != nil {
        t.Fatalf("Expected no error, got: %v", err)
    }

    if !result.Success {
        t.Error("Expected success to be true")
    }

    if len(provider.SentEmails) != 1 {
        t.Errorf("Expected 1 sent email, got: %d", len(provider.SentEmails))
    }
}
```

#### Table-Driven Test Example
```go
func TestEmailValidation(t *testing.T) {
    tests := []struct {
        name    string
        email   string
        wantErr bool
    }{
        {"valid email", "user@example.com", false},
        {"missing @", "userexample.com", true},
        {"empty", "", true},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := ValidateEmail(tt.email)
            if (err != nil) != tt.wantErr {
                t.Errorf("ValidateEmail() error = %v, wantErr %v", err, tt.wantErr)
            }
        })
    }
}
```

### Mock Provider

Use the mock provider for testing:

```go
provider := mock.NewMockProvider()

// Configure failure
provider.SetFailure("Service unavailable")

// Configure delay
provider.SetDelay(100 * time.Millisecond)

// Send email
result, err := provider.Send(ctx, email)

// Check sent emails
emails := provider.GetSentEmails()
lastEmail := provider.GetLastSentEmail()

// Reset
provider.Reset()
```

---

## Load Testing

### Installation

```bash
# macOS
brew install k6

# Linux
sudo apt-get install k6

# Or use Docker
docker pull grafana/k6
```

### Available Tests

Located in `tests/load/`:

1. **send-email.js** - Email sending load test
2. **api-endpoints.js** - API endpoints test
3. **stress-test.js** - Stress test to find limits

### Running Load Tests

```bash
cd tests/load

# Basic run
k6 run send-email.js

# With environment variables
k6 run --env API_KEY=sk_test_xxx --env BASE_URL=http://localhost:4000 send-email.js

# Custom VUs and duration
k6 run --vus 100 --duration 5m send-email.js

# Stress test
k6 run stress-test.js
```

### Load Test Scenarios

#### Email Sending (send-email.js)
- Duration: 6 minutes
- Peak: 100 concurrent users
- Thresholds:
  - p95 response time < 500ms
  - Error rate < 10%

#### API Endpoints (api-endpoints.js)
- Duration: 5 minutes
- Peak: 50 concurrent users
- Tests all main endpoints

#### Stress Test (stress-test.js)
- Duration: 31 minutes
- Peak: 300 concurrent users
- Finds breaking point

### Results

```bash
# Generate HTML report
k6 run --out json=results.json send-email.js

# With InfluxDB + Grafana
k6 run --out influxdb=http://localhost:8086/k6 send-email.js
```

---

## Integration Testing

### Full Stack Tests

Integration tests verify Rails ↔ Go communication:

```bash
# Start all services
docker-compose -f infra/docker-compose.yml up -d

# Run integration tests
cd control-plane
bundle exec rspec spec/integration/
```

### Test Scenarios

- User registration → API key creation → Email sending
- Provider failover
- Webhook processing
- Rate limiting

---

## Development Tools

### Start Development Environment

```bash
docker-compose -f infra/docker-compose.dev.yml up -d
```

This starts:

1. **PostgreSQL** (port 5432)
2. **Redis** (port 6379)
3. **Mailhog** (SMTP: 1025, UI: 8025)
   - Catches all emails
   - Web UI: http://localhost:8025
4. **Redis Commander** (port 8081)
   - Redis GUI
   - UI: http://localhost:8081
5. **pgAdmin** (port 5050)
   - PostgreSQL GUI
   - UI: http://localhost:5050
   - Login: admin@courierx.local / admin

### Mailhog - Email Testing

All emails sent to Mailhog SMTP (localhost:1025) are caught and displayed in the web UI.

Configure in `.env`:
```bash
SMTP_HOST=localhost
SMTP_PORT=1025
```

View emails: http://localhost:8025

### Redis Commander

View Redis data, queues, and cache:
http://localhost:8081

### pgAdmin

Database management UI:
http://localhost:5050

---

## CI/CD

### GitHub Actions Workflows

Located in `.github/workflows/`:

1. **rails-tests.yml** - Rails test suite
2. **go-tests.yml** - Go test suite
3. **integration-tests.yml** - Full stack tests
4. **load-tests.yml** - Load tests (manual trigger)

### Running Locally

```bash
# Install act (GitHub Actions locally)
brew install act

# Run workflow
act -j test
```

### Required Secrets

Configure in GitHub Settings → Secrets:

- `LOAD_TEST_API_KEY` - API key for load tests
- `CODECOV_TOKEN` - For coverage reports (optional)

---

## Best Practices

### Unit Tests
- Test one thing per test
- Use descriptive test names
- Follow Arrange-Act-Assert pattern
- Mock external dependencies

### Integration Tests
- Test happy path + edge cases
- Use real services (database, Redis)
- Clean up test data

### Load Tests
- Start small, scale up
- Monitor resources during tests
- Baseline before changes
- Run against staging, not production

### Code Coverage
- Aim for >80% overall
- Critical paths >90%
- Don't chase 100% - focus on valuable tests

---

## Troubleshooting

### Rails Tests Failing

```bash
# Reset test database
RAILS_ENV=test bundle exec rails db:drop db:create db:schema:load

# Clear cache
bundle exec rails tmp:cache:clear
```

### Go Tests Failing

```bash
# Clean and rebuild
make clean
go mod tidy
go test ./... -v
```

### Load Tests High Error Rate

- Check database connection pool size
- Verify rate limits
- Monitor system resources (CPU, memory)
- Check provider API limits

---

## Quick Reference

### Rails
```bash
bundle exec rspec                 # All tests
bundle exec rspec --fail-fast     # Stop on first failure
bundle exec rubocop               # Linting
COVERAGE=true bundle exec rspec   # With coverage
```

### Go
```bash
make test           # Run tests
make test-coverage  # Coverage report
make lint           # Linting
make check          # All checks
```

### Load Testing
```bash
k6 run send-email.js              # Email load test
k6 run api-endpoints.js           # API test
k6 run --vus 100 send-email.js    # Custom load
```

### Docker
```bash
docker-compose -f infra/docker-compose.dev.yml up -d    # Start dev tools
docker-compose -f infra/docker-compose.dev.yml down     # Stop
docker-compose -f infra/docker-compose.dev.yml logs -f  # View logs
```

---

For more details, see:
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution guidelines
- [IMPLEMENTATION_GUIDE.md](./docs/IMPLEMENTATION_GUIDE.md) - Implementation details
- [tests/load/README.md](./tests/load/README.md) - Load testing guide
