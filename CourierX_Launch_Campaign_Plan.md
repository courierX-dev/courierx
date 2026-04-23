# CourierX — 4-Week Product Launch Campaign Plan

**Campaign Name:** "One API. Every Provider. Zero Lock-in."
**Audience:** Indie developers building SaaS products
**Campaign Window:** 4 weeks from launch date
**Primary Goal:** Drive initial adoption — GitHub stars, self-hosted installs, and waitlist signups

---

## 1. Objective

**SMART Goal:**
Drive **500 GitHub stars** and **300 signups/self-hosted installs** from indie developers within 4 weeks of CourierX's public launch, establishing it as the go-to open-source email routing layer for solo and small-team builders.

**Why this goal:**
GitHub stars are the primary social proof signal indie developers use to evaluate open-source tools. Early installs create word-of-mouth momentum and seed community growth before a broader marketing push.

**Secondary goals:**
- 1,000 waitlist subscribers (for upcoming managed cloud tier)
- 3 technical blog posts indexed by Google for email reliability keywords
- Active presence in 3+ developer communities (Hacker News, r/selfhosted, Dev.to)

---

## 2. Audience

### Primary Audience Profile
> Solo developers and small engineering teams (1–5 people) building SaaS products who send transactional email and have been burned by provider outages, rate limits, or unexpected pricing changes. They discover tools through Hacker News, GitHub, and technical blog posts. They care most about reliability, simplicity, and not being locked in.

### Audience Characteristics
| Dimension | Detail |
|---|---|
| Role | Indie hackers, solo founders, small-team backend engineers |
| Company size | 1–10 people, bootstrapped or early-stage |
| Pain points | Provider outages, rate limit surprises, vendor lock-in, complex multi-provider setups |
| Goals | Reliable transactional email without babysitting providers |
| Discovery channels | Hacker News Show HN, GitHub trending, Reddit (r/selfhosted, r/webdev), Dev.to, newsletters like TLDR Dev |
| Trust signals | Open source code, GitHub stars, honest benchmarks, self-hostable |
| Objections | "Another layer of complexity", "Will this be maintained?", "What happens when this goes down?" |

### Messaging Against Objections
| Objection | Response |
|---|---|
| "Another layer of complexity" | One 10-line integration replaces managing N provider SDKs. Complexity goes down. |
| "Will this be maintained?" | Open source — you own it. Fork it, self-host it, never be at our mercy. |
| "What if CourierX goes down?" | Go engine is stateless and horizontally scalable; no SPOF. Show the architecture diagram. |

---

## 3. Core Messaging

### Headline
**"One API. Every Provider. Zero Lock-in."**

### Elevator Pitch (for communities, READMEs, bios)
> CourierX is an open-source email routing layer that sits between your app and your email providers. One API call. Automatic failover across SendGrid, Mailgun, SES, Postmark, and more. Bring your own provider keys. Self-host in minutes.

### Message Hierarchy
1. **Why should I care?** — Email provider outages cost you customers. A single provider is a single point of failure your users will notice at 2am.
2. **What is the solution?** — CourierX routes across all your email providers with automatic failover. If SendGrid rate-limits you, Mailgun picks up instantly.
3. **Why CourierX?** — BYOK (bring your own keys): your sending reputation, your provider relationships, your deliverability. Open source and self-hostable — no new vendor dependency.
4. **What should I do?** — Star on GitHub → Self-host in 5 minutes → Join the waitlist for managed cloud.

### Tone
Direct, builder-to-builder. No enterprise jargon. Show the code. Acknowledge real problems (outages, rate limits, 3am pages). Honest about what it does and doesn't do yet.

---

## 4. Channel Strategy

### Channel Mix
| Channel | Role in Campaign | Effort | Target KPI |
|---|---|---|---|
| Dev communities (HN, Reddit, Dev.to) | Primary launch amplification | High | 500+ upvotes/reactions on launch post |
| GitHub | Central hub — social proof | Low (setup) | 500 stars in 4 weeks |
| Content / Blog | SEO and in-depth education | Medium | 3 posts published, 500+ reads |
| Social (X / Twitter) | Amplification and dev reach | Medium | 50+ shares on launch thread |
| Email / Newsletter | Waitlist nurture and announcements | Low | 40%+ open rate on launch email |

