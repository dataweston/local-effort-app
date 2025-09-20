"""
OpenSearch client and index setup.

Connects via env vars and ensures a `recipes` index with an autocomplete analyzer.
"""
from __future__ import annotations

import os
from opensearchpy import OpenSearch


def get_os_client() -> OpenSearch:
    host = os.getenv("OS_HOST", "http://localhost:9200")
    username = os.getenv("OS_USERNAME")
    password = os.getenv("OS_PASSWORD")
    if username and password:
        return OpenSearch(hosts=[host], http_auth=(username, password), use_ssl=host.startswith("https"), verify_certs=False)
    return OpenSearch(hosts=[host], use_ssl=host.startswith("https"), verify_certs=False)


def ensure_recipes_index(client: OpenSearch, index: str = "recipes") -> None:
    if client.indices.exists(index=index):
        return
    body = {
        "settings": {
            "analysis": {
                "filter": {
                    "autocomplete_filter": {"type": "edge_ngram", "min_gram": 1, "max_gram": 15}
                },
                "analyzer": {
                    "autocomplete": {
                        "type": "custom",
                        "tokenizer": "standard",
                        "filter": ["lowercase", "autocomplete_filter"],
                    }
                },
            }
        },
        "mappings": {
            "properties": {
                "title": {"type": "text", "analyzer": "autocomplete", "search_analyzer": "standard"},
                "ingredients": {"type": "text"},
                "instructions": {"type": "text"},
                "source": {"type": "keyword"},
                "identifier": {"type": "keyword"},
                "iiif_manifest": {"type": "keyword"},
            }
        },
    }
    client.indices.create(index=index, body=body)
