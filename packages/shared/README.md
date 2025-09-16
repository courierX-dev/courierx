# @courierx/shared

> Shared utilities and types for CourierX email delivery platform

[![npm version](https://badge.fury.io/js/@courierx%2Fshared.svg)](https://www.npmjs.com/package/@courierx/shared)

## Installation

```bash
npm install @courierx/shared
```

## What's Included

- **Zod Schemas** - Type-safe validation for email requests/responses
- **Crypto Utils** - Secure hashing and encryption functions  
- **PII Handling** - Email normalization and privacy protection
- **Constants** - Shared enums and configuration

## Quick Usage

```typescript
import { SendRequest, hashApiKey, normalizeEmail } from '@courierx/shared';

// Type-safe email request
const request: SendRequest = {
  to: ['user@example.com'],
  from: 'sender@yourdomain.com',
  subject: 'Hello World',
  html: '<p>Hello from CourierX!</p>'
};

// Hash API key for storage
const hashedKey = hashApiKey('your-api-key');

// Normalize email addresses
const normalized = normalizeEmail('User+tag@Example.COM');
// → 'user@example.com'
```

## API Reference

### Types
- `SendRequest` - Email request schema
- `SendResponse` - Email response schema  
- `WebhookEvent` - Webhook event schema

### Functions
- `hashApiKey(key: string): Buffer` - Hash API keys
- `encryptData(data: string, key: string): string` - Encrypt data
- `normalizeEmail(email: string): string` - Normalize emails
- `hashEmail(email: string): string` - Hash emails for privacy

## License

MIT
