# CourierX — Copy Audit & Rewrites

> **Companion to `brand-voice-guide.md`.** The voice guide defines who CourierX sounds like. This document finds where the product *doesn't yet sound like that*, and rewrites it.
>
> Audited surfaces: dashboard UI, auth/onboarding, marketing site (+ pricing), backend error messages (Rails + Go).

---

## TL;DR

CourierX copy is ~88% on-brand. The voice guide is doing its job — terminology is consistent, jargon is appropriate, no "world-class" or "synergy" anywhere. The gaps are focused and fixable:

1. **One critical content bug** — the pricing page talks about "logistics teams" in a product that sends email. Fix before any public launch.
2. **A handful of banned-word slips** — "just works" in the signup hero, subjective metric words ("healthy", "good", "low") on the overview page.
3. **Two tone slips in marketing** — "Guaranteed" and "Spaces are limited" reach for claims and scarcity the rest of the copy carefully avoids.
4. **A pattern gap in error messages** — most backend errors say *what* failed but not *how to fix it*, which violates the "what + why + how to fix" pattern already documented in the voice guide.

Everything in this doc is a specific rewrite with a file and line number. No abstract advice.

---

## 1. On the B2B vs. B2C question

You asked whether CourierX is really B2B since your customers market to consumers. Here's the precise answer, because it changes how copy targets the reader:

CourierX is **B2B2C**:

- **B2B** at every surface the buyer and operator sees — docs, dashboard, API, pricing, onboarding, errors. The reader is a developer, platform engineer, or IT/security buyer at a business. Use developer-direct voice. Assume technical literacy. Skip explainers that insult the reader.
- **B2C** *through* your customers — the end recipient of the email is a consumer, so defaults we build (default templates, suppression reason copy, unsubscribe microcopy, example payloads) need to read well when a consumer lands on them.
- **Marketing surface is mixed B2B** — decision-makers span from a solo developer on a side project to a VP of Engineering at a Series C. The copy needs to land with both without code-switching. The current site does this well.

**Practical rule:** product copy, errors, and docs are written **to developers**. Any *example content* CourierX ships (sample templates, default From names, example suppression messages, unsubscribe footers) is written for **consumers**, and should sound like a well-run SaaS company, not CourierX itself.

---

## 2. Tone matrix — because you asked for a mix

You said you want a blend of developer-direct, warm-but-professional, and playful. Here's where each goes so the voice stays coherent:

| Surface | Primary tone | When to dial up warmth | When to dial up play |
|---|---|---|---|
| API docs, error responses, CLI output | **Developer-direct** | Never — keep terse | Never |
| Dashboard UI (forms, tables, settings) | **Developer-direct** with light warmth | Onboarding, empty states, first-time moments | Empty states only, and only if it still informs |
| Onboarding (signup → first send) | **Warm but professional** | Success moments, "you're one step away" | Welcome moment and first-send celebration |
| Auth (login, verify, reset) | **Developer-direct** | Error recovery ("wrong address?") | Never — auth is high-stakes |
| Marketing hero + features | **Warm but professional, confident** | Social proof, community | Hero subhead, CTAs, 404 page, footer easter eggs |
| Blog / social | **Warm but professional** | Case studies, customer stories | Threads, short-form, commentary |
| Incidents / status | **Developer-direct, calm, honest** | Apology moments (rare, specific) | **Never** |
| Error messages | **Developer-direct, empathetic** | Permission/auth errors ("ask your admin") | **Never** |
| Billing / legal / compliance | **Warm but professional, formal** | Never — stay measured | **Never** |

The playful tone is the smallest wedge. Save it for moments where the reader is *not* trying to get something done — hero copy, empty states, 404s, success confirmations. Never in errors, auth, billing, or incidents.

---

## 3. High-priority fixes (ship before next release)

### 3.1 Pricing page — the "logistics" bug

**File:** `marketing/CourierX/app/pricing/page.tsx`

