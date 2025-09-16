# CourierX Setup Guide

This guide will help you set up CourierX with proper database connectivity and health checks.

## Prerequisites

- Node.js 20+
- pnpm 8+
- PostgreSQL database (local or Supabase)

## Quick Setup

### 1. Environment Configuration

Update your database connection in `apps/api/.env`:

```bash
# For Supabase (recommended)
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres?sslmode=require"

# For local PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/courierx"

NODE_ENV="development"
PORT=3000
```

### 2. Database Setup

Run the automated setup script:

```bash
cd apps/api
pnpm db:setup
```

This script will:
- ✅ Test database connectivity
- ✅ Run migrations if needed
- ✅ Generate Prisma client
- ✅ Seed demo data
- ✅ Verify setup completion

### 3. Start the API Server

```bash
pnpm dev
```

### 4. Verify Health Endpoints

Test the health endpoints:

```bash
# Basic health check
curl http://localhost:3000/v1/health

# Comprehensive readiness check
curl http://localhost:3000/v1/ready
```

Or use the automated test script:

```bash
./test-health.sh
```

## Manual Setup (Alternative)

If you prefer manual setup:

### 1. Generate Prisma Client

```bash
cd apps/api
pnpm db:generate
```

### 2. Run Migrations

```bash
pnpm db:migrate
```

### 3. Seed Demo Data

```bash
pnpm db:seed
```

## Health Endpoints

### GET /v1/health

Basic health check with database connectivity test.

**Response:**
```json
{
  "ok": true,
  "timestamp": "2024-12-16T10:30:00.000Z",
  "database": "connected",
  "version": "1.0.0"
}
```

### GET /v1/ready

Comprehensive readiness check including data integrity.

**Response:**
```json
{
  "ok": true,
  "timestamp": "2024-12-16T10:30:00.000Z",
  "database": "connected",
  "tenants": 1,
  "status": "ready"
}
```

## Troubleshooting

### Database Connection Issues

1. **Check DATABASE_URL format:**
   ```bash
   # Supabase format
   postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres?sslmode=require
   
   # Local format
   postgresql://user:password@localhost:5432/database_name
   ```

2. **Verify database is running:**
   ```bash
   # For local PostgreSQL
   pg_isready -h localhost -p 5432
   
   # For Supabase - check project status in dashboard
   ```

3. **Test connection manually:**
   ```bash
   psql "$DATABASE_URL" -c "SELECT 1;"
   ```

### Migration Issues

1. **Reset database (development only):**
   ```bash
   pnpm prisma migrate reset
   ```

2. **Force push schema:**
   ```bash
   pnpm prisma db push --force-reset
   ```

### Common Errors

**"Environment variable not found: DATABASE_URL"**
- Ensure `.env` file exists in `apps/api/`
- Check DATABASE_URL is properly set

**"Can't reach database server"**
- Verify database is running
- Check network connectivity
- Validate connection string format

**"Table 'tenants' doesn't exist"**
- Run migrations: `pnpm db:migrate`
- Or use setup script: `pnpm db:setup`

## Next Steps

After successful setup:

1. **Test email sending:**
   ```bash
   curl -X POST http://localhost:3000/v1/send \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"to":["test@example.com"],"from":"demo@courierx.dev","subject":"Test","text":"Hello World"}'
   ```

2. **Configure email providers** in `.env`

3. **Set up webhooks** for delivery tracking

4. **Deploy to production** using Docker or platform templates

## Support

- Check the [Development Checklist](DEVELOPMENT_CHECKLIST.md) for feature status
- Review [Database Schema](DATABASE_SCHEMA.md) for data model details
- See [README](README.md) for API documentation
