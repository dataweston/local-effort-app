"""
Embedding job — syncs BrainEntity + BrainInboxItem rows into LanceDB.

Runs incrementally: only embeds rows modified since the last embed run,
tracked by checking updated_at vs what's already in the vector store.
Full re-embed: python run.py embed --full-reembed

Requires: VOYAGE_API_KEY in environment.
"""

import sys
import json
from datetime import datetime, timezone, timedelta

sys.path.insert(0, __file__.rsplit('/', 2)[0] if '/' in __file__ else __file__.rsplit('\\', 2)[0])

from db import query as db_query
from vector_store import VectorStore


def _entity_to_text(row: dict) -> str:
    parts = [f"{row['entity_type']}: {row['name']}"]
    props = row.get('properties') or {}
    if isinstance(props, str):
        try:
            props = json.loads(props)
        except Exception:
            props = {}
    if props.get('primaryClassification'):
        parts.append(f"category: {props['primaryClassification']}")
    if props.get('totalSpend'):
        parts.append(f"total spend: ${props['totalSpend'] / 100:.0f}")
    if props.get('txCount'):
        parts.append(f"transactions: {props['txCount']}")
    if props.get('notes'):
        parts.append(props['notes'])
    return ', '.join(parts)


def _inbox_to_text(row: dict) -> str:
    return row.get('raw_content') or ''


def run(dry_run: bool = False, full_reembed: bool = False) -> dict:
    vs = VectorStore()
    existing_count = vs.count()

    # Look back window: 7 days incremental, or everything for full re-embed
    if full_reembed or existing_count == 0:
        since = datetime(2020, 1, 1, tzinfo=timezone.utc)
    else:
        since = datetime.now(timezone.utc) - timedelta(days=7)

    since_str = since.isoformat()

    # Fetch entities
    entities = db_query(
        '''
        SELECT id, entity_type, name, properties, updated_at
        FROM "BrainEntity"
        WHERE tombstoned_at IS NULL
          AND updated_at > %s
        ORDER BY updated_at DESC
        LIMIT 500
        ''',
        (since_str,)
    )

    # Fetch pending/recent inbox items
    inbox_items = db_query(
        '''
        SELECT id, raw_content, source, status, updated_at
        FROM "BrainInboxItem"
        WHERE updated_at > %s
        ORDER BY updated_at DESC
        LIMIT 200
        ''',
        (since_str,)
    )

    records = []

    for e in entities:
        text = _entity_to_text(e)
        if not text.strip():
            continue
        records.append({
            'id': f"entity:{e['id']}",
            'table': 'entity',
            'text': text,
            'metadata': {
                'entityId': e['id'],
                'entityType': e['entity_type'],
                'name': e['name'],
            },
        })

    for item in inbox_items:
        text = _inbox_to_text(item)
        if not text.strip():
            continue
        records.append({
            'id': f"inbox:{item['id']}",
            'table': 'inbox',
            'text': text[:500],
            'metadata': {
                'inboxId': item['id'],
                'source': item['source'],
                'status': item['status'],
            },
        })

    if dry_run:
        print(f'  [embed dry-run] would embed {len(records)} records ({len(entities)} entities, {len(inbox_items)} inbox)')
        return {'embedded': 0, 'dry_run': True, 'would_embed': len(records)}

    if not records:
        return {'embedded': 0, 'skipped': 0}

    embedded = vs.upsert(records)
    total = vs.count()

    return {
        'embedded': embedded,
        'entities': len(entities),
        'inbox': len(inbox_items),
        'total_in_store': total,
    }
