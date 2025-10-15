#!/bin/bash

# PlantGenius Backend - Local Testing Quick Start
# Usage: ./start-local.sh

set -e

echo "🚀 PlantGenius Backend - Local Testing Setup"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env from template..."
    if [ -f .env.local ]; then
        cp .env.local .env
        echo "✅ .env file created from .env.local"
        echo ""
        echo "⚠️  IMPORTANT: Edit .env and configure:"
        echo "   1. MONGODB_URI (MongoDB Atlas or local)"
        echo "   2. JWT_SECRET (run: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\")"
        echo "   3. Optional: PAYSTACK_SECRET_KEY, PLANTNET_API_KEY"
        echo ""
        echo "Press Enter when done editing .env..."
        read
    else
        echo "❌ .env.local template not found"
        exit 1
    fi
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed"
    echo ""
fi

# Generate JWT secret if needed
if grep -q "your_local_jwt_secret" .env; then
    echo "🔑 Generating JWT secret..."
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/your_local_jwt_secret_at_least_32_characters_long/$JWT_SECRET/" .env
    else
        # Linux
        sed -i "s/your_local_jwt_secret_at_least_32_characters_long/$JWT_SECRET/" .env
    fi
    echo "✅ JWT secret generated"
    echo ""
fi

# Check MongoDB connection
echo "🔍 Checking .env configuration..."
source .env

if [[ "$MONGODB_URI" == *"YOUR_NEW_USERNAME"* ]]; then
    echo "⚠️  MongoDB not configured yet"
    echo ""
    echo "Setup MongoDB Atlas (recommended):"
    echo "  1. Go to https://cloud.mongodb.com"
    echo "  2. Create free cluster"
    echo "  3. Create database user"
    echo "  4. Whitelist IP: 0.0.0.0/0"
    echo "  5. Get connection string"
    echo "  6. Update MONGODB_URI in .env"
    echo ""
    echo "Or use local MongoDB:"
    echo "  MONGODB_URI=mongodb://localhost:27017/plantgenius-dev"
    echo ""
    echo "Press Enter when MongoDB is configured..."
    read
fi

echo ""
echo "🎯 Starting backend server..."
echo ""
echo "Available servers:"
echo "  1. server-enhanced.js (recommended - full features)"
echo "  2. server.js (basic features)"
echo ""
echo "Starting server-enhanced.js..."
echo ""
echo "================================"
echo ""

# Start the enhanced server
if [ -f "server-enhanced.js" ]; then
    node server-enhanced.js
else
    echo "⚠️  server-enhanced.js not found, using server.js"
    node server.js
fi
