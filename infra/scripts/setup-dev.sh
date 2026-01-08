#!/bin/bash
set -e

echo "🚀 CourierX Development Setup"
echo "=============================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "\n${YELLOW}Checking prerequisites...${NC}"
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed."; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose is required but not installed."; exit 1; }
echo -e "${GREEN}✓ Docker and Docker Compose installed${NC}"

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
    cp control-plane/.env.example control-plane/.env
    echo -e "${GREEN}✓ Created control-plane/.env${NC}"
else
    echo -e "${GREEN}✓ control-plane/.env already exists${NC}"
fi

# Start Docker containers
echo -e "\n${YELLOW}Starting Docker containers...${NC}"
docker-compose -f infra/docker-compose.yml up -d postgres redis

# Wait for PostgreSQL to be ready
echo -e "\n${YELLOW}Waiting for PostgreSQL to be ready...${NC}"
sleep 5

# Run database migrations
echo -e "\n${YELLOW}Running database migrations...${NC}"
docker-compose -f infra/docker-compose.yml run --rm control-plane bundle exec rails db:create db:migrate db:seed

# Start all services
echo -e "\n${YELLOW}Starting all services...${NC}"
docker-compose -f infra/docker-compose.yml up -d

echo -e "\n${GREEN}=============================="
echo "✅ Development environment ready!"
echo "==============================${NC}"
echo ""
echo "Services running:"
echo "  - Rails Control Plane: http://localhost:4000"
echo "  - Go Core:             http://localhost:8080"
echo "  - PostgreSQL:          localhost:5432"
echo "  - Redis:               localhost:6379"
echo ""
echo "Useful commands:"
echo "  docker-compose -f infra/docker-compose.yml logs -f          # View logs"
echo "  docker-compose -f infra/docker-compose.yml ps               # List services"
echo "  docker-compose -f infra/docker-compose.yml down             # Stop all services"
echo "  docker-compose -f infra/docker-compose.yml restart <service> # Restart a service"
echo ""
