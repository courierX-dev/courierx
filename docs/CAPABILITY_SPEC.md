# CourierX — Full Capability Spec
**Date:** April 19, 2026  
**Author:** Product + Engineering  
**Status:** Living document — update as capabilities ship

---

## What Is CourierX?

CourierX is a **multi-provider email routing API** for developers and SaaS products. It sits between an application and email providers (SES, SendGrid, Mailgun, Postmark, Resend, SMTP) and handles routing, failover, suppression, and observability — so developers don't have to.

**Core promise:** One API call to send email. Zero lock-in. Automatic failover. Your keys, your providers.

---

## Everything CourierX Should Be Able to Do

This is the full capability inventory — every feature the product could eventually offer, grounded in what makes sense for the product category and what the codebase already supports.

---

## NOW — Ready to Ship After Integration Tests Pass

*These capabilities are implemented in the codebase. They need end-to-end verification, not new code.*

### 1. Tenant Account Management

**What it does:** A developer signs up, gets credentials, and can manage their account.

| Capability | Status | API |
|-----------|--------|-----|
| Register a new tenant account | ✅ Implemented | `POST /api/v1/auth/register` |
| Log in with email + password | ✅ Implemented | `POST /api/v1/auth/login` |
| Get current account details | ✅ Implemented | `GET /api/v1/auth/me` |
| Update account name / settings | ✅ Implemented | `PATCH /api/v1/auth/me` |
| Delete account | ✅ Implemented | `DELETE /api/v1/auth/me` |
| JWT-based session auth | ✅ Implemented | Bearer token in Authorization header |
| Tenant modes: demo / byok / managed | ✅ Implemented | Set on register |

**After tests pass, a user can:** Sign up, log in, get a JWT, and use it to authenticate all other API calls.

---

### 2. API Key Management

**What it does:** Issue server-to-server API keys (`cxk_live_*`) for production integrations.

| Capability | Status | API |
|-----------|--------|-----|
| Create a named API key | ✅ Implemented | `POST /api/v1/api_keys` |
| List all API keys | ✅ Implemented | `GET /api/v1/api_keys` |
| Revoke an API key | ✅ Implemented | `PATCH /api/v1/api_keys/:id/revoke` |
| Delete an API key | ✅ Implemented | `DELETE /api/v1/api_keys/:id` |
| Scoped API keys (limit permissions) | ✅ Implemented | `scopes` field on create |
| Keys stored as SHA-256 hash (never raw) | ✅ Implemented | — |
| Key prefix shown for identification | ✅ Implemented | `cxk_live_` prefix |

**After tests pass, a user can:** Create an API key once (raw key shown only on creation), use it to authenticate API calls, and revoke it when rotating credentials.

---

### 3. Email Sending

**What it does:** The core product. Send a transactional email through the best available provider.

| Capability | Status | API |
|-----------|--------|-----|
| Send a single email | ✅ Implemented | `POST /api/v1/emails` |
| HTML + plain text body | ✅ Implemented | `html_body`, `text_body` params |
| Custom from name/address | ✅ Implemented | `from_email`, `from_name` params |
| Reply-to header | ✅ Implemented | `reply_to` param |
| Email tagging | ✅ Implemented | `tags: []` param |
| Arbitrary metadata | ✅ Implemented | `metadata: {}` param |
| Idempotency key support | ✅ Implemented | `metadata.idempotency_key` (24h window) |
| Suppression list check before send | ✅ Implemented | Via EmailDispatchService |
| Async send via Sidekiq outbox pattern | ✅ Implemented | OutboxProcessorJob |
| Automatic provider failover | ✅ Implemented | Go router iterates providers by priority |
| Permanent error stops failover | ✅ Implemented | Go router — invalid email, auth failure |
| Transient error tries next provider | ✅ Implemented | Go router — timeout, rate limit, 5xx |
| Batch email sending | ✅ Implemented | `POST /v1/send/batch` (Go layer) |
| Handlebars template rendering | ✅ Implemented | Template engine in Go |

**After tests pass, a user can:** Send a single email via API, see it processed through the outbox, routed to a provider, and confirmed in their email history.

---

### 4. Provider Management (BYOK)

**What it does:** Tenants connect their own provider credentials. CourierX never owns the sending infrastructure.

