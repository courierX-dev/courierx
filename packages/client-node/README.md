# @courierx/client

> Official Node.js client for CourierX email delivery API

[![npm version](https://badge.fury.io/js/@courierx%2Fclient.svg)](https://www.npmjs.com/package/@courierx/client)

## Installation

```bash
npm install @courierx/client
```

## Quick Start

```typescript
import { CourierXClient } from '@courierx/client';

const client = new CourierXClient({
  apiKey: 'your-api-key'
});

const result = await client.send({
  to: ['user@example.com'],
  from: 'sender@yourdomain.com',
  subject: 'Hello from CourierX',
  html: '<p>Hello World!</p>'
});

console.log(`Email sent: ${result.messageId}`);
```

## Features

- ✅ **TypeScript Support** - Full type safety and IntelliSense
- ✅ **Promise-based API** - Modern async/await support  
- ✅ **Automatic Retries** - Built-in retry logic for failures
- ✅ **Error Handling** - Detailed error messages and status codes
- ✅ **HMAC Authentication** - Optional request signing
- ✅ **Rate Limit Handling** - Automatic backoff on limits

## Authentication

```typescript
// API Key (required)
const client = new CourierXClient({
  apiKey: 'your-api-key'
});

// With HMAC signing (optional, enhanced security)
const client = new CourierXClient({
  apiKey: 'your-api-key',
  hmacSecret: 'your-hmac-secret',
  enableHmac: true
});
```

## API Reference

### Send Email

```typescript
const result = await client.send({
  to: ['user@example.com'],           // required
  from: 'sender@yourdomain.com',      // required  
  subject: 'Your Subject',            // required
  html: '<p>HTML content</p>',        // optional
  text: 'Plain text content',         // optional
  attachments: [{                     // optional
    filename: 'document.pdf',
    content: 'base64-content',
    contentType: 'application/pdf'
  }],
  headers: { 'X-Custom': 'value' },   // optional
  tags: ['welcome', 'onboarding'],    // optional
  metadata: { userId: '123' }         // optional
});
```

### Get Account Info

```typescript
const account = await client.me();
console.log(`Rate limit: ${account.usage.remainingThisHour}/${account.product.rateLimitPerHour}`);
```

## Error Handling

```typescript
import { CourierXError, RateLimitError, ValidationError } from '@courierx/client';

try {
  await client.send(emailRequest);
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log(`Rate limited. Retry after: ${error.retryAfter}s`);
  } else if (error instanceof ValidationError) {
    console.log(`Validation error: ${error.message}`);
  } else if (error instanceof CourierXError) {
    console.log(`API error: ${error.message} (${error.statusCode})`);
  }
}
```

## Configuration

```typescript
const client = new CourierXClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.courierx.dev',  // optional
  timeout: 30000,                       // optional (30s)
  retries: 3,                          // optional
  retryDelay: 1000,                    // optional (1s)
  hmacSecret: 'your-hmac-secret',      // optional
  enableHmac: false                    // optional
});
```

## Environment Variables

```bash
COURIERX_API_KEY=your-api-key
COURIERX_BASE_URL=https://api.courierx.dev
COURIERX_HMAC_SECRET=your-hmac-secret
```

```typescript
// Auto-loads from environment
const client = new CourierXClient();
```

## Examples

### With Attachments

```typescript
import { readFileSync } from 'fs';

const pdfContent = readFileSync('document.pdf').toString('base64');

await client.send({
  to: ['user@example.com'],
  from: 'docs@yourdomain.com',
  subject: 'Your document',
  html: '<p>Document attached.</p>',
  attachments: [{
    filename: 'document.pdf',
    content: pdfContent,
    contentType: 'application/pdf'
  }]
});
```

### Bulk Email

```typescript
const users = [
  { email: 'user1@example.com', name: 'John' },
  { email: 'user2@example.com', name: 'Jane' }
];

for (const user of users) {
  await client.send({
    to: [user.email],
    from: 'newsletter@yourdomain.com',
    subject: `Hello ${user.name}!`,
    html: `<p>Hello ${user.name}!</p>`,
    metadata: { userId: user.id },
    tags: ['newsletter']
  });
}
```

## TypeScript

Full type safety included:

```typescript
import type { SendRequest, SendResponse } from '@courierx/client';

const request: SendRequest = { /* ... */ };
const response: SendResponse = await client.send(request);
```

## License

MIT
