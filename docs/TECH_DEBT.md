# CourierX — Tech Debt Register

**Date:** 2026-04-19  
**Legend:** Effort: XS < S < M < L < XL | Priority: P0 = blocks production, P1 = blocks reliability, P2 = improvement

---

## P0 — Blocks production

| # | Area | File | What's Missing | Effort |
|---|------|------|----------------|--------|
| 1 | Postmark provider (Go) | `internal/providers/provider.go` | `NewPostmarkProvider` referenced in factory, no `postmark.go` exists. Tenants with Postmark connections get a router error on every send. | M |
| 2 | Resend provider (Go) | `internal/providers/provider.go` | `NewResendProvider` referenced, no `resend.go` exists. Same issue as Postmark. | M |
| 3 | SMTP provider (Go) | `internal/providers/provider.go` | `NewSMTPProvider` referenced, no `smtp.go` exists. | M |
| 4 | `ProviderVerificationService` (Rails) | `app/controllers/api/v1/provider_connections_controller.rb` | Called on create/update/verify but not found in codebase. If missing, `NameError` on `create`. | M |
| 5 | Provider health check endpoint (Go) | `internal/api/handlers.go` | `GET /v1/health/provider/:type` called by `ProviderHealthCheckJob` doesn't exist — every health check returns 404, degrading all connections. | S |
| 6 | Domain verification disconnected from verify action | `app/controllers/api/v1/domains_controller.rb` | `verify` action calls `domain.verify!` (no DNS check). `DomainVerificationJob` is never enqueued. Domains can be "verified" without any DNS proof. | S |
| 7 | Suppression sync — SendGrid | `app/jobs/suppression_sync_job.rb` | Stub only. Needs `GET /v3/suppression/bounces`, unsubscribes, spam reports, pagination, incremental sync, and upsert. | L |
| 8 | Suppression sync — Mailgun | `app/jobs/suppression_sync_job.rb` | Stub only. Needs `GET /{domain}/bounces`, unsubscribes, complaints, EU/US URL switching, pagination, upsert. | L |
| 9 | Suppression sync — SES | `app/jobs/suppression_sync_job.rb` | No pull API exists. Must consume SNS events (webhook) or poll CloudWatch metrics. Significantly more complex. | XL |
| 10 | `from_email` domain ownership not enforced | `app/services/email_dispatch_service.rb` | No check that `from_email` belongs to a verified tenant domain. Platform acts as an open relay for verified tenants. See SECURITY_AUDIT.md C-4. | M |

---

## P1 — Blocks reliability

| # | Area | File | What's Missing | Effort |
|---|------|------|----------------|--------|
| 11 | Non-atomic outbox write | `app/services/email_dispatch_service.rb` | Three DB writes with no transaction wrapper. Crash between writes leaves orphaned email or orphaned outbox event. | S |
| 12 | Double-processing race in outbox job | `app/jobs/outbox_processor_job.rb` | Read-then-write status check is not atomic. Two concurrent workers can send the same email. | S |
| 13 | `mark_failed!` on uninitialized variable | `app/jobs/outbox_processor_job.rb` | `email` assigned after `event.process!`. Exception in `process!` leaves `email = nil`, email stuck in `queued`. | S |
| 14 | Idempotency key never forwarded to Go | `app/jobs/outbox_processor_job.rb` | `idempotency_key` read from `event.payload` where never written. Go-side dedup is dead code for all outbox sends. | S |
| 15 | Double retry backoff | `app/models/outbox_event.rb` | Sidekiq retry AND `process_after` delay both active — retry delays grow faster than intended. Pick one mechanism. | S |
| 16 | In-memory idempotency store (Go) | `internal/middleware/idempotency.go` | `sync.Map` — not shared across 3 replicas. Duplicate sends possible on retry. Needs Redis backend. See SECURITY_AUDIT.md H-8. | M |
| 17 | Template cache unbounded (Go) | `internal/template/template.go` | `sync.Map` with no size limit. Bulk sends with per-recipient bodies = OOM. Replace with bounded LRU. | M |
| 18 | DB connection pool not tuned (Go) | `internal/db/db.go` | No `MaxConnIdleTime` or `MaxConnLifetime`. Stale connections cause silent failures after cloud LB idle timeouts. | S |
| 19 | `Email` missing `belongs_to :outbox_event` | `app/models/email.rb` | `outbox_event_id` is written but not declared as an association. `email.outbox_event` raises `NoMethodError`. | S |
| 20 | Email body not stored in Go (audit trail) | `internal/db/queries.go` | `LogMessage` INSERT omits `BodyHTML` and `BodyText`. Delivery debugging is impossible without the sent body. | M |
| 21 | `CloudflareDnsService` (Rails) | `app/jobs/domain_verification_job.rb` | Referenced but not confirmed in codebase. If stub, Cloudflare DNS verification silently skips. | M |
| 22 | `ProviderHealthCheckJob` calls non-existent endpoint | `app/jobs/provider_health_check_job.rb` | (See P0 item 5) | S |
| 23 | `EmailsController#index` unbounded `per_page` | `app/controllers/api/v1/emails_controller.rb` | No cap on page size. Caller can dump entire emails table in one request. | S |
| 24 | Provider instantiated per-send in Go router | `internal/providers/router.go` | `NewProvider` called inside the send loop. Creates new HTTP client per request, thrashing connection pools. | M |

