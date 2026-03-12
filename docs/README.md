# Financial News Screener

Real-time financial news ingestion, enrichment, and analysis pipeline with sentiment analysis, industry classification, and credibility scoring.

## Architecture

```
Polygon.io WebSocket → Redis (news:raw) → Enrichment Pipeline → Redis (news:enriched)
                          ↓
                    Trafilatura Scraper
                          ↓
                    Full Article Text
                          ↓
            ┌─────────────┴─────────────┐
            │                           │
      FinBERT Sentiment        DeBERTa GICS Industry
            │                           │
            └──────────┬────────────────┘
                       │
              OpenRouter LLM Summary
                       │
              NewsGuard Credibility
                       │
            Redis (news:enriched)
```

## Tech Stack

### Ingestion Layer
- **Polygon.io WebSocket**: Real-time news feed with auto-reconnect
- **Trafilatura**: Web scraping and article extraction
- **Redis Pub/Sub**: Internal message routing between pipeline stages

### Enrichment Layer
- **FinBERT**: Financial sentiment analysis (positive/negative/neutral)
- **DeBERTa**: Zero-shot GICS industry classification (11 sectors)
- **OpenRouter API**: LLM summarization with structured JSON output
- **NewsGuard API**: Source credibility scoring with fallback

### API Layer
- **FastAPI**: Async Python web framework
- **WebSocket**: Real-time article streaming (planned)
- **REST**: Query and filter enriched articles (planned)

## Setup

### 1. Install Dependencies

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

### 2. Configure Environment

```bash
cp config/.env.example .env
```

Edit `.env` with your API keys:
```env
NS_POLYGON_API_KEY=your_polygon_api_key
NS_REDIS_URL=redis://localhost:6379/0
NS_NEWSGUARD_API_KEY=your_newsguard_api_key
NS_OPENROUTER_API_KEY=your_openrouter_api_key
NS_OPENROUTER_MODEL=anthropic/claude-sonnet-4-20250514
NS_LOG_LEVEL=INFO
```

### 3. Start Redis

```bash
# Docker
docker run -d -p 6379:6379 redis:latest

# Or Homebrew
brew services start redis
```

### 4. Run the Application

```bash
source .venv/bin/activate
uvicorn src.app:app --reload
```

The app will:
1. Connect to Polygon.io WebSocket for real-time news
2. Scrape full article text
3. Analyze sentiment with FinBERT
4. Classify industry with DeBERTa
5. Generate summaries via OpenRouter
6. Score credibility via NewsGuard
7. Publish enriched articles to Redis

## Testing

```bash
# Run all tests
pytest -v

# Run specific test suites
pytest tests/test_sentiment.py -v
pytest tests/test_classifier.py -v
pytest tests/test_summarizer.py -v
pytest tests/test_credibility.py -v

# With coverage
pytest --cov=src --cov-report=html
```

### Model-Based Tests

Tests for FinBERT and DeBERTa require downloading models (~1GB total). First run will be slower:

```bash
pytest tests/test_sentiment.py tests/test_classifier.py -v
```

## API Endpoints

### Health Check
```bash
curl http://localhost:8000/health
```

### Subscribe to Enriched Articles (Redis)

```python
import redis
import orjson

r = redis.Redis(host='localhost', port=6379, db=0)
pubsub = r.pubsub()
pubsub.subscribe('news:enriched')

for message in pubsub.listen():
    if message['type'] == 'message':
        article = orjson.loads(message['data'])
        print(f"Title: {article['raw']['title']}")
        print(f"Sentiment: {article['sentiment']['label']}")
        print(f"Industry: {article['industry']['gics_sector']}")
        print(f"Summary: {article['summary']}")
        print(f"Credibility: {article['credibility']['score']}/100")
        print("---")
```

## GICS Industry Sectors (11)

The classifier identifies articles into these sectors:
1. Energy
2. Materials
3. Industrials
4. Consumer Discretionary
5. Consumer Staples
6. Health Care
7. Financials
8. Information Technology
9. Communication Services
10. Utilities
11. Real Estate

## Performance Notes

- **FinBERT**: ~100ms per article on CPU, ~20ms on GPU
- **DeBERTa**: ~1.2s per article on CPU (11 sectors), ~200ms on GPU
- **Trafilatura**: ~500ms per article (network + extraction)
- **OpenRouter**: ~1-2s per article (API call)
- **NewsGuard**: ~100ms per article (API call)

Total enrichment time: **~2-4 seconds per article**

Use GPU acceleration for 5-10x speedup on model inference.

## Project Structure

```
News Screener/
├── src/
│   ├── app.py                  # FastAPI entrypoint
│   ├── models.py               # Pydantic domain models
│   ├── logging.py              # Structured logging
│   ├── redis_pubsub.py         # Redis pub/sub client
│   ├── ingestion/
│   │   ├── polygon_ws.py       # Polygon.io WebSocket client
│   │   ├── scraper.py          # Trafilatura scraper
│   │   └── pipeline.py         # Ingestion orchestration
│   └── enrichment/
│       ├── sentiment.py        # FinBERT analyzer
│       ├── classifier.py       # DeBERTa industry classifier
│       ├── summarizer.py       # OpenRouter summarization
│       ├── credibility.py      # NewsGuard scoring
│       └── pipeline.py         # Enrichment orchestration
├── tests/                      # Comprehensive test suite
├── config/                     # Settings and env config
└── docs/                       # Documentation
```

## Frontend Dashboard

### Dev Server

```bash
cd frontend
npm install
npm run dev
```

Opens at http://localhost:3000. Vite proxies `/api` and `/ws` to the backend at `localhost:8000`.

### Production Build

```bash
cd frontend
npm run build
```

Static files are output to `frontend/dist/`.

### Docker

The frontend is included in `docker-compose.yml`:

```bash
docker compose up --build
```

- Backend: http://localhost:8000
- Frontend: http://localhost:3000

Nginx in the frontend container proxies API and WebSocket requests to the backend.

### Features

- Real-time article feed via WebSocket with auto-reconnect
- Article cards with sentiment badges, GICS sector tags, credibility bars, ticker tags, and LLM summaries
- Filter sidebar: sector, sentiment, min credibility slider, ticker search
- Stats bar: article count, sentiment pie chart, top sectors, average credibility

## Next Steps

- [ ] Add Grafana dashboard for monitoring
- [ ] Add trending topics and aggregated metrics
- [ ] Add dark mode toggle
