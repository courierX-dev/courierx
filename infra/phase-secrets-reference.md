# CourierX — Phase Secrets Reference

> Complete list of every environment variable, grouped by service.
> Use this to populate your [Phase](https://phase.dev) vault under **Courier-x → Development / Staging / Production**.

---

## Shared (both services)

| Variable       | Required | Example                                         | Notes                               |
| -------------- | -------- | ----------------------------------------------- | ----------------------------------- |
| `DATABASE_URL` | ✅       | `postgresql://courierx:pass@host:5432/courierx` | Both services read from the same DB |
| `REDIS_URL`    | ✅       | `redis://localhost:6379/0`                      | Sidekiq jobs + future Go caching    |

---

## Control Plane (Rails · port 4000)

### Core

| Variable            | Required | Example                | Notes                                |
| ------------------- | -------- | ---------------------- | ------------------------------------ |
| `PORT`              | —        | `4000`                 | Default: 4000                        |
| `RAILS_ENV`         | ✅ prod  | `production`           | `development` / `production`         |
| `RAILS_MAX_THREADS` | —        | `5`                    | Puma thread count                    |
| `SECRET_KEY_BASE`   | ✅       | `openssl rand -hex 64` | Rails session/cookie signing         |
| `ENCRYPTION_KEY`    | ✅       | `openssl rand -hex 32` | AES-256-GCM for provider credentials |
| `JWT_SECRET`        | ✅       | `openssl rand -hex 32` | Tenant JWT signing                   |
| `JWT_EXPIRATION`    | —        | `86400`                | Token TTL in seconds (default: 24h)  |

### Go Core Integration

| Variable         | Required | Example                | Notes                                       |
| ---------------- | -------- | ---------------------- | ------------------------------------------- |
| `GO_CORE_URL`    | ✅       | `http://core-go:8080`  | URL to the Go engine                        |
| `GO_CORE_SECRET` | ✅       | `openssl rand -hex 32` | **Must match** `INTERNAL_SECRET` in core-go |

### Frontend (CORS)

| Variable       | Required | Example                    | Notes               |
| -------------- | -------- | -------------------------- | ------------------- |
| `FRONTEND_URL` | ✅ prod  | `https://app.courierx.dev` | Allowed CORS origin |

### Notification Email (system emails, not transactional)

| Variable        | Required | Example            | Notes                             |
| --------------- | -------- | ------------------ | --------------------------------- |
| `SMTP_ADDRESS`  | —        | `smtp.example.com` | For password resets, alerts, etc. |
| `SMTP_PORT`     | —        | `587`              |                                   |
| `SMTP_USERNAME` | —        |                    |                                   |
| `SMTP_PASSWORD` | —        |                    |                                   |
| `SMTP_DOMAIN`   | —        | `example.com`      | HELO domain                       |

### Monitoring

| Variable     | Required | Example                     | Notes          |
| ------------ | -------- | --------------------------- | -------------- |
| `SENTRY_DSN` | —        | `https://...@sentry.io/...` | Error tracking |

### Rate Limiting

| Variable              | Required | Example | Notes                   |
| --------------------- | -------- | ------- | ----------------------- |
| `RATE_LIMIT_REQUESTS` | —        | `1000`  | Max requests per period |
| `RATE_LIMIT_PERIOD`   | —        | `3600`  | Period in seconds       |

---

## Core Engine (Go · port 8080)

### Core

| Variable | Required | Example      | Notes                        |
| -------- | -------- | ------------ | ---------------------------- |
| `PORT`   | —        | `8080`       | Default: 8080                |
| `GO_ENV` | —        | `production` | `development` / `production` |

### Security

| Variable          | Required | Example                | Notes                                            |
| ----------------- | -------- | ---------------------- | ------------------------------------------------ |
| `INTERNAL_SECRET` | ✅ prod  | `openssl rand -hex 32` | **Must match** `GO_CORE_SECRET` in control-plane |

### Control Plane

| Variable            | Required | Example                     | Notes                            |
| ------------------- | -------- | --------------------------- | -------------------------------- |
| `CONTROL_PLANE_URL` | —        | `http://control-plane:4000` | Default: `http://localhost:4000` |

### Email Providers

| Variable                | Required | Example          | Notes                                       |
| ----------------------- | -------- | ---------------- | ------------------------------------------- |
| `SENDGRID_API_KEY`      | —        | `SG.xxx`         | At least one provider needed for real sends |
| `MAILGUN_API_KEY`       | —        | `key-xxx`        |                                             |
| `MAILGUN_DOMAIN`        | —        | `mg.acme.com`    | Required if Mailgun key is set              |
| `MAILGUN_REGION`        | —        | `us`             | `us` (default) or `eu`                      |
| `AWS_ACCESS_KEY_ID`     | —        | `AKIA...`        |                                             |
| `AWS_SECRET_ACCESS_KEY` | —        |                  |                                             |
| `AWS_REGION`            | —        | `us-east-1`      | Default: us-east-1                          |
| `POSTMARK_API_KEY`      | —        | `uuid`           | Server API token                            |
| `RESEND_API_KEY`        | —        | `re_xxx`         |                                             |
| `SMTP_HOST`             | —        | `smtp.gmail.com` | Generic SMTP                                |
| `SMTP_PORT`             | —        | `587`            | 587=STARTTLS, 465=implicit TLS              |
| `SMTP_USER`             | —        |                  |                                             |
| `SMTP_PASS`             | —        |                  |                                             |
| `SMTP_USE_TLS`          | —        | `false`          | `true` for implicit TLS (port 465)          |

### Performance

| Variable                  | Required | Example | Notes                          |
| ------------------------- | -------- | ------- | ------------------------------ |
| `MAX_WORKERS`             | —        | `100`   | Goroutine pool for batch sends |
| `QUEUE_BUFFER_SIZE`       | —        | `1000`  | Channel depth                  |
| `RATE_LIMIT_PER_PROVIDER` | —        | `1000`  | Token bucket refill rate/sec   |

### Idempotency

| Variable          | Required | Example | Notes                  |
| ----------------- | -------- | ------- | ---------------------- |
| `IDEMPOTENCY_TTL` | —        | `86400` | Seconds (default: 24h) |

### Logging

| Variable     | Required | Example | Notes                               |
| ------------ | -------- | ------- | ----------------------------------- |
| `LOG_LEVEL`  | —        | `info`  | `debug` / `info` / `warn` / `error` |
| `LOG_FORMAT` | —        | `json`  | `json` / `text`                     |

### Feature Flags

| Variable            | Required | Example | Notes                        |
| ------------------- | -------- | ------- | ---------------------------- |
| `ENABLE_METRICS`    | —        | `true`  | Exposes GET /metrics         |
| `ENABLE_TRACING`    | —        | `false` | OpenTelemetry (future)       |
| `ENABLE_IP_WARMING` | —        | `false` | IP warm-up schedule (future) |

---

## Phase CLI Usage

```bash
# Inject secrets at runtime (recommended)
cd control-plane && phase run -- bundle exec rails s -p 4000
cd apps/core-go  && phase run -- go run .

# Set a secret via CLI
phase secrets set DATABASE_URL "postgresql://..."
phase secrets set INTERNAL_SECRET "$(openssl rand -hex 32)"

# List all secrets
phase secrets list

# Export to .env format (for Docker)
phase secrets export --format dotenv > .env
```

## Cross-Service Secret Sync

These secrets **must be identical** across services:

| Control Plane var | Core Go var       | Purpose            |
| ----------------- | ----------------- | ------------------ |
| `GO_CORE_SECRET`  | `INTERNAL_SECRET` | Inter-service auth |
| `DATABASE_URL`    | `DATABASE_URL`    | Shared database    |
| `REDIS_URL`       | `REDIS_URL`       | Shared Redis       |
