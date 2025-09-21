from __future__ import annotations

"""
Transform harvested IA/DPLA JSON into recipe-like documents when possible.
This is a placeholder heuristic: it looks for text fields and attempts to
extract recipes using parse_recipes_from_text.
"""
import json
from pathlib import Path
from typing import Any, Dict, Iterable, Iterator, List

from .recipe_extractor import parse_recipes_from_text


def _collect_text(value: Any) -> List[str]:
    texts: List[str] = []
    if isinstance(value, str):
        texts.append(value)
    elif isinstance(value, dict):
        # Prefer explicit textual keys when available
        for key in ("value", "text", "description"):
            if isinstance(value.get(key), str):
                texts.append(value[key])
        for v in value.values():
            texts.extend(_collect_text(v))
    elif isinstance(value, list):
        simple_strings = [item for item in value if isinstance(item, str)]
        if simple_strings:
            texts.append("\n".join(simple_strings))
        for item in value:
            if not isinstance(item, str):
                texts.extend(_collect_text(item))
    return [t for t in texts if isinstance(t, str) and t.strip()]


def iter_harvested_files(root: Path) -> Iterator[Path]:
    for p in root.rglob("*.json"):
        yield p


def to_recipe_docs(data_root: Path) -> Iterator[Dict]:
    for fp in iter_harvested_files(data_root):
        try:
            obj = json.loads(fp.read_text(encoding="utf-8"))
        except Exception:
            continue
        text_candidates = []
        if isinstance(obj, dict):
            # IA/DPLA may have description/metadata fields containing text
            for key in ("description", "metadata", "data"):
                val = obj.get(key)
                if val is None:
                    continue
                text_candidates.extend(_collect_text(val))
        if not text_candidates:
            continue
        for text in text_candidates:
            recipes = parse_recipes_from_text(text)
            for r in recipes:
                yield {
                    "source": obj.get("source"),
                    "identifier": obj.get("identifier") or obj.get("id"),
                    "title": r.get("title"),
                    "ingredients": r.get("ingredients"),
                    "instructions": r.get("instructions"),
                }

if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="./data")
    ap.add_argument("--out", default="./data/recipes.jsonl")
    args = ap.parse_args()
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", encoding="utf-8") as f:
        for doc in to_recipe_docs(Path(args.data)):
            f.write(json.dumps(doc, ensure_ascii=False) + "\n")
