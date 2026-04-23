# CourierX — Self-Hosting Guide

> This guide covers deploying CourierX on your own infrastructure. CourierX is fully open-source and designed for self-hosting.

---

## Architecture at a Glance

You need to run:

| Service | Port | Required |
|---------|------|----------|
| Rails control plane | 4000 | ✅ |
| Go core engine | 8080 | ✅ |
| PostgreSQL 15+ | 5432 | ✅ |
| Redis 7+ | 6379 | ✅ (Sidekiq) |
| Sidekiq (Rails background jobs) | — | ✅ |

The Go engine and Rails control plane share the same PostgreSQL instance.

---

## Generating Secrets

Before deploying, generate all required secrets. Never reuse dev defaults.

```bash
# INTERNAL_SECRET / GO_CORE_SECRET — must be identical between Rails and Go
openssl rand -hex 32

# JWT_SECRET
openssl rand -hex 32

# ENCRYPTION_KEY — must be exactly 32 characters for AES-256
openssl rand -hex 16   # produces 32 hex chars

# SECRET_KEY_BASE
openssl rand -hex 64   # produces 128 hex chars

# SIDEKIQ_PASSWORD
openssl rand -hex 16

# METRICS_TOKEN (optional but recommended)
openssl rand -hex 16
```

> ⚠️ **ENCRYPTION_KEY is permanent.** If you lose it or rotate it without re-encrypting provider credentials, all stored API keys for your tenants will be permanently unreadable. Back it up to a secrets manager (AWS Secrets Manager, HashiCorp Vault, 1Password Secrets Automation).

---

## Environment Variables

### Rails control plane

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | `postgres://user:pass@host/dbname` |
| `REDIS_URL` | ✅ | `redis://host:6379/0` |
| `SECRET_KEY_BASE` | ✅ | 128+ character random string |
| `JWT_SECRET` | ✅ | JWT signing secret |
| `ENCRYPTION_KEY` | ✅ | Provider credential encryption key (exactly 32 chars) |
| `GO_CORE_URL` | ✅ | Internal URL to Go engine (e.g. `http://core-go:8080`) |
| `GO_CORE_SECRET` | ✅ | Shared secret (must match Go `INTERNAL_SECRET`) |
| `SIDEKIQ_PASSWORD` | ✅ | Sidekiq Web UI password |
| `SIDEKIQ_USERNAME` | ⚪ | Sidekiq Web UI username (default: `admin`) |
| `FRONTEND_URL` | ⚪ | Allowed CORS origin for dashboard |
| `ALLOWED_ORIGINS` | ⚪ | Comma-separated CORS origins |
| `RAILS_ENV` | ✅ | `production` |
| `RAILS_LOG_TO_STDOUT` | ✅ | `true` (for container logs) |
| `PORT` | ⚪ | HTTP port (default: 3000) |

### Go core engine

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | Same PostgreSQL instance as Rails |
| `INTERNAL_SECRET` | ✅ | Must match Rails `GO_CORE_SECRET` |
| `GO_ENV` | ✅ | `production` |
| `PORT` | ⚪ | HTTP port (default: 8080) |
| `METRICS_TOKEN` | ⚪ | Bearer token to access `/metrics` |
| `RATE_LIMIT_PER_PROVIDER` | ⚪ | Max sends/sec per provider (default: 1000) |
| `MAX_WORKERS` | ⚪ | Concurrent send goroutines (default: 100) |
| `LOG_LEVEL` | ⚪ | `info` / `warn` / `error` |
| `REDIS_URL` | ⚪ | Required when Redis idempotency store is enabled |

### Global email provider fallbacks (optional — for ENV-based routing)

Set these if you want a global provider chain used when a tenant has no BYOK routing rules:

| Variable | Provider |
|----------|---------|
| `SENDGRID_API_KEY` | SendGrid |
| `MAILGUN_API_KEY` + `MAILGUN_DOMAIN` + `MAILGUN_REGION` | Mailgun |
| `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` + `AWS_REGION` | Amazon SES |
| `POSTMARK_API_KEY` | Postmark |
| `RESEND_API_KEY` | Resend |
| `SMTP_HOST` + `SMTP_PORT` + `SMTP_USER` + `SMTP_PASS` | SMTP relay |

---

## Docker Compose (Recommended for Small Deployments)

1. Clone the repository and copy the environment template:
```bash
git clone https://github.com/your-org/courierx
cd courierx
cp infra/.env.example infra/.env
```

2. Edit `infra/.env` with your generated secrets.

3. Start the stack:
```bash
cd infra
docker compose -f docker-compose.prod.yml up -d
```

4. Run database setup (first deploy only):
```bash
docker compose exec rails bundle exec rails db:create db:migrate
```

5. Verify health:
```bash
curl http://localhost:4000/up           # Rails
curl http://localhost:8080/health/live  # Go
```

---

## Fly.io

A `fly.toml` is included for one-command Fly.io deployment.

