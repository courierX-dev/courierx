.PHONY: test test-verbose test-coverage test-race test-unit test-integration bench lint fmt clean build run

# Test commands
test:
	@echo "Running tests..."
	go test ./... -v

test-verbose:
	@echo "Running tests with verbose output..."
	go test ./... -v -count=1

test-coverage:
	@echo "Running tests with coverage..."
	go test ./... -coverprofile=coverage.out
	go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"

test-race:
	@echo "Running tests with race detector..."
	go test ./... -race

test-unit:
	@echo "Running unit tests only..."
	go test ./... -short

test-integration:
	@echo "Running integration tests..."
	go test ./... -run Integration

bench:
	@echo "Running benchmarks..."
	go test ./... -bench=. -benchmem

# Linting and formatting
lint:
	@echo "Running linter..."
	golangci-lint run

fmt:
	@echo "Formatting code..."
	gofmt -s -w .
	go mod tidy

# Build and run
build:
	@echo "Building..."
	go build -o courierx-core cmd/server/main.go

run:
	@echo "Running server..."
	go run cmd/server/main.go

# Clean
clean:
	@echo "Cleaning..."
	rm -f courierx-core coverage.out coverage.html
	go clean

# Install dependencies
deps:
	@echo "Installing dependencies..."
	go mod download
	go mod verify

# Install development tools
dev-tools:
	@echo "Installing development tools..."
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	go install github.com/securego/gosec/v2/cmd/gosec@latest

# Security check
security:
	@echo "Running security checks..."
	gosec ./...

# All checks (before commit)
check: fmt lint test-race
	@echo "All checks passed!"

# Watch mode (requires air)
watch:
	air

# Database commands
db-migrate:
	@echo "Running migrations..."
	# Add your migration command here

db-seed:
	@echo "Seeding database..."
	# Add your seed command here

# Docker commands
docker-build:
	docker build -t courierx-core:latest .

docker-run:
	docker run -p 8080:8080 courierx-core:latest

# Help
help:
	@echo "Available commands:"
	@echo "  make test            - Run all tests"
	@echo "  make test-coverage   - Run tests with coverage report"
	@echo "  make test-race       - Run tests with race detector"
	@echo "  make bench           - Run benchmarks"
	@echo "  make lint            - Run linter"
	@echo "  make fmt             - Format code"
	@echo "  make build           - Build the application"
	@echo "  make run             - Run the application"
	@echo "  make clean           - Clean build artifacts"
	@echo "  make check           - Run all checks (fmt, lint, test)"
	@echo "  make security        - Run security checks"
	@echo "  make docker-build    - Build Docker image"
