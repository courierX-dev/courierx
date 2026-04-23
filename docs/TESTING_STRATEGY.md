# CourierX — Testing Strategy

**Date:** 2026-04-19  
**Stack:** Rails 8.1 (RSpec) + Go 1.23 (standard `testing` package)  
**Guiding principle:** Test the contract, not the implementation. Every critical code path should fail loudly and specifically.

---

## Overview

| Layer | Framework | What it tests | Target coverage |
|-------|-----------|---------------|----------------|
| Rails unit | RSpec + FactoryBot | Models, services, jobs in isolation | 90%+ |
| Rails request | RSpec request specs | Controller auth, params, response shape | All endpoints |
| Rails integration | RSpec + real DB | Full send flow: API → job → outbox → Go stub | Core flows |
| Go unit | `testing` package | Provider logic, router, rate limiter, template | 80%+ |
| Go integration | `testing` + real PGX | Handler → DB — idempotency, auth, send flow | All handlers |
| Cross-service | Docker Compose + k6 | Rails → Go handoff under load | Send + failover |
| Security | Brakeman + bundle-audit | SAST for known vulns | CI gate |
| Load | k6 | Throughput, failover, rate limit response | Key scenarios |

---

## Rails Testing

### 1. Model Tests

**Framework:** RSpec + FactoryBot + Shoulda Matchers

Run: `bundle exec rspec spec/models/`

#### `Email` model
```ruby
RSpec.describe Email, type: :model do
  it { should belong_to(:tenant) }
  it { should belong_to(:outbox_event).optional }
  it { should validate_presence_of(:from_email) }
  it { should validate_presence_of(:to_email) }
  it { should validate_length_of(:subject).is_at_most(998) }
  it { should validate_length_of(:html_body).is_at_most(500_000) }

  describe "email normalization" do
    it "downcases and strips to_email before validation" do
      email = build(:email, to_email: "  User@EXAMPLE.COM  ")
      email.valid?
      expect(email.to_email).to eq("user@example.com")
    end
  end

  describe "status transitions" do
    it "transitions from queued to sent" do
      email = create(:email, status: "queued")
      email.mark_sent!(provider_message_id: "abc123", provider: "sendgrid")
      expect(email.reload.status).to eq("sent")
    end

    it "cannot transition from sent to queued" do
      email = create(:email, status: "sent")
      expect { email.update!(status: "queued") }.to raise_error(ActiveRecord::RecordInvalid)
    end
  end
end
```

#### `ApiKey` model
```ruby
RSpec.describe ApiKey, type: :model do
  describe ".authenticate" do
    it "returns nil for an expired key" do
      key_raw, key = generate_api_key
      key.update!(expires_at: 1.hour.ago)
      expect(ApiKey.authenticate(key_raw)).to be_nil
    end

    it "marks the key as expired in the DB" do
      key_raw, key = generate_api_key
      key.update!(expires_at: 1.hour.ago)
      ApiKey.authenticate(key_raw)
      expect(key.reload.status).to eq("expired")
    end

    it "returns nil for a revoked key" do
      key_raw, key = generate_api_key
      key.revoke!
      expect(ApiKey.authenticate(key_raw)).to be_nil
    end

    it "touches last_used_at on success" do
      key_raw, key = generate_api_key
      expect { ApiKey.authenticate(key_raw) }.to change { key.reload.last_used_at }
    end
  end
end
```

#### `Suppression` model
```ruby
RSpec.describe Suppression, type: :model do
  describe ".suppressed?" do
    it "is case-insensitive" do
      create(:suppression, email: "user@example.com")
      expect(Suppression.suppressed?("USER@EXAMPLE.COM")).to be true
    end

    it "strips whitespace" do
      create(:suppression, email: "user@example.com")
      expect(Suppression.suppressed?("  user@example.com  ")).to be true
    end
  end
end
```

---

### 2. Service Tests

