"""
Job: extract_january

Extracts Dish and Ingredient entities from the JanuaryMealsPage meal library,
stored in the Supabase tables meal_recipes and meal_recipe_ingredients.

Each recipe becomes:
  - Dish entity (name, meal type, color, notes)
  - Ingredient entities per ingredient
  - CONTAINS assertions linking Dish → Ingredient
  - Nutrition metadata on Ingredient (from nutrients_per_100g JSONB, sourced from USDA FDC)
  - fdc_id stored in assertion metadata for future USDA enrichment

This is the richest structured food-data source in the codebase —
ingredients have USDA fdcId and full macronutrient data.
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


def _supabase_get(path: str, params: dict | None = None) -> list[dict]:
    """Fetch from Supabase REST API using service role key."""
    base_url = os.environ['SUPABASE_URL']
    key = os.environ['SUPABASE_SERVICE_ROLE_KEY']
    url = f"{base_url}/rest/v1/{path}"
    if params:
        url += '?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={
        'apikey': key,
        'Authorization': f'Bearer {key}',
        'Content-Type': 'application/json',
    })
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

MEAL_TYPE_TO_COURSE = {
    'breakfast': 'appetizer',   # no breakfast course type; closest is appetizer
    'lunch':     'main',
    'dinner':    'main',
    'snacks':    'side',
}

# Key macro nutrients to surface on Ingredient entities
MACRO_KEYS = ['calories', 'protein', 'fat', 'carbs', 'fiber', 'sugar',
              'sodium', 'calcium', 'iron', 'epa_dha', 'omega3']


def run(dry_run: bool = False) -> dict:
    dishes_written = 0
    ingredients_written = 0
    assertions_written = 0
    errors = []

    recipes = _supabase_get('meal_recipes', {
        'select': 'id,meal_type,code,name,color,notes,updated_at',
        'order': 'meal_type,code',
        'limit': '500',
    })

    print(f'[extract_january] {len(recipes)} recipes found')

    for recipe in recipes:
        recipe_id   = recipe['id']
        meal_type   = recipe.get('meal_type', 'dinner')
        code        = recipe.get('code', '')
        dish_name   = recipe.get('name', '').strip()
        color       = recipe.get('color') or ''
        notes       = recipe.get('notes') or ''

        if not dish_name:
            continue

        source_id = f'january_recipe_{recipe_id}'
        if already_processed('extract_january', source_id):
            continue

        ingredients = _supabase_get(
            'meal_recipe_ingredients',
            {
                'select': 'id,name,fdc_id,amount,unit,display_amount,display_unit,nutrients_per_100g,sort_order',
                'recipe_id': f'eq.{recipe_id}',
                'order': 'sort_order',
                'limit': '100',
            },
        )

        if dry_run:
            print(f'[DRY] Recipe: {dish_name!r} ({meal_type}) — {len(ingredients)} ingredients')
            continue

        ledger_id = write_ledger_event(
            event_type='extraction.january',
            source='extract_january',
            source_id=source_id,
            payload={
                'recipeId': str(recipe_id),
                'mealType': meal_type,
                'code': code,
                'name': dish_name,
                'ingredientCount': len(ingredients),
            },
        )

        dish_id, dish_created = find_or_create_entity('Dish', dish_name)
        if dish_created:
            dishes_written += 1
            print(f'  [dish] {dish_name} ({meal_type})')

        # Dish self-assertion with meal plan metadata
        write_assertion(
            src_id=dish_id, dst_id=dish_id,
            rel_type='MENU_SNAPSHOT',
            ledger_event_id=ledger_id,
            confidence=1.0,
            metadata={
                'source': 'january_meal_plan',
                'mealType': meal_type,
                'course': MEAL_TYPE_TO_COURSE.get(meal_type, 'main'),
                'code': code,
                'color': color,
                'notes': notes,
            },
            provisional=False,
        )
        assertions_written += 1

        for ing in ingredients:
            ing_name = (ing.get('name') or '').strip()
            if not ing_name:
                continue

            fdc_id    = ing.get('fdc_id')
            amount    = ing.get('amount') or 0
            unit      = ing.get('unit') or 'g'
            disp_amt  = ing.get('display_amount')
            disp_unit = ing.get('display_unit') or unit
            nutrients = ing.get('nutrients_per_100g') or {}

            ing_id, ing_created = find_or_create_entity('Ingredient', ing_name)
            if ing_created:
                ingredients_written += 1
                print(f'    [ingredient] {ing_name} (fdc_id={fdc_id})')

            # Build CONTAINS assertion metadata
            contains_meta = {
                'source': 'january_meal_plan',
                'amount': amount,
                'unit': unit,
                'displayAmount': disp_amt,
                'displayUnit': disp_unit,
                'mealType': meal_type,
            }
            if fdc_id:
                contains_meta['fdcId'] = fdc_id

            # Include key macros inline for quick graph queries
            if isinstance(nutrients, dict):
                for key in MACRO_KEYS:
                    val = nutrients.get(key)
                    if val is not None:
                        contains_meta[f'nutrient_{key}'] = round(float(val), 3)

            write_assertion(
                src_id=dish_id, dst_id=ing_id,
                rel_type='CONTAINS',
                ledger_event_id=ledger_id,
                confidence=1.0,
                metadata=contains_meta,
                provisional=False,
            )
            assertions_written += 1

            # If we have a USDA fdcId, also write a USDA_VERIFIED assertion on the ingredient
            if fdc_id:
                write_assertion(
                    src_id=ing_id, dst_id=ing_id,
                    rel_type='USDA_VERIFIED',
                    ledger_event_id=ledger_id,
                    confidence=1.0,
                    metadata={
                        'source': 'usda_fdc',
                        'fdcId': fdc_id,
                        'nutrientsPer100g': {
                            k: round(float(v), 3)
                            for k, v in (nutrients.items() if isinstance(nutrients, dict) else [])
                            if v is not None
                        },
                    },
                    provisional=False,
                )
                assertions_written += 1

        dishes_written += (1 if not dish_created else 0)  # count even if entity existed

    return {
        'dishes_written': dishes_written,
        'ingredients_written': ingredients_written,
        'assertions_written': assertions_written,
        'errors': errors[:20],
    }


if __name__ == '__main__':
    dry_run = '--dry-run' in sys.argv
    result = run(dry_run=dry_run)
    print(json.dumps(result, indent=2, default=str))