### Channel Playbook

**Hacker News (Show HN)**
- Submit "Show HN: CourierX – open-source email routing with automatic failover" on a Tuesday or Wednesday between 7–9am ET (peak HN developer traffic)
- Founder posts and actively engages every comment for the first 4 hours
- Prepare a technical FAQ comment to post immediately after the main submission covering architecture, Go + Rails decision, and roadmap

**Reddit**
- r/selfhosted: focus on self-hosting story, Docker Compose one-liner
- r/webdev: focus on the reliability angle, the outage scenario
- r/SaaS: focus on not having email as a single point of failure
- Post from genuine account, not a throwaway — share the real builder story

**Dev.to**
- Publish "How I built automatic email failover in Go" as a technical deep-dive
- Cross-post blog content with canonical link back to courierx.dev (or GitHub README)

**X / Twitter**
- Launch thread: "We just open-sourced CourierX — here's why we built it..." (tell the outage story)
- Follow-up threads each week showing architecture, BYOK explainer, and benchmarks
- Engage developer communities: reply to threads about email deliverability, SendGrid outages, etc.

**LinkedIn**
- 1 post at launch — frame as a founder story for the builder community
- More effective for reaching technical leads at slightly larger companies (secondary audience)

**Email**
- Pre-launch: teaser email to any existing waitlist ("something big is coming")
- Launch day: announcement with direct CTA to GitHub + self-hosted setup guide
- Week 3: "Here's what the community built" — social proof roundup
- Week 4: waitlist nurture — preview of the managed cloud tier

---

## 5. Four-Week Content Calendar

### Week 1 — Pre-Launch (Build Anticipation)

| Day | Content | Channel | CTA |
|---|---|---|---|
| Day 1 | "We're building something for developers who've been burned by email provider outages" teaser post | X / Twitter | Follow for launch |
| Day 2 | Polish GitHub README — architecture diagram, setup GIF, badges | GitHub | Star / Watch |
| Day 3 | Blog post: "Why every SaaS needs a multi-provider email strategy" (SEO anchor) | Blog | Waitlist signup |
| Day 4 | LinkedIn founder post — "The 2am SendGrid outage that made us build CourierX" | LinkedIn | Waitlist |
| Day 5 | Share blog post on r/webdev and Dev.to | Reddit / Dev.to | Blog → waitlist |
| Day 7 | Teaser email to waitlist: "We're launching next week" | Email | Stay tuned |

### Week 2 — Launch Week

| Day | Content | Channel | CTA |
|---|---|---|---|
| Day 8 (Tue) | **Show HN submission** — "Show HN: CourierX – open-source email routing with automatic failover" | Hacker News | GitHub |
| Day 8 | Launch thread: architecture, why Go + Rails, what it does | X / Twitter | GitHub star |
| Day 8 | **Launch email** to waitlist | Email | GitHub → self-host |
| Day 9 | Post on r/selfhosted — focus on Docker Compose self-hosting story | Reddit | GitHub |
| Day 10 | Blog post: "How CourierX routes email across providers in under 10ms" (technical deep-dive) | Blog / Dev.to | GitHub |
| Day 11 | Post HN submission recap thread — share learnings, community questions | X | GitHub |
| Day 12 | Post on r/SaaS — "Stop depending on a single email provider" angle | Reddit | Waitlist |
| Day 14 | Weekly wrap-up — star count milestone tweet if milestone hit | X | GitHub |

### Week 3 — Education & Depth

| Day | Content | Channel | CTA |
|---|---|---|---|
| Day 15 | Blog post: "BYOK explained — how CourierX uses your own provider keys" | Blog | Self-host guide |
| Day 16 | X thread: Architecture breakdown with diagrams (Go engine + Rails control plane) | X | Blog |
| Day 17 | Dev.to: "Building automatic email failover with Go and Fiber" (technical tutorial) | Dev.to | GitHub |
| Day 18 | Post on r/golang — share the Go Fiber architecture decisions | Reddit | GitHub |
| Day 19 | Email: "Here's what people are saying / asking" — community Q&A compilation | Email | Discord / GitHub |
| Day 21 | LinkedIn: Share the Dev.to technical post with engineering audience angle | LinkedIn | Blog |

