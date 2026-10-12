"""
Centralized application settings.

Everything that varies between environments (local dev, CI, staging,
production) lives here and nowhere else. Routes and services pull settings
via `get_settings()` rather than reading `os.environ` directly, so tests can
override configuration cleanly by monkeypatching this one function.
"""
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- App ---
    app_env: str = "development"
    app_name: str = "SentinelAI"
    app_secret: str = "change-me-in-production-please"
    api_prefix: str = "/api/v1"

    # --- Database ---
    database_url: str = "postgresql+asyncpg://sentinel:sentinel@localhost:5432/sentinelai"

    @property
    def database_url_sync(self) -> str:
        """Alembic and some tooling need a psycopg2 (sync) URL."""
        return self.database_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")

    # --- Redis / Celery ---
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"

    # --- Auth ---
    jwt_secret: str = "change-me-in-production-please"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 14
    password_reset_token_expire_minutes: int = 30

    # --- LLM providers ---
    llm_provider: str = "none"  # "anthropic" | "openai" | "ollama" | "none" (canned responses)
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-5"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.1"

    # --- Embeddings / Retrieval ---
    embedding_provider: str = "hash"  # "hash" (zero-config, dependency-free) | "openai"
    reranker_provider: str = "lexical"  # "lexical" | "passthrough"
    retrieval_top_k: int = 4
    retrieval_candidate_pool: int = 20
    retrieval_min_score: float = 0.42

    # --- Storage ---
    storage_dir: str = "./storage"
    max_upload_mb: int = 25

    # --- Background processing ---
    process_documents_inline: bool = True  # True = BackgroundTasks, False = Celery

    # --- CORS ---
    cors_origins: List[str] = ["http://localhost:3000"]

    # --- Rate limiting ---
    rate_limit_requests: int = 100
    rate_limit_window_seconds: int = 60


@lru_cache
def get_settings() -> Settings:
    return Settings()
