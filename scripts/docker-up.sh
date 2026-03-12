#!/bin/bash
# Quick start with Docker Compose

set -e

echo "🐳 Starting News Screener with Docker Compose..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cp config/.env.example .env
    echo "📝 Please edit .env with your API keys"
    echo "Required: NS_POLYGON_API_KEY, NS_OPENROUTER_API_KEY"
    exit 1
fi

# Check for required API keys
if ! grep -q "NS_POLYGON_API_KEY=" .env || grep -q "NS_POLYGON_API_KEY=your_polygon" .env; then
    echo "⚠️  WARNING: Polygon.io API key not configured in .env"
    echo "The application will start but ingestion will not work without it."
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "🚀 Building and starting services..."
docker-compose up --build -d

echo ""
echo "✅ Services started!"
echo ""
echo "📊 Service URLs:"
echo "  - API: http://localhost:8000"
echo "  - Health: http://localhost:8000/health"
echo "  - Docs: http://localhost:8000/docs"
echo "  - WebSocket: ws://localhost:8000/ws/articles"
echo ""
echo "🗄️  Database:"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6379"
echo ""
echo "📝 View logs:"
echo "  docker-compose logs -f app"
echo ""
echo "🛑 Stop services:"
echo "  docker-compose down"
echo ""
echo "🧪 Check status:"
echo "  docker-compose ps"
