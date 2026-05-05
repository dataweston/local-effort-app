"""
Job: extract_square_catalog

Pulls product catalog from Square POS API.

Square transactions/orders are intentionally not ingested here; local-budget is
the transaction source of truth. Customer records are handled by
extract_square_customers.

Assertions written:
  - Dish/Product -> LISTED_ON -> Channel("Square")
  - Dish/Product -> PRICED_AT -> Channel("Square") when catalog price exists
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import json
import urllib.request
import urllib.parse
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(dotenv_path=Path(__file__).parent.parent.parent / '.env')

from ledger import write_ledger_event, write_assertion, find_or_create_entity, already_processed

SQUARE_TOKEN = os.environ.get('SQUARE_ACCESS_TOKEN', '')
SQUARE_BASE = 'https://connect.squareup.com/v2'
SQUARE_VERSION = os.environ.get('SQUARE_VERSION', '2024-01-17')


def _square_get(path: str, params: dict | None = None) -> dict:
    url = f"{SQUARE_BASE}/{path}"
    if params:
        url += '?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={
        'Authorization': f'Bearer {SQUARE_TOKEN}',
        'Square-Version': SQUARE_VERSION,
        'Accept': 'application/json',
    })
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))


def _fetch_all_catalog_items() -> list[dict]:
    items = []
    cursor = None
    while True:
        params = {'types': 'ITEM', 'limit': 100}
        if cursor:
            params['cursor'] = cursor
        data = _square_get('catalog/list', params)
        batch = data.get('objects') or []
        items.extend(batch)
        cursor = data.get('cursor')
        if not cursor:
            break
    return items


def _cents_to_dollars(amount_cents: int) -> float:
    return round(amount_cents / 100, 2) if amount_cents else 0.0


def _entity_type_for_item(name: str) -> str:
    food_keywords = {
        'pizza', 'soup', 'salad', 'sandwich', 'meal', 'dish', 'plate',
        'bowl', 'taco', 'burger', 'cake', 'tart', 'pie', 'bread',
        'focaccia', 'trout', 'salmon', 'duck', 'lamb', 'chicken',
        'beef', 'pork', 'weekly', 'meals', 'panuozzo', 'croque',
    }
    return 'Dish' if any(k in name.lower() for k in food_keywords) else 'Product'


def run(dry_run: bool = False) -> dict:
    products_written = 0
    assertions_written = 0
    errors = []

    try:
        catalog_items = _fetch_all_catalog_items()
    except Exception as e:
        errors.append(f'catalog fetch error: {e}')
        catalog_items = []

    print(f'[extract_square_catalog] {len(catalog_items)} catalog items found')

    for item in catalog_items:
        item_id = item.get('id', '')
        item_data = item.get('item_data') or {}
        name = (item_data.get('name') or '').strip()
        desc = (item_data.get('description') or '').strip()
        variations = item_data.get('variations') or []

        if not name or item.get('is_deleted'):
            continue

        source_id = f'square_catalog_{item_id}'
        if already_processed('extract_square_catalog', source_id):
            continue

        price_cents = 0
        for var in variations:
            var_data = var.get('item_variation_data') or {}
            price_money = var_data.get('price_money') or {}
            price_cents = price_money.get('amount') or 0
            if price_cents:
                break

        entity_type = _entity_type_for_item(name)

        if dry_run:
            print(f'[DRY] {entity_type}: {name!r} - ${_cents_to_dollars(price_cents)} - {desc[:50] if desc else ""}')
            continue

        occurred_at = None
        updated_at_str = item.get('updated_at') or item.get('created_at') or ''
        if updated_at_str:
            try:
                occurred_at = datetime.fromisoformat(updated_at_str.replace('Z', '+00:00'))
            except ValueError:
                pass

        ledger_id = write_ledger_event(
            event_type='extraction.square_catalog',
            source='extract_square_catalog',
            source_id=source_id,
            payload={
                'squareId': item_id,
                'name': name,
                'description': desc,
                'priceCents': price_cents,
                'variationCount': len(variations),
            },
            occurred_at=occurred_at,
        )

        entity_id, entity_created = find_or_create_entity(entity_type, name)
        square_channel_id, _ = find_or_create_entity('Channel', 'Square')
        if entity_created:
            products_written += 1
            print(f'  [{entity_type}] {name}')

        write_assertion(
            src_id=entity_id,
            dst_id=square_channel_id,
            rel_type='LISTED_ON',
            ledger_event_id=ledger_id,
            confidence=1.0,
            metadata={
                'source': 'square_catalog',
                'squareId': item_id,
                'description': desc[:300],
                'priceCents': price_cents,
                'priceDollars': _cents_to_dollars(price_cents),
                'variationCount': len(variations),
            },
            provisional=False,
        )
        assertions_written += 1

        if price_cents > 0:
            write_assertion(
                src_id=entity_id,
                dst_id=square_channel_id,
                rel_type='PRICED_AT',
                ledger_event_id=ledger_id,
                confidence=1.0,
                metadata={
                    'source': 'square_catalog',
                    'unitPriceCents': price_cents,
                    'unitPriceDollars': _cents_to_dollars(price_cents),
                },
                valid_from=occurred_at,
                provisional=False,
            )
            assertions_written += 1

    return {
        'products_written': products_written,
        'orders_written': 0,
        'assertions_written': assertions_written,
        'errors': errors[:20],
    }


if __name__ == '__main__':
    dry_run = '--dry-run' in sys.argv
    result = run(dry_run=dry_run)
    print(json.dumps(result, indent=2, default=str))
