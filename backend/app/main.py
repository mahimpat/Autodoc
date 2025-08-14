from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from time import sleep

from .routers import templates, ingest_generate, documents_stream, documents_admin, auth, documents_rest, snippets, models
from .settings import settings
from .db import Base, engine

app = FastAPI(title="AutoDoc API", version="1.2.0")

origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()] if settings.CORS_ORIGINS else ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/ready")
def ready():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)}

@app.on_event("startup")
def _startup():
    # Wait for DB
    for _ in range(30):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            break
        except Exception:
            sleep(1)
    # Create extension + tables + index
    try:
        with engine.begin() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            try:
                conn.execute(text("CREATE INDEX IF NOT EXISTS idx_snippets_text_fts ON snippets USING GIN (to_tsvector('english', text))"))
            except Exception:
                pass
    except Exception:
        pass
    Base.metadata.create_all(bind=engine)
    try:
        with engine.begin() as conn:
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_snippets_embedding ON snippets USING ivfflat (embedding vector_l2_ops) WITH (lists=100)"))
    except Exception:
        pass

# Routers
app.include_router(auth.router)
app.include_router(templates.router)
app.include_router(ingest_generate.router)
app.include_router(documents_stream.router)
app.include_router(documents_admin.router)
app.include_router(documents_rest.router)
app.include_router(models.router)

app.include_router(snippets.router)

from .routers import billing
app.include_router(billing.router)
