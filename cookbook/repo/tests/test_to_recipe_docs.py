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


def test_loc_resources_surface_cookbook_title(tmp_path: Path):
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    payload = {
        "source": "library_of_congress",
        "identifier": "loc-1",
        "metadata": {
            "metadata": {"cookbook_title": "Community Heritage Recipes"},
            "resources": [
                {"text": ["FANCY PIE\n1 cup sugar\nBake at 350 degrees."]}
            ],
        },
    }
    (data_dir / "loc.json").write_text(json.dumps(payload), encoding="utf-8")

    docs = list(to_recipe_docs(data_dir))
    assert docs, "Expected recipe generated from LoC resource text"
    recipe = docs[0]
    assert recipe["title"] == "FANCY PIE"
    assert recipe["cookbook_title"] == "Community Heritage Recipes"
    assert recipe["ingredients"], "Ingredients should be parsed from resource text"
