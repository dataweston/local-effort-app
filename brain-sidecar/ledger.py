"""
Write-path helpers — mirrors backend/api/brain/ledger.js.
Every extraction job must call write_ledger_event() before writing assertions.
"""

import uuid
from datetime import datetime, timezone
from db import execute, query


def canonical_name(name: str) -> str:
    """Stable lookup key for entity names."""
    import re
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9]+', ' ', (name or '').lower())).strip()


def write_ledger_event(
    event_type: str,
    source: str,
    payload: dict,
    occurred_at=None,
    source_id=None,
    actor_type: str = 'system',
    schema_version: int = 1,
) -> str:
    """Insert a LedgerEvent row. Returns the new id."""
    if source_id:
        existing = query(
            """
            SELECT id FROM "LedgerEvent"
            WHERE "eventType" = %s AND source = %s AND "sourceId" = %s
              AND "tombstonedAt" IS NULL
            ORDER BY "createdAt" DESC
            LIMIT 1
            """,
            (event_type, source, source_id),
        )
        if existing:
            return existing[0]['id']

    eid = str(uuid.uuid4())
    ts = (occurred_at or datetime.now(timezone.utc)).isoformat()
    import json
    execute(
        """
        INSERT INTO "LedgerEvent"
            (id, "eventType", "schemaVersion", "occurredAt", source, "sourceId",
             "actorType", payload, "createdAt")
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb, NOW())
        """,
        (eid, event_type, schema_version, ts, source, source_id,
         actor_type, json.dumps(payload)),
    )
    return eid


def write_assertion(
    src_id: str,
    dst_id: str,
    rel_type: str,
    ledger_event_id: str,
    confidence: float = 0.8,
    metadata=None,
    valid_from=None,
    provisional: bool = True,
    created_by: str = 'python_extractor',
) -> str:
    """Insert a BrainAssertion row. Returns the new id."""
    import json
    rel = rel_type.upper()
    if ledger_event_id:
        existing = query(
            """
            SELECT id FROM "BrainAssertion"
            WHERE "srcId" = %s AND "dstId" = %s AND "relType" = %s
              AND "sourceId" = %s AND "retractedAt" IS NULL
            ORDER BY "createdAt" DESC
            LIMIT 1
            """,
            (src_id, dst_id, rel, ledger_event_id),
        )
        if existing:
            return existing[0]['id']

    aid = str(uuid.uuid4())
    ts = (valid_from or datetime.now(timezone.utc)).isoformat()
    execute(
        """
        INSERT INTO "BrainAssertion"
            (id, "srcId", "dstId", "relType", metadata, "validFrom", "knownFrom",
             confidence, "sourceType", "sourceId", "createdBy", provisional, "createdAt")
        VALUES (%s, %s, %s, %s, %s::jsonb, %s, NOW(), %s, 'python_extractor', %s, %s, %s, NOW())
        """,
        (aid, src_id, dst_id, rel,
         json.dumps(metadata or {}), ts,
         confidence, ledger_event_id, created_by, provisional),
    )
    return aid


def find_or_create_entity(entity_type: str, name: str) -> tuple[str, bool]:
    """
    Look up an entity by type+name (case-insensitive).
    Creates it if missing. Returns (entity_id, created).
    """
    norm = canonical_name(name)
    import json
    from db import get_conn
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute('SELECT pg_advisory_xact_lock(hashtext(%s))', (f'{entity_type}:{norm}',))
            cur.execute(
                """
                SELECT id FROM "BrainEntity"
                WHERE "entityType" = %s
                  AND COALESCE("canonicalName", LOWER(name)) = %s
                  AND "tombstonedAt" IS NULL
                LIMIT 1
                """,
                (entity_type, norm),
            )
            row = cur.fetchone()
            if row:
                conn.rollback()
                return row['id'], False

            cur.execute(
                """
                SELECT ea."entityId" FROM "BrainEntityAlias" ea
                JOIN "BrainEntity" e ON e.id = ea."entityId"
                WHERE (
                    LOWER(ea.alias) = LOWER(%s)
                    OR COALESCE(e."canonicalName", LOWER(e.name)) = %s
                  )
                  AND e."entityType" = %s
                  AND e."tombstonedAt" IS NULL
                LIMIT 1
                """,
                (name, norm, entity_type),
            )
            row = cur.fetchone()
            if row:
                conn.rollback()
                return row['entityId'], False

            eid = str(uuid.uuid4())
            cur.execute(
                """
                INSERT INTO "BrainEntity"
                    (id, "entityType", name, "canonicalName", status, properties, "createdAt", "updatedAt")
                VALUES (%s, %s, %s, %s, 'active', %s::jsonb, NOW(), NOW())
                """,
                (eid, entity_type, name, norm, json.dumps({})),
            )
        conn.commit()
        return eid, True
    except Exception:
        conn.rollback()
        raise


def already_processed(source: str, source_id: str) -> bool:
    """Return True if a LedgerEvent with this source+sourceId already exists."""
    rows = query(
        'SELECT id FROM "LedgerEvent" WHERE source = %s AND "sourceId" = %s LIMIT 1',
        (source, source_id),
    )
    return len(rows) > 0


def bulk_already_processed(source: str, source_ids: list) -> set:
    """Return the set of source_ids that have already been processed."""
    if not source_ids:
        return set()
    placeholders = ','.join(['%s'] * len(source_ids))
    rows = query(
        f'SELECT "sourceId" FROM "LedgerEvent" WHERE source = %s AND "sourceId" IN ({placeholders})',
        (source, *source_ids),
    )
    return {r['sourceId'] for r in rows}