| Capability | Status | API |
|-----------|--------|-----|
| Add a provider connection | ✅ Implemented | `POST /api/v1/provider_connections` |
| List provider connections | ✅ Implemented | `GET /api/v1/provider_connections` |
| Update provider credentials | ✅ Implemented | `PATCH /api/v1/provider_connections/:id` |
| Delete a provider connection | ✅ Implemented | `DELETE /api/v1/provider_connections/:id` |
| Verify provider credentials | ✅ Implemented | `POST /api/v1/provider_connections/:id/verify` |
| Credentials encrypted at rest (AES-256) | ✅ Implemented | MessageEncryptor, virtual attrs |
| Credentials never returned in API responses | ✅ Implemented | connection_json masks them |
| **SendGrid** provider | ✅ Implemented | Go: `sendgrid.go` |
| **Mailgun** provider | ✅ Implemented | Go: `mailgun.go` |
| **AWS SES** provider (Sig v4, no SDK) | ✅ Implemented | Go: `ses.go` |
| **Postmark** provider | ✅ Implemented | Go: `postmark.go` |
| **Resend** provider | ✅ Implemented | Go: `resend.go` |
| **SMTP** provider | ✅ Implemented | Go: `smtp.go` |
| Provider health tracking (success rate, latency) | ✅ Implemented | `success_rate`, `avg_latency_ms` on model |
| Provider health check job | ✅ Implemented | `ProviderHealthCheckJob` |

**After tests pass, a user can:** Connect their own SendGrid API key, have it encrypted, and have CourierX route sends through their account.

---

### 5. Routing Rules

**What it does:** Configure which providers to use, and in what order, for different sending scenarios.

| Capability | Status | API |
|-----------|--------|-----|
| Create a routing rule | ✅ Implemented | `POST /api/v1/routing_rules` |
| List routing rules | ✅ Implemented | `GET /api/v1/routing_rules` |
| Update a routing rule | ✅ Implemented | `PATCH /api/v1/routing_rules/:id` |
| Delete a routing rule | ✅ Implemented | `DELETE /api/v1/routing_rules/:id` |
| Match by from domain | ✅ Implemented | `match_from_domain` field |
| Match by tag | ✅ Implemented | `match_tag` field |
| Default fallback rule | ✅ Implemented | `is_default` field |
| Routing strategies (roundrobin, failover, etc.) | ✅ Implemented | `strategy` field |

**After tests pass, a user can:** Set up a rule that says "for emails from marketing.mycompany.com, use SendGrid first, then Mailgun as fallback."

---

### 6. Email History & Status Tracking

**What it does:** A full audit trail of every email sent — status, events, provider used.

| Capability | Status | API |
|-----------|--------|-----|
| List all emails sent | ✅ Implemented | `GET /api/v1/emails` |
| Filter by status, recipient, date range | ✅ Implemented | Query params on index |
| View a single email with full event log | ✅ Implemented | `GET /api/v1/emails/:id` |
| Email statuses: queued, sending, delivered, failed, bounced, suppressed | ✅ Implemented | `Email#status` |
| Event types: sent, delivered, opened, clicked, bounced, complained | ✅ Implemented | `EmailEvent#event_type` |
| Provider message ID tracking | ✅ Implemented | `provider_message_id` field |
| Bounce type + bounce code | ✅ Implemented | On `EmailEvent` |
| Link click tracking | ✅ Implemented | `link_url` on `EmailEvent` |

**After tests pass, a user can:** View every email they've sent, its current status, and a timestamped log of every delivery event.

---

### 7. Suppression List

**What it does:** Prevent sending to addresses that have bounced, complained, or been manually blocked.

| Capability | Status | API |
|-----------|--------|-----|
| View suppression list | ✅ Implemented | `GET /api/v1/suppressions` |
| Manually add a suppression | ✅ Implemented | `POST /api/v1/suppressions` |
| Remove a suppression | ✅ Implemented | `DELETE /api/v1/suppressions/:id` |
| Filter by reason (bounce, complaint, manual) | ✅ Implemented | `?reason=` query param |
| Automatic suppression check on every send | ✅ Implemented | EmailDispatchService |
| Suppression reasons: bounce, complaint, manual, unsubscribe | ✅ Implemented | `reason` field |

**After tests pass, a user can:** Block any email address from receiving sends, and know that suppression is automatically enforced on every outbound message.

---

### 8. Webhook Endpoints (Outbound)

**What it does:** CourierX pushes delivery events to the tenant's own server in real time.

