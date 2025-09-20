# Cookbook Repo

Monorepo for harvesting, parsing, indexing, and a web UI.

## Structure
- `harvest/`: data acquisition utilities (Internet Archive, DPLA, etc.)
- `parsers/`: recipe extraction from HTML / JSON-LD
- `indexing/`: Elasticsearch helpers and bulk indexing
- `web/`: Next.js app placeholder
- `infra/`: docker-compose and infra notes

## Quickstart

### Python
```bash
# optional: create venv
python -m venv .venv
# Windows (Git Bash)
source .venv/Scripts/activate
# macOS/Linux
# source .venv/bin/activate
# install deps
pip install -r requirements.txt
```

### Harvest
```bash
# Internet Archive
python -m harvest.ia_search --rows 100 --page 1 --max-pages 5 --out ./data/ia

# DPLA (requires DPLA_API_KEY)
export DPLA_API_KEY=your_key_here
python -m harvest.dpla_search --page-size 50 --max-pages 5 --out ./data/dpla
```

### Parse (example: from OCR/plain text files)
```python
from parsers.recipe_extractor import parse_recipes_from_text
print(parse_recipes_from_text("""PANCAKES\n1 cup flour\n2 tsp baking powder\nMix..."""))
```

### Index to OpenSearch
```bash
# Start OpenSearch via Docker (below), then:
python -m indexing.bulk_index --data ./data --index recipes
```

### Docker services
```bash
docker compose up -d
```

### Web app (placeholder)
```bash
cd web
npm install
npm run dev
```

### API (FastAPI)
```bash
# via Docker Compose
docker compose up -d
# API at http://localhost:8000
# Search
curl "http://localhost:8000/api/search?q=pancakes"
# Get by id
curl "http://localhost:8000/api/recipes/<id>"
```

### Web routes
- Search page: http://localhost:3000/search
- Recipe page: http://localhost:3000/recipes/<id>

### Transform harvested data to recipe docs
```bash
python -m parsers.to_recipe_docs --data ./data --out ./data/recipes.jsonl
```

## Commit message suggestions
- feat(harvest): ia and dpla harvesters + normalization
- feat(parsers): basic heuristic recipe extractor
- feat(index): create OpenSearch mapping + bulk index script
- feat(web): recipe page + IIIF viewer + JSON-LD
