"""FastAPI application entrypoint."""

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.logging import setup_logging, get_logger
from src.ingestion.pipeline import IngestionPipeline
from src.enrichment.pipeline import EnrichmentPipeline
from src.db.persistence import PersistencePipeline
from src.db.database import init_db
from src.api.routes import router as api_router
from src.api.polygon_news import router as polygon_router
from src.api.websocket import router as ws_router, broadcast_articles_from_redis
from src.api.price_impact import router as price_router
from src.api.macro_calendar import router as calendar_router
from src.api.analytics import router as analytics_router
from src.api.alerts import router as alerts_router

log = get_logger(__name__)
_ingestion_pipeline: IngestionPipeline | None = None
_enrichment_pipeline: EnrichmentPipeline | None = None
_persistence_pipeline: PersistencePipeline | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start/stop all pipelines and background tasks."""
    global _ingestion_pipeline, _enrichment_pipeline, _persistence_pipeline
    setup_logging()

    # Initialize database
    await init_db()

    _ingestion_pipeline = IngestionPipeline()
    _enrichment_pipeline = EnrichmentPipeline()
    _persistence_pipeline = PersistencePipeline()

    # Start all pipelines and WebSocket broadcaster concurrently
    ingestion_task = asyncio.create_task(_ingestion_pipeline.start())
    enrichment_task = asyncio.create_task(_enrichment_pipeline.start())
    persistence_task = asyncio.create_task(_persistence_pipeline.start())
    ws_broadcast_task = asyncio.create_task(broadcast_articles_from_redis())

    await log.ainfo(
        "app_started",
        pipelines=["ingestion", "enrichment", "persistence", "websocket"],
    )
    yield

    # Stop all pipelines
    await _ingestion_pipeline.stop()
    await _enrichment_pipeline.stop()
    await _persistence_pipeline.stop()
    ingestion_task.cancel()
    enrichment_task.cancel()
    persistence_task.cancel()
    ws_broadcast_task.cancel()
    await log.ainfo("app_stopped")


app = FastAPI(
    title="News Screener",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(api_router)
app.include_router(polygon_router)
app.include_router(ws_router)
app.include_router(price_router)
app.include_router(calendar_router)
app.include_router(analytics_router)
app.include_router(alerts_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
