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
        yield path


def iter_docs(data_root: Path) -> Iterator[Dict[str, Any]]:
    for fp in iter_json_files(data_root):
        try:
            with open(fp, "r", encoding="utf-8") as f:
                obj = json.load(f)
            # Attempt to map to recipe shape if present
            if obj.get("source") in ("internet_archive", "dpla"):
                # Leave as-is; downstream can enrich
                yield obj
            elif {"title", "ingredients", "instructions"}.issubset(obj.keys()):
                yield obj
        except Exception as e:
            logging.warning("skip %s: %s", fp, e)


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
