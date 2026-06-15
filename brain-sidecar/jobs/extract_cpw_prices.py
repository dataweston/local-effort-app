"""
Job: extract_cpw_prices

Imports wholesale produce/grocery pricing from a CPW (Co-op Partners Warehouse)
weekly price list CSV. Prices are per-case (wholesale). This job derives a
per-unit price from COUNT/SIZE and stores both for COGS estimation.

Purpose: fallback pricing — when a recipe references "lemon" or "eggs," the
PRICED_AT assertion here gives an estimated ingredient cost based on CPW wholesale
rates. This is NOT point-of-sale retail pricing; apply a margin multiplier for
retail estimation.

CSV format (CPW_Price_List_*.csv):
  C, CAT, UPC, PRO #, Description, Mark/variety, origin, BRAND, COUNT/SIZE, PRICE,
  CHANGE, PRE BOOK, EXPECTED, STATUS

  CAT examples: OG FRUIT, OG VEG, CV DAIRY, OG FROZEN, OG GROCERY, PACKAGING
  COUNT/SIZE examples: "60 CT", "40 LB", "12/6 OZ", "3/.5 OZ", "10/5 LB"

Assertions written:
  - PriceReference → PRICED_AT (casePrice + perUnitPrice where derivable)
  - Vendor         → PAYMENT_SENT (not written — this is a price list, not a receipt)

Note: items are stored as the PriceReference entity type, NOT Ingredient. This is a
broad wholesale pricing resource for pro-forma / COGS estimation; we do not build
recipes from it, so it is kept out of the Ingredient list.

Notes:
  - Ingredient names are normalised: "APPLES OG COSMIC CRISP" → "Apples Cosmic Crisp"
  - The 'OG' in CAT = organic; stored in metadata as 'organic: true'
  - perUnitPrice is derived where COUNT/SIZE has a simple CT or LB count
  - source_id is based on the CSV filename so re-running on a new weekly CSV adds
    new assertions without duplicating old ones
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import re
import csv
import json
from pathlib import Path
from datetime import datetime, timezone

from dotenv import load_dotenv
load_dotenv(dotenv_path=Path(__file__).parent.parent.parent / '.env')

from ledger import write_ledger_event, write_assertion, find_or_create_entity, already_processed

CPW_GLOB = 'CPW_Price_List_*.csv'
DOWNLOADS = Path.home() / 'Downloads'
VENDOR_NAME = 'Co-op Partners Warehouse'


def _normalize_name(description: str, variety: str) -> str:
    """
    Turn 'APPLES OG', 'COSMIC CRISP BAGGED' → 'Apples Cosmic Crisp Bagged'.
    Strip 'OG' prefix from Description since organic status is in metadata.
    """
    desc = re.sub(r'\bOG\b', '', description).strip()
    parts = [p.strip() for p in [desc, variety] if p.strip()]
    name = ' '.join(parts)
    name = re.sub(r'\s+', ' ', name).strip()
    return name.title()


def _parse_count_size(count_size: str):
    """
    Parse COUNT/SIZE string into (units_per_case, unit_size_str).
    Returns (None, count_size) if unparseable.

    Examples:
      '60 CT'    → (60, 'CT')
      '40 LB'    → (40, 'LB')
      '12/6 OZ'  → (12, '6 OZ')
      '3/.5 OZ'  → (3, '0.5 OZ')
      '10/5 LB'  → (10, '5 LB')
      '24 CT'    → (24, 'CT')
    """
    if not count_size:
        return None, count_size

    # Format: N/X UNIT (e.g. "12/6 OZ", "3/.5 OZ", "10/5 LB")
    m = re.match(r'^(\d+)/(\d*\.?\d+)\s*([A-Z]+)', count_size.strip())
    if m:
        units = int(m.group(1))
        unit_size = f'{float(m.group(2))} {m.group(3)}'
        return units, unit_size

    # Format: N UNIT (e.g. "60 CT", "40 LB", "25 LB", "11 LB")
    m = re.match(r'^(\d+(?:\.\d+)?)\s*([A-Z]+)', count_size.strip())
    if m:
        num = float(m.group(1))
        unit = m.group(2)
        return num if num == int(num) else num, unit

    # Format: N-M CT (e.g. "72-88 CT", "100-113 CT")
    m = re.match(r'^(\d+)-(\d+)\s*CT', count_size.strip())
    if m:
        avg = (int(m.group(1)) + int(m.group(2))) / 2
        return avg, 'CT'

    return None, count_size


def _find_csv_files():
    files = list(DOWNLOADS.glob(CPW_GLOB))
    return sorted(files)


def run(dry_run: bool = False) -> dict:
    csv_files = _find_csv_files()
    if not csv_files:
        print(f'[extract_cpw_prices] no CPW_Price_List_*.csv found in {DOWNLOADS}')
        return {'files_processed': 0, 'ingredients_written': 0, 'assertions_written': 0}

    print(f'[extract_cpw_prices] {len(csv_files)} price list CSV(s) found')

    files_processed = 0
    ingredients_written = 0
    assertions_written = 0
    errors = []

    for csv_path in csv_files:
        source_id = f'cpw_{csv_path.stem}'
        if already_processed('extract_cpw_prices', source_id):
            print(f'  [skip] {csv_path.name} — already processed')
            continue

        try:
            with open(csv_path, newline='', encoding='utf-8-sig') as f:
                rows = list(csv.DictReader(f))
        except Exception as e:
            errors.append(f'{csv_path.name}: {e}')
            continue

        valid_rows = [r for r in rows if r.get('PRICE') and r.get('Description')]
        print(f'  {csv_path.name}: {len(valid_rows)} priced items')

        if dry_run:
            for r in valid_rows[:10]:
                name = _normalize_name(r['Description'], r.get('Mark/variety', ''))
                units, unit_size = _parse_count_size(r.get('COUNT/SIZE', ''))
                case_price = float(r['PRICE'])
                per_unit = round(case_price / units, 4) if units else None
                organic = r.get('CAT', '').startswith('OG')
                print(f'    {"OG" if organic else "CV"}  {name!r:50s}  '
                      f'{r.get("COUNT/SIZE",""):15s}  '
                      f'case=${case_price:.2f}'
                      + (f'  unit=${per_unit:.3f}' if per_unit else ''))
            if len(valid_rows) > 10:
                print(f'    ... +{len(valid_rows)-10} more')
            files_processed += 1
            continue

        # Extract date from filename if present (CPW_Price_List_4-20_to_4-26_HZ-f.csv)
        occurred_at = None
        dm = re.search(r'(\d{1,2}-\d{1,2})', csv_path.stem)
        if dm:
            year = datetime.now().year
            try:
                occurred_at = datetime.strptime(f'{year}-{dm.group(1)}', '%Y-%m-%d').replace(
                    tzinfo=timezone.utc)
            except Exception:
                pass
        if not occurred_at:
            occurred_at = datetime.now(timezone.utc)

        ledger_id = write_ledger_event(
            event_type='extraction.cpw_prices',
            source='extract_cpw_prices',
            source_id=source_id,
            payload={
                'file': csv_path.name,
                'vendor': VENDOR_NAME,
                'rowCount': len(valid_rows),
            },
            occurred_at=occurred_at,
        )

        vendor_id, vendor_created = find_or_create_entity('Vendor', VENDOR_NAME)
        if vendor_created:
            print(f'  [vendor] {VENDOR_NAME}')

        for r in valid_rows:
            try:
                name = _normalize_name(r['Description'], r.get('Mark/variety', ''))
                if not name or len(name) < 2:
                    continue

                case_price = float(r['PRICE'])
                count_size = r.get('COUNT/SIZE', '')
                units, unit_size = _parse_count_size(count_size)
                organic = r.get('CAT', '').startswith('OG')
                category = r.get('CAT', '').replace('OG ', '').replace('CV ', '').strip()

                per_unit_price = round(case_price / units, 4) if units else None

                # CPW items are a broad wholesale pricing resource for pro-forma /
                # COGS estimation — NOT recipe ingredients. Store them as the
                # distinct PriceReference type so they don't clutter the Ingredient
                # list or get pulled into recipe building.
                ing_id, ing_created = find_or_create_entity('PriceReference', name)
                if ing_created:
                    ingredients_written += 1
                    print(f'    [price-reference] {name}')

                meta = {
                    'source': 'cpw_price_list',
                    'vendor': VENDOR_NAME,
                    'casePrice': case_price,
                    'countSize': count_size,
                    'department': category,
                    'organic': organic,
                    'file': csv_path.name,
                }
                if per_unit_price is not None:
                    meta['perUnitPrice'] = per_unit_price
                    meta['unitSize'] = str(unit_size)
                if r.get('origin'):
                    meta['origin'] = r['origin']

                write_assertion(
                    src_id=ing_id, dst_id=vendor_id,
                    rel_type='PRICED_AT',
                    ledger_event_id=ledger_id,
                    confidence=0.85,
                    metadata=meta,
                    valid_from=occurred_at,
                    provisional=False,
                )
                assertions_written += 1

            except Exception as e:
                errors.append(f'{csv_path.name} row {r.get("Description","?")}: {e}')

        files_processed += 1
        print(f'  [cpw] {csv_path.name} — {len(valid_rows)} items — '
              f'{ingredients_written} new ingredients')

    return {
        'files_processed': files_processed,
        'ingredients_written': ingredients_written,
        'assertions_written': assertions_written,
        'errors': errors[:20],
    }


if __name__ == '__main__':
    import sys
    dry_run = '--dry-run' in sys.argv
    result = run(dry_run=dry_run)
    print(json.dumps(result, indent=2, default=str))
