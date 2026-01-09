#!/bin/bash
set -e

echo "🚀 CourierX Development Setup (Lightweight)"
echo "============================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "\n${YELLOW}Checking prerequisites...${NC}"
command -v docker >/dev/null 2>&1 || { echo -e "${RED}❌ Docker is required but not installed.${NC}"; exit 1; }
echo -e "${GREEN}✓ Docker installed${NC}"

# Create .env files if they don't exist
echo -e "\n${YELLOW}Setting up environment files...${NC}"

if [ ! -f "apps/core-go/.env" ]; then
    echo "Creating apps/core-go/.env from example..."
    cp apps/core-go/.env.example apps/core-go/.env
    echo -e "${GREEN}✓ Created apps/core-go/.env${NC}"
else
    echo -e "${GREEN}✓ apps/core-go/.env already exists${NC}"
fi

if [ ! -f "control-plane/.env" ]; then
    echo "Creating control-plane/.env from example..."
    if [ -f "control-plane/.env.example" ]; then
        cp control-plane/.env.example control-plane/.env
    else
        cat > control-plane/.env << 'EOF'
DATABASE_URL=postgresql://courierx:password@localhost:5432/courierx_development
REDIS_URL=redis://localhost:6379/0
RAILS_ENV=development
GO_CORE_URL=http://localhost:8080
JWT_SECRET=dev_jwt_secret_key_replace_in_production
ENCRYPTION_KEY=dev_encryption_key_32chars_here_
EOF
    fi
    echo -e "${GREEN}✓ Created control-plane/.env${NC}"
else
    echo -e "${GREEN}✓ control-plane/.env already exists${NC}"
fi

# Start just PostgreSQL and Redis (lightweight - no building required)
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

# Wait for PostgreSQL to be ready
echo -e "\n${YELLOW}Waiting for PostgreSQL to be ready...${NC}"
for i in {1..30}; do
    if docker exec courierx-postgres pg_isready -U courierx >/dev/null 2>&1; then
        echo -e "${GREEN}✓ PostgreSQL is ready${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

echo -e "\n${GREEN}============================================="
echo "✅ Database services ready!"
echo "=============================================${NC}"
echo ""
echo "Services running:"
echo "  - PostgreSQL: localhost:5432 (user: courierx, password: password)"
echo "  - Redis:      localhost:6379"
echo ""
echo "Next steps:"
echo ""
echo "  1. Start Rails (Control Plane):"
echo "     cd control-plane && bundle install && rails db:create db:migrate && rails server -p 4000"
echo ""
echo "  2. Start Go Core:"
echo "     cd apps/core-go && go run . "
echo ""
echo "Stop databases:"
echo "  docker stop courierx-postgres courierx-redis"
echo ""
