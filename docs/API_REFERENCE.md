# CourierX API Reference

**Base URL:** `https://api.courierx.dev/api/v1`  
**Protocol:** HTTPS only  
**Format:** JSON request and response bodies  
**Auth:** Bearer token (JWT or API key)

---

## Authentication

All API endpoints (except `/auth/register`, `/auth/login`, and inbound webhooks) require an `Authorization` header:

```
Authorization: Bearer <token>
```

Two token types are supported:

**JWT tokens** — issued by `/auth/login`, expire in 24 hours. Suitable for dashboard/user sessions.

**API keys** — prefixed `cxk_`, created via `/api_keys`, do not expire unless you set an `expires_at`. Suitable for server-to-server integration. The raw key value is shown **once** on creation.

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| All endpoints | 60 req/min per IP |
| `POST /emails` | 20 req/min per IP, 200 req/min per tenant |
| `POST /emails/bulk` | 5 req/min per IP, 30 req/min per tenant |
| `POST /auth/*` | 10 req/min per IP |

Rate limit headers are included on every response:
```
X-RateLimit-Limit: 200
X-RateLimit-Remaining: 198
X-RateLimit-Reset: 1713571260
```

When a limit is exceeded the API returns `429 Too Many Requests` with `Retry-After` header.

---

## Authentication Endpoints

### Register

```
POST /auth/register
```

Creates a new tenant account.

**Request:**
```json
{
  "name": "Acme Corp",
  "email": "admin@acme.com",
  "password": "securepassword",
  "password_confirmation": "securepassword"
}
```

**Response `201 Created`:**
```json
{
  "tenant": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corp",
    "email": "admin@acme.com",
    "slug": "acme-corp",
    "mode": "test",
    "status": "active"
  },
  "token": "eyJhbGciOiJIUzI1NiJ9..."
}
```

---

### Login

```
POST /auth/login
```

**Request:**
```json
{ "email": "admin@acme.com", "password": "securepassword" }
```

**Response `200 OK`:**
```json
{ "tenant": { ... }, "token": "eyJ..." }
```

---

### Get current tenant

```
GET /auth/me
Authorization: Bearer <token>
```

**Response `200 OK`:**
```json
{ "tenant": { "id": "...", "name": "...", "email": "...", ... } }
```

---

## Sending Email

### Send a single email

```
POST /emails
```

**Request body:**
```json
{
  "from_email": "noreply@yourdomain.com",
  "from_name": "Your App",
  "to_email": "user@example.com",
  "to_name": "Jane Doe",
  "subject": "Welcome to Your App",
  "html_body": "<h1>Welcome!</h1><p>Thanks for signing up.</p>",
  "text_body": "Welcome! Thanks for signing up.",
  "reply_to": "support@yourdomain.com",
  "tags": ["welcome", "transactional"],
  "metadata": { "user_id": "12345", "campaign": "onboarding" },
  "idempotency_key": "welcome-email-user-12345"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `from_email` | ✅ | Must belong to a verified domain |
| `to_email` | ✅ | Recipient email address |
| `subject` | ✅ | Email subject line (max 998 chars) |
| `html_body` or `text_body` | ✅ | At least one body required |
| `from_name` | ⚪ | Display name for sender |
| `to_name` | ⚪ | Display name for recipient |
| `reply_to` | ⚪ | Reply-to address |
| `tags` | ⚪ | Array of string tags (max 10) |
| `metadata` | ⚪ | Arbitrary key-value pairs for your reference |
| `idempotency_key` | ⚪ | Unique key; identical keys return the same response without re-sending |
| `attachments` | ⚪ | See attachment schema below |

**Attachments:**
```json
"attachments": [
  {
    "filename": "invoice.pdf",
    "content": "<base64-encoded content>",
    "content_type": "application/pdf"
  }
]
```

**Response `201 Created`:**
```json
{
  "id": "email-uuid",
  "status": "queued",
  "idempotency_key": "welcome-email-user-12345",
  "created_at": "2026-04-19T12:00:00Z"
}
```

**Error responses:**
```json
// 422 — suppressed recipient
{ "error": "Recipient address is suppressed", "code": "suppressed_recipient" }

// 422 — unverified from domain
{ "error": "from_email domain is not verified", "code": "unverified_from_domain" }

// 429 — rate limit exceeded
{ "error": "Rate limit exceeded", "code": "tenant_rate_limit_exceeded",
  "details": { "limit": 200, "retry_after": 45 } }
