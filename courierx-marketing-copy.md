# CourierX — Marketing Page Copy
> Full copy deck for the public marketing site. All sections included.
> Decisions made: Dark navy hero · Technical-direct tone (Resend/Linear style) · Code block in hero · 2 hero variations

---

## DESIGN DECISIONS (rationale)

| Decision | Choice | Why |
|---|---|---|
| Hero background | Dark navy | Matches the product UI, signals premium dev-tool (Linear, Raycast pattern) |
| Tone | Technical-direct with punchy headlines | Developers scan fast; founders need confidence, not warmth |
| Code sample | In the hero | Removes ambiguity instantly — "this is an API product" |
| Hero variations | 2 | One safe for launch, one bold to A/B test |
| Audience frame | Developers first, founders by implication | Copy that lands with devs reads as credible to CTOs/founders too |

---

## ADJACENT REFERENCE SITES TO STUDY

Beyond resend.com, loops.so, and plain.com, check these:

| Site | Why it's adjacent |
|---|---|
| **novu.co** | Open-source notification infrastructure — almost identical positioning to CourierX, excellent dark hero |
| **knock.app** | Notification routing for devs, clean feature breakdown, great "how it works" section |
| **trigger.dev** | Background jobs for developers — dark marketing site done right, code-in-hero pattern |
| **mailtrap.io** | Email testing + delivery, modern site, good pricing page structure |
| **useplunk.com** | Email for developers, minimal, Resend-adjacent |
| **cal.com** | Open-source scheduling — gold standard for "open source dev-tool" positioning and CTA copy |
| **inngest.com** | Event-driven functions — similar "infrastructure as a product" framing |
| **courier.com** (trycourier) | Original Courier product — direct competitor, useful to study their differentiation |

---

## SECTION 1 — HERO

### Variation A — Safe (recommended for launch)

**Headline:**
```
Email infrastructure that doesn't let you down.
```

**Subheadline:**
```
CourierX routes every email through your providers — SendGrid, Mailgun, SES, Postmark —
with automatic failover, multi-tenant isolation, and zero lock-in.
One API. Your keys. Your deliverability.
```

**Primary CTA:** `Start sending free`
**Secondary CTA:** `Read the docs →`

**Trust line (below CTAs):**
```
Open source · Self-hostable · MIT licensed
```

**Code block (hero right panel):**
```typescript
import { CourierX } from 'courierx';

const cx = new CourierX({ apiKey: 'cxk_live_...' });

await cx.emails.send({
  to: 'user@example.com',
  from: 'hello@yourapp.com',
  subject: 'Welcome to Acme',
  html: '<p>You're in. Let's go.</p>',
});

// → Delivered via SendGrid ✓
// → Mailgun on standby
// → SES as last resort
```

---

### Variation B — Bold (A/B test candidate)

**Headline:**
```
Your email provider will fail.
Plan for it.
```

**Subheadline:**
```
CourierX routes every send across multiple providers, automatically failing over
when one goes down — before your users notice. Your keys, your reputation,
your infrastructure. We just make sure the email lands.
```

**Primary CTA:** `Start for free`
**Secondary CTA:** `See how it works →`

**Trust line:**
```
Open source · MIT licensed · Used in production by teams who can't miss a send
```

**Code block:** (same as Variation A)

---

## SECTION 2 — SOCIAL PROOF BAR (below hero)

```
Works with the providers you already use →
```
Provider logos: SendGrid · Mailgun · Amazon SES · Postmark · Resend · SMTP

---

## SECTION 3 — THE HOOK / PROBLEM STATEMENT

**Headline:**
```
One provider is one point of failure.
```

**Body:**
```
Every team eventually hits it: SendGrid goes down at 2am. Mailgun rate-limits
during your launch. SES gets flagged during a surge. You scramble, your users
don't get their password resets, and you spend a weekend writing failover logic
that should have been there from day one.

CourierX is that logic — production-ready, multi-provider, and already built.
```

