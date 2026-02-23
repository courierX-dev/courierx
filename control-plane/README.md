# CourierX Control Plane

> Multi-tenant email management API — Rails 8.1 · API-only · PostgreSQL · Sidekiq

The Control Plane is the brain of CourierX. It handles authentication, multi-tenancy, routing rules, provider credential management, suppression lists, webhook delivery, usage tracking, and orchestrates the Go Core Engine for email dispatch.

**Base URL (default):** `http://localhost:4000/api/v1`

---

## Table of Contents

1. [Quick start](#quick-start)
2. [Authentication](#authentication)
3. [Error format](#error-format)
4. [Pagination](#pagination)
5. [Endpoints](#endpoints)
   - [Auth](#auth)
   - [Emails](#emails)
   - [API Keys](#api-keys)
   - [Provider Connections](#provider-connections)
   - [Domains](#domains)
   - [Routing Rules](#routing-rules)
   - [Suppressions](#suppressions)
   - [Webhook Endpoints](#webhook-endpoints)
   - [MCP Connections](#mcp-connections)
   - [Dashboard Metrics](#dashboard-metrics)
   - [Usage Stats](#usage-stats)
   - [Waitlist](#waitlist)
6. [Database schema](#database-schema)
7. [Background jobs](#background-jobs)
8. [Webhook event payloads](#webhook-event-payloads)
9. [Development setup](#development-setup)
10. [Genius extras](#genius-extras)

---

## Quick start

```bash
# 1. Register a tenant (no auth needed)
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Acme Corp", "email": "dev@acme.com", "mode": "demo"}'
# → { "tenant": {...}, "token": "eyJ..." }

# 2. Create an API key (JWT required)
curl -X POST http://localhost:4000/api/v1/api_keys \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{"name": "Production", "scopes": ["send_email"]}'
# → { "raw_key": "cxk_live_...", ... }   ← copy this, shown once

# 3. Send an email (API key works here)
curl -X POST http://localhost:4000/api/v1/emails \
  -H "Authorization: Bearer cxk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "from_email": "noreply@acme.com",
    "to_email":   "user@example.com",
    "subject":    "Hello from CourierX",
    "html_body":  "<p>It works.</p>"
  }'
# → { "email": { "id": "uuid", "status": "queued", ... } }

# 4. Check delivery
curl http://localhost:4000/api/v1/emails/{id} \
  -H "Authorization: Bearer cxk_live_..."
# → { "email": { "status": "delivered", "events": [...] } }
```

---

## Authentication

All `/api/v1` endpoints (except the public ones below) require an `Authorization: Bearer` header.

### JWT tokens

Returned by `POST /auth/register` and `POST /auth/login`. Valid for **24 hours**.

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

JWT payload:

```json
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "iat":       1700000000,
  "exp":       1700086400
}
```

### API keys

Format: `cxk_live_{32 hex characters}`

Passed in the same `Authorization: Bearer` header. The server detects the `cxk_` prefix and routes to API key authentication.

```
Authorization: Bearer cxk_live_4f2a9c1e8b3d7f6a2e5c0b9d4f8e1a3c
```

API keys are **hashed (SHA-256)** at rest. The full key is never stored. Only the first 16 characters (`key_prefix`) are stored for display.

**Scopes** restrict what a key can do:

| Scope | Description |
|---|---|
| `send_email` | Create and dispatch emails |
| `read_stats` | Read metrics and usage stats (read-only) |
| *(empty array)* | Full tenant access — same as JWT |

**Rule:** Always use the minimum required scopes. A CI/CD send key needs only `send_email`. A monitoring integration needs only `read_stats`.

### Public endpoints (no auth)

| Endpoint | Purpose |
|---|---|
| `POST /auth/register` | Create account |
| `POST /auth/login` | Get JWT |
| `POST /waitlist` | Join waitlist |
| `GET /waitlist/status` | Check waitlist position |

---

## Error format

All error responses use the same JSON structure:

```json
{
  "error":   "human-readable message",
  "code":    "machine_readable_code",
  "details": {}
}
```

### HTTP status codes

| Code | Meaning |
|---|---|
| `200` | Success |
| `201` | Created |
| `202` | Accepted — email queued for async dispatch |
| `204` | Success, no body (DELETE) |
| `400` | Bad request — malformed JSON or missing required field |
| `401` | Unauthenticated — missing or expired token/key |
| `403` | Forbidden — valid auth, insufficient scope |
| `404` | Not found (or belongs to another tenant — same response to prevent enumeration) |
| `409` | Conflict — duplicate (e.g. domain already registered) |
| `422` | Validation failed |
| `429` | Rate limit exceeded |
| `500` | Internal server error |

### Validation error (422)

```json
{
  "error":   "Validation failed",
  "code":    "validation_error",
  "details": {
    "to_email": ["can't be blank", "is not a valid email address"],
    "subject":  ["can't be blank"]
  }
}
```

---

## Pagination

List endpoints support page-based pagination:

| Param | Default | Max | Description |
|---|---|---|---|
| `page` | `1` | — | Page number (1-indexed) |
| `per_page` | `25` | `100` | Records per page |

Response headers:

```
X-Total-Count:  1247
X-Page:         2
X-Per-Page:     25
X-Total-Pages:  50
```

**Performance note:** For email history with millions of records, use date range filters (`from` + `to`) rather than deep page traversal. Pages beyond ~100 become slow without cursor-based pagination.

---

## Endpoints

### Auth

#### Register

```
POST /api/v1/auth/register
```

Creates a new tenant account. Returns a JWT valid for 24 hours. Automatically creates a default `RateLimitPolicy`.

**Request:**

```json
{
  "name":  "Acme Corp",
  "email": "admin@acme.com",
  "mode":  "demo"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | ✅ | Company or workspace name. |
| `email` | string | ✅ | Admin email. Globally unique. |
| `mode` | string | — | `demo` (default), `byok`, or `managed`. See below. |

**Tenant modes:**

| Mode | Description |
|---|---|
| `demo` | Sandbox with mock sending. 100 test emails/day. No real provider needed. |
| `byok` | Bring Your Own Keys — connect your own SendGrid, SES, Mailgun, etc. |
| `managed` | Full infrastructure managed by CourierX. Included in Pro+ plans. |

**Response `201 Created`:**

```json
{
  "tenant": {
    "id":         "550e8400-e29b-41d4-a716-446655440000",
    "name":       "Acme Corp",
    "slug":       "acme-corp",
    "email":      "admin@acme.com",
    "mode":       "demo",
    "status":     "active",
    "plan_id":    null,
    "settings":   {},
    "created_at": "2025-02-23T14:00:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

#### Login

```
POST /api/v1/auth/login
```

**Request:**

```json
{
  "email": "admin@acme.com"
}
```

**Response `200 OK`:**

```json
{
  "tenant": { "id": "...", "name": "Acme Corp", ... },
  "token":  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

#### Get current tenant

```
GET /api/v1/auth/me
```

Works with both JWT and API key. Use for token validation or to hydrate the current session.

**Response `200 OK`:**

```json
{
  "tenant": {
    "id":     "550e8400-...",
    "name":   "Acme Corp",
    "mode":   "managed",
    "status": "active"
  }
}
```

---

### Emails

The primary resource. Every email dispatched through CourierX creates an `Email` record with full lifecycle tracking: queued → sent → delivered → opened → clicked (or bounced/failed).

#### List emails

```
GET /api/v1/emails
```

| Query Param | Type | Description |
|---|---|---|
| `status` | string | `queued`, `sent`, `delivered`, `bounced`, `complained`, `failed`, `suppressed` |
| `recipient` | string | Case-insensitive substring match against `to_email` |
| `from` | ISO-8601 | Start of date range (e.g. `2025-02-01`) |
| `to` | ISO-8601 | End of date range |
| `tags` | string | Filter by tag (exact match, single tag) |
| `page` | int | Page number (default: 1) |
| `per_page` | int | Per page (default: 25, max: 100) |

**Response `200 OK`:**

```json
[
  {
    "id":                  "msg-uuid",
    "from_email":          "noreply@acme.com",
    "from_name":           "Acme Corp",
    "to_email":            "user@example.com",
    "to_name":             "Jane Doe",
    "subject":             "Welcome to Acme",
    "status":              "delivered",
    "provider_message_id": "sg-msg-id-abc123",
    "tags":                ["welcome", "onboarding"],
    "metadata":            {"user_id": "42", "order_id": "10042"},
    "attempt_count":       1,
    "last_error":          null,
    "queued_at":           "2025-02-23T14:32:01Z",
    "sent_at":             "2025-02-23T14:32:02Z",
    "delivered_at":        "2025-02-23T14:32:03Z",
    "created_at":          "2025-02-23T14:32:01Z"
  }
]
```

---

#### Get email details + event timeline

```
GET /api/v1/emails/:id
```

Returns the email record plus every event in its lifecycle.

**Response `200 OK`:**

```json
{
  "id":           "msg-uuid",
  "from_email":   "noreply@acme.com",
  "to_email":     "user@example.com",
  "subject":      "Welcome to Acme",
  "status":       "clicked",
  "tags":         ["welcome"],
  "metadata":     {"user_id": "42"},
  "queued_at":    "2025-02-23T14:32:01Z",
  "sent_at":      "2025-02-23T14:32:02Z",
  "delivered_at": "2025-02-23T14:32:03Z",
  "events": [
    {
      "id":          "evt-uuid-1",
      "event_type":  "delivered",
      "occurred_at": "2025-02-23T14:32:03Z",
      "provider":    "sendgrid"
    },
    {
      "id":          "evt-uuid-2",
      "event_type":  "opened",
      "occurred_at": "2025-02-23T15:10:22Z",
      "provider":    "sendgrid",
      "user_agent":  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)",
      "ip_address":  "203.0.113.42"
    },
    {
      "id":          "evt-uuid-3",
      "event_type":  "clicked",
      "occurred_at": "2025-02-23T15:10:45Z",
      "provider":    "sendgrid",
      "link_url":    "https://acme.com/dashboard"
    }
  ]
}
```

---

#### Send email

```
POST /api/v1/emails
```

Queues an email for dispatch. Returns `202 Accepted` immediately — processing is asynchronous via Sidekiq.

**Request:**

```json
{
  "from_email": "noreply@acme.com",
  "from_name":  "Acme Corp",
  "to_email":   "jane@example.com",
  "to_name":    "Jane Doe",
  "reply_to":   "support@acme.com",
  "subject":    "Your order #{{order_id}} is confirmed",
  "html_body":  "<h1>Thank you, {{name}}!</h1><p>Order #{{order_id}} ships in 2 days.</p>",
  "text_body":  "Thank you, {{name}}! Order #{{order_id}} ships in 2 days.",
  "tags":       ["transactional", "order-confirm"],
  "metadata":   {
    "order_id":          "10042",
    "user_id":           "42",
    "idempotency_key":   "order-10042-confirm-v1"
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `from_email` | string | ✅ | Sender address. Must be on a verified domain (or any address in demo mode). |
| `from_name` | string | — | Display name (e.g. `"Acme Corp"`). |
| `to_email` | string | ✅ | Recipient address. Checked against suppression list before dispatch. |
| `to_name` | string | — | Recipient display name. |
| `reply_to` | string | — | Reply-To header. |
| `subject` | string | ✅ | Subject line. Handlebars-rendered. |
| `html_body` | string | ✴️ | HTML body. At least one of `html_body`/`text_body` required. Handlebars-rendered. |
| `text_body` | string | ✴️ | Plain-text fallback. |
| `tags` | string[] | — | Labels for filtering and routing. Max 10 tags, 64 chars each. |
| `metadata` | object | — | Arbitrary key-value store. Forwarded in webhook payloads. |

**Response `202 Accepted`:**

```json
{
  "email": {
    "id":         "msg-uuid",
    "to_email":   "jane@example.com",
    "subject":    "Your order #10042 is confirmed",
    "status":     "queued",
    "tags":       ["transactional", "order-confirm"],
    "queued_at":  "2025-02-23T14:32:01Z",
    "created_at": "2025-02-23T14:32:01Z"
  }
}
```

**Dispatch flow:**

```
POST /emails
  ├── 1. Authenticate + authorize
  ├── 2. Validate fields
  ├── 3. Check suppression list → 422 if suppressed
  ├── 4. Create Email record (status: queued)
  ├── 5. Enqueue EmailDispatchJob (Sidekiq)
  └── → 202 Accepted

EmailDispatchJob (async, ~100ms later):
  ├── 1. Resolve routing rule → provider chain
  ├── 2. Decrypt provider credentials
  ├── 3. POST /v1/send → Core Engine
  ├── 4. Update email status (sent / failed)
  ├── 5. Increment usage_stats
  └── 6. Fire webhook events
```

---

### API Keys

Application-level credentials for programmatic access. Full key shown **once only** on creation.

#### List keys

```
GET /api/v1/api_keys
```

**Response `200 OK`:**

```json
[
  {
    "id":           "ak-uuid",
    "name":         "Production API",
    "key_prefix":   "cxk_live_4f2a",
    "status":       "active",
    "scopes":       ["send_email"],
    "last_used_at": "2025-02-23T14:32:01Z",
    "expires_at":   null,
    "created_at":   "2024-09-15T10:00:00Z"
  }
]
```

---

#### Create key

```
POST /api/v1/api_keys
```

**Request:**

```json
{
  "name":       "CI/CD Pipeline",
  "scopes":     ["send_email"],
  "expires_at": "2026-01-01T00:00:00Z"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | ✅ | Human-readable label. |
| `scopes` | string[] | — | Empty array = full access. |
| `expires_at` | ISO-8601 | — | Optional expiry timestamp. |

**Response `201 Created`:**

```json
{
  "id":         "ak-uuid",
  "name":       "CI/CD Pipeline",
  "key_prefix": "cxk_live_9c7b",
  "status":     "active",
  "scopes":     ["send_email"],
  "raw_key":    "cxk_live_9c7b3f8a2e1d5c4b7a0f9e6d3c2b8a5f"
}
```

⚠️ **`raw_key` is only present in this response.** It is hashed before storage and never returned again. Copy it immediately.

---

#### Revoke key

```
PATCH /api/v1/api_keys/:id/revoke
```

Sets status to `"revoked"`. The key can no longer authenticate. The record is retained for audit.

**Response `200 OK`:** Updated key object with `"status": "revoked"`.

---

#### Delete key

```
DELETE /api/v1/api_keys/:id
```

Permanently removes the record.

**Response `204 No Content`**

---

### Provider Connections

Stores credentials and configuration for each email provider. Credentials are encrypted at rest using `attr_encrypted` (AES-256-GCM). They are never returned in API responses.

#### List connections

```
GET /api/v1/provider_connections
```

**Response `200 OK`:**

```json
[
  {
    "id":                   "prov-uuid",
    "provider":             "sendgrid",
    "mode":                 "byok",
    "status":               "active",
    "display_name":         "SendGrid Primary",
    "weight":               1,
    "priority":             1,
    "success_rate":         99.8,
    "avg_latency_ms":       142,
    "consecutive_failures": 0,
    "last_health_check_at": "2025-02-23T14:00:00Z",
    "region":               null,
    "smtp_host":            null,
    "smtp_port":            null,
    "created_at":           "2024-09-15T10:00:00Z"
  }
]
```

---

#### Create connection

```
POST /api/v1/provider_connections
```

**SendGrid:**

```json
{
  "provider":              "sendgrid",
  "mode":                  "byok",
  "display_name":          "SendGrid Primary",
  "priority":              1,
  "weight":                1,
  "encrypted_api_key":     "SG.xxxxxxxxx",
  "encrypted_api_key_iv":  "base64-encoded-iv"
}
```

**AWS SES:**

```json
{
  "provider":             "aws_ses",
  "mode":                 "byok",
  "display_name":         "SES us-east-1",
  "priority":             2,
  "region":               "us-east-1",
  "encrypted_api_key":    "AKIAIOSFODNN7EXAMPLE",
  "encrypted_api_key_iv": "base64-encoded-iv",
  "encrypted_secret":     "wJalrXUtnFEMI...",
  "encrypted_secret_iv":  "base64-encoded-iv"
}
```

**SMTP:**

```json
{
  "provider":             "smtp",
  "mode":                 "byok",
  "display_name":         "Gmail SMTP",
  "priority":             3,
  "smtp_host":            "smtp.gmail.com",
  "smtp_port":            587,
  "encrypted_api_key":    "sender@gmail.com",
  "encrypted_api_key_iv": "base64-encoded-iv",
  "encrypted_secret":     "app-password",
  "encrypted_secret_iv":  "base64-encoded-iv"
}
```

**Supported `provider` values:** `sendgrid`, `mailgun`, `aws_ses`, `resend`, `postmark`, `smtp`

**Supported `status` values:** `active`, `inactive`, `degraded`, `banned`

**Response `201 Created`:** Provider connection object (without encrypted fields).

---

#### Update connection

```
PATCH /api/v1/provider_connections/:id
PUT   /api/v1/provider_connections/:id
```

All fields optional — partial update.

**Response `200 OK`:** Updated connection object.

---

#### Delete connection

```
DELETE /api/v1/provider_connections/:id
```

**Response `204 No Content`**

---

### Domains

Register and verify sending/tracking domains. Required for BYOK and managed modes. All DNS record values (DKIM, SPF, DMARC) are generated by the Control Plane.

#### List domains

```
GET /api/v1/domains
```

**Response `200 OK`:**

```json
[
  {
    "id":                 "dom-uuid",
    "domain":             "mail.acme.com",
    "status":             "verified",
    "verification_token": null,
    "verified_at":        "2024-09-16T09:00:00Z",
    "spf_record":         "v=spf1 include:spf.courierx.dev ~all",
    "dkim_selector":      "cxk1",
    "dkim_public_key":    "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQ...",
    "dmarc_policy":       "v=DMARC1; p=quarantine; rua=mailto:dmarc@acme.com",
    "created_at":         "2024-09-15T10:00:00Z"
  }
]
```

When `status` is `pending`, `verification_token` contains the DNS TXT value you must publish.

---

#### Create domain

```
POST /api/v1/domains
```

**Request:**

```json
{
  "domain": "mail.acme.com"
}
```

**Response `201 Created`:**

```json
{
  "id":                 "dom-uuid",
  "domain":             "mail.acme.com",
  "status":             "pending",
  "verification_token": "cxv_4f8a2e1d9c3b7f5a",
  "spf_record":         "v=spf1 include:spf.courierx.dev ~all",
  "dkim_selector":      "cxk1",
  "dkim_public_key":    "MIGfMA0GCSqGSIb3..."
}
```

Add to your DNS (TTL: 300 or lower for faster verification):

```
Name:  mail.acme.com          Type: TXT    Value: cxv_4f8a2e1d9c3b7f5a
Name:  cxk1._domainkey.acme   Type: TXT    Value: v=DKIM1; k=rsa; p=MIGfMA0G...
Name:  mail.acme.com          Type: TXT    Value: v=spf1 include:spf.courierx.dev ~all
```

Then call `POST /domains/:id/verify` to trigger the DNS check.

---

#### Verify domain

```
POST /api/v1/domains/:id/verify
```

Performs a live DNS TXT lookup. Sets status to `verified` if the token is found.

**Response `200 OK`:**

```json
{
  "id":          "dom-uuid",
  "domain":      "mail.acme.com",
  "status":      "verified",
  "verified_at": "2025-02-23T14:00:00Z"
}
```

**Response `422`** (token not in DNS yet):

```json
{
  "error": "Verification failed: TXT record not found. DNS propagation can take up to 48 hours."
}
```

---

#### Delete domain

```
DELETE /api/v1/domains/:id
```

**Response `204 No Content`**

---

### Routing Rules

Routing rules determine which provider chain handles an email. Rules are matched by `from_email` domain or by tag. The first matching active rule wins. The default rule catches everything that doesn't match a specific rule.

#### List rules

```
GET /api/v1/routing_rules
```

**Response `200 OK`:**

```json
[
  {
    "id":                "rr-uuid-1",
    "name":              "Transactional default",
    "strategy":          "priority",
    "is_default":        true,
    "is_active":         true,
    "match_from_domain": null,
    "match_tag":         null,
    "created_at":        "2024-09-15T10:00:00Z"
  },
  {
    "id":                "rr-uuid-2",
    "name":              "Marketing campaigns",
    "strategy":          "weighted",
    "is_default":        false,
    "is_active":         true,
    "match_from_domain": null,
    "match_tag":         "marketing",
    "created_at":        "2024-10-01T10:00:00Z"
  }
]
```

---

#### Create rule

```
POST /api/v1/routing_rules
```

**Request:**

```json
{
  "name":              "EU sending",
  "strategy":          "priority",
  "is_default":        false,
  "is_active":         true,
  "match_from_domain": "eu.acme.com",
  "match_tag":         null
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | ✅ | Human-readable label. |
| `strategy` | string | ✅ | `priority`, `weighted`, `round_robin`, `failover_only` |
| `is_default` | boolean | — | Catch-all rule. Only one default per tenant. |
| `is_active` | boolean | — | Inactive rules are skipped. |
| `match_from_domain` | string | — | Apply when email's `from_email` domain equals this. |
| `match_tag` | string | — | Apply when email's `tags` array contains this tag. |

**Routing strategies:**

| Strategy | Description |
|---|---|
| `priority` | Always use the highest-priority available provider. Failover on error. |
| `weighted` | Distribute sends proportionally by each provider's `weight` field. |
| `round_robin` | Cycle through providers evenly, ignoring weight. |
| `failover_only` | Use primary exclusively; only switch to fallback on failure. |

**Response `201 Created`:** Routing rule object.

---

#### Update rule

```
PATCH /api/v1/routing_rules/:id
PUT   /api/v1/routing_rules/:id
```

**Response `200 OK`:** Updated rule.

---

#### Delete rule

```
DELETE /api/v1/routing_rules/:id
```

**Response `204 No Content`**

---

### Suppressions

Suppression list prevents emails from being sent to addresses that have permanently bounced, marked as spam, or been manually blocked. Checked synchronously before every send.

#### List suppressions

```
GET /api/v1/suppressions
```

| Query Param | Type | Description |
|---|---|---|
| `reason` | string | Filter: `bounce`, `complaint`, `manual` |
| `page` | int | Page number |
| `per_page` | int | Per page (max 100) |

**Response `200 OK`:**

```json
[
  {
    "id":         "sup-uuid",
    "email":      "bounced@example.com",
    "reason":     "bounce",
    "note":       "Hard bounce: 550 5.1.1 user unknown",
    "created_at": "2025-02-23T14:30:22Z"
  }
]
```

---

#### Add suppression

```
POST /api/v1/suppressions
```

**Request:**

```json
{
  "email":  "unsubscribed@example.com",
  "reason": "manual",
  "note":   "User requested removal via support ticket #4821"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | string | ✅ | Address to suppress. Stored lowercased. |
| `reason` | string | ✅ | `bounce`, `complaint`, or `manual` |
| `note` | string | — | Internal context note (never sent to recipient). |

**Response `201 Created`:**

```json
{
  "id":         "sup-uuid",
  "email":      "unsubscribed@example.com",
  "reason":     "manual",
  "created_at": "2025-02-23T15:00:00Z"
}
```

Duplicate (same tenant + email) returns `409 Conflict`.

---

#### Remove suppression

```
DELETE /api/v1/suppressions/:id
```

Re-enables sending to this address. Use carefully — if the address was a hard bounce, re-enabling will harm your sender reputation.

**Response `204 No Content`**

---

### Webhook Endpoints

Register URLs to receive real-time email lifecycle events. The Control Plane delivers events within ~1 second of them occurring.

#### List endpoints

```
GET /api/v1/webhook_endpoints
```

**Response `200 OK`:**

```json
[
  {
    "id":          "wh-uuid",
    "url":         "https://acme.com/hooks/email",
    "description": "Production delivery events",
    "is_active":   true,
    "events":      ["delivered", "bounced", "clicked"],
    "created_at":  "2024-09-15T10:00:00Z"
  }
]
```

Note: `secret` is never returned after creation.

---

#### Create endpoint

```
POST /api/v1/webhook_endpoints
```

**Request:**

```json
{
  "url":         "https://acme.com/hooks/email",
  "description": "All delivery events",
  "is_active":   true,
  "events":      ["delivered", "opened", "clicked", "bounced", "complained"]
}
```

**Supported `events`:** `delivered`, `opened`, `clicked`, `bounced`, `complained`, `failed`, `suppressed`

**Response `201 Created`:**

```json
{
  "id":          "wh-uuid",
  "url":         "https://acme.com/hooks/email",
  "is_active":   true,
  "events":      ["delivered", "opened", "clicked", "bounced", "complained"],
  "secret":      "whsec_4f2a9c1e8b3d7f6a2e5c0b9d4f8e1a3c",
  "created_at":  "2025-02-23T14:00:00Z"
}
```

⚠️ **`secret` is only shown on creation.** Store it to verify webhook signatures.

---

#### Update endpoint

```
PATCH /api/v1/webhook_endpoints/:id
PUT   /api/v1/webhook_endpoints/:id
```

**Response `200 OK`:** Updated endpoint (no secret returned).

---

#### Delete endpoint

```
DELETE /api/v1/webhook_endpoints/:id
```

**Response `204 No Content`**

---

### MCP Connections

MCP (Model Context Protocol) connections let external automation tools and AI agents interact with CourierX. Each connection gets a `client_id` + `client_secret` pair with fine-grained permission control.

#### List connections

```
GET /api/v1/mcp_connections
```

**Response `200 OK`:**

```json
[
  {
    "id":                 "mcp-uuid",
    "name":               "Zapier Integration",
    "description":        "Automated onboarding sequences",
    "client_id":          "mcp_4f2a9c1e8b3d7f6a",
    "status":             "connected",
    "permissions":        ["send_email"],
    "require_approval":   false,
    "max_emails_per_run": 500,
    "total_emails_sent":  12450,
    "last_used_at":       "2025-02-23T14:32:01Z",
    "created_at":         "2024-11-01T10:00:00Z"
  }
]
```

---

#### Create connection

```
POST /api/v1/mcp_connections
```

**Request:**

```json
{
  "name":               "Claude email agent",
  "description":        "AI-driven onboarding email sequences",
  "status":             "connected",
  "permissions":        ["send_email"],
  "require_approval":   true,
  "max_emails_per_run": 50,
  "allowed_from_emails": ["noreply@acme.com"],
  "allowed_tags":        ["ai-generated", "onboarding"]
}
```

| Field | Type | Description |
|---|---|---|
| `permissions` | string[] | `read_only`, `send_email`, `manage_providers`, `manage_suppressions`, `full_access` |
| `require_approval` | boolean | Emails queue for human approval before dispatch. |
| `max_emails_per_run` | int | Hard cap per automation invocation. Null = unlimited. |
| `allowed_from_emails` | string[] | Whitelist of permitted sender addresses. Empty = all allowed. |
| `allowed_tags` | string[] | Restrict sends to only these tags. Empty = unrestricted. |

**Response `201 Created`:**

```json
{
  "id":            "mcp-uuid",
  "client_id":     "mcp_4f2a9c1e8b3d7f6a",
  "client_secret": "mcp_secret_9c3b7f5a2e1d8c4b"
}
```

⚠️ `client_secret` shown once only.

---

#### Update / Delete connection

```
PATCH /api/v1/mcp_connections/:id
DELETE /api/v1/mcp_connections/:id
```

---

### Dashboard Metrics

Aggregated 7-day metrics for the dashboard overview. Not paginated.

```
GET /api/v1/dashboard/metrics
```

**Response `200 OK`:**

```json
{
  "period": {
    "from": "2025-02-16T00:00:00Z",
    "to":   "2025-02-23T23:59:59Z"
  },
  "totals": {
    "sent":       87320,
    "delivered":  86598,
    "bounced":    412,
    "complained": 28,
    "failed":     105,
    "opened":     43890,
    "clicked":    8910
  },
  "rates": {
    "delivery_rate": 99.17,
    "open_rate":     50.68
  },
  "daily": [
    {
      "date":      "2025-02-23",
      "sent":      14832,
      "delivered": 14695,
      "bounced":   91,
      "opened":    7420
    }
  ],
  "providers": [
    {
      "id":             "prov-uuid",
      "provider":       "sendgrid",
      "display_name":   "SendGrid Primary",
      "status":         "active",
      "success_rate":   99.8,
      "avg_latency_ms": 142
    }
  ]
}
```

---

### Usage Stats

Time-series usage data broken down by date and provider. Use for billing reconciliation, capacity planning, and per-provider analytics.

```
GET /api/v1/usage_stats?from=2025-02-01&to=2025-02-23
```

| Param | Default | Description |
|---|---|---|
| `from` | 7 days ago | ISO-8601 date |
| `to` | today | ISO-8601 date |

**Response `200 OK`:**

```json
[
  {
    "date":      "2025-02-23",
    "provider":  "sendgrid",
    "sent":       8210,
    "delivered":  8152,
    "bounced":    42,
    "complained": 3,
    "failed":     13,
    "opened":     4095,
    "clicked":    820
  },
  {
    "date":      "2025-02-23",
    "provider":  "aws_ses",
    "sent":       6622,
    "delivered":  6543,
    "bounced":    49,
    "complained": 2,
    "failed":     28,
    "opened":     3325,
    "clicked":    670
  }
]
```

---

### Waitlist

Public endpoints — no authentication required.

#### Join waitlist

```
POST /api/v1/waitlist
```

**Request:**

```json
{
  "email":         "dev@startup.io",
  "name":          "Alex Johnson",
  "company":       "Startup Inc.",
  "use_case":      "transactional",
  "referral_code": "cx_abc12345"
}
```

| Field | Type | Description |
|---|---|---|
| `use_case` | string | `transactional`, `marketing`, or `both` |
| `referral_code` | string | Referral code from another user — earns them a position bump. |

**Response `201 Created`:**

```json
{
  "message":       "You're on the waitlist!",
  "position":      1247,
  "referral_code": "cx_xyz99887",
  "referral_link": "https://courierx.dev/waitlist?ref=cx_xyz99887"
}
```

---

#### Check waitlist status

```
GET /api/v1/waitlist/status?email=dev@startup.io
```

**Response `200 OK`:**

```json
{
  "email":          "dev@startup.io",
  "position":       1247,
  "people_ahead":   1246,
  "status":         "pending",
  "referral_code":  "cx_xyz99887",
  "referral_count": 3,
  "joined_at":      "2025-02-20T10:00:00Z"
}
```

---

## Database schema

All tables use UUID primary keys. Every table is scoped by `tenant_id` — no cross-tenant data leakage is possible through the API layer.

```
tenants
  ├── api_keys                  (auth credentials, SHA-256 hashed)
  ├── provider_connections      (SendGrid, SES, etc. — credentials encrypted AES-256-GCM)
  ├── domains                   (verified sending domains + DNS records)
  ├── routing_rules
  │     └── routing_rule_providers   (join: rule ↔ provider with priority/weight)
  ├── emails
  │     └── email_events        (delivered, opened, clicked, bounced, complained, ...)
  ├── suppressions              (bounce/complaint/manual blocklist)
  ├── webhook_endpoints
  │     └── webhook_deliveries  (delivery log with retry state)
  ├── mcp_connections           (external automation integrations)
  ├── usage_stats               (daily aggregates per provider)
  └── rate_limit_policy         (per-tenant rate limits)

waitlist_entries                (separate from tenant system — pre-signup)
```

### Key indexes

| Table | Indexed columns | Purpose |
|---|---|---|
| `emails` | `(tenant_id, created_at DESC)` | Chronological list query |
| `emails` | `(tenant_id, status)` | Filter by status |
| `emails` | `to_email` | Recipient search |
| `email_events` | `(email_id, event_type)` | Event timeline |
| `api_keys` | `key_hash` (unique) | O(1) authentication lookup |
| `suppressions` | `(tenant_id, email)` (unique) | Pre-send suppression check |
| `provider_connections` | `(tenant_id, priority)` | Routing resolution |
| `usage_stats` | `(tenant_id, date)` | Date range queries |

---

## Background jobs

Sidekiq queues and their jobs:

| Job | Queue | Retries | Description |
|---|---|---|---|
| `EmailDispatchJob` | `default` | 3 (exponential backoff) | Sends email via Core Engine. Updates status and fires events on completion. |
| `WebhookDeliveryJob` | `webhooks` | 5 (exponential: 1m, 5m, 30m, 2h, 8h) | POSTs event payload to registered webhook URL. |
| `DomainVerificationJob` | `default` | 3 | Polls DNS for TXT record. Marks domain verified or failed. |
| `UsageAggregationJob` | `low` | 1 | Aggregates daily usage_stats. Runs at 00:05 UTC. |
| `ProviderHealthCheckJob` | `low` | 1 | Sends probe emails via each provider. Updates `success_rate`, `avg_latency_ms`, `consecutive_failures`. |
| `SuppressionSyncJob` | `low` | 1 | Pulls bounces/complaints from provider APIs and adds to suppression list. |

Monitor Sidekiq at `http://localhost:4000/sidekiq` (development only — require auth in production).

---

## Webhook event payloads

All webhook POST requests include signature headers for verification.

### Request headers

```
X-CourierX-Signature: sha256=4f2a9c1e8b3d7f6a2e5c0b9d4f8e1a3c...
X-CourierX-Timestamp: 1708699921
Content-Type:         application/json
```

### Signature verification

```javascript
// Node.js
const crypto = require("crypto")

function isValidWebhook(secret, timestamp, rawBody, signature) {
  // Reject timestamps older than 5 minutes (replay attack protection)
  if (Date.now() / 1000 - parseInt(timestamp) > 300) return false

  const payload  = `${timestamp}.${rawBody}`
  const expected = `sha256=${crypto.createHmac("sha256", secret).update(payload).digest("hex")}`

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}

// Express example
app.post("/hooks/email", express.raw({ type: "application/json" }), (req, res) => {
  const valid = isValidWebhook(
    process.env.COURIERX_WEBHOOK_SECRET,
    req.headers["x-courierx-timestamp"],
    req.body,
    req.headers["x-courierx-signature"],
  )
  if (!valid) return res.status(401).send("Invalid signature")

  const event = JSON.parse(req.body)
  // handle event...
  res.sendStatus(200)
})
```

```ruby
# Rails
def verify_webhook!
  timestamp = request.headers["X-CourierX-Timestamp"].to_i
  return head :unauthorized if Time.now.to_i - timestamp > 300

  payload  = "#{timestamp}.#{request.raw_post}"
  expected = "sha256=#{OpenSSL::HMAC.hexdigest("SHA256", ENV["WEBHOOK_SECRET"], payload)}"

  unless ActiveSupport::SecurityUtils.secure_compare(expected, request.headers["X-CourierX-Signature"])
    head :unauthorized
  end
end
```

### Event payload shapes

**Delivered:**

```json
{
  "id":          "evt-uuid",
  "event":       "delivered",
  "occurred_at": "2025-02-23T14:32:03Z",
  "provider":    "sendgrid",
  "message": {
    "id":       "msg-uuid",
    "to":       "jane@example.com",
    "subject":  "Your order is confirmed",
    "tags":     ["transactional", "order-confirm"],
    "metadata": {"order_id": "10042", "user_id": "42"}
  }
}
```

**Bounced:**

```json
{
  "id":          "evt-uuid",
  "event":       "bounced",
  "occurred_at": "2025-02-23T14:32:05Z",
  "provider":    "sendgrid",
  "message":     { "id": "msg-uuid", "to": "bad@example.com", ... },
  "bounce": {
    "type":    "permanent",
    "code":    "550",
    "message": "550 5.1.1 The email account that you tried to reach does not exist"
  }
}
```

Hard (permanent) bounces automatically add the address to your suppression list.

**Opened:**

```json
{
  "event":       "opened",
  "occurred_at": "2025-02-23T15:10:22Z",
  "message":     { ... },
  "user_agent":  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)",
  "ip_address":  "203.0.113.42"
}
```

**Clicked:**

```json
{
  "event":       "clicked",
  "occurred_at": "2025-02-23T15:10:45Z",
  "message":     { ... },
  "link_url":    "https://acme.com/dashboard"
}
```

**Complained (spam report):**

```json
{
  "event":       "complained",
  "occurred_at": "2025-02-23T16:00:00Z",
  "provider":    "sendgrid",
  "message":     { ... }
}
```

Complaint automatically suppresses the address. Alert immediately — high complaint rates damage sender reputation.

---

## Development setup

```bash
cd control-plane

# Install Ruby gems
bundle install

# Copy and configure environment
cp .env.example .env.local
# Set: DATABASE_URL, REDIS_URL, JWT_SECRET, ENCRYPTION_KEY, GO_CORE_URL

# Create and migrate database
bundle exec rails db:create db:migrate

# (Optional) seed demo data
bundle exec rails db:seed

# Start the server on port 4000
bundle exec rails server -p 4000

# Start Sidekiq in a second terminal
bundle exec sidekiq

# Run tests
bundle exec rspec

# Lint
bundle exec rubocop
```

### Rails console

```bash
bundle exec rails console

# Useful console commands
Tenant.count
Email.where(status: "failed").last(5)
ApiKey.authenticate("cxk_live_...")
Suppression.where(reason: "bounce").count
```

### Key environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL: `postgresql://user:pass@localhost/courierx_dev` |
| `REDIS_URL` | Redis: `redis://localhost:6379/0` |
| `JWT_SECRET` | At least 32 random bytes: `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | 32-byte key for attr_encrypted: `openssl rand -hex 32` |
| `GO_CORE_URL` | Core Engine URL: `http://localhost:8080` |
| `GO_CORE_SECRET` | Shared secret: `openssl rand -hex 32` |
| `SECRET_KEY_BASE` | Rails secret: `bundle exec rails secret` |

---

## Genius extras

### Idempotent email sending

Pass `metadata.idempotency_key` to prevent double-sends on client retries. If an email with the same key was sent within the last 24 hours, the API returns the existing email record instead of creating a new one:

```json
{
  "to_email":  "jane@example.com",
  "subject":   "Password reset",
  "html_body": "...",
  "metadata":  {
    "idempotency_key": "password-reset-user-42-2025-02-23"
  }
}
```

Format: include the user ID, action type, and date — this scopes idempotency to one event per user per day.

### Tag-based routing for multi-brand / multi-use-case tenants

Route emails through different providers without separate API keys:

```json
// Receipt emails → SES (high deliverability, low cost)
{ "tags": ["transactional", "receipt"] }

// Newsletter → SendGrid (bulk-optimized, dedicated IP)
{ "tags": ["marketing", "newsletter"] }

// Compliance notices → Postmark (exceptional deliverability, archiving)
{ "tags": ["compliance", "legal"] }
```

Create a `RoutingRule` per tag. The default rule catches anything untagged.

### Webhook fan-out for event routing

Register separate endpoints per event type to route to different downstream systems:

| Events | Target |
|---|---|
| `delivered`, `failed` | `https://analytics.acme.com/email/delivery` |
| `bounced` | `https://crm.acme.com/contacts/bounce-handler` (auto-marks contact as invalid) |
| `clicked` | `https://analytics.acme.com/email/engagement` |
| `complained` | `https://ops.acme.com/alerts/spam-complaint` (pages on-call immediately) |

### API key rotation without downtime

1. `POST /api_keys` → create new key
2. Update application config with new key + deploy
3. Verify traffic flows through new key (check `last_used_at`)
4. `PATCH /api_keys/:old_id/revoke` → revoke old key

Both keys are valid simultaneously. Zero-downtime rotation.

### Structured metadata as an event bus

Use consistent `metadata` keys across all emails to enable analytics without database joins:

```json
{
  "metadata": {
    "user_id":     "42",
    "tenant_slug": "acme-corp",
    "plan":        "pro",
    "campaign":    "feb-2025-reactivation",
    "ab_variant":  "B",
    "template_v":  "3",
    "event_source": "checkout-flow"
  }
}
```

This metadata is forwarded in every webhook event — your analytics pipeline can attribute opens and clicks back to users, A/B variants, and campaigns without any additional data enrichment.

### Batch suppression import

For large suppression imports (e.g. migrating from another ESP), use parallel requests:

```bash
# Import a CSV of emails with parallel curl (50 concurrent)
cat bounced_emails.txt | xargs -P 50 -I{} \
  curl -s -X POST http://localhost:4000/api/v1/suppressions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"{}\",\"reason\":\"bounce\",\"note\":\"imported from Mailchimp\"}"
```

### Proactive provider health management

The `ProviderHealthCheckJob` updates `consecutive_failures` automatically. Build an automation around it:

```ruby
# Rake task: auto-degrade providers that are failing
ProviderConnection.where("consecutive_failures >= 3 AND status = 'active'").each do |pc|
  pc.update!(status: "degraded")
  AlertService.notify("Provider #{pc.display_name} degraded — #{pc.consecutive_failures} consecutive failures")
end
```

The routing layer skips `degraded` providers automatically. Re-enable them via `PATCH /provider_connections/:id { "status": "active" }` once the provider recovers.

### Usage spike alerting

Poll usage_stats and alert before hitting the plan limit:

```ruby
# Run daily via cron
used_this_month = UsageStat.where(tenant: current_tenant)
                            .where("date >= ?", Date.today.beginning_of_month)
                            .sum(:emails_sent)

pct = (used_this_month.to_f / current_tenant.plan_limit * 100).round(1)

if pct >= 90
  SlackAlert.send "#alerts", "🚨 #{current_tenant.name} at #{pct}% of monthly email limit"
elsif pct >= 75
  SlackAlert.send "#alerts", "⚠️ #{current_tenant.name} at #{pct}% of monthly email limit"
end
```

### Compliance: DMARC-aligned sending checklist

For maximum inbox placement at Gmail, Outlook, and Yahoo:

- [ ] Verify your sending domain (`POST /domains` + `POST /domains/:id/verify`)
- [ ] Publish DKIM record (provided by `GET /domains/:id`)
- [ ] Publish SPF record (provided by `GET /domains/:id`)
- [ ] Set DMARC policy to at minimum `p=none; rua=mailto:dmarc@yourdomain.com` for visibility
- [ ] Graduate to `p=quarantine` after reviewing DMARC aggregate reports for 2 weeks
- [ ] Ensure `from_email` domain matches DKIM selector domain (alignment requirement)
- [ ] Add `List-Unsubscribe` header for marketing emails (required by Gmail since Feb 2024)

### Rate limit headers

Every response includes headers to help you throttle client-side:

```
X-RateLimit-Limit:     1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset:     1708699980
Retry-After:           60        (only on 429)
```

Implement adaptive throttling: when `Remaining < 100`, start queuing requests. When you receive a `429`, honor `Retry-After` before retrying.

### MCP connection security posture

For AI-driven email automation, follow the principle of least privilege:

```json
{
  "permissions":         ["send_email"],
  "require_approval":    true,         // ← start with approval on
  "max_emails_per_run":  10,           // ← tight cap initially
  "allowed_from_emails": ["noreply@acme.com"],  // ← no spoofing
  "allowed_tags":        ["ai-generated"]       // ← tagged for audit trail
}
```

Disable `require_approval` only after you've reviewed 50+ emails generated by the automation and are confident in its output. The `allowed_tags` constraint ensures AI-generated emails are always identifiable in logs and analytics.
