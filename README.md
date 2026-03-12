  Real-time financial news intelligence dashboard that aggregates, enriches, and analyzes market news for active traders.
                                                                                                                                                           
  What it does
                                                                                                                                                           
  - Live news feed — Streams financial news in real-time via Polygon.io WebSocket with auto-reconnect
  - AI-powered analysis — Click any article for a full AI breakdown: sentiment, ticker impact, risk factors, and trading considerations (powered by Claude
  via OpenRouter)                                         
  - Price impact tracking — Automatically shows how stock prices moved +5m, +15m, +30m after news was published
  - Macro calendar — Upcoming economic events (CPI, FOMC, jobs data) from Financial Modeling Prep API, color-coded by impact
  - Smart watchlist — Pin tickers and configure per-ticker alert rules with sentiment and credibility thresholds
  - Analytics dashboard — Sector sentiment heatmap, source reliability leaderboard, and keyword trend tracking with interactive charts

  Tech Stack

  Backend: Python, FastAPI, SQLAlchemy (async), PostgreSQL, Redis (pub/sub + alerts)
  Frontend: React, Vite, Tailwind CSS, Recharts
  APIs: Polygon.io (news + price data), Financial Modeling Prep (economic calendar), OpenRouter/Claude (AI analysis)
  Infra: Docker Compose (Postgres + Redis), Nginx reverse proxy

  Architecture

  Polygon.io WebSocket → Ingestion Pipeline → Redis Pub/Sub → Enrichment Pipeline → PostgreSQL
                                                      ↓
                                            WebSocket Broadcast → React Dashboard

  Articles flow through a multi-stage pipeline: ingestion → NLP enrichment (sentiment, sector classification, credibility scoring) → persistence →
  real-time delivery to connected clients.

  Quick Start

  # Set up environment
  cp .env.example .env  # Add your API keys

  # Start everything (Postgres, Redis, backend, frontend)
  ./scripts/dev.sh start

  # Open http://localhost:3000

  Required API Keys

  ┌───────────────────────┬────────────┬────────────────────────┐
  │          Key          │  Service   │        Purpose         │
  ├───────────────────────┼────────────┼────────────────────────┤
  │ NS_POLYGON_API_KEY    │ Polygon.io │ News feed + price data │
  ├───────────────────────┼────────────┼────────────────────────┤
  │ NS_OPENROUTER_API_KEY │ OpenRouter │ AI article analysis    │
  ├───────────────────────┼────────────┼────────────────────────┤
  │ NS_FMP_API_KEY        │ FMP        │ Economic calendar      │
  └───────────────────────┴────────────┴────────────────────────┘

  Features

  - Real-time WebSocket streaming with exponential backoff reconnection
  - Filter by ticker, GICS sector, sentiment, and credibility score
  - Watchlist with localStorage persistence and configurable alert rules
  - Sector heatmap showing sentiment distribution across all 11 GICS sectors
  - Source reliability leaderboard ranking publishers by credibility
  - Keyword trend tracking with interactive Recharts visualizations
  - Email alert notifications (optional SMTP configuration)
  - Responsive single-page dashboard with collapsible panels
