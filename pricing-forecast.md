# CourierX — Pricing Validation & Revenue Forecast
> Generated: 2026-04-19
> Based on: Proposed pricing tiers from marketing copy + competitive market data

---

## TL;DR

| Finding | Verdict |
|---|---|
| Free tier | ✅ Right — generous enough to drive adoption |
| Pro at $49/mo | ⚠️ Underpriced — comparable infra charges 2-5x more |
| Scale at $199/mo | ⚠️ Pricing cliff — $49→$199 is a 4x jump with no mid-tier |
| "Unlimited emails" in Pro | 🔴 Risk — creates uncapped support cost exposure |
| 10 tenants on Pro | 🔴 Too generous — destroys upgrade pressure to Scale |
| Self-host free forever | ✅ Right strategically — open-source growth flywheel |

**Recommended action:** Reprice Pro to $79–$99/mo, add a $129 Growth tier, cap Pro at 3–5 tenants.

---

## Section 1 — Competitive Landscape

CourierX is **not** a provider (like Resend or Postmark). It's **routing infrastructure** (like Knock or Novu). The right comparables are infrastructure layers, not senders.

| Product | Category | Price | What you get |
|---|---|---|---|
| **Resend** | Email provider | $20/mo Pro | 50K emails/mo through Resend's infra |
| **Postmark** | Email provider | $15/mo | 10K emails, great deliverability |
| **Loops** | Email platform (SaaS) | $49/mo | 5K contacts, marketing + transactional |
| **Knock** | Notification infra | **$250/mo** Starter | Multi-channel routing, multi-tenant |
| **Novu Cloud** | Notification infra | Free + paid tiers | Open-source, self-host free |
| **Courier.com** | Notification routing | Enterprise | Multi-channel, heavy enterprise focus |
| **CourierX Pro** | Email routing infra | $49/mo | 10 tenants, 10 providers, failover |
| **CourierX Scale** | Email routing infra | $199/mo | Unlimited tenants |

**Key insight:** Knock charges $250/mo for Starter. CourierX Pro at $49/mo with 10 tenants is priced like an email sender, not like routing infrastructure. The value delivered is much closer to Knock's category than Resend's.

