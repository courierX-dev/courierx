# CourierX Setup Guide

Quick setup guide for getting CourierX running locally.

## Prerequisites

- Ruby 3.2+
- Go 1.21+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose

## Quick Start

### Option 1: Automated Setup (Recommended)

```bash
# Clone the repository
git clone https://github.com/courierx-dev/courierx.git
cd courierx

# Run the setup script
./infra/scripts/setup-dev.sh

# This will:
# - Start Docker containers (PostgreSQL, Redis)
# - Set up Rails database with migrations
# - Start all services
```

### Option 2: Manual Setup

```bash
# 1. Start infrastructure
docker-compose -f infra/docker-compose.yml up -d postgres redis

# 2. Set up Rails Control Plane
cd control-plane
cp .env.example .env
# Edit .env with your settings

bundle install
bundle exec rails db:create db:migrate db:seed

# 3. Set up Go Core
cd ../apps/core-go
cp .env.example .env
# Edit .env with your settings

go mod download
go build -o courierx-core cmd/server/main.go

# 4. Start services
# Terminal 1 - Rails API
cd control-plane
bundle exec rails server -p 4000

# Terminal 2 - Go Core
cd apps/core-go
./courierx-core
```

## Architecture Overview

CourierX uses a modern, decoupled architecture:

```
┌──────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js UI     │    │   Rails API      │    │   Go Core       │
│   Dashboard      │───▶│  Control Plane   │───▶│  Email Engine   │
│   (TypeScript)   │    │  (API-only)      │    │  (High perf)    │
└──────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                         │
         │                       │                         ▼
         ▼                       ▼                 ┌─────────────────┐
┌──────────────────┐    ┌──────────────────┐     │   Providers     │
│   Your App       │    │   PostgreSQL     │     │  SendGrid       │
│  (API Client)    │    │   + Redis        │     │  Mailgun        │
└──────────────────┘    └──────────────────┘     │  AWS SES        │
                                                  │  SMTP           │
                                                  └─────────────────┘
```

## Project Structure

```
courierx/
├── apps/
│   ├── core-go/           # Go email sending engine
│   └── dashboard/         # Next.js dashboard (Milestone 4)
├── control-plane/         # Rails API (API-only, no views)
├── infra/                 # Infrastructure & deployment
│   ├── docker/           # Dockerfiles
│   ├── kubernetes/       # K8s manifests
│   └── scripts/          # Deployment scripts
└── docs/                 # Documentation
```

## Environment Configuration

### Rails Control Plane (.env)

```bash
# Server
PORT=4000
RAILS_ENV=development

# Database
DATABASE_URL=postgresql://localhost/courierx

# Redis
REDIS_URL=redis://localhost:6379/0

# Authentication
JWT_SECRET=your-jwt-secret-here
ENCRYPTION_KEY=your-32-char-encryption-key

# Go Core Communication
GO_CORE_URL=http://localhost:8080
GO_CORE_SECRET=your-shared-secret-here

# Rails
SECRET_KEY_BASE=your-rails-secret-key-base

# Stripe (optional)
STRIPE_SECRET_KEY=sk_test_...
```

### Go Core (.env)

```bash
# Server
PORT=8080
GO_ENV=development

# Database
DATABASE_URL=postgresql://localhost/courierx

# Redis
REDIS_URL=redis://localhost:6379/0

# Control Plane Communication
CONTROL_PLANE_URL=http://localhost:4000
CONTROL_PLANE_SECRET=your-shared-secret-here

# Email Providers (configure as needed)
SENDGRID_API_KEY=
MAILGUN_API_KEY=
MAILGUN_DOMAIN=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1

# SMTP
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# Performance
MAX_WORKERS=100
QUEUE_BUFFER_SIZE=1000
RATE_LIMIT_PER_PROVIDER=100
```

**Important**: The `GO_CORE_SECRET` in Rails must match `CONTROL_PLANE_SECRET` in Go!

## Verify Installation

```bash
# Check Rails API
curl http://localhost:4000/health
# Should return: {"status":"ok"}

# Check Go Core
curl http://localhost:8080/health
# Should return: {"status":"healthy"}
```

## Common Issues

### Database Connection Error
```bash
# Ensure PostgreSQL is running
docker-compose -f infra/docker-compose.yml ps

# Create database if needed
cd control-plane
bundle exec rails db:create
```

### Port Already in Use
```bash
# Find and kill process using port 4000
lsof -ti:4000 | xargs kill -9

# Find and kill process using port 8080
lsof -ti:8080 | xargs kill -9
```

### Redis Connection Error
```bash
# Ensure Redis is running
docker-compose -f infra/docker-compose.yml up -d redis

# Test Redis connection
redis-cli ping
# Should return: PONG
```

## Next Steps

1. **Follow the development roadmap**: See [MILESTONES.md](./docs/MILESTONES.md)
2. **Implement core features**: Follow [IMPLEMENTATION_GUIDE.md](./docs/IMPLEMENTATION_GUIDE.md)
3. **Understand acceptance criteria**: See [STORY_DETAILS.md](./docs/STORY_DETAILS.md)

## Development Workflow

### Start Services
```bash
# Start everything
docker-compose -f infra/docker-compose.yml up -d

# View logs
docker-compose -f infra/docker-compose.yml logs -f
```

### Stop Services
```bash
docker-compose -f infra/docker-compose.yml down
```

### Run Tests
```bash
# Rails tests
cd control-plane
bundle exec rspec

# Go tests
cd apps/core-go
go test ./...
```

## Production Deployment

For production deployment instructions, see:
- [infra/DEPLOYMENT.md](./infra/DEPLOYMENT.md)
- [Production deployment script](./infra/scripts/deploy.sh)

## Getting Help

- 📚 [Documentation](./docs) - Implementation guides
- 🐛 [Issues](https://github.com/courierX-dev/courierx/issues) - Bug reports
- 💬 [Discussions](https://github.com/courierX-dev/courierx/discussions) - Questions

## Development Resources

- **Milestones**: [docs/MILESTONES.md](./docs/MILESTONES.md) - 380 story points across 10 sprints
- **Implementation Guide**: [docs/IMPLEMENTATION_GUIDE.md](./docs/IMPLEMENTATION_GUIDE.md) - Step-by-step instructions
- **Story Details**: [docs/STORY_DETAILS.md](./docs/STORY_DETAILS.md) - Acceptance criteria
- **Contributing**: [CONTRIBUTING.md](./CONTRIBUTING.md) - How to contribute

---

**Note**: CourierX is under active development. The dashboard (Next.js) is planned for Milestone 4.
Current focus is on backend infrastructure (Rails API + Go Core).
