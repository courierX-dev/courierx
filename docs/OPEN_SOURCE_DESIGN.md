# CourierX — Open Source Architecture & Business Model Design

**Date:** 2026-04-19  
**Scope:** System design for OSS release, open-core split, billing integration, and cloud SaaS architecture  
**Architecture reviewed:** Rails control plane + Go core engine (current state)

---

## 1. Does the Current Architecture Work for Open Source?

**Short answer: Yes — with one structural change.**

Your two-service design (Rails control plane + Go core engine) is well-suited for open-source release. The BYOK model is already the right paradigm for self-hosters. However, one concern exists today that must be resolved before OSS launch:

**The cloud billing layer (`BillingWebhooksController`, `ComplianceProfile`, `ManagedSubAccount`, `WaitlistEntry`) lives inside the main Rails app**, which means the OSS repository currently ships with billing code that either fails silently or exposes your commercial infrastructure when self-hosters run it.

**Recommended fix:** Extract billing into a separate optional Rails engine (`courierx-cloud`), keeping the core repository clean.

---

## 2. Open Core Model — What's Free vs Paid

The right model for CourierX is **Open Core**: the routing engine and control plane are MIT-licensed and fully functional on their own. The cloud-only layer adds managed hosting, billing, and enterprise features.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  OPEN SOURCE (MIT)                                                       │
│  The full email routing engine — self-hostable, no limits               │
│                                                                          │
│  ✓ Multi-provider routing + failover (all 6 providers)                  │
│  ✓ BYOK — bring your own SendGrid / Mailgun / SES / SMTP credentials    │
│  ✓ Suppression list management                                          │
│  ✓ Domain verification (SPF/DKIM/DMARC)                                 │
│  ✓ Routing rules + priority chains                                      │
│  ✓ Email templates with Handlebars                                      │
│  ✓ Webhook delivery to your own endpoints                               │
│  ✓ Usage analytics + delivery events                                    │
│  ✓ REST API + API key management                                        │
│  ✓ Docker Compose one-command deploy                                    │
│  ✓ Multi-tenant (unlimited tenants in self-hosted mode)                 │
├─────────────────────────────────────────────────────────────────────────┤
│  CLOUD (courierx.dev — commercial SaaS)                                 │
│  Open core + managed infrastructure + team features                     │
│                                                                          │
│  + Managed hosting (no servers to maintain)                             │
│  + Automatic provider health monitoring                                 │
│  + Email volume billing (pay-as-you-go or plan)                         │
│  + Team members / roles / SSO                                           │
│  + Sub-accounts for agencies (ManagedSubAccount)                        │
│  + Compliance exports (GDPR data subject requests, CAN-SPAM)           │
│  + SLA + uptime guarantee                                               │
│  + Priority support + onboarding calls                                  │
│  + Advanced analytics (cohort analysis, deliverability scores)          │
│  + IP warming management (EnableIPWarming)                              │
│  + Audit logs                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

### License Decision

**Recommended: MIT for core + AGPL for cloud additions**

| Component | License | Rationale |
|-----------|---------|-----------|
| `backend/core-go/` | MIT | Broadest adoption — developers can embed the engine |
| `backend/control-plane/` | MIT | Same — easy to fork and self-host |
| `frontend/dashboard/` | MIT | Encourage community UI contributions |
| `apps/cloud/` (new) | Proprietary / AGPL | Protects billing, sub-accounts, SSO |
| SDKs (`sdk/`) | MIT | Must be permissive for adoption |

**Why not AGPL for everything?** AGPL on the core would deter enterprise self-hosters who can't share their infrastructure modifications. MIT maximises adoption and GitHub stars, which drives cloud conversions.

**Why not Apache 2.0?** MIT is simpler and more recognizable for a developer tool. Apache 2.0's patent grant clauses add friction without meaningful benefit at your stage.

---

## 3. Architecture Diagram — OSS vs Cloud Split

