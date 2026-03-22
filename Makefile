# CourierX — developer shortcuts
# All commands inject secrets via Phase (phase run "<command>")
# Requires: phase CLI, Ruby/Bundler, Go 1.23+

RAILS_DIR := backend/control-plane
GO_DIR    := backend/core-go

# ── One-shot: run everything with overmind/foreman ──────────────────────────
dev:
	@which overmind >/dev/null 2>&1 && overmind start -f Procfile.dev || \
	 which foreman  >/dev/null 2>&1 && foreman start -f Procfile.dev || \
	 (echo "Install overmind (brew install overmind) or foreman (gem install foreman) to use 'make dev'"; exit 1)

# ── Individual services ──────────────────────────────────────────────────────
rails:
	cd $(RAILS_DIR) && phase run "bundle exec rails server -p 4000"

sidekiq:
	cd $(RAILS_DIR) && phase run "bundle exec sidekiq"

go:
	cd $(GO_DIR) && phase run "go run main.go"

# ── Setup (run once) ─────────────────────────────────────────────────────────
setup:
	cd $(RAILS_DIR) && bundle install
	cd $(GO_DIR) && go mod download

db-migrate:
	cd $(RAILS_DIR) && phase run "bundle exec rails db:migrate"

db-seed:
	cd $(RAILS_DIR) && phase run "bundle exec rails db:seed"

db-setup:
	cd $(RAILS_DIR) && phase run "bundle exec rails db:create db:migrate db:seed"

# ── Tests ────────────────────────────────────────────────────────────────────
test-rails:
	cd $(RAILS_DIR) && phase run "RAILS_ENV=test bundle exec rspec"

test-go:
	cd $(GO_DIR) && phase run "go test ./..."

test: test-rails test-go

# ── Rails console / Go build ─────────────────────────────────────────────────
console:
	cd $(RAILS_DIR) && phase run "bundle exec rails console"

build-go:
	cd $(GO_DIR) && go build -o courierx-core .

.PHONY: dev rails sidekiq go setup db-migrate db-seed db-setup test-rails test-go test console build-go
