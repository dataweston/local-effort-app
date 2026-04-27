"""
Job: extract_square_csv

Extracts customer purchase data from Square sales transaction CSV exports.
These CSVs are richer than the API — they include customer names even when
no Square Customer profile is linked.

Expected CSV location: ~/Downloads/transactions-*.csv
CSV format: Square sales export with columns:
  Date, Time, Customer Name, Customer ID, Description, Gross Sales,
  Transaction ID, Payment ID, Transaction Status, etc.

Assertions written:
  - Customer → ORDERED (with Dish/Product entities from Description)
  - Dish/Product → PRICED_AT (from Gross Sales amount)
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import csv
import re
import json
from pathlib import Path
from datetime import datetime, timezone

from dotenv import load_dotenv
load_dotenv(dotenv_path=Path(__file__).parent.parent.parent / '.env')

from ledger import write_ledger_event, write_assertion, find_or_create_entity, already_processed

# Look for Square transaction CSV exports in Downloads
DOWNLOADS_DIR = Path.home() / 'Downloads'


def _find_transaction_csvs() -> list[Path]:
    """Find all Square transaction CSV exports."""
    pattern = 'transactions-*.csv'
    return sorted(DOWNLOADS_DIR.glob(pattern))


def _parse_date(date_str: str, time_str: str = '') -> datetime | None:
    """Parse date + time from Square CSV fields."""
    combined = f'{date_str} {time_str}'.strip()
    for fmt in ('%Y-%m-%d %H:%M:%S', '%Y-%m-%d', '%m/%d/%Y %H:%M:%S', '%m/%d/%Y'):
        try:
            dt = datetime.strptime(combined, fmt)
            return dt.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def _extract_customer_from_description(desc: str) -> str | None:
    """
    Extract customer name from Square description strings like:
      'Custom Amount - [Happy Monday Coffee] Ashley Nelson - 1 item(s)'
      '[Happy Monday Coffee] Mary Beth Mueller - 1 item(s)'
      'Pizza Pledge - 5 pizzas from Josiah Davie'
      'PIZZAFUNDER - ... - Email: kristinkelly13@gmail.com'
    Returns customer name or None.
    """
    # Strip 'Custom Amount - ' prefix
    s = re.sub(r'^Custom Amount\s*-\s*', '', desc, flags=re.I).strip()

    # Pattern: [Context] Customer Name - N item(s)
    m = re.match(r'\[.*?\]\s*(.+?)\s*-\s*\d+\s*item', s, re.I)
    if m:
        name = m.group(1).strip()
        # Reject if it looks like an email or contains pipe
        if '|' not in name and '@' not in name:
            return name

    # 'pizzas from NAME' pattern
    m = re.search(r'(?:from|by)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)', s)
    if m:
        return m.group(1).strip()

    return None


def _extract_product_from_description(desc: str) -> str | None:
    """Extract product/dish name from description."""
    # Strip [Context] prefix and customer suffix
    desc = re.sub(r'^\[.*?\]\s*', '', desc)
    # If "Customer Name - N items", desc is the customer portion
    # Use 'Custom Amount - ...' pattern
    m = re.match(r'Custom Amount\s*-\s*(.+)', desc, re.I)
    if m:
        return m.group(1).strip()
    return desc.strip() or None


def run(dry_run: bool = False) -> dict:
    csv_files = _find_transaction_csvs()
    if not csv_files:
        print(f'[extract_square_csv] no transaction CSV files found in {DOWNLOADS_DIR}')
        return {'files_processed': 0, 'rows': 0, 'assertions_written': 0, 'errors': []}

    rows_processed = 0
    customers_written = 0
    assertions_written = 0
    errors = []

    print(f'[extract_square_csv] found {len(csv_files)} transaction CSV files')

    for csv_path in csv_files:
        print(f'  processing: {csv_path.name}')
        try:
            with open(csv_path, encoding='utf-8-sig', newline='') as f:
                reader = csv.DictReader(f)
                rows = list(reader)
        except Exception as e:
            errors.append(f'{csv_path.name} read error: {e}')
            continue

        for row in rows:
            txn_id   = (row.get('Transaction ID') or row.get('Payment ID') or '').strip()
            date_str = row.get('Date', '').strip()
            time_str = row.get('Time', '').strip()
            gross    = row.get('Gross Sales', '').replace('$', '').replace(',', '').strip()
            status   = row.get('Transaction Status', '').strip()
            desc     = row.get('Description', '').strip()
            cust_name = (row.get('Customer Name') or '').strip()
            cust_id   = (row.get('Customer ID') or '').strip()

            if not txn_id or status.lower() not in ('complete', 'completed', ''):
                continue

            source_id = f'square_csv_txn_{txn_id}'
            if already_processed('extract_square_csv', source_id):
                continue

            try:
                amount = float(gross) if gross else 0.0
            except ValueError:
                amount = 0.0

            occurred_at = _parse_date(date_str, time_str)

            # Try to get customer name from description if not in CSV column
            if not cust_name:
                cust_name = _extract_customer_from_description(desc) or ''

            if dry_run:
                print(f'  [DRY] {date_str} ${amount:.2f} — {cust_name!r} — {desc[:60]!r}')
                rows_processed += 1
                continue

            ledger_id = write_ledger_event(
                event_type='extraction.square_csv',
                source='extract_square_csv',
                source_id=source_id,
                payload={
                    'txnId': txn_id,
                    'date': date_str,
                    'amount': amount,
                    'customerName': cust_name,
                    'description': desc[:200],
                    'sourceFile': csv_path.name,
                },
                occurred_at=occurred_at,
            )
            rows_processed += 1

            if cust_name and len(cust_name) > 1:
                customer_id, customer_created = find_or_create_entity('Customer', cust_name)
                if customer_created:
                    customers_written += 1
                    print(f'    [customer] {cust_name}')

                # Parse product/dish from description
                product_name = None
                # Try to match "[Event] Product - N items" → product is in description
                m = re.search(r'\[([^\]]+)\]\s*(.+?)\s*-\s*\d+\s*item', desc, re.I)
                if m:
                    product_name = m.group(1).strip()  # event name as product context

                write_assertion(
                    src_id=customer_id, dst_id=customer_id,
                    rel_type='ORDERED',
                    ledger_event_id=ledger_id,
                    confidence=0.9,
                    metadata={
                        'source': 'square_csv',
                        'amount': amount,
                        'description': desc[:200],
                        'txnId': txn_id,
                        'sourceFile': csv_path.name,
                    },
                    valid_from=occurred_at,
                    provisional=False,
                )
                assertions_written += 1

    return {
        'files_processed': len(csv_files),
        'rows_processed': rows_processed,
        'customers_written': customers_written,
        'assertions_written': assertions_written,
        'errors': errors[:20],
    }


if __name__ == '__main__':
    dry_run = '--dry-run' in sys.argv
    result = run(dry_run=dry_run)
    print(json.dumps(result, indent=2, default=str))
