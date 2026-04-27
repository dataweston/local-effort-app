"""
Job: extract_xlsx_model

Extracts structured knowledge from the Excel business model, exported as CSVs
in ~/Downloads/airtable_import_pack/:
  - 03_Ingredients.csv  → Ingredient entities with vendor/cost/category data
  - 04_Recipes.csv      → Dish entities (recipe nodes)
  - 05_Menu_Items.csv   → Dish entities with pricing (SKUs)
  - 06_Recipe_Components.csv → CONTAINS assertions (Dish → Ingredient with quantities)

Assertions written:
  - Ingredient → PRICED_AT      (known unit cost from model)
  - Ingredient → MENU_SNAPSHOT  (vendor, category, channel metadata)
  - Dish       → MENU_SNAPSHOT  (recipe / menu item metadata with pricing)
  - Dish       → CONTAINS       (from Recipe Components BOM)
  - Vendor     → PAYMENT_SENT   (inferred from ingredient-vendor relationships)
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import csv
import json
from pathlib import Path
from datetime import timezone

from dotenv import load_dotenv
load_dotenv(dotenv_path=Path(__file__).parent.parent.parent / '.env')

from ledger import write_ledger_event, write_assertion, find_or_create_entity, already_processed

# Path to the airtable export pack — relative to user home
PACK_DIR = Path.home() / 'Downloads' / 'airtable_import_pack'


def _read_csv(filename: str) -> list[dict]:
    path = PACK_DIR / filename
    if not path.exists():
        return []
    with open(path, encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))


def run(dry_run: bool = False) -> dict:
    if not PACK_DIR.exists():
        print(f'[extract_xlsx_model] pack dir not found: {PACK_DIR}')
        return {'error': f'pack dir not found: {PACK_DIR}'}

    ingredients_written = 0
    vendors_written = 0
    dishes_written = 0
    assertions_written = 0
    errors = []

    # ── Ingredients → Ingredient + Vendor entities ────────────────────────────
    ingredients_rows = _read_csv('03_Ingredients.csv')
    print(f'[extract_xlsx_model] {len(ingredients_rows)} ingredient rows')

    for row in ingredients_rows:
        ing_id      = row.get('ING_ID', '').strip()
        name        = row.get('Ingredient', '').strip()
        category    = row.get('Category', '').strip()
        vendor_raw  = row.get('Primary_Source_Vendor', '').strip()
        region      = row.get('Region_Notes', '').strip()
        unit        = row.get('Default_Unit', '').strip()
        cost_str    = row.get('Known_Cost_Current', '').strip()
        cost_unit   = row.get('Cost_Unit', '').strip()
        channels    = row.get('Channels', '').strip()
        status      = row.get('Status', '').strip()
        notes       = row.get('Notes', '').strip()

        if not name or not ing_id:
            continue

        source_id = f'xlsx_ingredient_{ing_id}'
        if already_processed('extract_xlsx_model', source_id):
            continue

        try:
            cost = float(cost_str) if cost_str else None
        except ValueError:
            cost = None

        if dry_run:
            print(f'[DRY] Ingredient: {name!r} — {category} — vendor={vendor_raw!r} — cost={cost_str!r}/{cost_unit}')
            continue

        ledger_id = write_ledger_event(
            event_type='extraction.xlsx_model',
            source='extract_xlsx_model',
            source_id=source_id,
            payload={
                'ingId': ing_id,
                'name': name,
                'category': category,
                'vendor': vendor_raw,
                'regionNotes': region,
                'defaultUnit': unit,
                'knownCost': cost,
                'costUnit': cost_unit,
                'channels': channels,
                'status': status,
            },
        )

        ing_entity_id, ing_created = find_or_create_entity('Ingredient', name)
        if ing_created:
            ingredients_written += 1
            print(f'  [ingredient] {name} ({category})')

        # Ingredient metadata assertion
        write_assertion(
            src_id=ing_entity_id, dst_id=ing_entity_id,
            rel_type='MENU_SNAPSHOT',
            ledger_event_id=ledger_id,
            confidence=1.0,
            metadata={
                'source': 'xlsx_model',
                'ingId': ing_id,
                'category': category,
                'vendor': vendor_raw,
                'regionNotes': region,
                'defaultUnit': unit,
                'channels': channels,
                'status': status,
                'notes': notes,
            },
            provisional=False,
        )
        assertions_written += 1

        if cost is not None:
            write_assertion(
                src_id=ing_entity_id, dst_id=ing_entity_id,
                rel_type='PRICED_AT',
                ledger_event_id=ledger_id,
                confidence=0.95,
                metadata={
                    'source': 'xlsx_model',
                    'unitCost': cost,
                    'costUnit': cost_unit,
                    'defaultUnit': unit,
                },
                provisional=False,
            )
            assertions_written += 1

        # Create Vendor entities from vendor_raw (may be "A / B" for multiple)
        if vendor_raw and vendor_raw.upper() != 'TBD':
            for vendor_name in [v.strip() for v in vendor_raw.split('/') if v.strip()]:
                if not vendor_name or vendor_name.upper() in ('TBD', 'IN-HOUSE', 'VARIOUS'):
                    continue
                vendor_id, vendor_created = find_or_create_entity('Vendor', vendor_name)
                if vendor_created:
                    vendors_written += 1
                    print(f'  [vendor] {vendor_name}')

                # Vendor SUPPLIES Ingredient (using PAYMENT_SENT as proxy)
                write_assertion(
                    src_id=ing_entity_id, dst_id=vendor_id,
                    rel_type='SUPPLIED_BY',
                    ledger_event_id=ledger_id,
                    confidence=0.9,
                    metadata={
                        'source': 'xlsx_model',
                        'ingredient': name,
                        'regionNotes': region,
                    },
                    provisional=False,
                )
                assertions_written += 1

    # ── Menu Items (SKUs) → Dish entities with pricing ────────────────────────
    sku_rows = _read_csv('05_Menu_Items.csv')
    print(f'[extract_xlsx_model] {len(sku_rows)} menu item SKUs')

    for row in sku_rows:
        sku_id     = row.get('SKU_ID', '').strip()
        name       = row.get('Menu_Item', '').strip()
        channel    = row.get('Channel', '').strip()
        category   = row.get('Category', '').strip()
        price_str  = row.get('List_Price', '').strip()
        active     = row.get('Active', '').strip()
        daypart    = row.get('Daypart', '').strip()
        notes      = row.get('Notes', '').strip()

        if not name or not sku_id:
            continue

        source_id = f'xlsx_sku_{sku_id}'
        if already_processed('extract_xlsx_model', source_id):
            continue

        try:
            price = float(price_str) if price_str else None
        except ValueError:
            price = None

        if dry_run:
            print(f'[DRY] SKU: {name!r} — {channel}/{category} — ${price_str}')
            continue

        ledger_id = write_ledger_event(
            event_type='extraction.xlsx_model',
            source='extract_xlsx_model',
            source_id=source_id,
            payload={
                'skuId': sku_id,
                'name': name,
                'channel': channel,
                'category': category,
                'listPrice': price,
                'active': active,
                'daypart': daypart,
            },
        )

        # Classify as Dish for food items
        food_channels = {'meal prep', 'cafe', 'wholesale', 'catering', 'pizza', 'office lunch', 'delivery'}
        entity_type = 'Dish' if any(k in channel.lower() for k in food_channels) else 'Product'
        entity_id, entity_created = find_or_create_entity(entity_type, name)
        if entity_created:
            dishes_written += 1
            print(f'  [{entity_type}] {name}')

        write_assertion(
            src_id=entity_id, dst_id=entity_id,
            rel_type='MENU_SNAPSHOT',
            ledger_event_id=ledger_id,
            confidence=1.0,
            metadata={
                'source': 'xlsx_model',
                'skuId': sku_id,
                'channel': channel,
                'category': category,
                'daypart': daypart,
                'active': active == 'Y',
                'notes': notes,
            },
            provisional=False,
        )
        assertions_written += 1

        if price is not None and price > 0:
            write_assertion(
                src_id=entity_id, dst_id=entity_id,
                rel_type='PRICED_AT',
                ledger_event_id=ledger_id,
                confidence=1.0,
                metadata={
                    'source': 'xlsx_model',
                    'listPrice': price,
                    'channel': channel,
                },
                provisional=False,
            )
            assertions_written += 1

    # ── Recipe Components → CONTAINS assertions ───────────────────────────────
    comp_rows = _read_csv('06_Recipe_Components.csv')
    print(f'[extract_xlsx_model] {len(comp_rows)} recipe component rows')

    # Build recipe_id → dish_name map from recipes CSV
    recipe_rows = _read_csv('04_Recipes.csv')
    recipe_map = {r['RECIPE_ID']: r['Recipe_Name'] for r in recipe_rows if r.get('RECIPE_ID')}

    # Also build from SKUs (they have RECIPE_ID too)
    for row in sku_rows:
        if row.get('Recipe_ID') and row.get('Menu_Item'):
            recipe_map.setdefault(row['Recipe_ID'], row['Menu_Item'])

    for row in comp_rows:
        recipe_id  = row.get('Recipe_ID', '').strip()
        ing_name   = row.get('Ingredient_Name', '').strip()
        qty        = row.get('Qty_per_Batch', '').strip()
        unit       = row.get('Batch_Unit', '').strip()
        unit_cost  = row.get('Unit_Cost_Current', '').strip()
        notes      = row.get('Notes', '').strip()

        if not recipe_id or not ing_name:
            continue

        dish_name = recipe_map.get(recipe_id, '')
        if not dish_name:
            continue

        source_id = f'xlsx_comp_{recipe_id}_{ing_name[:20].replace(" ", "_")}'
        if already_processed('extract_xlsx_model', source_id):
            continue

        if dry_run:
            print(f'[DRY] Component: {dish_name!r} CONTAINS {ing_name!r} ({qty} {unit})')
            continue

        try:
            qty_val = float(qty) if qty else None
            cost_val = float(unit_cost) if unit_cost else None
        except ValueError:
            qty_val = None
            cost_val = None

        ledger_id = write_ledger_event(
            event_type='extraction.xlsx_model',
            source='extract_xlsx_model',
            source_id=source_id,
            payload={
                'recipeId': recipe_id,
                'dishName': dish_name,
                'ingredientName': ing_name,
                'qty': qty_val,
                'unit': unit,
                'unitCost': cost_val,
            },
        )

        food_channels = {'meal prep', 'cafe', 'wholesale', 'catering', 'pizza', 'office lunch'}
        entity_type = 'Dish'
        dish_id, _ = find_or_create_entity(entity_type, dish_name)
        ing_id, _ = find_or_create_entity('Ingredient', ing_name)

        meta = {
            'source': 'xlsx_model',
            'recipeId': recipe_id,
            'notes': notes,
        }
        if qty_val is not None:
            meta['qty'] = qty_val
            meta['unit'] = unit
        if cost_val is not None:
            meta['unitCost'] = cost_val

        write_assertion(
            src_id=dish_id, dst_id=ing_id,
            rel_type='CONTAINS',
            ledger_event_id=ledger_id,
            confidence=1.0,
            metadata=meta,
            provisional=False,
        )
        assertions_written += 1

    return {
        'ingredients_written': ingredients_written,
        'vendors_written': vendors_written,
        'dishes_written': dishes_written,
        'assertions_written': assertions_written,
        'errors': errors[:20],
    }


if __name__ == '__main__':
    dry_run = '--dry-run' in sys.argv
    result = run(dry_run=dry_run)
    print(json.dumps(result, indent=2, default=str))
