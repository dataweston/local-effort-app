"""
LanceDB vector store for brain entities, assertions, and inbox items.

Schema: each record has
  id          — source DB row id
  table       — 'entity' | 'assertion' | 'inbox'
  text        — the text that was embedded
  vector      — float32[1024] from voyage-3-lite
  metadata    — JSON string (entityType, name, etc.)
  updated_at  — ISO timestamp

Usage:
  from vector_store import VectorStore
  vs = VectorStore()
  vs.upsert([{'id': '...', 'table': 'entity', 'text': '...', 'metadata': {...}}])
  results = vs.search('seasonal produce vendor', limit=5)
"""

import os
import json
import time
from pathlib import Path
from typing import Optional

import voyageai
import lancedb
from lancedb.pydantic import LanceModel, Vector

VOYAGE_MODEL = 'voyage-3-lite'
EMBED_DIM = 512  # voyage-3-lite output dimension
LANCEDB_PATH = Path(__file__).parent / '.lancedb'
TABLE_NAME = 'brain'
BATCH_SIZE = 64  # voyage-3-lite max batch


class BrainRecord(LanceModel):
    id: str
    table: str
    text: str
    vector: Vector(EMBED_DIM)
    metadata: str  # JSON string
    updated_at: str


def _get_voyage_client():
    api_key = os.environ.get('VOYAGE_API_KEY')
    if not api_key:
        raise RuntimeError('VOYAGE_API_KEY not set')
    return voyageai.Client(api_key=api_key)


def _embed_texts(texts: list[str]) -> list[list[float]]:
    client = _get_voyage_client()
    all_embeddings = []
    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i:i + BATCH_SIZE]
        result = client.embed(batch, model=VOYAGE_MODEL, input_type='document')
        all_embeddings.extend(result.embeddings)
    return all_embeddings


class VectorStore:
    def __init__(self):
        LANCEDB_PATH.mkdir(exist_ok=True)
        self._db = lancedb.connect(str(LANCEDB_PATH))
        self._table = self._get_or_create_table()

    def _get_or_create_table(self):
        if TABLE_NAME in self._db.table_names():
            return self._db.open_table(TABLE_NAME)
        return self._db.create_table(TABLE_NAME, schema=BrainRecord)

    def upsert(self, records: list[dict]) -> int:
        if not records:
            return 0

        texts = [r['text'] for r in records]
        vectors = _embed_texts(texts)
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()

        rows = []
        for r, vec in zip(records, vectors):
            rows.append({
                'id': r['id'],
                'table': r['table'],
                'text': r['text'],
                'vector': vec,
                'metadata': json.dumps(r.get('metadata', {})),
                'updated_at': now,
            })

        # Delete existing rows for these ids then insert (LanceDB upsert workaround)
        ids = [r['id'] for r in records]
        try:
            self._table.delete(f"id IN ({', '.join(repr(i) for i in ids)})")
        except Exception:
            pass
        self._table.add(rows)
        return len(rows)

    def search(self, query: str, limit: int = 8, table_filter: Optional[str] = None) -> list[dict]:
        client = _get_voyage_client()
        result = client.embed([query], model=VOYAGE_MODEL, input_type='query')
        query_vec = result.embeddings[0]

        q = self._table.search(query_vec).limit(limit)
        if table_filter:
            q = q.where(f"table = '{table_filter}'")

        rows = q.to_list()
        out = []
        for row in rows:
            out.append({
                'id': row['id'],
                'table': row['table'],
                'text': row['text'],
                'score': float(row.get('_distance', 0)),
                'metadata': json.loads(row.get('metadata', '{}')),
            })
        return out

    def count(self) -> int:
        try:
            return self._table.count_rows()
        except Exception:
            return 0
