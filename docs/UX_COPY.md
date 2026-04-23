# CourierX — UX Copy Guide

> **Tone principles for this product:**
> - **Developer-direct** on technical surfaces (errors, API keys, routing rules, code snippets) — precise, no fluff, respects the reader's expertise
> - **Friendly & clear** on onboarding and empty states — reduce friction, one concept at a time
> - **Enterprise polish** on high-stakes confirmations (deletes, billing, revocations) — measured, consequence-forward

---

## 1. Authentication

### 1.1 Sign Up

| Element | Copy |
|---------|------|
| Page headline | `Start sending email reliably` |
| Subhead | `One API. Every provider. Automatic failover.` |
| Name label | `Full name` |
| Email label | `Work email` |
| Password label | `Password` |
| Password hint | `At least 8 characters` |
| Primary CTA | `Create account` |
| Legal microcopy | `By creating an account you agree to our [Terms of Service] and [Privacy Policy].` |
| Already have account | `Already have an account? [Sign in]` |

**Alternatives — headline:**

| Option | Copy | Tone | Best For |
|--------|------|------|----------|
| A | `Start sending email reliably` | Clear benefit | Default |
| B | `Email delivery that doesn't let you down` | Problem-aware | Marketing landing |
| C | `Your email. Your providers. One API.` | Ownership/BYOK emphasis | BYOK-focused campaigns |

---

### 1.2 Log In

| Element | Copy |
|---------|------|
| Page headline | `Welcome back` |
| Email label | `Email` |
| Password label | `Password` |
| Forgot password link | `Forgot password?` |
| Primary CTA | `Sign in` |
| No account | `Don't have an account? [Get started]` |

**Error states:**

| Scenario | Copy |
|----------|------|
| Wrong credentials | `Incorrect email or password.` |
| Account locked (5 failed attempts) | `Account temporarily locked. Try again in 15 minutes or [reset your password].` |
| Unverified email | `Please verify your email before signing in. [Resend verification email]` |
| Network/server error | `Something went wrong on our end. Please try again.` |

---

### 1.3 Email Verification

| Element | Copy |
|---------|------|
| Page headline | `Check your inbox` |
| Body | `We sent a verification link to **{email}**. Click the link to activate your account.` |
| Resend CTA | `Resend email` |
| Resend confirmation | `Email sent. Check your spam folder if it doesn't arrive in a few minutes.` |
| After verification | `Email verified. [Sign in to continue →]` |
| Expired link | `This link has expired. [Request a new one]` |

---

### 1.4 Password Reset

| Element | Copy |
|---------|------|
| Page headline | `Reset your password` |
| Body | `Enter your email and we'll send you a reset link.` |
| Email label | `Email` |
| CTA | `Send reset link` |
| Confirmation | `Reset link sent. Check your inbox — and spam folder just in case.` |
| New password page headline | `Set a new password` |
| New password label | `New password` |
| Confirm label | `Confirm password` |
| CTA | `Update password` |
| Success | `Password updated. [Sign in →]` |
| Mismatch error | `Passwords don't match.` |
| Expired token | `This reset link has expired. [Request a new one]` |

---

## 2. Onboarding — First Run

### 2.1 Dashboard (No Setup Complete)

**Empty dashboard banner:**
> **Get ready to send**
> Connect a provider, verify a domain, and create an API key to start routing email through CourierX.
>
> [Connect a provider →]

**Progress checklist (inline):**
- [ ] Connect an email provider
- [ ] Verify a sending domain
- [ ] Create an API key
- [ ] Send a test email

---

### 2.2 Setup Steps — Microcopy

| Step | Headline | Helper text |
|------|----------|-------------|
| Provider | `Connect your first provider` | `CourierX routes email through providers you own. Bring your SendGrid, SES, or Mailgun credentials and we'll handle the rest.` |
| Domain | `Verify a sending domain` | `Add a domain you own and verify it with your DNS provider. Verification usually takes a few minutes.` |
| API Key | `Create an API key` | `Use this key to authenticate requests from your application. You'll only see the full key once.` |
| Test send | `Send a test email` | `Confirm your setup is working before going live.` |

---

## 3. Provider Connections (BYOK)

### 3.1 Empty State — No Providers

> **No providers connected**
>
> Add your first provider to start routing email. CourierX supports SendGrid, Mailgun, AWS SES, Postmark, Resend, and SMTP.
>
> [Connect a provider]

---

### 3.2 Add Provider — Modal

**Modal title:** `Connect a provider`

**Provider type selector label:** `Provider`

**Per-provider field labels:**

