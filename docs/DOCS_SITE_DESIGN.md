# CourierX — Documentation Site Design (docs.courierx.dev)

**Date:** 2026-04-19  
**Target:** docs.courierx.dev  
**Audience:** Developers integrating the API + operators self-hosting

---

## 1. Tooling Recommendation: Mintlify

**Recommended stack: Mintlify** (not Docusaurus, not GitBook)

| Tool | Pros | Cons | Verdict |
|------|------|------|---------|
| **Mintlify** | Beautiful out-of-box, OpenAPI integration, API playground built-in, used by Resend/Loops/PostHog | $75/month for custom domain | ✅ Best for developer tools |
| Docusaurus | Free, React-based, flexible | Requires more setup, no built-in API playground | Good fallback if budget is tight |
| ReadMe | Best API playground | Expensive, less OSS-friendly | No |
| GitBook | Fastest setup | Less dev-friendly look, expensive | No |

Mintlify is what Resend (your direct competitor) uses. It signals quality to developers immediately and the API playground means devs can make their first call from the docs — zero setup friction.

**Alternative if Mintlify cost is a concern:** Nextra (Next.js-based, free, beautiful) + a custom API playground component.

---

## 2. Information Architecture

```
docs.courierx.dev/
│
├── Getting Started
│   ├── Introduction          ← "What is CourierX?"
│   ├── Quickstart            ← First email in 5 minutes
│   ├── Self-hosting          ← Docker one-command
│   └── Cloud setup           ← courierx.dev account
│
├── Core Concepts
│   ├── How sending works     ← Client → Rails → Go → Provider flow
│   ├── BYOK (provider keys)  ← Why you bring your own keys
│   ├── Provider failover     ← How routing and fallback works
│   ├── Domains               ← Verification, SPF/DKIM/DMARC
│   ├── Suppressions          ← Bounce/complaint management
│   └── Rate limits           ← Limits and headers
│
├── API Reference             ← Auto-generated from OpenAPI spec
│   ├── Authentication
│   ├── Emails
│   ├── Domains
│   ├── API Keys
│   ├── Provider Connections
│   ├── Routing Rules
│   ├── Suppressions
│   ├── Webhook Endpoints
│   └── Usage & Stats
│
├── SDKs & Libraries
│   ├── Node.js / TypeScript
│   ├── Python
│   ├── Ruby
│   ├── Go
│   └── REST (raw HTTP examples)
│
├── Guides
│   ├── Sending your first email
│   ├── Setting up provider failover
│   ├── Domain verification walkthrough
│   ├── Handling bounces and complaints
│   ├── Building a suppression list
│   ├── Webhook verification
│   ├── Migrating from SendGrid
│   ├── Migrating from Mailgun
│   └── Migrating from Postmark
│
├── Self-Hosting
│   ├── Docker Compose setup
│   ├── Kubernetes (Helm)
│   ├── Fly.io deployment
│   ├── Railway deployment
│   ├── Environment variables
│   ├── Database setup
│   ├── Upgrading
│   └── Security hardening
│
├── Webhooks
│   ├── Event types
│   ├── Payload reference
│   ├── Signature verification
│   └── Retry behavior
│
└── Reference
    ├── Email status lifecycle
    ├── Error codes
    ├── Provider comparison
    ├── Changelog
    └── Contributing
```

---

## 3. Quickstart Page (Most Important Page)

The quickstart page is the highest-traffic, highest-churn page. It must get someone from zero to first email in under 5 minutes.

```markdown
---
title: Quickstart
description: Send your first email in 5 minutes
---

## Prerequisites

- A [CourierX account](https://app.courierx.dev) (free tier, no credit card)  
  **or** a [self-hosted instance](/self-hosting/docker)
- An API key from your [dashboard](https://app.courierx.dev/api-keys)
- A [verified sending domain](/guides/domain-verification)

## 1. Install the SDK

<CodeGroup>
```bash npm
npm install @courierx/node
```
```bash pip
pip install courierx
```
```bash gem
gem install courierx
```
</CodeGroup>

## 2. Send your first email

<CodeGroup>
```typescript Node.js
import { CourierX } from '@courierx/node';

const cx = new CourierX({
  apiKey: process.env.COURIERX_API_KEY,
});

const { id } = await cx.emails.send({
  from: { email: 'you@yourdomain.com', name: 'Your App' },
  to: { email: 'user@example.com', name: 'Test User' },
  subject: 'Hello from CourierX!',
  text: 'This is my first email sent via CourierX.',
  html: '<p>This is my first email sent via CourierX.</p>',
});

console.log(`Email queued: ${id}`);
```
```python Python
import courierx

