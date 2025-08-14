# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Docker/Container Management
- `make up` - Start all services with docker compose
- `make down` - Stop all services  
- `make rebuild` - Full rebuild and restart (use `--no-cache`)
- `make pull-model` - Pull Ollama model (default: mistral:7b, override with MODEL=name)
- `make logs-api` - View API container logs
- `make logs-frontend` - View frontend container logs

### Frontend Development
- `cd frontend && npm run dev` - Start Next.js dev server on port 3000
- `cd frontend && npm run build` - Build production frontend
- `cd frontend && npm start` - Start production frontend server

### Initial Setup
```bash
cp .env.example .env
docker compose build --no-cache
docker compose up -d
docker compose exec ollama ollama pull mistral:7b
```

## Architecture Overview

This is a full-stack document generation application with authentication and billing features.

### Core Components

**Backend (FastAPI)**: 
- Main API server at `backend/app/main.py`
- Authentication system with JWT sessions using HTTP-only cookies
- Document processing and LLM integration via Ollama
- PostgreSQL with pgvector for embeddings
- MinIO for file storage
- Redis for caching/sessions
- Stripe integration for billing

**Frontend (Next.js)**:
- React application with Tailwind CSS
- Authentication pages (`/login`, `/register`) 
- Document management interface
- Real-time document generation with streaming

**Worker**:
- Celery-based background task processing (currently minimal)

**Templates**:
- YAML-based document templates in `/templates/`
- Structured generation modes (readme, API docs, research reports, etc.)

### Key Directories

- `backend/app/routers/` - API endpoints grouped by functionality
- `backend/app/processing/` - Document extraction and processing logic
- `backend/app/llm/` - LLM integration (Ollama client and orchestrator)
- `frontend/components/` - Reusable React components
- `frontend/store/` - Zustand state management
- `templates/` - Document generation templates

### Database & Storage

- PostgreSQL with pgvector extension for embeddings
- MinIO (S3-compatible) for file uploads
- Redis for sessions and caching
- User-scoped documents (each user sees only their docs)

### Authentication Flow

- Email/password registration and login
- JWT tokens stored in HTTP-only cookies
- Session-based authentication across API calls
- CORS configured for credentials

### LLM Integration

- Ollama for local LLM inference (default: mistral:7b)
- Streaming responses for real-time generation
- Template-driven document generation
- Embedding-based document search and retrieval

## Environment Configuration

Key environment variables in `.env`:
- Database: `POSTGRES_*` settings
- Storage: `S3_*` settings for MinIO
- LLM: `OLLAMA_URL`, `OLLAMA_DEFAULT_MODEL`
- Auth: `SECRET_KEY`, `SESSION_*` settings
- Billing: `STRIPE_*` settings
- CORS: `CORS_ORIGINS` for frontend domain

## Common Development Tasks

### Adding New API Endpoints
- Create router in `backend/app/routers/`
- Add to `main.py` router includes
- Follow existing patterns for auth decorators

### Frontend Component Development
- **Modern UI System**: Professional component library in `components/ui/`
  - Button, Card, Input, Badge, Progress, Avatar, Stats components
  - Consistent modern color palette with semantic color tokens
  - Glass morphism design with subtle aurora backgrounds
- **Design System**: 
  - Primary: Modern blue/indigo palette
  - Secondary: Purple accent colors
  - Neutrals: Sophisticated gray scale
  - Semantic colors: Success (green), Warning (amber), Error (red)
- **Typography**: Inter font with OpenType features
- **Icons**: Heroicons for consistent visual language
- **Animations**: Smooth transitions, hover states, and loading states
- **Responsive Design**: Mobile-first approach with breakpoint consistency

### Frontend Pages Structure
- `/` - Modern home page with hero section, features, and document generator
- `/login` - Enhanced authentication page with glass morphism design
- `/dashboard` - User account and usage analytics dashboard
- `/studio` - Advanced document generation studio with file upload
- `/pricing` - Subscription plans with modern pricing cards
- `/settings/billing` - Billing management with usage statistics and Stripe integration
- `/doc/[id]` - Document viewer and editor (existing)

### Payment Integration
- **Stripe Integration**: Full subscription management with checkout and webhooks
- **API Routes**: `/api/stripe/create-checkout` and `/api/stripe/webhook`
- **Environment Variables**: Configure Stripe keys in `.env`
- **Pricing Tiers**: Free, Pro ($29/month), Team ($99/month), Enterprise (custom)

### Database Changes
- Modify models in `backend/app/models.py`
- Add Alembic migrations if needed
- Test with fresh DB: `docker compose down -v && docker compose up -d`

### Template Modifications
- Edit YAML files in `templates/`
- Templates define document structure and generation hints
- Test changes by generating documents through the UI