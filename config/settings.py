from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Polygon.io
    polygon_api_key: str = ""
    polygon_ws_url: str = "wss://socket.polygon.io/stocks"
    polygon_reconnect_delay: float = 2.0
    polygon_max_reconnect_delay: float = 60.0

    # Redis
    redis_url: str = "redis://localhost:6379/0"
    redis_channel_raw_news: str = "news:raw"
    redis_channel_enriched: str = "news:enriched"
    redis_channel_scored: str = "news:scored"

    # Trafilatura scraping
    scrape_timeout: float = 15.0
    scrape_max_concurrent: int = 5

    # NewsGuard
    newsguard_api_key: str = ""
    newsguard_base_url: str = "https://api.newsguardtech.com/v3"

    # OpenRouter
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_model: str = "anthropic/claude-sonnet-4-20250514"

    # FinBERT / DeBERTa
    finbert_model: str = "ProsusAI/finbert"
    deberta_model: str = "MoritzLaurer/DeBERTa-v3-large-mnli-fever-anli-ling-wanli"

    # PostgreSQL
    database_url: str = "postgresql+asyncpg://newsscreener:password@localhost:5432/newsscreener"

    # Financial Modeling Prep
    fmp_api_key: str = ""

    # SMTP (for alert emails)
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    alert_email_from: str = ""

    # General
    log_level: str = "INFO"

    model_config = {"env_prefix": "NS_", "env_file": ".env", "extra": "ignore"}


settings = Settings()