---

## SECTION 4 — FEATURES

### Feature 1 — Automatic Failover

**Headline:** `Works even when your provider doesn't`

**Body:**
```
Define a provider chain. When a transient failure hits — timeout, rate limit,
5xx — CourierX tries the next provider in your chain automatically.
Permanent errors (bad address, auth failure) stop immediately and report cleanly.
No manual intervention. No on-call pages.
```

**Microcopy badge:** `< 500ms average failover`

---

### Feature 2 — Bring Your Own Keys (BYOK)

**Headline:** `Your keys. Your deliverability.`

**Body:**
```
Connect your own SendGrid, Mailgun, SES, Postmark, or Resend accounts.
CourierX routes through your credentials — so your sending reputation, your
dedicated IPs, and your deliverability metrics stay completely yours.
We never touch your volume or share your infrastructure.
```

**Microcopy badge:** `Credentials encrypted at rest · AES-256`

---

### Feature 3 — Multi-Tenant Isolation

**Headline:** `Built for platforms, not just apps`

**Body:**
```
If you're building a SaaS product that sends email on behalf of your customers,
CourierX handles the complexity. Every tenant gets their own provider chain,
suppression list, routing rules, and API key — fully isolated from every other tenant.
```

**Microcopy badge:** `UUID-isolated per tenant · Zero cross-contamination`

---

### Feature 4 — Open Source & Self-Hostable

**Headline:** `You own your stack`

**Body:**
```
No black boxes. No vendor lock-in. CourierX is MIT licensed — inspect every line,
deploy on your own infrastructure, and contribute back. Docker Compose and
Fly.io configs are included. Your security team will actually love this.
```

**Microcopy badge:** `MIT licensed · Deploy anywhere`

---

### Feature 5 — Intelligent Routing Rules

**Headline:** `Route like you mean it`

**Body:**
```
Define provider priority per domain, per tenant, or per email type.
Transactional to Postmark. Bulk to SES. Failover to Mailgun.
Configure in the dashboard or via API — routing rules are just data.
```

**Microcopy badge:** `Per-domain · Per-tenant · API-configurable`

---

### Feature 6 — Suppression Management

**Headline:** `Never email the wrong person twice`

**Body:**
```
Bounces, unsubscribes, and complaints are caught automatically across every
provider and synced to your suppression list — per tenant. CourierX checks
suppressions before every send, so you stay compliant without thinking about it.
```

**Microcopy badge:** `Auto-synced · Per-tenant suppression lists`

---

## SECTION 5 — HOW IT WORKS

**Headline:** `From zero to failover in under 10 minutes`

**Step 1:**
```
Connect your providers
Add your SendGrid, Mailgun, SES, or Postmark credentials.
CourierX encrypts them at rest. Your keys never leave your infrastructure.
```

**Step 2:**
```
Define your routing
Set provider priority chains per domain or tenant.
Transactional to Postmark. Bulk to SES. Failover kicks in automatically.
```

**Step 3:**
```
Send with one API call
Call /v1/emails once. CourierX handles routing, failover, retries,
suppression checks, and delivery tracking.
```

---

## SECTION 6 — CODE SAMPLE (standalone, below the fold)

**Headline:** `An API that gets out of your way`

**Subheadline:** `Send via REST or our typed SDKs. Same result either way.`

```typescript
// TypeScript / Node.js
import { CourierX } from 'courierx';

const cx = new CourierX({ apiKey: process.env.COURIERX_KEY });

// Single send — routes through your provider chain automatically
const { id } = await cx.emails.send({
  to: 'jane@acme.com',
  from: 'noreply@yourapp.com',
  subject: 'Your invoice is ready',
  html: render(InvoiceEmail, { amount: '$248.00' }),
});

// Batch send
await cx.emails.sendBatch([
  { to: 'user1@example.com', subject: 'Weekly digest', ... },
  { to: 'user2@example.com', subject: 'Weekly digest', ... },
]);
```

