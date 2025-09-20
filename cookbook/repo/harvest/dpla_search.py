"""
DPLA harvester for Midwest content.

Uses `DPLA_API_KEY` from env. Queries q=midwest with spatial filters for
Minnesota/Wisconsin, normalizes, and writes JSON files to `./data/dpla/{id}.json`.
"""
from __future__ import annotations

import argparse
import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, Iterable, Optional

import requests
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

DPLA_API_BASE = "https://api.dp.la/v2/items"


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


@retry(wait=wait_exponential(multiplier=1, min=1, max=10),
       stop=stop_after_attempt(5),
       retry=retry_if_exception_type(requests.RequestException))
def _get(url: str, **params) -> Dict[str, Any]:
    r = requests.get(url, params=params, timeout=30)
    r.raise_for_status()
    return r.json()


def normalize(item: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "source": "dpla",
        "id": item.get("id"),
        "title": item.get("sourceResource", {}).get("title"),
        "subject": item.get("sourceResource", {}).get("subject"),
        "spatial": item.get("sourceResource", {}).get("spatial"),
        "description": item.get("sourceResource", {}).get("description"),
        "isShownAt": item.get("isShownAt"),
        "provider": item.get("provider"),
        "data": item,
    }


def harvest(out_dir: Path, page_size: int, max_pages: int, api_key: Optional[str]) -> None:
    ensure_dir(out_dir)
    params: Dict[str, Any] = {
        "q": "midwest",
        "page_size": page_size,
        # filter for Minnesota OR Wisconsin in spatial
        "sourceResource.spatial.name": ["Minnesota", "Wisconsin"],
    }
    if api_key:
        params["api_key"] = api_key

    page = 1
    total = 0
    for _ in range(max_pages):
        logging.info("DPLA page=%s size=%s", page, page_size)
        data = _get(DPLA_API_BASE, page=page, **params)
        docs: Iterable[Dict[str, Any]] = data.get("docs", [])
        if not docs:
            break
        for item in docs:
            ident = item.get("id")
            if not ident:
                continue
            target = out_dir / f"{ident}.json"
            if target.exists():
                continue
            norm = normalize(item)
            with open(target, "w", encoding="utf-8") as f:
                json.dump(norm, f, ensure_ascii=False, indent=2)
            total += 1
        page += 1
    logging.info("done. wrote=%s files", total)


def main() -> None:
    ap = argparse.ArgumentParser(description="DPLA harvester for Midwest content")
    ap.add_argument("--page-size", type=int, default=50)
    ap.add_argument("--max-pages", type=int, default=20)
    ap.add_argument("--out", default="./data/dpla")
    ap.add_argument("--log", default="INFO")
    args = ap.parse_args()
    logging.basicConfig(level=getattr(logging, args.log.upper(), logging.INFO), format="%(asctime)s %(levelname)s %(message)s")
    api_key = os.getenv("DPLA_API_KEY")
    harvest(Path(args.out), args.page_size, args.max_pages, api_key)


if __name__ == "__main__":
    main()
