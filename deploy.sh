#!/bin/bash

# ============================================================================
# Synergiq CRM - Cloudflare Deployment Script
# ============================================================================

set -e

echo "🚀 Synergiq CRM - Cloudflare Deployment"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ Wrangler CLI not found${NC}"
    echo "Installing Wrangler..."
    npm install -g wrangler
fi

echo -e "${GREEN}✅ Wrangler CLI found${NC}"
echo ""

# Login check
echo "🔐 Checking Cloudflare authentication..."
if ! wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}Please login to Cloudflare:${NC}"
    wrangler login
fi

echo -e "${GREEN}✅ Authenticated${NC}"
echo ""

# Backend setup
echo "📦 Setting up backend..."
cd backend

# Install dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
fi

# Check if database exists
echo "🗄️  Setting up D1 database..."
DATABASE_NAME="synergiq-crm"

# Create database if it doesn't exist
if ! wrangler d1 list | grep -q "$DATABASE_NAME"; then
    echo "Creating D1 database..."
    wrangler d1 create $DATABASE_NAME
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANT: Copy the database_id from above and paste it into backend/wrangler.toml${NC}"
    echo "Press Enter after updating wrangler.toml..."
    read
else
    echo -e "${GREEN}✅ Database already exists${NC}"
fi

# Run migrations
echo "Running database migrations..."
wrangler d1 execute $DATABASE_NAME --file=./schema.sql

# Ask about demo data
read -p "Load demo data? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Loading demo data..."
    wrangler d1 execute $DATABASE_NAME --file=./seed.sql
fi

# Set secrets
echo ""
echo "🔐 Setting up secrets..."
echo "You need to set two secrets:"
echo "1. JWT_SECRET - for token signing (32+ characters)"
echo "2. ENCRYPTION_KEY - for credential encryption (32 characters)"
echo ""

read -p "Set JWT_SECRET now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    wrangler secret put JWT_SECRET
fi

read -p "Set ENCRYPTION_KEY now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    wrangler secret put ENCRYPTION_KEY
fi

# Deploy backend
echo ""
read -p "Deploy backend to Cloudflare Workers? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Deploying backend..."
    npm run deploy
    echo -e "${GREEN}✅ Backend deployed!${NC}"
    echo "Your API is live at the URL shown above."
    echo ""
    echo "Copy your Worker URL (e.g., https://synergiq-crm-api.your-subdomain.workers.dev)"
    read -p "Press Enter to continue to frontend setup..."
else
    echo "Skipping backend deployment. You can deploy later with: cd backend && npm run deploy"
fi

# Frontend setup
cd ../frontend

echo ""
echo "🎨 Setting up frontend..."

# Install dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Create .env file
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    read -p "Enter your Worker URL (from backend deployment): " WORKER_URL
    echo "VITE_API_URL=$WORKER_URL" > .env
    echo -e "${GREEN}✅ .env file created${NC}"
else
    echo -e "${YELLOW}⚠️  .env file already exists. Please update VITE_API_URL manually if needed.${NC}"
fi

# Deploy frontend
echo ""
read -p "Deploy frontend to Cloudflare Pages? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Building frontend..."
    npm run build
    
    echo "Deploying to Cloudflare Pages..."
    npm run deploy
    
    echo -e "${GREEN}✅ Frontend deployed!${NC}"
    echo "Your app is live at the URL shown above."
else
    echo "Skipping frontend deployment. You can deploy later with: cd frontend && npm run build && npm run deploy"
fi

cd ..

echo ""
echo "================================"
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo "================================"
echo ""
echo "Next steps:"
echo "1. Visit your frontend URL to access the CRM"
echo "2. Register a new company or use demo credentials:"
echo "   Tenant: demo"
echo "   Email: demo@example.com"
echo "   Password: password123"
echo ""
echo "To run locally:"
echo "  Backend:  cd backend && npm run dev"
echo "  Frontend: cd frontend && npm run dev"
echo ""
echo "For help: https://github.com/your-repo/synergiq-crm"
echo ""
