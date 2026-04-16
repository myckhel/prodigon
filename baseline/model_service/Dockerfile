# Build context should be baseline/ (set in docker-compose.yml)
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY model_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy shared module first (changes less frequently)
COPY shared/ /app/shared/

# Copy service code
COPY model_service/ /app/model_service/

EXPOSE 8001

CMD ["uvicorn", "model_service.app.main:app", "--host", "0.0.0.0", "--port", "8001"]
