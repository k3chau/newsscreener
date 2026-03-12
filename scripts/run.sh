#!/bin/bash
# Quick start script for the news screener

set -e

echo "🚀 Starting Financial News Screener..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cp config/.env.example .env
    echo "📝 Please edit .env with your API keys before running again."
    exit 1
fi

# Check if Redis is running
if ! redis-cli ping > /dev/null 2>&1; then
    echo "⚠️  Redis is not running!"
    echo "Start Redis with: docker run -d -p 6379:6379 redis:latest"
    exit 1
fi

# Activate virtual environment
if [ ! -d ".venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -e ".[dev]"
else
    source .venv/bin/activate
fi

# Check for API keys
if ! grep -q "NS_POLYGON_API_KEY=your_polygon" .env; then
    echo "✅ Configuration looks good"
else
    echo "⚠️  WARNING: Default API keys detected in .env"
    echo "Please update .env with real API keys for full functionality"
fi

echo "🔧 Running health checks..."
python -c "
from config import settings
import sys

issues = []
if not settings.polygon_api_key or settings.polygon_api_key == 'your_polygon_api_key':
    issues.append('Polygon.io API key not configured')
if not settings.openrouter_api_key or settings.openrouter_api_key == 'your_openrouter_api_key':
    issues.append('OpenRouter API key not configured (LLM summaries will fail)')

if issues:
    print('⚠️  Configuration issues:')
    for issue in issues:
        print(f'   - {issue}')
    print('\\nYou can still run the app, but some features will be limited.')
else:
    print('✅ All API keys configured')
"

echo ""
echo "🌐 Starting FastAPI server..."
echo "📡 Ingestion: Polygon.io → Redis (news:raw) → Scraper → Redis (news:enriched)"
echo "🧠 Enrichment: Sentiment + Industry + Summary + Credibility → Redis (news:scored)"
echo ""
echo "Health check: http://localhost:8000/health"
echo "Press Ctrl+C to stop"
echo ""

uvicorn src.app:app --reload