This is the single most important fix. Two lines suggest the pricing page was built from a template for a different product.

| Line | Current | Rewrite |
|---|---|---|
| 182 | "Choose the perfect plan for your logistics needs" | "Pick the plan that matches your sending volume." |
| 270 | "Join thousands of logistics teams optimizing their operations with CourierX" | "Join the teams sending millions of emails a month through CourierX." |

Optional polish on the same page:

| Line | Current | Rewrite |
|---|---|---|
| 27 | "Perfect for small teams getting started" | "For small teams running their first production sends." |
| 43 | "For growing businesses" | "For teams scaling past 10K sends/month." |
| 61 | "For scaling operations" | "For high-volume senders with SLA needs." |
| 80 | "For large-scale operations" | "For multi-tenant platforms and enterprise volume." |
| 179 | "Simple, Transparent Pricing" | "Transparent pricing. No seat tax." (drops the "simple" which the voice guide discourages, replaces with a real differentiator) |
| 268 | "Ready to get started?" | "Start with a free key." (verb-first CTA) |

### 3.2 Signup hero — "just works" is a banned phrase

**File:** `frontend/dashboard/src/app/signup/page.tsx`

The voice guide explicitly bans "just" as minimizing. Three options, pick the one that fits the surrounding design:

| Line | Current | Option A (direct) | Option B (specific) | Option C (confident) |
|---|---|---|---|---|
| 73–74 | "Email infrastructure that just works." | "Email infrastructure you don't have to babysit." | "Email that routes, fails over, and keeps sending." | "One API. Any provider. Zero lock-in." (matches your pillar #1) |

**Recommended:** Option C. It aligns with the existing login-page copy and reuses your own pillar — consistency beats novelty here.

### 3.3 Marketing hero — "Guaranteed" is a trap

**File:** `marketing/CourierX/components/parallax-slider.tsx`

| Line | Current | Rewrite | Why |
|---|---|---|---|
| 33 | "Your Freedom Guaranteed" | "You Own the Keys" | Competitors all claim "guaranteed." You actually ship something different — BYOK. Name it. |

Alternate: "Open, or Your Money Back" — only if you want to lean into an actual commitment.

### 3.4 Features — scarcity copy doesn't fit the voice

**File:** `marketing/CourierX/components/landing-content.tsx`

| Line | Current | Rewrite |
|---|---|---|
| 209–210 | "Spaces are limited while we prep the fleet. Reserve your spot today and be first to experience reliable email routing." | "We're onboarding teams in order. Join the waitlist and we'll reach out when your account is ready." |

Why: honest framing ("we're onboarding in order") is more persuasive to this audience than manufactured scarcity, and the brand guide specifically calls out that CourierX earns trust through specifics, not promises.

### 3.5 Overview — subjective metric descriptors

**File:** `frontend/dashboard/src/app/dashboard/overview/page.tsx`

Replace the words "healthy", "low", and "good" with thresholds. A developer seeing "good" next to their bounce rate learns nothing; seeing "below 2% — within benchmark" learns something.

| Line | Current | Rewrite |
|---|---|---|
| ~74 | "healthy" (open rate) | "above 30%" — or compute the badge from a threshold constant |
| ~74 | "low" (bounce rate) | "within benchmark" / "above 5% — review" |
| ~82 | "good" | "above target" / show the number |

Implementation note: if you want a one-word badge, introduce a shared `MetricStatus` enum with values like `within-benchmark`, `watch`, `action-needed` — each maps to a color and shows the threshold on hover. Keeps the grid scannable without subjective words.

---

## 4. Error message rewrites

The voice guide's error pattern is **What happened + Why + How to fix**. Most existing errors only hit step one. The rewrites below add the missing steps.

### 4.1 Rails

**`app/controllers/api/v1/auth_controller.rb`**

| Line | Current | Rewrite |
|---|---|---|
| 87 | `"Unauthorized"` | `"Authentication required. Include a valid bearer token or API key in the Authorization header."` |
| 31 | `"Invalid email or password"` | Keep. Intentionally non-specific for security — do not reveal which was wrong. |

**`app/services/provider_verification_service.rb`**

| Line | Current | Rewrite |
|---|---|---|
| 61 | `"Verification failed: #{e.message}"` | `"Could not verify credentials with #{provider}. Provider returned: #{e.message}. Check that the key is active and has send permissions."` |
| 59 | `"Could not reach verification service: #{e.message}"` | `"Could not reach #{provider}. Check your network or the provider status page, then retry."` |

### 4.2 Go — API handlers

**`internal/api/handlers.go` and `internal/api/verify.go`**

| Current | Rewrite |
|---|---|
| `"invalid request body: " + err.Error()` | `fmt.Errorf("invalid request body: %w. Expected JSON matching SendRequest — see docs.courierx.dev/api/send", err)` |
| `"from, to, and subject are required"` | Keep — already on-brand. |
| `"maximum 1000 recipients per batch"` | `"Too many recipients. The per-batch limit is 1000. Split into multiple batches or use /v1/send/bulk-async."` |
| `"unsupported provider: %s"` | Keep — but add supported list: `"Unsupported provider: %s. Supported: sendgrid, mailgun, ses, postmark, resend, smtp."` |
| `"connection failed: %w"` (all providers) | `"Could not reach %s. Check network, firewall, and provider status. Underlying error: %w"` |
| `"invalid API key (HTTP %d)"` | Keep — already on-brand. |

### 4.3 Go — SMTP provider (the worst offenders)

**`internal/providers/smtp.go`**

SMTP errors currently say what SMTP operation failed but not which part of the user's config to check. Rewrites:

| Current | Rewrite |
|---|---|
| `"smtp: build MIME: %w"` | `"Could not build MIME message. Check that your From, To, and Body are valid UTF-8 and under 10MB. Underlying: %w"` |
| `"smtp: TLS dial: %w"` | `"TLS connection to %s:%d failed. Check that the host accepts TLS on that port, or try port 587 with STARTTLS. Underlying: %w"` |
| `"smtp: dial: %w"` | `"Could not connect to %s:%d. Check the host, port, and that outbound SMTP is not blocked. Underlying: %w"` |
| `"smtp: auth: %w"` | `"SMTP authentication failed. Verify the username and password, and confirm the server supports AUTH LOGIN or AUTH PLAIN. Underlying: %w"` |
| `"smtp: STARTTLS failed: %w"` | `"STARTTLS negotiation failed on %s:%d. The server may not support STARTTLS — try port 465 with implicit TLS instead. Underlying: %w"` |

**`internal/api/verify.go`** (SES)

| Current | Rewrite |
|---|---|
| `"failed to sign request: %w"` | `"Could not sign the AWS request. Verify that accessKeyId and secretAccessKey are set, have no whitespace, and are copied from an active IAM user. Underlying: %w"` |

### 4.4 Go — Router

**`internal/providers/router.go`**

| Current | Rewrite |
|---|---|
| `"no provider routes configured"` | `"No provider routes configured. Connect a provider in the dashboard or include at least one route in the request's providers array."` |
| `"all providers failed, last error: %w"` | `"All configured providers failed for this send. Check each provider's status in the dashboard; the last error was: %w"` |

### 4.5 Error copy template (for future errors)

Copy this into a `docs/writing-errors.md` and require it in PR reviews:

```
[What failed, in plain English]. [Why it failed or which input caused it, if
safe to disclose]. [One concrete next step the reader can take].
Underlying: <wrapped error, if any>.
```

Three passing examples:

1. `"Domain verification failed. The DKIM CNAME record for mail.acme.com was not found. Add the record shown in the dashboard, then retry in 5 minutes."`
2. `"Rate limit exceeded for tenant acme-prod. The per-minute limit is 10,000. Slow your send rate or contact support to raise the cap."`
3. `"Recipient is suppressed. user@acme.com was added to your suppression list on 2026-03-04 with reason hard_bounce. Remove them manually if you've re-verified the address."`

Three anti-patterns to reject in review:

- `"Error occurred"` — says nothing
- `"Oops! Something went sideways 😬"` — explicitly off-brand (cheerleader)
- `"Internal server error"` leaked to API clients — use `503` + `"Temporarily unavailable. Retry with exponential backoff starting at 1s."`

---

## 5. Reusable patterns (add these as you build)

These patterns didn't exist in the audit but will soon. Specifying them now saves a rewrite later.

### 5.1 Empty state template

```
[What this is], in one line.
[Why it's empty for this user].
[One CTA, verb-first].
```

Examples (write these into the pages when they exist):

**Campaigns (already close):**
> No campaigns yet.
> Campaigns will appear here once you start sending through the API.
> **[Send your first email]**

**Webhooks:**
> No webhooks configured.
> Register an endpoint to receive delivery, bounce, and complaint events in real time.
> **[Add webhook]**

**Suppressions:**
> No suppressions yet.
> Bounced and complained addresses land here automatically. You can also add addresses manually.
> **[Add suppression]**

### 5.2 Confirmation dialog template

Already strong in API Keys → Revoke. Generalize:

```
Title:       [Action] [noun]?         e.g. "Revoke API key?"
Consequence: [What changes, in one line]. [Whether it's reversible].
Confirm:     [Verb + noun]              e.g. "Revoke key"
Cancel:      Keep [noun]                e.g. "Keep key"
```

Never use "OK"/"Cancel". Always use the verb. Destructive actions get a red button and the word "forever" or "permanently" in the consequence line.

### 5.3 Loading state template

Set an expectation, in decreasing order of specificity:

1. **Known duration:** "Verifying credentials with SendGrid — usually under 5 seconds."
2. **Known steps:** "Sending 2,400 emails… this takes about 30 seconds."
3. **Unknown:** "Sending…" (fall back only when you truly don't know)

Anti-patterns: "Please wait", "Loading...", "Thinking", "Hang tight".

### 5.4 Onboarding flow copy (pattern, not specific lines)

The existing onboarding is minimal and clean. As it grows, each step should answer three reader questions in order:

1. **What is this step?** (one line, the name)
2. **Why am I doing it?** (one line, what you unlock)
3. **What do I do?** (the form, action, or skip link)

Example for a future "Connect your first provider" step:

> **Step 2 of 3 — Connect a provider**
> You'll bring your own API key. We never store it in plaintext.
> [Form]
> [Skip for now — you can connect later]

Always offer a skip link on onboarding steps that aren't strictly required for first send. Forced onboarding is the fastest way to lose a dev's patience.

### 5.5 Success message pattern

Differentiate by stakes:

| Stakes | Pattern | Example |
|---|---|---|
| Routine save | Toast, 2s | "Saved." |
| First-time milestone | Toast + next-step suggestion | "API key created. Copy it now — you won't see it again." |
| Flow completion | In-page confirmation, persistent | "Your first email is on its way. Watch it in Logs." |

The current dashboard does this well for API keys. Extend the pattern to first domain verified, first webhook received, first failover.

---

## 6. Marketing rewrites — optional polish

Lower priority than §3, but tighten when you get to it.

### 6.1 Parallax hero rotation (`components/parallax-slider.tsx`)

Current rotation leans hero-adjective ("Enterprise-Ready Scale", "Multi-Provider Email Infrastructure"). Rewrite to lead with reader outcome:

| Slot | Current | Rewrite |
|---|---|---|
| Slide 1 headline | "Never Miss a Delivery" | Keep — on-brand. |
| Slide 1 subhead | "Send through SES, SendGrid, Mailgun, SMTP and more with automatic failover and smart routing." | Keep. |
| Slide 2 headline | "Your Freedom Guaranteed" | "You Own the Keys" *(from §3.3)* |
| Slide 2 subhead | "Open-source architecture means you're never trapped. Switch providers or self-host anytime." | "BYOK. Your providers, your reputation, your data. Switch or self-host whenever you want." *(keeps it honest and uses your own term)* |
| Slide 3 headline | "Built for Developers" | "Built by Developers, for Developers" — only if true. Otherwise keep. |
| Slide 3 subhead | "Scalable email API for SaaS with suppression handling, per-domain routing, and enterprise-grade monitoring." | "Per-tenant routing, automatic suppression handling, real-time logs. Scales from one project to multi-tenant SaaS." |

### 6.2 CTAs across the marketing site

Verb-first, specific outcome. The landing already does this mostly well. Minor tightening:

| Current | Rewrite |
|---|---|
| "Get Started on GitHub" | Keep. |
| "Sign Up for First Delivery" | "Send your first email" (drops the metaphor once; one is plenty) |
| "Get Early Access - Join the Waitlist" | "Join the waitlist" |

### 6.3 Footer tagline

"Your email, always delivered." reaches a little. Two alternatives, pick what matches your confidence:

- Conservative: "Email delivery that keeps sending." *(matches a pillar-line already in the brand guide)*
- Honest: "One API. Any provider. Zero lock-in."
- Playful (only if you want to lean into this): "We route so you don't have to."

---

## 7. Terminology reminder (from the voice guide — included here so reviewers don't need two tabs)

Use these. Reject PRs that don't.

| Use | Not |
|---|---|
| CourierX | courierx, COURIERX, Courierx |
| email | e-mail |
| provider | vendor, integration, connector |
| routing rule | route rule, routing config |
| provider connection | integration, connector |
| failover | fallback, retry |
| tenant (technical) / customer (marketing) | account |
| API key | api key, API Key |
| BYOK (after spelling out once) | — |
| suppression list | blocklist, blacklist |
| log in (verb) / login (noun) | — |
| sign up (verb) / signup (noun) | — |

Banned words (do not ship): **seamless, world-class, easy, leverage, simply, just, synergy, ecosystem, bleeding edge**.

---

## 8. Prioritized action list

If you only do five things this sprint, do these:

1. **Fix the "logistics" copy on the pricing page.** Critical — it will cost you a conversion the first time a dev sees it.
2. **Replace "just works" on the signup hero** with your pillar line.
3. **Rewrite the "connection failed" and SMTP errors** — they're the ones your paying customers will hit and screenshot in tickets.
4. **Add the three thresholds to the overview metrics** so "healthy/good/low" can be retired.
5. **Adopt the error-template snippet in §4.5** as a linter rule or PR checklist item so the problem doesn't come back.

Medium-priority (next sprint):

6. Tighten the hero slide copy in §6.1.
7. Replace the waitlist scarcity copy with the "in order" framing.
8. Document the empty state, confirmation, and loading patterns in §5 in a shared internal doc (or inline as component stories).

Lower-priority (when you get to it):

9. Marketing CTAs cleanup (§6.2).
10. Footer tagline decision (§6.3).

---

## Appendix — What wasn't audited

- **Emails sent by CourierX to users** (welcome, verify, password reset, digest). The templates either don't exist in the repo yet or live outside `frontend/` and `backend/`. Flag these for a follow-up pass once the templates are written; the same voice/tone rules apply.
- **Docs site (`marketing/CourierX-docs`)** — not inspected in this audit. A separate audit recommended once docs are stable.
- **SDKs and CLI output** — if CLI errors and README snippets are generated by the SDK, those deserve their own pass using the §4 error template.
- **Status page / incident templates** — the voice guide section 10 example is strong ("Investigating — We're seeing elevated failure rates…"). Codify that as the template and require all incident posts to follow it.

---

*Any rewrite in this document is a suggestion, not a mandate. Where a line is specifically destined for a surface you know better than this audit does, override it — but keep the pattern (what + why + how to fix, verb-first CTAs, no banned words).*
