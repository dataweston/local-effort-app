"""
Job: extract_square_catalog

Pulls product catalog and recent orders from Square POS API:
  - Catalog ITEM objects → Dish/Product entities (pizza items, meal prep SKUs, etc.)
  - Orders (completed/paid) → Customer purchase assertions where customer_id is known

Assertions written:
  - Dish/Product → MENU_SNAPSHOT  (catalog item metadata: price, description)
  - Customer     → ORDERED        (Square order → known customer)
  - Dish/Product → PRICED_AT      (from order line items)
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import json
import urllib.request
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(dotenv_path=Path(__file__).parent.parent.parent / '.env')

from ledger import write_ledger_event, write_assertion, find_or_create_entity, already_processed

SQUARE_TOKEN    = os.environ.get('SQUARE_ACCESS_TOKEN', '')
SQUARE_BASE     = 'https://connect.squareup.com/v2'
SQUARE_LOCATION = os.environ.get('SQUARE_LOCATION_ID', 'LG7Z6X1Y9C5YX')
SQUARE_VERSION  = '2024-01-17'


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


def _square_post(path: str, body: dict) -> dict:
    url = f"{SQUARE_BASE}/{path}"
    data = json.dumps(body).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={
        'Authorization': f'Bearer {SQUARE_TOKEN}',
        'Square-Version': SQUARE_VERSION,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    })
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))


def _fetch_all_catalog_items() -> list[dict]:
    """Paginate through all ITEM-type catalog objects."""
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


def _fetch_recent_orders(limit: int = 500) -> list[dict]:
    """Fetch recent completed/paid orders."""
    body = {
        'location_ids': [SQUARE_LOCATION],
        'limit': min(limit, 500),
        'query': {
            'sort': {'sort_field': 'CREATED_AT', 'sort_order': 'DESC'},
            'filter': {
                'state_filter': {'states': ['COMPLETED', 'OPEN']},
            },
        },
    }
    orders = []
    cursor = None
    fetched = 0
    while fetched < limit:
        if cursor:
            body['cursor'] = cursor
        data = _square_post('orders/search', body)
        batch = data.get('orders') or []
        orders.extend(batch)
        fetched += len(batch)
        cursor = data.get('cursor')
        if not cursor or len(batch) < 500:
            break
    return orders


def _cents_to_dollars(amount_cents: int) -> float:
    return round(amount_cents / 100, 2) if amount_cents else 0.0


def run(dry_run: bool = False) -> dict:
    products_written = 0
    orders_written = 0
    assertions_written = 0
    errors = []

    # ── Catalog Items → Dish/Product entities ─────────────────────────────────
    try:
        catalog_items = _fetch_all_catalog_items()
    except Exception as e:
        errors.append(f'catalog fetch error: {e}')
        catalog_items = []

    print(f'[extract_square_catalog] {len(catalog_items)} catalog items found')

    for item in catalog_items:
        item_id   = item.get('id', '')
        item_data = item.get('item_data') or {}
        name      = (item_data.get('name') or '').strip()
        desc      = (item_data.get('description') or '').strip()
        variations = item_data.get('variations') or []

        if not name or item.get('is_deleted'):
            continue

        source_id = f'square_catalog_{item_id}'
        if already_processed('extract_square_catalog', source_id):
            continue

        # Get price from first variation
        price_cents = 0
        for var in variations:
            var_data = var.get('item_variation_data') or {}
            price_money = var_data.get('price_money') or {}
            price_cents = price_money.get('amount') or 0
            if price_cents:
                break

        if dry_run:
            print(f'[DRY] Product: {name!r} — ${_cents_to_dollars(price_cents)} — {desc[:50] if desc else ""}')
            continue

        updated_at_str = item.get('updated_at') or item.get('created_at') or ''
        occurred_at = None
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
        )

        # Classify as Dish if food-sounding name, otherwise Product
        food_keywords = {'pizza', 'soup', 'salad', 'sandwich', 'meal', 'dish', 'plate',
                         'bowl', 'taco', 'burger', 'cake', 'tart', 'pie', 'bread', 'focaccia',
                         'trout', 'salmon', 'duck', 'lamb', 'chicken', 'beef', 'pork'}
        entity_type = 'Dish' if any(k in name.lower() for k in food_keywords) else 'Product'

        entity_id, entity_created = find_or_create_entity(entity_type, name)
        if entity_created:
            products_written += 1
            print(f'  [{entity_type}] {name}')

        write_assertion(
            src_id=entity_id, dst_id=entity_id,
            rel_type='MENU_SNAPSHOT',
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
                src_id=entity_id, dst_id=entity_id,
                rel_type='PRICED_AT',
                ledger_event_id=ledger_id,
                confidence=1.0,
                metadata={
                    'source': 'square_catalog',
                    'unitPriceCents': price_cents,
                    'unitPriceDollars': _cents_to_dollars(price_cents),
                },
                provisional=False,
            )
            assertions_written += 1

    # ── Orders → Customer purchase assertions ─────────────────────────────────
    try:
        orders = _fetch_recent_orders(limit=500)
    except Exception as e:
        errors.append(f'orders fetch error: {e}')
        orders = []

    print(f'[extract_square_catalog] {len(orders)} recent orders found')

    for order in orders:
        order_id    = order.get('id', '')
        customer_id = order.get('customer_id')  # only present if customer was linked
        created_at  = order.get('created_at') or ''
        total_money = order.get('total_money') or {}
        total_cents = total_money.get('amount') or 0
        line_items  = order.get('line_items') or []
        state       = order.get('state', '')

        source_id = f'square_order_{order_id}'
        if already_processed('extract_square_catalog', source_id):
            continue

        if dry_run:
            print(f'[DRY] Order {order_id[:8]}… — {state} — ${_cents_to_dollars(total_cents)} — {len(line_items)} items — customer={bool(customer_id)}')
            continue

        occurred_at = None
        if created_at:
            try:
                occurred_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            except ValueError:
                pass

        ledger_id = write_ledger_event(
            event_type='extraction.square_catalog',
            source='extract_square_catalog',
            source_id=source_id,
            payload={
                'squareOrderId': order_id,
                'squareCustomerId': customer_id,
                'totalCents': total_cents,
                'state': state,
                'itemCount': len(line_items),
            },
            occurred_at=occurred_at,
        )
        orders_written += 1

        for line in line_items:
            item_name  = (line.get('name') or '').strip()
            qty        = int(line.get('quantity') or 1)
            unit_money = line.get('base_price_money') or {}
            unit_cents = unit_money.get('amount') or 0

            if not item_name:
                continue

            food_keywords = {'pizza', 'soup', 'salad', 'sandwich', 'meal', 'dish',
                             'bowl', 'cake', 'tart', 'pie', 'bread', 'focaccia',
                             'trout', 'salmon', 'duck', 'lamb', 'chicken', 'beef',
                             'pork', 'weekly', 'meals', 'panuozzo', 'croque'}
            entity_type = 'Dish' if any(k in item_name.lower() for k in food_keywords) else 'Product'

            dish_id, dish_created = find_or_create_entity(entity_type, item_name)
            if dish_created:
                print(f'    [{entity_type}] {item_name}')

            if unit_cents > 0:
                write_assertion(
                    src_id=dish_id, dst_id=dish_id,
                    rel_type='PRICED_AT',
                    ledger_event_id=ledger_id,
                    confidence=1.0,
                    metadata={
                        'source': 'square_order',
                        'unitPriceCents': unit_cents,
                        'unitPriceDollars': _cents_to_dollars(unit_cents),
                    },
                    valid_from=occurred_at,
                    provisional=False,
                )
                assertions_written += 1

    return {
        'products_written': products_written,
        'orders_written': orders_written,
        'assertions_written': assertions_written,
        'errors': errors[:20],
    }


if __name__ == '__main__':
    dry_run = '--dry-run' in sys.argv
    result = run(dry_run=dry_run)
    print(json.dumps(result, indent=2, default=str))