#### `EmailDispatchService`
```ruby
RSpec.describe EmailDispatchService do
  let(:tenant)  { create(:tenant) }
  let(:domain)  { create(:domain, tenant: tenant, status: "verified", name: "example.com") }
  let(:params) do
    { from_email: "noreply@example.com", to_email: "user@other.com",
      subject: "Hello", text_body: "Hi" }
  end

  describe "#call" do
    it "creates Email and OutboxEvent in a single transaction" do
      expect {
        described_class.new(tenant, params).call
      }.to change(Email, :count).by(1).and change(OutboxEvent, :count).by(1)
    end

    it "rolls back both if the outbox create fails" do
      allow(OutboxEvent).to receive(:create!).and_raise(ActiveRecord::RecordInvalid)
      expect {
        described_class.new(tenant, params).call rescue nil
      }.not_to change(Email, :count)
    end

    it "rejects email to a suppressed address" do
      create(:suppression, tenant: tenant, email: "user@other.com")
      result = described_class.new(tenant, params).call
      expect(result).to be_failure
      expect(result.error_code).to eq("suppressed_recipient")
    end

    it "rejects from_email on an unverified domain" do
      domain.update!(status: "pending")
      result = described_class.new(tenant, params).call
      expect(result).to be_failure
      expect(result.error_code).to eq("unverified_from_domain")
    end

    it "enqueues OutboxProcessorJob" do
      expect { described_class.new(tenant, params).call }
        .to have_enqueued_sidekiq_job(OutboxProcessorJob)
    end

    it "is idempotent — same idempotency_key returns cached result" do
      params_with_key = params.merge(idempotency_key: "unique-key-abc")
      first  = described_class.new(tenant, params_with_key).call
      second = described_class.new(tenant, params_with_key).call
      expect(first.email_id).to eq(second.email_id)
      expect(Email.count).to eq(1)
    end
  end
end
```

---

### 3. Job Tests

#### `OutboxProcessorJob`
```ruby
RSpec.describe OutboxProcessorJob do
  let(:tenant)      { create(:tenant) }
  let(:email)       { create(:email, tenant: tenant, status: "queued") }
  let(:outbox)      { create(:outbox_event, tenant_id: tenant.id, payload: { email_id: email.id }) }
  let(:go_response) { { "messageId" => "go-msg-123", "status" => "sent" } }

  before do
    stub_request(:post, /localhost:8080\/v1\/send/)
      .to_return(status: 200, body: go_response.to_json, headers: { "Content-Type" => "application/json" })
  end

  it "transitions email to sent on success" do
    described_class.new.perform(outbox.id)
    expect(email.reload.status).to eq("sent")
    expect(email.provider_message_id).to eq("go-msg-123")
  end

  it "transitions email to failed on Go 5xx" do
    stub_request(:post, /localhost:8080\/v1\/send/).to_return(status: 503)
    described_class.new.perform(outbox.id)
    expect(email.reload.status).to eq("failed")
  end

  it "is idempotent — does not re-send a processed outbox event" do
    outbox.update!(status: "processed")
    expect { described_class.new.perform(outbox.id) }
      .not_to have_been_requested  # WebMock assertion
  end

  it "includes provider credentials in Go payload" do
    create(:provider_connection, :sendgrid, tenant: tenant)
    described_class.new.perform(outbox.id)
    expect(WebMock).to have_requested(:post, /v1\/send/).with(
      body: hash_including("providers" => array_including(hash_including("type" => "sendgrid")))
    )
  end

  it "marks event as dead after max_attempts" do
    outbox.update!(attempt_count: outbox.max_attempts)
    stub_request(:post, /v1\/send/).to_return(status: 503)
    described_class.new.perform(outbox.id)
    expect(outbox.reload.status).to eq("dead")
  end
end
```

