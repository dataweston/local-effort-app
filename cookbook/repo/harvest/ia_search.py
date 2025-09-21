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

from .filters import apply_curation, get_filter
from .terms import flatten_terms, load_terms, quote_term


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def build_query() -> str:
    terms = load_terms()
    allow = terms.get("allow", {})
    deny = terms.get("deny", {})

    cookbook_terms = flatten_terms(
        allow.get("cookbook", []),
        allow.get("community", []),
        allow.get("institutions", []),
    )
    cookbook_fields = ["title", "subject", "description", "creator", "publisher", "collection"]
    cookbook_parts: List[str] = []
    for field in cookbook_fields:
        field_terms = " OR ".join(f"{field}:{quote_term(term)}" for term in cookbook_terms)
        cookbook_parts.append(f"({field_terms})")
    cookbook_clause = "(" + " OR ".join(cookbook_parts) + ")"

    locations = allow.get("locations", {})
    location_terms = flatten_terms(
        locations.get("states", []),
        locations.get("state_abbreviations", []),
        locations.get("counties", []),
        locations.get("cities", []),
        locations.get("regions", []),
    )
    location_fields = ["title", "description", "subject", "creator", "publisher", "coverage", "notes"]
    location_parts: List[str] = []
    for field in location_fields:
        field_terms = " OR ".join(f"{field}:{quote_term(term)}" for term in location_terms)
        location_parts.append(f"({field_terms})")
    location_clause = "(" + " OR ".join(location_parts) + ")"

    negative_terms = flatten_terms(deny.get("keywords", []))
    negative_clause = ""
    if negative_terms:
        negative_fields = ["title", "description", "subject", "publisher"]
        neg_parts: List[str] = []
        for field in negative_fields:
            field_terms = " OR ".join(f"{field}:{quote_term(term)}" for term in negative_terms)
            neg_parts.append(f"({field_terms})")
        negative_clause = " AND NOT (" + " OR ".join(neg_parts) + ")"

    availability_clause = "(mediatype:texts AND (format:pdf OR format:\"Text PDF\" OR has_fulltext:true))"

    return f"{availability_clause} AND {cookbook_clause} AND {location_clause}{negative_clause}"


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


def _find_iiif_manifest(meta: Dict[str, Any]) -> Optional[str]:
    def _walk(value: Any) -> Optional[str]:
        if isinstance(value, str):
            lowered = value.lower()
            if "iiif" in lowered and "manifest" in lowered:
                return value
            return None
        if isinstance(value, dict):
            for v in value.values():
                found = _walk(v)
                if found:
                    return found
        elif isinstance(value, list):
            for item in value:
                found = _walk(item)
                if found:
                    return found
        return None

    return _walk(meta)


def _find_pdf(record: Dict[str, Any], meta: Dict[str, Any]) -> Optional[str]:
    files = meta.get("files") if isinstance(meta, dict) else None
    identifier = record.get("identifier") or meta.get("identifier")
    if isinstance(files, list):
        for file in files:
            if not isinstance(file, dict):
                continue
            name = str(file.get("name", ""))
            if name.lower().endswith(".pdf") and identifier:
                return f"https://archive.org/download/{identifier}/{name}"
            fmt = str(file.get("format", "")).lower()
            if "pdf" in fmt and file.get("source"):
                return str(file.get("source"))
    return None


def normalize(record: Dict[str, Any], meta: Dict[str, Any]) -> Dict[str, Any]:
    creator = record.get("creator")
    if isinstance(creator, list):
        creator = next((c for c in creator if isinstance(c, str)), None)
    normalized: Dict[str, Any] = {
        "source": "internet_archive",
        "identifier": record.get("identifier"),
        "title": record.get("title"),
        "creator": creator,
        "year": record.get("year"),
        "subject": record.get("subject"),
        "description": record.get("description"),
        "metadata": meta,
    }
    if isinstance(creator, str):
        normalized["institution"] = creator
    iiif_url = _find_iiif_manifest(meta)
    if iiif_url:
        normalized["iiif_manifest"] = iiif_url
    pdf_url = _find_pdf(record, meta)
    if pdf_url:
        normalized["pdf_url"] = pdf_url
    return normalized


def harvest(output_dir: Path, rows: int, start_page: int, max_pages: int) -> None:
    ensure_dir(output_dir)
    session = requests.Session()
    query = build_query()
    harvest_filter = get_filter()
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
                result = harvest_filter.accepts(out)
                if result.score < harvest_filter.min_score:
                    logging.info(
                        "Rejected %s score=%s reasons=%s",
                        ident,
                        result.score,
                        result.details.get("reasons"),
                    )
                    continue
                apply_curation(out, result)
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
