# CourierX — User Research Plan

**Date:** 2026-04-20  
**Scope:** Developer personas, interview guides, usability testing, OSS community feedback loops  
**Stage:** Pre-launch (public beta + OSS release)

---

## 1. Research Goals

Before launch, we need answers to four core questions:

1. **Who is actually going to use this?** What jobs do they have, and what's the trigger that makes them look for a tool like CourierX?
2. **What's the activation moment?** Where do developers drop off between "heard of CourierX" and "sent their first email through it"?
3. **Why would someone choose CourierX over Resend, Postmark, or just calling SES directly?** What's the real differentiator that lands?
4. **What does the self-hosting path feel like?** Where does Docker Compose break, and where does the documentation lose people?

---

## 2. Developer Personas

These four personas represent ~90% of potential users. Each has different motivations, different failure modes, and different metrics for success.

---

### Persona A — The Indie SaaS Builder ("Solo")

**Description:** A solo founder or tiny team (1–3 devs) building a B2B or consumer SaaS. Everything ships fast; "good enough" is a legitimate engineering philosophy. Chooses tools by developer experience and time-to-first-value. Has usually been burned by at least one email provider (typically Mailgun or SendGrid raising prices or changing free tiers).

**Job-to-be-done:** Send transactional emails without having to think about it. Wants one API call to work reliably. Will swap providers again if this one gets expensive.

**Trigger to seek CourierX:** Either a pricing change at their current provider, a deliverability problem they can't diagnose, or a "I don't want to be locked in" moment when they realize all their email code is wrapped in SendGrid types.

**Success metric:** "Sent my first email in under 10 minutes and it actually landed in inbox."

**Risk of churn:** High if setup takes > 30 minutes or requires reading more than one documentation page.

**Interview focus:** Time-to-first-value, pricing sensitivity, what "good enough" looks like for deliverability.

---

### Persona B — The Startup CTO ("Builder")

**Description:** Engineering lead at a seed-to-Series A company (5–30 person engineering team). Owns the infrastructure decisions. Evaluates tools on: reliability, observability, cost at scale, and "will this embarrass me in front of the board if it breaks." Has evaluated Postmark, Resend, and probably AWS SES. Cares about failover because they've had an incident.

**Job-to-be-done:** Own the email infrastructure decision for the next 2–3 years. Wants something with good observability so when the CEO asks "why didn't the password reset email go out?", there's an answer.

**Trigger to seek CourierX:** Post-incident (email provider had an outage and they had no fallback), or pre-scale (about to do a big launch and worried about email reliability).

**Success metric:** "I can see in a dashboard why an email failed and prove to stakeholders it wasn't our fault."

**Risk of churn:** Low once integrated — switching cost is high. But they won't start if the docs look unpolished or the architecture isn't explained clearly.

**Interview focus:** Failover story, observability, how they think about the BYOK model, what "production-ready" means to them.

---

### Persona C — The Platform/Agency Builder ("Operator")

**Description:** Building a multi-tenant SaaS (think a no-code tool, a marketing platform, or a developer agency running infrastructure for clients). Needs to send email on behalf of multiple customers, each with their own branding and preferably their own sending domain. Has hit the walls of every major ESP's sub-account system.

**Job-to-be-done:** Send email on behalf of many tenants without commingling their reputation, their data, or their provider keys.

**Trigger to seek CourierX:** Hit the limit of SendGrid's subuser model, or a compliance request from a client that requires data isolation, or needing a client to bring their own SES account.

**Success metric:** "Each of my clients is fully isolated and I can give them a white-label sending dashboard."

**Risk of churn:** Very low — the sub-account architecture is a genuine differentiator. Unlikely to find this elsewhere without building it themselves.

**Interview focus:** ManagedSubAccount model, multi-tenant isolation guarantees, billing consolidation vs. per-client billing, compliance requirements.

---

### Persona D — The OSS Self-Hoster ("DevOps")

**Description:** Engineer at a company that has strict data residency requirements, is skeptical of SaaS, or simply prefers to own their infrastructure. Finds the "bring your own keys" model attractive because they already have SES set up. Will spend 2 hours getting something working if it means not paying a SaaS company monthly.

**Job-to-be-done:** Run a reliable email infrastructure stack on their own Kubernetes cluster (or Fly.io, or a plain VPS) with no vendor dependency except their existing provider relationship.

**Trigger to seek CourierX:** Compliance requirement, cost concern at scale, or general "I want to control this" philosophy.

**Success metric:** "`docker compose up` worked, I sent a test email, and I understand what each service does."

