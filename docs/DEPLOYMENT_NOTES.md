# Deployment notes (prod)

This build uses **HTTP-only cookies** for auth. In production you usually have the API and UI on different subdomains, e.g.
- `https://api.example.com` (FastAPI behind a proxy)
- `https://app.example.com` (Next.js)

Key steps:

1) **HTTPS everywhere**
   - Terminate TLS at your proxy and ensure **Secure** cookies are used.

2) **CORS**
   - In `.env`, set `CORS_ORIGINS=https://app.example.com` (comma-separate if multiple).
   - In FastAPI, `allow_credentials=True` must be set (it is).

3) **Cookie flags in `set_session_cookie` (server)**
   - `httponly=True`
   - `secure=True` (prod)
   - `samesite="none"` if API/UI are cross-site; use `"lax"` if same-site.
   - `domain=".example.com"` if you want the cookie to work across subdomains.

4) **Reverse proxy**
   - Forward `Set-Cookie` unmodified.
   - Add `Access-Control-Allow-Credentials: true` and `Access-Control-Allow-Origin: https://app.example.com` (or let the app set them). Avoid `*` when using credentials.
   - If using Cloudflare/Traefik/Nginx, verify you are not accidentally stripping `Cookie`/`Set-Cookie` headers.

5) **Secrets**
   - Change `SECRET_KEY` (env) and rotate if compromised.

6) **Ollama**
   - Consider running Ollama off-box and set `OLLAMA_URL` accordingly, or pin models in the image if you need faster cold starts.

7) **MinIO / Object storage**
   - For cloud deployments, you can point S3 settings at AWS S3, R2, etc.