cx = courierx.Client(api_key=os.environ["COURIERX_API_KEY"])

result = cx.emails.send(
    from_email={"email": "you@yourdomain.com", "name": "Your App"},
    to={"email": "user@example.com", "name": "Test User"},
    subject="Hello from CourierX!",
    text="This is my first email sent via CourierX.",
)

print(f"Email queued: {result.id}")
```
```ruby Ruby
require 'courierx'

cx = CourierX::Client.new(api_key: ENV['COURIERX_API_KEY'])

result = cx.emails.send(
  from: { email: 'you@yourdomain.com', name: 'Your App' },
  to: { email: 'user@example.com', name: 'Test User' },
  subject: 'Hello from CourierX!',
  text: 'This is my first email sent via CourierX.'
)

puts "Email queued: #{result.id}"
```
```bash cURL
curl -X POST https://api.courierx.dev/api/v1/emails \
  -H "Authorization: Bearer $COURIERX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from_email": "you@yourdomain.com",
    "from_name": "Your App",
    "to_email": "user@example.com",
    "subject": "Hello from CourierX!",
    "text_body": "This is my first email sent via CourierX."
  }'
```
</CodeGroup>

## 3. Check delivery status

```typescript
const email = await cx.emails.get(id);
console.log(email.status); // "delivered"
```

## What's next?

<CardGroup cols={2}>
  <Card title="Connect your own provider" icon="plug" href="/guides/connect-provider">
    Use your own SendGrid, Mailgun, or SES account for maximum deliverability
  </Card>
  <Card title="Set up failover" icon="shield" href="/guides/provider-failover">
    Configure a backup provider so email always gets through
  </Card>
  <Card title="Verify your domain" icon="globe" href="/guides/domain-verification">
    Set up SPF, DKIM, and DMARC for optimal deliverability
  </Card>
  <Card title="Handle bounces" icon="arrow-left" href="/guides/handling-bounces">
    Automatically suppress hard bounces and spam complaints
  </Card>
</CardGroup>
```

---

## 4. OpenAPI Spec Integration

Generate an OpenAPI 3.1 spec from Rails routes and integrate it with Mintlify for the API reference. This gives you:
- Interactive API playground in the docs
- Auto-generated code samples in all languages
- Type schemas that match exactly what the API returns

**Recommended gem:** `rswag` or `openapi_generator`

```ruby
# Gemfile
gem 'rswag-api'
gem 'rswag-ui'
gem 'rswag-specs'

# spec/swagger_helper.rb — generates openapi.yaml
RSpec.configure do |config|
  config.openapi_root = Rails.root.join('openapi').to_s
  config.openapi_specs = {
    'v1/openapi.yaml' => {
      openapi: '3.1.0',
      info: {
        title: 'CourierX API',
        version: 'v1',
        description: 'Multi-provider email delivery API'
      },
      servers: [
        { url: 'https://api.courierx.dev', description: 'Production' },
        { url: 'http://localhost:4000', description: 'Local development' }
      ]
    }
  }
end
```

The generated `openapi.yaml` feeds directly into Mintlify's `openapi` field in `mint.json`.

---

## 5. `mint.json` Configuration (Mintlify)

```json
{
  "name": "CourierX",
  "logo": {
    "dark": "/logo/dark.svg",
    "light": "/logo/light.svg"
  },
  "favicon": "/favicon.svg",
  "colors": {
    "primary": "#6366F1",
    "light": "#A5B4FC",
    "dark": "#4338CA"
  },
  "topbarLinks": [
    { "name": "GitHub", "url": "https://github.com/courierx/courierx" },
    { "name": "Dashboard", "url": "https://app.courierx.dev" }
  ],
  "topbarCtaButton": {
    "name": "Get Started Free",
    "url": "https://app.courierx.dev/register"
  },
  "anchors": [
    {
      "name": "API Reference",
      "icon": "code",
      "url": "api-reference"
    },
    {
      "name": "GitHub",
      "icon": "github",
      "url": "https://github.com/courierx/courierx"
    },
    {
      "name": "Discord",
      "icon": "discord",
      "url": "https://discord.gg/courierx"
    }
  ],
  "navigation": [
    {
      "group": "Get Started",
      "pages": ["introduction", "quickstart", "self-hosting/docker", "cloud-setup"]
    },
    {
      "group": "Core Concepts",
      "pages": ["concepts/how-sending-works", "concepts/byok", "concepts/failover",
                "concepts/domains", "concepts/suppressions", "concepts/rate-limits"]
    },
    {
      "group": "API Reference",
      "pages": ["api-reference/authentication", "api-reference/emails", "api-reference/domains",
                "api-reference/api-keys", "api-reference/provider-connections",
                "api-reference/routing-rules", "api-reference/suppressions",
                "api-reference/webhooks", "api-reference/usage"]
    },
    {
      "group": "SDKs",
      "pages": ["sdks/node", "sdks/python", "sdks/ruby", "sdks/go", "sdks/rest"]
    },
    {
      "group": "Guides",
      "pages": ["guides/first-email", "guides/provider-failover", "guides/domain-verification",
                "guides/handling-bounces", "guides/webhook-verification",
                "guides/migrate-from-sendgrid", "guides/migrate-from-mailgun"]
    },
    {
      "group": "Self-Hosting",
      "pages": ["self-hosting/docker", "self-hosting/kubernetes", "self-hosting/fly-io",
                "self-hosting/environment-variables", "self-hosting/upgrading",
                "self-hosting/security"]
    }
  ],
  "openapi": ["openapi/v1/openapi.yaml"],
  "footerSocials": {
    "twitter": "https://twitter.com/courierxdev",
    "github": "https://github.com/courierx/courierx",
    "discord": "https://discord.gg/courierx"
  }
}
```

