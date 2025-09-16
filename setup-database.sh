#!/bin/bash

echo "🗄️  CourierX Database Setup"
echo "=========================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "\n${BLUE}Choose your database setup:${NC}"
echo "1. Local PostgreSQL (Docker)"
echo "2. Local PostgreSQL (Homebrew/System)"
echo "3. Supabase (cloud)"
echo "4. Skip database setup"

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo -e "\n${YELLOW}Setting up local PostgreSQL with Docker...${NC}"

        # Check if Docker is running
        if ! docker info > /dev/null 2>&1; then
            echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
            exit 1
        fi

        # Start PostgreSQL container
        echo "Starting PostgreSQL container..."
        docker-compose -f infra/docker-compose.dev.yml up -d postgres

        # Wait for PostgreSQL to be ready
        echo "Waiting for PostgreSQL to be ready..."
        sleep 5

        # Update .env for local Docker setup
        sed -i.bak 's|DATABASE_URL=.*|DATABASE_URL="postgresql://courierx:courierx@localhost:5432/courierx"|' apps/api/.env

        echo -e "${GREEN}✅ Local PostgreSQL (Docker) is ready${NC}"
        ;;

    2)
        echo -e "\n${YELLOW}Setting up local PostgreSQL (system)...${NC}"

        # Check if PostgreSQL is installed
        if ! command -v psql &> /dev/null; then
            echo -e "${RED}❌ PostgreSQL not found. Install with: brew install postgresql${NC}"
            exit 1
        fi

        # Create database and user
        echo "Creating database and user..."
        createdb courierx 2>/dev/null || echo "Database might already exist"
        psql postgres -c "CREATE USER courierx WITH PASSWORD 'courierx';" 2>/dev/null || echo "User might already exist"
        psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE courierx TO courierx;" 2>/dev/null

        # Update .env for local system setup
        sed -i.bak 's|DATABASE_URL=.*|DATABASE_URL="postgresql://courierx:courierx@localhost:5432/courierx"|' apps/api/.env

        echo -e "${GREEN}✅ Local PostgreSQL (system) is ready${NC}"
        ;;

    3)
        echo -e "\n${YELLOW}Setting up Supabase connection...${NC}"
        echo "Please provide your Supabase connection details:"

        read -p "Supabase Project ID: " project_id
        read -s -p "Database Password: " db_password
        echo

        # Update .env for Supabase
        supabase_url="postgresql://postgres:${db_password}@db.${project_id}.supabase.co:5432/postgres"
        sed -i.bak "s|DATABASE_URL=.*|DATABASE_URL=\"${supabase_url}\"|" apps/api/.env

        echo -e "${GREEN}✅ Supabase connection configured${NC}"
        ;;

    4)
        echo -e "\n${YELLOW}Skipping database setup...${NC}"
        echo "Make sure to configure DATABASE_URL in apps/api/.env manually"
        ;;

    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac

echo -e "\n${BLUE}Running database initialization...${NC}"

cd apps/api

# Generate Prisma client
echo "Generating Prisma client..."
pnpm db:generate

# Run migrations
echo "Running database migrations..."
if pnpm db:migrate; then
    echo -e "${GREEN}✅ Migrations completed${NC}"
else
    echo -e "${RED}❌ Migration failed. Check your database connection.${NC}"
    exit 1
fi

# Seed database
echo "Seeding database with demo data..."
if pnpm db:seed; then
    echo -e "${GREEN}✅ Database seeded successfully${NC}"
else
    echo -e "${RED}❌ Seeding failed${NC}"
    exit 1
fi

echo -e "\n${GREEN}🎉 Database setup completed!${NC}"
echo -e "\n${BLUE}Next steps:${NC}"
echo "1. Start the API: cd apps/api && pnpm dev"
echo "2. Test health: curl http://localhost:3000/v1/health"
echo "3. Check the seed output above for your API key"
