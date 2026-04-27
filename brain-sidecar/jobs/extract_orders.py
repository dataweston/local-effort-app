"""
Job: extract_orders

Extracts Customer→Dish purchase history from the existing Prisma Order/OrderItem/
Dish/Customer tables in the main Postgres database.

Each Order becomes:
  - Customer entity (from Customer.name or email)
  - ORDERED assertions from Customer → each Dish purchased
  - PRICED_AT assertions recording the unit price at time of purchase

Each MenuWeek becomes:
  - Menu entity (linked to the week's Dish entities)
  - APPEARS_ON assertions from Dish → Menu

This is a zero-LLM job — data is fully structured.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import json
from datetime import datetime, timezone

from db import query, execute
from ledger import write_ledger_event, write_assertion, find_or_create_entity, already_processed


def run(dry_run: bool = False) -> dict:
    orders_processed = 0
    customers_created = 0
    dishes_linked = 0
    menus_created = 0
    assertions_written = 0
    errors = []

    # ── Extract MenuWeek → Menu entities ─────────────────────────────────────
    weeks = query("""
        SELECT mw.id, mw."weekStart", mw.status,
               array_agg(DISTINCT d.title) FILTER (WHERE d.title IS NOT NULL) AS dish_names
        FROM "MenuWeek" mw
        LEFT JOIN "MenuWeekItem" mwi ON mwi."menuWeekId" = mw.id
        LEFT JOIN "Dish" d ON d.id = mwi."dishId"
        GROUP BY mw.id, mw."weekStart", mw.status
        ORDER BY mw."weekStart" DESC
        LIMIT 200
    """)

    for week in weeks:
        week_id    = week['id']
        week_start = week['weekStart']
        dish_names = week.get('dish_names') or []

        if already_processed('extract_orders', f'menuweek_{week_id}'):
            continue

        menu_name = f'Meal Prep Week of {week_start.strftime("%Y-%m-%d") if hasattr(week_start, "strftime") else str(week_start)[:10]}'

        if dry_run:
            print(f'[DRY] Menu: {menu_name!r} — {len(dish_names)} dishes')
            continue

        ledger_id = write_ledger_event(
            event_type='extraction.orders',
            source='extract_orders',
            source_id=f'menuweek_{week_id}',
            payload={
                'weekStart': str(week_start)[:10],
                'status': week['status'],
                'dishCount': len(dish_names),
            },
            occurred_at=week_start if isinstance(week_start, datetime) else None,
        )

        menu_id, menu_created = find_or_create_entity('Menu', menu_name)
        if menu_created:
            menus_created += 1
            print(f'  [menu] {menu_name}')

        write_assertion(
            src_id=menu_id, dst_id=menu_id,
            rel_type='MENU_SNAPSHOT',
            ledger_event_id=ledger_id,
            confidence=1.0,
            metadata={'source': 'prisma_orders', 'menuType': 'weekly', 'weekStart': str(week_start)[:10]},
            provisional=False,
        )

        for dish_name in dish_names:
            if not dish_name:
                continue
            dish_id, _ = find_or_create_entity('Dish', dish_name)
            write_assertion(
                src_id=dish_id, dst_id=menu_id,
                rel_type='APPEARS_ON',
                ledger_event_id=ledger_id,
                confidence=1.0,
                metadata={'source': 'prisma_orders', 'weekStart': str(week_start)[:10]},
                provisional=False,
            )
            assertions_written += 1

    # ── Extract Orders → Customer purchase assertions ──────────────────────────
    orders = query("""
        SELECT
            o.id,
            o."submittedAt",
            o.status,
            o."totalsCents",
            o.notes,
            c.id      AS customer_id,
            c.name    AS customer_name,
            mw."weekStart" AS week_start
        FROM "Order" o
        JOIN "Customer" c   ON c.id = o."customerId"
        JOIN "MenuWeek" mw  ON mw.id = o."menuWeekId"
        WHERE o.status IN ('submitted', 'confirmed', 'delivered', 'complete')
        ORDER BY o."submittedAt" DESC NULLS LAST
        LIMIT 500
    """)

    for order in orders:
        order_id = order['id']
        if already_processed('extract_orders', f'order_{order_id}'):
            continue

        customer_name  = order['customer_name'] or 'Unknown Customer'
        week_start     = order['week_start']
        submitted_at   = order['submittedAt']
        total_cents    = order.get('totalsCents') or 0

        # Load line items
        items = query("""
            SELECT oi."dishId", oi.quantity, oi."unitPriceCents", oi."isAddon", d.title AS dish_name
            FROM "OrderItem" oi
            JOIN "Dish" d ON d.id = oi."dishId"
            WHERE oi."orderId" = %s
        """, (order_id,))

        if dry_run:
            print(f'[DRY] Order {order_id[:8]}… — {customer_name} — {len(items)} items — ${total_cents/100:.2f}')
            continue

        occurred_at = submitted_at if isinstance(submitted_at, datetime) else datetime.now(timezone.utc)

        ledger_id = write_ledger_event(
            event_type='extraction.orders',
            source='extract_orders',
            source_id=f'order_{order_id}',
            payload={
                'orderId': order_id,
                'customerName': customer_name,
                'weekStart': str(week_start)[:10] if week_start else None,
                'totalCents': total_cents,
                'itemCount': len(items),
                'status': order['status'],
            },
            occurred_at=occurred_at,
        )

        customer_id, customer_created = find_or_create_entity('Customer', customer_name)
        if customer_created:
            customers_created += 1
            print(f'  [customer] {customer_name}')

        menu_name = f'Meal Prep Week of {str(week_start)[:10]}'
        menu_id, _ = find_or_create_entity('Menu', menu_name)

        # Customer ORDERED from this menu week
        write_assertion(
            src_id=customer_id, dst_id=menu_id,
            rel_type='ORDERED',
            ledger_event_id=ledger_id,
            confidence=1.0,
            metadata={
                'source': 'prisma_orders',
                'orderId': order_id,
                'totalCents': total_cents,
                'itemCount': len(items),
            },
            valid_from=occurred_at,
            provisional=False,
        )
        assertions_written += 1

        for item in items:
            dish_name = item.get('dish_name', '')
            if not dish_name:
                continue
            dish_id, _ = find_or_create_entity('Dish', dish_name)
            unit_cents = item.get('unitPriceCents') or 0

            # Customer ORDERED this specific dish
            write_assertion(
                src_id=customer_id, dst_id=dish_id,
                rel_type='ORDERED',
                ledger_event_id=ledger_id,
                confidence=1.0,
                metadata={
                    'source': 'prisma_orders',
                    'quantity': item.get('quantity', 1),
                    'unitPriceCents': unit_cents,
                    'isAddon': item.get('isAddon', False),
                    'weekStart': str(week_start)[:10] if week_start else None,
                },
                valid_from=occurred_at,
                provisional=False,
            )
            assertions_written += 1
            dishes_linked += 1

            # Dish PRICED_AT (if we have a price)
            if unit_cents > 0:
                write_assertion(
                    src_id=dish_id, dst_id=dish_id,
                    rel_type='PRICED_AT',
                    ledger_event_id=ledger_id,
                    confidence=1.0,
                    metadata={
                        'source': 'prisma_orders',
                        'unitPriceCents': unit_cents,
                        'unitPriceDollars': unit_cents / 100,
                    },
                    valid_from=occurred_at,
                    provisional=False,
                )
                assertions_written += 1

        orders_processed += 1

    return {
        'orders_processed': orders_processed,
        'menus_created': menus_created,
        'customers_created': customers_created,
        'dishes_linked': dishes_linked,
        'assertions_written': assertions_written,
        'errors': errors[:20],
    }


if __name__ == '__main__':
    dry_run = '--dry-run' in sys.argv
    result = run(dry_run=dry_run)
    print(json.dumps(result, indent=2, default=str))
