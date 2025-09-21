from pathlib import Path
import json

from parsers.to_recipe_docs import to_recipe_docs


def test_list_based_descriptions_are_parsed(tmp_path: Path):
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    payload = {
        "source": "internet_archive",
        "identifier": "cookbook-1",
        "description": [
            "FAMOUS STEW",
            "1 lb beef",
            "Simmer until tender."
        ],
    }
    file_path = data_dir / "item.json"
    file_path.write_text(json.dumps(payload), encoding="utf-8")

    docs = list(to_recipe_docs(data_dir))
    assert docs, "Expected recipes from list-based description"
    assert any(doc["title"] for doc in docs)
    assert any(doc["ingredients"] for doc in docs)