#### SendGrid
| Field | Label | Placeholder | Helper |
|-------|-------|-------------|--------|
| API key | `API key` | `SG.xxxxxxxxxxxx` | `Found in SendGrid → Settings → API Keys` |

#### Mailgun
| Field | Label | Placeholder | Helper |
|-------|-------|-------------|--------|
| API key | `API key` | `key-xxxxxxxxxxxxxxxx` | `Found in Mailgun → Settings → API Keys` |
| Sending domain | `Sending domain` | `mg.yourdomain.com` | `The Mailgun domain configured for this key` |
| Region | `Region` | — | `US or EU — must match your Mailgun account region` |

#### AWS SES
| Field | Label | Placeholder | Helper |
|-------|-------|-------------|--------|
| Access key ID | `Access key ID` | `AKIAIOSFODNN7EXAMPLE` | — |
| Secret access key | `Secret access key` | — | `Create an IAM user with `ses:SendEmail` permission` |
| Region | `Region` | `us-east-1` | `The AWS region where your SES identity is verified` |

#### Postmark
| Field | Label | Placeholder | Helper |
|-------|-------|-------------|--------|
| Server token | `Server token` | — | `Found in Postmark → Your Server → API Tokens` |

#### Resend
| Field | Label | Placeholder | Helper |
|-------|-------|-------------|--------|
| API key | `API key` | `re_xxxxxxxxxxxx` | `Found in Resend → API Keys` |

#### SMTP
| Field | Label | Placeholder | Helper |
|-------|-------|-------------|--------|
| SMTP host | `Host` | `smtp.example.com` | — |
| Port | `Port` | `587` | `587 (STARTTLS) or 465 (SSL)` |
| Username | `Username` | — | — |
| Password | `Password` | — | — |

**CTAs:** `Connect` / `Cancel`

---

### 3.3 Connection States

| State | Label | Helper text |
|-------|-------|-------------|
| Connecting | `Connecting…` | — |
| Success | `Connected` | `{ProviderName} is ready to use.` |
| Auth failure | `Authentication failed` | `Check your credentials and try again. Make sure the key has send permissions.` |
| Network error | `Connection failed` | `Couldn't reach {ProviderName}. Check your network and try again.` |
| Rate limited | `Provider rate limited` | `{ProviderName} is currently rate-limiting requests. This will resolve automatically.` |

---

### 3.4 Test Connection Button

| State | Copy |
|-------|------|
| Idle | `Test connection` |
| Loading | `Testing…` |
| Success | `Connection looks good` |
| Failure | `Test failed — {reason}` |

---

### 3.5 Delete Provider Confirmation

> **Remove {ProviderName}?**
>
> Any routing rules using this provider will stop working. This cannot be undone.
>
> `Remove provider` / `Keep it`

---

## 4. API Keys

### 4.1 Empty State

> **No API keys**
>
> Create an API key to authenticate requests from your application. Keys are prefixed `cxk_`.
>
> [Create API key]

---

### 4.2 Create Key — Modal

| Element | Copy |
|---------|------|
| Modal title | `Create API key` |
| Name label | `Name` |
| Name placeholder | `e.g. Production server` |
| Name helper | `A label to identify where this key is used.` |
| CTA | `Create key` |

**Key reveal (one-time display):**

> **Copy your API key now**
>
> `cxk_xxxxxxxxxxxxxxxxxxxx`
>
> This is the only time you'll see the full key. Store it somewhere safe — you won't be able to retrieve it again.
>
> [Copy key] [Done]

---

### 4.3 Key List — States

| Column | Values |
|--------|--------|
| Status | `Active` / `Revoked` |
| Last used | `Just now` / `2 hours ago` / `Never used` |

---

### 4.4 Revoke Key Confirmation

> **Revoke "{key name}"?**
>
> Any requests using this key will immediately stop working. This cannot be undone.
>
> `Revoke key` / `Keep key`

---

## 5. Domains

### 5.1 Empty State

> **No domains verified**
>
> Add a domain you control to use as your sending address. DNS verification usually takes a few minutes.
>
> [Add domain]

---

### 5.2 Add Domain — Modal

| Element | Copy |
|---------|------|
| Modal title | `Add a domain` |
| Domain label | `Domain` |
| Domain placeholder | `mail.yourdomain.com` |
| Helper | `Use a subdomain like `mail.` or `send.` to keep your root domain clean.` |
| CTA | `Add domain` |

---

### 5.3 Domain Verification States