| Capability | Status | API |
|-----------|--------|-----|
| Register a webhook URL | ✅ Implemented | `POST /api/v1/webhook_endpoints` |
| List webhook endpoints | ✅ Implemented | `GET /api/v1/webhook_endpoints` |
| Update a webhook | ✅ Implemented | `PATCH /api/v1/webhook_endpoints/:id` |
| Delete a webhook | ✅ Implemented | `DELETE /api/v1/webhook_endpoints/:id` |
| Webhook signing secret (auto-generated) | ✅ Implemented | `SecureRandom.hex(32)` on create |
| Subscribe to specific event types | ✅ Implemented | `events: []` field |
| Webhook delivery job | ✅ Implemented | `WebhookDeliveryJob` |

**After tests pass, a user can:** Register their server endpoint and receive `email.delivered`, `email.bounced`, `email.opened` events pushed to them in real time.

---

### 9. Domain Management

**What it does:** Manage sending domains with SPF/DKIM/DMARC verification.

| Capability | Status | API |
|-----------|--------|-----|
| Add a sending domain | ✅ Implemented | `POST /api/v1/domains` |
| List domains | ✅ Implemented | `GET /api/v1/domains` |
| Trigger domain verification | ✅ Implemented | `DomainVerificationJob` |
| Per-provider verification status | ✅ Implemented | `DomainProviderVerification` model |
| Cloudflare DNS service | ✅ Implemented | `CloudflareDnsService` |

**Needs verification:** Does the DNS polling logic actually check SPF/DKIM records and update status correctly?

---

### 10. Infrastructure & Observability

| Capability | Status | Notes |
|-----------|--------|-------|
| Liveness probe | ✅ Implemented | `GET /health/live` |
| Readiness probe (DB check) | ✅ Implemented | `GET /health/ready` |
| Prometheus metrics | ✅ Implemented | Go observability layer |
| Structured logging | ✅ Implemented | Go `slog` |
| Sidekiq background jobs | ✅ Implemented | Redis-backed |
| Docker Compose (dev + prod) | ✅ Implemented | `infra/` |
| GitHub Actions CI | ✅ Implemented | `.github/workflows/` |

---

## NEXT — Needs Building or Deep Verification (Weeks 3–8)

*These capabilities either don't exist yet or exist as shells without verified logic.*

### 11. Inbound Webhook Processing (Provider → CourierX)

**What it does:** Receive delivery events from SendGrid, Mailgun, and SES, verify their signatures, normalize them into EmailEvent records, and trigger tenant webhook delivery.

| Capability | Status | Notes |
|-----------|--------|-------|
| SendGrid inbound webhook handler | 🔴 Not built | Needs `/webhooks/sendgrid` endpoint |
| Mailgun inbound webhook handler | 🔴 Not built | Needs `/webhooks/mailgun` endpoint |
| AWS SES/SNS inbound webhook handler | 🔴 Not built | Needs `/webhooks/ses` endpoint |
| Postmark inbound webhook handler | 🔴 Not built | — |
| Resend inbound webhook handler | 🔴 Not built | — |
| Webhook signature verification (per provider) | 🔴 Not built | Critical for security |
| Event normalization → EmailEvent | 🔴 Not built | Map provider fields to CourierX schema |
| Automatic suppression on hard bounce | 🔴 Not built | Should auto-add to suppression list |
| Automatic suppression on spam complaint | 🔴 Not built | — |

**Why this matters:** Without it, email status is always "sent" — you can never show "delivered", "bounced", or "opened". This is the feedback loop that makes CourierX useful.

**Acceptance criteria:**
- Given a SendGrid `delivered` event arrives at `POST /webhooks/sendgrid`
- When signature is verified and event is parsed
- Then the matching Email record status updates to "delivered" and an EmailEvent is created
- And if a `bounce` event arrives for a hard bounce, the address is added to the suppression list

---

### 12. Usage Statistics & Analytics

**What it does:** Per-tenant email volume, delivery rates, bounce rates, open rates.

| Capability | Status | Notes |
|-----------|--------|-------|
| Usage rollup job | ⚠️ Scaffolded | `UsageRollupJob` exists, logic needs verification |
| Usage stats API | ⚠️ Scaffolded | `UsageStatsController` exists |
| Email volume by time period | 🔴 Not verified | — |
| Delivery rate (delivered / sent) | 🔴 Not verified | — |
| Bounce rate (bounced / sent) | 🔴 Not verified | — |
| Open rate (opened / delivered) | 🔴 Not verified | Requires inbound webhooks |
| Click rate (clicked / delivered) | 🔴 Not verified | Requires inbound webhooks |
| Per-provider delivery stats | 🔴 Not verified | — |
| Dashboard summary endpoint | ⚠️ Scaffolded | `DashboardController` exists |

