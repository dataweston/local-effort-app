"""
Job: extract_planner

Extracts structured knowledge from the WeeklyPlanner tables:
  - PlannerOverhead  → Vendor entities with recurring cost assertions
  - PlannerCOGS      → Ingredient/supply cost facts per week
  - PlannerCard      → Revenue/event facts (catering, meal prep, pizza)

PlannerOverhead is the highest value — it's a named list of recurring business
costs (rent, insurance, subscriptions, etc.) that map directly to Vendor or
cost-category entities.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import json
from datetime import datetime, timezone

from db import query
from ledger import write_ledger_event, write_assertion, find_or_create_entity, already_processed

# Card types that represent revenue or customer events
REVENUE_CARD_TYPES = {'catering', 'meal_prep', 'pizza', 'event', 'revenue', 'sale'}
# Card types that represent expenses / COGS
EXPENSE_CARD_TYPES = {'cogs', 'expense', 'supply', 'ingredient', 'overhead', 'labor', 'cost'}


def run(dry_run: bool = False) -> dict:
    overheads_written = 0
    cogs_written = 0
    cards_written = 0
    assertions_written = 0
    errors = []

    # ── PlannerOverhead → Vendor / cost entities ──────────────────────────────
    overheads = query("""
        SELECT id, name, "monthlyCost", "createdAt"
        FROM "PlannerOverhead"
        ORDER BY name
    """)

    for oh in overheads:
        oh_id   = oh['id']
        name    = (oh.get('name') or '').strip()
        cost    = oh.get('monthlyCost') or 0

        if not name:
            continue
        if already_processed('extract_planner', f'overhead_{oh_id}'):
            continue

        if dry_run:
            print(f'[DRY] Overhead: {name!r} — ${cost}/mo')
            continue

        ledger_id = write_ledger_event(
            event_type='extraction.planner',
            source='extract_planner',
            source_id=f'overhead_{oh_id}',
            payload={'name': name, 'monthlyCost': cost},
        )

        entity_type = 'Vendor' if _looks_like_vendor(name, '') else 'Note'
        entity_id, created = find_or_create_entity(entity_type, name)
        if created:
            overheads_written += 1
            print(f'  [{entity_type}] {name}')

        write_assertion(
            src_id=entity_id, dst_id=entity_id,
            rel_type='PAYMENT_SENT',
            ledger_event_id=ledger_id,
            confidence=0.95,
            metadata={
                'source': 'planner_overhead',
                'monthlyCost': cost,
                'recurrence': 'monthly',
            },
            provisional=False,
        )
        assertions_written += 1

    # ── PlannerCOGS → supply/ingredient cost facts ────────────────────────────
    cogs_rows = query("""
        SELECT id, name, amount, "weekStart"
        FROM "PlannerCOGS"
        ORDER BY "weekStart" DESC NULLS LAST
        LIMIT 500
    """)

    for cogs in cogs_rows:
        cogs_id = cogs['id']
        desc    = (cogs.get('name') or '').strip()
        amount  = cogs.get('amount') or 0
        week    = cogs.get('weekStart')

        if not desc:
            continue
        if already_processed('extract_planner', f'cogs_{cogs_id}'):
            continue

        if dry_run:
            print(f'[DRY] COGS: {desc!r} — ${amount}')
            continue

        occurred_at = week if isinstance(week, datetime) else datetime.now(timezone.utc)

        ledger_id = write_ledger_event(
            event_type='extraction.planner',
            source='extract_planner',
            source_id=f'cogs_{cogs_id}',
            payload={'name': desc, 'amount': amount},
            occurred_at=occurred_at,
        )

        entity_type = 'Ingredient' if _looks_like_ingredient(desc, '') else 'Note'
        entity_id, created = find_or_create_entity(entity_type, desc)
        if created:
            cogs_written += 1
            print(f'  [{entity_type}] {desc}')

        write_assertion(
            src_id=entity_id, dst_id=entity_id,
            rel_type='PRICED_AT',
            ledger_event_id=ledger_id,
            confidence=0.9,
            metadata={'source': 'planner_cogs', 'amount': amount},
            valid_from=occurred_at,
            provisional=False,
        )
        assertions_written += 1

    # ── PlannerCard → revenue/event facts ────────────────────────────────────
    cards = query("""
        SELECT id, title, date, zone, revenue, cost, people
        FROM "PlannerCard"
        ORDER BY date DESC NULLS LAST
        LIMIT 500
    """)

    for card in cards:
        card_id  = card['id']
        title    = (card.get('title') or '').strip()
        zone     = (card.get('zone') or '').lower()
        revenue  = card.get('revenue') or 0
        cost     = card.get('cost') or 0
        date     = card.get('date')
        people   = card.get('people') or 0

        if not title:
            continue
        if already_processed('extract_planner', f'card_{card_id}'):
            continue

        if dry_run:
            print(f'[DRY] Card: {title!r} — zone={zone} — rev=${revenue} cost=${cost}')
            continue

        occurred_at = date if isinstance(date, datetime) else datetime.now(timezone.utc)

        ledger_id = write_ledger_event(
            event_type='extraction.planner',
            source='extract_planner',
            source_id=f'card_{card_id}',
            payload={'title': title, 'zone': zone, 'revenue': revenue, 'cost': cost, 'people': people},
            occurred_at=occurred_at,
        )

        if revenue > 0 or cost > 0:
            note_id, created = find_or_create_entity('Note', f'Planner: {title}')
            if created:
                cards_written += 1
                print(f'  [note] Planner: {title}')
            write_assertion(
                src_id=note_id, dst_id=note_id,
                rel_type='ABOUT',
                ledger_event_id=ledger_id,
                confidence=0.9,
                metadata={
                    'source': 'planner_card',
                    'zone': zone,
                    'revenue': revenue,
                    'cost': cost,
                    'people': people,
                },
                valid_from=occurred_at,
                provisional=False,
            )
            assertions_written += 1

    return {
        'overheads_written': overheads_written,
        'cogs_written': cogs_written,
        'cards_written': cards_written,
        'assertions_written': assertions_written,
        'errors': errors[:20],
    }


def _looks_like_vendor(name: str, category: str) -> bool:
    vendor_categories = {'rent', 'insurance', 'subscription', 'utility', 'service',
                         'vendor', 'supplier', 'software', 'platform', 'lease'}
    cat_lower = (category or '').lower()
    name_lower = name.lower()
    if any(k in cat_lower for k in vendor_categories):
        return True
    # Proper nouns with spaces are likely vendor names
    words = name.split()
    if len(words) >= 2 and all(w[0].isupper() for w in words if w):
        return True
    return False


def _looks_like_ingredient(desc: str, category: str) -> bool:
    food_categories = {'food', 'produce', 'protein', 'dairy', 'ingredient',
                       'meat', 'fish', 'seafood', 'grain', 'spice', 'cogs'}
    cat_lower = (category or '').lower()
    return any(k in cat_lower for k in food_categories)


if __name__ == '__main__':
    dry_run = '--dry-run' in sys.argv
    result = run(dry_run=dry_run)
    print(json.dumps(result, indent=2, default=str))
