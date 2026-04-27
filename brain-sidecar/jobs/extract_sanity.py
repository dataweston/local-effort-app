"""
Job: extract_sanity

Extracts structured knowledge from the Sanity CMS (project: d6l9d0ea, dataset: localeffort).

Document types extracted:
  - menuItems    → Dish entities with ingredients list and dietary notes
  - mealPrepMenu → Customer (clientName) + Dish entities from weekly meal prep menus
  - publicEvent  → Note entities capturing event metadata (location, food type, date)

Relationship assertions written:
  - Dish  → MENU_SNAPSHOT  (menuItems self-assertion with dietary/source metadata)
  - Dish  → CONTAINS       (Ingredient from menuItems.ingredients list)
  - Customer → ORDERED     (mealPrepMenu client ordered dishes)
  - Dish  → APPEARS_ON     (meal prep menus)
  - Note  → ABOUT          (publicEvent metadata)
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import json
import re
import urllib.request
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(dotenv_path=Path(__file__).parent.parent.parent / '.env')

from ledger import write_ledger_event, write_assertion, find_or_create_entity, already_processed

SANITY_PROJECT_ID = os.environ.get('SANITY_PROJECT_ID', 'd6l9d0ea')
SANITY_DATASET    = os.environ.get('VITE_SANITY_DATASET', 'localeffort')
SANITY_TOKEN      = os.environ.get('SANITY_API_TOKEN', '')
SANITY_API_VERSION = '2021-06-07'


def _sanity_query(groq: str) -> list:
    url = (
        f"https://{SANITY_PROJECT_ID}.api.sanity.io/v{SANITY_API_VERSION}"
        f"/data/query/{SANITY_DATASET}"
        f"?query={urllib.parse.quote(groq)}"
    )
    req = urllib.request.Request(url, headers={
        'Authorization': f'Bearer {SANITY_TOKEN}',
        'Content-Type': 'application/json',
    })
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
    return data.get('result', [])


def _blocks_to_text(blocks) -> str:
    """Convert Sanity portable text blocks to plain text."""
    if isinstance(blocks, str):
        return blocks
    if not isinstance(blocks, list):
        return ''
    parts = []
    for block in blocks:
        if isinstance(block, dict) and block.get('_type') == 'block':
            for child in block.get('children', []):
                if isinstance(child, dict):
                    parts.append(child.get('text', ''))
    return ' '.join(p for p in parts if p).strip()


def run(dry_run: bool = False) -> dict:
    dishes_written = 0
    ingredients_written = 0
    customers_written = 0
    events_written = 0
    assertions_written = 0
    errors = []

    # ── menuItems → Dish entities ─────────────────────────────────────────────
    try:
        menu_items = _sanity_query(
            '*[_type == "menuItems" && !(_id in path("drafts.**"))]'
            '{_id, _updatedAt, name, description, ingredients}'
        )
    except Exception as e:
        errors.append(f'menuItems fetch error: {e}')
        menu_items = []

    print(f'[extract_sanity] {len(menu_items)} menuItems found')

    for item in menu_items:
        sanity_id   = item['_id']
        dish_name   = (item.get('name') or '').strip()
        description = (item.get('description') or '').strip()
        ing_list    = item.get('ingredients') or []

        if not dish_name:
            continue

        source_id = f'sanity_menuitem_{sanity_id}'
        if already_processed('extract_sanity', source_id):
            continue

        if dry_run:
            print(f'[DRY] Dish: {dish_name!r} — {len(ing_list)} ingredients')
            continue

        ledger_id = write_ledger_event(
            event_type='extraction.sanity',
            source='extract_sanity',
            source_id=source_id,
            payload={
                'sanityId': sanity_id,
                'name': dish_name,
                'description': description,
                'ingredientCount': len(ing_list),
            },
        )

        dish_id, dish_created = find_or_create_entity('Dish', dish_name)
        if dish_created:
            dishes_written += 1
            print(f'  [dish] {dish_name}')

        write_assertion(
            src_id=dish_id, dst_id=dish_id,
            rel_type='MENU_SNAPSHOT',
            ledger_event_id=ledger_id,
            confidence=1.0,
            metadata={
                'source': 'sanity_cms',
                'sanityId': sanity_id,
                'description': description,
                'menuType': 'catering',
            },
            provisional=False,
        )
        assertions_written += 1

        for ing_name in ing_list:
            ing_name = (ing_name or '').strip()
            if not ing_name or len(ing_name) < 2:
                continue
            try:
                ing_id, ing_created = find_or_create_entity('Ingredient', ing_name)
                if ing_created:
                    ingredients_written += 1
                    print(f'    [ingredient] {ing_name}')
                write_assertion(
                    src_id=dish_id, dst_id=ing_id,
                    rel_type='CONTAINS',
                    ledger_event_id=ledger_id,
                    confidence=1.0,
                    metadata={'source': 'sanity_cms', 'sanityType': 'menuItems'},
                    provisional=False,
                )
                assertions_written += 1
            except Exception as e:
                errors.append(f'ingredient {ing_name!r}: {e}')

    # ── mealPrepMenu → Customer + Dish entities ───────────────────────────────
    try:
        meal_prep_menus = _sanity_query(
            '*[_type == "mealPrepMenu" && !(_id in path("drafts.**"))]'
            '{_id, _updatedAt, clientName, date, menu, published}'
        )
    except Exception as e:
        errors.append(f'mealPrepMenu fetch error: {e}')
        meal_prep_menus = []

    print(f'[extract_sanity] {len(meal_prep_menus)} mealPrepMenus found')

    for mpm in meal_prep_menus:
        sanity_id   = mpm['_id']
        client_name = (mpm.get('clientName') or '').strip()
        date_str    = (mpm.get('date') or '')
        dish_lines  = mpm.get('menu') or []

        if not client_name:
            continue

        source_id = f'sanity_mealprep_{sanity_id}'
        if already_processed('extract_sanity', source_id):
            continue

        if dry_run:
            print(f'[DRY] MealPrep: {client_name!r} — {date_str} — {len(dish_lines)} dishes')
            continue

        occurred_at = None
        if date_str:
            try:
                occurred_at = datetime.fromisoformat(date_str).replace(tzinfo=timezone.utc)
            except ValueError:
                pass

        ledger_id = write_ledger_event(
            event_type='extraction.sanity',
            source='extract_sanity',
            source_id=source_id,
            payload={
                'sanityId': sanity_id,
                'clientName': client_name,
                'date': date_str,
                'dishCount': len(dish_lines),
            },
            occurred_at=occurred_at,
        )

        customer_id, customer_created = find_or_create_entity('Customer', client_name)
        if customer_created:
            customers_written += 1
            print(f'  [customer] {client_name}')

        menu_name = f'Meal Prep {date_str}' if date_str else f'Meal Prep: {client_name}'
        menu_id, _ = find_or_create_entity('Menu', menu_name)

        write_assertion(
            src_id=customer_id, dst_id=menu_id,
            rel_type='ORDERED',
            ledger_event_id=ledger_id,
            confidence=1.0,
            metadata={
                'source': 'sanity_cms',
                'sanityType': 'mealPrepMenu',
                'date': date_str,
            },
            valid_from=occurred_at,
            provisional=False,
        )
        assertions_written += 1

        for line in dish_lines:
            line = (line or '').strip()
            if not line:
                continue
            # Strip leading "Dinner N: " / "Lunch N: " prefixes
            dish_name = re.sub(r'^(Dinner|Lunch|Breakfast|Snack)\s*\d*\s*:\s*', '', line, flags=re.I).strip()
            # Take just the first part before comma for dish name
            dish_name = dish_name.split(',')[0].strip()
            if not dish_name or len(dish_name) < 2:
                continue

            dish_id, dish_created = find_or_create_entity('Dish', dish_name)
            if dish_created:
                dishes_written += 1
                print(f'    [dish] {dish_name}')

            write_assertion(
                src_id=dish_id, dst_id=menu_id,
                rel_type='APPEARS_ON',
                ledger_event_id=ledger_id,
                confidence=1.0,
                metadata={
                    'source': 'sanity_cms',
                    'sanityType': 'mealPrepMenu',
                    'rawLine': line,
                    'date': date_str,
                },
                provisional=False,
            )
            assertions_written += 1

            write_assertion(
                src_id=customer_id, dst_id=dish_id,
                rel_type='ORDERED',
                ledger_event_id=ledger_id,
                confidence=1.0,
                metadata={
                    'source': 'sanity_cms',
                    'sanityType': 'mealPrepMenu',
                    'date': date_str,
                },
                valid_from=occurred_at,
                provisional=False,
            )
            assertions_written += 1

    # ── publicEvent → Note entities ───────────────────────────────────────────
    try:
        events = _sanity_query(
            '*[_type == "publicEvent" && !(_id in path("drafts.**"))]'
            '{_id, _updatedAt, startDate, location, foodType, ticketsUrl, description}'
        )
    except Exception as e:
        errors.append(f'publicEvent fetch error: {e}')
        events = []

    print(f'[extract_sanity] {len(events)} publicEvents found')

    for event in events:
        sanity_id  = event['_id']
        start_date = event.get('startDate') or ''
        location   = (event.get('location') or '').strip()
        food_type  = (event.get('foodType') or '').strip()
        tickets    = (event.get('ticketsUrl') or '').strip()
        desc_raw   = event.get('description') or ''
        description = _blocks_to_text(desc_raw)

        source_id = f'sanity_event_{sanity_id}'
        if already_processed('extract_sanity', source_id):
            continue

        note_name = f'Event: {location} {start_date}'.strip()
        if not note_name or note_name == 'Event:':
            note_name = f'Event: {sanity_id[:8]}'

        if dry_run:
            print(f'[DRY] Event: {note_name!r} — {food_type}')
            continue

        occurred_at = None
        if start_date:
            try:
                occurred_at = datetime.fromisoformat(start_date).replace(tzinfo=timezone.utc)
            except ValueError:
                pass

        ledger_id = write_ledger_event(
            event_type='extraction.sanity',
            source='extract_sanity',
            source_id=source_id,
            payload={
                'sanityId': sanity_id,
                'startDate': start_date,
                'location': location,
                'foodType': food_type,
            },
            occurred_at=occurred_at,
        )

        note_id, note_created = find_or_create_entity('Note', note_name)
        if note_created:
            events_written += 1
            print(f'  [note] {note_name}')

        write_assertion(
            src_id=note_id, dst_id=note_id,
            rel_type='ABOUT',
            ledger_event_id=ledger_id,
            confidence=1.0,
            metadata={
                'source': 'sanity_cms',
                'sanityType': 'publicEvent',
                'sanityId': sanity_id,
                'startDate': start_date,
                'location': location,
                'foodType': food_type,
                'ticketsUrl': tickets,
                'description': description[:500],
            },
            valid_from=occurred_at,
            provisional=False,
        )
        assertions_written += 1

    return {
        'dishes_written': dishes_written,
        'ingredients_written': ingredients_written,
        'customers_written': customers_written,
        'events_written': events_written,
        'assertions_written': assertions_written,
        'errors': errors[:20],
    }


if __name__ == '__main__':
    dry_run = '--dry-run' in sys.argv
    result = run(dry_run=dry_run)
    print(json.dumps(result, indent=2, default=str))
