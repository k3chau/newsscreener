# API Documentation

## REST API Endpoints

Base URL: `http://localhost:8000/api/v1`

### List Articles

**GET** `/articles`

Query enriched articles with optional filters.

**Query Parameters:**
- `limit` (integer, 1-100): Number of articles to return (default: 50)
- `offset` (integer): Pagination offset (default: 0)
- `ticker` (string): Filter by ticker symbol (e.g., "AAPL")
- `sector` (string): Filter by GICS sector
- `sentiment` (string): Filter by sentiment ("positive", "negative", "neutral")
- `min_credibility` (integer, 0-100): Minimum credibility score
- `after` (datetime): Articles published after this timestamp

**Example:**
```bash
curl "http://localhost:8000/api/v1/articles?ticker=AAPL&sentiment=positive&min_credibility=80&limit=10"
```

**Response:**
```json
[
  {
    "id": "abc123",
    "title": "Apple Beats Q4 Earnings Expectations",
    "url": "https://reuters.com/article/abc123",
    "source": "polygon",
    "publisher": "Reuters",
    "published_at": "2024-01-15T14:30:00Z",
    "ingested_at": "2024-01-15T14:31:00Z",
    "tickers": ["AAPL"],
    "keywords": ["earnings", "apple", "revenue"],
    "summary": "Apple Inc. reported Q4 earnings beating analyst expectations...",
    "sentiment": {
      "label": "positive",
      "score": 0.92
    },
    "industry": {
      "gics_sector": "Information Technology",
      "gics_industry_group": "Information Technology",
      "confidence": 0.88
    },
    "credibility": {
      "score": 85,
      "domain": "reuters.com",
      "flags": []
    },
    "llm_analysis": {
      "summary": "Apple beats earnings with strong iPhone sales",
      "key_points": [
        "Revenue up 11% YoY",
        "iPhone sales exceeded forecasts",
        "Services hit record high"
      ],
      "mentioned_companies": ["Apple", "AAPL"],
      "impact": "positive"
    }
  }
]
```

### Get Article by ID

**GET** `/articles/{article_id}`

Get a single article by its ID.

**Example:**
```bash
curl "http://localhost:8000/api/v1/articles/abc123"
```

**Response:** Same structure as single article in list above.

### Summary Statistics

**GET** `/articles/stats/summary`

Get summary statistics for articles matching filters.

**Query Parameters:** Same filters as list endpoint

**Example:**
```bash
curl "http://localhost:8000/api/v1/articles/stats/summary?ticker=AAPL&sentiment=positive"
```

**Response:**
```json
{
  "total_count": 127,
  "filters": {
    "ticker": "AAPL",
    "sector": null,
    "sentiment": "positive",
    "min_credibility": null
  }
}
```

## WebSocket Streaming

**WebSocket URL:** `ws://localhost:8000/ws/articles`

Real-time streaming of enriched articles as they're processed.

### Connection

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/articles');

ws.onopen = () => {
  console.log('Connected to news stream');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'ping') {
    // Heartbeat - connection is alive
    return;
  }

  if (data.type === 'article') {
    // New enriched article
    console.log('New article:', data.data.title);
    console.log('Sentiment:', data.data.sentiment?.label);
    console.log('Sector:', data.data.industry?.gics_sector);
    console.log('Credibility:', data.data.credibility?.score);
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Disconnected from news stream');
};
```

### Message Types

**Ping (Heartbeat)**
```json
{
  "type": "ping"
}
```

**Article (New Enriched Article)**
```json
{
  "type": "article",
  "data": {
    "raw": { /* RawArticle */ },
    "full_text": "...",
    "sentiment": { "label": "positive", "score": 0.92 },
    "industry": { "gics_sector": "Information Technology", ... },
    "credibility": { "score": 85, ... },
    "summary": "...",
    "llm_json": { /* LLM analysis */ }
  }
}
```

### Python Client Example

```python
import asyncio
import websockets
import json

async def stream_articles():
    uri = "ws://localhost:8000/ws/articles"

    async with websockets.connect(uri) as websocket:
        print("Connected to news stream")

        async for message in websocket:
            data = json.loads(message)

            if data['type'] == 'article':
                article = data['data']
                print(f"\n📰 {article['raw']['title']}")
                print(f"   Sentiment: {article.get('sentiment', {}).get('label')}")
                print(f"   Sector: {article.get('industry', {}).get('gics_sector')}")
                print(f"   Credibility: {article.get('credibility', {}).get('score')}/100")

asyncio.run(stream_articles())
```

## Health Check

**GET** `/health`

Check if the API is running.

**Example:**
```bash
curl http://localhost:8000/health
```

**Response:**
```json
{
  "status": "ok"
}
```

## Interactive API Documentation

FastAPI provides automatic interactive documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Rate Limiting

Currently no rate limiting is implemented. In production, consider:
- Rate limiting per IP address
- API key authentication
- Request throttling for expensive queries

## Error Responses

All errors follow this structure:

```json
{
  "error": "Error message here"
}
```

HTTP status codes:
- `200 OK`: Success
- `404 Not Found`: Resource not found
- `422 Unprocessable Entity`: Invalid query parameters
- `500 Internal Server Error`: Server error

## GICS Sectors Reference

Valid sector values for filtering:
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

## Example Queries

### Get latest tech news with high credibility
```bash
curl "http://localhost:8000/api/v1/articles?sector=Information%20Technology&min_credibility=80&limit=20"
```

### Get negative AAPL news
```bash
curl "http://localhost:8000/api/v1/articles?ticker=AAPL&sentiment=negative"
```

### Get recent healthcare articles
```bash
curl "http://localhost:8000/api/v1/articles?sector=Health%20Care&after=2024-01-01T00:00:00Z"
```

### Count positive articles about TSLA
```bash
curl "http://localhost:8000/api/v1/articles/stats/summary?ticker=TSLA&sentiment=positive"
```
