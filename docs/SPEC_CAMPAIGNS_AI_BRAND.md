# CourierX — Campaigns, Contacts, AI Email Generation & Brand Guidelines
**Date:** April 19, 2026  
**Status:** Draft — for review before implementation  
**Scope:** Three interconnected product areas that together turn CourierX from a transactional API into a full email platform

---

## Executive Summary

This spec covers three new product surfaces that work together:

1. **Campaigns & Contacts** — The ability to manage audiences and send to lists, not just single addresses
2. **AI Email Builder** — AI-powered template generation that produces beautiful, on-brand emails
3. **Brand Guidelines System** — Tenant-owned brand rules that ground AI generation and ensure consistency

Together, these transform CourierX from "smart email routing API" into "the email platform that routes both emails and AI." The routing insight is the key one: **the same failover/selection logic CourierX uses for email providers applies to AI models.**

---

## Area 1: Campaigns & Contact Management

### Problem Statement

Right now CourierX can send a single email to a single address. That covers transactional email (receipts, password resets, notifications). But developers and marketers also need to send the same email to hundreds or thousands of contacts — product announcements, newsletters, onboarding sequences, re-engagement campaigns. Without campaigns and contacts, CourierX cannot serve this use case and loses half the email market.

### What We're Building

A contact management system and campaign engine layered on top of the existing send infrastructure.

---

### Contacts

A **Contact** is a person with an email address, attributes, and list memberships. They belong to a tenant.

**Contact fields:**
- `email` — primary identifier
- `first_name`, `last_name`
- `attributes` — arbitrary JSON (company, role, plan, custom fields)
- `status` — active / unsubscribed / bounced / suppressed
- `unsubscribed_at` — timestamp when they opted out
- `source` — how they were added (api, import, form, manual)
- `tags` — string array for segmentation

**Contact capabilities:**

| Capability | Priority | Notes |
|-----------|----------|-------|
| Create a contact | P0 | `POST /api/v1/contacts` |
| Bulk import contacts (CSV / JSON) | P0 | Up to 10k per request |
| List contacts with filtering | P0 | Filter by status, tag, list, date |
| Update contact attributes | P0 | Partial updates via PATCH |
| Delete a contact | P0 | Soft delete, retain for compliance |
| Unsubscribe a contact | P0 | Status → unsubscribed, auto-added to suppression |
| Resubscribe a contact | P1 | If they explicitly opt back in |
| Contact activity history | P1 | All emails sent + events for this address |
| Merge duplicate contacts | P1 | Merge two records with same email |
| GDPR export for a contact | P2 | Export all data associated with address |
| GDPR erasure for a contact | P2 | Delete all associated data |

---

### Contact Lists

A **ContactList** is a named group of contacts. Contacts can be in multiple lists.

| Capability | Priority | Notes |
|-----------|----------|-------|
| Create a contact list | P0 | `POST /api/v1/contact_lists` |
| Add contacts to a list | P0 | Single or bulk |
| Remove contacts from a list | P0 | — |
| List all lists with contact counts | P0 | — |
| Delete a list (not the contacts) | P0 | — |
| Duplicate a list | P1 | — |
| List subscription endpoint (public) | P1 | `POST /subscribe` — for forms and landing pages |

---

### Segments

A **Segment** is a dynamic list defined by rules, not manually curated. Segments update automatically as contacts meet or stop meeting criteria.

| Capability | Priority | Notes |
|-----------|----------|-------|
| Create a segment with filter rules | P1 | `status = active AND tag = 'paid'` |
| Preview segment before using | P1 | Count + sample contacts |
| Segment by contact attributes | P1 | Any key in `attributes` JSON |
| Segment by engagement | P2 | Opened last campaign, never clicked, etc. |
| Combine segments (AND / OR / NOT) | P2 | — |

---

### Campaigns

A **Campaign** is a single email message sent to a list or segment.

**Campaign fields:**
- `name` — internal name
- `subject` — email subject line
- `from_email`, `from_name`
- `reply_to`
- `template_id` — which template to use
- `contact_list_id` or `segment_id` — who receives it
- `status` — draft / scheduled / sending / sent / cancelled
- `scheduled_at` — when to send (null = send immediately)
- `tags` — for analytics grouping
- `test_email` — send a preview to this address

**Campaign capabilities:**

