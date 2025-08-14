# (unused in this v2 MVP, kept for parity)
from celery import Celery
from pydantic_settings import BaseSettings
class Settings(BaseSettings):
    REDIS_URL: str = "redis://redis:6379/0"
settings = Settings()
app = Celery("autodoc", broker=settings.REDIS_URL, backend=settings.REDIS_URL)
