import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    ENVIRONMENT: str = "dev"
    SECRET_KEY: str = "dev-secret-change"  # used to sign JWT
    POSTGRES_USER: str = "autodoc"
    POSTGRES_PASSWORD: str = "autodoc"
    POSTGRES_DB: str = "autodoc"
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432
    S3_ENDPOINT: str = "http://minio:9000"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_REGION: str = "us-east-1"
    S3_BUCKET: str = "autodoc"
    S3_USE_SSL: int = 0
    REDIS_URL: str = "redis://redis:6379/0"
    OLLAMA_URL: str = "http://ollama:11434"
    OLLAMA_DEFAULT_MODEL: str = "mistral:7b"
    
    # AI Model API Keys
    OPENAI_API_KEY: str | None = None
    ANTHROPIC_API_KEY: str | None = None
    
    API_PORT: int = 8000
    CORS_ORIGINS: str = "http://localhost:3000"
    SESSION_COOKIE_NAME: str = "session"
    SESSION_MAX_AGE: int = 60*60*24*7  # 7 days

    # Billing / Stripe
    STRIPE_SECRET_KEY: str | None = None
    STRIPE_PUBLISHABLE_KEY: str | None = None
    STRIPE_PRICE_PRO: str | None = None  # price_xxx
    STRIPE_PRICE_TEAM: str | None = None  # optional
    STRIPE_WEBHOOK_SECRET: str | None = None
    BILLING_RETURN_URL: str = "http://localhost:3000/settings/billing"
    
    # Quotas (simple, per user)
    FREE_GENERATIONS_PER_DAY: int = 5
    FREE_TOKENS_PER_MONTH: int = 100000

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

    @property
    def database_url(self) -> str:
        return f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

settings = Settings()
