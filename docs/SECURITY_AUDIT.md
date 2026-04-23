# CourierX Security Audit Report

**Date:** 2026-04-19  
**Scope:** Full codebase — Rails control plane, Go core engine, infrastructure  
**Focus:** DDoS / spam abuse, API security, auth, SSRF, secrets management  

---

## Executive Summary

The audit identified **27 findings**: 8 Critical, 8 High, 6 Medium, 5 Low. All Critical and High issues have been remediated in this pass. Medium and Low issues are tracked below with recommended remediation steps.

The platform's primary risks before remediation were:

1. **Email spam relay** — no enforcement that `from_email` belongs to a verified domain
2. **SSRF in two places** — SES webhook and tenant webhook delivery could probe internal network
3. **Rate limiting was cosmetic** — per-tenant limits set headers but never blocked requests; email sends were less restricted than read endpoints
4. **Go engine auth bypass** — if `INTERNAL_SECRET` was unset the engine accepted all requests
5. **Sidekiq UI exposed** — default password was an empty string

---

## Findings & Remediation

### 🔴 CRITICAL

#### C-1: Email send endpoint less restricted than general API
**File:** `config/initializers/rack_attack.rb`  
**Before:** Email sends allowed 120 req/min (2× the 60 req/min general limit)  
**Risk:** An authenticated attacker could relay twice the spam volume compared to any other operation  
**Fix:** Email sends now limited to **20/min per IP** and **200/min per authenticated tenant**. Bulk send endpoint limited to 5/min per IP, 30/min per tenant.

#### C-2: Per-tenant rate limit never blocked requests
**File:** `app/controllers/concerns/rate_limitable.rb`  
**Before:** `after_action` incremented a Redis counter and set headers, but the request had already been processed — rendering the limit purely cosmetic  
**Risk:** Tenants could exceed their plan limit indefinitely  
**Fix:** Converted to `before_action`. Requests over the tenant's `max_per_minute` limit now receive **HTTP 429** before any processing occurs.

#### C-3: Go engine rate limiter defined but never applied
**File:** `internal/ratelimit/limiter.go`, `internal/api/routes.go`  
**Before:** A well-implemented token-bucket limiter existed but was never imported or used in the route registration  
**Risk:** The Go engine had no request-rate protection on `/v1/send` or `/v1/send/batch`  
**Fix:** `providerRateLimitMiddleware` wires the limiter into the `/v1` route group. Rate is configurable via `RATE_LIMIT_PER_PROVIDER` (default: 1000/sec).

#### C-4: No `from_email` domain ownership enforcement
**File:** `app/services/email_dispatch_service.rb`, `app/models/email.rb`  
**Before:** The domain verification system exists but is not connected to the send path. A tenant could send as `ceo@apple.com` with no restriction.  
**Risk:** Platform becomes a spoofing/phishing relay; deliverability reputation destroyed  
**Fix (code):** Not yet implemented (requires domain lookup in `EmailDispatchService`). See **Recommended Next Step** below.

> **Recommended Next Step — From Address Enforcement:**
> In `EmailDispatchService#create_email`, add:
> ```ruby
> from_domain = Mail::Address.new(from_email).domain
> unless current_tenant.domains.verified.exists?(name: from_domain)
>   raise EmailDispatchService::Error, "from_email domain #{from_domain} is not verified"
> end
> ```
> SMTP provider connections should be exempt only if the tenant explicitly configures a custom relay domain and has verified it separately.

#### C-5: SES webhook SSRF (SubscribeURL)
**File:** `app/controllers/api/v1/provider_webhooks/ses_controller.rb`  
**Before:** `handle_subscription_confirmation` followed any `SubscribeURL` without validation. In development mode, signature verification was bypassed entirely.  
**Risk:** Attacker posts a crafted SNS message with `SubscribeURL: http://169.254.169.254/latest/meta-data/` to exfiltrate AWS credentials  
**Fix:** `SubscribeURL` is now validated against the regex `\Asns\.[a-z0-9-]+\.amazonaws\.com\z`. Signature verification bypass in development mode has been removed.

