# @courierx/node

Official Node.js SDK for [CourierX](https://courierx.dev) — multi-provider email delivery platform.

## Installation

```bash
npm install @courierx/node
```

## Quick Start

```typescript
import { CourierX } from "@courierx/node";

const courierx = new CourierX({ apiKey: "cxk_live_your_api_key" });

// Send an email
const { email } = await courierx.emails.send({
  from: "hello@yourapp.com",
  to: "user@example.com",
  subject: "Welcome!",
  html: "<h1>Welcome to our platform</h1>",
});

console.log(email.id, email.status); // uuid, "queued"
```

## Usage

### Send an email

```typescript
const { email } = await courierx.emails.send({
  from: "hello@yourapp.com",
  fromName: "My App",
  to: "user@example.com",
  toName: "Jane Doe",
  replyTo: "support@yourapp.com",
  subject: "Order confirmed",
  html: "<h1>Your order is confirmed</h1><p>Thanks for your purchase.</p>",
  text: "Your order is confirmed. Thanks for your purchase.",
  tags: ["transactional", "order"],
  metadata: { orderId: "ord_123" },
});
```

### Idempotent sends

Pass an `idempotencyKey` in metadata to prevent duplicate sends within 24 hours:

```typescript
await courierx.emails.send({
  from: "hello@yourapp.com",
  to: "user@example.com",
  subject: "Welcome!",
  html: "<p>Welcome!</p>",
  metadata: { idempotency_key: "welcome-user-123" },
});
```

### List emails

```typescript
const emails = await courierx.emails.list({
  status: "delivered",
  page: 1,
  perPage: 25,
});
```

### Get email details

```typescript
const email = await courierx.emails.get("email-uuid");
console.log(email.status, email.events);
```

### Manage domains

```typescript
// List domains
const domains = await courierx.domains.list();

// Add a domain
const domain = await courierx.domains.create("mail.yourapp.com");

// Verify DNS
await courierx.domains.verify(domain.id);
```

### Manage API keys

```typescript
// List keys
const keys = await courierx.apiKeys.list();

// Create a key (full key is only returned once)
const newKey = await courierx.apiKeys.create("Production");
console.log(newKey.key); // cxk_live_...

// Revoke a key
await courierx.apiKeys.revoke(newKey.id);
```

## Configuration

```typescript
const courierx = new CourierX({
  apiKey: "cxk_live_your_api_key",
  baseUrl: "https://api.courierx.dev", // default
  timeout: 30000, // ms, default
});
```

### Self-hosted

If you're self-hosting CourierX, point the SDK to your own API:

```typescript
const courierx = new CourierX({
  apiKey: "cxk_live_your_api_key",
  baseUrl: "https://api.yourdomain.com",
});
```

## Error Handling

```typescript
import { CourierXError, AuthenticationError, RateLimitError } from "@courierx/node";

try {
  await courierx.emails.send({ /* ... */ });
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error("Invalid API key");
  } else if (error instanceof RateLimitError) {
    console.error("Rate limited — retry later");
  } else if (error instanceof CourierXError) {
    console.error(error.message, error.status, error.code);
  }
}
```

## Requirements

- Node.js 18+ (uses native `fetch`)

## License

MIT
