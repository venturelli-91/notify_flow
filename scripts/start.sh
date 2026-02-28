#!/bin/bash

# NotifyFlow Startup Script
# Starts all services in the correct order

set -e

echo "🚀 NotifyFlow Startup"
echo "===================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Install from https://docker.com"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Install from https://nodejs.org"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm not found."
    exit 1
fi

echo -e "${GREEN}✓ All prerequisites installed${NC}"
echo ""

# Check .env file
echo -e "${YELLOW}Checking environment configuration...${NC}"

if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please edit .env with your configuration${NC}"
    echo "   Critical variables:"
    echo "   - DATABASE_URL"
    echo "   - NEXTAUTH_SECRET"
    echo "   - REDIS_URL (optional, defaults to localhost)"
    echo ""
fi

echo -e "${GREEN}✓ Configuration ready${NC}"
echo ""

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
if [ ! -d node_modules ]; then
    npm install
fi
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Start Docker services
echo -e "${YELLOW}Starting Docker services (PostgreSQL, Redis)...${NC}"
docker compose up -d postgres redis

echo -e "${YELLOW}Waiting for database to be ready...${NC}"
sleep 5

# Check if Postgres is ready
max_attempts=30
attempt=0
while ! docker compose exec -T postgres pg_isready -U user &> /dev/null; do
    attempt=$((attempt+1))
    if [ $attempt -gt $max_attempts ]; then
        echo "❌ Database failed to start"
        docker compose logs postgres
        exit 1
    fi
    echo -n "."
    sleep 1
done

echo -e "${GREEN}✓ Database ready${NC}"
echo ""

# Run database migrations
echo -e "${YELLOW}Running database migrations...${NC}"
npm run db:push
echo -e "${GREEN}✓ Database schema updated${NC}"
echo ""

# Seed database
echo -e "${YELLOW}Seeding database with test data...${NC}"
npm run db:seed
echo -e "${GREEN}✓ Database seeded${NC}"
echo ""

# Summary
echo -e "${GREEN}===================="
echo "✓ Setup complete!"
echo "====================${NC}"
echo ""
echo "🎯 Next steps:"
echo ""
echo "Terminal 1 — Start Next.js server:"
echo "  npm run dev"
echo ""
echo "Terminal 2 — Start worker (in background):"
echo "  npm run worker"
echo ""
echo "Then open in browser:"
echo "  http://localhost:3000"
echo ""
echo "Login credentials:"
echo "  Email: admin@notifyflow.com"
echo "  Password: admin123"
echo ""
echo "📚 Documentation:"
echo "  - QUICKSTART.md (quick start guide)"
echo "  - docs/DEPLOY.md (production deployment)"
echo "  - README.md (full documentation)"
echo ""
