"""
Job: audit_graph

Reports graph quality issues and can merge exact duplicate entities.

Default mode is read-only:
  python run.py audit_graph

Optional exact merge:
  python -m jobs.audit_graph --merge-exact-entities

The merge only handles same entityType + same canonicalName. It moves assertions,
aliases, and inbox result pointers to the oldest entity, then tombstones the
duplicates. Ledger events are never deleted.
"""

from __future__ import annotations

import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from db import execute, query
from ledger import canonical_name, write_ledger_event


def _duplicate_entities(limit: int = 100) -> list[dict]:
    return query(
        """
        SELECT "entityType",
               COALESCE("canonicalName", trim(regexp_replace(regexp_replace(lower(name), '[^a-z0-9]+', ' ', 'g'), '\\s+', ' ', 'g'))) AS canonical,
               COUNT(*) AS n,
               ARRAY_AGG(id ORDER BY "createdAt") AS ids,
               ARRAY_AGG(name ORDER BY "createdAt") AS names
        FROM "BrainEntity"
        WHERE "tombstonedAt" IS NULL
        GROUP BY 1, 2
        HAVING COUNT(*) > 1
        ORDER BY n DESC, "entityType", canonical
        LIMIT %s
        """,
        (limit,),
    )


def _duplicate_ledger_source_ids(limit: int = 100) -> list[dict]:
    return query(
        """
        SELECT "eventType", source, "sourceId", COUNT(*) AS n, ARRAY_AGG(id ORDER BY "createdAt") AS ids
        FROM "LedgerEvent"
        WHERE "sourceId" IS NOT NULL AND "tombstonedAt" IS NULL
        GROUP BY 1, 2, 3
        HAVING COUNT(*) > 1
        ORDER BY n DESC, "eventType", source
        LIMIT %s
        """,
        (limit,),
    )


def _self_edges(limit: int = 100) -> list[dict]:
    return query(
        """
        SELECT a."relType", e."entityType", COUNT(*) AS n
        FROM "BrainAssertion" a
        JOIN "BrainEntity" e ON e.id = a."srcId"
        WHERE a."srcId" = a."dstId" AND a."retractedAt" IS NULL
        GROUP BY 1, 2
        ORDER BY n DESC
        LIMIT %s
        """,
        (limit,),
    )


def _orphan_entities(limit: int = 100) -> list[dict]:
    return query(
        """
        SELECT e."entityType", COUNT(*) AS n
        FROM "BrainEntity" e
        WHERE e."tombstonedAt" IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM "BrainAssertion" a
            WHERE (a."srcId" = e.id OR a."dstId" = e.id)
              AND a."retractedAt" IS NULL
          )
        GROUP BY 1
        ORDER BY n DESC
        LIMIT %s
        """,
        (limit,),
    )


def _ensure_canonical_names(dry_run: bool) -> int:
    rows = query(
        """
        SELECT id, name FROM "BrainEntity"
        WHERE "canonicalName" IS NULL OR "canonicalName" = ''
        LIMIT 5000
        """
    )
    if dry_run:
        return len(rows)
    for row in rows:
        execute(
            'UPDATE "BrainEntity" SET "canonicalName" = %s WHERE id = %s',
            (canonical_name(row["name"]), row["id"]),
        )
    return len(rows)


def _merge_exact_duplicates(dry_run: bool) -> dict:
    groups = _duplicate_entities(limit=1000)
    merged_entities = 0
    moved_assertions = 0
    moved_aliases = 0
    moved_inbox = 0

    if not dry_run:
        ledger_id = write_ledger_event(
            event_type="graph.duplicates_merged",
            source="audit_graph",
            source_id=f"merge_exact_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
            payload={"groups": len(groups)},
        )
    else:
        ledger_id = None

    for group in groups:
        ids = group["ids"]
        keeper = ids[0]
        duplicates = ids[1:]
        if not duplicates:
            continue
        if dry_run:
            merged_entities += len(duplicates)
            continue

        for dup in duplicates:
            moved_assertions += execute(
                'UPDATE "BrainAssertion" SET "srcId" = %s WHERE "srcId" = %s',
                (keeper, dup),
            ) or 0
            moved_assertions += execute(
                'UPDATE "BrainAssertion" SET "dstId" = %s WHERE "dstId" = %s',
                (keeper, dup),
            ) or 0
            moved_aliases += execute(
                """
                UPDATE "BrainEntityAlias"
                SET "entityId" = %s
                WHERE "entityId" = %s
                  AND NOT EXISTS (
                    SELECT 1 FROM "BrainEntityAlias" a2
                    WHERE a2."entityId" = %s AND a2.alias = "BrainEntityAlias".alias
                  )
                """,
                (keeper, dup, keeper),
            ) or 0
            moved_inbox += execute(
                'UPDATE "BrainInboxItem" SET "resultEntityId" = %s WHERE "resultEntityId" = %s',
                (keeper, dup),
            ) or 0
            execute(
                """
                UPDATE "BrainEntity"
                SET "tombstonedAt" = NOW(),
                    status = 'archived',
                    "tombstoneReason" = %s
                WHERE id = %s
                """,
                (f"merged_into:{keeper};ledger:{ledger_id}", dup),
            )
            merged_entities += 1

    return {
        "groups": len(groups),
        "merged_entities": merged_entities,
        "moved_assertions": moved_assertions,
        "moved_aliases": moved_aliases,
        "moved_inbox": moved_inbox,
        "dry_run": dry_run,
    }


def run(dry_run: bool = False, merge_exact_entities: bool | None = None) -> dict:
    merge = merge_exact_entities if merge_exact_entities is not None else "--merge-exact-entities" in sys.argv
    canonical_backfill = _ensure_canonical_names(dry_run=dry_run)
    report = {
        "canonical_names_missing_or_backfilled": canonical_backfill,
        "duplicate_entities": _duplicate_entities(limit=50),
        "duplicate_ledger_source_ids": _duplicate_ledger_source_ids(limit=50),
        "self_edges": _self_edges(limit=50),
        "orphan_entities_by_type": _orphan_entities(limit=50),
    }
    if merge:
        report["merge_exact_entities"] = _merge_exact_duplicates(dry_run=dry_run)
    return report


if __name__ == "__main__":
    import json

    result = run(dry_run="--dry-run" in sys.argv)
    print(json.dumps(result, indent=2, default=str))