```

---

### List emails

```
GET /emails
```

**Query parameters:**
| Param | Description |
|-------|-------------|
| `status` | Filter by status: `queued`, `sending`, `sent`, `delivered`, `bounced`, `failed` |
| `recipient` | Case-insensitive substring match on `to_email` |
| `from` | ISO 8601 datetime — emails created after this time |
| `to` | ISO 8601 datetime — emails created before this time |
| `page` | Page number (default: 1) |
| `per_page` | Items per page (default: 25, max: 100) |

**Response `200 OK`:**
```json
{
  "emails": [
    {
      "id": "uuid",
      "to_email": "user@example.com",
      "from_email": "noreply@yourdomain.com",
      "subject": "Welcome",
      "status": "delivered",
      "provider": "sendgrid",
      "provider_message_id": "abc123",
      "created_at": "2026-04-19T12:00:00Z",
      "sent_at": "2026-04-19T12:00:01Z"
    }
  ],
  "meta": { "page": 1, "per_page": 25, "total": 1042 }
}
```

---

### Get email details

```
GET /emails/:id
```

**Response `200 OK`:**
```json
{
  "id": "uuid",
  "to_email": "user@example.com",
  "from_email": "noreply@yourdomain.com",
  "subject": "Welcome",
  "status": "delivered",
  "provider": "sendgrid",
  "provider_message_id": "abc123",
  "tags": ["welcome"],
  "metadata": { "user_id": "12345" },
  "events": [
    { "type": "sent", "occurred_at": "2026-04-19T12:00:01Z" },
    { "type": "delivered", "occurred_at": "2026-04-19T12:00:03Z" }
  ],
  "created_at": "2026-04-19T12:00:00Z"
}
```

---

## API Keys

### Create an API key

```
POST /api_keys
```

**Request:**
```json
{
  "name": "Production Server",
  "expires_at": "2027-01-01T00:00:00Z"
}
```

**Response `201 Created`:**
```json
{
  "id": "uuid",
  "name": "Production Server",
  "key": "cxk_a1b2c3d4e5f6...",
  "prefix": "cxk_a1b2",
  "expires_at": "2027-01-01T00:00:00Z",
  "created_at": "2026-04-19T12:00:00Z"
}
```

> ⚠️ The `key` field is only returned once. Store it securely.

---

### List API keys

```
GET /api_keys
```

Returns all active keys (key value is never returned; only `prefix` and metadata).

---

### Revoke an API key

```
PATCH /api_keys/:id/revoke
```

**Response `200 OK`:**
```json
{ "id": "uuid", "status": "revoked" }
```

---

## Domains

Sending emails from a domain requires verification. CourierX checks DNS records to confirm ownership.

### Add a domain

```
POST /domains
```

**Request:**
```json
{ "name": "yourdomain.com" }
```

**Response `201 Created`:**
```json
{
  "id": "uuid",
  "name": "yourdomain.com",
  "status": "pending_verification",
  "verification_token": "courierx-verify-abc123",
  "dns_records": [
    {
      "type": "TXT",
      "host": "_courierx.yourdomain.com",
      "value": "courierx-verify-abc123",
      "purpose": "ownership"
    },
    {
      "type": "TXT",
      "host": "yourdomain.com",
      "value": "v=spf1 include:mail.courierx.dev ~all",
      "purpose": "spf"
    }
  ]
}
```

---

### Trigger verification

```
POST /domains/:id/verify
```

Enqueues a DNS check. Returns `202 Accepted`. Check domain status to see result.

**Response `202 Accepted`:**
```json
{ "message": "Verification started", "status": "pending_verification" }
```

---

### List domains

```
GET /domains
```

**Response `200 OK`:**
```json
{
  "domains": [
    { "id": "uuid", "name": "yourdomain.com", "status": "verified", "created_at": "..." }
  ]
}
```

---

## Provider Connections (BYOK)

Connect your own provider accounts for maximum deliverability control.

### Connect a provider

```
POST /provider_connections
```

**Request (SendGrid):**
```json
{
  "provider": "sendgrid",
  "display_name": "Primary SendGrid Account",
  "api_key": "SG.xxxxxxxxxxxxx"
}
```

**Request (Mailgun):**
```json
{
  "provider": "mailgun",
  "display_name": "Mailgun EU",
  "api_key": "key-xxxxxxxxx",
  "smtp_host": "yourdomain.mailgun.org",
  "region": "eu"
}
```

**Request (AWS SES):**
```json
{
  "provider": "ses",
  "display_name": "SES us-east-1",
  "api_key": "AKIAIOSFODNN7EXAMPLE",
  "secret": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  "region": "us-east-1"
}
```

**Request (SMTP):**
```json
{
  "provider": "smtp",
  "display_name": "Postfix Relay",
  "smtp_host": "smtp.yourdomain.com",
  "smtp_port": 587,
  "api_key": "username",
  "secret": "password"
}
```

**Request (Postmark):**
```json
{
  "provider": "postmark",
  "display_name": "Postmark Transactional",
  "api_key": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

**Request (Resend):**
```json
{
  "provider": "resend",
  "display_name": "Resend Production",
  "api_key": "re_xxxxxxxxxxxxx"
}
```

**Response `201 Created`:**
```json
{
  "id": "uuid",
  "provider": "sendgrid",
  "display_name": "Primary SendGrid Account",
  "status": "active",
  "created_at": "2026-04-19T12:00:00Z"
}
```

For `resend` and `postmark` connections the response also includes:

```json
{
  "webhook_url": "https://api.courierx.dev/api/v1/webhooks/resend/<token>",
  "webhook_secret_present": false
}
```

`webhook_url` is the URL you paste into your provider's dashboard so delivery
events route back to CourierX. After you create the webhook there, copy the
provider's signing secret and PATCH it onto the connection:

```
PATCH /provider_connections/:id
{ "webhook_secret": "whsec_xxxxxxxx" }   # for Resend
{ "webhook_secret": "your-basic-auth-password" }   # for Postmark
```

`webhook_secret_present: true` means we have it stored. Without it, inbound
webhooks for that connection are rejected with `401 Unauthorized` and emails
will never transition past `sent` to `delivered`. See
[Inbound webhook setup (BYOK)](INBOUND_WEBHOOKS.md) for the full step-by-step.

---

## Routing Rules

Define which provider is used for emails from a specific domain.

### Create a routing rule

```
POST /routing_rules
```

**Request:**
```json
{
  "name": "Transactional mail",
  "domain_id": "uuid",
  "strategy": "priority",
  "is_default": false,
  "provider_connections": [
    { "provider_connection_id": "uuid-sg", "priority": 1, "role": "primary" },
    { "provider_connection_id": "uuid-mg", "priority": 2, "role": "fallback" }
  ]
}
```

---

## Suppressions

Suppressed addresses will never receive email from your account.

### Add a suppression

```
POST /suppressions
```

**Request:**
```json
{
  "email": "user@example.com",
  "reason": "unsubscribed",
  "source": "manual"
}
```

### List suppressions

```
GET /suppressions
```

### Remove a suppression

```
DELETE /suppressions/:id
```

---

## Webhook Endpoints

Register URLs to receive real-time delivery events.

### Register a webhook

```
POST /webhook_endpoints
```

**Request:**
```json
{
  "url": "https://your-app.com/webhooks/email",
  "events": ["delivered", "bounced", "opened", "clicked", "complained"],
  "active": true
}
```

**Note:** Webhook URLs must resolve to a public IP address. Private network addresses (10.x, 192.168.x, 172.16-31.x) and link-local addresses (169.254.x) are rejected.

### Webhook payload format

All events are delivered as `POST` requests with this shape:

```json
{
  "event": "delivered",
  "email_id": "uuid",
  "tenant_id": "uuid",
  "to_email": "user@example.com",
  "provider": "sendgrid",
  "provider_message_id": "abc123",
  "occurred_at": "2026-04-19T12:00:03Z",
  "metadata": { "user_id": "12345" }
}
```

**Signature verification:** Every webhook includes:
```
X-CourierX-Signature: sha256=<hmac-hex>
X-CourierX-Timestamp: <unix-timestamp>
```

Verify with:
```python
import hmac, hashlib, time

def verify(secret, signature_header, timestamp, body):
    payload = f"{timestamp}.{body}"
    expected = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature_header)
```

---

## Email Status Lifecycle

```
queued → sending → sent → delivered
                 ↘ failed
                       ↘ bounced
                       ↘ complained
```

| Status | Meaning |
|--------|---------|
| `queued` | Accepted by API, waiting for processing |
| `sending` | Being sent to provider |
| `sent` | Accepted by provider |
| `delivered` | Confirmed delivered to recipient mailbox |
| `bounced` | Hard or soft bounce |
| `complained` | Spam complaint received |
| `failed` | All providers failed or permanent error |

---

## Error Codes

| HTTP Status | Code | Meaning |
|------------|------|---------|
| 400 | `bad_request` | Malformed request |
| 401 | `unauthorized` | Missing or invalid auth token |
| 401 | `token_expired` | JWT or API key expired |
| 403 | `forbidden` | Authenticated but not authorized |
| 404 | `not_found` | Resource not found or belongs to another tenant |
| 422 | `validation_failed` | Request validation failed |
| 422 | `suppressed_recipient` | Recipient is on suppression list |
| 422 | `unverified_from_domain` | `from_email` domain not verified |
| 429 | `rate_limit_exceeded` | IP-level rate limit exceeded |
| 429 | `tenant_rate_limit_exceeded` | Tenant-level rate limit exceeded |
| 500 | `internal_error` | Unexpected server error |

All error responses follow the same shape:
```json
{
  "error": "Human-readable message",
  "code": "machine_readable_code",
  "details": { ... }
}
```

---

## Idempotency

For `POST /emails`, supply an `idempotency_key` to safely retry without double-sending:

```json
{ "idempotency_key": "order-confirmation-12345", ...other fields }
```

If the same key is submitted within 24 hours, the API returns the original response without creating a new email or sending again.

Idempotency keys must be unique per tenant. We recommend using a deterministic key based on the email's purpose and recipient: `"type:order-confirm:order:12345:user:67890"`.
