"""
Job: extract_static

Extracts Dish, Menu, and Ingredient entities from static JS/JSON data files:
  - src/data/sampleMenus.js   — 11 catering menus with dishes, notes, dietary tags
  - src/data/testimonials.js  — customer testimonials with event context
  - src/data/pricingFaq.json  — service pricing tiers as Note assertions

No LLM needed — data is already structured. Ingredient names are parsed from
dish notes using a simple comma-split heuristic (good enough for this data).

Dietary tag map: v=vegetarian, gf=gluten_free, vg=vegan
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import re
import json
from pathlib import Path
from datetime import datetime, timezone

from db import query
from ledger import write_ledger_event, write_assertion, find_or_create_entity

DIETARY_MAP = {
    'v':   'vegetarian',
    'vg':  'vegan',
    'gf':  'gluten_free',
    'df':  'dairy_free',
    'nf':  'nut_free',
}

COURSE_MAP = {
    'start':        'appetizer',
    'stationary':   'appetizer',
    'passed apps':  'appetizer',
    'passed':       'appetizer',
    'appetizer':    'appetizer',
    'soup':         'soup',
    'salad':        'salad',
    'main':         'main',
    'mains':        'main',
    'dessert':      'dessert',
    'desserts':     'dessert',
    'beverage':     'beverage',
    'menu':         'main',
}

NOISE_INGREDIENTS = {
    'with', 'and', 'or', 'in', 'on', 'over', 'served', 'a', 'the',
    'fresh', 'local', 'house', 'seasonal', 'crispy', 'roasted', 'grilled',
    'drizzled', 'filled', 'including', 'mix', 'of', 'from', 'for', 'to',
    'ex', 'style', 'finished', 'based', 'availability', 'tossed',
    'mountains', 'skewers', 'sample',
}


def _parse_ingredients(note: str) -> list[str]:
    """Split a dish note into candidate ingredient names."""
    if not note or not note.strip():
        return []
    # Remove parenthetical asides
    note = re.sub(r'\([^)]*\)', '', note)
    # Split on commas and 'and'
    parts = re.split(r',|\band\b', note, flags=re.I)
    results = []
    for p in parts:
        p = p.strip().strip('"\'').strip()
        # Remove leading/trailing prep words
        p = re.sub(r'^(with|in|on|over|served|of|from|a|the|fresh|local|house)\s+', '', p, flags=re.I)
        words = p.lower().split()
        if not words:
            continue
        # Skip if all words are noise
        if all(w in NOISE_INGREDIENTS for w in words):
            continue
        # Skip very short or very long fragments
        if len(p) < 3 or len(p) > 40:
            continue
        # Skip if starts with a number
        if words[0][0].isdigit():
            continue
        results.append(p)
    return results


def _course_normalize(course_str: str) -> str:
    key = course_str.lower().strip()
    for k, v in COURSE_MAP.items():
        if k in key:
            return v
    return 'unknown'


def _parse_sample_menus() -> list[dict]:
    """
    Parse sampleMenus.js. Uses json5 if available, otherwise applies
    careful regex substitutions to produce valid JSON.
    """
    path = Path(__file__).parent.parent.parent / 'src' / 'data' / 'sampleMenus.js'
    src = path.read_text(encoding='utf-8')

    # Try json5 first (pip install json5)
    try:
        import json5
        src = re.sub(r'^export const sampleMenus\s*=\s*', '', src.strip()).rstrip(';')
        return json5.loads(src)
    except ImportError:
        pass

    # Manual conversion: strip export wrapper
    src = re.sub(r'^export const sampleMenus\s*=\s*', '', src.strip()).rstrip(';').strip()

    # 1. Escape backslashes that aren't already escape sequences
    # 2. Convert single-quoted strings to double-quoted (handle escaped apostrophes)
    # Use a tokenizer approach: replace 'string' literals carefully
    def single_to_double(m):
        inner = m.group(1)
        # Unescape \' and escape any bare "
        inner = inner.replace("\\'", "'").replace('"', '\\"')
        return f'"{inner}"'

    src = re.sub(r"'((?:[^'\\]|\\.)*)'", single_to_double, src)

    # 3. Remove trailing commas before } or ]
    src = re.sub(r',(\s*[}\]])', r'\1', src)

    # 4. Quote unquoted object keys — only match keys not already preceded by "
    #    Use negative lookbehind for " to avoid double-quoting
    src = re.sub(r'(?<!")(?<!\w)([a-zA-Z_][a-zA-Z0-9_]*)(\s*):', r'"\1"\2:', src)

    return json.loads(src)


def run(dry_run: bool = False) -> dict:
    if already_processed_static():
        print('[extract_static] already processed, skipping')
        return {'menus': 0, 'dishes': 0, 'ingredients': 0, 'skipped': True}

    menus_written = 0
    dishes_written = 0
    ingredients_written = 0
    errors = []

    # ── sampleMenus.js ────────────────────────────────────────────────────────
    try:
        menus = _parse_sample_menus()
    except Exception as e:
        errors.append(f'sampleMenus parse error: {e}')
        menus = []

    for menu_data in menus:
        menu_title = menu_data.get('title', f'Menu {menu_data.get("id")}')
        menu_desc  = menu_data.get('description', '')
        sections   = menu_data.get('sections', [])

        if dry_run:
            dish_names = [i['name'] for s in sections for i in s.get('items', [])]
            print(f'[DRY] Menu: {menu_title!r} — {len(dish_names)} dishes')
            continue

        # Write ledger event for this menu
        ledger_id = write_ledger_event(
            event_type='extraction.static',
            source='extract_static',
            source_id=f'sample_menu_{menu_data["id"]}',
            payload={
                'title': menu_title,
                'description': menu_desc,
                'source_file': 'src/data/sampleMenus.js',
            },
        )

        menu_id, menu_created = find_or_create_entity('Menu', menu_title)
        if menu_created:
            menus_written += 1
            print(f'  [menu] {menu_title}')

        # Menu self-assertion
        write_assertion(
            src_id=menu_id, dst_id=menu_id,
            rel_type='MENU_SNAPSHOT',
            ledger_event_id=ledger_id,
            confidence=1.0,
            metadata={
                'source': 'sampleMenus.js',
                'description': menu_desc,
                'menuType': 'catering',
            },
            provisional=False,
        )

        for section in sections:
            course_raw = section.get('course', 'unknown')
            course     = _course_normalize(course_raw)
            items      = section.get('items', [])

            for item in items:
                dish_name = item.get('name', '').strip()
                if not dish_name:
                    continue

                note     = item.get('note', '') or ''
                dietary  = item.get('dietary', []) or []
                image_id = item.get('imagePublicId', '')

                dish_id, dish_created = find_or_create_entity('Dish', dish_name)
                if dish_created:
                    dishes_written += 1
                    print(f'    [dish] {dish_name}')

                dietary_tags = [DIETARY_MAP[d] for d in dietary if d in DIETARY_MAP]

                dish_meta = {
                    'source': 'sampleMenus.js',
                    'course': course,
                    'courseRaw': course_raw,
                    'dietaryTags': dietary_tags,
                    'note': note,
                }
                if image_id:
                    dish_meta['imagePublicId'] = image_id

                # Dish APPEARS_ON Menu
                write_assertion(
                    src_id=dish_id, dst_id=menu_id,
                    rel_type='APPEARS_ON',
                    ledger_event_id=ledger_id,
                    confidence=1.0,
                    metadata=dish_meta,
                    provisional=False,
                )

                # Dish CONTAINS Ingredients (parsed from note)
                for ing_name in _parse_ingredients(note):
                    try:
                        ing_id, ing_created = find_or_create_entity('Ingredient', ing_name)
                        if ing_created:
                            ingredients_written += 1
                            print(f'      [ingredient] {ing_name}')
                        write_assertion(
                            src_id=dish_id, dst_id=ing_id,
                            rel_type='CONTAINS',
                            ledger_event_id=ledger_id,
                            confidence=0.85,
                            metadata={'source': 'sampleMenus.js', 'parsedFromNote': True},
                            provisional=False,
                        )
                    except Exception as e:
                        errors.append(f'ingredient {ing_name!r}: {e}')

    # ── testimonials.js ───────────────────────────────────────────────────────
    if not dry_run:
        _extract_testimonials(errors)

    # ── pricingFaq.json ───────────────────────────────────────────────────────
    if not dry_run:
        _extract_pricing(errors)

    return {
        'menus': menus_written,
        'dishes': dishes_written,
        'ingredients': ingredients_written,
        'errors': errors[:20],
    }


def _extract_testimonials(errors: list) -> int:
    path = Path(__file__).parent.parent.parent / 'src' / 'data' / 'testimonials.js'
    src = path.read_text(encoding='utf-8')

    # Simple regex extraction
    quotes   = re.findall(r"quote:\s*'([^']*)'", src)
    authors  = re.findall(r"author:\s*'([^']*)'", src)
    contexts = re.findall(r"context:\s*'([^']*)'", src)

    written = 0
    for i, (quote, author, context) in enumerate(zip(quotes, authors, contexts)):
        ledger_id = write_ledger_event(
            event_type='extraction.static',
            source='extract_static',
            source_id=f'testimonial_{i}',
            payload={'quote': quote, 'author': author, 'context': context,
                     'source_file': 'src/data/testimonials.js'},
        )
        # Customer entity from author name
        customer_id, created = find_or_create_entity('Customer', author)
        if created:
            written += 1
            print(f'  [customer] {author}')

        write_assertion(
            src_id=customer_id, dst_id=customer_id,
            rel_type='GAVE_FEEDBACK',
            ledger_event_id=ledger_id,
            confidence=1.0,
            metadata={
                'source': 'testimonials.js',
                'quote': quote,
                'eventContext': context,
            },
            provisional=False,
        )
    return written


def _extract_pricing(errors: list) -> None:
    path = Path(__file__).parent.parent.parent / 'src' / 'data' / 'pricingFaq.json'
    items = json.loads(path.read_text(encoding='utf-8'))
    ledger_id = write_ledger_event(
        event_type='extraction.static',
        source='extract_static',
        source_id='pricing_faq',
        payload={'source_file': 'src/data/pricingFaq.json', 'items': len(items)},
    )
    # Store each FAQ as a Note entity
    for item in items:
        note_name = item.get('name', '')[:80]
        note_id, _ = find_or_create_entity('Note', f'Pricing: {note_name}')
        write_assertion(
            src_id=note_id, dst_id=note_id,
            rel_type='ABOUT',
            ledger_event_id=ledger_id,
            confidence=1.0,
            metadata={
                'source': 'pricingFaq.json',
                'question': item.get('name', ''),
                'answer': item.get('answer', ''),
                'category': 'pricing',
            },
            provisional=False,
        )


def already_processed_static() -> bool:
    from db import query
    rows = query(
        'SELECT id FROM "LedgerEvent" WHERE source = %s AND "sourceId" = %s LIMIT 1',
        ('extract_static', 'sample_menu_1'),
    )
    return len(rows) > 0


if __name__ == '__main__':
    dry_run = '--dry-run' in sys.argv
    result = run(dry_run=dry_run)
    print(json.dumps(result, indent=2, default=str))