**Risk of churn:** N/A for revenue (they're self-hosting), but they can become evangelists or contributors if the experience is good.

**Interview focus:** Docker Compose setup friction, documentation completeness for ops, upgrade path, what would make them contribute back.

---

## 3. Pre-Launch Interview Guide

### Recruiting Criteria

Recruit participants who match one of the four personas above. Suggested distribution for 12 interviews:
- 4× Persona A (indie builders — Twitter/X developer community, Indie Hackers)
- 3× Persona B (startup CTOs — LinkedIn, YC Slack communities)
- 2× Persona C (platform/agency builders — referrals, email infrastructure forums)
- 3× Persona D (OSS self-hosters — GitHub, Hacker News)

**Screener questions:**
- "What does your current email sending setup look like?" (disqualify: no transactional email need)
- "Have you ever switched email providers?" (yes = more interesting)
- "Do you manage your own infrastructure or use fully managed services?" (maps to persona)
- "Are you the person who makes the decision on which tools your team uses for infrastructure?" (decision-maker preferred)

---

### Interview Script (45 minutes)

**Opening (5 min)**

"Thank you for making time. I'm going to ask you about how you currently send transactional email — not to pitch you on anything, just to understand what's working and what's painful. I'll take notes but won't attribute anything to you by name. Feel free to say 'I don't know' or 'that's not relevant to us.' Sound good?"

"Can you walk me through your role and what your product does at a high level?"

---

**Section 1: Current state (10 min)**

- "How does email sending work at your company today? Walk me through what happens when a user signs up and needs to get a welcome email."
- "Which provider do you use? How long have you been on them?"
- "What do you like about your current setup?"
- "What would you change if you could?"
- "Have you ever had an email-related incident? Walk me through what happened." *(Listen for: what they had to do manually, how long it took to diagnose, whether they had visibility.)*
- "If I asked you right now — how do you know an email you sent actually got delivered? What would you look at?"

---

**Section 2: Discovery and evaluation (10 min)**

- "Have you looked at alternatives to your current setup in the last 12 months? What triggered that?"
- "When you evaluate a new infrastructure tool, what does that process look like? Who else is involved?"
- "What would make you say 'this is production-ready' for something like email infrastructure?"
- "What's the biggest red flag you see when evaluating a developer tool?"

---

**Section 3: Reaction to CourierX concept (15 min)**

*(Show the README or a 2-minute demo video at this point.)*

- "What was your first reaction to that?"
- "What's your immediate question — the thing you'd want to know before considering this?"
- "The BYOK model means you bring your own SendGrid or SES account — CourierX just routes through it. Does that appeal to you or concern you? Why?"
- "We're open-source — you can self-host the whole thing. Does that matter to you?"
- "If you were to try this, what would the first 30 minutes look like? Walk me through what you'd do."
- "What would make you trust this enough to put it in production?"

---

**Section 4: Specific pain points (5 min)**

- "Has provider failover ever been something you've thought about? Tell me about that."
- "Do you have customers in multiple regions or with compliance requirements around data residency?"
- "If you're running infrastructure for multiple clients, how do you handle email on their behalf today?"

---

**Closing (5 min)**

- "Is there anything you expected me to ask that I didn't?"
- "If CourierX launched tomorrow, what would it need to have for you to consider trying it?"
- "Would you be open to a follow-up usability session where we watch you try the product for real?"

---

## 4. Usability Test Scripts

These tests are run after an initial private beta build exists. Sessions are 60 minutes, remote via Loom/Zoom with screen share. The goal is to watch — not to help.

---

### Test 1: Cloud Onboarding (Persona A + B)

**Goal:** Identify where users drop off between registration and first sent email.

**Setup:** Clean account, no pre-existing data. User is given a real email address to send to (a test inbox you control). They are NOT given a quickstart guide — they're pointed to the homepage.

**Tasks:**

1. "You've decided to try CourierX. Go ahead and get set up to send your first email." *(Observe: do they read docs? Where do they go first? What confuses them about account setup?)*

2. "Connect your SendGrid account." *(Observe: do they understand what 'provider connection' means? Do they know where to find their SendGrid API key? What happens when they click 'Test'?)*

3. "Verify a domain you own for sending." *(Observe: do they understand what DNS records to add? How long do they expect verification to take? Do they know what SPF/DKIM means?)*

4. "Send a test email to [test address]." *(Observe: how do they find the send flow? What fields confuse them? Do they check if it was delivered?)*

5. "Something went wrong — the email shows as 'failed'. Debug it." *(Introduce a deliberately failed send. Observe: do they find the email logs? Can they read the error? Do they know what to do next?)*

**Things to note per task:**
- Time on task
- Points of confusion (verbalize with "think aloud" prompt if they go quiet)
- Where they look for help (docs, console, nothing)
- Exact wording of questions they ask out loud

**Success criteria:** User reaches "first delivered email" within 20 minutes without assistance.

---

### Test 2: Self-Hosting Setup (Persona D)

**Goal:** Validate that `docker compose up` actually works for a real engineer, and that the documentation fills in what it doesn't.

**Setup:** Fresh MacOS or Ubuntu machine with Docker installed. User is given the GitHub repo link and nothing else.

**Tasks:**

1. "Self-host CourierX using whatever instructions you can find." *(Observe: do they go to README? Do they find the quickstart? How far does `docker compose up` get before something breaks?)*

2. "Send a test email through your local instance." *(Observe: do they know the local API is on port 4000? Do they use cURL or want a dashboard?)*

3. "Connect your own Mailgun account to your local instance." *(Observe: do they understand the BYOK model requires a real provider key? Do they know where to put it?)*

4. "You want to deploy this to production. What would you do?" *(Open-ended — listen for: what they'd use for hosting, what concerns them, what documentation they'd need.)*

**Success criteria:** User reaches a running local instance within 30 minutes and can articulate what each service in docker compose does.

---

### Test 3: API Integration (Persona A + B — developer focus)

**Goal:** Validate SDK ergonomics and API docs clarity.

**Setup:** User has an existing Node.js or Python project. They have a CourierX account and API key. They're given the docs URL and their API key.

**Tasks:**

1. "Integrate CourierX email sending into your project." *(Observe: do they install the SDK first or read the REST docs? How do they handle the API key? Do the SDK types make sense?)*

2. "Set up a webhook so your app gets notified when an email bounces." *(Observe: do they find the webhook docs? Do they understand signature verification? Do they try to implement it?)*

3. "Write code to check whether a specific email was delivered." *(Observe: do they find the emails.get() endpoint? Is the status lifecycle clear?)*

**Success criteria:** User successfully sends an email via SDK and can explain the status lifecycle.

---

## 5. OSS Community Feedback Loops

These are ongoing mechanisms for collecting product signal from the open-source community after launch.

---

### GitHub Issue Templates

Three templates to install at `.github/ISSUE_TEMPLATE/`:

**Bug report (`bug_report.yml`):**
Fields: what happened, what you expected, steps to reproduce, CourierX version, deployment method (Docker/Fly/Railway/other), relevant logs. Mandatory: "Does this happen on a clean install?" dropdown.

**Feature request (`feature_request.yml`):**
Fields: what problem this solves, who it affects (developer/operator/self-hoster), what you've tried instead, how important this is (nice-to-have / blocking adoption / blocking production use).

**Provider compatibility (`provider_compat.yml`):**
Fields: which provider, what's broken, what the API response was, your configuration (with credentials redacted). Purpose: surface provider-specific edge cases we don't catch in CI.

---

### GitHub Discussions Structure

Set up four discussion categories:

**💡 Ideas** — Open-ended feature requests and direction input. Pin a monthly "what are you building?" thread to capture use case variety.

**🆘 Help** — Support questions for self-hosters. Respond within 48 hours for the first 6 months. High-volume questions here should become docs pages.

**🏗️ Show and Tell** — What people built with CourierX. This is the most valuable category for understanding real use cases and for social proof.

**📣 Announcements** — One-way from the team. Changelogs, new provider support, deprecations.

---

### Discord Server Structure

For faster feedback during beta:

- `#announcements` — Releases and major updates (team-only posting)
- `#general` — Open conversation
- `#help` — Support with bot integration to search docs first
- `#integrations` — Provider-specific discussion (SendGrid thread, SES thread, etc.)
- `#self-hosting` — Docker/Kubernetes/Fly deployment discussion
- `#contributors` — For people actively working on PRs
- `#product-feedback` — Weekly "what's frustrating you?" prompt from the team

**Weekly prompt cadence:** Every Monday, post one question in `#product-feedback`. Rotate through: onboarding friction, documentation gaps, missing providers, feature prioritization. Aggregate responses into a weekly notes doc.

---

### Quarterly Surveys

**Timing:** 30 days after OSS launch, then quarterly.

**Target:** Everyone who has starred the repo, opened an issue, or joined Discord.

**Length:** Under 5 minutes, 8 questions maximum.

**Core questions (rotate 4–6 per survey, always include #1 and #2):**

1. "In one sentence, what do you use CourierX for?" *(open text — best signal for understanding actual use cases)*
2. "How likely are you to recommend CourierX to a developer friend? (0–10)" *(NPS)*
3. "What's the one thing about CourierX that would make you stop using it?" *(open text)*
4. "Which providers do you have connected?" *(multi-select — surfaces missing provider demand)*
5. "Are you self-hosting or using the cloud version?" *(radio)*
6. "What feature are you most waiting for?" *(open text)*
7. "How would you rate the documentation?" *(1–5 with open follow-up if ≤ 3)*
8. "Is there anything you expected CourierX to do that it doesn't?" *(open text — captures the gap between mental model and product)*

---

## 6. Research Synthesis Framework

### After Each Interview

Within 24 hours of each interview, log:
- One-paragraph summary of who this person is and what they care about
- 3–5 direct quotes (exact words, not paraphrases)
- Moments of confusion or delight (timestamped if recorded)
- Which persona they map to (confirm or update the persona)
- One thing they said that surprised you

Template location: `docs/research/interview-notes-YYYY-MM-DD-[initials].md`

---

### After Each Usability Test

Log per task:
- Completion: yes / yes with help / no
- Time on task (target vs. actual)
- Where they got stuck (specific UI element or copy)
- Verbatim confusion moments

Severity scoring for issues found:
- **S1 (Blocker):** User could not complete the task at all. Fix before beta.
- **S2 (Major):** User completed task but with significant struggle or wrong path. Fix in next sprint.
- **S3 (Minor):** Confusion that didn't block completion. Add to backlog.
- **S4 (Cosmetic):** Polish issue. Fix when convenient.

---

### Synthesis Cadence

**After 6 interviews:** Review notes together, identify patterns by affinity grouping. Update personas if reality diverges from assumptions. Update the prioritization of OSS launch checklist items based on what's blocking adoption.

**After 12 interviews:** Write a synthesis document covering: validated assumptions, invalidated assumptions, top 3 friction points by persona, top 3 delighters, recommended product changes with rationale.

**After each usability test round (3–5 sessions):** Triage all S1/S2 issues into GitHub issues with the label `user-research`. Design fixes and re-test in next round.

---

## 7. Metrics to Track at Launch

Beyond qualitative research, instrument the product from day one to answer the quantitative versions of the same questions:

| Metric | What it tells you | Target (90-day) |
|--------|------------------|-----------------|
| Time to first sent email | Activation friction | < 10 minutes median |
| Registration to first API key | Setup completion | > 60% |
| First email to second email | Retention signal | > 50% within 7 days |
| Provider connection success rate | Onboarding drop-off | > 80% complete |
| GitHub stars → cloud registration | OSS → cloud conversion | 3–5% |
| Docs page bounce rate | Documentation quality | < 65% on quickstart |
| Self-host Docker success rate | Inferred from: issues filed with "docker" label | Track trending |
| NPS at 30 days | Overall satisfaction | > 40 |

---

## 8. Lean Research Timeline (Pre-Launch)

```
Week 1–2:  Write screener, recruit 12 participants via Twitter/X, Indie Hackers,
           LinkedIn, and GitHub (star the repo early, reach out to starred users)

Week 3–4:  Conduct 6 discovery interviews (mix of personas A, B, D)
           Synthesize: update personas, identify top 3 unknown risks

Week 5:    Conduct 3 usability tests on cloud onboarding (Test 1)
           Triage S1/S2 issues immediately

Week 6:    Conduct 3 usability tests on self-hosting (Test 2)
           Triage S1/S2 issues

Week 7–8:  Remaining 6 discovery interviews (focus on personas C and any
           under-represented segments)
           Final synthesis document

Week 9:    Prioritization session: map research findings to launch checklist
           Kill, keep, or de-scope based on what actually blocks adoption

Launch:    Ship GitHub Discussions + Discord structure
           Enable GitHub issue templates
           Schedule first quarterly survey for 30 days post-launch
```

---

## 9. What Good Research Output Looks Like

The goal of all this is a one-pager that answers:

- **Who is actually adopting CourierX in the first 90 days?** (Probably Persona A and D, not B or C yet.)
- **What's the one sentence that makes someone try it?** (The copy that goes in the README hero.)
- **What's the one thing that makes someone abandon setup?** (The fix that goes into Milestone 2.)
- **What's the provider we're missing that costs us the most signups?** (The Go provider to implement first.)

Everything else — the personas, the interview scripts, the Discord channels — is infrastructure for getting to those four answers cleanly and repeatably as the product evolves.
