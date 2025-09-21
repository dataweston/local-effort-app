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
from typing import Any, Dict, Iterable, List, Optional

import requests
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

DPLA_API_BASE = "https://api.dp.la/v2/items"

from .filters import apply_curation, get_filter
from .terms import flatten_terms, load_terms, quote_term


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def build_query_plan() -> Dict[str, Any]:
    terms = load_terms()
    allow = terms.get("allow", {})
    deny = terms.get("deny", {})

    cookbook_terms = flatten_terms(allow.get("cookbook", []))
    community_terms = flatten_terms(allow.get("community", []), allow.get("institutions", []))
    negative_terms = flatten_terms(deny.get("keywords", []))

    positive_fields = [
        "sourceResource.title",
        "sourceResource.description",
        "sourceResource.subject.name",
        "dataProvider",
    ]
    positive_clauses: List[str] = []
    for term in cookbook_terms + community_terms:
        quoted = quote_term(term)
        field_clauses = [f"{field}:{quoted}" for field in positive_fields]
        positive_clauses.append("(" + " OR ".join(field_clauses) + ")")
    query = "(" + " OR ".join(positive_clauses) + ")"
    if negative_terms:
        negatives = " ".join(f"-{quote_term(term)}" for term in negative_terms)
        query = f"{query} {negatives}".strip()

    subject_filter = "|".join(community_terms) if community_terms else None

    locations = allow.get("locations", {})
    spatial_terms = flatten_terms(
        locations.get("counties", []),
        locations.get("states", []),
        locations.get("cities", []),
    )
    # Preserve order while deduplicating
    spatial_terms = list(dict.fromkeys(spatial_terms))

    return {
        "query": query,
        "subject_filter": subject_filter,
        "spatial_terms": spatial_terms,
    }


@retry(wait=wait_exponential(multiplier=1, min=1, max=10),
       stop=stop_after_attempt(5),
       retry=retry_if_exception_type(requests.RequestException))
def _get(url: str, **params) -> Dict[str, Any]:
    r = requests.get(url, params=params, timeout=30)
    r.raise_for_status()
    return r.json()


def normalize(item: Dict[str, Any]) -> Dict[str, Any]:
    source_resource = item.get("sourceResource", {}) or {}
    title = _first_text(source_resource.get("title"))
    description = _first_text(source_resource.get("description"))
    subjects = source_resource.get("subject")
    spatial = _collect_spatial(source_resource.get("spatial"))
    provider = item.get("provider") or {}
    provider_name = None
    if isinstance(provider, dict):
        provider_name = provider.get("name")
    elif isinstance(provider, str):
        provider_name = provider
    if not provider_name:
        dp = item.get("dataProvider")
        provider_name = _first_text(dp)

    norm: Dict[str, Any] = {
        "source": "dpla",
        "id": item.get("id"),
        "identifier": item.get("id"),
        "title": title,
        "subject": subjects,
        "spatial": spatial,
        "description": description,
        "isShownAt": item.get("isShownAt"),
        "provider": provider,
        "institution": provider_name,
        "data": item,
    }
    iiif = _extract_iiif(item)
    if iiif:
        norm["iiif_manifest"] = iiif
    return norm


def _first_text(value: Any) -> Optional[str]:
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        for item in value:
            text = _first_text(item)
            if text:
                return text
    if isinstance(value, dict):
        for v in value.values():
            text = _first_text(v)
            if text:
                return text
    return None


def _collect_spatial(value: Any) -> List[str]:
    names: List[str] = []
    if isinstance(value, list):
        for item in value:
            names.extend(_collect_spatial(item))
    elif isinstance(value, dict):
        name = value.get("name")
        if isinstance(name, str):
            names.append(name)
        for v in value.values():
            names.extend(_collect_spatial(v))
    elif isinstance(value, str):
        names.append(value)
    # Deduplicate while preserving order
    return list(dict.fromkeys([n for n in names if isinstance(n, str)]))


def _extract_iiif(item: Dict[str, Any]) -> Optional[str]:
    has_view = item.get("hasView")
    candidates: List[str] = []
    if isinstance(has_view, list):
        for view in has_view:
            if isinstance(view, dict):
                candidate = view.get("@id") or view.get("id")
                if isinstance(candidate, str) and "iiif" in candidate.lower():
                    candidates.append(candidate)
    object_url = item.get("object")
    if isinstance(object_url, str) and "iiif" in object_url.lower():
        candidates.append(object_url)
    return candidates[0] if candidates else None


def harvest(out_dir: Path, page_size: int, max_pages: int, api_key: Optional[str]) -> None:
    ensure_dir(out_dir)
    plan = build_query_plan()
    harvest_filter = get_filter()

    base_params: Dict[str, Any] = {
        "q": plan["query"],
        "page_size": page_size,
        "sourceResource.type": "text",
    }
    if plan.get("subject_filter"):
        base_params["sourceResource.subject.name"] = plan["subject_filter"]
    if api_key:
        base_params["api_key"] = api_key

    total = 0
    for spatial_term in plan.get("spatial_terms", []) or [None]:
        page = 1
        for _ in range(max_pages):
            params = dict(base_params)
            if spatial_term:
                params["sourceResource.spatial.name"] = spatial_term
            logging.info("DPLA spatial=%s page=%s size=%s", spatial_term or "", page, page_size)
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
                result = harvest_filter.accepts(norm)
                if result.score < harvest_filter.min_score:
                    logging.info(
                        "Rejected %s score=%s reasons=%s",
                        ident,
                        result.score,
                        result.details.get("reasons"),
                    )
                    continue
                apply_curation(norm, result)
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
