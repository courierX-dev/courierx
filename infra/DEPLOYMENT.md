# CourierX Deployment Guide

This guide provides instructions for deploying CourierX to various cloud platforms.

## Prerequisites

All deployment options require:
- A PostgreSQL database (15+)
- Environment variables configured (see below)
- At least one email provider API key

## Environment Variables

Required environment variables for all deployments:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/courierx

# Server
NODE_ENV=production
PORT=3000

# Email Providers (at least one required)
SENDGRID_API_KEY=SG.xxxxx
MAILGUN_API_KEY=xxxxx
MAILGUN_DOMAIN=mg.example.com
AWS_ACCESS_KEY_ID=xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx
AWS_REGION=us-east-1

# SMTP (optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=xxxxx
```

---

## Railway Deployment

Railway provides one-click deployment with automatic database provisioning.

### Quick Deploy

1. **Deploy using template:**
   ```bash
   railway up
   ```

2. **Or use the web interface:**
   - Go to [Railway](https://railway.app)
   - Click "New Project" → "Deploy from GitHub"
   - Select your CourierX repository
   - Railway will auto-detect the `railway.json` configuration

3. **Add PostgreSQL:**
   - In your project dashboard, click "New" → "Database" → "Add PostgreSQL"
   - Railway will automatically set the `DATABASE_URL` environment variable

4. **Set environment variables:**
   - Go to your service settings
   - Add all required environment variables
   - At minimum: one email provider API key

5. **Run migrations:**
   ```bash
   railway run pnpm --filter @courierx/api prisma migrate deploy
   railway run pnpm --filter @courierx/api prisma:seed
   ```

6. **Your API is live!**
   - Railway provides a public URL (e.g., `courierx-production.up.railway.app`)
   - Access Swagger docs at: `https://your-app.railway.app/docs`

### Custom Configuration

Edit `infra/railway.json` to customize:
- Docker build settings
- Replica count
- Restart policies

---

## Render Deployment

Render offers easy deployment with Infrastructure as Code.

### Quick Deploy

1. **Deploy using Blueprint:**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Render will detect `infra/render.yaml`

2. **Or use Render CLI:**
   ```bash
   # Install Render CLI
   brew install render

   # Deploy
   render blueprint launch
   ```

3. **Configure environment variables:**
   - Render will prompt for required env vars during setup
   - Add email provider API keys in the Render dashboard
   - Database is automatically provisioned and connected

4. **Run migrations:**
   ```bash
   # Get shell access
   render ssh courierx-api

   # Inside the container
   pnpm --filter @courierx/api prisma migrate deploy
   pnpm --filter @courierx/api prisma:seed
   ```

5. **Your API is live!**
   - Access at: `https://courierx-api.onrender.com`
   - Swagger docs: `https://courierx-api.onrender.com/docs`

### Custom Configuration

Edit `infra/render.yaml` to customize:
- Instance size (plan: free/starter/standard)
- Database configuration
- Health check settings
- Auto-scaling policies

---

## Fly.io Deployment

Fly.io provides edge deployment with global distribution.

### Quick Deploy

1. **Install Fly CLI:**
   ```bash
   # macOS/Linux
   curl -L https://fly.io/install.sh | sh

   # Or via package manager
   brew install flyctl
   ```

2. **Authenticate:**
   ```bash
   fly auth login
   ```

3. **Launch your app:**
   ```bash
   # This uses infra/fly.toml configuration
   fly launch --config infra/fly.toml --no-deploy
   ```

4. **Create PostgreSQL database:**
   ```bash
   # Create database in the same region
   fly postgres create --name courierx-db --region iad

   # Attach to your app
   fly postgres attach courierx-db --app courierx
   ```

5. **Set environment variables:**
   ```bash
   fly secrets set SENDGRID_API_KEY=xxxxx
   fly secrets set MAILGUN_API_KEY=xxxxx
   fly secrets set MAILGUN_DOMAIN=mg.example.com
   fly secrets set AWS_ACCESS_KEY_ID=xxxxx
   fly secrets set AWS_SECRET_ACCESS_KEY=xxxxx
   ```

6. **Deploy:**
   ```bash
   fly deploy --config infra/fly.toml
   ```

7. **Run migrations:**
   ```bash
   # SSH into the app
   fly ssh console

   # Run migrations
   cd /app
   pnpm --filter @courierx/api prisma migrate deploy
   pnpm --filter @courierx/api prisma:seed
   ```

8. **Your API is live!**
   - Access at: `https://courierx.fly.dev`
   - Swagger docs: `https://courierx.fly.dev/docs`

### Custom Configuration

Edit `infra/fly.toml` to customize:
- VM size (cpu/memory)
- Regions (for global distribution)
- Auto-scaling settings
- Health checks

---

## Docker Compose (Self-Hosted)

For self-hosted deployment on your own infrastructure.

### Development Environment

