# CourierX

> **Multi-provider email delivery service with intelligent routing and automatic failover**

[![npm version](https://badge.fury.io/js/courierx.svg)](https://www.npmjs.com/package/courierx)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

CourierX is a production-ready email delivery platform that intelligently routes emails across multiple providers with automatic failover, comprehensive webhook handling, and enterprise-grade features.

## ✨ Features

- 🚀 **Multi-Provider Support** - SendGrid, Mailgun, AWS SES, SMTP, Resend
- 🔄 **Intelligent Routing** - Automatic failover with priority-based selection  
- 📊 **Real-time Tracking** - Webhook processing with delivery status updates
- 🔒 **Enterprise Security** - API key auth, HMAC signing, rate limiting
- 🏢 **Multi-Tenant** - Complete tenant isolation with product-level config
- 📝 **TypeScript First** - Full type safety throughout the stack
- 🐳 **Docker Ready** - One-command deployment with Docker Compose

## 🚀 Quick Start

### Option 1: Use the API Service

```bash
# Start with Docker Compose
git clone https://github.com/courierX-dev/courierx.git
cd courierx
docker-compose up -d

# API available at http://localhost:3000
# Docs at http://localhost:3000/docs
```

### Option 2: Use as NPM Package

```bash
npm install courierx
```

```typescript
import { CourierXClient } from 'courierx';

const client = new CourierXClient({
  apiKey: 'your-api-key'
});

await client.send({
  to: ['user@example.com'],
  from: 'sender@yourdomain.com', 
  subject: 'Hello from CourierX',
  html: '<p>Your email content here</p>'
});
```

## 📦 Packages

| Package | Description | Size |
|---------|-------------|------|
| [`courierx`](./packages/courierx) | Complete package with all functionality | ~85KB |
| [`@courierx/client`](./packages/client-node) | Node.js API client | ~25KB |
| [`@courierx/providers`](./packages/providers) | Email provider adapters | ~45KB |
| [`@courierx/shared`](./packages/shared) | Shared utilities and types | ~15KB |

## 🔧 Supported Providers

| Provider | Status | Features |
|----------|--------|----------|
| **SendGrid** | ✅ | API, Webhooks, Templates |
| **Mailgun** | ✅ | API, Webhooks, Domains |
| **AWS SES** | ✅ | API, SNS Webhooks |
| **SMTP** | ✅ | Generic SMTP support |
| **Resend** | ✅ | Modern email API |
| **Mock** | ✅ | Testing & development |

## 📖 Documentation

- **[API Documentation](http://localhost:3000/docs)** - Interactive Swagger UI
- **[Setup Guide](./SETUP_GUIDE.md)** - Complete setup instructions  
- **[Provider Setup](./docs/providers.md)** - Configure email providers
- **[Webhooks](./docs/webhooks.md)** - Handle delivery events
- **[Examples](./examples)** - Code examples and templates

## 🏗️ Architecture

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

## 🛠️ Development

```bash
# Clone and setup
git clone https://github.com/courierX-dev/courierx.git
cd courierx
pnpm install

# Setup database
pnpm db:migrate
pnpm db:seed

# Start development
pnpm dev
```

### Running Tests

```bash
pnpm test        # Unit tests
pnpm test:e2e    # E2E tests (requires database)
```

## 🚢 Deployment

Deploy CourierX anywhere:

- **Docker** - `docker-compose up -d`
- **Railway** - One-click deploy button
- **Render** - Deploy with blueprint
- **Manual** - Any Node.js hosting

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🆘 Support

- 🐛 [Issues](https://github.com/courierX-dev/courierx/issues) - Bug reports
- 💬 [Discussions](https://github.com/courierX-dev/courierx/discussions) - Questions & support
- 📚 [Docs](http://localhost:3000/docs) - API reference

---

<p align="center">
  <strong>Built with ❤️ for developers who need reliable email delivery</strong>
</p>