### Week 4 — Momentum & Social Proof

| Day | Content | Channel | CTA |
|---|---|---|---|
| Day 22 | Milestone tweet — celebrate GitHub stars, thank community | X | Share |
| Day 23 | Feature a community self-hosted setup story (ask on GitHub Discussions or Discord) | X / Reddit | GitHub |
| Day 24 | Blog post: "4 weeks of open-source — what we learned from the community" | Blog | Waitlist (cloud) |
| Day 25 | Post on HN: "We shipped X features based on community feedback in 4 weeks" (smaller post) | HN | GitHub |
| Day 26 | Email: Managed cloud tier preview — early access waitlist CTA | Email | Cloud waitlist |
| Day 28 | Campaign wrap thread: results, what's next, roadmap teaser | X / LinkedIn | Follow / star |

---

## 6. Launch Day Checklist

Before going live, confirm:

- [ ] GitHub README complete: logo, one-liner, architecture diagram, quick-start (Docker Compose), badge showing license and latest release
- [ ] Self-hosted setup works end-to-end in under 10 minutes (test on a clean machine)
- [ ] `docker compose up` in the `infra/` directory is the primary onboarding path
- [ ] Waitlist landing page live with email capture
- [ ] Show HN submission draft reviewed — title is factual (not marketing-speak), body text is founder voice
- [ ] First batch of community accounts created (Reddit age ≥ 90 days or karma > 100 for credible posting)
- [ ] Monitoring set up: GitHub star tracking, HN rank, Reddit post analytics

---

## 7. Success Metrics

### Primary KPIs
| Metric | Target | Measurement |
|---|---|---|
| GitHub stars | 500 in 4 weeks | GitHub repository insights |
| Self-hosted installs / signups | 300 | Waitlist form + GitHub clone stats |
| Hacker News points | 100+ on Show HN | HN post |
| Blog organic traffic | 500 unique readers | Analytics |

### Secondary KPIs
| Metric | Target |
|---|---|
| Email waitlist size | 1,000 subscribers |
| Email open rate (launch day) | 40%+ |
| X / Twitter thread impressions | 50,000+ |
| Reddit post upvotes (combined) | 500+ |
| Community engagement (comments, GitHub issues opened) | 50+ meaningful interactions |

### Weekly Check-in Cadence
- **End of Week 1**: Waitlist size, blog traffic baseline, README quality check
- **End of Week 2**: GitHub stars, HN performance, Reddit reach, email open rates
- **End of Week 3**: Blog SEO indexing status, Dev.to reads, r/golang reach
- **End of Week 4**: Full KPI review, community growth, cloud waitlist conversions

---

## 8. Budget Allocation (Lean Launch)

This plan assumes a primarily organic approach appropriate for an open-source indie launch.

| Category | Allocation | Notes |
|---|---|---|
| Content production | $0 (founder-written) | Technical blog posts, launch thread |
| Design assets | $50–100 | Architecture diagram, social card graphics |
| Paid social (optional boost) | $100–200 | Boost 1–2 X posts if organic traction warrants |
| Domain / landing page hosting | $20–50/mo | Waitlist capture page |
| Tools (email, analytics) | $0–50/mo | Mailchimp free tier or self-hosted CourierX |
| **Total** | **~$200–400** | Adjustable based on HN/Reddit organic performance |

**Reallocation rule:** If Show HN hits 100+ points, redirect any paid budget to engineering community sponsorships (TLDR Dev newsletter, Changelog, etc.) rather than social ads.

---

## 9. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Show HN doesn't get traction | Medium | Post at optimal time (Tue/Wed 7–9am ET), have Reddit posts as backup same day |
| Self-host setup is too complex for target audience | Medium | Test and simplify `docker compose up` flow; record a 3-min setup video |
| Competitor launches same week | Low | Differentiate on BYOK + open source; don't position against specific players |
| GitHub README underwhelms visitors | Low | A/B test first paragraph; get 3 developer friends to review before launch |
| Spam filters catch launch email | Low | Use plain-text email, warm the sending domain first |

---

*Campaign plan generated: April 19, 2026*
*Framework: Objective → Audience → Message → Channel → Measure*
