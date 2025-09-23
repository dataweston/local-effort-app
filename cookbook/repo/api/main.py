from __future__ import annotations

import json
import logging
import os
from collections import Counter
from pathlib import Path
from typing import List, Optional

from fastapi import Body, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from opensearchpy import OpenSearch

app = FastAPI(title="Cookbook API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


logger = logging.getLogger(__name__)
DATA_DIR = Path(os.path.dirname(os.path.dirname(__file__))) / "data"
MODERATION_FILE = DATA_DIR / "moderation_hidden.json"


def get_client() -> OpenSearch | None:
    host = os.getenv("OS_HOST", "http://localhost:9200")
    username = os.getenv("OS_USERNAME")
    password = os.getenv("OS_PASSWORD")
    kwargs = {
        "hosts": [host],
        "use_ssl": host.startswith("https"),
        "verify_certs": False,
    }
    if username and password:
        kwargs["http_auth"] = (username, password)
    try:
        client = OpenSearch(**kwargs)
        # Probe server quickly
        client.info()
        return client
    except Exception:
        return None

# Local fallback: load ./data/recipes.jsonl if present


def _ensure_list(value):
    if not value:
        return []
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    return [str(value).strip()]


def _normalize_local_record(obj: dict) -> dict:
    record = obj or {}
    identifier = record.get("identifier") or record.get("id")
    record.setdefault("id", identifier)
    metadata = record.get("metadata") or {}
    if not isinstance(metadata, dict):
        metadata = {}
    cookbook_title = (
        record.get("cookbook_title")
        or record.get("cookbookTitle")
        or metadata.get("cookbook_title")
        or metadata.get("source_identifier")
    )
    if cookbook_title:
        record["cookbook_title"] = cookbook_title
    digital_urls = record.get("digital_urls")
    if not isinstance(digital_urls, list):
        digital_urls = _ensure_list(digital_urls)
    else:
        digital_urls = [str(url).strip() for url in digital_urls if str(url).strip()]
    primary_digital = record.get("digital_url")
    if primary_digital:
        primary_digital = str(primary_digital).strip()
    if primary_digital and primary_digital not in digital_urls:
        digital_urls.insert(0, primary_digital)
    if not primary_digital and digital_urls:
        primary_digital = digital_urls[0]
    if primary_digital:
        record["digital_url"] = primary_digital
    record["digital_urls"] = digital_urls
    location = record.get("location")
    if isinstance(location, dict):
        record["location"] = {k: v for k, v in location.items() if v}
    record["has_digital_assets"] = bool(
        primary_digital
        or record.get("iiif_manifest")
        or record.get("pdf_url")
        or (record.get("curation") or {}).get("has_digital_assets")
    )
    return record


def load_local_recipes() -> list[dict]:
    data_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "recipes.jsonl")
    records: list[dict] = []
    try:
        with open(data_path, "r", encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if not line:
                    continue
                try:
                    raw = json.loads(line)
                except Exception:
                    continue
                record = _normalize_local_record(raw or {})
                if record.get("id"):
                    records.append(record)
    except FileNotFoundError:
        return []
    return records

LOCAL_RECIPES = load_local_recipes()


class HiddenList(BaseModel):
    ids: List[str]


def _load_hidden_ids() -> List[str]:
    try:
        data = json.loads(MODERATION_FILE.read_text(encoding='utf-8'))
        ids = data.get('ids')
        if isinstance(ids, list):
            return sorted({str(item).strip() for item in ids if str(item).strip()})
    except FileNotFoundError:
        return []
    except Exception:
        logger.warning("Failed to read moderation file", exc_info=True)
    return []


def _write_hidden_ids(ids: List[str]) -> None:
    MODERATION_FILE.parent.mkdir(parents=True, exist_ok=True)
    payload = {"ids": sorted({str(item).strip() for item in ids if str(item).strip()})}
    MODERATION_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')



@app.get("/api/stats")
async def get_stats(index: str = "recipes"):
    client = get_client()
    if client is not None:
        try:
            base_query = {"query": {"match_all": {}}}
            total = client.count(index=index, body=base_query).get("count", 0)
            agg_body = {
                "size": 0,
                "query": {"match_all": {}},
                "aggs": {
                    "sources": {"terms": {"field": "source", "size": 25}},
                    "states": {"terms": {"field": "location.state", "size": 50}},
                    "institutions": {"terms": {"field": "institution", "size": 50}},
                    "with_recipe": {
                        "filter": {
                            "bool": {
                                "should": [
                                    {"exists": {"field": "ingredients"}},
                                    {"exists": {"field": "instructions"}},
                                ],
                                "minimum_should_match": 1,
                            }
                        }
                    },
                    "with_scans": {
                        "filter": {
                            "bool": {
                                "should": [
                                    {"exists": {"field": "iiif_manifest"}},
                                    {"exists": {"field": "pdf_url"}},
                                    {"term": {"curation.has_digital_assets": True}},
                                ],
                                "minimum_should_match": 1,
                            }
                        }
                    },
                },
            }
            agg_res = client.search(index=index, body=agg_body)
            aggs = agg_res.get("aggregations", {})
            sources = [bucket["key"] for bucket in aggs.get("sources", {}).get("buckets", [])]
            states = [bucket["key"] for bucket in aggs.get("states", {}).get("buckets", [])]
            institutions = [bucket["key"] for bucket in aggs.get("institutions", {}).get("buckets", [])]
            recipe_count = aggs.get("with_recipe", {}).get("doc_count", 0)
            scan_count = aggs.get("with_scans", {}).get("doc_count", 0)
            return {
                "documents": total,
                "recipes": recipe_count,
                "digital_items": scan_count,
                "sources": sources,
                "states": states,
                "institutions": institutions,
            }
        except Exception:
            pass

    if not LOCAL_RECIPES:
        return {"documents": 0, "recipes": 0, "digital_items": 0, "sources": [], "states": [], "institutions": []}
    documents = len(LOCAL_RECIPES)
    recipe_count = sum(
        1
        for r in LOCAL_RECIPES
        if (r.get("ingredients") or r.get("instructions"))
    )
    digital_count = sum(1 for r in LOCAL_RECIPES if r.get("has_digital_assets"))
    sources = sorted({r.get("source") for r in LOCAL_RECIPES if r.get("source")})
    states = sorted({(r.get("location") or {}).get("state") for r in LOCAL_RECIPES if (r.get("location") or {}).get("state")})
    institutions = sorted({r.get("institution") for r in LOCAL_RECIPES if r.get("institution")})
    return {
        "documents": documents,
        "recipes": recipe_count,
        "digital_items": digital_count,
        "sources": sources,
        "states": states,
        "institutions": institutions,
    }


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
async def search(
    q: str = Query("", min_length=0),
    size: int = 10,
    index: str = "recipes",
    state: Optional[str] = Query(None),
    county: Optional[str] = Query(None),
    institution: Optional[str] = Query(None),
    has_scans: Optional[bool] = Query(None),
):
    client = get_client()
    if client is not None:
        filter_clauses: List[dict] = []
        if state:
            filter_clauses.append({"term": {"location.state": state}})
        if county:
            filter_clauses.append({"term": {"location.county": county}})
        if institution:
            filter_clauses.append({"term": {"institution": institution}})
        if has_scans is True:
            filter_clauses.append({"term": {"curation.has_digital_assets": True}})
        body = {
            "query": {
                "bool": {
                    "should": [
                        {"multi_match": {"query": q, "fields": ["title^2", "ingredients", "instructions"]}},
                    ],
                    "minimum_should_match": 1 if q else 0,
                    "filter": filter_clauses,
                }
            },
            "size": size,
            "highlight": {"fields": {"instructions": {}, "ingredients": {}}},
            "aggs": {
                "states": {"terms": {"field": "location.state", "size": 25}},
                "counties": {"terms": {"field": "location.county", "size": 25}},
                "institutions": {"terms": {"field": "institution", "size": 25}},
            },
        }
        res = client.search(index=index, body=body)
        hits = [
            {"id": h.get("_id"), **(h.get("_source") or {}), "highlight": h.get("highlight")}
            for h in res.get("hits", {}).get("hits", [])
        ]
        aggs = res.get("aggregations", {})
        facets = {
            name: bucket.get("buckets", []) if isinstance(bucket, dict) else []
            for name, bucket in aggs.items()
        }
        return {"results": hits, "total": res.get("hits", {}).get("total"), "facets": facets}

    # Local fallback search
    if not LOCAL_RECIPES:
        return {"results": [], "total": {"value": 0}, "facets": {}}
    ql = (q or "").strip().lower()

    def match(doc: dict) -> bool:
        if not ql:
            return True
        title = (doc.get("title") or "").lower()
        if ql in title:
            return True
        cookbook_title = (doc.get("cookbook_title") or "").lower()
        if ql in cookbook_title:
            return True
        for arr_key in ("ingredients", "instructions"):
            arr = doc.get(arr_key) or []
            if isinstance(arr, list) and any(ql in str(x).lower() for x in arr):
                return True
        return False

    def matches_filters(doc: dict) -> bool:
        location = doc.get("location") or {}
        if state and location.get("state") != state:
            return False
        if county and location.get("county") != county:
            return False
        if institution and doc.get("institution") != institution:
            return False
        if has_scans is True:
            if not doc.get("has_digital_assets"):
                return False
        return True

    matched_docs = []
    for doc in LOCAL_RECIPES:
        if not matches_filters(doc):
            continue
        if not match(doc):
            continue
        doc_id = doc.get("id") or doc.get("identifier")
        highlight = None
        if ql:
            ingredients = doc.get("ingredients") or []
            instructions = doc.get("instructions") or []
            highlight_map = {
                "ingredients": [x for x in ingredients if ql in str(x).lower()],
                "instructions": [x for x in instructions if ql in str(x).lower()],
            }
            highlight_map = {k: v for k, v in highlight_map.items() if v}
            if highlight_map:
                highlight = highlight_map
        matched_docs.append({**doc, "id": doc_id, "highlight": highlight})

    limited = matched_docs[: max(1, int(size))]

    def build_facet(counter: Counter) -> List[dict]:
        return [{"key": key, "doc_count": count} for key, count in counter.most_common()]

    state_counter = Counter(
        [doc.get("location", {}).get("state") for doc in matched_docs if doc.get("location", {}).get("state")]
    )
    county_counter = Counter(
        [doc.get("location", {}).get("county") for doc in matched_docs if doc.get("location", {}).get("county")]
    )
    institution_counter = Counter([doc.get("institution") for doc in matched_docs if doc.get("institution")])

    facets = {
        "states": build_facet(state_counter),
        "counties": build_facet(county_counter),
        "institutions": build_facet(institution_counter),
    }

    return {"results": limited, "total": {"value": len(matched_docs)}, "facets": facets}



@app.get("/api/moderation/hidden")
async def get_hidden_ids():
    return {"ids": _load_hidden_ids()}


@app.put("/api/moderation/hidden")
async def replace_hidden_ids(payload: HiddenList):
    ids = [item.strip() for item in payload.ids if item and item.strip()]
    _write_hidden_ids(ids)
    return {"ids": _load_hidden_ids()}


@app.post("/api/moderation/hidden")
async def add_hidden_ids(payload: HiddenList):
    existing = set(_load_hidden_ids())
    incoming = {item.strip() for item in payload.ids if item and item.strip()}
    combined = sorted(existing.union(incoming))
    _write_hidden_ids(combined)
    return {"ids": combined}


@app.delete("/api/moderation/hidden")
async def remove_hidden_ids(payload: HiddenList):
    remaining = [item for item in _load_hidden_ids() if item not in {entry.strip() for entry in payload.ids}]
    _write_hidden_ids(remaining)
    return {"ids": _load_hidden_ids()}
