# CourierX — Internal Architecture Guide

> For contributors, operators, and engineers onboarding to the codebase.

---

## System Overview

CourierX is a **multi-provider email routing API**. It sits between a developer's application and email providers (SendGrid, Mailgun, AWS SES, Postmark, Resend, SMTP) and provides:

- One unified API for sending, regardless of provider
- Automatic failover if a provider fails or rate-limits
- Per-tenant provider routing (tenants bring their own API keys — BYOK)
- Suppression list management, domain verification, and delivery analytics

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Client App (SDK / direct HTTP)                                              │
│  POST /api/v1/emails  with Bearer token (JWT or cxk_* API key)              │
└─────────────────────┬───────────────────────────────────────────────────────┘
                      │  HTTPS / Bearer auth
                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Rails Control Plane  (port 4000)                                            │
│                                                                              │
│  ┌─────────────┐   ┌──────────────────┐   ┌────────────────────────────┐   │
│  │ Auth layer  │   │  EmailDispatch   │   │  Background jobs (Sidekiq) │   │
│  │  JWT / API  │──▶│    Service       │──▶│  OutboxProcessorJob        │   │
│  │  key auth   │   │  - idempotency   │   │  WebhookDeliveryJob        │   │
│  └─────────────┘   │  - suppression   │   │  DomainVerificationJob     │   │
│                    │  - outbox write  │   │  UsageRollupJob            │   │
│  ┌─────────────┐   └──────────────────┘   │  SuppressionSyncJob        │   │
│  │ PostgreSQL  │                           └──────────┬─────────────────┘   │
│  │  (UUID PKs) │◀──────────────────────────────────── │                     │
│  └─────────────┘                                      │                     │
│                                                       │ POST /v1/send       │
│  ┌─────────────┐                                      │ X-Internal-Secret   │
│  │   Redis     │ (Sidekiq queues, rate limit counters) │                     │
│  └─────────────┘                                      │                     │
└──────────────────────────────────────────────────────┼──────────────────────┘
                                                       │
                                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Go Core Engine  (port 8080)                                                 │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  /v1/send handler                                                     │   │
│  │  1. Validate X-Internal-Secret                                        │   │
│  │  2. Check idempotency key (in-memory / Redis store)                   │   │
│  │  3. Build provider router (BYOK routes or global ENV routes)          │   │
│  │  4. Try providers in priority order with failover                     │   │
│  │  5. Log message to PostgreSQL                                         │   │
│  │  6. Return { messageId, provider, status }                            │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  Provider chain: [SendGrid p1] → [Mailgun p2] → [SES p3] → ...             │
│  Permanent errors stop chain; transient errors try next provider            │
└──────────────────┬──────────────────────────────────────────────────────────┘
                   │
    ┌──────────────┼──────────────┬──────────────┐
    ▼              ▼              ▼              ▼
 SendGrid      Mailgun         AWS SES       Postmark / Resend / SMTP
    │              │              │
    └──────────────┴──────────────┘
          │  Provider webhooks (status events)
          ▼
┌─────────────────────────────┐
│  Rails Control Plane        │
│  POST /api/v1/webhooks/ses  │
│  POST /api/v1/webhooks/mg   │
│  POST /api/v1/webhooks/sg   │
│  → Update Email status      │
│  → Fire tenant webhooks     │
└─────────────────────────────┘
```

---

## Service Responsibilities

### Rails Control Plane (`backend/control-plane/`)

**What Rails owns:**
- Authentication and authorization (JWT tokens, API keys)
- Multi-tenancy — all data scoped to `tenant_id`
- Business logic: suppression, domain verification, routing rules, BYOK credentials
- Async job orchestration via Sidekiq
- Webhook delivery to tenant-registered endpoints
- Dashboard API: usage stats, email history, provider connections

**What Rails does NOT do:**
- Execute email sends (delegates to Go via outbox pattern)
- Maintain persistent connections to email providers (stateless)
- High-frequency event processing (Go writes directly to DB for performance)

### Go Core Engine (`backend/core-go/`)

**What Go owns:**
- High-performance email execution
- Provider routing and failover
- Template rendering (Handlebars via `raymond`)
- Idempotency enforcement at the send layer
- Direct PostgreSQL writes for email events (bypass Rails for throughput)
- Rate limiting per provider (token bucket)

**What Go does NOT do:**
- Auth for end users (only validates the internal secret from Rails)
- Business rule enforcement (suppression, domain verification)
- Background job scheduling

---

## Service Communication

### Client → Rails
```
POST /api/v1/emails
Authorization: Bearer <jwt_token | cxk_api_key>
Content-Type: application/json
```

### Rails → Go (via `OutboxProcessorJob`)
```
POST http://core-go:8080/v1/send
X-Internal-Secret: <INTERNAL_SECRET env var>
Content-Type: application/json

