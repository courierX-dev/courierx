# CourierX — Roadmap Review & Updated Priorities
**Date:** April 19, 2026  
**Format:** Now / Next / Later  
**Status:** Milestone 1 is structurally complete — the real work now is making it work end-to-end.

---

## TL;DR

The scaffolding is done. Every model, controller, job, service, and Go provider file exists. The question is no longer "what do we need to build?" — it's "does any of this actually work together?" The right move right now is to **close Milestone 1 properly** by verifying the core send path end-to-end before touching Milestone 2 at all.

---

## Current Status: What We Know

### ✅ Structurally Complete (Milestone 1)

| Area | Status | Evidence |
|------|--------|----------|
| Rails core models | **Done** | All 20+ models exist with associations, validations, UUID PKs |
| DB schema | **Done** | 24 migrations, pgcrypto enabled, all tables created |
| Go providers | **Done** | SES, SendGrid, Mailgun, Postmark, Resend, SMTP all implemented |
| Go router | **Done** | 103-line router with failover logic |
| Go HTTP handlers | **Done** | 361-line handlers.go covering `/v1/send` and `/v1/send/batch` |
| Rails jobs | **Done** | OutboxProcessorJob (165 lines), WebhookDeliveryJob, DomainVerificationJob, etc. |
| Rails services | **Done** | EmailDispatchService, JwtService, CloudflareDNS/Email services |
| Rails controllers | **Done** | Full set: auth, emails, api_keys, domains, provider_connections, routing_rules, suppressions, webhooks |
| BYOK encryption | **Fixed** | ProviderConnection uses MessageEncryptor with virtual attrs |
| Rails → Go comms | **Fixed** | OutboxProcessorJob sends correct X-Internal-Secret header, camelCase fields |

### ⚠️ Unknown / Needs Verification

These exist but haven't been proven to work together:

- **Full send path** — Rails receives a request → EmailDispatchService → OutboxEvent → OutboxProcessorJob → Go → SES/SendGrid. Has this been tested end-to-end?
- **JWT auth** — Does login → token → authenticated request actually work? No test evidence yet.
- **API key auth** — `cxk_*` prefix, SHA-256 hash lookup — verified in isolation, not in a real request flow.
- **BYOK credential round-trip** — Encrypt → store → decrypt → pass to Go. The fix is in place; has it been exercised?
- **Go internal auth middleware** — Does `X-Internal-Secret` validation actually reject bad requests?

### 🔴 Not Started (Still in backlog)

- Stripe billing (Milestone 3)
- Next.js dashboard wiring to live API (Milestone 4)
- Client SDKs (Milestone 5)
- Domain verification DNS logic (DomainVerificationJob has the file but DNS check logic needs verification)
- Usage rollup job (UsageRollupJob — scaffolded)
- Webhook processing from providers back to CourierX (SendGrid/Mailgun/SES inbound webhooks)

---

## Roadmap: Now / Next / Later

### NOW — Close Milestone 1 Properly (Weeks 1–2)

**Goal:** Prove the core email send path works, end-to-end, with real credentials.  
**Priority: P0 — nothing else matters until this is true.**

These are the things you should be doing right now:

**1. End-to-end send path smoke test**
- Stand up the full stack (Rails + Go + Postgres + Redis + Sidekiq)
- Register a tenant, create a ProviderConnection with a real SendGrid or SES API key
- Send an email via `POST /api/v1/emails`
- Verify it lands in the inbox
- If it breaks, that's your bug list

