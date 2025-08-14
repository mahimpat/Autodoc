up:
	docker compose up -d

down:
	docker compose down

rebuild:
	docker compose build --no-cache && docker compose up -d

pull-model:
	docker compose exec ollama ollama pull $(or $(MODEL),mistral:7b)

logs-api:
	docker compose logs -f api

logs-frontend:
	docker compose logs -f frontend