{
  "tenantId": "uuid",
  "from": { "email": "noreply@example.com", "name": "Sender" },
  "to": { "email": "user@example.com", "name": "User" },
  "subject": "Hello",
  "htmlBody": "<p>Hello</p>",
  "textBody": "Hello",
  "idempotencyKey": "unique-key",
  "providers": [
    {
      "priority": 1,
      "role": "primary",
      "provider": { "type": "sendgrid", "config": { "apiKey": "SG.xxx" } }
    }
  ]
}
```

### Go → Provider webhooks → Rails
Provider webhooks (bounce, complaint, delivery) arrive at:
- `POST /api/v1/webhooks/ses`
- `POST /api/v1/webhooks/sendgrid`
- `POST /api/v1/webhooks/mailgun`

Each controller verifies the provider's signature before processing.

---

## BYOK Model (Bring Your Own Keys)

This is the core commercial differentiator. Tenants supply their own provider API keys — CourierX never owns the sending infrastructure.

**Data flow:**
1. Tenant POSTs to `POST /api/v1/provider_connections` with plaintext `api_key` / `secret`
2. Rails encrypts credentials at rest using `ActiveSupport::MessageEncryptor` with a derived key from `ENCRYPTION_KEY`
3. Tenant creates routing rules defining provider priority for their domain
4. When an email is dispatched, `OutboxProcessorJob` decrypts credentials and includes them in the Go request under `providers[]`
5. Go builds a request-scoped router from these routes rather than the global ENV-based chain

**Encryption details:**
- Key derivation: `ActiveSupport::KeyGenerator.new(ENV["ENCRYPTION_KEY"]).generate_key("provider_credentials", 32)`
- Cipher: AES-256-GCM (via `MessageEncryptor`)
- Columns: `encrypted_api_key`, `encrypted_secret` (raw ciphertext); `_iv` columns reserved for future compatibility

**Critical:** Rotating `ENCRYPTION_KEY` without re-encrypting existing records will permanently break credential decryption. Always use a key rotation script, not a silent env var change.

---

## Authentication Deep-Dive

### JWT tokens (tenant dashboard access)
- Issued by `POST /api/v1/auth/login`
- Payload: `{ tenant_id: "uuid", exp: <unix> }`
- Signed with `JWT_SECRET` env var (HS256)
- 24h expiry
- Decoded by `JwtService.decode` → returns `@current_tenant`

### API keys (server-to-server)
- Prefix: `cxk_` followed by 32 random hex chars
- Only the SHA-256 hash is stored (`api_keys.key_hash`)
- The raw key is shown once on creation and never again
- Expired keys (`expires_at < now`) are rejected during `authenticate` and lazily updated to `status: "expired"`
- Revoked keys (`status: "revoked"`) are rejected immediately

### Rails → Go internal secret
- `X-Internal-Secret` header on every POST to Go
- Constant-time compared server-side to prevent timing attacks
- **Fail-closed:** if `INTERNAL_SECRET` is unset, Go returns 503 for all requests
- Rails uses `GO_CORE_SECRET` (must match `INTERNAL_SECRET`)

### Admin access
- `SUPER_ADMIN_API_KEY` env var on Rails — passed as `X-Admin-Api-Key` header
- Grants access to `/api/v1/admin/*` routes
- Admin can impersonate any tenant (`POST /api/v1/admin/tenants/:id/impersonate`)
- All impersonation events must be logged to the audit trail

---

## Database Schema Key Points

- All primary keys are **UUIDs** (`gen_random_uuid()` via pgcrypto)
- **24 migrations** total; see `db/schema.rb` for the current state
- Multi-tenancy: every resource table has a `tenant_id` UUID foreign key
- `emails` table: core send record, status tracks the full lifecycle
- `outbox_events` table: transactional outbox pattern — guarantees handoff to Go
- `email_events` table: immutable event log per email
- `provider_connections` table: encrypted BYOK credentials per tenant
- `suppressions` table: case-normalized email addresses never to receive mail

### Critical indexes (must exist in production)
```sql
CREATE INDEX idx_emails_tenant_status     ON emails (tenant_id, status);
CREATE INDEX idx_outbox_processable       ON outbox_events (status, process_after) WHERE status = 'pending';
CREATE INDEX idx_suppressions_tenant_email ON suppressions (tenant_id, email);
CREATE INDEX idx_api_keys_hash            ON api_keys (key_hash);
CREATE INDEX idx_email_events_provider_id ON email_events (provider_message_id);
```

---

## Outbox Pattern (Reliable Handoff to Go)

The transactional outbox ensures that emails are never silently dropped even if the Go engine is temporarily unavailable.

```
1. Client POSTs to Rails → EmailDispatchService runs
2. Transaction: create Email record + OutboxEvent record + link both
3. OutboxProcessorJob enqueued via Sidekiq
4. Job reads OutboxEvent, marks as "processing" (atomic update WHERE status='pending')
5. Job POST to Go /v1/send with decrypted credentials
6. On success: Email → "sent", OutboxEvent → "processed"
7. On failure: OutboxEvent → "pending" with process_after delay (Sidekiq retry)
8. After max_attempts: OutboxEvent → "dead", Email → "failed"
```

**Failure modes handled:**
- Go engine down: job retries with backoff, event stays pending
- Process crash mid-send: job is re-queued by Sidekiq, idempotency key prevents double-send
- DB write failure: transaction rolls back, no orphaned records

---

## Provider Routing Logic (Go)

```go
// Priority order, configured per-tenant via routing_rules
providers := []Provider{sendgrid, mailgun, ses}

for _, provider := range providers {
    result, err := provider.Send(ctx, message)
    if err == nil {
        return result, nil  // success
    }
    if errors.As(err, &PermanentError{}) {
        return nil, err     // stop — no point trying others
    }
    // transient error: try next provider
    log.Warn("provider failed, trying next", "provider", provider.Name(), "err", err)
}
return nil, errors.New("all providers exhausted")
```

**Permanent errors** (stop chain): invalid recipient address, authentication failure, domain not found, suspended account  
**Transient errors** (try next): timeout, rate limit (429), server error (5xx), network error

---

## Development Setup

### Option A: Docker (full stack)
```bash
cd infra
cp .env.example .env       # fill in secrets
docker compose up -d
# Rails: http://localhost:4000
# Go:    http://localhost:8080
```

### Option B: Native (faster iteration)
```bash
# Terminal 1: databases only
./infra/scripts/setup-dev-light.sh

# Terminal 2: Rails
cd backend/control-plane
bundle install
bundle exec rails db:create db:migrate db:seed
bundle exec rails server -p 4000

# Terminal 3: Go
cd backend/core-go
go mod download
go run main.go

# Terminal 4: Sidekiq
cd backend/control-plane
bundle exec sidekiq
```

### Required env vars for development
Copy `.env.example` and set:
```
INTERNAL_SECRET=dev-internal-secret-min-32-chars
GO_CORE_SECRET=dev-internal-secret-min-32-chars
JWT_SECRET=dev-jwt-secret-min-64-chars
ENCRYPTION_KEY=dev-encryption-key-exactly-32ch
SECRET_KEY_BASE=<128-char random string>
SIDEKIQ_PASSWORD=devpassword
```

---

## Adding a New Provider (Go)

1. Create `internal/providers/<name>.go` implementing the `EmailProvider` interface:
```go
type EmailProvider interface {
    Send(ctx context.Context, msg *Message) (*Result, error)
    Name() string
    Healthy() bool
}
```

2. Add the provider type constant to `internal/types/types.go`:
```go
const ProviderMyProvider ProviderType = "myprovider"
```

3. Wire into the factory in `internal/providers/provider.go`:
```go
case types.ProviderMyProvider:
    return NewMyProvider(config)
```

4. Add a `ProviderConnection` type in Rails:
```ruby
# In ProviderConnection model
PROVIDERS = %w[sendgrid mailgun ses postmark resend smtp myprovider].freeze
```

5. Write tests using `MockProvider` as reference.

---

## Monitoring & Observability

### Prometheus metrics (Go `/metrics` endpoint)
| Metric | Type | Description |
|--------|------|-------------|
| `courierx_emails_sent_total` | Counter | By provider, status |
| `courierx_provider_latency_seconds` | Histogram | By provider |
| `courierx_failover_total` | Counter | Times failover triggered |
| `courierx_template_cache_size` | Gauge | Current template cache entries |
| `courierx_queue_depth` | Gauge | Pending outbox events |

### Rails structured logs
All Rails logs are JSON-structured. Key fields: `tenant_id`, `request_id`, `duration_ms`, `status`, `controller`, `action`.

### Health probes
- Go: `GET /health/live` (liveness), `GET /health/ready` (readiness)
- Rails: `GET /up` (Rails standard health check)
