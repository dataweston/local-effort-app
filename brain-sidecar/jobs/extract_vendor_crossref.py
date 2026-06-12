"""
Job: extract_vendor_crossref

Builds cross-vendor relationships between Co-op Partners Warehouse (CPW) and
Eastside Food Co-op by:

  1. RECEIPT × TRANSACTION MATCH
     Each Eastside receipt (.eml) is matched against Local Budget transaction
     records by date + amount. Writes a RECONCILED_WITH assertion linking the
     receipt's PAYMENT_SENT event to the matching LB transaction.

  2. CPW × EASTSIDE INGREDIENT MATCH
     For every ingredient that appears in BOTH a CPW PRICED_AT assertion and an
     Eastside PRICED_AT assertion, writes a SOURCED_FROM assertion:
       CPW Ingredient → SOURCED_FROM → Eastside Ingredient
     and a PRICE_COMPARISON note in metadata (wholesale vs retail, margin %).

     Matching is fuzzy: normalised name similarity (token overlap) with a 0.6
     threshold — tunable via MATCH_THRESHOLD env var.

Assertions written:
  - LedgerEvent (extraction.vendor_crossref) per run
  - Ingredient → SOURCED_FROM → Ingredient  (CPW→Eastside name match)
  - Vendor → RECONCILED_WITH → Vendor        (receipt↔transaction match)

Source IDs are deterministic so re-running is idempotent.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import re
import json
import urllib.parse
import urllib.request
from datetime import datetime, timezone, timedelta
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(dotenv_path=Path(__file__).parent.parent.parent / '.env')

from db import query, execute
from ledger import write_ledger_event, write_assertion, find_or_create_entity, already_processed

MATCH_THRESHOLD = float(os.environ.get('MATCH_THRESHOLD', '0.55'))

CPW_VENDOR   = 'Co-op Partners Warehouse'
EASTSIDE_VENDOR = 'Eastside Food Co-op'

# Date window for receipt↔transaction match (days either side)
# Amount matching is not used because LB transactions may aggregate multiple
# eReceipts or differ due to tip/split; we match on date proximity only.
DATE_WINDOW_DAYS = 1


# ── Local Budget API ──────────────────────────────────────────────────────────

def _lb_api_config() -> tuple[str, str]:
    base_url = os.environ.get('LOCAL_BUDGET_API_URL', '').rstrip('/')
    token = os.environ.get('LOCAL_BUDGET_API_TOKEN', '')
    if not base_url or not token:
        raise RuntimeError('LOCAL_BUDGET_API_URL and LOCAL_BUDGET_API_TOKEN are required')
    return base_url, token


def _lb_get(path: str, params: dict | None = None) -> dict:
    base_url, token = _lb_api_config()
    query_string = urllib.parse.urlencode({k: v for k, v in (params or {}).items() if v is not None})
    url = f'{base_url}{path}'
    if query_string:
        url = f'{url}?{query_string}'
    req = urllib.request.Request(
        url,
        headers={'Authorization': f'Bearer {token}', 'Accept': 'application/json'},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode('utf-8', errors='replace')
        raise RuntimeError(f'Local Budget API {exc.code} for {path}: {body[:300]}') from exc


def _parse_api_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value.replace('Z', '+00:00'))


def _lb_transactions(merchant: str, classifications: str = 'INCOME,REIMBURSEMENT,COGS,OPERATING,REIMBURSABLE') -> list[dict]:
    rows: list[dict] = []
    cursor = None
    while True:
        data = _lb_get('/api/integration/v1/transactions', {
            'merchant': merchant,
            'classification': classifications,
            'limit': 2000,
            'cursor': cursor,
        })
        batch = data.get('transactions') or []
        for row in batch:
            row['date'] = _parse_api_datetime(row['date'])
            rows.append(row)
        cursor = data.get('nextCursor')
        if not cursor:
            return rows


# ── Name normalisation ────────────────────────────────────────────────────────

# Strip only unit/packaging noise and vendor codes, keep food words
_STRIP_RE = re.compile(
    r'\b(og|rfgd|rfg|cv|ct|lb|oz|gal|qt|pk|each|ea|for|and|the|with)\b', re.I
)

def _normalize(name: str) -> set[str]:
    """Return a set of meaningful lowercase tokens from an ingredient name."""
    name = _STRIP_RE.sub('', name.lower())
    name = re.sub(r'[^a-z0-9 ]', ' ', name)
    tokens = {t for t in name.split() if len(t) > 2}
    return tokens


def _best_match(name: str, candidates: list, threshold: float):
    """Return (best_candidate, best_score) or (None, 0) if below threshold."""
    best_score = 0.0
    best = None
    for c in candidates:
        score = _similarity(name, c['name'])
        if score > best_score:
            best_score = score
            best = c
    if best_score >= threshold:
        return best, best_score
    return None, 0.0


def _similarity(a: str, b: str) -> float:
    ta, tb = _normalize(a), _normalize(b)
    if not ta or not tb:
        return 0.0
    intersection = ta & tb
    union = ta | tb
    return len(intersection) / len(union)


# ── Phase 1: Receipt × Transaction match ─────────────────────────────────────

def _run_receipt_transaction_match(dry_run: bool, ledger_id: str) -> dict:
    """
    Match each Eastside PAYMENT_SENT assertion (from receipt ingest) against
    Local Budget transaction records by date + amount.
    """
    matches = 0
    no_match = 0

    # Get all Eastside PAYMENT_SENT assertions with their metadata
    # (these are self-referencing: srcId==dstId, store is in metadata)
    receipts = query("""
        SELECT a.id as assertion_id, a.metadata, a."validFrom"
        FROM "BrainAssertion" a
        WHERE a."relType" = 'PAYMENT_SENT'
          AND a."retractedAt" IS NULL
          AND (a.metadata->>'store' = %s OR a.metadata->>'store' ILIKE %s)
    """, (EASTSIDE_VENDOR, '%eastside%'))

    # Fetch all Eastside-matching LB transactions once (business only — exclude PERSONAL)
    lb_txns = _lb_transactions('eastside')

    print(f'  [crossref] {len(receipts)} receipt PAYMENT_SENT assertions, {len(lb_txns)} LB Eastside transactions')

    eastside_entity_id, _ = find_or_create_entity('Vendor', EASTSIDE_VENDOR)

    for r in receipts:
        meta = r['metadata'] if isinstance(r['metadata'], dict) else json.loads(r['metadata'])
        receipt_total = meta.get('totalPaid')
        valid_from = r['validFrom']
        if isinstance(valid_from, str):
            try:
                valid_from = datetime.fromisoformat(valid_from.replace('Z', '+00:00'))
            except Exception:
                valid_from = None

        if receipt_total is None or valid_from is None:
            no_match += 1
            continue

        source_id = f'crossref_receipt_txn_{r["assertion_id"]}'
        if already_processed('extract_vendor_crossref', source_id):
            matches += 1
            continue

        receipt_date = valid_from.date()
        window_start = receipt_date - timedelta(days=DATE_WINDOW_DAYS)
        window_end   = receipt_date + timedelta(days=DATE_WINDOW_DAYS)

        # Find candidate LB transactions within date window
        candidates = [
            t for t in lb_txns
            if window_start <= t['date'].date() <= window_end
        ]

        if not candidates:
            no_match += 1
            continue

        # Pick the transaction whose amount is closest to the receipt total
        best = min(candidates, key=lambda t: abs(float(t['amount']) - float(receipt_total)))

        if dry_run:
            print(f'    [DRY] receipt ${receipt_total} on {receipt_date} -> LB txn ${best["amount"]} on {best["date"].date()} ({best["merchantName"]})')
            matches += 1
            continue

        write_ledger_event(
            event_type='extraction.vendor_crossref',
            source='extract_vendor_crossref',
            source_id=source_id,
            payload={
                'type': 'receipt_transaction_match',
                'receiptAssertionId': r['assertion_id'],
                'lbTransactionId': best['id'],
                'receiptTotal': receipt_total,
                'lbAmount': float(best['amount']),
                'receiptDate': str(receipt_date),
                'lbDate': str(best['date'].date()),
                'merchantName': best['merchantName'],
            },
        )

        # RECONCILED_WITH: Eastside vendor entity → itself, metadata carries both IDs
        write_assertion(
            src_id=eastside_entity_id,
            dst_id=eastside_entity_id,
            rel_type='RECONCILED_WITH',
            ledger_event_id=ledger_id,
            confidence=0.95,
            metadata={
                'type': 'receipt_transaction_match',
                'receiptAssertionId': r['assertion_id'],
                'lbTransactionId': best['id'],
                'receiptTotal': receipt_total,
                'lbAmount': float(best['amount']),
                'receiptDate': str(receipt_date),
                'lbDate': str(best['date'].date()),
            },
            provisional=False,
        )
        matches += 1

    return {'receipt_matches': matches, 'receipt_no_match': no_match}


# ── Phase 2: CPW × Eastside ingredient name matching ─────────────────────────

def _run_ingredient_crossref(dry_run: bool, ledger_id: str) -> dict:
    """
    Fuzzy-match ingredient names between CPW and Eastside price lists.
    Writes SOURCED_FROM assertions with wholesale vs retail price comparison.
    """
    matched = 0
    skipped = 0

    # Load all CPW priced ingredients
    cpw_rows = query("""
        SELECT e.id, e.name, a.metadata, a."validFrom"
        FROM "BrainEntity" e
        JOIN "BrainAssertion" a ON a."srcId" = e.id
        JOIN "BrainEntity" v ON v.id = a."dstId"
        WHERE e."entityType" = 'Ingredient'
          AND a."relType" = 'PRICED_AT'
          AND v.name = %s
          AND a."retractedAt" IS NULL
    """, (CPW_VENDOR,))

    # Load all Eastside priced ingredients
    eastside_rows = query("""
        SELECT e.id, e.name, a.metadata, a."validFrom"
        FROM "BrainEntity" e
        JOIN "BrainAssertion" a ON a."srcId" = e.id
        WHERE e."entityType" = 'Ingredient'
          AND a."relType" = 'PRICED_AT'
          AND a."srcId" = a."dstId"
          AND a."retractedAt" IS NULL
          AND (a.metadata->>'store' = %s OR a.metadata->>'store' ILIKE %s)
    """, (EASTSIDE_VENDOR, '%eastside%'))

    print(f'  [crossref] {len(cpw_rows)} CPW ingredients, {len(eastside_rows)} Eastside ingredients')

    for cpw in cpw_rows:
        best_eastside, best_score = _best_match(cpw['name'], eastside_rows, MATCH_THRESHOLD)

        if best_eastside is None:
            skipped += 1
            continue

        source_id = f'crossref_ing_{cpw["id"]}_{best_eastside["id"]}'
        if already_processed('extract_vendor_crossref', source_id):
            matched += 1
            continue

        cpw_meta  = cpw['metadata']  if isinstance(cpw['metadata'],  dict) else json.loads(cpw['metadata'])
        es_meta   = best_eastside['metadata'] if isinstance(best_eastside['metadata'], dict) else json.loads(best_eastside['metadata'])

        wholesale = cpw_meta.get('perUnitPrice')
        retail    = es_meta.get('unitPrice')
        markup_pct = None
        if wholesale and retail and float(wholesale) > 0:
            markup_pct = round((float(retail) - float(wholesale)) / float(wholesale) * 100, 1)

        if dry_run:
            print(f'    [DRY] CPW:{cpw["name"][:30]:30s} ~ Eastside:{best_eastside["name"][:30]:30s}  score={best_score:.2f}  wholesale=${wholesale} retail=${retail} markup={markup_pct}%')
            matched += 1
            continue

        write_ledger_event(
            event_type='extraction.vendor_crossref',
            source='extract_vendor_crossref',
            source_id=source_id,
            payload={
                'type': 'ingredient_match',
                'cpwIngredient': cpw['name'],
                'eastsideIngredient': best_eastside['name'],
                'similarityScore': best_score,
                'wholesalePerUnit': wholesale,
                'retailUnit': retail,
                'markupPct': markup_pct,
            },
        )

        write_assertion(
            src_id=cpw['id'],
            dst_id=best_eastside['id'],
            rel_type='SOURCED_FROM',
            ledger_event_id=ledger_id,
            confidence=best_score,
            metadata={
                'matchType': 'name_similarity',
                'similarityScore': round(best_score, 3),
                'cpwName': cpw['name'],
                'eastsideName': best_eastside['name'],
                'cpwWholesalePerUnit': wholesale,
                'cpwCasePrice': cpw_meta.get('casePrice'),
                'cpwCountSize': cpw_meta.get('countSize'),
                'cpwOrganic': cpw_meta.get('organic', False),
                'eastsideRetailUnit': retail,
                'eastsideDepartment': es_meta.get('department'),
                'markupPct': markup_pct,
            },
            provisional=(best_score < 0.75),
        )
        matched += 1

    return {'ingredient_matches': matched, 'ingredient_no_match': skipped}


# ── Phase 3: LB transaction history summary for both vendors ─────────────────

def _run_lb_spend_summary(dry_run: bool, ledger_id: str) -> dict:
    """
    Summarise total spend per vendor from Local Budget and write
    SPEND_SUMMARY assertions so the brain knows the financial relationship.
    """
    written = 0

    vendor_queries = [
        (EASTSIDE_VENDOR,  "%eastside%"),
        (CPW_VENDOR,       "%partners warehouse%"),
    ]

    for vendor_name, pattern in vendor_queries:
        source_id = f'crossref_lb_spend_{vendor_name.lower().replace(" ","_")}_2026'
        if already_processed('extract_vendor_crossref', source_id):
            written += 1
            continue

        rows = _lb_transactions(pattern.strip('%'))
        if not rows:
            continue

        total_spend = sum(abs(float(row['amount'])) for row in rows)
        first_txn = min(row['date'] for row in rows)
        last_txn = max(row['date'] for row in rows)
        avg_txn = total_spend / len(rows)
        if dry_run:
            print(f'    [DRY] {vendor_name}: {len(rows)} txns ${total_spend} avg=${avg_txn:.2f}')
            written += 1
            continue

        vendor_id, _ = find_or_create_entity('Vendor', vendor_name)

        write_ledger_event(
            event_type='extraction.vendor_crossref',
            source='extract_vendor_crossref',
            source_id=source_id,
            payload={
                'type': 'lb_spend_summary',
                'vendor': vendor_name,
                'txnCount': len(rows),
                'totalSpend': total_spend,
                'firstTxn': str(first_txn),
                'lastTxn': str(last_txn),
                'avgTxn': avg_txn,
            },
        )

        write_assertion(
            src_id=vendor_id,
            dst_id=vendor_id,
            rel_type='SPEND_HISTORY',
            ledger_event_id=ledger_id,
            confidence=1.0,
            metadata={
                'source': 'local_budget',
                'txnCount': len(rows),
                'totalSpendUsd': total_spend,
                'avgTxnUsd': avg_txn,
                'firstTxn': str(first_txn.date()),
                'lastTxn': str(last_txn.date()),
            },
            provisional=False,
        )
        written += 1

    return {'spend_summaries': written}


# ── Entry point ───────────────────────────────────────────────────────────────

def run(dry_run: bool = False) -> dict:
    print(f'[extract_vendor_crossref] threshold={MATCH_THRESHOLD}  dry_run={dry_run}')

    # One top-level ledger event for this run
    ledger_id = write_ledger_event(
        event_type='extraction.vendor_crossref',
        source='extract_vendor_crossref',
        source_id=f'crossref_run_{datetime.now(timezone.utc).strftime("%Y%m%d")}',
        payload={'threshold': MATCH_THRESHOLD},
    ) if not dry_run else 'dry-run'

    print('[extract_vendor_crossref] phase 1: receipt x transaction match')
    r1 = _run_receipt_transaction_match(dry_run, ledger_id)

    print('[extract_vendor_crossref] phase 2: CPW x Eastside ingredient match')
    r2 = _run_ingredient_crossref(dry_run, ledger_id)

    print('[extract_vendor_crossref] phase 3: LB spend summary')
    r3 = _run_lb_spend_summary(dry_run, ledger_id)

    return {**r1, **r2, **r3}


if __name__ == '__main__':
    import json as _json
    dry_run = '--dry-run' in sys.argv
    result = run(dry_run=dry_run)
    print(_json.dumps(result, indent=2, default=str))
