# CourierX Deployment Guide

This guide provides instructions for deploying CourierX to various cloud platforms.

## Architecture Overview

CourierX consists of two main services:
- **Control Plane (Rails API)**: Business logic, authentication, multi-tenancy
- **Core Engine (Go)**: High-performance email sending, provider management

## Prerequisites

All deployment options require:
- A PostgreSQL database (15+)
- Redis (7+) for background jobs and caching
- Environment variables configured (see below)
- At least one email provider API key

## Environment Variables

Required environment variables for all deployments:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/courierx

# Redis
REDIS_URL=redis://localhost:6379/0

# Rails
RAILS_ENV=production
SECRET_KEY_BASE=your_secret_key_base_here
RAILS_SERVE_STATIC_FILES=true

# Go Core
GO_CORE_URL=http://core:8080
GO_CORE_SECRET=shared_secret_between_rails_and_go

# JWT
JWT_SECRET=your_jwt_secret_here

# Encryption (for provider credentials)
ENCRYPTION_KEY=your_32_byte_encryption_key

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
   - Railway will auto-detect the configuration

3. **Add PostgreSQL and Redis:**
   - In your project dashboard, click "New" → "Database" → "Add PostgreSQL"
   - Click "New" → "Database" → "Add Redis"
   - Railway will automatically set the connection URLs

4. **Set environment variables:**
   - Go to your service settings
   - Add all required environment variables

5. **Run migrations:**
   ```bash
   railway run -s control-plane bundle exec rails db:migrate
   railway run -s control-plane bundle exec rails db:seed
   ```

6. **Your API is live!**
   - Railway provides a public URL (e.g., `courierx-production.up.railway.app`)
   - Access API at: `https://your-app.railway.app/api/v1/`

---

## Render Deployment

Render offers easy deployment with Infrastructure as Code.

### Quick Deploy

1. **Deploy using Blueprint:**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Render will detect `infra/render.yaml`

2. **Configure environment variables:**
   - Add email provider API keys in the Render dashboard
   - Database and Redis are automatically provisioned

3. **Run migrations:**
   ```bash
   # Get shell access via Render dashboard
   # Inside the container:
   cd /app/control-plane
   bundle exec rails db:migrate
   bundle exec rails db:seed
   ```

4. **Your API is live!**
   - Access at: `https://courierx-api.onrender.com`

---

## Fly.io Deployment

Fly.io provides edge deployment with global distribution.

### Quick Deploy

1. **Install Fly CLI:**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Authenticate:**
   ```bash
   fly auth login
   ```

3. **Launch your app:**
   ```bash
   fly launch --config infra/fly.toml --no-deploy
   ```

4. **Create PostgreSQL and Redis:**
   ```bash
   # Create PostgreSQL database
   fly postgres create --name courierx-db --region iad
   fly postgres attach courierx-db --app courierx

   # Create Redis
   fly redis create --name courierx-redis --region iad
   ```

5. **Set environment variables:**
   ```bash
   fly secrets set SECRET_KEY_BASE=$(bin/rails secret)
   fly secrets set JWT_SECRET=$(openssl rand -hex 32)
   fly secrets set ENCRYPTION_KEY=$(openssl rand -hex 16)
   fly secrets set SENDGRID_API_KEY=xxxxx
   ```

6. **Deploy:**
   ```bash
   fly deploy --config infra/fly.toml
   ```

7. **Run migrations:**
   ```bash
   fly ssh console -a courierx-control-plane
   cd /app && bundle exec rails db:migrate db:seed
   ```

8. **Your API is live!**
   - Access at: `https://courierx.fly.dev`

---

## Docker Compose (Self-Hosted)

For self-hosted deployment on your own infrastructure.

### Development Environment

```bash
# Start all services (PostgreSQL, Redis, Rails, Go Core)
docker-compose -f infra/docker-compose.yml up -d

# Run migrations
docker-compose exec control-plane bundle exec rails db:migrate
docker-compose exec control-plane bundle exec rails db:seed

# Services:
# - Rails Control Plane: http://localhost:4000
# - Go Core Engine: http://localhost:8080
# - PostgreSQL: localhost:5432
# - Redis: localhost:6379
```

