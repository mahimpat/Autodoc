FROM python:3.11-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
RUN apt-get update && apt-get install -y build-essential poppler-utils tesseract-ocr && rm -rf /var/lib/apt/lists/*
COPY worker/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY worker /app
CMD ["celery", "-A", "tasks.app", "worker", "--loglevel=INFO", "--concurrency=1"]
