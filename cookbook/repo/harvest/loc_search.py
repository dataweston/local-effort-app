"""
Library of Congress harvester focused on cookbook-related materials.

Leverages the public search API (https://www.loc.gov/search/) to pull JSON
records, filters using the common HarvestFilter, and saves normalized JSON
into the target directory.
"""
from __future__ import annotations

import argparse
import json
import logging
import time
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

import requests

from .filters import apply_curation, get_filter
from .terms import flatten_terms, load_terms, quote_term

LOC_SEARCH_URL = "https://www.loc.gov/search/"
MAX_RESULTS_PER_PAGE = 100


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def build_location_groups(chunk_size: int = 2) -> List[List[str]]:
    """Reuse the allowlist to generate manageable location combinations."""
    terms = load_terms()
    locations = terms.get("allow", {}).get("locations", {})
    base = flatten_terms(locations.get("states", []), locations.get("state_abbreviations", []))
    extras = flatten_terms(
        locations.get("counties", []),
        locations.get("cities", []),
        locations.get("regions", []),
    )
    extras = [term for term in extras if term not in base]
    if not extras:
        return [list(dict.fromkeys(base))]
    chunk_size = max(1, chunk_size)
    groups: List[List[str]] = []
    for idx in range(0, len(extras), chunk_size):
        chunk = extras[idx : idx + chunk_size]
        groups.append(list(dict.fromkeys(base + chunk)))
    return groups


def build_queries(chunk_size: int = 2) -> List[str]:
    terms = load_terms()
    allow = terms.get("allow", {})
    cookbook_terms = flatten_terms(
        allow.get("cookbook", []),
        allow.get("community", []),
        allow.get("institutions", []),
    )
    cookbook_clause = "(" + " OR ".join(quote_term(term) for term in cookbook_terms) + ")"
    queries: List[str] = []
    for group in build_location_groups(chunk_size):
        location_clause = "(" + " OR ".join(quote_term(term) for term in group) + ")"
        queries.append(f"{cookbook_clause} {location_clause}")
    return queries


def search_loc(session: requests.Session, query: str, page: int, count: int) -> Dict[str, Any]:
    params: Dict[str, Any] = {
        "q": query,
        "fo": "json",
        "c": min(count, MAX_RESULTS_PER_PAGE),
        "sp": page,
        "fa": ["original-format:book", "digitized:true"],
    }
    for attempt in range(5):
        response = session.get(LOC_SEARCH_URL, params=params, timeout=60)
        if response.status_code == 429:
            wait = 2 ** attempt
            logging.warning('LoC rate limited, sleeping %s seconds', wait)
            time.sleep(wait)
            continue
        response.raise_for_status()
        return response.json()
    response.raise_for_status()
    return response.json()


def extract_results(payload: Dict[str, Any]) -> Iterable[Dict[str, Any]]:
    content = payload.get("content") or {}
    results = content.get("results") or []
    for result in results:
        yield result


def _first_text(value: Any) -> Optional[str]:
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        for item in value:
            text = _first_text(item)
            if text:
                return text
    return None


def _flatten_list(value: Any) -> List[str]:
    results: List[str] = []
    if isinstance(value, str):
        results.append(value)
    elif isinstance(value, (list, tuple)):
        for item in value:
            results.extend(_flatten_list(item))
    elif isinstance(value, dict):
        for item in value.values():
            results.extend(_flatten_list(item))
    return [r for r in (item.strip() for item in results) if r]


def normalize(result: Dict[str, Any]) -> Dict[str, Any]:
    item = result.get("item") or {}
    identifier = result.get("id") or item.get("id")
    description = _flatten_list(result.get("description") or item.get("notes") or [])
    subjects = result.get("subject") or item.get("subjects") or []
    locations = result.get("location") or item.get("location") or []
    resources = result.get("resources") or []
    image_urls = result.get("image_url") or []

    norm: Dict[str, Any] = {
        "source": "library_of_congress",
        "identifier": identifier,
        "title": result.get("title") or item.get("title"),
        "description": "\n\n".join(description) if description else None,
        "subject": subjects,
        "location": locations,
        "year": _first_text(item.get("date") or item.get("dates")),
        "institution": "Library of Congress",
        "metadata": result,
    }

    manifester = None
    if identifier:
        manifester = f"{identifier}?fo=iiif"
    if manifester:
        norm["iiif_manifest"] = manifester

    if image_urls:
        norm["image_preview"] = image_urls[0]

    digital_urls = []
    for resource in resources:
        url = resource.get("url")
        if isinstance(url, str):
            digital_urls.append(url)
    if digital_urls:
        norm["digital_urls"] = digital_urls

    return norm


def harvest(output_dir: Path, per_page: int, max_pages: int, chunk_size: int) -> None:
    ensure_dir(output_dir)
    session = requests.Session()
    session.headers.update({"User-Agent": "local-effort-harvester/0.1 (+https://local-effort-app.example)"})
    harvest_filter = get_filter()
    written = 0

    for query in build_queries(chunk_size):
        logging.info("LoC search query=%s", query)
        for page in range(1, max_pages + 1):
            logging.debug("LoC request page=%s per_page=%s", page, per_page)
            payload = search_loc(session, query=query, page=page, count=per_page)
            results = list(extract_results(payload))
            if not results:
                break
            for entry in results:
                norm = normalize(entry)
                identifier = norm.get("identifier")
                if not identifier:
                    continue
                safe_id = identifier.rstrip("/").split("/")[-1]
                target = output_dir / f"{safe_id}.json"
                if target.exists():
                    logging.debug("exists skipping %s", safe_id)
                    continue
                result = harvest_filter.accepts(norm)
                if result.score < harvest_filter.min_score:
                    logging.info(
                        "Rejected %s score=%s reasons=%s",
                        identifier,
                        result.score,
                        result.details.get("reasons"),
                    )
                    continue
                apply_curation(norm, result)
                with open(target, "w", encoding="utf-8") as f:
                    json.dump(norm, f, ensure_ascii=False, indent=2)
                written += 1
    logging.info("done. wrote=%s files", written)


def main() -> None:
    ap = argparse.ArgumentParser(description="Library of Congress cookbook harvester")
    ap.add_argument("--out", default="./data/loc")
    ap.add_argument("--per-page", type=int, default=50)
    ap.add_argument("--max-pages", type=int, default=3)
    ap.add_argument("--chunk-size", type=int, default=2)
    ap.add_argument("--log", default="INFO")
    args = ap.parse_args()
    logging.basicConfig(level=getattr(logging, args.log.upper(), logging.INFO), format="%(asctime)s %(levelname)s %(message)s")
    harvest(Path(args.out), per_page=args.per_page, max_pages=args.max_pages, chunk_size=args.chunk_size)


if __name__ == "__main__":
    main()
