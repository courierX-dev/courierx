.PHONY: build run run-local dev test test-verbose test-coverage test-race \
        test-unit test-integration bench lint fmt clean deps dev-tools \
        security check watch docker-build docker-run help

BINARY := courierx-core

# ── Build ─────────────────────────────────────────────────────────────────────

build:
	@echo "Building $(BINARY)..."
	go build -ldflags="-s -w" -o $(BINARY) .

build-debug:
	@echo "Building $(BINARY) (debug)..."
	go build -o $(BINARY) .

# ── Run ───────────────────────────────────────────────────────────────────────

# Run with Phase-injected environment (requires `phase` CLI)
run:
	@echo "Starting server via Phase..."
	phase run -- go run .

# Run without Phase (reads from .env manually or uses system env)
run-local:
	@echo "Starting server (local env)..."
	go run .

# Live-reload via air + Phase
dev:
	@echo "Starting dev server with live-reload (Phase + air)..."
	phase run -- air

# ── Test ──────────────────────────────────────────────────────────────────────

test:
	@echo "Running tests..."
	go test ./... -v

test-verbose:
	go test ./... -v -count=1

test-coverage:
	@echo "Running tests with coverage..."
	go test ./... -coverprofile=coverage.out
	go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report: coverage.html"

test-race:
	@echo "Running tests with race detector..."
	go test ./... -race

test-unit:
	go test ./... -short

test-integration:
	go test ./... -run Integration

bench:
	@echo "Running benchmarks..."
	go test ./... -bench=. -benchmem -run=^$

# ── Quality ───────────────────────────────────────────────────────────────────

lint:
	golangci-lint run

fmt:
	gofmt -s -w .
	go mod tidy

security:
	gosec ./...

# Full pre-commit check
check: fmt lint test-race
	@echo "✓ All checks passed"

# ── Deps ──────────────────────────────────────────────────────────────────────

deps:
	go mod download
	go mod verify

dev-tools:
	@echo "Installing development tools..."
	go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	go install github.com/securego/gosec/v2/cmd/gosec@latest
	go install github.com/air-verse/air@latest
	@echo "Install Phase CLI: https://docs.phase.dev/cli/install"

# ── Clean ─────────────────────────────────────────────────────────────────────

clean:
	rm -f $(BINARY) coverage.out coverage.html
	go clean -testcache

# ── Watch (live-reload, no Phase) ─────────────────────────────────────────────

watch:
	air

# ── Docker ───────────────────────────────────────────────────────────────────

docker-build:
	docker build -t courierx-core:latest .

docker-run:
	docker run -p 8080:8080 --env-file .env courierx-core:latest

# ── Help ──────────────────────────────────────────────────────────────────────

help:
	@echo ""
	@echo "  CourierX Core — available targets"
	@echo ""
	@echo "  Build"
	@echo "    make build          Build production binary"
	@echo "    make build-debug    Build with debug info"
	@echo ""
	@echo "  Run"
	@echo "    make run            Start via Phase (injects env)"
	@echo "    make run-local      Start without Phase"
	@echo "    make dev            Live-reload via air + Phase"
	@echo ""
	@echo "  Test"
	@echo "    make test           Run all tests"
	@echo "    make test-coverage  Coverage report (coverage.html)"
	@echo "    make test-race      Race detector"
	@echo "    make bench          Benchmarks"
	@echo ""
	@echo "  Quality"
	@echo "    make check          fmt + lint + test-race (pre-commit)"
	@echo "    make lint           golangci-lint"
	@echo "    make security       gosec"
	@echo ""
	@echo "  Deps"
	@echo "    make deps           Download & verify modules"
	@echo "    make dev-tools      Install golangci-lint, gosec, air"
	@echo ""
