# CourierX Control Plane — AI Context

## What is this?

Rails 8.1 API-only app. The "brain" of CourierX — handles multi-tenancy, auth,
email dispatch orchestration, provider management, and billing.

## How to run

```bash
phase run "bundle exec rails s -p 4000"    # API server
phase run "bundle exec sidekiq"             # Background jobs
phase run "bundle exec rails console"       # REPL
```

## Key patterns

### Authentication

- **JWT**: `Authorization: Bearer eyJ...` → `JwtService.decode` → find tenant
- **API Key**: `Authorization: Bearer cxk_live_...` → SHA-256 hash → `ApiKey.authenticate`
- **Auth concern**: `app/controllers/concerns/authenticatable.rb` sets `current_tenant`
- **Public endpoints**: auth/register, auth/login, waitlist, billing webhooks

### Email sending flow

```
POST /api/v1/emails
  → EmailDispatchService.call
    → idempotency check (metadata.idempotency_key)
    → suppression check
    → create Email record (status: queued)
    → create OutboxEvent
    → enqueue OutboxProcessorJob
      → POST to Go engine at GO_CORE_URL/v1/send
```

### Multi-tenancy

Every resource is scoped by `tenant_id`. Controllers use `current_tenant.resources`
to prevent cross-tenant data access.

### Database

All tables use UUID primary keys. Hosted on Neon (PostgreSQL).
Secrets managed by Phase (`phase secrets list --show`).

## Directory layout

```
app/
├── controllers/api/v1/   # 14 controllers
├── models/               # 22 models (all UUID PKs)
├── services/             # EmailDispatchService, JwtService
├── jobs/                 # 6 Sidekiq jobs
└── controllers/concerns/ # Authenticatable, Paginatable, RateLimitable
config/
├── routes.rb             # All API routes under /api/v1/
├── initializers/
│   ├── rack_attack.rb    # Rate limiting
│   └── sidekiq.rb        # Redis config
db/
├── migrate/              # 24 migrations
└── seeds.rb              # Demo tenant seeder
docs/api/
└── openapi.yaml          # Full OpenAPI 3.0 spec
```

## Environment variables (via Phase)

`DATABASE_URL`, `SECRET_KEY_BASE`, `JWT_SECRET`, `REDIS_URL`,
`GO_CORE_SECRET`, `ENCRYPTION_KEY`

Future: `LEMONSQUEEZY_WEBHOOK_SECRET` or `PADDLE_WEBHOOK_SECRET`

## Models quick reference

| Model           | Key method                                            |
| --------------- | ----------------------------------------------------- |
| `Tenant`        | Root entity, `slug` auto-generated                    |
| `ApiKey`        | `authenticate(raw_key)` — SHA-256 lookup              |
| `Email`         | `mark_sent!`, `mark_delivered!`, `mark_bounced!`      |
| `Suppression`   | `suppressed?(tenant_id, email)`                       |
| `McpConnection` | `authenticate(client_id, secret)`, `can?(permission)` |
| `OutboxEvent`   | `process!`, `complete!`, `fail!(error)`               |

## Testing

```bash
phase run "bundle exec rspec"
```
