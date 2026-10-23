FROM python:3.12-slim
WORKDIR /app/simulator
COPY simulator/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY simulator/ .
COPY data/ /app/data/
COPY frontend/public/models/ /app/frontend/public/models/
COPY frontend/src/IngestionLayer.tsx /app/frontend/src/IngestionLayer.tsx
COPY frontend/src/main.tsx /app/frontend/src/main.tsx
RUN useradd --create-home --uid 10001 ademix
USER ademix
EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]

