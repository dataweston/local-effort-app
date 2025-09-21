from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict

TERMS_PATH = Path(__file__).with_name("terms.json")


@lru_cache()
def load_terms() -> Dict[str, Any]:
    with TERMS_PATH.open("r", encoding="utf-8") as f:
        data: Dict[str, Any] = json.load(f)
    return data


def quote_term(term: str) -> str:
    term = term.strip()
    if not term:
        return term
    if " " in term or ":" in term or "-" in term or term.lower() != term:
        return f'"{term}"'
    return term


def flatten_terms(*groups: Any) -> list[str]:
    results: list[str] = []
    for group in groups:
        if isinstance(group, dict):
            results.extend(flatten_terms(*group.values()))
        elif isinstance(group, (list, tuple, set)):
            for item in group:
                results.extend(flatten_terms(item))
        elif isinstance(group, str):
            results.append(group)
    return [t for t in results if isinstance(t, str) and t.strip()]