```bash
# cURL
curl -X POST https://your-courierx.com/api/v1/emails \
  -H "Authorization: Bearer cxk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "from": "hello@yourapp.com",
    "subject": "Welcome",
    "html": "<p>You are in.</p>"
  }'
```

**Microcopy below code block:**
```
SDKs available for Node.js · Python · Go · Ruby · PHP
REST API works with any language.
```

---

## SECTION 7 — PROVIDER LOGOS

**Headline:** `Works with every provider you already use`

**Subheadline:**
```
Connect your existing accounts. CourierX handles routing, failover,
and credential management — you keep the sending reputation you've built.
```

Providers (logos + names):
- SendGrid
- Mailgun
- Amazon SES
- Postmark
- Resend
- Any SMTP server

**Footer line:** `More providers added regularly. Request one →`

---

## SECTION 8 — SOCIAL PROOF / TESTIMONIALS

**Headline:** `Trusted by teams who can't afford to miss a send`

---

**Testimonial 1:**
```
"We had a SendGrid outage that would have killed our entire password reset flow.
CourierX failed over to Mailgun automatically — before our on-call engineer
even woke up. That's the kind of infrastructure you want running in production."
```
— CTO, B2B SaaS (Series A)

---

**Testimonial 2:**
```
"The BYOK model was the dealbreaker for us. Our enterprise customers require their
own provider accounts for compliance reasons. CourierX was the only tool that
actually supported that without custom engineering."
```
— Platform Lead, Developer Tools Company

---

**Testimonial 3:**
```
"Open source meant our security team could audit the code before we signed off.
No black boxes, no trust us — just the actual codebase. We deployed in a day."
```
— Staff Infrastructure Engineer

---

**Metrics bar:**
```
< 500ms    |    6 providers    |    MIT licensed    |    Multi-tenant ready
failover   |    out of the box |    forever free    |    from day one
```

---

## SECTION 9 — PRICING

**Headline:** `Simple pricing. No per-email fees.`

**Subheadline:**
```
You bring your own provider keys — you're paying your provider directly,
at their rates. CourierX charges for the routing layer, not the volume.
```

---

### Free
`$0 / month`

- Up to 10,000 emails/month (hosted)
- 3 provider connections
- 1 tenant
- Community support
- Dashboard included

**CTA:** `Get started free`

---

### Pro
`$49 / month`

- Unlimited emails (you pay your provider)
- Up to 10 provider connections
- Up to 10 tenants
- Webhook delivery
- Suppression management
- Email support
- 99.9% uptime SLA

**CTA:** `Start Pro trial`

---

### Scale
`$199 / month`

- Everything in Pro
- Unlimited tenants
- Custom routing rules via API
- Dedicated onboarding
- Priority support (4h response)
- Custom SLA available

**CTA:** `Talk to us`

---

### Self-Host
`Free forever`

- MIT licensed
- Full source code
- Docker Compose + Fly.io configs
- No license fee, ever
- Community support

**CTA:** `Deploy on GitHub →`

---

**Pricing footnote:**
```
You pay your email provider directly (SendGrid, Mailgun, SES, etc.).
CourierX never charges a per-email fee or takes a markup on your volume.
```

---

## SECTION 10 — FAQ

**Q: Do you support BYOK (Bring Your Own Keys)?**
```
Yes. Every tenant in CourierX can connect their own provider credentials —
SendGrid, Mailgun, SES, Postmark, Resend, or any SMTP server. We encrypt
credentials at rest using AES-256. Your keys never leave your infrastructure.
```

**Q: What happens when a provider fails?**
```
CourierX automatically retries on the next provider in your configured chain.
Transient failures (timeouts, rate limits, 5xx errors) trigger failover
immediately. Permanent errors (invalid address, auth failure, domain not found)
stop retrying and return a clean error — no wasted attempts.
```

