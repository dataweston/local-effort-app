from __future__ import annotations

import os
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from opensearchpy import OpenSearch

app = FastAPI(title="Cookbook API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_client() -> OpenSearch | None:
    host = os.getenv("OS_HOST", "http://localhost:9200")
    try:
        client = OpenSearch(hosts=[host], use_ssl=host.startswith("https"), verify_certs=False)
        # Probe server quickly
        client.info()
        return client
    except Exception:
        return None

# Local fallback: load ./data/recipes.jsonl if present
def load_local_recipes() -> list[dict]:
    path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "recipes.jsonl")
    try:
        items: list[dict] = []
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = __import__("json").loads(line)
                    obj = obj or {}
                    obj.setdefault("id", obj.get("identifier") or obj.get("id"))
                    items.append(obj)
                except Exception:
                    continue
        return items
    except FileNotFoundError:
        return []

LOCAL_RECIPES = load_local_recipes()


@app.get("/api/recipes/{doc_id}")
async def get_recipe(doc_id: str, index: str = "recipes"):
    client = get_client()
    if client is not None:
        try:
            res = client.get(index=index, id=doc_id)
            return res.get("_source")
        except Exception:
            pass
    # Fallback to local list
    for r in LOCAL_RECIPES:
        rid = r.get("id") or r.get("identifier")
        if rid and str(rid) == str(doc_id):
            return r
    raise HTTPException(status_code=404, detail="Not found")


@app.get("/api/search")
async def search(q: str = Query("", min_length=0), size: int = 10, index: str = "recipes"):
    client = get_client()
    if client is not None:
        body = {
            "query": {
                "bool": {
                    "should": [
                        {"multi_match": {"query": q, "fields": ["title^2", "ingredients", "instructions"]}},
                    ],
                    "minimum_should_match": 1 if q else 0,
                }
            },
            "size": size,
            "highlight": {"fields": {"instructions": {}}},
        }
        res = client.search(index=index, body=body)
        hits = [
            {"id": h.get("_id"), **(h.get("_source") or {}), "highlight": h.get("highlight")}
            for h in res.get("hits", {}).get("hits", [])
        ]
        return {"results": hits, "total": res.get("hits", {}).get("total")}

    # Local fallback search
    if not LOCAL_RECIPES:
        return {"results": [], "total": {"value": 0}}
    ql = (q or "").strip().lower()
    def match(doc: dict) -> bool:
        if not ql:
            return True
        title = (doc.get("title") or "").lower()
        if ql in title:
            return True
        for arr_key in ("ingredients", "instructions"):
            arr = doc.get(arr_key) or []
            if isinstance(arr, list) and any(ql in str(x).lower() for x in arr):
                return True
        return False
    matched = [
        {**doc, "id": doc.get("id") or doc.get("identifier")}
        for doc in LOCAL_RECIPES
        if match(doc)
    ]
    return {"results": matched[: max(1, int(size))], "total": {"value": len(matched)}}