Even discounting to email-only (vs. Knock's multi-channel), the market says $100–$200 for this tier.

---

## Section 2 — Pricing Risk Flags

### 🔴 Risk 1: "Unlimited emails" in Pro

**Problem:** Pro is a flat $49/mo with no email ceiling.
A customer sending 10 million emails through 10 tenants pays $49/mo. Your support, infrastructure, and operational cost scales with usage. This inverts your economics as you grow.

**Fix:** Add a soft ceiling or make the value metric explicit.
- "Routing up to 500K emails/mo. $X per additional 100K."
- Or: "We don't charge per email — you pay your provider. But Pro routing capacity is 500K sends/mo."

At high volume, customers should be on Scale anyway. Give them a reason.

---

### 🔴 Risk 2: 10 tenants on Pro destroys upgrade pressure

**Problem:** A SaaS founder building on CourierX Pro can handle 10 customers before they need to upgrade. For most early-stage SaaS companies, 10 paying customers is 6–18 months of growth. They won't upgrade until much later — if ever.

**Result:** Long free ride on Pro, low NRR (net revenue retention), weak upgrade motion.

**Fix:** Reduce Pro to **3 tenants**. Growth tier gets **15**. Scale gets unlimited.

Founders who are serious about multi-tenancy will upgrade fast. Three tenants is enough to prove it works, not enough to run a real business on.

---

### ⚠️ Risk 3: The $49→$199 pricing cliff

**Problem:** The jump from Pro ($49) to Scale ($199) is **4x** with nothing in between.
Most customers who outgrow Pro (3 tenants) won't feel ready for $199/mo. They'll churn or stay stuck on Pro workarounds (creating fake tenants, etc.) rather than upgrade.

**Fix:** Insert a **Growth tier at $99/mo** — the classic good-better-best structure.

| Tier | Price | Tenants | Providers |
|---|---|---|---|
| Free | $0 | 1 | 3 |
| Pro | $79 | 3 | 6 |
| Growth | $129 | 15 | All |
| Scale | $249 | Unlimited | All + custom routing |

This creates a natural upgrade ladder: prove it → grow it → scale it.

---

### ⚠️ Risk 4: Pro is underpriced against the right comp

At $49/mo you're cheaper than Knock by 5x. Even if CourierX is email-only, you're providing:
- Multi-tenant isolation
- Automatic failover
- Credential management
- Routing rules engine
- Suppression management
- Webhook delivery

That's infrastructure engineering that would take 2–4 weeks to build internally.
The buyer's alternative is hiring a backend engineer for a sprint. At $49/mo, you're not charging for the value — you're charging for the cost of running a server.

**Rule of thumb:** SaaS infra products should price at 10–20x the cost to self-host. If it costs a startup $5/mo in AWS to run a hobby infra layer, $49 is fine. If CourierX is replacing a week of engineering per feature, the floor is closer to $150–$200.

---

## Section 3 — Recommended Pricing Structure

### Revised Tiers

**Free — $0/mo**
- 1 tenant
- 3 provider connections
- 10,000 emails routed/month
- Community support
- Dashboard included
- CTA: `Start free`

**Pro — $79/mo** *(was $49)*
- 3 tenants
- 6 provider connections
- 200,000 emails routed/month
- Webhooks
- Suppression management
- Email support
- 99.9% SLA
- CTA: `Start Pro trial`

**Growth — $129/mo** *(new tier)*
- 15 tenants
- All providers
- 1M emails routed/month
- Custom routing rules
- Priority support (next business day)
- CTA: `Start Growth trial`

**Scale — $249/mo** *(was $199)*
- Unlimited tenants
- All providers
- Unlimited routing volume
- Custom SLA
- Dedicated onboarding
- 4h support response
- CTA: `Talk to us`

**Self-Host — Free forever**
- MIT licensed
- No license fee
- Community support

---

### Why these numbers work

- **$79 Pro** — Still undercuts Knock by 3x but feels deliberate, not accidental. The $49→$79 change on a per-month basis is $30/mo — nobody churns over $30.
- **$129 Growth** — The magic tier. This is where 80% of actual SaaS builders live. 15 tenants covers most seed-stage products. It's the "I'm real now" upgrade.
- **$249 Scale** — Matches Knock's entry point. At unlimited tenants + dedicated onboarding, this is a bargain. Signals enterprise readiness.

---

## Section 4 — Revenue Forecast

### Assumptions (open-source dev tool, Year 1)

| Variable | Conservative | Base | Optimistic |
|---|---|---|---|
| GitHub stars at month 12 | 800 | 2,500 | 6,000 |
| Hosted signups/month (steady state) | 80 | 200 | 500 |
| % who use self-host only | 55% | 50% | 40% |
| Hosted active users (month 12) | 360 | 1,200 | 3,600 |
| Free → Pro conversion | 4% | 7% | 12% |
| Pro → Growth conversion | 10% | 18% | 25% |
| Growth → Scale conversion | 5% | 10% | 15% |
| Monthly churn (Pro) | 8% | 5% | 3% |
| Monthly churn (Growth) | 6% | 4% | 2% |
| Monthly churn (Scale) | 4% | 2% | 1% |

---

### Projected MRR at Month 12 — Revised Pricing ($79/$129/$249)

**Conservative scenario:**

| Tier | Customers | MRR |
|---|---|---|
| Pro ($79) | 14 | $1,106 |
| Growth ($129) | 1 | $129 |
| Scale ($249) | 0 | $0 |
| **Total MRR** | | **$1,235** |
| **ARR run rate** | | **$14,820** |

**Base scenario:**

| Tier | Customers | MRR |
|---|---|---|
| Pro ($79) | 84 | $6,636 |
| Growth ($129) | 15 | $1,935 |
| Scale ($249) | 1 | $249 |
| **Total MRR** | | **$8,820** |
| **ARR run rate** | | **$105,840** |

**Optimistic scenario:**

| Tier | Customers | MRR |
|---|---|---|
| Pro ($79) | 432 | $34,128 |
| Growth ($129) | 108 | $13,932 |
| Scale ($249) | 16 | $3,984 |
| **Total MRR** | | **$52,044** |
| **ARR run rate** | | **$624,528** |

---

### What the old pricing ($49/$199) would have produced at base case:

| Tier | Customers | MRR |
|---|---|---|
| Pro ($49) | 84 | $4,116 |
| Scale ($199) | 1 | $199 |
| **Total MRR** | | **$4,315** |
| **ARR run rate** | | **$51,780** |

**Revenue delta (revised vs. old, base case): +$4,505 MRR (+104%)**
The revised structure roughly **doubles Year 1 revenue** at the same customer count, primarily from Pro repricing and the Growth tier capturing the mid-market.

---

## Section 5 — Commit vs. Upside

### Commit (high confidence, Year 1)

These revenue streams are near-certain if the product ships and gets traction:

| Source | Rationale | MRR estimate |
|---|---|---|
| Pro conversions from GitHub traffic | Dev tools consistently convert at 4–8% from free | $3,000–$8,000 |
| Growth tier upgrades | The tier filling the $49→$199 gap is always the fastest growing | $1,500–$4,000 |
| Early design partners (5–10 companies) | Lock in Scale customers with free onboarding → paid at month 3 | $1,000–$2,500 |
| **Commit total** | | **$5,500–$14,500 MRR** |

### Upside (lower confidence)

| Source | Rationale | MRR potential |
|---|---|---|
| Enterprise self-host → support contract | Companies that self-host often pay for SLA support | $5,000–$20,000 |
| Platform/reseller deals | SaaS builders who white-label the routing layer | $10,000+ |
| Managed migration from SendGrid/Mailgun | One-time setup + ongoing subscription | $2,000–$5,000 |

---

## Section 6 — Gap Analysis & Recommendations

### To reach $10K MRR (ramen-profitable milestone)

At revised pricing ($79/$129/$249):
- Need ~127 Pro customers **or**
- ~78 Pro + ~10 Growth **or**
- ~50 Pro + ~20 Growth + ~2 Scale

At old pricing ($49/$199):
- Need ~204 Pro customers — significantly harder at same conversion rate

**The gap closes faster with the revised pricing even at lower volume.**

### Recommended actions (priority order)

1. **Reprice before launch** — Changing prices after customers have signed up is painful. Set the right prices before the first paying customer. There's no downside to launching at $79.

2. **Add the Growth tier** — This is the single highest-leverage change. The $49→$199 cliff is where you'll see the most churn and the least upgrades.

3. **Cap the email routing volume on Pro** — "Unlimited emails" is a liability. Set a monthly routing cap (200K–500K) with a clear overage path. Most customers won't hit it; those who do are happy to pay.

4. **Run 5 design partner calls before finalizing** — Talk to 5 developers building multi-tenant SaaS products. Ask: "What would you pay per month for a routing layer that handles failover and tenant isolation?" You'll likely hear $75–$150 unprompted.

5. **Consider per-tenant pricing at Scale** — Above 50 tenants, flat $249 is very cheap. A per-tenant model ($X/tenant/mo above 15) aligns pricing with value delivered as platforms grow.

---

## Section 7 — Pricing Page Copy Revisions

Based on this analysis, update the pricing copy from the marketing deck:

**Revised headline:**
```
Simple pricing. Pay for routing, not for volume.
```

**Revised subheadline:**
```
You bring your own provider keys and pay your provider directly.
CourierX charges for the routing layer — failover, multi-tenancy, and
credential management — not per email sent.
```

**Pro tier revised copy:**
```
Pro — $79/mo
For teams building their first multi-tenant product.

- 3 tenants
- 6 provider connections
- 200K emails routed/month
- Webhook delivery
- Suppression management
- Email support + 99.9% SLA
```

**Growth tier (new):**
```
Growth — $129/mo   ← MOST POPULAR badge
For SaaS products growing past their first customers.

- 15 tenants
- All providers (SendGrid, Mailgun, SES, Postmark, Resend, SMTP)
- 1M emails routed/month
- Custom routing rules via API
- Priority support (next business day)
```

**Scale tier revised copy:**
```
Scale — $249/mo
For platforms routing email at scale with enterprise requirements.

- Unlimited tenants
- All providers
- Unlimited routing volume
- Dedicated onboarding
- Custom SLA
- 4h support response
```

**Revised footnote:**
```
You pay your email provider directly at their rates.
CourierX never charges a per-email fee or takes a markup on your volume.
Routing volume limits apply to hosted plans only — self-hosted is unlimited.
```
