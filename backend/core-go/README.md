# CourierX Core Engine

> High-performance email execution plane — Go 1.22 · Fiber · Multi-provider with automatic failover

The Core Engine is the email-sending layer of CourierX. It is a stateless HTTP service that the Control Plane calls to dispatch emails. It owns no persistent state — provider credentials are passed per-request, results are returned synchronously, and all tracking lives in the Control Plane.

**Base URL (default):** `http://localhost:8080`

---

## Table of Contents

1. [Architecture overview](#architecture-overview)
2. [Running the service](#running-the-service)
3. [Configuration reference](#configuration-reference)
4. [Endpoints](#endpoints)
   - [GET /health](#get-health)
   - [POST /v1/send](#post-v1send)
   - [POST /v1/send/batch](#post-v1sendbatch)
5. [Provider system](#provider-system)
6. [Template rendering](#template-rendering)
7. [Error handling](#error-handling)
8. [Failover logic](#failover-logic)
9. [Performance tuning](#performance-tuning)
10. [Integration patterns](#integration-patterns)
11. [Genius extras](#genius-extras)

---

## Architecture overview

```
Control Plane (Rails)
        │
        │  POST /v1/send  (routes + decrypted credentials resolved at CP)
        ▼
  ┌─────────────────────────────────────────────────────────┐
  │                    Core Engine (Go/Fiber)                │
  │                                                         │
  │  ┌──────────────┐    ┌──────────────┐    ┌──────────┐  │
  │  │ Route picker │───▶│   Renderer   │───▶│ Dispatch │  │
  │  │  (priority)  │    │ (Handlebars) │    │  queue   │  │
  │  └──────────────┘    └──────────────┘    └──────────┘  │
  │                                               │         │
  │              Failover loop ◀──────────────────┘         │
  └─────────────────────────────────────────────────────────┘
            │            │             │
            ▼            ▼             ▼
        SendGrid      Mailgun       AWS SES / SMTP / …
```

**Design principle:** The Core Engine is intentionally simple. It receives a fully-resolved send request (provider config included), renders the template, and fires it. Business logic (routing rules, suppression checks, quota enforcement, billing) all live in the Control Plane.

This separation means the Core Engine can be:
- Scaled independently of the Rails API
- Replaced or rewritten without touching business logic
- Tested in isolation with the `mock` provider
- Deployed at the edge for lower latency

---

## Running the service

### Docker (recommended)

```bash
cd infra && docker compose up -d core-go

# Verify it's running
curl http://localhost:8080/health
```

### Native

```bash
cd apps/core-go

# Copy and fill env
cp .env.example .env

# Run in development
go run .

# Or build a production binary
go build -o courierx-core .
./courierx-core
```

### Benchmarking mode

Set `DATABASE_URL=` (empty) to run without a database connection. The engine will use the `mock` provider and return synthetic results. Useful for load testing the HTTP layer in isolation:

```bash
DATABASE_URL= go run .
```

---

## Configuration reference

All config is read from environment variables (`.env` file or shell).

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | HTTP listen port |
| `ENVIRONMENT` | `development` | `development` or `production` |
| `DATABASE_URL` | — | PostgreSQL DSN. Omit to run in mock/benchmark mode. |
| `REDIS_URL` | — | Redis connection string |
| `SENDGRID_API_KEY` | — | SendGrid API key (server-side default; can be overridden per-request) |
| `MAILGUN_API_KEY` | — | Mailgun API key |
| `MAILGUN_DOMAIN` | — | Mailgun sending domain |
| `AWS_ACCESS_KEY_ID` | — | AWS credentials for SES |
| `AWS_SECRET_ACCESS_KEY` | — | AWS credentials for SES |
| `AWS_REGION` | `us-east-1` | AWS region |
| `SMTP_HOST` | — | SMTP server hostname |
| `SMTP_PORT` | `587` | SMTP port (587 = STARTTLS, 465 = implicit TLS) |
| `SMTP_USER` | — | SMTP username |
| `SMTP_PASS` | — | SMTP password |
| `CONTROL_PLANE_URL` | `http://localhost:4000` | Rails Control Plane base URL |
| `CONTROL_PLANE_SECRET` | — | Shared secret for internal auth between services |
| `WEBHOOK_SECRET` | — | Secret for signing outgoing webhook payloads |
| `MAX_WORKERS` | `100` | Goroutine pool size for batch processing |
| `QUEUE_BUFFER_SIZE` | `1000` | In-memory channel depth before backpressure |
| `RATE_LIMIT_PROVIDER` | `1000` | Max requests/sec per provider (token bucket) |
| `ENABLE_METRICS` | `true` | Expose Prometheus metrics |
| `ENABLE_TRACING` | `false` | OpenTelemetry distributed tracing |
| `ENABLE_IP_WARMING` | `false` | Gradual IP warm-up scheduling for new IPs |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error` |
| `LOG_FORMAT` | `json` | `json` (structured) or `text` (human-readable) |

**Development tip:** Leave provider credentials empty and set `ENVIRONMENT=development` — the engine automatically uses the `mock` provider and logs pretend sends. No real emails are delivered.

---

## Endpoints

### GET /health

Health probe for load balancers, Kubernetes liveness/readiness checks, and uptime monitors.

**Authentication:** None

**Response `200 OK`**

```json
{
  "status":   "healthy",
  "service":  "CourierX Core",
  "database": "connected"
}
```

**Status values:**

| `status` | Meaning |
|---|---|
| `healthy` | All systems nominal |
| `unhealthy` | At least one dependency is down |

**Database values:**

| `database` | Meaning |
|---|---|
| `connected` | PostgreSQL is reachable |
| `disconnected` | PostgreSQL unreachable |
| `not configured` | `DATABASE_URL` unset — running in benchmark/mock mode |

**Kubernetes probe config:**

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 3
  periodSeconds: 5
  failureThreshold: 3
```

---

### POST /v1/send

Send a single email. Supports Handlebars template rendering, CC/BCC, attachments, and multi-provider failover.

**Authentication:** `Authorization: Bearer {CONTROL_PLANE_SECRET}`

**Content-Type:** `application/json`

#### Request body

```json
{
  "from":    "noreply@acme.com",
  "to":      "user@example.com",
  "subject": "Welcome to Acme, {{name}}!",

  "html":    "<h1>Hi {{name}},</h1><p>Your <strong>{{plan}}</strong> plan is active.</p>",
  "text":    "Hi {{name}}, your {{plan}} plan is active.",

  "replyTo": "support@acme.com",
  "cc":      ["manager@acme.com"],
  "bcc":     ["archive@acme.com"],

  "variables": {
    "name":      "Jane Doe",
    "plan":      "Pro",
    "login_url": "https://acme.com/login"
  },

  "attachments": [
    {
      "filename":    "invoice.pdf",
      "content":     "JVBERi0xLjQK...",
      "contentType": "application/pdf"
    }
  ],

  "routes": [
    {
      "priority": 1,
      "role":     "primary",
      "provider": {
        "type":   "sendgrid",
        "config": { "api_key": "SG.xxxxxxxx" }
      }
    },
    {
      "priority": 2,
      "role":     "fallback",
      "provider": {
        "type":   "mailgun",
        "config": { "api_key": "key-xxxxxxxx", "domain": "mg.acme.com" }
      }
    }
  ]
}
```

#### Field reference

| Field | Type | Required | Description |
|---|---|---|---|
| `from` | string | ✅ | Sender email address. |
| `to` | string | ✅ | Recipient email address. |
| `subject` | string | ✅ | Subject line. Handlebars-rendered. |
| `html` | string | ✴️ | HTML body. Either `html` or `text` required. Handlebars-rendered. |
| `text` | string | ✴️ | Plain-text fallback body. |
| `replyTo` | string | — | Reply-To header address. |
| `cc` | string[] | — | CC recipients. |
| `bcc` | string[] | — | BCC recipients (not visible to `to`/`cc`). |
| `variables` | object | — | Template variable map injected into Handlebars. |
| `attachments` | Attachment[] | — | File attachments. |
| `routes` | Route[] | — | Ordered provider list. Omit to use server defaults. |

**Attachment:**

| Field | Type | Required | Description |
|---|---|---|---|
| `filename` | string | ✅ | File name shown to recipient (e.g. `invoice.pdf`). |
| `content` | string | ✅ | Base64-encoded file bytes. |
| `contentType` | string | ✅ | MIME type (e.g. `application/pdf`, `image/png`). |

**Route:**

| Field | Type | Description |
|---|---|---|
| `priority` | int | 1 = highest priority (tried first). Higher number = lower priority. |
| `role` | string | `primary` or `fallback` — informational label only. |
| `provider.type` | string | `sendgrid`, `mailgun`, `aws_ses`, `smtp`, `postmark`, `resend`, `mock` |
| `provider.config` | object | Provider-specific credentials. See [Provider system](#provider-system). |

#### Response `200 OK` — success

```json
{
  "success":   true,
  "messageId": "c4a7b3e9-1f2d-4a8b-9c3e-7f5a2b8d6e1c",
  "provider":  "sendgrid"
}
```

#### Response `200 OK` — all providers exhausted

```json
{
  "success":   false,
  "messageId": "c4a7b3e9-1f2d-4a8b-9c3e-7f5a2b8d6e1c",
  "provider":  "",
  "error":     "all providers exhausted: sendgrid: 401 invalid api key; mailgun: 429 rate limited"
}
```

Note: a `200` status with `success: false` means the request was valid but delivery failed. The Control Plane uses this to update the email status to `failed`.

#### Response `400 Bad Request`

```json
{ "error": "from is required" }
```

#### cURL example

```bash
curl -X POST http://localhost:8080/v1/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CONTROL_PLANE_SECRET" \
  -d '{
    "from":      "hi@acme.com",
    "to":        "jane@example.com",
    "subject":   "Welcome, {{name}}!",
    "html":      "<p>Hi <strong>{{name}}</strong>, your plan is {{plan}}.</p>",
    "variables": {"name": "Jane", "plan": "Pro"},
    "routes": [{
      "priority": 1,
      "role":     "primary",
      "provider": {"type": "mock", "config": {}}
    }]
  }'
```

---

### POST /v1/send/batch

Send the same template to up to **1,000 recipients** in a single call. Each recipient gets their own variable rendering. Processed concurrently via the worker pool.

**Authentication:** `Authorization: Bearer {CONTROL_PLANE_SECRET}`

**Content-Type:** `application/json`

#### Request body

```json
{
  "from":    "newsletter@acme.com",
  "subject": "{{month}} product update — what's new for {{plan}} users",

  "html":    "<p>Hi {{name}},</p><p>This month: {{highlight}}</p>",
  "text":    "Hi {{name}}, this month: {{highlight}}",

  "recipients": [
    {
      "email":     "alice@example.com",
      "variables": { "name": "Alice", "month": "February", "plan": "Pro",     "highlight": "Dark mode" }
    },
    {
      "email":     "bob@example.com",
      "variables": { "name": "Bob",   "month": "February", "plan": "Starter", "highlight": "New API" }
    }
  ],

  "routes": [
    {
      "priority": 1,
      "role":     "primary",
      "provider": { "type": "sendgrid", "config": { "api_key": "SG.xxxx" } }
    }
  ]
}
```

#### Field reference

| Field | Type | Required | Description |
|---|---|---|---|
| `from` | string | ✅ | Sender address (same for all recipients). |
| `subject` | string | ✅ | Subject template. Rendered per-recipient with their variables. |
| `html` | string | ✴️ | HTML body template. |
| `text` | string | ✴️ | Plain-text template. At least one of `html`/`text` required. |
| `recipients` | Recipient[] | ✅ | Max 1,000. |
| `recipients[].email` | string | ✅ | Recipient email address. |
| `recipients[].variables` | object | — | Per-recipient variables. Merged with any top-level defaults (if supported). |
| `routes` | Route[] | — | Provider chain shared across all recipients. |

#### Response `200 OK`

```json
{
  "success":      true,
  "total":        2,
  "successCount": 2,
  "failureCount": 0,
  "results": [
    {
      "success":   true,
      "messageId": "c4a7b3e9-...",
      "provider":  "sendgrid",
      "error":     ""
    },
    {
      "success":   true,
      "messageId": "d5b8c4f0-...",
      "provider":  "sendgrid",
      "error":     ""
    }
  ]
}
```

`results` is in the **same order** as the input `recipients` array. Index 0 in results corresponds to index 0 in recipients.

`success` at the top level is `true` if at least one recipient succeeded. Check `failureCount` and inspect individual `results[i].error` for partial failures.

#### Limits

| Constraint | Value |
|---|---|
| Max recipients per call | 1,000 |
| Max attachment size | 10 MB per file |
| Max total payload | 25 MB |
| Max rendered template | 1 MB per recipient |
| Max concurrent workers | `MAX_WORKERS` (default: 100) |

---

## Provider system

Pass provider credentials in the `routes` array per-request. The Core Engine does not store them.

### SendGrid

```json
{
  "type":   "sendgrid",
  "config": { "api_key": "SG.xxxxxxxxxxxxxxxxxxxxxx" }
}
```

### Mailgun

```json
{
  "type":   "mailgun",
  "config": {
    "api_key": "key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "domain":  "mg.acme.com",
    "region":  "eu"
  }
}
```

`region` is optional — defaults to `us`. Use `"eu"` for EU data residency (API calls go to `api.eu.mailgun.net`).

### AWS SES

```json
{
  "type":   "aws_ses",
  "config": {
    "access_key_id":     "AKIAIOSFODNN7EXAMPLE",
    "secret_access_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    "region":            "eu-west-1"
  }
}
```

### SMTP (generic)

```json
{
  "type":   "smtp",
  "config": {
    "host":     "smtp.gmail.com",
    "port":     587,
    "username": "sender@gmail.com",
    "password": "app-password",
    "tls":      true
  }
}
```

`tls: true` enables STARTTLS on port 587. For implicit TLS (port 465), the engine upgrades automatically.

### Postmark

```json
{
  "type":   "postmark",
  "config": { "server_token": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" }
}
```

### Resend

```json
{
  "type":   "resend",
  "config": { "api_key": "re_xxxxxxxxxxxxxxxxxxxxxxxx" }
}
```

### Mock (development / testing / CI)

```json
{
  "type":   "mock",
  "config": {}
}
```

Always succeeds. No real email is sent. Generates a random `messageId`. Use in:
- Local development when you don't have real provider credentials
- CI pipelines to test send logic without side effects
- Demo-mode projects in the Control Plane

---

## Template rendering

The engine uses [raymond](https://github.com/aymerick/raymond) — a full Go implementation of the Handlebars spec.

### Basic interpolation

```handlebars
<p>Hi {{name}}, your order #{{order_id}} is confirmed.</p>
```

### HTML escaping

`{{variable}}` HTML-escapes the value automatically. Use `{{{variable}}}` for raw HTML injection (use cautiously — only for trusted HTML fragments):

```handlebars
<p>{{user_name}}</p>        <!-- safe: escapes <, >, &, " -->
<p>{{{html_signature}}}</p> <!-- raw: injects HTML as-is -->
```

### Conditionals

```handlebars
{{#if is_trial}}
  <p>Trial ends in <strong>{{days_left}} days</strong>.</p>
{{else}}
  <p>You're on the {{plan}} plan — no expiry.</p>
{{/if}}
```

### Loops

```handlebars
<ul>
  {{#each items}}
    <li>{{name}} — ${{price}}</li>
  {{/each}}
</ul>
```

### Nested objects

Pass deep objects in `variables` — use dot notation to access them:

```json
{ "variables": { "user": { "name": "Jane", "city": "London" } } }
```

```handlebars
<p>{{user.name}} from {{user.city}}</p>
```

### Subject line templates

The `subject` field is also Handlebars-rendered, enabling dynamic subject lines:

```json
{
  "subject":   "{{name}}, your order #{{order_id}} has shipped!",
  "variables": { "name": "Jane", "order_id": "10042" }
}
```

### Template compilation caching

Handlebars templates are compiled once and cached by their SHA-256 hash. Sending 10,000 emails with the same `html` template but different `variables` compiles the template **exactly once**. For maximum cache efficiency in batch sends, use identical `html`/`text` strings across all recipients.

---

## Error handling

### HTTP status codes

| Code | Meaning |
|---|---|
| `200` | Request processed. Always check the `success` field — `200` does not guarantee delivery. |
| `400` | Invalid request — missing required field or malformed JSON. |
| `401` | Missing or invalid `Authorization` header. |
| `422` | Request syntactically valid but semantically unprocessable. |
| `429` | Rate limit hit — back off and retry. |
| `500` | Internal error — retry with exponential backoff. |
| `503` | Engine overloaded or starting — retry. |

### Error classification

Provider errors are classified to drive failover behavior:

| Class | Examples | Action |
|---|---|---|
| **Permanent** | Invalid API key, domain not verified, invalid recipient address | Stop. Do not try other providers — the root cause won't change. |
| **Transient** | Network timeout, 5xx from provider, connection refused | Try next provider in route chain. |
| **Rate limit** | HTTP 429 from provider | Back off, then try next provider. |

**Permanent errors short-circuit the failover chain** and return immediately with `success: false`. This prevents wasting quota on other providers with an address that will never accept mail.

### Error string format

The `error` field is prefixed with the class:

```
"permanent: invalid recipient: 550 5.1.1 user unknown"
"transient: network timeout after 10s"
"rate_limit: 429 too many requests"
"all providers exhausted: sendgrid: transient: 503; mailgun: transient: network timeout"
```

Parse the prefix to distinguish error types in your monitoring.

---

## Failover logic

When a send fails with a **transient** or **rate_limit** error, the engine walks the `routes` array by `priority` (ascending):

```
routes priority order:
  1: SendGrid   → attempt 1
  2: Mailgun    → attempt 2 (if SendGrid fails transiently)
  3: AWS SES    → attempt 3 (if Mailgun fails)

Run:
  SendGrid → 503 Service Unavailable (transient) → failover
  Mailgun  → 429 Too Many Requests  (rate limit) → failover
  AWS SES  → 200 OK                              → return provider: "aws_ses", success: true
```

**Permanent errors do not trigger failover:**

```
  SendGrid → 550 user unknown (permanent) → return success: false immediately
             (no point trying Mailgun with the same invalid address)
```

**The response always reports which provider ultimately delivered:**

```json
{ "success": true, "provider": "aws_ses" }
```

The Control Plane uses this to increment provider health counters and update the email record's `provider_message_id`.

---

## Performance tuning

### Worker pool sizing

`MAX_WORKERS` controls the goroutine pool for `/v1/send/batch`. Rough throughput estimate on a single instance:

```
MAX_WORKERS × (1000ms / avg_provider_latency_ms) = sends/sec

Example:
  100 workers × (1000ms / 150ms) ≈ 667 sends/sec
  100 workers × (1000ms / 50ms)  ≈ 2,000 sends/sec
```

Increase `MAX_WORKERS` when provider latency is low and you need higher throughput. Watch provider-side rate limits before scaling too aggressively.

### Queue buffer

`QUEUE_BUFFER_SIZE` is the depth of the in-memory channel. Set it to `MAX_WORKERS × 10` for smooth burst absorption. Default of `1000` is conservative.

### HTTP connection pooling

The engine maintains persistent HTTP/2 (or keep-alive HTTP/1.1) connections to each provider. The default pool is sized for 100 concurrent connections per host. No configuration needed — this is Go's default `http.Transport` behavior.

### Rate limiter

`RATE_LIMIT_PROVIDER` is a token bucket refilling at N tokens/sec per provider. Set it slightly below your provider's published rate limit to leave headroom for automatic retries:

| Provider | Published limit | Recommended `RATE_LIMIT_PROVIDER` |
|---|---|---|
| SendGrid | 600 req/min (10/sec) | `8` |
| Mailgun | Varies by plan | `80%` of your plan limit |
| AWS SES | 14 emails/sec (default) | `12` |

---

## Integration patterns

### How the Control Plane orchestrates the Core Engine

```
Incoming API request (POST /api/v1/emails)
  │
  ▼
Rails: authenticate tenant, check quota, check suppressions
  │
  ▼
Rails: resolve routing rule → ordered provider list
  │
  ▼
Rails: decrypt provider credentials (attr_encrypted)
  │
  ▼
Rails: build SendRequest with routes, POST → Core Engine
  │
  ▼
Core Engine: render template, dispatch, return result
  │
  ▼
Rails: update email status, increment usage stats, fire webhooks
```

The Core Engine is called synchronously by a Sidekiq background job (`EmailDispatchJob`). The initial `POST /emails` returns `202 Accepted` immediately.

### Calling the Core Engine directly (dev/testing)

In production, always go through the Control Plane. In development or for unit testing the engine directly:

```bash
curl -X POST http://localhost:8080/v1/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-secret" \
  -d '{
    "from":    "test@example.com",
    "to":      "recipient@example.com",
    "subject": "Direct engine test",
    "html":    "<p>Bypassing Control Plane.</p>",
    "routes":  [{"priority":1,"role":"primary","provider":{"type":"mock","config":{}}}]
  }'
```

### Nginx load balancing across multiple core instances

```nginx
upstream core_engine {
  least_conn;
  server core-1:8080;
  server core-2:8080;
  server core-3:8080;

  keepalive 32;
}

server {
  location /v1/ {
    proxy_pass         http://core_engine;
    proxy_http_version 1.1;
    proxy_set_header   Connection "";
    proxy_read_timeout 30s;
  }

  location /health {
    proxy_pass http://core_engine;
    access_log off;
  }
}
```

---

## Genius extras

### Idempotency via pre-assigned message IDs

Have the Control Plane generate a UUID for the email before calling the Core Engine. Pass it in the request — providers that support idempotency headers (SendGrid's `X-Message-ID`, Postmark's `MessageID`) will deduplicate on their end, preventing double-delivery on network retries.

### Template variable inheritance (batch)

For batch sends where most variables are shared but a few differ per recipient, the Control Plane can merge a "global" variable map with per-recipient overrides before calling the engine. This avoids repeating `plan: "Pro"` in every recipient object for a 10,000-email campaign.

### Staged provider migration

Moving from Mailgun to SES? Use weighted routing to gradually shift traffic:

```
Week 1: SES weight=1, Mailgun weight=9  → 10% SES
Week 2: SES weight=3, Mailgun weight=7  → 30% SES
Week 3: SES weight=7, Mailgun weight=3  → 70% SES
Week 4: SES weight=1, Mailgun weight=0  → 100% SES
```

Set these weights in the Control Plane's `RoutingRule` — no Core Engine config change needed.

### Transactional vs. marketing provider split

Keep transactional and marketing email on separate providers and separate IPs to protect sender reputation:

```json
// Transactional: receipts, password resets, MFA codes → SES (strict, low volume, high trust)
{ "routes": [{"priority":1,"provider":{"type":"aws_ses",...}}] }

// Marketing: newsletters, campaigns → SendGrid (bulk-optimised, separate IP pool)
{ "routes": [{"priority":1,"provider":{"type":"sendgrid",...}}] }
```

A marketing bounce or spam complaint on the transactional IP is catastrophic. The split costs nothing but separate provider accounts.

### Attachment size vs. link strategy

| Attachment size | Strategy |
|---|---|
| < 500 KB | Inline base64 — simple, no pre-upload needed |
| 500 KB – 5 MB | Base64 still works, but test against Gmail's 25 MB limit |
| > 5 MB | Upload to S3/GCS, include a signed download link in the HTML body |
| Images | Use `<img src="https://cdn.acme.com/logo.png">` — don't embed; most clients block external images anyway but attachment size limits are strict |

### Forced failover for testing

Use `force_error` in the mock provider config to simulate provider failure in CI:

```json
"routes": [
  {"priority": 1, "provider": {"type": "mock", "config": {"force_error": "transient"}}},
  {"priority": 2, "provider": {"type": "mock", "config": {}}}
]
```

The engine will fail on priority 1 and succeed on priority 2. Verify `response.provider` is the fallback and `success` is `true`.

### IP warming schedule

Enable `ENABLE_IP_WARMING=true` when onboarding a new dedicated IP. The engine enforces the standard ISP ramp-up curve:

| Day | Max daily sends |
|---|---|
| 1–2 | 200 |
| 3–4 | 500 |
| 5–7 | 1,000 |
| Week 2 | 5,000 |
| Week 3 | 20,000 |
| Week 4+ | Unrestricted |

This prevents new IPs from being flagged as spam sources before ISPs establish a reputation for them.

### Monitoring — key metrics to alert on

| Metric | Alert threshold | What it signals |
|---|---|---|
| `core_send_success_rate` | < 98% | Provider or infrastructure problem |
| `core_failover_count_per_min` | Spike (> 5/min) | Primary provider degraded |
| `core_provider_latency_p99` | > 2,000ms | Provider API slowing down |
| `core_queue_depth` | > 800 | Workers saturated; scale horizontally |
| `core_permanent_error_rate` | > 1% | Bad address list — clean it |
| `core_batch_failure_rate` | > 5% | Template or recipient data issue |
