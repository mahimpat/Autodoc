# AutoDoc v4 — Auth Hotfix + Neon UI (Quickstart)

This is a first-pass **runbook + API cheat sheet** for the project you uploaded (`autodoc_ollama_uploads_ui_v4_auth_hotfix.zip`). It summarizes what's included, how to run it locally, and how to verify the new auth + per-user docs flow.

---

## What's inside

- **Backend (FastAPI)** — `backend/app`  
  - Auth endpoints (`/auth/register`, `/auth/login`, `/auth/logout`, `/auth/me`) using **HTTP-only session cookies (JWT)**.  
  - Document APIs under `/documents` (list/delete/regenerate **scoped to the logged-in user**).  
  - Ingestion + generation under `/ingest`:  
    - `POST /ingest/upload` — upload files
    - `GET /ingest/stream_generate` — Server-Sent Events (SSE) for streaming outline/sections
  - Templates under `/templates` (list + get by name).
  - Health: `GET /health`

- **Frontend (Next.js 14 + Tailwind + Framer Motion + lucide-react)** — `frontend/app`  
  - Pages: `/login`, `/register`, and `/` (main dashboard).  
  - All fetch calls include `credentials: 'include'` for cookie auth (**hotfix**).

- **Object Storage (MinIO)** for uploads and generated docs.  
- **Database (Postgres + pgvector)** for users/docs.  
- **Redis** (placeholder for Celery worker).  
- **Ollama** for local open-source LLMs (default: `mistral:7b`).

---

## Run locally (Linux/macOS/WSL)

```bash
cp .env.example .env

# (recommended on first run or after schema changes)
docker compose build --no-cache
docker compose up -d

# pull an LLM
docker compose exec ollama ollama pull mistral:7b

# open the UI
xdg-open http://localhost:3000 2>/dev/null || open http://localhost:3000
```

> ⚠️ **Upgrading from an older version?**  
> If you see DB errors or missing tables, reset the DB volume:
> ```bash
> docker compose down -v   # WARNING: deletes DB volume
> docker compose up -d
> ```

---

## Sanity checks

1) **API health**
```bash
curl -i http://localhost:8000/health
```

2) **Register + cookie auth flow** (see `AUTODOC_V4_API_TESTS.http` for a ready-to-run set)
- `POST /auth/register` → HTTP-only cookie set
- `GET /auth/me` → returns your user
- `POST /auth/logout` → clears cookie

3) **Templates**
```bash
curl -s http://localhost:8000/templates | jq .
```

4) **Ingest + generate (SSE)**
- `POST /ingest/upload` with one or more files
- `GET /ingest/stream_generate?...` to stream the outline/sections (SSE with `data:` events)

---

## Auth hotfix notes

- **Frontend** now sets `credentials: 'include'` on **every** fetch to the API.  
- **Backend** issues a signed **JWT** stored in an **HTTP-only** cookie (no JS access).  
- Requests are authorized by reading the cookie and resolving the user with `get_current_user`.

### CORS + cookies checklist (local OK, prod needs care)
- Set `CORS_ORIGINS` to your real frontend URL(s) (comma-separated).  
- If API and UI are on **different domains/subdomains**, set cookie flags accordingly when creating the cookie:
  - `HttpOnly=true` (always)
  - `Secure=true` (in HTTPS)
  - `SameSite=None` when cross-site; else `Lax` is fine
  - `Domain` should match the parent domain you need (e.g., `.example.com` for `api.example.com` + `app.example.com`).
- If behind a reverse proxy (Nginx, Traefik, Cloudflare), ensure it **forwards and does not strip** cookies and CORS headers.

---

## Environment

Key `.env` values (already present in `.env.example`):
- `API_PORT=8000`
- `CORS_ORIGINS=http://localhost:3000`
- `SECRET_KEY=` (change in prod)
- `S3_*` (MinIO in docker)
- `OLLAMA_URL=http://ollama:11434`, `OLLAMA_DEFAULT_MODEL=mistral:7b`
- `SESSION_COOKIE_NAME=session`, `SESSION_MAX_AGE=604800`

---

## Common gotchas

- **Login works but requests are 401** → Check:
  - Frontend requests include `credentials: 'include'` (this build does ✅).  
  - CORS: `Access-Control-Allow-Credentials: true` is present (FastAPI middleware does this when `allow_credentials=True`).  
  - Cookie `Domain/SameSite/Secure` matches your deployment shape (see checklist above).

- **Ollama model not found** → `docker compose exec ollama ollama pull mistral:7b`

- **DB schema mismatch** → Reset volumes: `docker compose down -v` (will wipe data).

- **Docker networking error on `ollama`** (seen on some hosts):  
  Try `docker network prune` (careful), restart Docker, and ensure nothing is already bound to `11434` on the host.

---

## File map (high-level)

```
backend/
  app/
    routers/
      auth.py                # register/login/logout/me
      ingest_generate.py     # /ingest/upload, /ingest/stream_generate (SSE)
      documents_admin.py     # /documents (per-user list/delete)
      documents_stream.py    # /documents/<built-in function id>/stream_regen (SSE)
      templates.py           # /templates
    llm/                     # model orchestrator + Ollama client
    processing/              # file text extraction → snippets
    models.py, db.py         # SQLAlchemy models + session
    main.py                  # FastAPI app incl. CORS + routers
frontend/
  app/                       # Next.js app (/, /login, /register)
templates/                   # YAML templates for docs
scripts/init_db.sql          # initial DB bits
docker-compose.yml           # services: db, redis, minio, ollama, api, frontend
```

---

**Tip:** If you want, you can drop this file and `AUTODOC_V4_API_TESTS.http` straight into your repo as developer docs.