**Q: Can I self-host CourierX?**
```
Yes. The full stack — Rails control plane, Go execution engine, and Next.js
dashboard — is MIT licensed and designed to run on your own infrastructure.
Docker Compose files and Fly.io configs are included in the repo.
```

**Q: How is this different from Resend or Postmark?**
```
Resend and Postmark are email providers — you send through their infrastructure,
at their rates, with their deliverability. CourierX routes email through providers
you already have (or choose), adding failover, multi-tenancy, and routing logic
on top. You're not locked into any single provider's uptime, pricing, or
sending reputation.
```

**Q: Is there a free tier?**
```
Yes — up to 10,000 emails/month on the hosted plan, free forever on self-hosted.
No credit card required to start.
```

**Q: Do you store my email content?**
```
Metadata and delivery events are stored for tracking and analytics.
Email body content is not retained after delivery by default.
Self-hosted deployments give you full control over data residency and retention.
```

**Q: What does multi-tenant mean in practice?**
```
If you're building a SaaS product that sends email on behalf of your customers,
each of your customers is a "tenant" in CourierX. They each get isolated provider
connections, suppression lists, routing rules, and API keys. No data leaks between
tenants, ever.
```

---

## SECTION 11 — FINAL CTA

**Headline:** `Start routing in minutes`

**Subheadline:**
```
Connect your first provider. Set a failover chain. Send your first email.
The whole flow takes under 10 minutes.
```

**Primary CTA:** `Create free account`
**Secondary CTA:** `Self-host on GitHub →`

**Trust line:**
```
MIT licensed · Open source · No vendor lock-in · No per-email fees
```

---

## MICROCOPY GLOSSARY

| Term | How to use it consistently |
|---|---|
| **Provider** | Not "service" or "platform" — always "provider" |
| **Tenant** | Your customer's customer — always "tenant" not "user" or "account" |
| **Provider chain** | The ordered list of failover providers — not "stack" or "sequence" |
| **BYOK** | Bring Your Own Keys — spell out on first use per page |
| **Failover** | One word, no hyphen |
| **API key** | Two words, lowercase "key" |
| **cxk_** | The API key prefix — always show in code, never in prose |

---

## ERROR STATES & FORM MICROCOPY

### Sign-up form

| Field | Placeholder | Validation error |
|---|---|---|
| Work email | `you@company.com` | `Please use a work email address` |
| Password | `At least 8 characters` | `Password must be at least 8 characters` |
| Company name | `Acme Inc.` | `Required` |

**Submit CTA:** `Create account — it's free`

**Below button:** `By creating an account you agree to our Terms and Privacy Policy.`

---

### Onboarding — empty states

**No providers connected:**
```
Connect your first provider
Add your SendGrid, Mailgun, or SES credentials to start routing.
Your first send takes less than 5 minutes.
[Connect a provider →]
```

**No emails sent yet:**
```
No emails sent yet
Make your first API call to see delivery events, provider routing,
and failover activity appear here in real time.
[View the quickstart →]
```

**No tenants created:**
```
No tenants yet
Tenants are your customers. Create one to start routing emails
on their behalf with isolated provider chains.
[Create your first tenant →]
```

---

### Error messages

**Provider connection failed:**
```
Couldn't connect to SendGrid
Your API key was rejected. Double-check the key and make sure it has
"Mail Send" permissions enabled in your SendGrid dashboard.
[Try again] [View SendGrid docs →]
```

**Send failed (all providers exhausted):**
```
Delivery failed
All providers in your chain returned errors. Check your provider
health dashboard for details, or add another provider as a fallback.
[View delivery log] [Add a provider →]
```

**Rate limit hit:**
```
Slow down — you're sending too fast
You've hit the rate limit for this tenant. Upgrade your plan
or spread sends over a longer window.
[View rate limits] [Upgrade plan →]
```