```bash
# Install flyctl: https://fly.io/docs/hands-on/install-flyctl/
fly auth login
fly launch --no-deploy --copy-config --name courierx

# Set secrets (do this for EACH secret)
fly secrets set INTERNAL_SECRET="$(openssl rand -hex 32)"
fly secrets set GO_CORE_SECRET="<same value as INTERNAL_SECRET>"
fly secrets set JWT_SECRET="$(openssl rand -hex 32)"
fly secrets set ENCRYPTION_KEY="$(openssl rand -hex 16)"
fly secrets set SECRET_KEY_BASE="$(openssl rand -hex 64)"
fly secrets set SIDEKIQ_PASSWORD="$(openssl rand -hex 16)"
fly secrets set DATABASE_URL="<your-postgres-url>"
fly secrets set REDIS_URL="<your-redis-url>"

# Deploy
fly deploy
```

---

## Railway

A `railway.json` is included.

```bash
railway login
railway init
railway add --service postgres
railway add --service redis

# Set env vars in the Railway dashboard or CLI:
railway variables set INTERNAL_SECRET="..."
# ... set all required vars

railway up
```

---

## Production Checklist

Before going live, verify every item:

**Security**
- [ ] `INTERNAL_SECRET` and `GO_CORE_SECRET` are the same non-default value
- [ ] `JWT_SECRET` is set and unique
- [ ] `ENCRYPTION_KEY` is backed up to a secrets manager
- [ ] `SIDEKIQ_PASSWORD` is set (UI is disabled without it)
- [ ] `SECRET_KEY_BASE` is 128+ characters and not the dev default
- [ ] `GO_ENV=production` and `RAILS_ENV=production`
- [ ] `METRICS_TOKEN` is set (or `/metrics` is not publicly reachable)
- [ ] TLS termination is in place (Nginx, Caddy, load balancer, Fly proxy)

**Database**
- [ ] PostgreSQL 15+ with `pgcrypto` extension: `CREATE EXTENSION IF NOT EXISTS pgcrypto;`
- [ ] All migrations run: `bundle exec rails db:migrate`
- [ ] Critical indexes exist (see INTERNAL_ARCHITECTURE.md)
- [ ] Automated backups configured

**DNS & Email**
- [ ] Sending domains are verified before enabling production sends
- [ ] SPF, DKIM, and DMARC records are in place for all sending domains
- [ ] Suppression sync jobs are running (verify `SuppressionSyncJob` is scheduled)

**Monitoring**
- [ ] Health check endpoints are monitored by your uptime service
- [ ] Prometheus metrics scraping is configured
- [ ] Sidekiq Web UI is accessible to your team (not public)
- [ ] Alert on Sidekiq dead queue growth
- [ ] Alert on Go engine error rate > 1%

---

## Upgrading

1. Pull the latest changes: `git pull origin main`
2. Run pending migrations: `bundle exec rails db:migrate`
3. Rebuild and restart services: `docker compose -f docker-compose.prod.yml up -d --build`
4. Check the health endpoints after each deploy

> Never skip migrations. Rails and Go share the same database; schema changes in one service may break the other if applied out of order.

---

## Scaling

### Horizontal scaling

**Rails control plane:** Stateless. Run multiple instances behind a load balancer. Ensure all instances share the same Redis (for Sidekiq and Rack::Attack rate limiting) and PostgreSQL.

**Go core engine:** Stateless with one important caveat — the in-memory idempotency store is NOT shared between replicas. When running multiple Go replicas, configure a Redis-backed idempotency store (see Tech Debt H-8 in TECH_DEBT.md) before scaling beyond one instance.

**Sidekiq:** Run multiple Sidekiq processes by adding workers. Configure queue weights to prioritize `outbox` and `webhooks` queues over background analytics jobs.

### Recommended minimum production setup

```
2× Rails app servers (behind load balancer)
2× Go engine instances (behind load balancer)
1× Sidekiq worker (2 workers for high volume)
1× PostgreSQL with read replica
1× Redis with persistence enabled
```

---

## Troubleshooting

### Emails stuck in `queued` state
1. Check Sidekiq is running: access `/sidekiq` (with credentials)
2. Check for dead jobs: `Sidekiq::DeadSet.new.size`
3. Check Go engine health: `curl http://core-go:8080/health/ready`
4. Check `GO_CORE_SECRET` matches `INTERNAL_SECRET` in both services
5. Check outbox events: `SELECT status, count(*) FROM outbox_events GROUP BY status;`

### "Service not configured" from Go engine
`INTERNAL_SECRET` is not set. Set the env var and restart the Go service.

### Provider credentials fail to decrypt after redeployment
`ENCRYPTION_KEY` was changed. Restore the previous value. If permanently lost, tenants must reconnect their provider accounts.

### Sidekiq Web UI returns 403 Forbidden
`SIDEKIQ_PASSWORD` is not set. The UI is disabled without it in non-development environments. Set the variable and restart Rails.

### Rate limit headers show 0 remaining but emails still send
The old version of `RateLimitable` (before this fix) was `after_action` only. Ensure you are running the latest version where `before_action :enforce_rate_limit` is present.