```
                            GitHub: courierx/courierx (MIT)
                            ┌────────────────────────────────────────┐
                            │  backend/control-plane/   (Rails OSS)  │
                            │  backend/core-go/         (Go OSS)      │
                            │  frontend/dashboard/      (Next.js OSS) │
                            │  sdk/                     (SDKs OSS)    │
                            │  infra/                   (Docker OSS)  │
                            └──────────────────┬─────────────────────┘
                                               │  inherits / extends
                            ┌──────────────────▼─────────────────────┐
                            │  Private: courierx/courierx-cloud       │
                            │                                         │
                            │  apps/billing/    (Stripe integration)  │
                            │  apps/cloud-api/  (cloud-only Rails)    │
                            │  apps/admin/      (Superadmin panel)    │
                            │  infra/cloud/     (Kubernetes/Fly.io)   │
                            └────────────────────────────────────────┘

Self-hosted flow:
User → clones courierx/courierx → docker compose up → full platform

Cloud flow:
User → registers at courierx.dev → tenant provisioned in managed cluster
     → Rails cloud-api extends OSS control plane with billing middleware
     → same Go core engine, same DB schema
```

---

## 4. Repository Structure for OSS Release

```
courierx/                          ← public GitHub repo (MIT)
├── backend/
│   ├── control-plane/             ← Rails API (no billing code)
│   └── core-go/                   ← Go engine
├── frontend/
│   └── dashboard/                 ← Next.js dashboard
├── sdk/
│   ├── node/                      ← @courierx/node
│   ├── python/                    ← courierx-python
│   ├── ruby/                      ← courierx-ruby
│   └── go/                        ← courierx-go
├── infra/
│   ├── docker-compose.yml         ← one-command self-host
│   ├── docker-compose.dev.yml
│   └── docker/
├── docs/                          ← source for docs.courierx.dev
├── examples/
│   ├── nextjs-app/
│   ├── rails-app/
│   └── express-app/
├── tests/
│   ├── load/                      ← k6
│   └── integration/
├── .github/
│   ├── workflows/
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
├── LICENSE                        ← MIT
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md                    ← already exists ✓
└── README.md
```

### What to remove before OSS release

From `backend/control-plane/`:
- `app/controllers/api/v1/billing_webhooks_controller.rb` → move to `courierx-cloud`
- `app/models/managed_sub_account.rb` → move to `courierx-cloud`
- `app/models/compliance_profile.rb` → move to `courierx-cloud`
- `app/models/compliance_document.rb` → move to `courierx-cloud`
- `app/models/waitlist_entry.rb` → move to `courierx-cloud`
- All Stripe-related code

From config:
- Remove `STRIPE_*` env var references from `docker-compose.yml`
- Remove any Stripe initializers

---

## 5. Billing System Design (Cloud SaaS)

### Billing Model

**Recommended: Usage-based with plan floors**

```
Free tier:        1,000 emails/month (no credit card required)
Starter:          $20/month + $0.80/1,000 emails over 50k included
Growth:           $79/month + $0.60/1,000 emails over 250k included
Business:         $299/month + $0.40/1,000 emails over 1M included
Enterprise:       Custom + volume discount + SLA
Self-hosted:      Free forever (community support)
```

This model works because:
- Free tier converts GitHub users to cloud trial
- Developers know exactly what they'll pay (usage-based is transparent)
- BYOK model means you're not paying provider costs — you're charging for the platform value

### Architecture: Stripe Integration

```
┌───────────────────────────────────────────────────────────────────┐
│  Billing Flow                                                       │
│                                                                     │
│  1. Tenant registers → create Stripe Customer + free subscription  │
│  2. Email sent → UsageRollupJob increments Stripe Usage Record     │
│  3. Stripe meters usage → generates invoice at month end           │
│  4. Payment fails → Stripe webhook → suspend tenant (grace period) │
│  5. Upgrade/downgrade → Stripe subscription change → plan update   │
└───────────────────────────────────────────────────────────────────┘
```

**New Rails models (cloud only):**
```ruby
# Billing::Subscription
# tenant_id, stripe_customer_id, stripe_subscription_id,
# plan (free/starter/growth/business/enterprise),
# status (active/past_due/cancelled/paused),
# current_period_start, current_period_end,
# email_limit_override (for Enterprise custom limits)

# Billing::Invoice
# tenant_id, stripe_invoice_id, amount_cents, status,
# period_start, period_end, email_count, pdf_url

# Billing::UsageRecord
# tenant_id, period (YYYY-MM), email_count, reported_at
# (reported to Stripe for metered billing)
```