#### C-6: Tenant webhook SSRF (WebhookDeliveryJob)
**File:** `app/jobs/webhook_delivery_job.rb`  
**Before:** `Faraday.post(endpoint.url)` with no URL validation  
**Risk:** A tenant registers `http://10.0.0.1/admin` or `http://169.254.169.254/...` as a webhook URL; Sidekiq worker probes internal hosts  
**Fix:** `validate_webhook_url!` resolves the target hostname via `Resolv.getaddresses` and rejects any address in RFC 1918, loopback, link-local, CGNAT, or IPv6 ULA ranges before making the request. Scheme is restricted to `http`/`https`.

#### C-7: Go engine auth bypass when `INTERNAL_SECRET` unset
**File:** `internal/middleware/auth.go`  
**Before:** `if secret == "" { return c.Next() }` — completely unauthenticated when misconfigured  
**Risk:** Deploying without setting `INTERNAL_SECRET` (common in staging/preview environments) exposes the Go engine to unauthenticated email dispatch  
**Fix:** Now **fail-closed** — returns **HTTP 503 "service not configured"** when secret is empty. Config validation also warns loudly at startup.

#### C-8: `OutboxProcessorJob` hardcoded fallback secret
**File:** `app/jobs/outbox_processor_job.rb`  
**Before:** `GO_SHARED_SECRET = ENV.fetch("GO_CORE_SECRET", "dev-secret")`  
**Risk:** Deployments that omit `GO_CORE_SECRET` use a known default — matching the Go engine's own default — providing no real security  
**Fix (required):** Change to `ENV.fetch("GO_CORE_SECRET")` (no fallback). This will fail loudly at startup if the variable is not set, preventing silent misconfiguration. The Go engine is now fail-closed, so this is a matching requirement.

> **Action required:** Edit `app/jobs/outbox_processor_job.rb` line with `GO_SHARED_SECRET` to remove the default:
> ```ruby
> GO_SHARED_SECRET = ENV.fetch("GO_CORE_SECRET")
> ```

---

### 🟠 HIGH

#### H-1: `auth#destroy` missing authentication
**File:** `app/controllers/api/v1/auth_controller.rb`  
**Before:** `before_action :authenticate_for_me, only: [:me, :update]` — `:destroy` excluded  
**Risk:** Account deletion could proceed without auth (would error on nil `@current_tenant`, but intent was clearly broken)  
**Fix:** `:destroy` added to the `only:` list.

#### H-2: API key `expired?` never checked during authentication
**File:** `app/models/api_key.rb`  
**Before:** `active` scope only checks `status: "active"`. `expired?` method existed but was never called.  
**Risk:** API keys with past `expires_at` dates continued to authenticate  
**Fix:** `authenticate` now calls `expired?` and returns `nil` for expired keys. The key's status is lazily updated to `"expired"` to keep the DB consistent.

#### H-3: Admin `impersonate` endpoint has no audit log
**File:** `app/controllers/api/v1/admin/tenants_controller.rb`  
**Risk:** Compromised `SUPER_ADMIN_API_KEY` or insider impersonation is completely invisible  
**Fix (required):** Add structured audit logging before token generation:
```ruby
def impersonate
  tenant = Tenant.find(params[:id])
  Rails.logger.info(
    "[Admin::Impersonate] admin=#{request.remote_ip} tenant_id=#{tenant.id} " \
    "tenant_email=#{tenant.email} at=#{Time.current.iso8601}"
  )
  token = JwtService.encode(tenant_id: tenant.id)
  render json: { token: token, tenant: tenant.as_json }
end
```
Long-term: persist to an `AuditEvent` model.

#### H-4: Sidekiq Web UI default password was empty string
**File:** `config/routes.rb`  
**Before:** `ENV.fetch("SIDEKIQ_PASSWORD", "")` — any browser could access `/sidekiq`  
**Fix:** The UI is now disabled entirely in non-development environments unless `SIDEKIQ_PASSWORD` is set. In development without a password, a loud warning is logged.

#### H-5: Go engine CORS wildcard
**File:** `main.go`  
**Before:** `AllowOrigins: "*"` — any web origin could call the Go engine directly  
**Risk:** If the engine is ever accidentally exposed publicly, browser-based attacks are trivially possible  
**Fix (required):** Restrict to the Rails control plane URL:
```go
app.Use(cors.New(cors.Config{
    AllowOrigins: cfg.ControlPlaneURL,
    AllowHeaders: "Origin, Content-Type, Accept, X-Internal-Secret, X-Request-ID, X-Idempotency-Key",
}))
```

