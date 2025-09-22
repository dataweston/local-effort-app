"""
DPLA harvester for Midwest content.

Uses DPLA_API_KEY from env. Queries q=midwest with spatial filters for
Minnesota/Wisconsin, normalizes, and writes JSON files to ./data/dpla/{id}.json.
"""
from __future__ import annotations

import argparse
import json
import logging
import os
from pathlib import Path
from datetime import datetime
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

    cookbook_terms = [t for t in flatten_terms(allow.get("cookbook", [])) if t]
    community_terms = flatten_terms(allow.get("community", []), allow.get("institutions", []))
    key_terms = list(dict.fromkeys(cookbook_terms))[:4] or ["cookbook"]
    query = "(" + " OR ".join(quote_term(term) for term in key_terms) + ")"

    negative_terms = flatten_terms(deny.get("keywords", []))
    if negative_terms:
        negatives = " ".join(f"-{quote_term(term)}" for term in negative_terms)
        query = f"{query} {negatives}".strip()

    subject_filter = None

    locations = allow.get("locations", {})
    spatial_terms = flatten_terms(
        locations.get("counties", []),
        locations.get("states", []),
        locations.get("states_tier2", []),
        locations.get("cities", []),
    )
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
    subjects = _collect_subjects(source_resource.get("subject"))
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

    raw_links = {k: item.get(k) for k in ("object", "isShownAt", "hasView") if item.get(k) is not None}
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
    }
    metadata_wrapper: Dict[str, Any] = {}
    if source_resource:
        metadata_wrapper["sourceResource"] = source_resource
    date_info = _extract_date_info(source_resource.get("date"))
    if date_info:
        metadata_wrapper.setdefault("metadata", {}).update(date_info)
        date_value = date_info.get("date")
        if date_value and "year" not in norm:
            try:
                norm["year"] = int(date_value[:4])
            except ValueError:
                pass
    if metadata_wrapper:
        norm["metadata"] = metadata_wrapper
    if raw_links:
        norm["data"] = raw_links
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


def _collect_subjects(value: Any) -> List[str]:
    names: List[str] = []
    if isinstance(value, list):
        for item in value:
            names.extend(_collect_subjects(item))
    elif isinstance(value, dict):
        name = value.get("name") or value.get("label")
        if isinstance(name, str):
            names.append(name)
        for v in value.values():
            if v is name:
                continue
            names.extend(_collect_subjects(v))
    elif isinstance(value, str):
        names.append(value)
    return list(dict.fromkeys([n for n in names if isinstance(n, str)]))


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

YEAR_PATTERN = re.compile(r'(1[6-9]\d{2}|20\d{2})')


def _coerce_iso_date(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        value = str(int(value))
    value = str(value).strip()
    if not value:
        return None
    value = value.replace('\u2013', '-').replace('\u2014', '-')
    value = value.strip(" .;?,")
    try:
        datetime.strptime(value, '%Y-%m-%d')
        return value
    except ValueError:
        pass
    try:
        datetime.strptime(value, '%Y-%m')
        return f'{value}-01'
    except ValueError:
        pass
    if value.isdigit() and len(value) == 4:
        return f'{value}-01-01'
    lowered = value.lower()
    for prefix in ('circa', 'ca.', 'c.', 'ca ', 'c ', 'around', 'about', 'approx', 'approx.'):
        if lowered.startswith(prefix):
            stripped = value[len(prefix):].strip(' .')
            iso = _coerce_iso_date(stripped)
            if iso:
                return iso
    for sep in (' - ', '-', '/', ' to '):
        if sep in value:
            first = value.split(sep)[0].strip()
            if first and first != value:
                iso = _coerce_iso_date(first)
                if iso:
                    return iso
    match = YEAR_PATTERN.search(value)
    if match:
        year = match.group(1)
        return f'{year}-01-01'
    return None


def _extract_date_info(date_field: Any) -> Optional[Dict[str, Any]]:
    raw_dates: List[str] = []
    normalized_dates: List[str] = []
    begins: List[str] = []
    ends: List[str] = []

    def collect(value: Any) -> None:
        if value is None:
            return
        if isinstance(value, list):
            for item in value:
                collect(item)
            return
        if isinstance(value, dict):
            display = value.get('displayDate') or value.get('label') or value.get('value')
            if isinstance(display, str) and display.strip():
                text = display.strip()
                raw_dates.append(text)
                iso_display = _coerce_iso_date(text)
                if iso_display:
                    normalized_dates.append(iso_display)
            for key in ('date', '@value'):
                if key in value:
                    collect(value[key])
            begin = value.get('begin') or value.get('start') or value.get('from')
            end = value.get('end') or value.get('stop') or value.get('to')
            iso_begin = _coerce_iso_date(begin)
            iso_end = _coerce_iso_date(end)
            if iso_begin:
                begins.append(iso_begin)
                normalized_dates.append(iso_begin)
            if iso_end:
                ends.append(iso_end)
                normalized_dates.append(iso_end)
            return
        if isinstance(value, (int, float)):
            value = str(int(value))
        if isinstance(value, str):
            text = value.strip()
            if text:
                raw_dates.append(text)
                iso = _coerce_iso_date(text)
                if iso:
                    normalized_dates.append(iso)

    collect(date_field)
    raw_dates = list(dict.fromkeys(raw_dates))
    normalized_dates = list(dict.fromkeys([d for d in normalized_dates if d]))
    begins = list(dict.fromkeys([b for b in begins if b]))
    ends = list(dict.fromkeys([e for e in ends if e]))
    if not (raw_dates or normalized_dates or begins or ends):
        return None
    info: Dict[str, Any] = {}
    if normalized_dates:
        info['date'] = normalized_dates[0]
        info['normalized_dates'] = normalized_dates
    if raw_dates:
        info['raw_dates'] = raw_dates
    date_range: Dict[str, Optional[str]] = {}
    if begins:
        date_range['begin'] = begins[0]
    if ends:
        date_range['end'] = ends[0]
    if date_range:
        info['date_range'] = date_range
    return info

def harvest(out_dir: Path, page_size: int, max_pages: int, api_key: Optional[str], providers: Optional[List[str]] = None, spatial_override: Optional[List[str]] = None) -> None:
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
    if providers:
        base_params["provider.name"] = "|".join(providers)
    if api_key:
        base_params["api_key"] = api_key

    total = 0
    spatial_terms = spatial_override if spatial_override else plan.get("spatial_terms", [])
    if not spatial_terms:
        spatial_terms = [None]
    for spatial_term in spatial_terms:
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
    ap.add_argument("--provider", action="append", dest="providers", help="Filter by DPLA provider.name (repeatable)")
    ap.add_argument("--spatial-term", action="append", dest="spatial_terms", help="Override spatial facets (repeatable)")
    ap.add_argument("--log", default="INFO")
    args = ap.parse_args()
    logging.basicConfig(level=getattr(logging, args.log.upper(), logging.INFO), format="%(asctime)s %(levelname)s %(message)s")
    api_key = os.getenv("DPLA_API_KEY")
    harvest(Path(args.out), args.page_size, args.max_pages, api_key, providers=args.providers, spatial_override=args.spatial_terms)


if __name__ == "__main__":
    main()
