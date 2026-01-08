# Contributing to CourierX

We love your input! We want to make contributing to CourierX as easy and transparent as possible.

## Development Process

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code lints
6. Issue that pull request!

## Development Setup

```bash
# Clone your fork
git clone https://github.com/your-username/courierx.git
cd courierx

# Run the automated setup script
./infra/scripts/setup-dev.sh

# This will:
# - Start Docker containers (PostgreSQL, Redis)
# - Set up Rails database
# - Start all services
```

### Manual Setup (Alternative)

```bash
# Start infrastructure
docker-compose -f infra/docker-compose.yml up -d postgres redis

# Set up Rails
cd control-plane
cp .env.example .env
bundle install
bundle exec rails db:create db:migrate db:seed

# Set up Go Core
cd ../apps/core-go
cp .env.example .env
go mod download

# Start services
cd control-plane && bundle exec rails server -p 4000 &
cd apps/core-go && go run cmd/server/main.go &
```

## Project Structure

```
courierx/
├── apps/
│   ├── core-go/           # Go email sending engine
│   └── dashboard/         # Next.js dashboard (Milestone 4)
├── control-plane/         # Rails API (API-only mode)
├── infra/                 # Infrastructure & deployment
└── docs/                  # Documentation
```

## Pull Request Process

1. Update the README.md with details of changes to the interface
2. Follow the story structure in [MILESTONES.md](./docs/MILESTONES.md)
3. Reference the story ID in your PR (e.g., `[CP-001] Add Tenant model`)
4. The PR will be merged once you have the sign-off of a maintainer

## Coding Standards

### Rails (Ruby)
- Follow Ruby style guide
- Use Rubocop for linting: `bundle exec rubocop`
- Write RSpec tests for all models and controllers
- Code coverage >80% required

### Go
- Follow Go best practices
- Format with `gofmt` and lint with `golangci-lint`
- Write tests using Go's testing package
- Code coverage >80% required

### Next.js (TypeScript) - When working on dashboard
- Use TypeScript strict mode
- Follow React best practices
- Use ESLint + Prettier
- Write tests with Vitest or Jest
- Keep components small and focused

### Git Commits
- Use conventional commit messages:
  - `feat(models): add Tenant model with validations`
  - `fix(auth): resolve JWT expiration issue`
  - `docs: update API documentation`
  - `test: add unit tests for Provider model`
- Reference story IDs: `feat(CP-001): add Tenant model`
- Keep commits atomic and well-described

## Testing

### Rails Tests
```bash
cd control-plane

# Run all tests
bundle exec rspec

# Run specific test file
bundle exec rspec spec/models/tenant_spec.rb

# Run with coverage
COVERAGE=true bundle exec rspec
```

### Go Tests
```bash
cd apps/core-go

# Run all tests
go test ./...

# Run with coverage
go test ./... -cover

# Run with verbose output
go test ./... -v
```

### Next.js Tests (Milestone 4)
```bash
cd apps/dashboard

# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Run with coverage
npm run test:coverage
```

## Adding New Features

Follow the implementation guides in the documentation:

1. **New Rails Model**: See [Epic 1.1 in IMPLEMENTATION_GUIDE.md](./docs/IMPLEMENTATION_GUIDE.md#epic-11-rails-core-models)
2. **New API Endpoint**: See [Epic 2.1 in IMPLEMENTATION_GUIDE.md](./docs/IMPLEMENTATION_GUIDE.md#epic-21-rails-api-endpoints)
3. **New Go Provider**: See [Epic 1.3 in IMPLEMENTATION_GUIDE.md](./docs/IMPLEMENTATION_GUIDE.md#epic-13-go-provider-system)
4. **New Dashboard Page**: See [Epic 4.1 in IMPLEMENTATION_GUIDE.md](./docs/IMPLEMENTATION_GUIDE.md#epic-41-nextjs-dashboard)

## Adding New Email Providers

1. Create a new provider in `apps/core-go/internal/providers/`
2. Implement the `Provider` interface:
   ```go
   type Provider interface {
       Send(ctx context.Context, email *Email) (*SendResult, error)
       HealthCheck(ctx context.Context) error
       Name() string
   }
   ```
3. Add configuration in `control-plane/app/models/provider_account.rb`
4. Add credential validation in the model
5. Add webhook handling if supported (in Go Core)
6. Write integration tests
7. Document the provider setup

Example provider structure:
```go
// apps/core-go/internal/providers/newprovider.go
package providers

type NewProviderConfig struct {
    APIKey string
    Region string
}

type NewProvider struct {
    config NewProviderConfig
    client *http.Client
}

func NewNewProvider(cfg NewProviderConfig) *NewProvider {
    return &NewProvider{
        config: cfg,
        client: &http.Client{Timeout: 30 * time.Second},
    }
}

func (p *NewProvider) Send(ctx context.Context, email *Email) (*SendResult, error) {
    // Implementation
}

func (p *NewProvider) HealthCheck(ctx context.Context) error {
    // Implementation
}

func (p *NewProvider) Name() string {
    return "newprovider"
}
```

## Documentation

When contributing, update relevant documentation:

- **README.md** - For user-facing changes
- **MILESTONES.md** - If adding new features or epics
- **IMPLEMENTATION_GUIDE.md** - For implementation details
- **STORY_DETAILS.md** - For acceptance criteria
- **API docs** - For API changes (use OpenAPI/Swagger)

## Code Review Process

1. All code must be reviewed by at least one maintainer
2. Address all review comments
3. Ensure CI passes (tests, linting)
4. Keep the PR focused and reasonably sized
5. Be patient and respectful

## Getting Help

- 🐛 [Issues](https://github.com/courierX-dev/courierx/issues) - Bug reports
- 💬 [Discussions](https://github.com/courierX-dev/courierx/discussions) - Questions
- 📚 [Documentation](./docs) - Implementation guides

## Development Tips

1. **Database changes**: Always create a migration and update the schema
2. **API changes**: Update both Rails API and any affected Go code
3. **Breaking changes**: Document clearly and increment version appropriately
4. **Performance**: Profile before optimizing, measure the impact
5. **Security**: Never commit secrets, use environment variables

## Common Tasks

### Create a new Rails migration
```bash
cd control-plane
bundle exec rails generate migration AddFieldToModel field:type
bundle exec rails db:migrate
```

### Create a new Rails model
```bash
cd control-plane
bundle exec rails generate model ModelName field:type
bundle exec rails db:migrate
```

### Update Go dependencies
```bash
cd apps/core-go
go get -u ./...
go mod tidy
```

### Run linters
```bash
# Rails
cd control-plane
bundle exec rubocop

# Go
cd apps/core-go
golangci-lint run

# Fix auto-fixable issues
bundle exec rubocop -a  # Rails
golangci-lint run --fix # Go
```

## Release Process

1. Ensure all tests pass
2. Update CHANGELOG.md
3. Update version numbers
4. Create a git tag
5. Maintainers will handle the release

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Don't hesitate to ask questions in discussions or open an issue. We're here to help!