| Capability | Priority | Notes |
|-----------|----------|-------|
| Create a campaign (draft) | P0 | — |
| Send a test/preview email | P0 | Before committing to full send |
| Send immediately | P0 | Triggers bulk send job |
| Schedule for future send | P0 | `scheduled_at` datetime |
| Cancel a scheduled campaign | P0 | Before it starts sending |
| Campaign analytics | P0 | Open rate, click rate, bounce rate, unsubscribes |
| Per-link click tracking | P1 | Which links got clicked, how many times |
| Pause a sending campaign | P1 | Stops mid-send, can resume |
| Duplicate a campaign | P1 | Clone with new name |
| A/B test subject lines | P1 | Split audience, track open rates |
| A/B test content | P2 | Split audience, track click rates |
| Drip sequences / automations | P2 | Send email 1 now, email 2 in 3 days, etc. |
| RSS-to-email campaigns | P3 | Auto-send when new content is published |

---

### Campaign Analytics

Every campaign gets a dedicated analytics view:

| Metric | Description |
|--------|-------------|
| Recipients | Total contacts the campaign was sent to |
| Delivered | Successfully accepted by provider |
| Opens | Unique opens (requires tracking pixel) |
| Clicks | Unique link clicks |
| Bounces | Hard + soft breakdown |
| Unsubscribes | Contacts who opted out from this campaign |
| Complaints | Marked as spam |
| Open rate | Opens / Delivered |
| Click rate | Clicks / Delivered |
| Click-to-open rate | Clicks / Opens |

---

### Data Model Changes Needed

```
contacts
  id (uuid), tenant_id, email, first_name, last_name,
  attributes (jsonb), status, tags (array), source,
  unsubscribed_at, created_at, updated_at

contact_lists
  id (uuid), tenant_id, name, description,
  contact_count (cached), created_at, updated_at

contact_list_memberships
  contact_id, contact_list_id, added_at

segments
  id (uuid), tenant_id, name, rules (jsonb), created_at

campaigns
  id (uuid), tenant_id, name, subject, from_email, from_name,
  reply_to, template_id, contact_list_id, segment_id,
  status, scheduled_at, sent_at, tags (array), created_at

campaign_stats
  campaign_id, recipients, delivered, opened, clicked,
  bounced, unsubscribed, complained, calculated_at
```

The existing `Email` model stays as-is — campaign sends create individual `Email` records (one per recipient), linked to the campaign via a `campaign_id` foreign key.

---

### User Stories

**As a developer,** I want to import my user list into CourierX so that I can send product announcements without managing the send loop myself.

**As a marketer,** I want to send a campaign to a segment of contacts who signed up in the last 30 days so that I can onboard new users with a welcome series.

**As a marketer,** I want to preview my campaign with a test send before it goes to my full list so that I catch formatting issues before they reach 10,000 people.

**As a contact,** I want to be able to unsubscribe from an email with one click so that I am not sent emails I do not want.

**As a developer,** I want unsubscribes to automatically flow into my suppression list so that I do not need to manually sync them.

---

## Area 2: AI Email Builder

### The Core Insight

CourierX already knows how to do routing with fallback. It does this for email providers. **The same architecture applies to AI models.** Instead of "try SendGrid, fall back to Mailgun," you get "try Claude Opus for creative copy, use GPT-4o for structured templates, fall back to Gemini Flash for cost."

This is a genuine product differentiator — no one else in the email space is doing AI model routing.

---

### Two Approaches: What to Build and When

#### Option A: BYOK AI (Bring Your Own AI Key)

Same pattern as provider BYOK. Tenant connects their own OpenAI, Anthropic, or Gemini API key. CourierX routes generation requests through their credentials.

**Pros:** Easy to implement (same pattern as ProviderConnection), no margin risk on API costs  
**Cons:** Requires the tenant to have AI credentials, no model optimization, no quality guarantees

**When to build:** Phase 1 — do this first because the pattern is already there.

#### Option B: CourierX AI Routing (Recommended for Phase 2)

CourierX connects to OpenRouter and routes AI generation requests to the best model for the task. Tenant pays CourierX for AI credits. CourierX optimizes model selection for quality, cost, and speed.

**Pros:** Dramatically simpler for tenants (no AI credentials needed), allows model optimization, makes CourierX a platform rather than a passthrough, opens a new revenue stream  
**Cons:** More complex to build, margin risk if model costs spike, need to handle model quality variance

