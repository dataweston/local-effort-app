"""
Job: extract_square_customers

Pulls customer profiles from Square Customer Directory into the Brain.

Square payments, orders, and sales transactions are intentionally not ingested
here; local-budget is the transaction source of truth.

Assertions written:
  - Customer -> USES_CHANNEL -> Channel("Square")
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import json
import urllib.request
import urllib.parse
import uuid
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(dotenv_path=Path(__file__).parent.parent.parent / '.env')

from db import execute, query
from ledger import write_ledger_event, write_assertion, find_or_create_entity, already_processed

SQUARE_TOKEN = os.environ.get('SQUARE_ACCESS_TOKEN', '')
SQUARE_BASE = os.environ.get('SQUARE_BASE', 'https://connect.squareup.com/v2')
SQUARE_VERSION = os.environ.get('SQUARE_VERSION', '2026-01-22')


def _square_get(path: str, params: dict | None = None) -> dict:
    url = f"{SQUARE_BASE.rstrip('/')}/{path.lstrip('/')}"
    if params:
        url += '?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={
        'Authorization': f'Bearer {SQUARE_TOKEN}',
        'Square-Version': SQUARE_VERSION,
        'Accept': 'application/json',
    })
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))


def _fetch_all_customers() -> list[dict]:
    customers = []
    cursor = None
    while True:
        params = {
            'limit': 100,
            'sort_field': 'CREATED_AT',
            'sort_order': 'ASC',
        }
        if cursor:
            params['cursor'] = cursor
        data = _square_get('customers', params)
        batch = data.get('customers') or []
        customers.extend(batch)
        cursor = data.get('cursor')
        if not cursor:
            break
    return customers


def _parse_square_datetime(value: str | None):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace('Z', '+00:00'))
    except ValueError:
        return None


def _display_name(customer: dict) -> str:
    given = (customer.get('given_name') or '').strip()
    family = (customer.get('family_name') or '').strip()
    full = f'{given} {family}'.strip()
    return (
        full
        or (customer.get('company_name') or '').strip()
        or (customer.get('email_address') or '').strip().lower()
        or (customer.get('phone_number') or '').strip()
        or f"Square Customer {str(customer.get('id') or '')[:8]}"
    )


def _alias_values(customer: dict, display_name: str) -> list[str]:
    values = [
        display_name,
        (customer.get('email_address') or '').strip().lower(),
        (customer.get('phone_number') or '').strip(),
        (customer.get('company_name') or '').strip(),
        (customer.get('nickname') or '').strip(),
    ]
    seen = set()
    aliases = []
    for value in values:
        key = value.lower()
        if value and len(value) > 1 and key not in seen:
            aliases.append(value)
            seen.add(key)
    return aliases


def _find_existing_customer(square_customer_id: str, aliases: list[str]) -> str | None:
    if square_customer_id:
        rows = query(
            """
            SELECT id FROM "BrainEntity"
            WHERE "squareCustomerId" = %s
              AND "entityType" = 'Customer'
              AND "tombstonedAt" IS NULL
            LIMIT 1
            """,
            (square_customer_id,),
        )
        if rows:
            return rows[0]['id']

    for alias in aliases:
        rows = query(
            """
            SELECT e.id
            FROM "BrainEntityAlias" a
            JOIN "BrainEntity" e ON e.id = a."entityId"
            WHERE LOWER(a.alias) = LOWER(%s)
              AND e."entityType" = 'Customer'
              AND e."tombstonedAt" IS NULL
            LIMIT 1
            """,
            (alias,),
        )
        if rows:
            return rows[0]['id']
    return None


def _upsert_alias(entity_id: str, alias: str, source: str = 'square_customers') -> bool:
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


def _update_customer_entity(entity_id: str, customer: dict) -> None:
    properties = {
        'square': {
            'customerId': customer.get('id'),
            'givenName': customer.get('given_name'),
            'familyName': customer.get('family_name'),
            'companyName': customer.get('company_name'),
            'nickname': customer.get('nickname'),
            'email': customer.get('email_address'),
            'phone': customer.get('phone_number'),
            'birthday': customer.get('birthday'),
            'createdAt': customer.get('created_at'),
            'updatedAt': customer.get('updated_at'),
            'creationSource': customer.get('creation_source'),
            'groupIds': customer.get('group_ids') or [],
            'segmentIds': customer.get('segment_ids') or [],
            'emailUnsubscribed': (customer.get('preferences') or {}).get('email_unsubscribed'),
        }
    }
    execute(
        """
        UPDATE "BrainEntity"
        SET "squareCustomerId" = %s,
            properties = COALESCE(properties, '{}'::jsonb) || %s::jsonb,
            "updatedAt" = NOW()
        WHERE id = %s
        """,
        (customer.get('id'), json.dumps(properties), entity_id),
    )


def run(dry_run: bool = False) -> dict:
    customers_seen = 0
    customers_written = 0
    customers_updated = 0
    aliases_written = 0
    assertions_written = 0
    skipped = 0
    errors = []

    if not SQUARE_TOKEN:
        return {
            'customers_seen': 0,
            'customers_written': 0,
            'customers_updated': 0,
            'aliases_written': 0,
            'assertions_written': 0,
            'skipped': 0,
            'errors': ['SQUARE_ACCESS_TOKEN is not set'],
        }

    try:
        customers = _fetch_all_customers()
    except Exception as e:
        errors.append(f'customers fetch error: {e}')
        customers = []

    customers_seen = len(customers)
    print(f'[extract_square_customers] {customers_seen} customers found')

    for customer in customers:
        square_customer_id = customer.get('id')
        if not square_customer_id:
            skipped += 1
            continue

        display_name = _display_name(customer)
        aliases = _alias_values(customer, display_name)
        snapshot_key = customer.get('updated_at') or customer.get('created_at') or customer.get('version') or 'unknown'
        source_id = f'square_customer_{square_customer_id}_{snapshot_key}'

        if already_processed('extract_square_customers', source_id):
            skipped += 1
            continue

        email = (customer.get('email_address') or '').strip().lower()
        phone = (customer.get('phone_number') or '').strip()

        if dry_run:
            print(f'[DRY] Customer: {display_name!r} email={email or "-"} phone={phone or "-"}')
            continue

        occurred_at = _parse_square_datetime(customer.get('updated_at') or customer.get('created_at'))
        ledger_id = write_ledger_event(
            event_type='extraction.square_customer',
            source='extract_square_customers',
            source_id=source_id,
            payload={
                'squareCustomerId': square_customer_id,
                'displayName': display_name,
                'givenName': customer.get('given_name'),
                'familyName': customer.get('family_name'),
                'companyName': customer.get('company_name'),
                'nickname': customer.get('nickname'),
                'email': email,
                'phone': phone,
                'createdAt': customer.get('created_at'),
                'updatedAt': customer.get('updated_at'),
                'creationSource': customer.get('creation_source'),
                'groupIds': customer.get('group_ids') or [],
                'segmentIds': customer.get('segment_ids') or [],
            },
            occurred_at=occurred_at,
        )

        existing_id = _find_existing_customer(square_customer_id, aliases)
        if existing_id:
            customer_id = existing_id
            customers_updated += 1
        else:
            customer_id, created = find_or_create_entity('Customer', display_name)
            if created:
                customers_written += 1
                print(f'  [customer] {display_name}')
            else:
                customers_updated += 1

        _update_customer_entity(customer_id, customer)

        for alias in aliases:
            if _upsert_alias(customer_id, alias):
                aliases_written += 1

        square_channel_id, _ = find_or_create_entity('Channel', 'Square')
        write_assertion(
            src_id=customer_id,
            dst_id=square_channel_id,
            rel_type='USES_CHANNEL',
            ledger_event_id=ledger_id,
            confidence=1.0,
            metadata={
                'source': 'square_customers',
                'squareCustomerId': square_customer_id,
                'email': email,
                'phone': phone,
                'createdAt': customer.get('created_at'),
                'updatedAt': customer.get('updated_at'),
                'creationSource': customer.get('creation_source'),
                'groupIds': customer.get('group_ids') or [],
                'segmentIds': customer.get('segment_ids') or [],
            },
            valid_from=occurred_at,
            provisional=False,
        )
        assertions_written += 1

    return {
        'customers_seen': customers_seen,
        'customers_written': customers_written,
        'customers_updated': customers_updated,
        'aliases_written': aliases_written,
        'assertions_written': assertions_written,
        'skipped': skipped,
        'errors': errors[:20],
    }


if __name__ == '__main__':
    dry_run = '--dry-run' in sys.argv
    result = run(dry_run=dry_run)
    print(json.dumps(result, indent=2, default=str))
