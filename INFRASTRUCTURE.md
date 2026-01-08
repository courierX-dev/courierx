# CourierX Infrastructure & Testing Setup

Complete reference for all infrastructure, testing, and development tools.

## Quick Start

```bash
# One-command setup
./scripts/dev-setup.sh

# This will:
# ✓ Start all development services (PostgreSQL, Redis, Mailhog, etc.)
# ✓ Setup Rails with database
# ✓ Setup Go Core
# ✓ Install testing tools (k6, pre-commit)
```

---

## Table of Contents

1. [Testing Infrastructure](#testing-infrastructure)
2. [Development Tools](#development-tools)
3. [Load Testing](#load-testing)
4. [CI/CD Pipeline](#cicd-pipeline)
5. [Monitoring & Observability](#monitoring--observability)
6. [Security & Code Quality](#security--code-quality)

---

## Testing Infrastructure

### Example Tests Available 🎯

Comprehensive example tests are included to serve as templates:

**Rails:**
- `spec/models/tenant_spec.rb` - Model testing (130+ lines)
- `spec/requests/api/v1/products_spec.rb` - API endpoint testing (300+ lines)
- `spec/services/jwt_service_spec.rb` - Service object testing
- `spec/integration/email_sending_flow_spec.rb` - Full system integration test
- `spec/README.md` - Complete testing guide

**Go:**
- `internal/email/sender_test.go` - Email sender tests with benchmarks (400+ lines)
- `internal/providers/mock/mock_provider_test.go` - Provider tests
- `internal/email/README.md` - Go testing guide

Use these as templates when implementing features!

---

### Rails Testing (RSpec + FactoryBot)

**Location**: `control-plane/spec/`

**Setup**:
```bash
cd control-plane
bundle install
RAILS_ENV=test bundle exec rails db:setup
```

**Run tests**:
```bash
bundle exec rspec                    # All tests
bundle exec rspec spec/models/       # Model tests only
COVERAGE=true bundle exec rspec      # With coverage
```

**Files created**:
- `spec/spec_helper.rb` - RSpec configuration
- `spec/rails_helper.rb` - Rails-specific configuration
- `spec/support/request_spec_helper.rb` - API test helpers
- `spec/factories/` - Test data factories (Tenants, Users, Products)
- `.rspec` - RSpec settings

**Features**:
- ✅ Code coverage with SimpleCov (>80% required)
- ✅ Database Cleaner for test isolation
- ✅ WebMock for HTTP stubbing
- ✅ FactoryBot for test data
- ✅ Shoulda Matchers for validations
- ✅ Custom helpers for JWT/API key auth

### Go Testing

**Location**: `apps/core-go/`

**Setup**:
```bash
cd apps/core-go
go mod download
```

**Run tests**:
```bash
make test              # All tests
make test-coverage     # HTML coverage report
make test-race         # Race detector
make bench             # Benchmarks
```

**Files created**:
- `Makefile` - Test commands
- `.golangci.yml` - Linter configuration
- `internal/providers/mock/` - Mock email provider
- `testhelpers/` - Test utilities

**Features**:
- ✅ Standard Go testing package
- ✅ Mock provider for email testing
- ✅ Table-driven tests
- ✅ Race detector
- ✅ Benchmarking
- ✅ golangci-lint integration

---

## Development Tools

### Docker Compose (Development)

**File**: `infra/docker-compose.dev.yml`

**Start all services**:
```bash
docker-compose -f infra/docker-compose.dev.yml up -d
```

**Services included**:

| Service | Port | Purpose | URL |
|---------|------|---------|-----|
| PostgreSQL | 5432 | Database | - |
| Redis | 6379 | Cache/Queue | - |
| **Mailhog** | 1025 (SMTP), 8025 (UI) | Email testing | http://localhost:8025 |
| **Redis Commander** | 8081 | Redis GUI | http://localhost:8081 |
| **pgAdmin** | 5050 | PostgreSQL GUI | http://localhost:5050 |

### Mailhog - Email Testing

Catches ALL outgoing emails for testing.

**Configuration**:
```bash
# In .env
SMTP_HOST=localhost
SMTP_PORT=1025
```

**Usage**:
1. Send email from your app
2. View it at: http://localhost:8025
3. No emails actually sent!

**Features**:
- View HTML/text emails
- Test email rendering
- Check headers
- API for automation

### Redis Commander

Visual interface for Redis data.

**Access**: http://localhost:8081

**Features**:
- Browse keys
- View queues
- Monitor performance
- Edit values

### pgAdmin

PostgreSQL database management.

**Access**: http://localhost:5050
**Login**: admin@courierx.local / admin

**First time setup**:
1. Add server: localhost:5432
2. Database: courierx
3. Username: courierx
4. Password: (from .env)

### ngrok - Webhook Testing

Expose local API for webhook testing.

**Setup**:
```bash
./scripts/ngrok-setup.sh

# Or manual:
ngrok http 4000
```

**Use case**:
- Test SendGrid webhooks locally
- Test Mailgun webhooks
- Test Stripe webhooks
- Debug OAuth callbacks

**Get URL**:
```bash
curl http://localhost:4040/api/tunnels
```

---

## Load Testing

### k6 Load Testing

**Location**: `tests/load/`

**Installation**:
```bash
# macOS
brew install k6

# Linux
sudo apt-get install k6
```

**Available tests**:

1. **send-email.js** - Email sending load test
   ```bash
   k6 run --env API_KEY=sk_xxx tests/load/send-email.js
   ```
   - 6 minutes
   - Up to 100 concurrent users
   - Tests p95 < 500ms

2. **api-endpoints.js** - API endpoint test
   ```bash
   k6 run --env JWT_TOKEN=ey... tests/load/api-endpoints.js
   ```
   - 5 minutes
   - 50 concurrent users
   - Tests all main endpoints

3. **stress-test.js** - Find breaking point
   ```bash
   k6 run tests/load/stress-test.js
   ```
   - 31 minutes
   - Up to 300 concurrent users
   - Identifies max capacity

**Results**:
```bash
# JSON output
k6 run --out json=results.json send-email.js

# InfluxDB + Grafana
k6 run --out influxdb=http://localhost:8086/k6 send-email.js
```

---

## CI/CD Pipeline

### GitHub Actions Workflows

**Location**: `.github/workflows/`

#### 1. Rails Tests (`rails-tests.yml`)

**Triggers**:
- Push to main/develop
- Pull requests
- Changes in `control-plane/`

**Jobs**:
- **test**: Run RSpec with PostgreSQL/Redis
- **lint**: Rubocop, Brakeman, Bundler Audit

**Services**:
- PostgreSQL 15
- Redis 7

#### 2. Go Tests (`go-tests.yml`)

**Triggers**:
- Push to main/develop
- Pull requests
- Changes in `apps/core-go/`

**Jobs**:
- **test**: Run tests with race detector and coverage
- **lint**: golangci-lint, gosec
- **build**: Build binary

#### 3. Integration Tests (`integration-tests.yml`)

**Triggers**:
- Push to main
- Pull requests to main
- Daily at 2 AM

**Flow**:
1. Start PostgreSQL + Redis
2. Setup Rails + Go
3. Start both services
4. Run integration tests
5. Upload logs on failure

#### 4. Load Tests (`load-tests.yml`)

**Trigger**: Manual only (workflow_dispatch)

**Parameters**:
- Target URL
- Test duration

**Outputs**:
- k6 results JSON
- PR comment with summary

### Running CI Locally

```bash
# Install act
brew install act

# Run Rails tests
act -j test -W .github/workflows/rails-tests.yml

# Run Go tests
act -j test -W .github/workflows/go-tests.yml
```

---

## Monitoring & Observability

### Prometheus (Metrics)

**Coming in Milestone 3**

**Port**: 9090
**Configuration**: `infra/monitoring/prometheus.yml`

**Metrics to track**:
- HTTP request duration
- Email send rate
- Provider health
- Database queries
- Queue depth

### Grafana (Dashboards)

**Coming in Milestone 3**

**Port**: 3001
**Login**: admin / admin

**Dashboards**:
- Email sending metrics
- Provider performance
- API performance
- System resources

### Jaeger (Tracing)

**Coming in Milestone 3**

**Port**: 16686

**Traces**:
- Request flow through system
- Rails → Go → Provider
- Slow query identification

---

## Security & Code Quality

### Pre-commit Hooks

**File**: `.pre-commit-config.yaml`

**Install**:
```bash
pip install pre-commit
pre-commit install
```

**Hooks**:
- ✅ Rubocop (Ruby linting)
- ✅ go fmt, go vet, golangci-lint
- ✅ Trailing whitespace
- ✅ Large file detection
- ✅ Secrets detection
- ✅ Conventional commit messages
- ✅ JSON/YAML validation

**Run manually**:
```bash
pre-commit run --all-files
```

### Security Scanning

**Rails**:
```bash
# Brakeman - security scanner
bundle exec brakeman

# Bundler Audit - dependency vulnerabilities
bundle exec bundle-audit check --update
```

**Go**:
```bash
# gosec - security scanner
make security

# Or directly
gosec ./...
```

### Linting

**Rails**:
```bash
bundle exec rubocop
bundle exec rubocop -a  # Auto-correct
```

**Go**:
```bash
make lint
make fmt  # Auto-format
```

---

## File Structure

```
courierx/
├── .github/
│   └── workflows/              # CI/CD pipelines
│       ├── rails-tests.yml
│       ├── go-tests.yml
│       ├── integration-tests.yml
│       └── load-tests.yml
│
├── apps/
│   └── core-go/
│       ├── Makefile            # Go test commands
│       ├── .golangci.yml       # Linter config
│       ├── internal/
│       │   └── providers/
│       │       └── mock/       # Mock provider
│       └── testhelpers/        # Test utilities
│
├── control-plane/
│   ├── .rspec                  # RSpec config
│   ├── Gemfile.test            # Test gems
│   └── spec/                   # RSpec tests
│       ├── spec_helper.rb
│       ├── rails_helper.rb
│       ├── factories/          # Test data
│       ├── models/
│       ├── requests/
│       └── support/
│
├── infra/
│   ├── docker-compose.dev.yml  # Dev tools
│   └── monitoring/             # Prometheus/Grafana config
│
├── scripts/
│   ├── dev-setup.sh           # One-command setup
│   └── ngrok-setup.sh         # Webhook testing
│
├── tests/
│   └── load/                   # k6 load tests
│       ├── send-email.js
│       ├── api-endpoints.js
│       ├── stress-test.js
│       └── README.md
│
├── .pre-commit-config.yaml     # Pre-commit hooks
├── TESTING.md                  # Testing guide
└── INFRASTRUCTURE.md           # This file
```

---

## Quick Reference

### Start Development
```bash
./scripts/dev-setup.sh          # One-command setup
docker-compose -f infra/docker-compose.dev.yml up -d
```

### Run Tests
```bash
# Rails
cd control-plane && bundle exec rspec

# Go
cd apps/core-go && make test

# Load tests
cd tests/load && k6 run send-email.js
```

### View Dev Tools
```bash
# Email testing
open http://localhost:8025

# Redis GUI
open http://localhost:8081

# Database GUI
open http://localhost:5050
```

### Webhook Testing
```bash
./scripts/ngrok-setup.sh        # Expose local API
```

### Code Quality
```bash
# Rails
bundle exec rubocop
bundle exec brakeman

# Go
make lint
make security

# Pre-commit
pre-commit run --all-files
```

---

## Troubleshooting

### Tests failing
```bash
# Reset test database
RAILS_ENV=test bundle exec rails db:reset

# Clean Go cache
go clean -testcache
```

### Services not starting
```bash
# Check Docker
docker-compose -f infra/docker-compose.dev.yml ps

# View logs
docker-compose -f infra/docker-compose.dev.yml logs -f
```

### Mailhog not catching emails
```bash
# Verify SMTP config
echo $SMTP_HOST $SMTP_PORT

# Should be: localhost 1025
```

---

## Next Steps

1. ✅ All testing infrastructure ready
2. ✅ Development tools configured
3. ✅ Load testing setup
4. ✅ CI/CD pipelines configured
5. 🔜 Start implementing features (see [MILESTONES.md](./docs/MILESTONES.md))

---

For more details:
- **Testing**: [TESTING.md](./TESTING.md)
- **Contributing**: [CONTRIBUTING.md](./CONTRIBUTING.md)
- **Development**: [IMPLEMENTATION_GUIDE.md](./docs/IMPLEMENTATION_GUIDE.md)
