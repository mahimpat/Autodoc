up:
	docker compose up -d

up-gpu:
	docker compose -f docker-compose.yml -f docker-compose.gpu.yml up -d

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

logs-ollama:
	docker compose logs -f ollama

gpu-check:
	docker compose exec ollama nvidia-smi

gpu-test:
	docker run --rm --gpus all nvidia/cuda:11.8-base-ubuntu20.04 nvidia-smi
