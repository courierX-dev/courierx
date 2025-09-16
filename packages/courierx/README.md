# courierx

> Complete email delivery platform with multi-provider support and intelligent routing

[![npm version](https://badge.fury.io/js/courierx.svg)](https://www.npmjs.com/package/courierx)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

The complete CourierX package - everything you need for reliable email delivery in one install.

## Installation

```bash
npm install courierx
```

## What's Included

This meta-package includes all CourierX functionality:

- **@courierx/client** - Node.js API client (~25KB)
- **@courierx/providers** - Email provider adapters (~45KB)  
- **@courierx/shared** - Shared utilities and types (~15KB)

**Total bundle size: ~85KB** (tree-shakeable)

## Quick Start

### Option 1: API Client (Recommended)

```typescript
import { CourierXClient } from 'courierx';

const client = new CourierXClient({
  apiKey: 'your-api-key'
});

await client.send({
  to: ['user@example.com'],
  from: 'sender@yourdomain.com',
  subject: 'Hello from CourierX',
  html: '<p>Hello World!</p>'
});
```

### Option 2: Direct Providers

```typescript
import { SendGridAdapter, MailgunAdapter } from 'courierx';

const sendgrid = new SendGridAdapter({ apiKey: 'sg-key' });
const mailgun = new MailgunAdapter({ apiKey: 'mg-key', domain: 'example.com' });

// Use any provider directly
await sendgrid.send(emailRequest);
```

### Option 3: Multi-Provider Failover

```typescript
import { SendGridAdapter, MailgunAdapter, ErrorClassifier } from 'courierx';

const providers = [
  new SendGridAdapter({ apiKey: 'sg-key' }),
  new MailgunAdapter({ apiKey: 'mg-key', domain: 'example.com' })
];

async function sendWithFailover(request) {
  for (const provider of providers) {
    try {
      return await provider.send(request);
    } catch (error) {
      const classified = ErrorClassifier.classify(error, provider.name);
      if (!classified.retryable) throw error; // Permanent failure
      // Continue to next provider for transient errors
    }
  }
  throw new Error('All providers failed');
}
```

## Features

### 🚀 **Multi-Provider Support**
SendGrid, Mailgun, AWS SES, SMTP, Resend with automatic failover

### 🔄 **Intelligent Routing**  
Priority-based provider selection with retry logic

### 📊 **Real-time Tracking**
Webhook processing with delivery status updates

### 🔒 **Enterprise Security**
API key auth, HMAC signing, rate limiting

### 📝 **TypeScript First**
Full type safety with excellent IntelliSense

### ⚡ **Performance**
Tree-shakeable imports, connection pooling, optimized bundles

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Your App      │    │   CourierX API   │    │   Providers     │
│                 │    │                  │    │                 │
│ ┌─────────────┐ │    │ ┌──────────────┐ │    │ SendGrid        │
│ │ courierx    │ │───▶│ │ Multi-tenant │ │───▶│ Mailgun         │
│ │ (npm pkg)   │ │    │ │ Email API    │ │    │ AWS SES         │
│ └─────────────┘ │    │ └──────────────┘ │    │ SMTP            │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Usage Patterns

**Most developers** → Use the API client for managed routing  
**Advanced users** → Use providers directly for custom logic  
**Enterprise** → Multi-provider setup with custom failover

## Tree Shaking

Import only what you need:

```typescript
// Only API client (~25KB)
import { CourierXClient } from 'courierx/client';

// Only SendGrid provider (~8KB)
import { SendGridAdapter } from 'courierx/providers/sendgrid';

// Only utilities (~15KB)
import { hashApiKey, normalizeEmail } from 'courierx/shared';
```

## Environment Variables

```bash
# API Client
COURIERX_API_KEY=your-api-key
COURIERX_BASE_URL=https://api.courierx.dev

# Direct Providers (optional)
SENDGRID_API_KEY=your-sendgrid-key
MAILGUN_API_KEY=your-mailgun-key
MAILGUN_DOMAIN=yourdomain.com
```

## Examples

- **[Basic Sending](https://github.com/courierX-dev/courierx/tree/main/examples/basic)** - Simple email sending
- **[Multi-Provider](https://github.com/courierX-dev/courierx/tree/main/examples/multi-provider)** - Failover setup
- **[Webhooks](https://github.com/courierX-dev/courierx/tree/main/examples/webhooks)** - Event handling
- **[Bulk Email](https://github.com/courierX-dev/courierx/tree/main/examples/bulk)** - High-volume sending

## Documentation

- **[API Docs](https://docs.courierx.dev)** - Complete API reference
- **[Provider Setup](https://docs.courierx.dev/providers)** - Configure providers
- **[Webhooks](https://docs.courierx.dev/webhooks)** - Handle events

## Support

- 🐛 [Issues](https://github.com/courierX-dev/courierx/issues) - Bug reports
- 💬 [Discussions](https://github.com/courierX-dev/courierx/discussions) - Support
- 📚 [Docs](https://docs.courierx.dev) - Guides & reference

## License

MIT
