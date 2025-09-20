# Infrastructure

This repo includes a simple `docker-compose.yml` to bring up:

- Elasticsearch 8.x on port 9200 with security disabled (local dev only)
- A placeholder Python API container serving static files on port 8000
- A Node-based `web` container intended to run a Next.js app on port 3000

## Prerequisites
- Docker Desktop

## Usage
```bash
# From the repository root
docker compose up -d

# View logs
docker compose logs -f

# Shut down
docker compose down -v
```

## Notes
- For production, enable security on Elasticsearch and configure credentials.
- Replace the API placeholder with a real FastAPI/Flask app.
- Scaffold the web app in `web/` using Next.js.