---

## 6. "How Sending Works" — Core Concept Page

This page is the second most important. Developers need to trust the system before integrating.

```markdown
---
title: How Sending Works
description: Understanding the email delivery pipeline
---

## The pipeline

When you call `POST /api/v1/emails`, here's exactly what happens:

<Steps>
  <Step title="API receives your request">
    The CourierX control plane validates your API key, checks your domain is verified,
    and confirms the recipient isn't suppressed.
  </Step>
  <Step title="Email is queued atomically">
    An `Email` record and an `OutboxEvent` are written to the database in a single
    transaction. This guarantees no email is lost, even if a service restarts.
  </Step>
  <Step title="Background worker dispatches to providers">
    A Sidekiq worker picks up the event and sends the email to your configured provider
    chain via the Go execution engine.
  </Step>
  <Step title="Provider routing and failover">
    The Go engine tries providers in priority order. If your primary provider fails
    (rate limit, timeout, 5xx), it automatically tries the next one — with no action
    required from you.
  </Step>
  <Step title="Delivery events flow back">
    Bounces, complaints, and delivery confirmations arrive via provider webhooks
    and are stored against the email record. If you've registered a webhook endpoint,
    we forward these events to you in real-time.
  </Step>
</Steps>

## Failover in action

```
Your app → CourierX API
                      ↓
              [SendGrid attempt] → Rate limit (429)
                      ↓
              [Mailgun attempt]  → Success ✓
                      ↓
           Email delivered via Mailgun
           Email record shows: provider = "mailgun", fallback = true
```

Your code doesn't need to know which provider delivered the email.
You get the same response regardless.

## What "queued" means

When the API returns `status: "queued"`, it means:
- The email **will** be sent — it's persisted to the database
- Your request is **not lost** if we experience a brief outage
- You'll receive a webhook event when it transitions to `delivered`, `bounced`, or `failed`

The typical time from `queued` to `sent` is under 1 second.
```

---

## 7. Migration Guides (High SEO Value)

"Migrate from Mailchimp Transactional API" and similar pages drive significant organic search traffic. Structure each guide as:

1. Why migrate (1 paragraph)
2. What stays the same (provider concepts that map directly)
3. What's different (CourierX-specific concepts)
4. Side-by-side code comparison
5. Environment variable mapping
6. Testing the migration

Example structure for "Migrate from SendGrid":

```markdown
## Before (SendGrid)
```javascript
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
await sgMail.send({ to, from, subject, text, html });
```

## After (CourierX with your existing SendGrid key)
```javascript
import { CourierX } from '@courierx/node';
const cx = new CourierX({ apiKey: process.env.COURIERX_API_KEY });

// Connect SendGrid once in the dashboard (your key, your account)
// Then send identically — plus automatic failover to any backup
await cx.emails.send({ to, from: { email: from }, subject, text, html });
```

The key difference: you still use your SendGrid account and credentials.
CourierX just adds failover, suppression management, and delivery analytics on top.
```

---

## 8. Deployment & CI/CD for Docs Site

```yaml
# .github/workflows/docs.yml
name: Deploy Docs

on:
  push:
    branches: [main]
    paths: ['docs/**', 'openapi/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Generate OpenAPI spec
        run: |
          cd backend/control-plane
          bundle exec rake rswag:specs:swaggerize

      - name: Deploy to Mintlify
        uses: mintlify/action@v1
        with:
          mintlify-token: ${{ secrets.MINTLIFY_TOKEN }}
```

The OpenAPI spec is auto-generated on every merge to main, keeping API docs always in sync with the implementation.
