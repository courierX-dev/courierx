# @courierx/providers

> Email provider adapters with intelligent routing and error handling

[![npm version](https://badge.fury.io/js/@courierx%2Fproviders.svg)](https://www.npmjs.com/package/@courierx/providers)

## Installation

```bash
npm install @courierx/providers
```

## Supported Providers

| Provider | Features | Bundle Size |
|----------|----------|-------------|
| **SendGrid** | API, Webhooks, Templates | ~8KB |
| **Mailgun** | API, Webhooks, Domains | ~7KB |
| **AWS SES** | API, SNS Webhooks | ~9KB |
| **SMTP** | Generic SMTP support | ~6KB |
| **Resend** | Modern email API | ~5KB |
| **Mock** | Testing & development | ~2KB |

## Quick Start

```typescript
import { SendGridAdapter, MailgunAdapter } from '@courierx/providers';

// SendGrid
const sendgrid = new SendGridAdapter({
  apiKey: 'your-sendgrid-api-key'
});

// Mailgun  
const mailgun = new MailgunAdapter({
  apiKey: 'your-mailgun-api-key',
  domain: 'yourdomain.com'
});

// Send with either provider
const result = await sendgrid.send({
  to: ['user@example.com'],
  from: 'sender@yourdomain.com',
  subject: 'Hello World',
  html: '<p>Hello from CourierX!</p>'
});
```

## Multi-Provider Setup

```typescript
import { SendGridAdapter, MailgunAdapter, ErrorClassifier } from '@courierx/providers';

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

## Provider Examples

### AWS SES
```typescript
import { SESAdapter } from '@courierx/providers';

const ses = new SESAdapter({
  accessKeyId: 'your-access-key',
  secretAccessKey: 'your-secret-key', 
  region: 'us-east-1'
});
```

### SMTP
```typescript
import { SMTPAdapter } from '@courierx/providers';

const smtp = new SMTPAdapter({
  host: 'smtp.yourdomain.com',
  port: 587,
  auth: { user: 'username', pass: 'password' }
});
```

## Tree Shaking

Import only what you need:

```typescript
// Only SendGrid (~8KB)
import { SendGridAdapter } from '@courierx/providers/sendgrid';

// Only Mailgun (~7KB)  
import { MailgunAdapter } from '@courierx/providers/mailgun';
```

## Error Handling

Built-in error classification for intelligent retry logic:

```typescript
import { ErrorClassifier, ErrorType } from '@courierx/providers';

try {
  await provider.send(request);
} catch (error) {
  const classified = ErrorClassifier.classify(error, 'sendgrid');
  
  if (classified.type === ErrorType.TRANSIENT) {
    // Retry with exponential backoff
    console.log(`Retryable: ${classified.category}`);
  } else {
    // Permanent failure - don't retry
    console.log(`Permanent: ${classified.category}`);
  }
}
```

## License

MIT
