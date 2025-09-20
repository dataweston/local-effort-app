"""
Internet Archive harvester.

Queries `advancedsearch` for Minnesota/Wisconsin/Midwest content, paginates, fetches
full metadata for each identifier, normalizes, and writes JSON to `./data/ia/{id}.json`.

Usage (Git Bash on Windows):
  python -m harvest.ia_search --rows 100 --page 1 --max-pages 50
"""
from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

import requests
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

IA_SEARCH_URL = "https://archive.org/advancedsearch.php"
IA_METADATA_URL = "https://archive.org/metadata/{identifier}"


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def build_query() -> str:
    # Cookbooks-only signal (title/subject)
    cookbook_terms = [
        '"cookbook"', '"cook book"', "recipe", "recipes", "cookery", "cooking", '"home economics"'
    ]
    cookbook_clause = "(title:(" + " OR ".join(cookbook_terms) + ") OR subject:(" + " OR ".join(cookbook_terms) + "))"

    # Regional signal: MN/WI/IA or "Midwest" in title/desc/subject/publisher
    region_terms = ["Minnesota", "Wisconsin", "Iowa", "Midwest"]
    region_fields = ["title", "description", "subject", "publisher"]
    region_parts: List[str] = []
    for f in region_fields:
        field_or = " OR ".join([f + ":" + t for t in region_terms])
        region_parts.append("(" + field_or + ")")
    region_clause = "(" + " OR ".join(region_parts) + ")"

    # Prefer text materials (IA uses mediatype:texts)
    mediatype_clause = "mediatype:texts"

    # Final: text AND cookbook AND (MN/WI/IA/Midwest across fields)
    return f"({mediatype_clause}) AND {cookbook_clause} AND {region_clause}"


@retry(wait=wait_exponential(multiplier=1, min=1, max=10),
       stop=stop_after_attempt(5),
       retry=retry_if_exception_type(requests.RequestException))
def _get(session: requests.Session, url: str, **kwargs) -> requests.Response:
    resp = session.get(url, timeout=30, **kwargs)
    resp.raise_for_status()
    return resp


def ia_search(session: requests.Session, query: str, fields: Optional[List[str]], rows: int, page: int) -> Dict[str, Any]:
    params: Dict[str, Any] = {"q": query, "output": "json", "rows": rows, "page": page}
    if fields:
        params["fl[]"] = fields
    r = _get(session, IA_SEARCH_URL, params=params)
    return r.json()


def fetch_metadata(session: requests.Session, identifier: str) -> Dict[str, Any]:
    r = _get(session, IA_METADATA_URL.format(identifier=identifier))
    return r.json()


def normalize(record: Dict[str, Any], meta: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "source": "internet_archive",
        "identifier": record.get("identifier"),
        "title": record.get("title"),
        "creator": record.get("creator"),
        "year": record.get("year"),
        "subject": record.get("subject"),
        "description": record.get("description"),
        "metadata": meta,
    }


def harvest(output_dir: Path, rows: int, start_page: int, max_pages: int) -> None:
    ensure_dir(output_dir)
    session = requests.Session()
    query = build_query()
    page = start_page
    total: Optional[int] = None
    fetched = 0

    while page < start_page + max_pages:
        logging.info("IA search page=%s rows=%s", page, rows)
        data = ia_search(session, query, fields=["identifier", "title", "creator", "year", "subject", "description"], rows=rows, page=page)
        resp = data.get("response", {})
        if total is None:
            total = resp.get("numFound")
            logging.info("numFound=%s", total)
        docs: Iterable[Dict[str, Any]] = resp.get("docs", [])
        if not docs:
            break
        for doc in docs:
            ident = doc.get("identifier")
            if not ident:
                continue
            target = output_dir / f"{ident}.json"
            if target.exists():
                logging.debug("exists, skipping %s", ident)
                continue
            try:
                meta = fetch_metadata(session, ident)
                out = normalize(doc, meta)
                with open(target, "w", encoding="utf-8") as f:
                    json.dump(out, f, ensure_ascii=False, indent=2)
                fetched += 1
            except Exception as e:
                logging.warning("failed %s: %s", ident, e)
        page += 1
    logging.info("done. wrote=%s files", fetched)


def main() -> None:
    ap = argparse.ArgumentParser(description="Internet Archive harvester for Minnesota/Wisconsin/Midwest")
    ap.add_argument("--rows", type=int, default=100)
    ap.add_argument("--page", type=int, default=1)
    ap.add_argument("--max-pages", type=int, default=10)
    ap.add_argument("--out", default="./data/ia")
    ap.add_argument("--log", default="INFO")
    args = ap.parse_args()
    logging.basicConfig(level=getattr(logging, args.log.upper(), logging.INFO), format="%(asctime)s %(levelname)s %(message)s")
    harvest(Path(args.out), rows=args.rows, start_page=args.page, max_pages=args.max_pages)


if __name__ == "__main__":
    main()
