# Cookbook Static Dataset & Moderation Runbook

## Generate the local snapshot
1. Ensure `data/recipes.jsonl` is up to date (`python -m parsers.to_recipe_docs --data ./data --out ./data/recipes.jsonl`).
2. Build the static bundle consumed by the UI:
   ```bash
   python cookbook/repo/tools/build_static_recipes.py
   ```
   This writes `public/cookbook/index.json` plus `public/cookbook/recipes/*.json` with banned keywords automatically filtered out.
3. Commit the regenerated files or deploy them with the front-end assets.

## Library of Congress harvesting guidelines
- Rate limit: 20 requests/minute, block = 1 hour. Use the built-in pacing in `harvest/loc_search.py` (default 3.5s between calls).
- Recommended batch command:
  ```powershell
  $env:LOC_API_KEY = '<your key>'
  for ($i = 1; $i -le 24; $i++) {
    python -m harvest.loc_search --out ./data/loc --per-page 25 --max-pages 2 --chunk-size 20 --log INFO
    Start-Sleep -Seconds 300
  }
  ```

## Moderator workflow (search & recipe pages)
- Toggle moderator mode from the search page header.
- Right-click a result to hide it locally (saved in `localStorage` under `cookbook.hiddenIds`).
- Use the “Copy hidden list” button to share IDs with the team before removing them upstream.
- On recipe pages, moderator mode surfaces hide/unhide buttons and reports when an item is hidden locally.

## Deployment checklist
- Rebuild the static dataset before release.
- Sync `data/recipes.jsonl` and rerun `tools/build_static_recipes.py`.
- Restart the FastAPI service so it reloads the normalized local dataset.
- Spot-check `/api/stats`, `/api/search`, and `/api/recipes/{id}` with the updated front-end filters.
