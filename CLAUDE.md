# CourierX - Claude Code Context

## Project Overview

CourierX is a multi-provider email delivery platform. It intelligently routes emails across multiple providers (SendGrid, Mailgun, AWS SES, Postmark, Resend, SMTP) with automatic failover, multi-tenant isolation, and enterprise security features.

**Architecture:** Two-service design:
- **Rails Control Plane** (`backend/control-plane/`) — API, auth, business logic, multi-tenancy
- **Go Core Engine** (`backend/core-go/`) — High-performance email execution, provider routing

The services communicate over HTTP: Rails validates requests and delegates email sending to Go.

---

## Repository Structure

```
courierx/
├── backend/
│   ├── control-plane/   # Rails 8.1 API-only app (PostgreSQL, Redis, Sidekiq)
│   └── core-go/               # Go email execution engine (Fiber, PGX)
├── frontend/
│   └── dashboard/           # Next.js 14 dashboard (Milestone 4)
├── infra/                             # Docker Compose, deployment scripts
│   ├── docker/                        # Dockerfiles
│   ├── scripts/                       # setup-dev.sh, setup-dev-light.sh, deploy.sh
│   └── docker-compose*.yml
├── tests/                             # Load tests (k6) and integration tests
├── docs/                              # MILESTONES.md, IMPLEMENTATION_GUIDE.md, STORY_DETAILS.md
└── .github/workflows/                 # CI/CD pipelines
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Control Plane API | Ruby on Rails 8.1+ (API-only mode) |
| Execution Engine | Go 1.23+, Fiber v2 |
| Database | PostgreSQL 15+ |
| Cache / Queue | Redis 7+ |
| Background Jobs | Sidekiq 7.2 |
| Template Rendering | Raymond (Handlebars) in Go |
| Testing (Rails) | RSpec, FactoryBot, Shoulda Matchers |
| Testing (Go) | Standard `testing` package, table-driven tests |
| Load Testing | k6 |
| Containerization | Docker & Docker Compose |

---

## Development Setup

### Docker (recommended for full stack)
```bash
cd infra
docker compose up -d
# Rails: http://localhost:4000
# Go:    http://localhost:8080
```

### Native (faster iteration)
```bash
# Start only databases
./infra/scripts/setup-dev-light.sh

# Terminal 1 — Rails
cd backend/control-plane && bundle install
bundle exec rails db:create db:migrate db:seed
bundle exec rails server -p 4000

# Terminal 2 — Go
cd backend/core-go && go mod download && go run main.go

# Terminal 3 — Sidekiq
cd backend/control-plane && bundle exec sidekiq
```

---

## Common Commands

### Rails (`backend/control-plane/`)
```bash
bundle exec rspec                        # Run all tests
bundle exec rspec --fail-fast            # Stop on first failure
COVERAGE=true bundle exec rspec          # With coverage report
bundle exec rubocop                      # Lint
bundle exec rubocop -A                   # Auto-fix lint
bundle exec rails db:migrate             # Run migrations
bundle exec rails db:seed                # Seed data
RAILS_ENV=test bundle exec rails db:create db:migrate
bundle exec rails console
```

### Go (`backend/core-go/`)
```bash
make test           # Run all tests
make test-coverage  # Coverage report (HTML)
make test-race      # With race detector
make bench          # Benchmarks
make build          # Compile binary
make run            # Build and run
make lint           # Run linter
make fmt            # Format code
make check          # fmt + lint + test-race (pre-commit)
go run main.go      # Run directly
```

---

## Key Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `SECRET_KEY_BASE` | Rails secret (128+ chars) |
| `JWT_SECRET` | JWT signing secret |
| `ENCRYPTION_KEY` | Key for encrypting provider credentials (Rails) |
| `GO_CORE_URL` | URL to Go service (e.g. `http://localhost:8080`) |
| `GO_CORE_SECRET` | Shared secret between Rails and Go (header: `X-Internal-Secret`) |
| `SENDGRID_API_KEY` | Global SendGrid fallback (Go ENV, used when no BYOK routes) |
| `MAILGUN_API_KEY` | Global Mailgun fallback |
| `AWS_ACCESS_KEY_ID` | Global SES fallback |

---

## Architecture Notes

### Service Communication
- **Client → Rails** via REST API with Bearer token (JWT or API key `cxk_*`)
- **Rails → Go** via HTTP `POST /v1/send` with `X-Internal-Secret` header
- **Go → Providers** via provider-specific REST APIs

### BYOK (Bring Your Own Keys)
Tenants connect their own provider credentials via `POST /api/v1/provider_connections`.
Credentials are encrypted at rest (AES-256 via `ActiveSupport::MessageEncryptor`).
When sending, `OutboxProcessorJob` decrypts credentials and includes them as `providers[]`
in the Go request payload. Go builds a request-scoped router from these routes instead of
the global ENV-based chain.

### Provider Credential Storage
Each `ProviderConnection` uses virtual attributes `api_key` and `secret`. Setting them
triggers `before_save :encrypt_credentials` — values are stored in `encrypted_api_key`
and `encrypted_secret`. The `_iv` columns are reserved for future compatibility.

For Mailgun: `smtp_host` stores the Mailgun sending domain; `region` stores "us"/"eu".
For SMTP: `smtp_host`/`smtp_port` = server; `api_key` = username; `secret` = password.
For SES: `api_key` = access key ID; `secret` = secret access key; `region` = AWS region.

### Authentication
- **JWT tokens** — tenant access, 24h expiry, signed with `JWT_SECRET`
- **API keys** — server-to-server, prefix `cxk_`, stored as SHA-256 hash
- **Shared secret** — Rails → Go, passed as `X-Internal-Secret` header

### Multi-Tenancy
Every resource is scoped by `tenant_id`. Controllers use `current_tenant.resources`
to prevent cross-tenant data access. `Authenticatable` concern sets `@current_tenant`.

---

## Code Conventions

### Rails
- Controllers inherit from `Api::V1::BaseController`
- All responses use `render json:` — no envelope wrapper enforced yet
- Auth via `before_action :authenticate_request!` from `Authenticatable`
- Background jobs use Sidekiq with `perform_async`

### Go
- `handlers.go` calls `routerForRequest(req.Providers)` — returns request-scoped
  router for BYOK or global router for ENV-based config
- All providers implement the `Provider` interface in `internal/providers/provider.go`
- Permanent errors stop failover immediately; transient/rate-limit errors try next provider

---

## Project Status

Currently in **Milestone 1: Foundation & Core Infrastructure**.

Key fixes applied:
- `OutboxProcessorJob`: correct `X-Internal-Secret` header, camelCase Go field names,
  `messageId` response parsing, BYOK provider route injection
- `ProviderConnection`: credential encryption/decryption via `MessageEncryptor`
- `ProviderConnectionsController`: accepts `api_key`/`secret` (plaintext), not raw encrypted columns
- `User` model: email validation, `has_many :memberships`
- `Membership` model: `ROLES` constant, uniqueness/inclusion validations
- `RoutingRule` model: `belongs_to :tenant`, name/strategy validations
- Go `types.go`: `Providers []Route` on `SendRequest` and `BulkSendRequest`
- Go `handlers.go`: `routerForRequest` builds per-request BYOK router when providers present

Full roadmap: `docs/MILESTONES.md`.
