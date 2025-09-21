import json
from pathlib import Path

from indexing.bulk_index import iter_docs


def test_iter_docs_reads_jsonl(tmp_path: Path):
    data_dir = tmp_path / "recipes"
    data_dir.mkdir()
    jsonl_path = data_dir / "recipes.jsonl"
    records = [
        {"title": "Pie", "ingredients": ["1 cup sugar"], "instructions": ["Bake"], "identifier": "pie-1"},
        {"source": "internet_archive", "identifier": "ia-1"}
    ]
    with jsonl_path.open("w", encoding="utf-8") as f:
        for rec in records:
            f.write(json.dumps(rec) + "\n")

    docs = list(iter_docs(data_dir))
    identifiers = {doc.get("identifier") or doc.get("title") for doc in docs}
    assert {"pie-1", "ia-1"}.issubset(identifiers)