```bash
# Start PostgreSQL + Redis
docker-compose -f infra/docker-compose.dev.yml up -d

# Set environment variables
cp apps/api/.env.example apps/api/.env
# Edit .env with your configuration

# Run migrations
pnpm --filter @courierx/api prisma migrate deploy
pnpm --filter @courierx/api prisma:seed

# Start API
pnpm dev
```

### Production Environment

```bash
# Build and start all services
docker-compose -f infra/docker-compose.full.yml up -d

# Run migrations
docker-compose exec api pnpm --filter @courierx/api prisma migrate deploy
docker-compose exec api pnpm --filter @courierx/api prisma:seed

# Your API is running on http://localhost:3000
```

---

## Post-Deployment Setup

After deploying to any platform:

### 1. Create Your First API Key

Use the seeded demo API key or create a new one:

```bash
# The seed script creates a demo API key
# Check the deployment logs for: "Demo API Key: cx_xxxxx"
```

### 2. Test Your Deployment

```bash
# Health check
curl https://your-app.com/v1/health

# Get account info (replace with your API key)
curl -H "Authorization: Bearer cx_xxxxx" \
     https://your-app.com/v1/me

# Send a test email
curl -X POST https://your-app.com/v1/send \
  -H "Authorization: Bearer cx_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "to": ["test@example.com"],
    "from": "noreply@yourdomain.com",
    "subject": "Test Email",
    "html": "<h1>Hello from CourierX!</h1>"
  }'
```

### 3. Configure Providers

Set up your email providers in the dashboard or via API:

1. **Add Provider Credentials:**
   - Via environment variables (recommended)
   - Or store in database with encryption

2. **Configure DNS Records:**
   - SPF: `v=spf1 include:spf.sendgrid.net ~all`
   - DKIM: Add keys from provider
   - DMARC: `v=DMARC1; p=quarantine;`

3. **Set Up Webhooks:**
   - SendGrid: `https://your-app.com/webhooks/sendgrid`
   - Mailgun: `https://your-app.com/webhooks/mailgun`
   - AWS SES: `https://your-app.com/webhooks/ses`

### 4. Monitor Your Deployment

- **Health endpoint:** `/v1/health`
- **Readiness endpoint:** `/v1/ready`
- **API docs:** `/docs` (Swagger UI)
- **Metrics:** Check platform-specific monitoring tools

---

## Scaling Considerations

### Horizontal Scaling

CourierX is designed to scale horizontally:

- **Stateless API:** All state in PostgreSQL
- **Connection pooling:** Configure via `DATABASE_URL`
- **Rate limiting:** Atomic database operations

### Database Optimization

For high-volume deployments:

1. **Connection Pooling:**
   ```bash
   DATABASE_URL=postgresql://user:pass@host:5432/courierx?connection_limit=10
   ```

2. **Read Replicas:**
   - Configure read replicas for heavy read operations
   - Route analytics queries to replicas

3. **Indexes:**
   - Already optimized in schema
   - Monitor slow queries and add as needed

### Performance Tuning

Adjust based on your load:

- **Railway:** Increase replica count in `railway.json`
- **Render:** Upgrade plan or enable auto-scaling
- **Fly.io:** Add regions and increase machine count

---

## Troubleshooting

### Common Issues

**1. Database Connection Errors:**
```bash
# Verify DATABASE_URL is correct
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

**2. Migration Failures:**
```bash
# Reset and re-run migrations
pnpm --filter @courierx/api prisma migrate reset
pnpm --filter @courierx/api prisma migrate deploy
```

**3. Provider Authentication Errors:**
- Verify API keys are correct
- Check environment variables are set
- Test provider credentials separately

**4. Health Check Failures:**
- Ensure database is accessible
- Check logs for connection errors
- Verify PORT environment variable

### Support

- **Documentation:** https://github.com/courierX-dev/courierx
- **Issues:** https://github.com/courierX-dev/courierx/issues
- **Community:** Join our Discord server

---

## Security Checklist

Before going to production:

- [ ] Use strong, unique DATABASE_URL password
- [ ] Enable SSL for database connections
- [ ] Set NODE_ENV=production
- [ ] Rotate API keys regularly
- [ ] Configure CORS for your domains
- [ ] Enable webhook signature verification
- [ ] Set up monitoring and alerting
- [ ] Configure backups for PostgreSQL
- [ ] Use secrets management (not .env in production)
- [ ] Enable rate limiting
- [ ] Review and update provider credentials
- [ ] Set up log aggregation
- [ ] Configure firewall rules
- [ ] Enable HTTPS/TLS everywhere

---

## Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Render Documentation](https://render.com/docs)
- [Fly.io Documentation](https://fly.io/docs)
- [CourierX GitHub](https://github.com/courierX-dev/courierx)
- [PostgreSQL Best Practices](https://www.postgresql.org/docs/current/index.html)