#### `WebhookDeliveryJob`
```ruby
RSpec.describe WebhookDeliveryJob do
  let(:endpoint) { create(:webhook_endpoint, url: "https://hooks.example.com/events") }

  it "delivers payload with HMAC signature" do
    stub = stub_request(:post, endpoint.url).to_return(status: 200)
    described_class.new.perform(endpoint.id, { "event" => "delivered" })
    expect(stub).to have_been_requested
    expect(a_request(:post, endpoint.url).with { |req|
      req.headers["X-Courierx-Signature"].start_with?("sha256=")
    }).to have_been_made
  end

  it "blocks delivery to RFC 1918 addresses" do
    endpoint.update!(url: "http://10.0.0.1/webhook")
    expect {
      described_class.new.perform(endpoint.id, { "event" => "delivered" })
    }.to raise_error(ArgumentError, /private or reserved IP/)
  end

  it "blocks delivery to AWS IMDS" do
    stub_request(:post, "http://169.254.169.254/latest/meta-data/")
    endpoint.update!(url: "http://169.254.169.254/latest/meta-data/")
    expect {
      described_class.new.perform(endpoint.id, { "event" => "delivered" })
    }.to raise_error(ArgumentError, /private or reserved IP/)
  end

  it "retries on 5xx and records attempt" do
    stub_request(:post, endpoint.url).to_return(status: 503)
    expect {
      described_class.new.perform(endpoint.id, { "event" => "delivered" }) rescue nil
    }.to change(WebhookDelivery, :count).by(1)
  end
end
```

---

### 4. Request / Controller Tests

**Pattern:** Test auth, params validation, response shape, and cross-tenant isolation.

```ruby
RSpec.describe "Emails API", type: :request do
  let(:tenant)    { create(:tenant) }
  let(:api_key)   { create(:api_key, tenant: tenant) }
  let(:headers)   { { "Authorization" => "Bearer #{api_key.raw_key}" } }

  describe "POST /api/v1/emails" do
    let(:valid_params) do
      { from_email: "noreply@example.com", to_email: "user@example.com",
        subject: "Test", text_body: "Hello" }
    end

    it "returns 201 on valid send" do
      post "/api/v1/emails", params: valid_params, headers: headers, as: :json
      expect(response).to have_http_status(:created)
    end

    it "returns 401 without auth" do
      post "/api/v1/emails", params: valid_params, as: :json
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns 401 with expired API key" do
      api_key.update!(expires_at: 1.hour.ago)
      post "/api/v1/emails", params: valid_params, headers: headers, as: :json
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns 422 with missing to_email" do
      post "/api/v1/emails", params: valid_params.except(:to_email), headers: headers, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "prevents cross-tenant email access" do
      other_tenant = create(:tenant)
      email = create(:email, tenant: other_tenant)
      get "/api/v1/emails/#{email.id}", headers: headers
      expect(response).to have_http_status(:not_found)
    end

    it "enforces rate limit and returns 429" do
      policy = tenant.rate_limit_policy
      policy.update!(max_per_minute: 2)
      3.times { post "/api/v1/emails", params: valid_params, headers: headers, as: :json }
      expect(response).to have_http_status(:too_many_requests)
      expect(response.headers["X-RateLimit-Remaining"]).to eq("0")
    end
  end

  describe "DELETE /api/v1/auth/me" do
    it "requires authentication" do
      delete "/api/v1/auth/me"
      expect(response).to have_http_status(:unauthorized)
    end

    it "destroys the authenticated tenant" do
      jwt = JwtService.encode(tenant_id: tenant.id)
      delete "/api/v1/auth/me", headers: { "Authorization" => "Bearer #{jwt}" }
      expect(response).to have_http_status(:no_content)
      expect(Tenant.find_by(id: tenant.id)).to be_nil
    end
  end
end
```

---

### 5. Security-Focused Tests