**Stripe webhook events to handle:**
```ruby
# Already scaffolded in BillingWebhooksController
"customer.subscription.updated"   → update plan, email limit
"customer.subscription.deleted"   → suspend tenant
"invoice.payment_failed"          → enter grace period (3 days), send warning email
"invoice.payment_succeeded"       → clear suspension, send receipt
"checkout.session.completed"      → complete plan upgrade flow
```

**Plan enforcement in Rails:**
```ruby
# app/services/email_dispatch_service.rb (cloud extension)
module CloudEnforcement
  def check_billing_limit!
    subscription = current_tenant.billing_subscription
    return if subscription&.unlimited?

    monthly_count = current_tenant.emails
                                  .where("created_at >= ?", Time.current.beginning_of_month)
                                  .count

    limit = subscription&.email_limit || 1_000 # free tier
    if monthly_count >= limit
      raise BillingLimitExceeded, "Monthly email limit of #{limit} reached. Upgrade your plan."
    end
  end
end
```

### Usage Reporting to Stripe (Metered Billing)

```ruby
# app/jobs/billing/stripe_usage_reporter_job.rb (cloud only)
class Billing::StripeUsageReporterJob
  include Sidekiq::Job
  sidekiq_options queue: :billing, retry: 5

  def perform(tenant_id, period = Time.current.strftime("%Y-%m"))
    tenant = Tenant.find(tenant_id)
    subscription = tenant.billing_subscription
    return unless subscription&.metered?

    count = tenant.emails
                  .where("DATE_TRUNC('month', created_at) = ?::date", "#{period}-01")
                  .count

    Stripe::UsageRecord.create(
      subscription_item: subscription.stripe_usage_item_id,
      quantity: count,
      timestamp: Time.current.to_i,
      action: "set"
    )

    subscription.update!(last_usage_reported_at: Time.current)
  end
end
```

---

## 6. Multi-Tenancy Architecture Validation

Your current multi-tenancy model is correct for both OSS and cloud:

```
Row-level isolation: every table has tenant_id FK
Controller scoping: current_tenant.resources (never Resource.find)
No schema-per-tenant: single schema, RLS via application layer
```

**This is the right choice.** Schema-per-tenant (Apartment gem pattern) would make the Go engine's direct DB writes dramatically more complex. The current approach is performant up to ~10,000 active tenants with proper indexing.

**One addition needed for cloud:** A `plan_limits` enforcement layer that runs before `EmailDispatchService`. In OSS mode this is a no-op. In cloud mode it checks the Stripe subscription.

```ruby
# Feature flag approach — clean OSS/cloud split
module CourierX
  def self.cloud?
    ENV["COURIERX_EDITION"] == "cloud"
  end
end

# In EmailDispatchService
before_action :check_billing_limit! if CourierX.cloud?
```

---

## 7. Sub-Account Architecture (for Agencies / Platforms)

The `ManagedSubAccount` model already exists. Here's the complete design:

```
Platform Tenant (agency)
├── Sub-tenant A (agency's client 1)
│   ├── Provider connections (client's own API keys)
│   ├── Routing rules
│   └── Email history
├── Sub-tenant B
└── Sub-tenant C

Billing: consolidated under platform tenant
Isolation: sub-tenants use their own BYOK — agency never sees client keys
Access: platform tenant can view aggregate stats, not individual emails
```

```ruby
# ManagedSubAccount
belongs_to :platform_tenant, class_name: "Tenant"
belongs_to :sub_tenant, class_name: "Tenant"
# Fields: permissions (json), billing_mode (consolidated/independent)

# Platform tenant sees aggregate stats
class Api::V1::ManagedSubAccountsController < BaseController
  def stats
    sub_tenants = current_tenant.managed_sub_accounts.map(&:sub_tenant)
    render json: aggregate_stats(sub_tenants)
  end
end
```

---

## 8. Go Core Engine — Architecture Validation

The Go engine architecture is correct and scales well. A few additions for OSS release quality:

**Missing implementations (P0 from tech debt):**
- `internal/providers/postmark.go`
- `internal/providers/resend.go`
- `internal/providers/smtp.go`