| State | Label | Helper text |
|-------|-------|-------------|
| Pending | `Awaiting DNS` | `Add the records below to your DNS provider. Verification can take up to 48 hours.` |
| Verifying | `Checking DNS…` | `This usually resolves in a few minutes.` |
| Verified | `Verified` | — |
| Failed | `Verification failed` | `We couldn't find the required DNS records. Double-check the values below and try again.` |
| Expired | `Records expired` | `DNS records need to be re-added. Your domain was unverified after 48 hours without valid records.` |

**DNS record table helper:**
> Add these records to your DNS provider. Changes can take up to 48 hours to propagate, but usually happen in minutes.

**Re-check CTA:** `Check again`

---

### 5.4 Remove Domain Confirmation

> **Remove {domain}?**
>
> Emails from this domain will stop routing. Any routing rules scoped to this domain will be disabled.
>
> `Remove domain` / `Keep it`

---

## 6. Routing Rules

### 6.1 Empty State

> **No routing rules**
>
> Routing rules define which providers to use — and in what order — when sending from a domain. Without rules, CourierX falls back to your default provider.
>
> [Create routing rule]

---

### 6.2 Create Rule — Form Labels

| Element | Copy |
|---------|------|
| Page / modal title | `Create routing rule` |
| Name label | `Rule name` |
| Name placeholder | `e.g. Production fallback chain` |
| Domain label | `Domain` |
| Domain helper | `Apply this rule to emails sent from this domain.` |
| Strategy label | `Strategy` |
| Strategy options | `Priority failover` / `Round-robin` / `Weighted` |
| Priority order label | `Provider order` |
| Priority order helper | `Drag to reorder. CourierX tries providers top to bottom on failure.` |
| CTA | `Save rule` |

---

### 6.3 Routing Rule Status

| State | Label |
|-------|-------|
| Active | `Active` |
| Disabled | `Disabled` |
| No valid providers | `Degraded — no healthy providers` |

---

## 7. Email Logs

### 7.1 Empty State — No Emails Sent

> **No emails yet**
>
> Send your first email via the API or run a test send to see delivery logs here.
>
> [View API docs →]

---

### 7.2 Status Labels

| Status | Label | Tooltip |
|--------|-------|---------|
| `queued` | `Queued` | `Waiting to be sent` |
| `sending` | `Sending` | `Being delivered to the provider` |
| `delivered` | `Delivered` | `Accepted by the provider` |
| `bounced` | `Bounced` | `The recipient address rejected the message` |
| `failed` | `Failed` | `All providers failed to accept this message` |
| `cancelled` | `Cancelled` | `Cancelled before sending` |
| `suppressed` | `Suppressed` | `Recipient is on your suppression list` |

---

### 7.3 Email Detail — Event Timeline Labels

| Event | Label |
|-------|-------|
| `queued` | `Queued for delivery` |
| `dispatched_to_provider` | `Handed off to {ProviderName}` |
| `delivered` | `Delivered by {ProviderName}` |
| `provider_failed` | `{ProviderName} rejected — trying next provider` |
| `all_providers_failed` | `All providers failed` |
| `bounced` | `Bounced — {bounce reason}` |
| `opened` | `Opened` |
| `clicked` | `Link clicked` |
| `unsubscribed` | `Recipient unsubscribed` |
| `complaint` | `Spam complaint received` |

---

### 7.4 Failed Email — Error Detail

**Structure:** What failed → Why → What to do

| Scenario | Copy |
|----------|------|
| All providers failed | `Delivery failed. All providers in your routing chain returned errors. Check your provider connections and routing rules.` |
| Auth failure on provider | `{ProviderName} rejected the request — authentication failed. [Update your {ProviderName} credentials →]` |
| Recipient invalid | `Delivery failed. The recipient address `{email}` is invalid or doesn't exist.` |
| Domain not verified | `Delivery failed. The sending domain `{domain}` is not verified. [Verify domain →]` |
| Suppressed recipient | `Not sent. `{email}` is on your suppression list. [View suppressions →]` |

---

## 8. Suppressions

### 8.1 Empty State

> **No suppressions**
>
> CourierX automatically suppresses addresses that bounce or mark your emails as spam. You can also add addresses manually.
>
> [Add address]

---

### 8.2 Add Suppression Modal

| Element | Copy |
|---------|------|
| Modal title | `Suppress an address` |
| Email label | `Email address` |
| Reason label | `Reason` |
| Reason options | `Manual` / `Bounce` / `Complaint` / `Unsubscribe` |
| CTA | `Add to suppression list` |

---

### 8.3 Remove Suppression Confirmation

