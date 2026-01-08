#!/bin/bash
set -e

# Complete Development Environment Setup
# Sets up all testing and development tools

echo "🚀 CourierX Development Environment Setup"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check prerequisites
echo -e "\n${YELLOW}Checking prerequisites...${NC}"

command -v ruby >/dev/null 2>&1 || { echo -e "${RED}❌ Ruby not installed${NC}"; exit 1; }
command -v go >/dev/null 2>&1 || { echo -e "${RED}❌ Go not installed${NC}"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo -e "${RED}❌ Docker not installed${NC}"; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo -e "${RED}❌ Docker Compose not installed${NC}"; exit 1; }

echo -e "${GREEN}✓ All prerequisites installed${NC}"

# Start development services
echo -e "\n${YELLOW}Starting development services...${NC}"
docker-compose -f infra/docker-compose.dev.yml up -d

echo -e "${GREEN}✓ Development services started${NC}"

# Wait for services
echo -e "\n${YELLOW}Waiting for services to be ready...${NC}"
sleep 5

# Setup Rails
echo -e "\n${YELLOW}Setting up Rails...${NC}"
cd control-plane

if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env file${NC}"
fi

bundle install
bundle exec rails db:create db:migrate db:seed

echo -e "${GREEN}✓ Rails setup complete${NC}"

# Setup Go
echo -e "\n${YELLOW}Setting up Go Core...${NC}"
cd ../apps/core-go

if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env file${NC}"
fi

go mod download
echo -e "${GREEN}✓ Go setup complete${NC}"

# Install testing tools
echo -e "\n${YELLOW}Installing testing tools...${NC}"

# k6 (load testing)
if ! command -v k6 &> /dev/null; then
    echo "Installing k6..."
    case "$(uname -s)" in
        Darwin)
            brew install k6
            ;;
        Linux)
            echo "Please install k6 manually: https://k6.io/docs/getting-started/installation/"
            ;;
    esac
fi

# pre-commit
if ! command -v pre-commit &> /dev/null; then
    echo "Installing pre-commit..."
    pip3 install pre-commit
fi

cd ../..
pre-commit install

echo -e "${GREEN}✓ Testing tools installed${NC}"

# Summary
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Development environment ready!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Services running:"
echo "  - PostgreSQL:       localhost:5432"
echo "  - Redis:            localhost:6379"
echo "  - Mailhog SMTP:     localhost:1025"
echo "  - Mailhog UI:       http://localhost:8025"
echo "  - Redis Commander:  http://localhost:8081"
echo "  - pgAdmin:          http://localhost:5050"
echo ""
echo "Next steps:"
echo "  1. Start Rails:   cd control-plane && bundle exec rails s -p 4000"
echo "  2. Start Go Core: cd apps/core-go && go run cmd/server/main.go"
echo "  3. Run tests:     See TESTING.md"
echo ""
echo "Development tools:"
echo "  - View emails:  http://localhost:8025"
echo "  - Redis GUI:    http://localhost:8081"
echo "  - DB GUI:       http://localhost:5050"
echo ""
echo "Documentation:"
echo "  - README.md      - Project overview"
echo "  - TESTING.md     - Testing guide"
echo "  - CONTRIBUTING.md - How to contribute"
echo ""