These are blocking production use for ~30% of potential users who prefer these providers.

**Recommended additions for OSS launch:**
```go
// Health check per provider type — fixes ProviderHealthCheckJob
// GET /v1/health/provider/:type
func (h *Handler) ProviderHealth(c *fiber.Ctx) error {
    providerType := c.Params("type")
    provider, err := h.globalRouter.GetProvider(providerType)
    if err != nil {
        return c.Status(404).JSON(fiber.Map{"error": "provider not configured"})
    }
    healthy := provider.Healthy()
    status := 200
    if !healthy { status = 503 }
    return c.Status(status).JSON(fiber.Map{
        "provider": providerType,
        "healthy":  healthy,
        "checked_at": time.Now().UTC(),
    })
}
```

**Redis-backed idempotency (required before scaling beyond 1 replica):**
```go
// config: add REDIS_URL usage
// Replace sync.Map with go-redis client
// See TECH_DEBT.md H-8
```

---

## 9. SDK Architecture

For open-source adoption, SDKs are critical. The Go core speaks a simple REST API, so SDKs are thin wrappers.

**`sdk/node/` — @courierx/node**
```typescript
import { CourierX } from '@courierx/node';

const cx = new CourierX({ apiKey: 'cxk_...' });

await cx.emails.send({
  from: { email: 'noreply@yourdomain.com', name: 'Your App' },
  to: { email: 'user@example.com' },
  subject: 'Welcome!',
  html: '<h1>Welcome</h1>',
});
```

**SDK package structure:**
```
sdk/node/
├── src/
│   ├── client.ts          ← main CourierX class
│   ├── resources/
│   │   ├── emails.ts
│   │   ├── domains.ts
│   │   ├── suppressions.ts
│   │   └── webhooks.ts
│   ├── types.ts            ← generated from API schema
│   └── errors.ts           ← CourierXError, RateLimitError, etc.
├── tests/
├── package.json
└── README.md
```

**Auto-generate types from API schema:** Use an OpenAPI spec (generate from Rails routes + serializers) and run `openapi-typescript` to keep SDK types in sync.

---

## 10. OSS Launch Readiness Checklist

**Must-have before GitHub launch:**
- [ ] Remove billing code from core repository (move to private `courierx-cloud`)
- [ ] Implement Postmark, Resend, and SMTP Go providers (P0 tech debt)
- [ ] Redis-backed idempotency store in Go
- [ ] README.md with one-command quickstart (`docker compose up`)
- [ ] CONTRIBUTING.md with setup guide and PR guidelines
- [ ] At least one complete example app (`examples/nextjs-app/`)
- [ ] All hardcoded dev secrets removed from committed files
- [ ] CI passing on a clean checkout with no env vars
- [ ] `from_email` domain enforcement implemented
- [ ] Node.js SDK with basic send functionality

**Nice-to-have at launch:**
- [ ] GitHub Actions release workflow (auto-publish to GitHub Releases + Docker Hub)
- [ ] Python SDK
- [ ] Helm chart for Kubernetes
- [ ] Demo video (< 3 minutes, `docker compose up` → first email)
- [ ] HackerNews "Show HN" post draft

---

## 11. Trade-off Analysis

| Decision | Choice | Alternative | Why |
|----------|--------|-------------|-----|
| License | MIT | AGPL | Maximizes adoption; revenue comes from cloud, not code restriction |
| Billing separation | Separate private repo | Feature flags in same repo | Cleaner OSS experience; no billing code for self-hosters to audit |
| Multi-tenancy | Row-level isolation | Schema-per-tenant | Go direct DB writes don't work with schema-per-tenant; simpler ops |
| Billing model | Usage-based + floor | Seat-based | Predictable for developers; aligns cost with value |
| SDK approach | Thin REST wrapper | gRPC/generated | Simpler to maintain; REST is already the contract |
| Idempotency store | Redis (cloud) / in-memory (dev) | Always Redis | Keeps dev setup simple (no Redis required for basic dev) |
| BYOK vs managed keys | BYOK always | Managed keys option | Zero provider lock-in; OSS appeal; no credentials liability |