> **Remove `{email}` from suppressions?**
>
> Future emails to this address will be delivered again (subject to provider rules).
>
> `Remove` / `Keep suppressed`

---

## 9. Webhooks

### 9.1 Empty State

> **No webhook endpoints**
>
> Register a URL to receive real-time delivery events — delivered, bounced, opened, and more.
>
> [Add endpoint]

---

### 9.2 Add Endpoint Modal

| Element | Copy |
|---------|------|
| Modal title | `Add webhook endpoint` |
| URL label | `Endpoint URL` |
| URL placeholder | `https://yourapp.com/webhooks/courierx` |
| URL helper | `Must be HTTPS and publicly accessible.` |
| Events label | `Events to send` |
| Events helper | `Leave empty to receive all events.` |
| CTA | `Add endpoint` |

---

### 9.3 Webhook Delivery States

| State | Label | Helper |
|-------|-------|--------|
| Active | `Active` | — |
| Failing | `Failing` | `Endpoint has been returning errors. We'll keep retrying.` |
| Disabled | `Disabled` | `No events will be delivered to this endpoint.` |

**Failed delivery tooltip:**
> Last attempt failed with HTTP {status}. We'll retry with exponential backoff for up to 24 hours.

---

## 10. Analytics & Usage

### 10.1 Empty State — No Data

> **No data yet**
>
> Analytics will appear once you start sending email.

---

### 10.2 Metric Labels

| Metric | Label | Tooltip |
|--------|-------|---------|
| Total sent | `Sent` | `Emails accepted by a provider` |
| Delivered | `Delivered` | `Confirmed delivered to inbox` |
| Delivery rate | `Delivery rate` | `Delivered ÷ Sent` |
| Bounced | `Bounced` | `Hard and soft bounces` |
| Bounce rate | `Bounce rate` | `Bounced ÷ Sent` |
| Complaints | `Complaints` | `Spam reports from recipients` |
| Suppressed | `Suppressed` | `Emails blocked by suppression list` |

---

## 11. Global Patterns

### 11.1 Loading States

| Context | Copy |
|---------|------|
| Page load | `Loading…` |
| Sending email | `Queuing email…` |
| Saving settings | `Saving…` |
| Verifying domain | `Checking DNS…` |
| Testing provider | `Testing connection…` |

---

### 11.2 Generic Success Messages

| Action | Toast copy |
|--------|------------|
| Settings saved | `Changes saved` |
| Key created | `API key created` |
| Provider connected | `Provider connected` |
| Domain added | `Domain added — add DNS records to verify` |
| Webhook added | `Endpoint added` |
| Email sent (test) | `Test email queued` |

---

### 11.3 Generic Error Messages

| Scenario | Copy |
|----------|------|
| Server error | `Something went wrong. Please try again.` |
| Network offline | `No connection. Check your network and try again.` |
| Permission denied | `You don't have permission to do this.` |
| Not found | `We couldn't find what you were looking for.` |
| Rate limited (dashboard) | `Too many requests. Slow down and try again in a moment.` |
| Validation — required field | `This field is required.` |
| Validation — invalid email | `Enter a valid email address.` |
| Validation — invalid URL | `Enter a valid URL starting with https://.` |

---

### 11.4 Destructive Action Buttons

Always use the action verb — never "OK" or "Yes":

| Action | Primary button | Cancel button |
|--------|---------------|---------------|
| Delete something | `Delete {thing}` | `Keep {thing}` |
| Revoke a key | `Revoke key` | `Keep key` |
| Remove a provider | `Remove provider` | `Keep it` |
| Remove a domain | `Remove domain` | `Keep it` |
| Remove a suppression | `Remove` | `Keep suppressed` |
| Disable a rule | `Disable rule` | `Cancel` |

---

### 11.5 Empty State Template

Use this pattern consistently:

> **[What this section is]**
>
> [One sentence explaining what it's for and why it's empty.]
>
> [Primary CTA]

---

## 12. Localization Notes

- Avoid idioms: "ballpark", "take a stab at", "reach out" — use literal alternatives ("estimate", "try", "contact")
- Dates and times: display in the user's local timezone with an explicit offset for ambiguous contexts (e.g. webhook log timestamps)
- Pluralization: always account for 0, 1, and many — "0 emails", "1 email", "3 emails"
- Button labels should be short enough to survive 30–40% text expansion in German/French
- "BYOK" is an internal term — never use it in UI copy; say "your provider credentials" or "your own keys"
- Provider names are proper nouns — always capitalize: SendGrid, Mailgun, AWS SES, Postmark, Resend
