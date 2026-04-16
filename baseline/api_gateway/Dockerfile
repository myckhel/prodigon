# Build context should be baseline/ (set in docker-compose.yml)
FROM python:3.11-slim

WORKDIR /app

COPY api_gateway/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY shared/ /app/shared/
COPY api_gateway/ /app/api_gateway/

EXPOSE 8000

CMD ["uvicorn", "api_gateway.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
