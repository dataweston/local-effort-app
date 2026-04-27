"""
Job: extract_receipts

Extracts Ingredient/Vendor purchase data from Eastside Food Co-op eReceipt
emails (.eml files). Parses the HTML body (MIME multipart) to extract
line items: item name, retail price, department/category, and any per-item
discount applied.

EML files go in:
  ~/Downloads/attachmentsm/*.eml   (auto-detected)
  brain-sidecar/data/receipts/*.eml (fallback)

Receipt HTML format (Eastside Coop):
  Each <td> row is one receipt line in Courier New font.
  Category headers: <td style="font-weight: bold;">Frozen</td>
  Item lines: "10004    ICE 5LB BAG    $2.49  S"
  Discount lines (after item): "20% Employee    $-3.70" / "Discount"
  Date line: "1/30/25    3:00 PM    Receipt #: 217957"

Assertions written:
  - Ingredient → PRICED_AT   (retail price; discount recorded in metadata but NOT deducted)
  - Vendor     → PAYMENT_SENT (total paid to Eastside Coop)

Per-item discounts are captured in PRICED_AT metadata as 'memberDiscountApplied'
and 'memberDiscountAmount' for COGS history but do not reduce the stored unitPrice.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import re
import json
import email
import email.policy
import email.utils
from html.parser import HTMLParser
from pathlib import Path
from datetime import datetime, timezone

from dotenv import load_dotenv
load_dotenv(dotenv_path=Path(__file__).parent.parent.parent / '.env')

from ledger import write_ledger_event, write_assertion, find_or_create_entity, bulk_already_processed

EML_DIRS = [
    Path(__file__).parent.parent / 'data' / 'receipts',
]

STORE_NAME = 'Eastside Food Co-op'

# Lines to skip unconditionally (totals, store metadata, payment methods)
SKIP_RE = re.compile(
    r'(?:subtotal|^total|tax|balance|change due|savings|'
    r'thank you|receipt #|clerk:|terminal:|store:|www\.|\.coop|'
    r'minneapolis|central ave|612-|'
    r'house charge|amount:|credit card|debit card|cash|'
    r'wic\s+ebt|e\s+wic|^\s*-+\s*$)',
    re.I
)

# Discount line: negative dollar amount (per-item member/employee discount)
DISCOUNT_LINE_RE = re.compile(r'^.+[$](-\d+\.\d{2})\s*$')
DISCOUNT_LABEL_RE = re.compile(r'(?:discount|employee|member|\d+%)', re.I)

# Item line: optional barcode + name + positive price + optional tax flag
ITEM_RE = re.compile(r'^(?:\d{5,13}\s+)?(.+?)\s{2,}[$](\d+\.\d{2})\s*[A-Z]?\s*$')

# Quantity sub-line: "2 @ $3.99" — continuation, not a new item
QTY_RE = re.compile(r'^\d+\s*@\s*\$\d+\.\d{2}')


class _TdExtractor(HTMLParser):
    """Extracts (text, is_bold) from each <td> row."""
    def __init__(self):
        super().__init__()
        self.rows = []
        self._in_td = False
        self._bold = False
        self._buf = []

    def handle_starttag(self, tag, attrs):
        if tag == 'td':
            self._in_td = True
            self._buf = []
            self._bold = False
            attr_dict = dict(attrs)
            style = attr_dict.get('style', '')
            if 'font-weight: bold' in style or 'font-weight:bold' in style:
                self._bold = True
        elif tag in ('b', 'strong') and self._in_td:
            self._bold = True

    def handle_endtag(self, tag):
        if tag == 'td':
            text = ''.join(self._buf).replace('\xa0', ' ').strip()
            if text:
                self.rows.append((text, self._bold))
            self._in_td = False
            self._buf = []

    def handle_data(self, data):
        if self._in_td:
            self._buf.append(data)

    def handle_entityref(self, name):
        if self._in_td and name == 'nbsp':
            self._buf.append(' ')


def _decode_eml(path: Path):
    """Parse .eml and return (html_body, date)."""
    raw = path.read_bytes()
    msg = email.message_from_bytes(raw, policy=email.policy.compat32)

    date_str = msg.get('Date', '')
    occurred_at = None
    try:
        occurred_at = email.utils.parsedate_to_datetime(date_str).astimezone(timezone.utc)
    except Exception:
        pass

    html_body = ''
    for part in msg.walk():
        if part.get_content_type() == 'text/html':
            payload = part.get_payload(decode=True)
            if payload:
                html_body = payload.decode('utf-8', errors='replace')
            break
    return html_body, occurred_at


def _parse_receipt_html(html: str):
    """
    Returns list of (item_name, retail_price, category, discount_amount) tuples.
    discount_amount is 0.0 if no per-item discount was found.
    Retail price is NEVER adjusted — discount is metadata only.
    """
    parser = _TdExtractor()
    parser.feed(html)

    items = []
    current_category = ''
    pending_item = None  # (name, price, category) awaiting possible discount lines

    def flush_pending():
        if pending_item:
            name, price, cat, disc = pending_item
            # Strip trailing bulk marker '#' and stray weight words
            name = re.sub(r'\s*#\s*$', '', name).strip()
            name = re.sub(r'\s+Manual\s*$', '', name).strip()
            items.append((name, price, cat, disc))

    for text, is_bold in parser.rows:
        # Category header (bold td with no price)
        if is_bold:
            flush_pending()
            pending_item = None
            if not re.search(r'\$', text):
                current_category = text.strip()
            continue

        if SKIP_RE.search(text):
            flush_pending()
            pending_item = None
            continue

        if re.match(r'\d{1,2}/\d{2}/\d{2}\s+\d+:\d+', text):
            flush_pending()
            pending_item = None
            continue

        if QTY_RE.match(text):
            continue

        # Discount continuation after an item
        if pending_item and DISCOUNT_LINE_RE.match(text) and DISCOUNT_LABEL_RE.search(text):
            dm = DISCOUNT_LINE_RE.match(text)
            discount_amount = abs(float(dm.group(1)))
            name, price, cat, _ = pending_item
            pending_item = (name, price, cat, discount_amount)
            continue

        # Discount label continuation (e.g. "Discount" on its own line)
        if pending_item and DISCOUNT_LABEL_RE.match(text) and not re.search(r'\$', text):
            continue

        # Item line with price
        m = ITEM_RE.match(text)
        if m:
            flush_pending()
            raw_name = re.sub(r'^\d{1,13}\s+', '', m.group(1)).strip()
            # Strip trailing bulk marker '#' and any inline TARE suffix
            raw_name = re.sub(r'#?\s*TARE:[^\s]+(?:\s+lb)?(?:\s+Manual)?', '', raw_name).strip()
            raw_name = re.sub(r'\s*#\s*$', '', raw_name).strip()
            price = float(m.group(2))
            if price > 0 and len(raw_name) >= 2 and not DISCOUNT_LABEL_RE.match(raw_name):
                pending_item = (raw_name, price, current_category, 0.0)
            else:
                pending_item = None
            continue

        # Continuation of item name (no price, not a skip line)
        if pending_item and len(text) > 1 and not re.search(r'\$', text):
            # Skip weight/tare metadata lines from bulk items
            if re.match(r'TARE:\S+', text) or re.match(r'\d+\s*@\s*\$', text):
                pass
            else:
                name, price, cat, disc = pending_item
                pending_item = (f'{name} {text}'.strip(), price, cat, disc)
        else:
            flush_pending()
            pending_item = None

    flush_pending()
    return items


def _find_eml_files():
    """Returns list of (eml_path, source_id) tuples across all attachment folders."""
    results = []
    seen_ids = set()

    # Scan ~/Downloads/attachments*, ~/Downloads/attachmentsm, and EML_DIRS
    downloads = Path.home() / 'Downloads'
    scan_dirs = list(downloads.glob('attachments*')) + list(downloads.glob('attachmentsm')) + EML_DIRS

    for d in scan_dirs:
        if not d.exists():
            continue
        folder_key = re.sub(r'[^a-z0-9]', '_', d.name.lower()).strip('_')
        for path in sorted(d.glob('*.eml')):
            source_id = f'eml_{folder_key}_{path.stem}'
            if source_id not in seen_ids:
                seen_ids.add(source_id)
                results.append((path, source_id))

    return results


def run(dry_run: bool = False) -> dict:
    eml_files = _find_eml_files()
    if not eml_files:
        print(f'[extract_receipts] no .eml files found')
        return {'receipts_processed': 0, 'ingredients_written': 0, 'assertions_written': 0}

    print(f'[extract_receipts] {len(eml_files)} receipt emails found')

    receipts_processed = 0
    ingredients_written = 0
    assertions_written = 0
    errors = []

    # Single bulk DB check — collect new-format and legacy old-format ids together
    all_source_ids = [sid for _, sid in eml_files] + [f'eml_{p.stem}' for p, _ in eml_files]
    done = bulk_already_processed('extract_receipts', all_source_ids)

    for eml_path, source_id in eml_files:
        if source_id in done or f'eml_{eml_path.stem}' in done:
            continue

        try:
            html_body, occurred_at = _decode_eml(eml_path)
            items = _parse_receipt_html(html_body)
        except Exception as e:
            errors.append(f'{eml_path.name}: {e}')
            continue

        if dry_run:
            date_s = occurred_at.strftime('%Y-%m-%d') if occurred_at else '?'
            print(f'  [DRY] {eml_path.name} — {date_s} — {len(items)} items')
            for name, price, cat, disc in items[:8]:
                disc_s = f' (disc -${disc:.2f})' if disc else ''
                print(f'    ${price:.2f}{disc_s}  [{cat}]  {name!r}')
            if len(items) > 8:
                print(f'    ... +{len(items)-8} more')
            receipts_processed += 1
            continue

        if not items:
            print(f'  [skip] {eml_path.name} — no parseable items')
            continue

        total = sum(p for _, p, _, _ in items)

        ledger_id = write_ledger_event(
            event_type='extraction.receipts',
            source='extract_receipts',
            source_id=source_id,
            payload={
                'file': eml_path.name,
                'store': STORE_NAME,
                'itemCount': len(items),
                'total': round(total, 2),
            },
            occurred_at=occurred_at,
        )

        vendor_id, vendor_created = find_or_create_entity('Vendor', STORE_NAME)
        if vendor_created:
            print(f'  [vendor] {STORE_NAME}')

        write_assertion(
            src_id=vendor_id, dst_id=vendor_id,
            rel_type='PAYMENT_SENT',
            ledger_event_id=ledger_id,
            confidence=1.0,
            metadata={
                'source': 'eastside_receipt',
                'store': STORE_NAME,
                'totalPaid': round(total, 2),
                'file': eml_path.name,
            },
            valid_from=occurred_at,
            provisional=False,
        )
        assertions_written += 1

        for item_name, price, category, discount in items:
            ing_id, ing_created = find_or_create_entity('Ingredient', item_name)
            if ing_created:
                ingredients_written += 1
                print(f'    [ingredient] {item_name} (${price:.2f})')

            meta = {
                'source': 'eastside_receipt',
                'store': STORE_NAME,
                'unitPrice': price,
                'department': category,
                'file': eml_path.name,
            }
            if discount:
                meta['memberDiscountApplied'] = True
                meta['memberDiscountAmount'] = round(discount, 2)

            write_assertion(
                src_id=ing_id, dst_id=ing_id,
                rel_type='PRICED_AT',
                ledger_event_id=ledger_id,
                confidence=0.95,
                metadata=meta,
                valid_from=occurred_at,
                provisional=False,
            )
            assertions_written += 1

        receipts_processed += 1
        date_s = occurred_at.strftime('%Y-%m-%d') if occurred_at else '?'
        print(f'  [receipt] {eml_path.name} — {date_s} — {len(items)} items — ${total:.2f}')

    return {
        'receipts_processed': receipts_processed,
        'ingredients_written': ingredients_written,
        'assertions_written': assertions_written,
        'errors': errors[:20],
    }


if __name__ == '__main__':
    dry_run = '--dry-run' in sys.argv
    result = run(dry_run=dry_run)
    print(json.dumps(result, indent=2, default=str))