---

### 13. Suppression Sync from Providers

**What it does:** Pull bounce and complaint lists from providers to keep suppression list in sync.

| Capability | Status | Notes |
|-----------|--------|-------|
| Suppression sync job | ⚠️ Scaffolded | `SuppressionSyncJob` exists |
| Pull bounces from SendGrid | 🔴 Not built | — |
| Pull bounces from Mailgun | 🔴 Not built | — |
| Pull bounces from SES | 🔴 Not built | — |
| Dedup cross-provider suppressions | 🔴 Not built | — |

---

### 14. Rate Limiting

**What it does:** Enforce per-tenant send rate limits.

| Capability | Status | Notes |
|-----------|--------|-------|
| Rate limit policy model | ✅ Implemented | `RateLimitPolicy` model |
| Rate limit enforcement in API | ⚠️ Exists in controller concerns | `RateLimitable` concern — needs verification |
| Rate limit headers in response | 🔴 Not verified | `X-RateLimit-*` headers |
| Rate limit exceeded response | 🔴 Not verified | 429 status with retry-after |
| Per-tenant configurable limits | 🔴 Not verified | — |

---

### 15. OpenAPI Documentation

**What it does:** Machine-readable API spec enabling client generation, Postman imports, and developer self-service.

| Capability | Status | Notes |
|-----------|--------|-------|
| OpenAPI 3.0 spec | 🔴 Not built | Generate from rswag or write manually |
| Interactive docs (Swagger UI or Redoc) | 🔴 Not built | — |
| Auto-generated from controller annotations | 🔴 Not built | — |

**Defer until:** API surface is stable (all core endpoints working and tested).

---

## LATER — Future Capabilities (Months 3–6+)

*These are real product features worth building, but only after the core works.*

### 16. Billing & Subscriptions (Milestone 3)

| Capability | Notes |
|-----------|-------|
| Free / Pro / Enterprise plans | Define limits per plan |
| Stripe integration | Payment processing, customer records |
| Usage-based billing | Charge per email or per 1,000 emails |
| Invoice generation | Monthly invoices via Stripe |
| Plan limit enforcement | Block sends when over quota |
| Billing portal UI | Upgrade, downgrade, cancel |
| Payment webhook processing | `POST /webhooks/stripe` |

**Why defer:** Billing without users is waste. Build this after you have developers actively using the API.

---

### 17. Web Dashboard (Milestone 4)

| Capability | Notes |
|-----------|-------|
| Login / signup | Next.js auth flow → JWT |
| Email history view | Table with filters + status |
| Send a test email | From the dashboard |
| Provider management UI | Add, verify, prioritize providers |
| API key management | Create, copy, revoke |
| Routing rules UI | Drag-drop priority ordering |
| Webhook management | Register, test, view delivery history |
| Suppression list UI | View, add, remove suppressions |
| Analytics charts | Volume, delivery rate, bounce rate over time |
| Domain management | Add, verify, view DNS records needed |
| Account settings | Name, email, password, billing |

**Priority order for MVP dashboard:** Login → Send a test email → Email history → API key management. Four pages. Everything else is follow-on.

---

### 18. Domain Verification (Full SPF/DKIM/DMARC)

| Capability | Notes |
|-----------|-------|
| Show required DNS records | SPF, DKIM, DMARC records to add |
| Poll DNS for verification | Background job checks every N minutes |
| Per-provider verification status | SendGrid requires different records than SES |
| Email sending blocked on unverified domain | Warn or block based on policy |
| Cloudflare one-click verification | Auto-add DNS records via Cloudflare API |

---

### 19. Email Templates

| Capability | Notes |
|-----------|-------|
| Create / manage templates in API | Store Handlebars templates |
| Render template at send time | Pass variables, render, send |
| Template versioning | Keep history of template changes |
| Template preview | Render with sample variables |
| MJML support | Responsive email layout syntax |
| A/B test template variants | Track open/click rates per variant |

---

### 20. Compliance Features

| Capability | Notes |
|-----------|-------|
| Compliance profile (GDPR/CAN-SPAM) | Business type, country, use case |
| Unsubscribe header injection | Auto-add `List-Unsubscribe` header |
| One-click unsubscribe handling | Handle `POST` unsubscribe links |
| GDPR data export | Export all data for a tenant |
| GDPR right to erasure | Delete all emails/events for an address |
| Compliance review workflow | Admin reviews new high-volume tenants |

---

### 21. Multi-User & Team Management