**2. Auth flow verification**
- Register → login → get JWT → use it on a protected endpoint
- Create an API key → use it to send an email
- Verify cross-tenant isolation (tenant A cannot access tenant B's data)

**3. BYOK credential round-trip**
- Add a ProviderConnection with plaintext `api_key` / `secret`
- Read it back and confirm decryption works
- Confirm the decrypted credentials reach Go correctly in the OutboxProcessorJob payload

**4. Write integration tests for the happy path**
- Rails: RSpec request spec for `POST /api/v1/emails` → confirms OutboxEvent created
- Go: Integration test for `POST /v1/send` with a mock provider → confirms response format
- This is the safety net for everything that comes after

**Why this before Milestone 2?** Milestone 2 is API endpoints for features that depend on the send pipeline working. If the send path is broken, you'll discover it much later and it'll be harder to isolate.

---

### NEXT — Milestone 2 Core (Weeks 3–6)

**Goal:** Full API surface that developers can actually integrate against.  
**Priority: P0 items only — defer P1/P2.**

Once send is verified, prioritize in this order:

**1. Email history & status endpoints** (CP-025, CP-026)
- `GET /api/v1/emails` with filtering
- `GET /api/v1/emails/:id` with event log
- This is the first thing a developer checks after sending: "did it work?"

**2. Provider connection management** (CP-022)
- CRUD for ProviderConnections — already partially there, verify it's complete
- Mask credentials in GET responses (never return raw keys)

**3. Routing rules** (CP-023)
- Allow tenants to set provider priority order
- This is what makes the failover actually tenant-configurable vs hardcoded

**4. Webhook inbound processing** (GO-010, GO-011, GO-012)
- Receive delivery events from SendGrid/Mailgun/SES
- Normalize to `EmailEvent` records
- This closes the loop: you can finally show "delivered", "bounced", "opened" in the API

**5. Idempotency** (CP-035)
- Redis-backed idempotency keys on `POST /api/v1/emails`
- Prevents double-sends on retry — customers will hit this quickly

**Defer for now:**
- OpenAPI docs (CP-029) — write this after the API stabilizes
- Batch send (CP-034) — single send first
- A/B testing, IP warming — far too early

---

### LATER — Milestone 3+ (Weeks 7+)

**Reprioritization recommendation:** The original roadmap puts billing (Milestone 3) before the frontend (Milestone 4). That sequencing is correct **only if** you have paying customers waiting. If this is still pre-revenue, consider this order instead:

1. **Minimal dashboard** — Login, send an email, see it in the log, manage API keys. Even 3 pages beats zero. Developers need to see the product working.
2. **Domain verification** — SPF/DKIM/DMARC. This blocks real deliverability.
3. **Usage stats & analytics** — Delivery rates, bounce rates. This is what drives retention.
4. **Billing (Stripe)** — Introduce this once there's something worth paying for.
5. **SDKs** — Node.js SDK first, auto-generated from OpenAPI.

**Why reorder?** Billing without a working product and no users is waste. A functional dashboard with real data builds credibility with early users and surfaces the bugs that matter.

---

## Priority Matrix

| Initiative | Value | Effort | Priority | Timeframe |
|------------|-------|--------|----------|-----------|
| End-to-end send path verification | High | Low | **P0** | Now |
| Auth flow + integration tests | High | Low | **P0** | Now |
| Email history/status API | High | Low | **P0** | Next |
| Inbound webhook processing | High | Medium | **P0** | Next |
| Routing rules API | Medium | Low | **P0** | Next |
| Idempotency | Medium | Low | **P1** | Next |
| Domain verification (DNS) | High | Medium | **P1** | Later |
| Minimal dashboard (3 pages) | High | Medium | **P1** | Later |
| Usage analytics | Medium | Medium | **P1** | Later |
| Billing / Stripe | Medium | High | **P2** | Later |
| Node.js SDK | Medium | Medium | **P2** | Later |
| Additional SDKs (Python, Ruby, Go) | Low | Medium | **P3** | Later |
| A/B testing, IP warming | Low | High | **P3** | Backlog |

---

## Risks to Call Out

**Risk 1: "Done" scaffolding isn't the same as "working" code.**  
Every file exists. That's good. But "165 lines in OutboxProcessorJob" could mean it's fully functional or it could mean there's a bug in the credential decryption that only surfaces with a real provider. The smoke test in the NOW phase eliminates this uncertainty.

**Risk 2: Tenant isolation gaps.**  
Every controller needs to scope queries to `current_tenant`. Missing one is a serious security bug. Add a test that explicitly verifies cross-tenant isolation before Milestone 2 ships.

**Risk 3: No real velocity data yet.**  
The milestone plan assumes 30-40 story points per sprint. Until you have 2-3 sprints of actual data, treat all timelines as rough estimates. The 20-24 week total is plausible but unvalidated.

**Risk 4: Billing is complex and often delayed.**  
Stripe integration, usage-based billing, plan management, and invoice generation together are 34 points of high-uncertainty work. Plan for it taking 50% longer than estimated.

---

## Immediate Action Items

1. **This week:** Run the stack locally and attempt a real end-to-end send. Log every failure.
2. **This week:** Write one RSpec integration test for the send path — this becomes the regression anchor.
3. **Next sprint:** Complete the Email history/status API and inbound webhook processing — these are the features developers will actually use to validate that CourierX is working.
4. **Defer:** Don't touch billing or SDKs until you have at least 3 developers using the API in a real project.

---

## What to Spec Next

If you want to write specs (PRDs) to lock in the right behavior before building, prioritize these three:

1. **Email Send API spec** — Define the full request/response contract, error codes, idempotency behavior, rate limit response format. This is the most-used endpoint.
2. **Webhook processing spec** — How do inbound webhooks from SendGrid/SES/Mailgun map to `EmailEvent` records? What happens on signature verification failure?
3. **Routing rules spec** — How does a tenant configure provider priority? What's the failover behavior when all providers fail?

These three specs cover the entire core value proposition of CourierX. Everything else is secondary.
