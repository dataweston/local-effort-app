"""
Bulk index JSON recipe documents into OpenSearch.
Reads JSON files from ./data and indexes into `recipes` index.
"""
from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path
from typing import Any, Dict, Iterable, Iterator

from opensearchpy import helpers

from .es_client import get_os_client, ensure_recipes_index


def iter_json_files(root: Path) -> Iterator[Path]:
    for path in root.rglob("*.json"):
        if path.suffix == ".jsonl":
            continue
        yield path


def iter_jsonl_files(root: Path) -> Iterator[Path]:
    for path in root.rglob("*.jsonl"):
        yield path


def iter_docs(data_root: Path) -> Iterator[Dict[str, Any]]:
    for fp in iter_json_files(data_root):
        try:
            with open(fp, "r", encoding="utf-8") as f:
                obj = json.load(f)
            if _is_recipe_candidate(obj):
                yield obj
        except Exception as e:
            logging.warning("skip %s: %s", fp, e)
    for fp in iter_jsonl_files(data_root):
        try:
            with open(fp, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        obj = json.loads(line)
                    except json.JSONDecodeError as exc:
                        logging.warning("skip line in %s: %s", fp, exc)
                        continue
                    if _is_recipe_candidate(obj):
                        yield obj
        except Exception as e:
            logging.warning("skip %s: %s", fp, e)


def _is_recipe_candidate(obj: Dict[str, Any]) -> bool:
    if not isinstance(obj, dict):
        return False
    if obj.get("source") in {"internet_archive", "dpla", "mdl", "recollection_wi"}:
        return True
    required = {"title", "ingredients", "instructions"}
    return required.issubset(set(obj.keys()))


def bulk_index(data_root: Path, index: str = "recipes") -> None:
    client = get_os_client()
    ensure_recipes_index(client, index)
    def actions_iter():
        for doc in iter_docs(data_root):
            doc_id = doc.get("identifier") or doc.get("id")
            yield {"_index": index, "_id": doc_id, "_source": doc}

    actions = actions_iter()
    success, errors = helpers.bulk(client, actions, raise_on_error=False, stats_only=False)
    logging.info("indexed=%s errors=%s", success, len(errors) if isinstance(errors, list) else errors)


def main() -> None:
    ap = argparse.ArgumentParser(description="Bulk index JSON files into OpenSearch")
    ap.add_argument("--data", default="./data")
    ap.add_argument("--index", default="recipes")
    ap.add_argument("--log", default="INFO")
    args = ap.parse_args()
    logging.basicConfig(level=getattr(logging, args.log.upper(), logging.INFO), format="%(asctime)s %(levelname)s %(message)s")
    bulk_index(Path(args.data), args.index)


if __name__ == "__main__":
    main()