### Production Environment

```bash
# Build and start all services
docker-compose -f infra/docker-compose.prod.yml up -d

# Run migrations
docker-compose exec control-plane bundle exec rails db:migrate
docker-compose exec control-plane bundle exec rails db:seed
```

---

## Post-Deployment Setup

After deploying to any platform:

### 1. Create Your First Account

```bash
curl -X POST https://your-app.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "tenant": {"name": "My Company"},
    "user": {
      "email": "admin@mycompany.com",
      "password": "secure_password",
      "first_name": "John",
      "last_name": "Doe"
    }
  }'
```

### 2. Test Your Deployment

```bash
# Health check
curl https://your-app.com/api/v1/health

# Login and get JWT token
curl -X POST https://your-app.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@mycompany.com", "password": "secure_password"}'

# Create a product and get API key
curl -X POST https://your-app.com/api/v1/products \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "My App"}'

# Send a test email
curl -X POST https://your-app.com/api/v1/messages/send \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "from": "noreply@yourdomain.com",
    "subject": "Test Email",
    "html": "<h1>Hello from CourierX!</h1>"
  }'
```

### 3. Configure Providers

Set up your email providers via API or environment variables:

1. **Add Provider Credentials:**
   - Via environment variables (recommended for security)
   - Or store in database with encryption via API

2. **Configure DNS Records:**
   - SPF: `v=spf1 include:spf.sendgrid.net ~all`
   - DKIM: Add keys from provider
   - DMARC: `v=DMARC1; p=quarantine;`

3. **Set Up Webhooks:**
   - SendGrid: `https://your-app.com/webhooks/sendgrid`
   - Mailgun: `https://your-app.com/webhooks/mailgun`
   - AWS SES: `https://your-app.com/webhooks/ses`

### 4. Monitor Your Deployment

- **Health endpoint:** `/api/v1/health`
- **Metrics:** Prometheus metrics at `/metrics` (Go Core)
- Check platform-specific monitoring tools

---

## Scaling Considerations

### Horizontal Scaling

CourierX is designed to scale horizontally:

- **Control Plane (Rails):** Stateless, scale horizontally behind load balancer
- **Core Engine (Go):** Stateless, scale based on email volume
- **Database:** Use connection pooling (PgBouncer recommended)

### Database Optimization

For high-volume deployments:

1. **Connection Pooling:**
   - Use PgBouncer or pgpool-II
   - Configure pool size in DATABASE_URL

2. **Read Replicas:**
   - Configure read replicas for analytics queries
   - Route reads to replicas via DATABASE_REPLICA_URL

3. **Indexes:**
   - Already optimized in Rails migrations
   - Monitor slow queries and add as needed

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
# Check migration status
bundle exec rails db:migrate:status

# Reset and re-run migrations (DESTRUCTIVE)
bundle exec rails db:migrate:reset
```

**3. Rails-Go Communication Errors:**
- Verify GO_CORE_URL is accessible from Rails container
- Check GO_CORE_SECRET matches on both services
- Review logs: `docker-compose logs core`

**4. Health Check Failures:**
- Ensure database and Redis are accessible
- Check logs for connection errors
- Verify PORT environment variable

---

## Security Checklist

Before going to production:

- [ ] Use strong, unique DATABASE_URL password
- [ ] Enable SSL for database connections (`sslmode=require`)
- [ ] Set RAILS_ENV=production
- [ ] Generate strong SECRET_KEY_BASE
- [ ] Generate strong JWT_SECRET
- [ ] Generate strong ENCRYPTION_KEY
- [ ] Configure CORS for your domains
- [ ] Enable webhook signature verification
- [ ] Set up monitoring and alerting
- [ ] Configure backups for PostgreSQL
- [ ] Use secrets management (not .env in production)
- [ ] Enable rate limiting
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
- [Rails Deployment Guide](https://guides.rubyonrails.org/configuring.html#deploying-rails-applications)