| Capability | Notes |
|-----------|-------|
| Invite team members | Send invite email, accept link |
| Roles: owner, admin, developer, viewer | Already modeled in Membership |
| SSO / SAML (enterprise) | For large organizations |
| Activity audit log | Who did what, when |
| Per-user API key scoping | Limit keys to specific operations |

---

### 22. Advanced Routing

| Capability | Notes |
|-----------|-------|
| IP warming schedules | Gradually increase volume on new IPs |
| Time-of-day routing | Route to specific provider during peak hours |
| Cost-based routing | Route to cheapest provider first |
| Geo-based routing | Route EU sends to EU providers |
| Volume caps per provider | Don't exceed provider daily limits |
| Automatic provider failback | Re-enable provider after health recovers |

---

### 23. Client SDKs (Milestone 5)

| Capability | Notes |
|-----------|-------|
| **Node.js / TypeScript SDK** | `@courierx/node` — first priority |
| **Python SDK** | `courierx-python` |
| **Ruby gem** | `courierx-ruby` |
| **Go SDK** | `courierx-go` |
| **PHP SDK** | Community contribution candidate |
| Auto-generate from OpenAPI spec | After spec is stable |
| Webhook signature verification helper | In each SDK |

---

### 24. Developer Experience

| Capability | Notes |
|-----------|-------|
| Interactive API playground | In-browser test without coding |
| Quickstart wizard in dashboard | First email in under 5 minutes |
| Provider setup guides | Step-by-step for each provider |
| Sandbox / test mode | Send emails without real delivery |
| Test email addresses (e.g. `@courierx.test`) | Never delivers, always logs |
| Webhook event simulator | Fire test events from dashboard |

---

### 25. Enterprise & Platform Features

| Capability | Notes |
|-----------|-------|
| Managed sub-accounts | Agency manages multiple client accounts |
| White-label API | Custom domain for API endpoint |
| Dedicated IP addresses | Per-tenant dedicated sending IPs |
| Custom retention policies | How long to store email history |
| SLA guarantees | 99.9% uptime, <200ms P99 latency |
| SSO for dashboard login | SAML, Okta, Azure AD |
| Audit logs (SOC 2 ready) | Every API call logged |

---

## Capability Summary by Phase

| Phase | Capabilities | What Unlocks It |
|-------|-------------|-----------------|
| **NOW** (post-tests) | Auth, API keys, Send email, Provider BYOK, Routing rules, Email history, Suppression, Webhooks (outbound), Domains (basic) | Pass integration tests |
| **NEXT** (Weeks 3–8) | Inbound webhook processing, Usage analytics, Suppression sync, Rate limit verification, OpenAPI docs | Build + test new code |
| **LATER Q3** | Full dashboard, Domain verification (complete), Templates, Team management | Sequential on NEXT |
| **LATER Q4** | Billing/Stripe, SDKs, Compliance features, Advanced routing | Sequential on Q3 |
| **FUTURE** | IP warming, Multi-user SSO, Enterprise, Dedicated IPs, Platform features | Business demand |

---

## What to Spec Next (Detailed PRDs Needed)

These three capabilities need their own detailed specs before implementation begins:

### PRD-1: Inbound Webhook Processing
- Exactly how each provider signs webhook payloads
- How to map provider-specific event fields to `EmailEvent` schema
- What triggers automatic suppression vs just status update
- Retry behavior when our handler fails

### PRD-2: Email Send API Contract
- Full request/response schema with all field types and validation rules
- Every possible error code and what triggers it
- Rate limit response format and headers
- Idempotency semantics (what counts as a duplicate, what window)

### PRD-3: Routing Rules & Failover Behavior
- How does the router select a provider for a given email?
- What makes an error "permanent" vs "transient"?
- How does BYOK credential injection work in the Go layer?
- What happens when all providers fail?

---

## Open Questions

| Question | Who Answers | Blocking? |
|----------|-------------|-----------|
| Do we want to support per-email routing rule overrides? | Product | No |
| Should suppression be global (cross-tenant) or per-tenant? | Product + Legal | No |
| What's the email history retention policy (storage cost)? | Engineering + Finance | No |
| Do we charge for email history storage above a limit? | Business | No |
| Will we offer a hosted / managed provider option (no BYOK required)? | Product | No — future |
| What's the minimum viable dashboard for early beta users? | Product + Design | Yes (before M4) |
| Should template rendering happen in Rails or Go? (Currently: Go) | Engineering | No |

---

*Last updated: April 19, 2026*