**Why this is the right long-term bet:** The AI model landscape changes every few weeks. Most developers do not want to manage model selection — they want "generate a good email." CourierX can become the layer that abstracts that, the same way it abstracts email provider selection.

**OpenRouter as the gateway:** OpenRouter already aggregates 200+ models with a single API. CourierX sits in front of OpenRouter and adds: task routing logic, brand guideline injection, email-specific prompting, quality validation, and cost caps per tenant.

---

### AI Model Routing Logic

Different email generation tasks suit different models:

| Task | Best Model Type | Reason |
|------|----------------|--------|
| Generate email copy from a brief | Frontier model (Claude 3.5, GPT-4o) | Highest quality, brand-consistent |
| Refine/edit existing copy | Mid-tier (Claude Haiku, GPT-4o mini) | Fast, cheap, good enough |
| Generate subject line variants | Mid-tier | Simple structured task |
| Translate email to another language | Specialized or frontier | Quality matters for brand voice |
| Extract brand guidelines from a doc | Frontier | Comprehension task |
| Suggest a template layout | Frontier | Creative + structural |

The router selects based on: task type, tenant's quality preference, cost budget, and model availability. If the primary model is unavailable or returns poor quality, it falls back — same as email provider failover.

---

### AI Capabilities

**Phase 1 — BYOK AI (after campaigns ship)**

| Capability | Priority | Notes |
|-----------|----------|-------|
| Connect an AI provider (OpenAI, Anthropic, Gemini) | P0 | Same UX as ProviderConnection |
| AI credentials encrypted at rest | P0 | Same encryption as email credentials |
| Generate email copy from a text brief | P0 | "Write a welcome email for new signups on our SaaS product" |
| Rewrite/improve existing copy | P0 | Paste existing email, get improved version |
| Generate subject line options | P0 | Returns 5 variants, ranked |
| Personalize email for a contact | P1 | Inject contact attributes into copy |
| Generate a full email campaign brief | P1 | Campaign goal → full content plan |

**Phase 2 — CourierX AI Routing (premium tier)**

| Capability | Priority | Notes |
|-----------|----------|-------|
| AI routing through OpenRouter | P0 | No tenant AI credentials needed |
| Model selection per task type | P0 | Automatic routing logic |
| Model fallback on failure | P0 | Same failover pattern as email providers |
| AI credit usage tracking | P0 | Per-tenant credit consumption |
| Cost cap per request | P1 | Tenant sets max spend per generation |
| Quality score on outputs | P1 | Evaluate output before returning to tenant |
| Model override (tenant picks model) | P1 | "Use Claude 3.5 for this" |
| Generation history + versions | P1 | See all AI-generated content, revert |

---

### AI Email Template Builder

Beyond generating copy, the AI should be able to produce **complete, visually beautiful email templates** — not just text.

The template builder combines:
1. A structured component system (header, content blocks, CTA buttons, footer, spacers)
2. AI that generates or populates those components from a brief
3. Brand guidelines that constrain color, typography, and tone

**Template builder capabilities:**

| Capability | Priority | Notes |
|-----------|----------|-------|
| Visual template editor (drag + drop) | P1 | React-based, component-driven |
| Pre-built component library | P1 | Header, text block, button, image, divider, footer |
| Responsive layout (mobile + desktop) | P0 | MJML under the hood |
| AI populates template from brief | P0 | "Create a welcome email for our design tool" → full template |
| AI suggests layout for email type | P1 | Promotional vs transactional vs newsletter have different structures |
| Real-time preview | P0 | Desktop + mobile preview as you edit |
| Dark mode preview | P1 | Many email clients render dark mode |
| Export as HTML | P0 | Clean, inline-CSS HTML |
| Export as MJML | P1 | For advanced customization |
| Template variables / personalization | P0 | `{{first_name}}`, `{{company}}` Handlebars syntax |
| Saved templates | P0 | Reuse across campaigns |
| Template versioning | P1 | History of changes |
| Clone + modify a template | P0 | Common workflow |
| Image upload + hosting | P1 | Host images, insert URLs |
| AI-generated images | P2 | Generate hero images via image generation API |
| Spam score check | P1 | Warn if template likely to hit spam filters |