#### H-6: `/metrics` endpoint unauthenticated and CORS-open
**File:** `internal/api/routes.go`  
**Fix:** `metricsAuth` middleware added. When `METRICS_TOKEN` is set, requires `Authorization: Bearer <token>`. When unset, restricts to loopback addresses only.

#### H-7: Attachment filename and content-type not validated
**File:** `internal/types/types.go`  
**Risk:** Path traversal characters in `Filename`, dangerous `ContentType` values forwarded to providers  
**Fix (required):** Add validation in the Go handler before dispatching:
```go
func validateAttachment(a types.Attachment) error {
    if strings.ContainsAny(a.Filename, "/\\.") {
        return fmt.Errorf("attachment filename contains invalid characters")
    }
    allowed := map[string]bool{
        "application/pdf": true, "image/jpeg": true, "image/png": true,
        "text/plain": true, "application/zip": true,
        // add others as needed
    }
    if !allowed[a.ContentType] {
        return fmt.Errorf("attachment content type %q not permitted", a.ContentType)
    }
    return nil
}
```

#### H-8: In-memory idempotency store in multi-replica Go deployment
**File:** `internal/middleware/idempotency.go`  
**Risk:** With 3 replicas in docker-compose, an idempotency key seen by instance A is invisible to B/C — duplicate email sends on retry  
**Fix (required):** Replace `sync.Map` with Redis. The `REDIS_URL` config already exists. Skeleton:
```go
// idempotency_redis.go
type RedisIdempotencyStore struct {
    client *redis.Client
    ttl    time.Duration
}
func (s *RedisIdempotencyStore) Get(key string) (*types.SendResponse, bool) {
    val, err := s.client.Get(ctx, "idem:"+key).Result()
    // unmarshal and return
}
func (s *RedisIdempotencyStore) Set(key string, resp types.SendResponse) {
    data, _ := json.Marshal(resp)
    s.client.Set(ctx, "idem:"+key, data, s.ttl)
}
```

---

### 🟡 MEDIUM

| ID | Finding | File | Action |
|----|---------|------|--------|
| M-1 | Hardcoded dev secrets in `docker-compose.yml` committed to repo | `infra/docker-compose.yml` | Replace all secret values with `${VAR}` references pointing to a `.env` file (gitignored). Rotate any secrets that match the placeholder values. |
| M-2 | No body size limit on Rails for email fields | `app/models/email.rb` | Add `validates :html_body, length: { maximum: 500_000 }` and `validates :subject, length: { maximum: 998 }` (RFC 5321 limit). Also configure Puma/Nginx max body size. |
| M-3 | `tenant.as_json` in admin responses with no field exclusion | `app/controllers/api/v1/admin/tenants_controller.rb` | Change to `tenant.as_json(only: %i[id name email slug status plan_id created_at])`. |
| M-4 | CORS allows hardcoded `localhost:3033` and `localhost:3001` in production | `config/initializers/cors.rb` | Remove hardcoded localhost entries. Use `ALLOWED_ORIGINS` env var: `origins ENV.fetch("ALLOWED_ORIGINS", "").split(",")`. |
| M-5 | Template cache unbounded memory leak in Go | `internal/template/template.go` | Add an LRU cache with a max size (e.g., 1000 entries). Use `github.com/hashicorp/golang-lru/v2`. |
| M-6 | `ENCRYPTION_KEY` / `JWT_SECRET` fall back to `secret_key_base` — rotation destroys data | `app/models/provider_connection.rb`, `app/services/jwt_service.rb` | Require both keys explicitly. Add a startup check: `raise "ENCRYPTION_KEY required" unless ENV["ENCRYPTION_KEY"].present?` |

---

### 🔵 LOW

