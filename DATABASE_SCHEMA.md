# CourierX Database Schema

## Overview

CourierX uses a comprehensive PostgreSQL schema designed for multi-tenancy, PII protection, and provider-agnostic email delivery with first-class webhook support.

## Key Design Principles

- **Multi-tenant by default**: Every row is traceable to a product and tenant
- **PII-aware**: Normalized + hashed email fields for indexing while preserving raw addresses
- **Provider-agnostic**: Unified interface for multiple email providers with failover
- **Webhook-first**: Built-in webhook ingestion and unified suppression management
- **Performance-optimized**: Strategic indexing and helper functions

## Core Entities

### Tenant
- **Purpose**: Owner/organization of one or more products
- **Key Fields**: `name`, `plan`
- **Relationships**: Has many products, provider accounts, domains, messages

### User
- **Purpose**: Admin UI users (future feature)
- **Key Fields**: `email`, `emailNorm`, `emailHash`, `displayName`
- **PII Handling**: Automatic email normalization and hashing via middleware

### Product
- **Purpose**: Logical app/project that sends mail
- **Key Fields**: `name`, `slug`, `defaultFrom`, `primaryProvider`, `ratePerHour`
- **Relationships**: Has API keys, routes, templates, messages

### ApiKey
- **Purpose**: Hashed API keys for server authentication
- **Key Fields**: `keyHash`, `hmacHash`, `active`
- **Security**: Only hashed values stored, plaintext shown once during creation

### ProviderAccount
- **Purpose**: Email provider credentials per tenant
- **Key Fields**: `type`, `credsCipher`, `credsMeta`, `enabled`
- **Security**: Credentials encrypted at rest

### Route
- **Purpose**: Maps products to providers with priority and role
- **Key Fields**: `role`, `priority`, `sticky`
- **Logic**: Enables failover routing between providers

## Email Handling

### Message
- **Purpose**: Attempted outbound email record
- **Key Fields**: `toEmail`, `toNorm`, `toHash`, `subject`, `providerUsed`
- **PII**: Automatic email normalization and hashing

### Event
- **Purpose**: Email lifecycle events (sent, bounce, complaint, etc.)
- **Key Fields**: `event`, `provider`, `metaJson`
- **Types**: `queued`, `sent`, `bounce`, `complaint`, `dropped`, `retry`, `open`, `click`

### WebhookEvent
- **Purpose**: Raw webhook payload archive
- **Key Fields**: `provider`, `payload`
- **Retention**: Short-term storage for debugging

### Suppression
- **Purpose**: Global/product-level email block list
- **Key Fields**: `email`, `emailNorm`, `emailHash`, `reason`, `source`
- **Scope**: Can be global (productId=null) or product-specific

## Supporting Features

### Template
- **Purpose**: Email templates with variable substitution
- **Key Fields**: `name`, `engine`, `subjectTpl`, `htmlTpl`
- **Engine**: Handlebars (hbs) by default

### SendingDomain
- **Purpose**: Domain authentication tracking
- **Key Fields**: `domain`, `spfStatus`, `dkimStatus`, `dmarcStatus`
- **DNS**: Tracks SPF/DKIM/DMARC validation status

### RateUsageHourly
- **Purpose**: Per-product hourly send counters
- **Key Fields**: `bucketStart`, `count`
- **Function**: Used by `bump_hourly_usage()` for rate limiting

### AuditLog
- **Purpose**: Admin action tracking
- **Key Fields**: `action`, `target`, `ip`, `actorUser`
- **Compliance**: Tracks changes to keys, routes, providers

## Database Functions

### bump_hourly_usage(product_id)
```sql
-- Atomically increments hourly usage counter
SELECT bump_hourly_usage('product-uuid'::uuid);
```

### v_product_stats (View)
```sql
-- 24-hour product statistics
SELECT * FROM v_product_stats WHERE product_id = 'uuid';
```

## Indexes

Performance-critical indexes:
- `messages(productId, createdAt DESC)` - Message history
- `events(event, createdAt DESC)` - Event filtering
- `events(productId, createdAt DESC)` - Product events
- `suppression(emailHash)` - Fast suppression lookup
- `routes(productId)` - Route resolution
- `api_keys(productId, active)` - API key validation

## PII Handling

### Automatic Processing
Prisma middleware automatically handles:
- `User.email` → `emailNorm` + `emailHash`
- `Message.toEmail` → `toNorm` + `toHash`
- `Suppression.email` → `emailNorm` + `emailHash`

### Email Normalization
```typescript
function normalizeEmail(email: string) {
  return email.toLowerCase().trim();
}

function hashEmail(email: string) {
  return crypto.createHash('sha256').update(normalizeEmail(email)).digest();
}
```

## Enums

### ProviderType
`sendgrid`, `ses`, `mailgun`, `smtp`, `resend`, `postmark`

### ProviderRole
`primary`, `secondary`

### EventKind
`queued`, `sent`, `bounce`, `complaint`, `dropped`, `retry`, `open`, `click`, `reject`, `deferred`

### MemberRole
`owner`, `admin`, `developer`, `viewer`

## Migration Strategy

1. **Schema Changes**: Use Prisma migrations
2. **Raw SQL**: Create separate migration files for functions/views/indexes
3. **Extensions**: Applied via migration (pgcrypto, uuid-ossp, pg_trgm)

## Supabase Configuration

- Use `DATABASE_URL` with `sslmode=require`
- Enable RLS for dashboard-facing tables (future)
- Server API uses service DB user for full access
- Webhook ingestion verifies provider signatures before writes

## Development Workflow

1. **Schema Changes**: `prisma migrate dev --name description`
2. **Generate Client**: `prisma generate`
3. **Seed Data**: `pnpm db:seed`
4. **Reset**: `prisma migrate reset` (development only)

## Production Considerations

- **Backup Strategy**: Regular PostgreSQL backups
- **Connection Pooling**: Use PgBouncer or similar
- **Monitoring**: Track query performance and connection usage
- **Retention**: Implement webhook event cleanup (30-90 days)
- **Encryption**: Provider credentials encrypted at application level

## Example Queries

### Check Suppression
```sql
SELECT * FROM suppression 
WHERE "emailHash" = decode(sha256('user@example.com'), 'hex')
AND ("productId" = $1 OR "productId" IS NULL);
```

### Product Stats
```sql
SELECT * FROM v_product_stats WHERE product_id = $1;
```

### Rate Limit Check
```sql
SELECT sum(count) FROM "rate_usage_hourly" 
WHERE "productId" = $1 
AND "bucketStart" >= date_trunc('hour', now());
```
