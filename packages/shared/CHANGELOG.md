# @courierx/shared

## 2.0.0

### Major Changes

- 8482b55: # 🎉 Initial Release - CourierX v1.0.0

  This is the initial release of the CourierX email delivery platform packages.

  ## 📦 What's New

  ### @courierx/shared
  - Zod validation schemas for email requests and responses
  - Crypto utilities for API key hashing and data encryption
  - PII handling utilities for email normalization and privacy
  - Shared constants and types

  ### @courierx/providers
  - Email provider adapters for SendGrid, Mailgun, AWS SES, SMTP, Resend, and Mock
  - Unified EmailProvider interface for consistent API
  - Error classification and retry logic
  - Tree-shakeable exports for optimal bundle sizes

  ### @courierx/client
  - Node.js HTTP client for CourierX API
  - TypeScript support with full type safety
  - API key and HMAC authentication
  - Automatic retries and error handling
  - Account information and usage tracking

  ### courierx (Meta Package)
  - Complete CourierX functionality in one package
  - Re-exports all other packages for convenience
  - Multi-provider setup examples and utilities

  ## 🚀 Getting Started

  ```bash
  # Install the complete package
  npm install courierx

  # Or install individual packages
  npm install @courierx/client @courierx/providers @courierx/shared
  ```

  ## 🔧 Usage

  ```typescript
  import { CourierXClient } from "courierx";

  const client = new CourierXClient({
    apiKey: "your-api-key",
  });

  await client.send({
    to: ["user@example.com"],
    from: "sender@yourdomain.com",
    subject: "Hello from CourierX",
    html: "<p>Welcome to CourierX!</p>",
  });
  ```

  ## 📚 Documentation
  - Complete API documentation with Swagger UI
  - Individual package READMEs with usage examples
  - TypeScript definitions for full IntelliSense support

  ## 🎯 Features
  - **Multi-Provider Support**: SendGrid, Mailgun, AWS SES, SMTP, and more
  - **Intelligent Routing**: Automatic failover and retry logic
  - **Enterprise Security**: API key authentication and HMAC signing
  - **TypeScript First**: Full type safety and excellent developer experience
  - **Production Ready**: Comprehensive testing and error handling

## 1.0.0

### Major Changes

- Initial release of CourierX - Multi-provider email delivery service
  - Multi-provider email support (SendGrid, Mailgun, AWS SES, SMTP, Mock)
  - Automatic failover between providers
  - API key authentication with tenant isolation
  - Webhook handling with signature verification
  - TypeScript-first with full type safety
  - Comprehensive testing suite
  - Production-ready NestJS API server
