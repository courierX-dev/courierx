#!/bin/bash
set -e

echo "🚀 CourierX Production Deployment"
echo "================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check for .env.production
if [ ! -f ".env.production" ]; then
    echo -e "${RED}❌ .env.production file not found!${NC}"
    echo "Please create .env.production with all required environment variables"
    exit 1
fi

# Load production environment
export $(cat .env.production | xargs)

# Validate required environment variables
REQUIRED_VARS=(
    "DATABASE_URL"
    "REDIS_URL"
    "GO_CORE_SECRET"
    "JWT_SECRET"
    "ENCRYPTION_KEY"
    "SECRET_KEY_BASE"
    "FRONTEND_URL"
)

echo -e "\n${YELLOW}Validating environment variables...${NC}"
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}❌ Required environment variable $var is not set${NC}"
        exit 1
    fi
done
echo -e "${GREEN}✓ All required environment variables set${NC}"

# Build Docker images
echo -e "\n${YELLOW}Building Docker images...${NC}"
docker-compose -f infra/docker-compose.prod.yml build

# Push images to registry (optional)
if [ ! -z "$DOCKER_REGISTRY" ]; then
    echo -e "\n${YELLOW}Pushing images to registry...${NC}"
    docker-compose -f infra/docker-compose.prod.yml push
fi

# Run database migrations
echo -e "\n${YELLOW}Running database migrations...${NC}"
docker-compose -f infra/docker-compose.prod.yml run --rm control-plane bundle exec rails db:migrate

# Deploy services
echo -e "\n${YELLOW}Deploying services...${NC}"
docker-compose -f infra/docker-compose.prod.yml up -d

echo -e "\n${GREEN}================================="
echo "✅ Deployment complete!"
echo "=================================${NC}"
echo ""
echo "Services deployed:"
echo "  - Rails Control Plane (x2 replicas)"
echo "  - Go Core (x3 replicas)"
echo "  - Sidekiq (x2 replicas)"
echo "  - Nginx (reverse proxy)"
echo ""
echo "Health checks:"
echo "  curl http://localhost:4000/health"
echo "  curl http://localhost:8080/health"
echo ""