```ruby
RSpec.describe "Security", type: :request do
  describe "SQL injection" do
    it "handles malicious recipient param safely" do
      get "/api/v1/emails", params: { recipient: "'; DROP TABLE emails; --" },
          headers: auth_headers
      expect(response).to have_http_status(:ok)
      expect { Email.count }.not_to raise_error
    end
  end

  describe "SSRF via webhook" do
    it "rejects webhook endpoints on 169.254.169.254" do
      post "/api/v1/webhook_endpoints",
        params: { url: "http://169.254.169.254/latest/meta-data/", events: ["delivered"] },
        headers: auth_headers, as: :json
      # Either rejected at creation or at delivery time
      endpoint = WebhookEndpoint.last
      if endpoint
        expect { WebhookDeliveryJob.new.perform(endpoint.id, {}) }
          .to raise_error(ArgumentError)
      else
        expect(response).to have_http_status(:unprocessable_entity)
      end
    end
  end

  describe "SES SSRF" do
    it "rejects SubscribeURL not on amazonaws.com" do
      post "/api/v1/webhooks/ses",
        headers: { "x-amz-sns-message-type" => "SubscriptionConfirmation" },
        body: { SubscribeURL: "http://evil.com/steal", Type: "SubscriptionConfirmation",
                SigningCertURL: "https://sns.us-east-1.amazonaws.com/cert.pem",
                Signature: "base64sig", Message: "", MessageId: "1",
                Timestamp: Time.current.iso8601, TopicArn: "arn:aws:sns:us-east-1:123:test" }.to_json,
        as: :json
      # Either unauthorized (sig check) or bad_request (URL check)
      expect(response.status).to be_in([400, 401])
    end
  end

  describe "cross-tenant isolation" do
    it "cannot read another tenant's provider connections" do
      other = create(:tenant)
      conn = create(:provider_connection, tenant: other)
      get "/api/v1/provider_connections/#{conn.id}", headers: auth_headers
      expect(response).to have_http_status(:not_found)
    end
  end
end
```

---

## Go Testing

### 1. Unit Tests

#### Provider router
```go
func TestRouter_Failover(t *testing.T) {
    primary := &MockProvider{name: "primary", failRate: 1.0} // always fails
    fallback := &MockProvider{name: "fallback", failRate: 0.0}
    r := NewRouter([]Provider{primary, fallback})

    _, err := r.Send(context.Background(), testMessage())
    require.NoError(t, err)
    assert.Equal(t, 1, primary.callCount)
    assert.Equal(t, 1, fallback.callCount)
}

func TestRouter_PermanentErrorStopsChain(t *testing.T) {
    primary := &MockProvider{name: "primary", err: &PermanentError{Message: "invalid address"}}
    fallback := &MockProvider{name: "fallback"}
    r := NewRouter([]Provider{primary, fallback})

    _, err := r.Send(context.Background(), testMessage())
    require.Error(t, err)
    assert.Equal(t, 0, fallback.callCount, "fallback should not be tried after permanent error")
}

func TestRouter_AllProvidersExhausted(t *testing.T) {
    p1 := &MockProvider{name: "p1", failRate: 1.0}
    p2 := &MockProvider{name: "p2", failRate: 1.0}
    r := NewRouter([]Provider{p1, p2})

    _, err := r.Send(context.Background(), testMessage())
    require.Error(t, err)
    assert.Equal(t, 1, p1.callCount)
    assert.Equal(t, 1, p2.callCount)
}
```

#### Rate limiter
```go
func TestLimiter_AllowsUpToRate(t *testing.T) {
    l := New(5) // 5/sec
    allowed := 0
    for i := 0; i < 10; i++ {
        if l.Allow("sendgrid") {
            allowed++
        }
    }
    assert.LessOrEqual(t, allowed, 6, "should not allow more than rate in one tick")
}

func TestLimiter_Disabled(t *testing.T) {
    l := New(0) // disabled
    for i := 0; i < 1000; i++ {
        assert.True(t, l.Allow("any"))
    }
}
```

