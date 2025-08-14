# AutoDoc v4 — Auth (Login/Users) + Neon UI

**New:**
- Email/password **signup & login**
- Secure **HTTP-only session cookie (JWT)**
- Docs are **per-user** (list/delete/regenerate only your docs)
- Frontend pages: **/login** and **/register**
- All API calls use `credentials: 'include'`

> Upgrading from older versions? Reset the DB volume to add new tables:
> ```bash
> docker compose down -v   # WARNING: deletes DB volume
> docker compose up -d
> ```

## Run
```bash
cp .env.example .env
docker compose build --no-cache
docker compose up -d
docker compose exec ollama ollama pull mistral:7b
xdg-open http://localhost:3000 || open http://localhost:3000
```