**MJML as the rendering layer:** MJML is the industry standard for responsive email templates. It compiles to valid, client-compatible HTML. The template editor should work in MJML internally and render HTML for delivery. The Go engine already has Handlebars rendering — MJML compilation should happen at template-save time, not at send time.

---

## Area 3: Brand Guidelines System

### Problem Statement

AI-generated email content is only as good as the instructions it receives. Without a brand guidelines system, every AI generation starts from scratch. The result is inconsistent tone, wrong terminology, off-brand colors, and copy that sounds nothing like the company. This erodes trust in AI-generated content and forces humans to rewrite everything.

The solution is a tenant-owned **Brand Guidelines** record that automatically injects context into every AI generation request.

---

### What Brand Guidelines Include

**Voice & Tone**
- Brand personality (e.g. "professional but approachable, like a knowledgeable friend")
- Tone by context (e.g. "formal for billing emails, casual for product updates")
- What to avoid (e.g. "never use corporate jargon, avoid passive voice")

**Messaging**
- Core value proposition (1-2 sentences)
- Key product messages and claims
- Competitor comparison guidelines (what to say / not say)
- Taglines and phrases to use or avoid

**Terminology**
- Product name and correct capitalization (e.g. "CourierX" not "Courier X" or "courierx")
- Feature names (e.g. "Provider Connections" not "provider integrations")
- Forbidden words (e.g. "never say 'cheap'")
- Industry-specific vocabulary

**Visual**
- Primary brand colors (hex codes)
- Font preferences (for HTML email)
- Logo URL
- Image style guidance (e.g. "use lifestyle photography, not stock photo clip art")
- Preferred CTA button style (color, text style, shape)

**Email Defaults**
- Default from name and email
- Default footer content (address, unsubscribe language)
- Legal disclaimers required in certain email types
- Default signature

---

### Brand Guidelines Capabilities

| Capability | Priority | Notes |
|-----------|----------|-------|
| Create / update brand guidelines | P0 | Full JSON document |
| Extract guidelines from uploaded document | P1 | PDF, Word doc, or URL — AI reads and structures it |
| Automatic injection into AI prompts | P0 | Every generation request includes brand context |
| Brand compliance check on generated content | P1 | AI reviews output against guidelines before returning |
| Brand compliance check on manual content | P1 | Paste any email, get a compliance score + notes |
| Terminology highlighting in editor | P2 | Flag incorrect product names in template editor |
| Brand color palette applied to templates | P1 | AI uses brand colors for buttons, headers |
| Multiple brand profiles per tenant | P2 | For agencies or multi-brand companies |
| Brand guidelines versioning | P2 | Track changes to brand guidelines over time |

---

### Data Model

```
brand_guidelines
  id (uuid), tenant_id
  
  # Voice & tone
  voice_description (text)          -- "professional but approachable"
  tone_by_context (jsonb)           -- { billing: "formal", updates: "casual" }
  things_to_avoid (text)            -- free text
  
  # Messaging
  value_proposition (text)
  key_messages (text[])
  taglines (text[])
  forbidden_phrases (text[])
  
  # Terminology
  product_name (string)
  feature_names (jsonb)             -- { "Provider Connections": ["provider integrations", "integrations"] }
  forbidden_words (text[])
  preferred_vocabulary (jsonb)
  
  # Visual
  primary_color (string)            -- hex
  secondary_color (string)
  accent_color (string)
  logo_url (string)
  font_family (string)
  image_style_guidance (text)
  cta_button_style (jsonb)
  
  # Email defaults
  default_from_email (string)
  default_from_name (string)
  footer_content (text)
  legal_disclaimers (jsonb)
  
  created_at, updated_at
```

---

### How Brand Guidelines Feed Into AI Generation

When a tenant requests AI email generation:

```
1. Load tenant's brand_guidelines record
2. Build system prompt:
   - Brand voice and tone description
   - Product name and terminology rules
   - Things to avoid
   - Key messages
   - Visual preferences (colors, style)
3. Add task-specific prompt (write welcome email, generate subject lines, etc.)
4. Route to appropriate AI model
5. Receive generated content
6. Run compliance check against guidelines
7. If compliance score < threshold, regenerate or flag
8. Return content to tenant with compliance notes
```

This means every AI-generated email is automatically brand-consistent without the tenant having to write "use our brand voice" in every request.

---

### The Brand Guidelines ↔ BYOK AI Connection

An interesting design question: **should brand guidelines be a feature of BYOK AI, or a standalone product feature?**