#### Auth middleware
```go
func TestInternalAuth_FailsClosedWhenSecretEmpty(t *testing.T) {
    app := fiber.New()
    app.Use(InternalAuth(""))
    app.Get("/test", func(c *fiber.Ctx) error { return c.SendString("ok") })

    req := httptest.NewRequest("GET", "/test", nil)
    resp, _ := app.Test(req)
    assert.Equal(t, 503, resp.StatusCode)
}

func TestInternalAuth_RejectsWrongSecret(t *testing.T) {
    app := fiber.New()
    app.Use(InternalAuth("correct-secret"))
    app.Get("/test", func(c *fiber.Ctx) error { return c.SendString("ok") })

    req := httptest.NewRequest("GET", "/test", nil)
    req.Header.Set("X-Internal-Secret", "wrong-secret")
    resp, _ := app.Test(req)
    assert.Equal(t, 401, resp.StatusCode)
}

func TestInternalAuth_AllowsCorrectSecret(t *testing.T) {
    app := fiber.New()
    app.Use(InternalAuth("my-secret"))
    app.Get("/test", func(c *fiber.Ctx) error { return c.SendString("ok") })

    req := httptest.NewRequest("GET", "/test", nil)
    req.Header.Set("X-Internal-Secret", "my-secret")
    resp, _ := app.Test(req)
    assert.Equal(t, 200, resp.StatusCode)
}
```

#### Template engine
```go
func TestTemplateEngine_Render(t *testing.T) {
    e := NewEngine()
    result, err := e.Render("Hello {{name}}!", map[string]interface{}{"name": "World"})
    require.NoError(t, err)
    assert.Equal(t, "Hello World!", result)
}

func TestTemplateEngine_MissingVariable(t *testing.T) {
    e := NewEngine()
    result, err := e.Render("Hello {{name}}!", map[string]interface{}{})
    require.NoError(t, err)
    // raymond renders missing vars as empty string by default
    assert.Equal(t, "Hello !", result)
}

func TestTemplateEngine_CacheSizeDoesNotGrowUnbounded(t *testing.T) {
    e := NewEngine()
    for i := 0; i < 2000; i++ {
        e.Render(fmt.Sprintf("Template %d: {{val}}", i), map[string]interface{}{"val": i})
    }
    assert.LessOrEqual(t, e.CacheSize(), 1100, "LRU cache should evict old entries")
}
```

### 2. Handler Integration Tests

```go
func TestSendHandler_RequiresInternalSecret(t *testing.T) {
    app := setupTestApp(t)
    req := buildSendRequest(t, validSendPayload())
    // no X-Internal-Secret header
    resp, _ := app.Test(req)
    assert.Equal(t, 401, resp.StatusCode)
}

func TestSendHandler_IdempotencyKey_DeduplicatesRequest(t *testing.T) {
    app := setupTestApp(t)
    payload := validSendPayload()
    payload.IdempotencyKey = "test-idem-key-1"

    resp1 := doSend(t, app, payload)
    resp2 := doSend(t, app, payload)

    assert.Equal(t, 200, resp1.StatusCode)
    assert.Equal(t, 200, resp2.StatusCode)

    var r1, r2 SendResponse
    json.NewDecoder(resp1.Body).Decode(&r1)
    json.NewDecoder(resp2.Body).Decode(&r2)

    assert.Equal(t, r1.MessageID, r2.MessageID)
    assert.True(t, r2.Idempotent, "second response should be marked idempotent")
}

func TestMetricsEndpoint_RequiresToken(t *testing.T) {
    app := setupTestAppWithMetricsToken(t, "secret-token")
    req := httptest.NewRequest("GET", "/metrics", nil)
    resp, _ := app.Test(req)
    assert.Equal(t, 401, resp.StatusCode)

    req.Header.Set("Authorization", "Bearer secret-token")
    resp, _ = app.Test(req)
    assert.Equal(t, 200, resp.StatusCode)
}
```

---

## Cross-Service Integration Tests