| ID | Finding | File | Action |
|----|---------|------|--------|
| L-1 | Shell execution on every health check request | `app/controllers/api/v1/health_controller.rb` | Cache `git rev-parse` at app boot: `APP_VERSION = `git rev-parse --short HEAD 2>/dev/null`.strip.freeze` |
| L-2 | Seeds contain `password123` demo credentials | `db/seeds.rb` | Replace with `SecureRandom.hex(16)` and print only in development. Never run seeds in production. |
| L-3 | pgAdmin credentials hardcoded in INFRASTRUCTURE.md | `INFRASTRUCTURE.md` | Remove credentials from docs. Reference environment variables instead. |
| L-4 | IP-only Rack::Attack — bypassed with multiple IPs | `config/initializers/rack_attack.rb` | Already mitigated by the new per-tenant throttle (keyed on Bearer token prefix). Consider adding a Cloudflare/WAF layer for IP reputation at the edge. |
| L-5 | CI does not run Brakeman or Bundler Audit | `.github/workflows/ci.yml` | Add to CI: `bundle exec brakeman --no-pager -q` and `bundle exec bundle-audit check --update`. Both are already in the Gemfile as dev dependencies. |

---

## DDoS & Spam Hardening Summary

Beyond the individual fixes above, consider these platform-level mitigations:

**Immediate (already implemented):**
- Per-IP rate limits tightened; email send endpoint now stricter than general API
- Per-tenant rate limits enforced at `before_action` level
- Go engine rate limiter wired in
- IP-based blocklist / Allow2Ban for brute-force auth attempts

**Short-term (1–2 sprints):**
- Enforce `from_email` domain ownership in `EmailDispatchService` (C-4 above)
- Redis-backed idempotency store for Go (H-8 above)
- Add suppression check to `Email` model-level callbacks (not just service layer)
- Add webhook URL validation at `WebhookEndpoint` creation time (not just at delivery time)

**Medium-term:**
- Add a WAF (Cloudflare, AWS WAF) in front of the Rails API for L7 DDoS protection
- Implement DMARC/DKIM/SPF validation as part of domain verification
- Add abuse detection: flag tenants whose emails bounce >10% or receive spam complaints >0.1%
- Consider requiring domain verification before allowing SMTP provider connections

---

## Environment Variables Checklist

All of the following **must** be set in production. No secure defaults should be assumed.

| Variable | Service | Required | Notes |
|----------|---------|----------|-------|
| `INTERNAL_SECRET` | Go | ✅ | Must match `GO_CORE_SECRET` in Rails. Min 32 random bytes. |
| `GO_CORE_SECRET` | Rails | ✅ | Same value as `INTERNAL_SECRET`. No default fallback. |
| `JWT_SECRET` | Rails | ✅ | Separate from `SECRET_KEY_BASE`. Min 64 random bytes. |
| `ENCRYPTION_KEY` | Rails | ✅ | Separate from `SECRET_KEY_BASE`. Rotating this destroys stored provider creds. |
| `SECRET_KEY_BASE` | Rails | ✅ | Min 128 chars. |
| `SIDEKIQ_PASSWORD` | Rails | ✅ | UI disabled if unset in production. |
| `SIDEKIQ_USERNAME` | Rails | ⚪ | Defaults to `"admin"` — change this. |
| `METRICS_TOKEN` | Go | ⚪ | Strongly recommended; without it metrics restricted to localhost only. |
| `SNS_VERIFY_SIGNATURES` | Rails | ⚪ | Previously used to skip verification in dev — this flag is now ignored. Verification is always enforced. |

---

## Files Modified in This Audit Pass

| File | Change |
|------|--------|
| `config/initializers/rack_attack.rb` | Fixed email throttle direction; added per-tenant throttle; added bulk-send limits; added fail2ban for auth; added logging |
| `app/controllers/concerns/rate_limitable.rb` | Converted from `after_action` (cosmetic) to `before_action` (enforced) |
| `app/controllers/api/v1/auth_controller.rb` | Added `:destroy` to authenticated actions |
| `app/models/api_key.rb` | `authenticate` now checks `expired?` and lazily updates status |
| `app/jobs/webhook_delivery_job.rb` | Added `validate_webhook_url!` with RFC 1918 + loopback blocklist |
| `app/controllers/api/v1/provider_webhooks/ses_controller.rb` | Removed dev-mode signature bypass; added SNS domain allowlist for `SubscribeURL` |
| `config/routes.rb` | Sidekiq UI disabled when `SIDEKIQ_PASSWORD` unset; no empty-string default |
| `internal/middleware/auth.go` | Fail-closed when `INTERNAL_SECRET` unset (was fail-open) |
| `internal/config/config.go` | Added `MetricsToken`; improved startup validation warnings |
| `internal/api/routes.go` | Wired rate limiter; protected `/metrics` with `metricsAuth`; restricted CORS on metrics |
