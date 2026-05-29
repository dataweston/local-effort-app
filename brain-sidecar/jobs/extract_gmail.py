"""
Job: extract_gmail

Re-extracts all email.thread ledger events using the v2 extractor:
- Full email body fetch via Gmail API
- Context-aware prompts with known entity list
- Parallel extraction (8 workers)
- Writes vendor signals, customer signals, menu/dish entities
- Ignores SaaS receipts, marketing, irrelevant senders

Run:
  python run.py gmail                   # process unextracted threads
  python run.py gmail --reextract       # wipe extraction.email events and redo all
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import json
from datetime import datetime, timezone

from db import query, execute
from ledger import write_ledger_event, write_assertion, find_or_create_entity
from extractor import (
    extract_threads_parallel,
    should_ignore,
    invalidate_entity_cache,
    MODEL,
    _is_plausible_dish_name,
    _clean_ingredient_names,
    _looks_like_food_noise,
)
from models import EmailThreadExtraction, VendorSignal, CustomerSignal, MenuExtraction, StrategicSignal

REEXTRACT = '--reextract' in sys.argv
SNIPPET_ONLY = '--snippet-only' in sys.argv

# Signal type → assertion rel type
VENDOR_SIGNAL_TO_REL = {
    'order_placed':         'ORDERED',
    'order_confirmed':      'ORDERED',
    'invoice_received':     'INVOICED',
    'invoice_overdue':      'INVOICED',
    'price_quote':          'PRICED_AT',
    'delivery_confirmed':   'DELIVERED',
    'delivery_failed':      'DELIVERED',
    'payment_sent':         'PAYMENT_SENT',
    'payment_received':     'PAYMENT_RECEIVED',
    'payment_overdue':      'PAYMENT_RECEIVED',
    'contract_signed':      'CONTRACTED',
    'relationship_started': 'RELATED_TO',
    'relationship_ended':   'RELATED_TO',
}


def _temporal_to_dt(temporal) -> datetime | None:
    if not temporal or not temporal.iso_date:
        return None
    try:
        return datetime.fromisoformat(temporal.iso_date).replace(tzinfo=timezone.utc)
    except Exception:
        return None


def write_vendor_signal(
    signal: VendorSignal,
    extraction_event_id: str,
    thread_id: str,
    occurred_at: datetime,
) -> int:
    """Write one VendorSignal as a BrainAssertion. Returns 1 if written."""
    rel_type = VENDOR_SIGNAL_TO_REL.get(signal.signal_type, 'RELATED_TO')

    vendor_id, vendor_created = find_or_create_entity('Vendor', signal.vendor_name)
    if vendor_created:
        print(f'    [new vendor] {signal.vendor_name}')
        invalidate_entity_cache()

    # For PRICED_AT / DELIVERED / INVOICED, dst is the ingredient or vendor itself
    dst_id = vendor_id
    if signal.line_items:
        for item in signal.line_items:
            if item.ingredient_name:
                ing_id, ing_created = find_or_create_entity('Ingredient', item.ingredient_name)
                if ing_created:
                    print(f'    [new ingredient] {item.ingredient_name}')
                dst_id = ing_id
                break

    metadata = {
        'signalType': signal.signal_type,
        'direction': signal.direction,
        'source': 'gmail',
        'threadId': thread_id,
        'rationale': signal.rationale,
    }
    if signal.invoice_number:
        metadata['invoiceNumber'] = signal.invoice_number
    if signal.order_number:
        metadata['orderNumber'] = signal.order_number
    if signal.amount:
        metadata['amountDollars'] = signal.amount.dollars
        metadata['amountRaw'] = signal.amount.raw_text
    if signal.amount_outstanding:
        metadata['amountOutstandingDollars'] = signal.amount_outstanding.dollars
    if signal.due_date:
        metadata['dueDateRaw'] = signal.due_date.raw_text
        if signal.due_date.iso_date:
            metadata['dueDateIso'] = signal.due_date.iso_date
    if signal.delivery_date:
        metadata['deliveryDateRaw'] = signal.delivery_date.raw_text
    if signal.contact:
        metadata['contact'] = {k: v for k, v in signal.contact.model_dump().items() if v}
    if signal.line_items:
        metadata['lineItems'] = [
            {k: v for k, v in item.model_dump().items() if v is not None}
            for item in signal.line_items
        ]
    if signal.notes:
        metadata['notes'] = signal.notes
    if signal.source_span:
        metadata['sourceSpan'] = signal.source_span[:500]

    valid_from = _temporal_to_dt(signal.date) or occurred_at

    write_assertion(
        src_id=vendor_id,
        dst_id=dst_id,
        rel_type=rel_type,
        ledger_event_id=extraction_event_id,
        confidence=signal.confidence,
        metadata=metadata,
        valid_from=valid_from,
        provisional=True,
    )
    return 1


def write_customer_signal(
    signal: CustomerSignal,
    extraction_event_id: str,
    thread_id: str,
    occurred_at: datetime,
) -> int:
    """Write one CustomerSignal as a BrainAssertion."""
    name = signal.customer_name or signal.customer_email or 'Unknown Customer'
    customer_id, created = find_or_create_entity('Customer', name)
    if created:
        print(f'    [new customer] {name}')
        invalidate_entity_cache()

    rel_map = {
        'inquiry': 'INQUIRED',
        'order_placed': 'ORDERED',
        'order_confirmed': 'ORDERED',
        'payment_received': 'PAYMENT_RECEIVED',
        'refund_requested': 'REFUND_REQUESTED',
        'feedback_given': 'GAVE_FEEDBACK',
        'cancellation': 'CANCELLED',
    }
    rel_type = rel_map.get(signal.signal_type, 'RELATED_TO')

    metadata = {
        'signalType': signal.signal_type,
        'source': 'gmail',
        'threadId': thread_id,
        'rationale': signal.rationale,
    }
    if signal.customer_email:
        metadata['email'] = signal.customer_email
    if signal.guest_count:
        metadata['guestCount'] = signal.guest_count
    if signal.event_type:
        metadata['eventType'] = signal.event_type
    if signal.amount:
        metadata['amountDollars'] = signal.amount.dollars
    if signal.event_date:
        metadata['eventDateRaw'] = signal.event_date.raw_text
        if signal.event_date.iso_date:
            metadata['eventDateIso'] = signal.event_date.iso_date
    if signal.notes:
        metadata['notes'] = signal.notes
    if signal.source_span:
        metadata['sourceSpan'] = signal.source_span[:500]

    valid_from = _temporal_to_dt(signal.event_date) or occurred_at

    write_assertion(
        src_id=customer_id,
        dst_id=customer_id,
        rel_type=rel_type,
        ledger_event_id=extraction_event_id,
        confidence=signal.confidence,
        metadata=metadata,
        valid_from=valid_from,
        provisional=True,
    )
    return 1


def write_strategic_signal(
    signal: StrategicSignal,
    extraction_event_id: str,
    thread_id: str,
    occurred_at: datetime,
) -> int:
    """Write one StrategicSignal as a BrainAssertion. Returns 1 if written, 0 if skipped."""
    if not signal.src_name or not signal.dst_name:
        return 0

    src_id, src_created = find_or_create_entity(signal.src_type, signal.src_name)
    if src_created:
        print(f'    [new {signal.src_type}] {signal.src_name}')
        invalidate_entity_cache()

    dst_id, dst_created = find_or_create_entity(signal.dst_type, signal.dst_name)
    if dst_created:
        print(f'    [new {signal.dst_type}] {signal.dst_name}')
        invalidate_entity_cache()

    metadata = {
        'source': 'gmail',
        'threadId': thread_id,
        'rationale': signal.rationale,
    }
    if signal.source_span:
        metadata['sourceSpan'] = signal.source_span[:500]

    write_assertion(
        src_id=src_id,
        dst_id=dst_id,
        rel_type=signal.rel_type,
        ledger_event_id=extraction_event_id,
        confidence=signal.confidence,
        metadata=metadata,
        valid_from=occurred_at,
        provisional=True,
    )
    return 1


def write_menu(
    menu: MenuExtraction,
    extraction_event_id: str,
    thread_id: str,
    occurred_at: datetime,
    subject: str,
) -> int:
    """Write a MenuExtraction as a Menu entity with Dish children."""
    menu_name = (menu.menu_name or '').strip()
    if not menu_name or _looks_like_food_noise(menu_name):
        menu_name = f'Menu from {subject[:60]}'

    plausible_dishes = [d for d in menu.dishes if _is_plausible_dish_name(d.name)]
    if not plausible_dishes and not menu.menu_name:
        return 0

    menu_id, menu_created = find_or_create_entity('Menu', menu_name)
    if menu_created:
        print(f'    [new menu] {menu_name} ({len(menu.dishes)} dishes)')
        invalidate_entity_cache()

    # Store menu metadata as an assertion on itself
    metadata = {
        'source': 'gmail',
        'threadId': thread_id,
        'menuType': menu.menu_type,
        'confidence': menu.confidence,
    }
    if menu.serves:
        metadata['serves'] = menu.serves
    if menu.valid_date:
        metadata['validDateRaw'] = menu.valid_date.raw_text
        if menu.valid_date.iso_date:
            metadata['validDateIso'] = menu.valid_date.iso_date
    if menu.price_per_person:
        metadata['pricePerPersonDollars'] = menu.price_per_person.dollars
    if menu.total_price:
        metadata['totalPriceDollars'] = menu.total_price.dollars
    if menu.notes:
        metadata['notes'] = menu.notes
    if menu.source_span:
        metadata['sourceSpan'] = menu.source_span[:1000]

    write_assertion(
        src_id=menu_id,
        dst_id=menu_id,
        rel_type='MENU_SNAPSHOT',
        ledger_event_id=extraction_event_id,
        confidence=menu.confidence,
        metadata=metadata,
        valid_from=_temporal_to_dt(menu.valid_date) or occurred_at,
        provisional=True,
    )

    # Write each dish as a Dish entity linked to this menu
    for dish in plausible_dishes:
        dish_id, dish_created = find_or_create_entity('Dish', dish.name)
        if dish_created:
            print(f'      [new dish] {dish.name}')
            invalidate_entity_cache()

        dish_meta = {
            'source': 'gmail',
            'threadId': thread_id,
            'course': dish.course,
            'confidence': dish.confidence,
        }
        if dish.description:
            dish_meta['description'] = dish.description
        clean_ingredients = _clean_ingredient_names(dish.ingredients_mentioned)
        if clean_ingredients:
            dish_meta['ingredientsMentioned'] = clean_ingredients
        if dish.dietary_tags:
            dish_meta['dietaryTags'] = [
                {'tag': t.tag, 'inferred': t.inferred} for t in dish.dietary_tags
            ]
        if dish.price:
            dish_meta['priceDollars'] = dish.price.dollars
        if dish.portion_size:
            dish_meta['portionSize'] = dish.portion_size
        if dish.source_span:
            dish_meta['sourceSpan'] = dish.source_span[:300]

        # Dish appears on this menu
        write_assertion(
            src_id=dish_id,
            dst_id=menu_id,
            rel_type='APPEARS_ON',
            ledger_event_id=extraction_event_id,
            confidence=dish.confidence,
            metadata=dish_meta,
            valid_from=_temporal_to_dt(menu.valid_date) or occurred_at,
            provisional=True,
        )

        # Dish→Ingredient relationships
        for ing_name in clean_ingredients:
            ing_id, ing_created = find_or_create_entity('Ingredient', ing_name)
            if ing_created:
                invalidate_entity_cache()
            write_assertion(
                src_id=dish_id,
                dst_id=ing_id,
                rel_type='CONTAINS',
                ledger_event_id=extraction_event_id,
                confidence=dish.confidence * 0.9,
                metadata={'source': 'gmail', 'threadId': thread_id},
                valid_from=occurred_at,
                provisional=True,
            )

    return 1


def retract_existing_provisional_food_assertions(dry_run: bool = False) -> int:
    """Retract prior provisional Dish/Ingredient/Menu assertions from Gmail extraction runs."""
    rows = query(
        """
        SELECT a.id
        FROM "BrainAssertion" a
        LEFT JOIN "BrainEntity" s ON s.id = a."srcId"
        LEFT JOIN "BrainEntity" d ON d.id = a."dstId"
        LEFT JOIN "LedgerEvent" le ON le.id = a."sourceId"
        WHERE a.provisional = true
          AND a."retractedAt" IS NULL
          AND (
            s."entityType" IN ('Dish','Ingredient','Menu')
            OR d."entityType" IN ('Dish','Ingredient','Menu')
          )
          AND (
            a."sourceType" = 'python_extractor'
            OR a."createdBy" = 'python_extractor'
            OR le."eventType" = 'extraction.email'
          )
        """
    )
    ids = [r['id'] for r in rows]
    if not ids:
        return 0

    if dry_run:
        print(f'[extract_gmail] dry-run: would retract {len(ids)} provisional food assertions')
        return len(ids)

    updated = 0
    chunk_size = 500
    for i in range(0, len(ids), chunk_size):
        chunk = ids[i:i + chunk_size]
        execute(
            """
            UPDATE "BrainAssertion"
            SET "retractedAt" = NOW(),
                "retractedBy" = 'python_extractor:reextract',
                "retractedReason" = 'gmail_food_reextract_reset'
            WHERE id = ANY(%s)
            """,
            (chunk,),
        )
        updated += len(chunk)

    return updated


FETCH_ALL_SQL = """
    SELECT le.id, le."sourceId", le.payload, le."occurredAt"
    FROM "LedgerEvent" le
    WHERE le."eventType" = 'email.thread'
      AND le."tombstonedAt" IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM "LedgerEvent" le2
        WHERE le2."eventType" = 'extraction.email'
          AND le2."sourceId" = le."sourceId"
      )
    ORDER BY le."occurredAt" DESC
    LIMIT %s
