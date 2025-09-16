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

# Install dependencies
pnpm install

# Start development environment
docker-compose -f infra/docker-compose.dev.yml up -d

# Set up environment
cp apps/api/.env.example apps/api/.env
# Edit .env with your configuration

# Run database migrations
pnpm db:migrate
pnpm db:seed

# Start development server
pnpm dev
```

## Pull Request Process

1. Update the README.md with details of changes to the interface
2. Update the version numbers in any examples files and the README.md
3. Add a changeset using `pnpm changeset`
4. The PR will be merged once you have the sign-off of a maintainer

## Coding Standards

- Use TypeScript for all new code
- Follow the existing code style (ESLint + Prettier)
- Write tests for new functionality
- Keep commits atomic and well-described
- Use conventional commit messages

## Testing

```bash
# Run unit tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Run specific package tests
pnpm --filter @courierx/shared test
```

## Adding New Email Providers

1. Create a new adapter in `packages/providers/src/adapters/`
2. Implement the `EmailProvider` interface
3. Add the provider to the factory in `packages/providers/src/index.ts`
4. Add configuration options to the API environment schema
5. Add webhook handling if supported
6. Write tests for the new provider

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
