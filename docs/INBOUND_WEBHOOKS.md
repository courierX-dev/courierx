# Inbound webhook setup (BYOK)

CourierX needs to know when your provider successfully delivers an email
(or bounces it, or gets a complaint). Providers push that information via
webhooks. Because every CourierX tenant runs their own provider account
(BYOK), each provider connection has its **own webhook URL and signing
secret** — there is no shared global secret.

If you skip this setup, your emails stay at `status: "sent"` forever and
never advance to `delivered` / `bounced` / `complained`.

## How it works

1. You create a `ProviderConnection` in CourierX.
2. CourierX returns a unique `webhook_url` like
   `https://api.courierx.dev/api/v1/webhooks/resend/<token>`.
3. You paste that URL into your provider's webhook configuration.
4. The provider gives you a signing secret. You PATCH it back onto the
   connection.
5. From then on, delivery events flow into CourierX and update your `Email`
   records.

The token in the URL is opaque and unguessable. The signing secret is
stored encrypted at rest with the same AES-256 key as your API credentials.

---

## Resend

### 1. Create the connection

```http
POST /api/v1/provider_connections
Authorization: Bearer cxk_live_...

{
  "provider": "resend",
  "display_name": "Resend Production",
  "api_key": "re_xxxxxxxxxxxxx"
}
```

Response includes:

```json
{
  "id": "9f0c...",
  "webhook_url": "https://api.courierx.dev/api/v1/webhooks/resend/Hk2b...",
  "webhook_secret_present": false,
  ...
}
```

### 2. Add the webhook in Resend

In the Resend dashboard: **Webhooks → Add Endpoint**.

- **Endpoint URL**: paste `webhook_url` from step 1.
- **Events**: enable at minimum `email.delivered`, `email.bounced`,
  `email.complained`. Optionally `email.opened`, `email.clicked`,
  `email.delivery_delayed`.

After saving, Resend shows the **Signing Secret** — a string starting
with `whsec_`. Copy it.

### 3. Save the signing secret to CourierX

```http
PATCH /api/v1/provider_connections/9f0c...
Authorization: Bearer cxk_live_...

{ "webhook_secret": "whsec_xxxxxxxxxxxxx" }
```

The response now shows `"webhook_secret_present": true`. You're done.

### Verifying it works

Send a test email through the connection. Within a few seconds of delivery
the email's `status` should flip from `sent` → `delivered` and a new
`EmailEvent` row appears with `event_type: "delivered"`.

If the status stays `sent`:

- Check the Resend dashboard → Webhooks → your endpoint → recent deliveries.
  A `401` from CourierX means the signing secret doesn't match what's
  stored on the connection. Re-PATCH it.
- A `404` means the URL token doesn't match any connection (the connection
  may have been deleted, or you copied the URL from a different one).

---

## Postmark

Postmark webhooks aren't HMAC-signed — they're authenticated by HTTP Basic
Auth instead. The flow is the same shape, but the secret is the Basic Auth
password rather than a signing key.

### 1. Create the connection

```http
POST /api/v1/provider_connections
Authorization: Bearer cxk_live_...

{
  "provider": "postmark",
  "display_name": "Postmark Transactional",
  "api_key": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

Response includes a `webhook_url` like
`https://api.courierx.dev/api/v1/webhooks/postmark/<token>`.

### 2. Choose a Basic Auth password

Pick any high-entropy random string (e.g. `openssl rand -hex 32`). Save it
to the connection:

```http
PATCH /api/v1/provider_connections/<id>
{ "webhook_secret": "your-random-password" }
```

### 3. Configure Postmark

In the Postmark UI: **Servers → your server → Settings → Webhooks → Add
Webhook**.

- **URL**: paste the `webhook_url` from step 1, but **embed Basic Auth
  credentials in the URL** like:
  `https://USER:PASSWORD@api.courierx.dev/api/v1/webhooks/postmark/<token>`
  where `USER` can be any non-empty string (we only check the password)
  and `PASSWORD` is the value you set in step 2.
- **Events**: enable Delivery, Bounce, SpamComplaint. Optionally Open,
  Click, SubscriptionChange.

If you skip step 2 (no `webhook_secret`), the URL token alone is the
credential. That works (Postmark IPs are well-known and the token is
unguessable), but Basic Auth is recommended for defence-in-depth.

---

## Mailgun, SendGrid, AWS SES

These three providers use a single **global** signing key per CourierX
deployment, not per-connection. They are configured by the deployment
operator (not per tenant) via these env vars:

| Provider | Env var |
|----------|---------|
| SendGrid | `SENDGRID_WEBHOOK_VERIFICATION_KEY` (Signed Event Webhook ECDSA public key) |
| Mailgun  | `MAILGUN_WEBHOOK_SIGNING_KEY` |
| AWS SES  | (uses SNS message signature verification — no shared secret) |

If you're self-hosting CourierX with these providers, set those env vars
once and all tenants using that provider share them. Tenants don't need
to do anything beyond pointing the provider's webhook at
`/api/v1/webhooks/{sendgrid,mailgun,ses}` — there's no per-connection
token in those URLs because the signing scheme already isolates payloads
by provider account.

---

## FAQ

**Q: Why not use one global URL and one global secret like SendGrid?**
A: With BYOK, every tenant brings their own Resend/Postmark *account*. A
shared secret would mean every tenant could forge events for every other
tenant. Per-connection tokens + per-connection secrets prevent that.

**Q: What if the token leaks?**
A: An attacker still can't forge events without the signing secret
(Resend) or the Basic Auth password (Postmark). To rotate the token,
delete and recreate the connection (then re-add the webhook in your
provider's dashboard with the new URL).

**Q: Can I rotate the signing secret without recreating the connection?**
A: Yes — PATCH a new `webhook_secret` onto the connection any time. Your
provider's webhook will keep working as long as the secret in CourierX
matches the one your provider is signing with.