### Docker Compose test environment

```yaml
# infra/docker-compose.test.yml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: courierx_test
      POSTGRES_USER: courierx
      POSTGRES_PASSWORD: test

  rails:
    build: { context: ./backend/control-plane, dockerfile: ../../infra/docker/Dockerfile.rails }
    environment:
      RAILS_ENV: test
      DATABASE_URL: postgres://courierx:test@postgres/courierx_test
      GO_CORE_URL: http://core-go:8080
      GO_CORE_SECRET: test-internal-secret
      INTERNAL_SECRET: test-internal-secret

  core-go:
    build: { context: ./backend/core-go, dockerfile: ../../infra/docker/Dockerfile.go }
    environment:
      GO_ENV: test
      INTERNAL_SECRET: test-internal-secret
      DATABASE_URL: postgres://courierx:test@postgres/courierx_test
```

### Integration test scenarios (run with `make integration-test`)

1. **End-to-end send flow** — POST to Rails API → outbox enqueued → Sidekiq processes → Go stub provider → email marked sent
2. **Provider failover** — primary provider returns 503 → Go router tries fallback → email delivered via fallback → Rails records correct provider
3. **Suppression respected** — create suppression → attempt send to suppressed address → email rejected before outbox write
4. **Multi-tenant isolation** — tenant A cannot see tenant B's emails even with valid auth token
5. **Rate limit enforcement** — exceed `max_per_minute` → 429 with correct headers → waits 1 minute → allowed again

---

## Load Testing (k6)

Existing load tests are in `tests/load/`. The following scenarios should be covered:

```javascript
// tests/load/scenarios.js

export const options = {
  scenarios: {
    // Steady-state send throughput
    steady_send: {
      executor: "constant-rate", rate: 100, timeUnit: "1s", duration: "2m"
    },
    // Burst: simulate marketing blast
    burst_send: {
      executor: "ramping-arrival-rate",
      startRate: 10, timeUnit: "1s",
      stages: [{ duration: "30s", target: 500 }, { duration: "30s", target: 0 }]
    },
    // Failover: kill primary provider mid-test
    failover_test: {
      executor: "constant-vus", vus: 20, duration: "3m"
      // Primary provider endpoint returns 503 after 60s via toggle
    }
  },
  thresholds: {
    http_req_duration: ["p95<500"],   // 95th percentile < 500ms
    http_req_failed:   ["rate<0.01"], // <1% error rate
    checks:            ["rate>0.99"]  // >99% of checks pass
  }
};
```

---

## CI Gates

Add to `.github/workflows/ci.yml`:

```yaml
- name: Security scan (Brakeman)
  run: bundle exec brakeman --no-pager -q --exit-on-warn

- name: Dependency audit
  run: bundle exec bundle-audit check --update

- name: Go race detector
  run: cd backend/core-go && make test-race

- name: Go vet
  run: cd backend/core-go && go vet ./...

- name: Rails coverage gate
  run: COVERAGE=true bundle exec rspec
  env:
    COVERAGE_MINIMUM: "80"  # SimpleCov minimum_coverage
```

---

## Priority Order for Writing Tests

Given the critical issues identified in the code review, tests should be written in this order:

1. **`OutboxProcessorJob`** — race condition, uninitialized variable (C-2, C-3)
2. **`EmailDispatchService`** — atomic transaction, suppression, domain enforcement (C-1, CR-1)
3. **`ApiKey.authenticate`** — expiry check (H-2)
4. **`WebhookDeliveryJob`** — SSRF blocklist (C-6)
5. **`SesController`** — signature bypass, SSRF (C-5)
6. **Rate limiting** — per-tenant enforcement (C-2)
7. **Go auth middleware** — fail-closed (C-7)
8. **Go router** — failover, permanent error chain-stop (C-2, C-3)
9. **Multi-tenant isolation** — all controllers
10. **Load tests** — steady-state, burst, failover
