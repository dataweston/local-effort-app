"""
Job: extract_gmail
Pulls pending email.thread ledger events, runs Instructor extraction,
writes BrainAssertions for vendor signals found.

Run: python -m jobs.extract_gmail
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from db import query
from ledger import (
    write_ledger_event, write_assertion,
    find_or_create_entity, already_processed,
)
from extractor import extract_email_signals


SIGNAL_TO_REL = {
    'order_placed':        'ORDERED',
    'invoice_received':    'ORDERED',
    'price_quote':         'PRICED_AT',
    'delivery_confirmed':  'ORDERED',
    'payment_due':         'PAYMENT_RECEIVED',
}


def run(limit: int = 50, dry_run: bool = False) -> dict:
    processed = 0
    skipped = 0
    assertions_written = 0
    errors = []

    # Pull recent email.thread events that haven't been extracted yet
    rows = query(
        """
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
        """,
        (limit,),
    )

    for row in rows:
        payload = row['payload']
        thread_id = payload.get('threadId') or row['sourceId']
        subject = payload.get('subject', '')
        from_addr = payload.get('from', '')
        snippet = payload.get('snippet', '')

        try:
            result = extract_email_signals(subject, from_addr, snippet)

            if not result.is_relevant or not result.signals:
                skipped += 1
                if not dry_run:
                    # Mark as processed (no signals) so we don't re-run
                    write_ledger_event(
                        event_type='extraction.email',
                        source='python_extractor',
                        source_id=thread_id,
                        payload={'threadId': thread_id, 'signals': 0, 'summary': result.summary},
                    )
                continue

            if dry_run:
                print(f'[DRY] {subject[:60]} → {len(result.signals)} signals')
                for s in result.signals:
                    print(f'  {s.signal_type}: {s.vendor_name} conf={s.confidence:.2f}')
                processed += 1
                continue

            # Write extraction ledger event
            extraction_event_id = write_ledger_event(
                event_type='extraction.email',
                source='python_extractor',
                source_id=thread_id,
                payload={
                    'threadId': thread_id,
                    'signals': len(result.signals),
                    'summary': result.summary,
                    'model': 'claude-haiku',
                },
            )

            for signal in result.signals:
                try:
                    vendor_id, created = find_or_create_entity('Vendor', signal.vendor_name)
                    rel_type = SIGNAL_TO_REL.get(signal.signal_type, 'ORDERED')

                    metadata = {
                        'signalType': signal.signal_type,
                        'itemDescription': signal.item_description,
                        'dateMentioned': signal.date_mentioned,
                        'rationale': signal.rationale,
                        'source': 'gmail',
                        'threadId': thread_id,
                    }
                    if signal.amount_dollars:
                        metadata['amountDollars'] = signal.amount_dollars

                    # For PRICED_AT we need an ingredient entity as dst
                    if rel_type == 'PRICED_AT' and signal.item_description:
                        dst_id, _ = find_or_create_entity('Ingredient', signal.item_description)
                    else:
                        dst_id = vendor_id  # self-reference for vendor activity signals

                    write_assertion(
                        src_id=vendor_id,
                        dst_id=dst_id,
                        rel_type=rel_type,
                        ledger_event_id=extraction_event_id,
                        confidence=signal.confidence,
                        metadata=metadata,
                        provisional=True,
                    )
                    assertions_written += 1

                    if created:
                        print(f'  [new vendor] {signal.vendor_name}')

                except Exception as e:
                    errors.append(f'signal error: {e}')

            processed += 1

        except Exception as e:
            errors.append(f'{thread_id}: {e}')

    return {
        'processed': processed,
        'skipped': skipped,
        'assertions_written': assertions_written,
        'errors': errors,
    }


if __name__ == '__main__':
    import json
    dry_run = '--dry-run' in sys.argv
    result = run(dry_run=dry_run)
    print(json.dumps(result, indent=2))
