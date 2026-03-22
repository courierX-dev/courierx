#!/bin/bash
set -e

echo "CourierX Development Setup (Lightweight)"
echo "========================================="

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "\n${YELLOW}Checking prerequisites...${NC}"
command -v docker >/dev/null 2>&1 || { echo -e "${RED}Docker is required but not installed.${NC}"; exit 1; }
echo -e "${GREEN}Docker installed${NC}"

# Start PostgreSQL and Redis (no build needed)
echo -e "\n${YELLOW}Starting PostgreSQL and Redis...${NC}"

docker run -d --name courierx-postgres \
    -e POSTGRES_USER=courierx \
    -e POSTGRES_PASSWORD=password \
    -e POSTGRES_DB=courierx_development \
    -p 5432:5432 \
    --health-cmd="pg_isready -U courierx" \
    --health-interval=10s \
    --health-timeout=5s \
    --health-retries=5 \
    postgres:15-alpine 2>/dev/null || docker start courierx-postgres 2>/dev/null || true

docker run -d --name courierx-redis \
    -p 6379:6379 \
    redis:7-alpine 2>/dev/null || docker start courierx-redis 2>/dev/null || true

echo -e "\n${YELLOW}Waiting for PostgreSQL...${NC}"
for i in {1..30}; do
    if docker exec courierx-postgres pg_isready -U courierx >/dev/null 2>&1; then
        echo -e "${GREEN}PostgreSQL is ready${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

echo -e "\n${GREEN}====================================="
echo "Database services ready!"
echo "=====================================${NC}"
echo ""
echo "  PostgreSQL: localhost:5432  (user: courierx / password: password / db: courierx_development)"
echo "  Redis:      localhost:6379"
echo ""
echo "Next steps:"
echo ""
echo "  Terminal 1 — Rails:"
echo "    cd backend/control-plane"
echo "    bundle install"
echo "    bundle exec rails db:create db:migrate db:seed"
echo "    bundle exec rails server -p 4000"
echo ""
echo "  Terminal 2 — Go Core:"
echo "    cd backend/core-go"
echo "    go run main.go"
echo ""
echo "  Terminal 3 — Sidekiq:"
echo "    cd backend/control-plane"
echo "    bundle exec sidekiq"
echo ""
echo "Stop databases:"
echo "  docker stop courierx-postgres courierx-redis"