---

## P2 — Improvements

| # | Area | File | What's Missing | Effort |
|---|------|------|----------------|--------|
| 25 | `ProviderConnection` uniqueness too restrictive | `app/models/provider_connection.rb` | `uniqueness: { scope: [:tenant_id, :mode] }` prevents multiple connections per provider type. Blocks multi-account setups. | S |
| 26 | `BulkSendRequest` missing `ReplyTo` | `internal/types/types.go` | Bulk sends cannot set reply-to address. `SendRequest` has it; `BulkSendRequest` doesn't. | S |
| 27 | `GetProviderStats` — no HTTP handler | `internal/db/queries.go` | Provider stats are computed in the DB layer but never surfaced via API endpoint. | M |
| 28 | Admin `TenantsController` missing `create`/`delete` | `app/controllers/api/v1/admin/tenants_controller.rb` | Full admin lifecycle (create, hard-delete) is absent. Only update and impersonate work. | L |
| 29 | `DomainsController` missing `update` action | `app/controllers/api/v1/domains_controller.rb` | Tenants can't change domain config (e.g. `dkim_selector`) without destroying and recreating. | S |
| 30 | `RoutingRulesController` unnecessary eager load | `app/controllers/api/v1/routing_rules_controller.rb` | `includes(:provider_connections)` in index query; connections never used in the response. Wastes memory and DB round trips. | XS |
| 31 | `UsageRollupJob` — 77+ queries per tenant per run | `app/jobs/usage_rollup_job.rb` | Replace individual `count` queries with `GROUP BY status` aggregation. | M |
| 32 | SES tags malformed | `internal/providers/ses.go` | `Name: tag, Value: tag` — needs a `name:value` convention or sanitization before SES rejects on special chars. | S |
| 33 | `ProviderConnection#display_name` not validated | `app/models/provider_connection.rb` | No `presence: true` validation. Connections can be created with a blank display name, breaking health check logs. | XS |
| 34 | Error classification string-matching (Go) | `internal/providers/provider.go` | `ClassifyError` matches on message substrings. Provider API changes silently flip permanent ↔ transient classification. | M |
| 35 | CI doesn't run Brakeman or Bundler Audit | `.github/workflows/ci.yml` | Security scanners are in the Gemfile as dev deps but not invoked in the main CI workflow. | XS |
| 36 | `Tenant#generate_slug` TOCTOU race | `app/models/tenant.rb` | Concurrent tenant creation with same name causes `PG::UniqueViolation` → 500. Handle `RecordNotUnique`. | S |
| 37 | `DomainVerificationJob` opens 3 DNS resolvers | `app/jobs/domain_verification_job.rb` | Creates a separate `Resolv::DNS` instance per check method. Share one instance across the job run. | XS |
| 38 | Suppression check doesn't normalize `to_email` | `app/models/email.rb` | `to_email` stored as-is; suppression lookup uses `.downcase.strip`. Mixed-case addresses bypass suppression. | S |

---

## Summary by Effort

| Effort | Count | Notes |
|--------|-------|-------|
| XS | 5 | Quick wins — 1 hour or less each |
| S | 18 | 1–3 days each |
| M | 12 | 1–2 weeks each |
| L | 3 | Multi-sprint efforts |
| XL | 1 | SES suppression sync — requires architectural decision |

**Total P0 items:** 10 — all must be resolved before production  
**Total P1 items:** 14 — resolve within first month of operation  
**Total P2 items:** 14 — continuous improvement backlog
