#!/bin/bash
# Complete setup and run script for News Screener
# This script handles everything: setup, dependencies, services, and running the app

set -e

PROJECT_DIR="/Users/jimmychu/Desktop/All Projects/News Screener"
cd "$PROJECT_DIR"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 News Screener - Complete Setup & Run"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ============================================================================
# Step 1: Check Prerequisites
# ============================================================================
echo "📋 Step 1: Checking prerequisites..."

# Check for Python 3.11+
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.11 or higher."
    exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
echo "✅ Python $PYTHON_VERSION detected"

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker not found. Docker is optional but recommended."
    echo "   You can install it from: https://www.docker.com/products/docker-desktop"
    DOCKER_AVAILABLE=false
else
    echo "✅ Docker detected"
    DOCKER_AVAILABLE=true
fi

echo ""

# ============================================================================
# Step 2: Environment Configuration
# ============================================================================
echo "📋 Step 2: Configuring environment..."

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp config/.env.example .env
    echo "⚠️  IMPORTANT: Please add your API keys to .env"
    echo ""
    echo "Required API keys:"
    echo "  - NS_POLYGON_API_KEY (get from https://polygon.io)"
    echo "  - NS_OPENROUTER_API_KEY (get from https://openrouter.ai)"
    echo ""
    read -p "Press Enter after you've added your API keys to .env, or Ctrl+C to exit..."
else
    echo "✅ .env file exists"
fi

# Validate API keys
if grep -q "your_polygon_api_key_here" .env || grep -q "your_openrouter_api_key_here" .env; then
    echo "⚠️  WARNING: Default placeholder API keys detected in .env"
    echo ""
    echo "You need to edit .env and add real API keys:"
    echo "  - NS_POLYGON_API_KEY (from https://polygon.io)"
    echo "  - NS_OPENROUTER_API_KEY (from https://openrouter.ai)"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Exiting. Please add API keys to .env and run again."
        exit 1
    fi
fi

echo ""

# ============================================================================
# Step 3: Virtual Environment Setup
# ============================================================================
echo "📋 Step 3: Setting up Python virtual environment..."

if [ ! -d ".venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv .venv
else
    echo "✅ Virtual environment exists"
fi

echo "🔧 Activating virtual environment..."
source .venv/bin/activate

echo "📦 Installing Python dependencies..."
pip install --quiet --upgrade pip
pip install --quiet -e ".[dev]"

echo "✅ Python environment ready"
echo ""

# ============================================================================
# Step 4: Start Services
# ============================================================================
echo "📋 Step 4: Starting required services..."

# Check if user wants Docker or local services
if [ "$DOCKER_AVAILABLE" = true ]; then
    echo ""
    echo "Choose how to run services:"
    echo "  1) Docker Compose (recommended - starts everything)"
    echo "  2) Local services (requires manual Redis/PostgreSQL setup)"
    echo ""
    read -p "Enter choice (1 or 2): " SERVICE_CHOICE

    if [ "$SERVICE_CHOICE" = "1" ]; then
        echo ""
        echo "🐳 Starting services with Docker Compose..."
        echo ""

        # Stop any existing containers
        docker-compose down 2>/dev/null || true

        # Start all services
        docker-compose up -d

        echo ""
        echo "⏳ Waiting for services to be ready..."
        sleep 5

        # Check service health
        echo "🔍 Checking service health..."

        if docker-compose ps | grep -q "Up"; then
            echo "✅ Services are running"

            # Show service status
            echo ""
            echo "📊 Service Status:"
            docker-compose ps

            echo ""
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "✅ All services started successfully!"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo ""
            echo "🌐 Access Points:"
            echo "   • API:       http://localhost:8000"
            echo "   • Docs:      http://localhost:8000/docs"
            echo "   • Health:    http://localhost:8000/health"
            echo "   • WebSocket: ws://localhost:8000/ws/articles"
            echo ""
            echo "🗄️  Databases:"
            echo "   • PostgreSQL: localhost:5432"
            echo "   • Redis:      localhost:6379"
            echo ""
            echo "📝 Useful Commands:"
            echo "   • View logs:        docker-compose logs -f app"
            echo "   • Stop services:    docker-compose down"
            echo "   • Restart:          docker-compose restart"
            echo "   • Check status:     docker-compose ps"
            echo ""
            echo "✨ The app is processing news in real-time!"
            echo "   Check the docs at http://localhost:8000/docs to explore the API"
            echo ""
            echo "Press Ctrl+C to view logs, or close this terminal to leave it running"
            echo ""

            # Show logs
            docker-compose logs -f app

        else
            echo "❌ Some services failed to start"
            docker-compose ps
            echo ""
            echo "Check logs with: docker-compose logs"
            exit 1
        fi

    else
        # Local services option
        echo ""
        echo "🔧 Starting local services..."
        echo ""

        # Start Redis
        echo "📦 Starting Redis..."
        if docker ps --format '{{.Names}}' | grep -q "newsscreener-redis"; then
            echo "✅ Redis already running"
        else
            docker run -d --name newsscreener-redis -p 6379:6379 redis:7-alpine
            echo "✅ Redis started"
        fi

        # Start PostgreSQL
        echo "📦 Starting PostgreSQL..."
        if docker ps --format '{{.Names}}' | grep -q "newsscreener-postgres"; then
            echo "✅ PostgreSQL already running"
        else
            docker run -d --name newsscreener-postgres \
              -e POSTGRES_USER=newsscreener \
              -e POSTGRES_PASSWORD=password \
              -e POSTGRES_DB=newsscreener \
              -p 5432:5432 \
              postgres:16-alpine
            echo "✅ PostgreSQL started"
            echo "⏳ Waiting for PostgreSQL to be ready..."
            sleep 5
        fi

        echo ""
        echo "✅ Services ready"
        echo ""

        # Run the app locally
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "🚀 Starting News Screener Application..."
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "🌐 Access Points:"
        echo "   • API:       http://localhost:8000"
        echo "   • Docs:      http://localhost:8000/docs"
        echo "   • Health:    http://localhost:8000/health"
        echo "   • WebSocket: ws://localhost:8000/ws/articles"
        echo ""
        echo "Press Ctrl+C to stop the application"
        echo ""

        # Run uvicorn
        uvicorn src.app:app --reload
    fi

else
    # No Docker available
    echo "❌ Docker is not available. Please install Docker Desktop or manually start:"
    echo "   1. Redis on port 6379"
    echo "   2. PostgreSQL on port 5432"
    echo ""
    echo "Then run: source .venv/bin/activate && uvicorn src.app:app --reload"
    exit 1
fi
