# Build context should be baseline/ (set in docker-compose.yml)
FROM python:3.11-slim

WORKDIR /app

COPY worker_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY shared/ /app/shared/
COPY worker_service/ /app/worker_service/

EXPOSE 8002

CMD ["uvicorn", "worker_service.app.main:app", "--host", "0.0.0.0", "--port", "8002"]
