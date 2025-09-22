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


def build_location_groups(chunk_size: int = 2) -> List[List[str]]:
    """Return grouped location terms so advancedsearch queries stay below size limits."""
    terms = load_terms()
    locations = terms.get("allow", {}).get("locations", {})
    base = flatten_terms(
        locations.get("states", []),
        locations.get("states_tier2", []),
        locations.get("state_abbreviations", []),
        locations.get("state_abbreviations_tier2", []),
    )
    extras = flatten_terms(
        locations.get("counties", []),
        locations.get("cities", []),
        locations.get("regions", []),
    )
    extras = [term for term in extras if term not in base]
    if chunk_size < 1:
        chunk_size = 10
    groups: List[List[str]] = []
    if not extras:
        groups.append(list(dict.fromkeys(base)))
        return groups
    for idx in range(0, len(extras), chunk_size):
        chunk = extras[idx : idx + chunk_size]
        groups.append(list(dict.fromkeys(base + chunk)))
    return groups


def build_query(location_terms: Optional[List[str]] = None) -> str:
    terms = load_terms()
    allow = terms.get("allow", {})
    deny = terms.get("deny", {})

    cookbook_terms = flatten_terms(allow.get("cookbook", []))
    community_terms = flatten_terms(allow.get("community", []))[:12]
    institution_terms = flatten_terms(allow.get("institutions", []))[:8]
    search_terms = cookbook_terms + community_terms + institution_terms
    cookbook_clause = "(" + " OR ".join(quote_term(term) for term in search_terms) + ")"

    locations = allow.get("locations", {})
    if location_terms is None:
        location_terms = flatten_terms(
            locations.get("states", []),
            locations.get("states_tier2", []),
            locations.get("state_abbreviations", []),
            locations.get("state_abbreviations_tier2", []),
            locations.get("counties", []),
            locations.get("cities", []),
            locations.get("regions", []),
        )
    else:
        location_terms = list(dict.fromkeys(location_terms))
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

...


