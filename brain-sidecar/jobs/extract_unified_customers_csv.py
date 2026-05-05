"""
Job: extract_unified_customers_csv

Imports the manually supplied unified customer CSV into the Brain graph.

This CSV is not treated as the Square Customer Directory source of truth: its
IDs do not match the current Square API customer IDs. The source IDs are stored
under properties.unifiedCustomersCsv instead of BrainEntity.squareCustomerId.

Expected CSV columns:
  id, Description, Email, Name, Created (UTC), Card ID, Total Spend,
  Payment Count, Refunded Volume, Dispute Losses

Assertions written:
  - Customer -> USES_CHANNEL -> Channel("Unified Customer CSV")
  - Customer -> PAYMENT_RECEIVED -> BusinessLine("Local Effort")
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import csv
import json
import uuid
from decimal import Decimal, InvalidOperation
from pathlib import Path
from datetime import datetime, timezone

from dotenv import load_dotenv
load_dotenv(dotenv_path=Path(__file__).parent.parent.parent / '.env')

from db import execute, query
from ledger import write_ledger_event, write_assertion, find_or_create_entity, already_processed

SOURCE = 'extract_unified_customers_csv'
DEFAULT_CSV_PATH = Path.home() / 'Downloads' / 'unified_customers.csv'


def _csv_path() -> Path:
    configured = os.environ.get('UNIFIED_CUSTOMERS_CSV_PATH', '').strip()
    return Path(configured) if configured else DEFAULT_CSV_PATH


def _clean(value) -> str:
    return str(value or '').strip()


def _money_to_cents(value) -> int:
    raw = _clean(value).replace('$', '').replace(',', '')
    if not raw:
        return 0
    try:
        return int((Decimal(raw) * 100).quantize(Decimal('1')))
    except (InvalidOperation, ValueError):
        return 0


def _int_value(value) -> int:
    raw = _clean(value)
    if not raw:
        return 0
    try:
        return int(Decimal(raw))
    except (InvalidOperation, ValueError):
        return 0


def _parse_created_at(value: str):
    raw = _clean(value)
    if not raw:
        return None
    for fmt in ('%Y-%m-%d %H:%M', '%Y-%m-%d %H:%M:%S'):
        try:
            return datetime.strptime(raw, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def _load_rows(path: Path) -> list[dict]:
    with path.open(encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))


def _entity_ids_by_alias(aliases: list[str]) -> dict[str, list[dict]]:
    if not aliases:
        return {}
    rows = query(
        """
        SELECT LOWER(a.alias) AS key, e.id, e.name, e."squareCustomerId", a.alias, a.source
        FROM "BrainEntityAlias" a
        JOIN "BrainEntity" e ON e.id = a."entityId"
        WHERE e."entityType" = 'Customer'
          AND e."tombstonedAt" IS NULL
          AND LOWER(a.alias) = ANY(%s)
        ORDER BY e.name
        """,
        ([a.lower() for a in aliases],),
    )
    grouped = {}
    for row in rows:
        grouped.setdefault(row['key'], []).append(row)
    return grouped


def _entity_ids_by_name(names: list[str]) -> dict[str, list[dict]]:
    if not names:
        return {}
    rows = query(
        """
        SELECT LOWER(name) AS key, id, name, "squareCustomerId"
        FROM "BrainEntity"
        WHERE "entityType" = 'Customer'
          AND "tombstonedAt" IS NULL
          AND LOWER(name) = ANY(%s)
        ORDER BY name
        """,
        ([n.lower() for n in names],),
    )
    grouped = {}
    for row in rows:
        grouped.setdefault(row['key'], []).append(row)
    return grouped


def _upsert_alias(entity_id: str, alias: str, source: str = SOURCE) -> bool:
    alias = _clean(alias)
    if len(alias) < 2:
        return False
    inserted = execute(
        """
        INSERT INTO "BrainEntityAlias" (id, "entityId", alias, source, "createdAt")
        VALUES (%s, %s, %s, %s, NOW())
        ON CONFLICT ("entityId", alias) DO NOTHING
        RETURNING id
        """,
        (str(uuid.uuid4()), entity_id, alias, source),
    )
    return bool(inserted)


def _source_row(row_data: dict, matched_by: str, conflicts: list[dict]) -> dict:
    return {
        'sourceId': row_data['sourceId'],
        'description': row_data['description'] or None,
        'email': row_data['email'] or None,
        'name': row_data['name'] or None,
        'createdAtUtc': row_data['createdAtUtc'] or None,
        'cardId': row_data['cardId'] or None,
        'totalSpendCents': row_data['totalSpendCents'],
        'paymentCount': row_data['paymentCount'],
        'refundedVolumeCents': row_data['refundedVolumeCents'],
        'disputeLossesCents': row_data['disputeLossesCents'],
        'matchedBy': matched_by,
        'conflicts': conflicts,
    }


def _summarize_source_rows(source_rows: list[dict]) -> dict:
    source_rows = sorted(source_rows, key=lambda r: r.get('createdAtUtc') or '')
    source_ids = [r.get('sourceId') for r in source_rows if r.get('sourceId')]
    emails = sorted({r.get('email') for r in source_rows if r.get('email')})
    names = sorted({r.get('name') for r in source_rows if r.get('name')})
    conflicts = []
    for row in source_rows:
        for conflict in row.get('conflicts') or []:
            conflicts.append(conflict)

    return {
        'sourceIds': source_ids,
        'primarySourceId': source_ids[-1] if source_ids else None,
        'emails': emails,
        'names': names,
        'rowCount': len(source_rows),
        'totalSpendCents': sum(int(r.get('totalSpendCents') or 0) for r in source_rows),
        'paymentCount': sum(int(r.get('paymentCount') or 0) for r in source_rows),
        'refundedVolumeCents': sum(int(r.get('refundedVolumeCents') or 0) for r in source_rows),
        'disputeLossesCents': sum(int(r.get('disputeLossesCents') or 0) for r in source_rows),
        'firstCreatedAtUtc': source_rows[0].get('createdAtUtc') if source_rows else None,
        'lastCreatedAtUtc': source_rows[-1].get('createdAtUtc') if source_rows else None,
        'matchedBy': sorted({r.get('matchedBy') for r in source_rows if r.get('matchedBy')}),
        'conflicts': conflicts,
    }


def _update_customer_entity(entity_id: str, row_data: dict, matched_by: str, conflicts: list[dict]) -> None:
    existing = query('SELECT properties FROM "BrainEntity" WHERE id = %s LIMIT 1', (entity_id,))
    properties = existing[0]['properties'] if existing else {}
    if isinstance(properties, str):
        try:
            properties = json.loads(properties)
        except json.JSONDecodeError:
            properties = {}
    properties = properties or {}

    next_row = _source_row(row_data, matched_by, conflicts)
    source_rows = properties.get('unifiedCustomersCsvRows') or []
    source_rows = [r for r in source_rows if r.get('sourceId') != row_data['sourceId']]
    source_rows.append(next_row)

    summary = _summarize_source_rows(source_rows)
    properties['unifiedCustomersCsv'] = summary
    properties['unifiedCustomersCsvRows'] = source_rows
    if summary['totalSpendCents']:
        properties['totalSpend'] = summary['totalSpendCents']
    if summary['paymentCount']:
        properties['txCount'] = summary['paymentCount']

    execute(
        """
        UPDATE "BrainEntity"
        SET properties = %s::jsonb,
            "updatedAt" = NOW()
        WHERE id = %s
        """,
        (json.dumps(properties), entity_id),
    )


def _choose_customer(row_data: dict, alias_matches: dict, name_matches: dict) -> tuple[str | None, str, list[dict]]:
    email = row_data['email'].lower()
    name = row_data['name']
    email_candidates = alias_matches.get(email, []) if email else []
    name_candidates = name_matches.get(name.lower(), []) if name else []
    conflicts = []

    if email_candidates and name_candidates and email_candidates[0]['id'] != name_candidates[0]['id']:
        conflicts.append({
            'type': 'email_name_entity_conflict',
            'emailEntityId': email_candidates[0]['id'],
            'emailEntityName': email_candidates[0]['name'],
            'nameEntityId': name_candidates[0]['id'],
            'nameEntityName': name_candidates[0]['name'],
        })
        return name_candidates[0]['id'], 'exact_name_with_email_conflict', conflicts

    if email_candidates:
        return email_candidates[0]['id'], 'email_alias', conflicts

    if name_candidates:
        return name_candidates[0]['id'], 'exact_name', conflicts

    return None, 'created', conflicts


def _display_name(row_data: dict) -> str:
    return (
        row_data['name']
        or row_data['email']
        or f"Unified Customer {row_data['sourceId']}"
    )


def _row_data(row: dict) -> dict:
    return {
        'sourceId': _clean(row.get('id')),
        'description': _clean(row.get('Description')),
        'email': _clean(row.get('Email')).lower(),
        'name': _clean(row.get('Name')),
        'createdAtUtc': _clean(row.get('Created (UTC)')),
        'cardId': _clean(row.get('Card ID')),
        'totalSpendCents': _money_to_cents(row.get('Total Spend')),
        'paymentCount': _int_value(row.get('Payment Count')),
        'refundedVolumeCents': _money_to_cents(row.get('Refunded Volume')),
        'disputeLossesCents': _money_to_cents(row.get('Dispute Losses')),
    }


def run(dry_run: bool = False) -> dict:
    path = _csv_path()
    if not path.exists():
        return {
            'file': str(path),
            'rows_seen': 0,
            'customers_created': 0,
            'customers_updated': 0,
            'aliases_written': 0,
            'assertions_written': 0,
            'skipped': 0,
            'conflicts': [],
            'errors': [f'CSV file not found: {path}'],
        }

    rows = [_row_data(row) for row in _load_rows(path)]
    names = sorted({r['name'] for r in rows if r['name']})
    emails = sorted({r['email'] for r in rows if r['email']})
    alias_matches = _entity_ids_by_alias(emails)
    name_matches = _entity_ids_by_name(names)

    customers_created = 0
    customers_updated = 0
    aliases_written = 0
    assertions_written = 0
    skipped = 0
    conflicts_out = []
    errors = []

    if dry_run:
        print(f'[extract_unified_customers_csv] would process {len(rows)} rows from {path}')

    csv_channel_id = None
    local_effort_id = None
    if not dry_run:
        csv_channel_id, _ = find_or_create_entity('Channel', 'Unified Customer CSV')
        local_effort_id, _ = find_or_create_entity('BusinessLine', 'Local Effort')

    for row_data in rows:
        source_id = row_data['sourceId']
        if not source_id:
            skipped += 1
            continue

        ledger_source_id = f'unified_customer_{source_id}'
        if already_processed(SOURCE, ledger_source_id):
            skipped += 1
            continue

        occurred_at = _parse_created_at(row_data['createdAtUtc'])
        customer_id, matched_by, conflicts = _choose_customer(row_data, alias_matches, name_matches)
        display_name = _display_name(row_data)

        if dry_run:
            print(f"  [DRY] {display_name!r} id={source_id} matched_by={matched_by}")
            if conflicts:
                conflicts_out.extend(conflicts)
            continue

        ledger_id = write_ledger_event(
            event_type='extraction.unified_customer_csv',
            source=SOURCE,
            source_id=ledger_source_id,
            payload={
                **row_data,
                'sourceFile': str(path),
                'matchedBy': matched_by,
                'conflicts': conflicts,
            },
            occurred_at=occurred_at,
        )

        if not customer_id:
            customer_id, created = find_or_create_entity('Customer', display_name)
            if created:
                customers_created += 1
                print(f'  [customer] {display_name}')
            else:
                customers_updated += 1
        else:
            customers_updated += 1

        if conflicts:
            conflicts_out.extend([{**c, 'csvId': source_id, 'csvName': row_data['name'], 'csvEmail': row_data['email']} for c in conflicts])

        _update_customer_entity(customer_id, row_data, matched_by, conflicts)

        if _upsert_alias(customer_id, source_id, 'unified_customers_csv_id'):
            aliases_written += 1
        if row_data['name'] and _upsert_alias(customer_id, row_data['name']):
            aliases_written += 1

        # Do not add a conflicting email alias to a different entity.
        email_conflict = any(c.get('type') == 'email_name_entity_conflict' for c in conflicts)
        if row_data['email'] and not email_conflict and _upsert_alias(customer_id, row_data['email']):
            aliases_written += 1

        write_assertion(
            src_id=customer_id,
            dst_id=csv_channel_id,
            rel_type='USES_CHANNEL',
            ledger_event_id=ledger_id,
            confidence=0.85,
            metadata={
                'source': SOURCE,
                'sourceFile': str(path),
                'csvCustomerId': source_id,
                'email': row_data['email'] or None,
                'name': row_data['name'] or None,
                'matchedBy': matched_by,
                'conflicts': conflicts,
            },
            valid_from=occurred_at,
            provisional=False,
        )
        assertions_written += 1

        if row_data['totalSpendCents'] or row_data['paymentCount']:
            write_assertion(
                src_id=customer_id,
                dst_id=local_effort_id,
                rel_type='PAYMENT_RECEIVED',
                ledger_event_id=ledger_id,
                confidence=0.9,
                metadata={
                    'source': SOURCE,
                    'sourceFile': str(path),
                    'csvCustomerId': source_id,
                    'amountCents': row_data['totalSpendCents'],
                    'amountDollars': row_data['totalSpendCents'] / 100,
                    'paymentCount': row_data['paymentCount'],
                    'refundedVolumeCents': row_data['refundedVolumeCents'],
                    'disputeLossesCents': row_data['disputeLossesCents'],
                    'createdAtUtc': row_data['createdAtUtc'] or None,
                    'aggregate': True,
                },
                valid_from=occurred_at,
                provisional=False,
            )
            assertions_written += 1

    return {
        'file': str(path),
        'rows_seen': len(rows),
        'customers_created': customers_created,
        'customers_updated': customers_updated,
        'aliases_written': aliases_written,
        'assertions_written': assertions_written,
        'skipped': skipped,
        'conflicts': conflicts_out[:20],
        'errors': errors[:20],
    }


if __name__ == '__main__':
    dry_run = '--dry-run' in sys.argv
    result = run(dry_run=dry_run)
    print(json.dumps(result, indent=2, default=str))
