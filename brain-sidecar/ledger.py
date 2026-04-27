"""
Write-path helpers — mirrors backend/api/brain/ledger.js.
Every extraction job must call write_ledger_event() before writing assertions.
"""

import uuid
from datetime import datetime, timezone
from db import execute, query


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
    aid = str(uuid.uuid4())
    ts = (valid_from or datetime.now(timezone.utc)).isoformat()
    execute(
        """
        INSERT INTO "BrainAssertion"
            (id, "srcId", "dstId", "relType", metadata, "validFrom", "knownFrom",
             confidence, "sourceType", "sourceId", "createdBy", provisional, "createdAt")
        VALUES (%s, %s, %s, %s, %s::jsonb, %s, NOW(), %s, 'python_extractor', %s, %s, %s, NOW())
        """,
        (aid, src_id, dst_id, rel_type.upper(),
         json.dumps(metadata or {}), ts,
         confidence, ledger_event_id, created_by, provisional),
    )
    return aid


def find_or_create_entity(entity_type: str, name: str) -> tuple[str, bool]:
    """
    Look up an entity by type+name (case-insensitive).
    Creates it if missing. Returns (entity_id, created).
    """
    rows = query(
        """
        SELECT id FROM "BrainEntity"
        WHERE "entityType" = %s AND LOWER(name) = LOWER(%s) AND "tombstonedAt" IS NULL
        LIMIT 1
        """,
        (entity_type, name),
    )
    if rows:
        return rows[0]['id'], False

    # Check aliases
    alias_rows = query(
        """
        SELECT ea."entityId" FROM "BrainEntityAlias" ea
        JOIN "BrainEntity" e ON e.id = ea."entityId"
        WHERE LOWER(ea.alias) = LOWER(%s) AND e."entityType" = %s AND e."tombstonedAt" IS NULL
        LIMIT 1
        """,
        (name, entity_type),
    )
    if alias_rows:
        return alias_rows[0]['entityId'], False

    import json
    eid = str(uuid.uuid4())
    execute(
        """
        INSERT INTO "BrainEntity"
            (id, "entityType", name, status, "createdAt", "updatedAt")
        VALUES (%s, %s, %s, 'active', NOW(), NOW())
        """,
        (eid, entity_type, name),
    )
    return eid, True


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
