# CourierX

> **Multi-provider email delivery service with intelligent routing and automatic failover**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Ruby](https://img.shields.io/badge/Ruby-3.2+-red.svg)](https://www.ruby-lang.org/)
[![Go](https://img.shields.io/badge/Go-1.21+-00ADD8.svg)](https://golang.org/)

CourierX is a production-ready email delivery platform that intelligently routes emails across multiple providers with automatic failover, comprehensive webhook handling, and enterprise-grade features.

## ✨ Features

- 🚀 **Multi-Provider Support** - SendGrid, Mailgun, AWS SES, SMTP, Postmark, Resend
- 🔄 **Intelligent Routing** - Automatic failover with priority-based selection
- 📊 **Real-time Tracking** - Webhook processing with delivery status updates
- 🔒 **Enterprise Security** - API key auth, JWT tokens, encrypted credentials
- 🏢 **Multi-Tenant** - Complete tenant isolation with product-level config
- ⚡ **High Performance** - Go-powered email engine with connection pooling
- 🐳 **Docker Ready** - One-command deployment with Docker Compose

## 🏗️ Architecture

```
┌──────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js UI     │    │   Rails API      │    │   Go Core       │
│   Dashboard      │───▶│  Control Plane   │───▶│  Email Engine   │
│   (TypeScript)   │    │  (API-only)      │    │  (High perf)    │
└──────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                         │
         │                       │                         ▼
         │                       │                 ┌─────────────────┐
         │                       │                 │   Providers     │
         ▼                       ▼                 │  SendGrid       │
┌──────────────────┐    ┌──────────────────┐     │  Mailgun        │
│   Your App       │    │   PostgreSQL     │     │  AWS SES        │
│  (API Client)    │    │   + Redis        │     │  SMTP           │
└──────────────────┘    └──────────────────┘     │  Postmark       │
                                                  │  Resend         │
                                                  └─────────────────┘
```

**Tech Stack:**
- **Frontend**: Next.js 14 + TypeScript (Dashboard UI, real-time analytics)
- **API**: Rails 7.1+ API-only (Authentication, multi-tenancy, business logic)
- **Engine**: Go 1.21+ (High-performance email sending, provider management)
- **Database**: PostgreSQL 15+ (with encryption for sensitive data)
- **Cache/Queue**: Redis 7+ (background jobs, rate limiting)
- **Infrastructure**: Docker, Kubernetes

**Why This Stack?**
- ✅ **Easy to hire for**: Massive talent pools for React, Rails, and Go
- ✅ **Industry standard**: Modern, well-documented technologies
- ✅ **Separation of concerns**: UI, API, and email engine are decoupled
- ✅ **Best tool for each job**: Next.js for rich UI, Rails for API, Go for performance

## 🚀 Quick Start

### Development Setup

```bash
# Clone repository
git clone https://github.com/courierX-dev/courierx.git
cd courierx

# Run setup script (sets up Docker, database, and all services)
./infra/scripts/setup-dev.sh

# Services will be available at:
# - Rails Control Plane: http://localhost:4000
# - Go Core Engine:      http://localhost:8080
# - PostgreSQL:          localhost:5432
# - Redis:               localhost:6379
```

### Using the API

```bash
# Register a new account
curl -X POST http://localhost:4000/api/v1/auth/register \
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

# Create a product and get API key
curl -X POST http://localhost:4000/api/v1/products \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "My App", "rate_limit": 1000}'

# Send an email
curl -X POST http://localhost:4000/api/v1/messages/send \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "from": "sender@yourdomain.com",
    "subject": "Hello from CourierX",
    "html": "<p>Your email content here</p>"
  }'
```

## 🔧 Supported Providers

| Provider | Status | Features |
|----------|--------|----------|
| **SendGrid** | ✅ | API, Webhooks, Templates |
| **Mailgun** | ✅ | API, Webhooks, Domains |
| **AWS SES** | ✅ | API, SNS Webhooks |
| **SMTP** | ✅ | Generic SMTP with connection pooling |
| **Postmark** | ✅ | Modern email API |
| **Resend** | ✅ | Developer-friendly API |

## 📖 Documentation

- **[Development Milestones](./docs/MILESTONES.md)** - Project roadmap with story points
- **[Implementation Guide](./docs/IMPLEMENTATION_GUIDE.md)** - Step-by-step development guide
- **[Story Details](./docs/STORY_DETAILS.md)** - Detailed acceptance criteria
- **[Setup Guide](./SETUP_COMPLETE.md)** - Complete setup instructions
- **[PR Automation](./docs/PR_AUTOMATION.md)** - Automated PR management

## 🛠️ Development

### Prerequisites

- Ruby 3.2+
- Go 1.21+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose

### Project Structure

```
courierx/
├── apps/
│   ├── core-go/           # Go email sending engine
│   └── dashboard/         # Next.js dashboard (coming in Milestone 4)
├── control-plane/         # Rails API (API-only, no views)
├── infra/                 # Infrastructure & deployment
│   ├── docker/           # Dockerfiles
│   ├── kubernetes/       # K8s manifests
│   └── scripts/          # Deployment scripts
└── docs/                 # Documentation
```

**Key Architectural Decisions:**
- **Rails**: API-only mode (no views, no asset pipeline)
- **Next.js**: Separate app for dashboard, connects via REST API
- **Go**: Standalone service, communicates with Rails via HTTP
- **All services**: Can be deployed independently

### Running Services

```bash
# Start all services
docker-compose -f infra/docker-compose.yml up -d

# View logs
docker-compose -f infra/docker-compose.yml logs -f

# Run Rails console
docker-compose -f infra/docker-compose.yml exec control-plane bundle exec rails console

# Run Go tests
cd apps/core-go && go test ./...

# Run Rails tests
cd control-plane && bundle exec rspec
```

### Database Migrations

```bash
# Create migration
cd control-plane
bundle exec rails generate migration AddFieldToModel field:type

# Run migrations
bundle exec rails db:migrate

# Seed database
bundle exec rails db:seed
```

## 🚢 Deployment

### Production Deployment

```bash
# Set up environment variables
cp .env.example .env.production
# Edit .env.production with your production values

# Deploy with script
./infra/scripts/deploy.sh
```

### Environment Variables

Required for production:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Secret for JWT token signing
- `ENCRYPTION_KEY` - Key for encrypting provider credentials
- `SECRET_KEY_BASE` - Rails secret key base
- `GO_CORE_SECRET` - Shared secret for Rails-Go communication

Provider credentials:
- `SENDGRID_API_KEY`
- `MAILGUN_API_KEY` & `MAILGUN_DOMAIN`
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`

### Deployment Options

- **Docker Compose** - Included configuration for multi-container deployment
- **Kubernetes** - K8s manifests in `infra/kubernetes/`
- **Cloud Platforms** - Deploy to AWS, GCP, Azure, DigitalOcean
- **Heroku/Railway/Render** - Platform-specific configurations available

## 📊 Project Status

**Current Phase**: Foundation & Core Infrastructure (Milestone 1)

### Completed ✅
- Project structure established
- Docker configurations complete
- Deployment scripts ready
- Comprehensive documentation (milestones, implementation guide)

### In Progress 🚧
- Rails core models (Milestone 1.1)

### Planned ⏳
- Authentication & authorization (Milestone 1.2)
- Go provider system (Milestone 1.3)
- Next.js dashboard (Milestone 4)

See [MILESTONES.md](./docs/MILESTONES.md) for full roadmap (380 story points / 10 sprints).

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Read [MILESTONES.md](./docs/MILESTONES.md) to understand the project roadmap
2. Check [IMPLEMENTATION_GUIDE.md](./docs/IMPLEMENTATION_GUIDE.md) for development guidelines
3. Pick a story from the milestones or create an issue
4. Fork, create a branch, and submit a PR

### Development Workflow

1. Create feature branch: `git checkout -b feature/CP-001-description`
2. Make changes following the implementation guide
3. Write tests (>80% coverage required)
4. Run linters: `bundle exec rubocop` (Rails), `golangci-lint run` (Go)
5. Submit PR with story reference

## 🧪 Testing

```bash
# Rails tests
cd control-plane
bundle exec rspec

# Go tests
cd apps/core-go
go test ./... -v

# Integration tests
# (Start all services first)
cd control-plane
bundle exec rspec spec/integration/
```

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🆘 Support

- 🐛 [Issues](https://github.com/courierX-dev/courierx/issues) - Bug reports
- 💬 [Discussions](https://github.com/courierX-dev/courierx/discussions) - Questions & support
- 📚 [Documentation](./docs) - Detailed guides

---

<p align="center">
  <strong>Built with ❤️ for developers who need reliable email delivery</strong>
</p>