**Recommendation: Standalone.** Brand guidelines should exist and be useful even without AI. They can be used to:
- Automatically validate human-written emails before campaigns send
- Set default template styles (colors, fonts) without AI
- Power a brand review workflow in the dashboard

When AI is enabled, brand guidelines automatically inject into every prompt. When AI is not enabled, brand guidelines still give value as a style guide and compliance checker.

---

## How These Three Areas Connect

```
Contact System
  ↓
Campaign Engine (who gets the email, when)
  ↓
Template Builder (what the email looks like)
  ↑
AI Email Builder (generates template content)
  ↑
Brand Guidelines (constrains and grounds AI output)
  ↓
Email Send Pipeline (existing CourierX core)
  ↓
Provider Routing (existing BYOK)
```

This is the full loop. A marketer can:
1. Import contacts → organize into lists → define a segment
2. Create a campaign → pick the audience → set the schedule
3. Open the template builder → brief the AI → "write a summer sale announcement for our design tool audience"
4. AI reads brand guidelines, generates a beautiful on-brand email
5. Marketer reviews and approves
6. Campaign sends via CourierX's existing provider routing
7. Events flow back via inbound webhooks
8. Campaign analytics show opens, clicks, unsubscribes in real time

---

## Build Order

**Phase 1 (after core transactional email works):**
1. Contacts + Contact Lists (no segments yet — keep it simple)
2. Basic campaigns (send to a list, no scheduling yet)
3. Campaign analytics (just the basics: sent, delivered, opened, clicked)

**Phase 2:**
4. BYOK AI (connect your OpenAI key)
5. Brand guidelines (create and store guidelines)
6. AI copy generation (text-only, guided by brand guidelines)
7. Subject line generation

**Phase 3:**
8. Visual template builder (component-based)
9. MJML rendering
10. CourierX AI routing (OpenRouter, no tenant credentials needed)
11. AI model routing logic (task → model selection)
12. Segments

**Phase 4:**
13. AI-assisted image generation
14. Brand compliance checker
15. Drip sequences / automations
16. A/B testing (subject line, then content)

---

## On the AI Architecture Decision: Make a Call

You asked the right question: **BYOK AI or be the cloud AI provider?**

Here is the honest answer: **do both, but be the cloud AI provider by default.**

BYOK AI is easy to build (two weeks, same pattern as ProviderConnection) and serves developers who already have AI credentials. Do it first to validate the feature.

But the long-term product bet should be **CourierX AI** — where you are the AI routing layer and tenants pay you for AI credits. Here is why:

- **It is the same product motion as your email routing.** You already have the mental model. Email providers → AI models. Failover logic → model fallback. Per-tenant routing rules → per-task model selection. The code patterns are nearly identical.
- **It removes friction for non-technical marketers.** A marketer does not want to set up an Anthropic account. They want to click "generate email" and get something great.
- **It creates a recurring revenue lever.** AI credits per email generated, on top of email volume. Two usage-based revenue streams.
- **Models change fast and you can optimize.** When a new model drops that is 50% cheaper and 20% better at email copy, you swap it in for all tenants automatically. They get the improvement, they do not have to do anything.

The MCP connection infrastructure already in your codebase (`McpConnection` model, `MCP_AUDIT_LOG`) suggests someone already thought about external AI/tool connections. That is a good foundation for the BYOK AI path.

---

## Open Questions

| Question | Who Answers | Blocking? |
|----------|-------------|-----------|
| Do we want to be a list host (like Mailchimp) or stay API-first and let developers manage contacts via API? | Product | Yes — determines dashboard vs API-first UX |
| What is the pricing model for AI credits? Per generation, per token, or flat monthly? | Business | No — decide before Phase 2 ships |
| Do we build the visual template editor ourselves, or embed an existing solution (Unlayer, Beefree, Stripo)? | Engineering + Product | Yes — big build-vs-buy decision |
| Should campaigns send immediately via Go or through the existing Sidekiq outbox pattern? | Engineering | Yes — volume implications are significant |
| Do we require double opt-in for contact imports? | Legal + Product | No — but affects signup form design |
| What model should be the default for AI generation when the tenant hasn't specified? | Engineering | No |
| Should brand guideline extraction from documents be AI-powered (parse a PDF) or manual form entry? | Product | No |

---

*Last updated: April 19, 2026*
