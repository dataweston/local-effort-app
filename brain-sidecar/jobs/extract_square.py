"""
Job: extract_square

Legacy Square payment classifier. Disabled by default because local-budget is
the transaction source of truth for Square payments/orders.

Set BRAIN_INGEST_SQUARE_TRANSACTIONS=true to run this legacy classifier.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from db import query
from ledger import (
    write_ledger_event, write_assertion,
    find_or_create_entity,
)


def run(limit: int = 100, dry_run: bool = False) -> dict:
    if os.environ.get('BRAIN_INGEST_SQUARE_TRANSACTIONS', '').lower() != 'true':
        return {
            'processed': 0,
            'skipped': 0,
            'assertions_written': 0,
            'errors': [],
            'disabled': True,
            'reason': 'Square payment classification is disabled; local-budget owns Square transactions.',
        }

    from extractor import extract_square_payment

    processed = 0
    skipped = 0
    assertions_written = 0
    errors = []

    # Pull payment events not yet extraction-processed
    rows = query(
        """
        SELECT le.id, le."sourceId", le.payload, le."occurredAt"
        FROM "LedgerEvent" le
        WHERE le."eventType" = 'payment.completed'
          AND le."tombstonedAt" IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM "LedgerEvent" le2
            WHERE le2."eventType" = 'extraction.square'
              AND le2."sourceId" = le."sourceId"
          )
        ORDER BY le."occurredAt" DESC
        LIMIT %s
        """,
        (limit,),
    )

    for row in rows:
        payload = row['payload']
        payment_id = payload.get('squarePaymentId') or row['sourceId']
        note = payload.get('merchantName') or ''
        amount_cents = int(payload.get('amountCents') or 0)

        if not note:
            skipped += 1
            continue

        try:
            signal = extract_square_payment(note, amount_cents)

            if signal.payment_type == 'unknown':
                skipped += 1
                continue

            if dry_run:
                print(f'[DRY] {payment_id}: {signal.payment_type} → {signal.vendor_name or signal.customer_name} conf={signal.confidence:.2f}')
                processed += 1
                continue

            extraction_event_id = write_ledger_event(
                event_type='extraction.square',
                source='python_extractor',
                source_id=payment_id,
                payload={
                    'paymentId': payment_id,
                    'classifiedAs': signal.payment_type,
                    'entityName': signal.vendor_name or signal.customer_name,
                    'rationale': signal.rationale,
                    'model': 'claude-haiku',
                },
            )

            if signal.payment_type == 'vendor_payment' and signal.vendor_name:
                entity_id, created = find_or_create_entity('Vendor', signal.vendor_name)
                write_assertion(
                    src_id=entity_id,
                    dst_id=entity_id,
                    rel_type='PAYMENT_RECEIVED',
                    ledger_event_id=extraction_event_id,
                    confidence=signal.confidence,
                    metadata={
                        'amountCents': amount_cents,
                        'paymentId': payment_id,
                        'itemDescription': signal.item_description,
                        'rationale': signal.rationale,
                    },
                    provisional=True,
                )
                assertions_written += 1
                if created:
                    print(f'  [new vendor] {signal.vendor_name}')

            elif signal.payment_type == 'customer_payment' and signal.customer_name:
                entity_id, created = find_or_create_entity('Customer', signal.customer_name)
                write_assertion(
                    src_id=entity_id,
                    dst_id=entity_id,
                    rel_type='PAYMENT_RECEIVED',
                    ledger_event_id=extraction_event_id,
                    confidence=signal.confidence,
                    metadata={
                        'amountCents': amount_cents,
                        'paymentId': payment_id,
                        'rationale': signal.rationale,
                    },
                    provisional=True,
                )
                assertions_written += 1
                if created:
                    print(f'  [new customer] {signal.customer_name}')

            processed += 1

        except Exception as e:
            errors.append(f'{payment_id}: {e}')

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