"""


def _process_batch(rows, dry_run, max_workers, snippet_only=False):
    """
    Extract one batch of threads, write results, return counters.

    DB connection is explicitly released before LLM calls so that the
    minutes-long extraction phase doesn't hold an idle connection open.
    Postgres will kill connections idle for too long (server-side timeout),
    which caused the 'server closed connection unexpectedly' failures.
    """
    import db as _db
    processed = skipped = ignored = assertions_written = menus_found = 0
    errors = []

    # Phase 1: LLM extraction — no DB connection held during this.
    # Release any open connection before starting the slow work.
    if _db._conn is not None:
        try:
            _db._conn.close()
        except Exception:
            pass
        _db._conn = None

    results = extract_threads_parallel(
        rows,
        max_workers=max_workers,
        fetch_bodies=not snippet_only,
        dry_run=dry_run,
    )
    # DB connection will be re-established lazily on first write below.

    for row, extraction, error in results:
        payload = row['payload']
        thread_id = payload.get('threadId') or row.get('sourceId', '')
        subject = payload.get('subject', '')
        occurred_at = row.get('occurredAt') or datetime.now(timezone.utc)
        if isinstance(occurred_at, str):
            try:
                occurred_at = datetime.fromisoformat(occurred_at.replace('Z', '+00:00'))
            except Exception:
                occurred_at = datetime.now(timezone.utc)

        if error:
            if error.startswith('ignored:'):
                ignored += 1
                if not dry_run:
                    write_ledger_event(
                        event_type='extraction.email',
                        source='python_extractor',
                        source_id=thread_id,
                        payload={'threadId': thread_id, 'signals': 0,
                                 'summary': error, 'model': MODEL if not dry_run else 'dry_run'},
                    )
            elif error == 'dry_run':
                pass
            else:
                errors.append(f'{thread_id}: {error}')
            continue

        if extraction is None:
            skipped += 1
            continue

        if not extraction.is_relevant:
            skipped += 1
            if not dry_run:
                write_ledger_event(
                    event_type='extraction.email',
                    source='python_extractor',
                    source_id=thread_id,
                    payload={
                        'threadId': thread_id,
                        'signals': 0,
                        'category': extraction.category,
                        'summary': extraction.summary,
                        'model': MODEL,
                    },
                )
            continue

        if dry_run:
            n_vendor = len(extraction.vendor_signals)
            n_customer = len(extraction.customer_signals)
            n_menus = len(extraction.menus)
            n_strategic = len(extraction.strategic_signals)
            print(f'  [{extraction.category}] {subject[:50]} '
                  f'→ {n_vendor}v {n_customer}c {n_menus}m {n_strategic}s '
                  f'conf={extraction.extraction_confidence:.2f}')
            processed += 1
            continue

        try:
            total_signals = (len(extraction.vendor_signals) +
                             len(extraction.customer_signals) +
                             len(extraction.menus) +
                             len(extraction.strategic_signals))

            extraction_event_id = write_ledger_event(
                event_type='extraction.email',
                source='python_extractor',
                source_id=thread_id,
                payload={
                    'threadId': thread_id,
                    'signals': total_signals,
                    'category': extraction.category,
                    'direction': extraction.direction,
                    'summary': extraction.summary,
                    'vendorSignals': len(extraction.vendor_signals),
                    'customerSignals': len(extraction.customer_signals),
                    'menus': len(extraction.menus),
                    'strategicSignals': len(extraction.strategic_signals),
                    'needsHumanReview': extraction.needs_human_review,
                    'reviewReason': extraction.review_reason,
                    'model': MODEL,
                },
            )

            for signal in extraction.vendor_signals:
                try:
                    assertions_written += write_vendor_signal(
                        signal, extraction_event_id, thread_id, occurred_at
                    )
                except Exception as e:
                    errors.append(f'{thread_id} vendor signal: {e}')

            for signal in extraction.customer_signals:
                try:
                    assertions_written += write_customer_signal(
                        signal, extraction_event_id, thread_id, occurred_at
                    )
                except Exception as e:
                    errors.append(f'{thread_id} customer signal: {e}')

            for menu in extraction.menus:
                try:
                    menus_found += write_menu(
                        menu, extraction_event_id, thread_id, occurred_at, subject
                    )
                except Exception as e:
                    errors.append(f'{thread_id} menu: {e}')

            for signal in extraction.strategic_signals:
                try:
                    assertions_written += write_strategic_signal(
                        signal, extraction_event_id, thread_id, occurred_at
                    )
                except Exception as e:
                    errors.append(f'{thread_id} strategic signal: {e}')

            processed += 1

        except Exception as e:
            errors.append(f'{thread_id}: {e}')

    return processed, skipped, ignored, assertions_written, menus_found, errors


def run(
    limit: int = 2000,
    batch_size: int = 75,
    dry_run: bool = False,
    max_workers: int = 4,
    snippet_only: bool = False,
) -> dict:
    if REEXTRACT:
        reset_count = retract_existing_provisional_food_assertions(dry_run=dry_run)
        if reset_count:
            print(f'[extract_gmail] retracted {reset_count} provisional food assertions before re-extract')
        print('[extract_gmail] --reextract: deleting existing extraction.email events...')
        if not dry_run:
            execute('DELETE FROM "LedgerEvent" WHERE "eventType" = \'extraction.email\'')

    # Fetch all unextracted rows upfront in one query, then slice into batches.
    # This avoids the re-query-at-offset-0 pattern which causes an infinite loop
    # when threads never leave the unextracted set (dry-run, errors, or skipped).
    all_rows = query(FETCH_ALL_SQL, (limit,))
    if not all_rows:
        print('[extract_gmail] nothing to extract')
        return {'processed': 0, 'skipped': 0, 'ignored': 0,
                'assertions_written': 0, 'menus_found': 0, 'errors': []}

    total = len(all_rows)
    n_batches = (total + batch_size - 1) // batch_size
    mode = 'snippet-only' if snippet_only else 'full-body'
    print(
        f'[extract_gmail] {total} threads to extract in {n_batches} batches of {batch_size} '
        f'({max_workers} workers, mode={mode})...'
    )

    processed = skipped = ignored = assertions_written = menus_found = 0
    all_errors = []

    for batch_num, offset in enumerate(range(0, total, batch_size), start=1):
        rows = all_rows[offset:offset + batch_size]
        print(f'\n[extract_gmail] batch {batch_num}/{n_batches}: {len(rows)} threads')

        p, s, i, a, m, errs = _process_batch(
            rows,
            dry_run,
            max_workers,
            snippet_only=snippet_only,
        )
        processed += p
        skipped += s
        ignored += i
        assertions_written += a
        menus_found += m
        all_errors.extend(errs)

        print(f'[extract_gmail] batch {batch_num} done: '
              f'+{p} processed, +{s} skipped, +{i} ignored, +{a} assertions, +{m} menus')

    print(f'\n[extract_gmail] complete: {processed} processed, {skipped} skipped, '
          f'{ignored} ignored, {assertions_written} assertions, {menus_found} menus')

    return {
        'processed': processed,
        'skipped': skipped,
        'ignored': ignored,
        'assertions_written': assertions_written,
        'menus_found': menus_found,
        'errors': all_errors[:20],
    }


if __name__ == '__main__':
    import json
    dry_run = '--dry-run' in sys.argv
    snippet_only = '--snippet-only' in sys.argv
    result = run(dry_run=dry_run, snippet_only=snippet_only)
    print(json.dumps(result, indent=2))
