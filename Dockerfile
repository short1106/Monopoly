FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    APRIL_DB_PATH=/data/april.db

WORKDIR /srv
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

RUN useradd --create-home april && mkdir -p /data && chown april:april /data
USER april

EXPOSE 8000
# Genau ein Prozess: SQLite, Login-Sperre und Wochenjob gehen von einer Instanz aus.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]
