"""
Job: triage_inbox
Pulls pending BrainInboxItems, runs Instructor triage classification,
auto-acts on high-confidence clear cases, leaves ambiguous items for human.

Auto-acts on:
  - trash (confidence >= 0.9)
  - new_entity (confidence >= 0.85, entity_type is Vendor or Ingredient)

Everything else stays pending for human triage.

Run: python -m jobs.triage_inbox
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import json
import uuid
from datetime import datetime, timezone
from db import query, execute
from ledger import write_ledger_event, find_or_create_entity
from extractor import triage_inbox_item

AUTO_ACT_THRESHOLD = 0.85
SAFE_AUTO_ENTITY_TYPES = {'Vendor', 'Ingredient', 'Customer'}


def run(limit: int = 30, dry_run: bool = False) -> dict:
    acted = 0
    deferred = 0
    errors = []

    rows = query(
        """
        SELECT id, "rawContent", source, "capturedAt"
        FROM "BrainInboxItem"
        WHERE status = 'pending'
        ORDER BY "capturedAt" DESC
        LIMIT %s
        """,
        (limit,),
    )

    for row in rows:
        item_id = row['id']
        raw = row['rawContent']
        source = row['source']

        try:
            decision = triage_inbox_item(raw, source)

            # Validate
            validation_errors = decision.validate_action()
            if validation_errors:
                deferred += 1
                continue

            if dry_run:
                print(f'[DRY] {raw[:60]} → {decision.action} conf={decision.confidence:.2f}')
                print(f'  rationale: {decision.rationale}')
                continue

            # Auto-trash high-confidence noise
            if decision.action == 'trash' and decision.confidence >= AUTO_ACT_THRESHOLD:
                execute(
                    'UPDATE "BrainInboxItem" SET status = %s, "processedAt" = NOW() WHERE id = %s',
                    ('trashed', item_id),
                )
                write_ledger_event(
                    event_type='inbox.auto_triaged',
                    source='python_extractor',
                    source_id=item_id,
                    payload={'action': 'trash', 'confidence': decision.confidence, 'rationale': decision.rationale},
                )
                acted += 1
                continue

            # Auto-create safe entity types with high confidence
            if (
                decision.action == 'new_entity'
                and decision.confidence >= AUTO_ACT_THRESHOLD
                and decision.entity_type in SAFE_AUTO_ENTITY_TYPES
                and decision.entity_name
            ):
                entity_id, created = find_or_create_entity(decision.entity_type, decision.entity_name)

                extraction_event_id = write_ledger_event(
                    event_type='inbox.auto_triaged',
                    source='python_extractor',
                    source_id=item_id,
                    payload={
                        'action': 'new_entity',
                        'entityType': decision.entity_type,
                        'entityName': decision.entity_name,
                        'entityId': entity_id,
                        'created': created,
                        'confidence': decision.confidence,
                        'rationale': decision.rationale,
                    },
                )

                execute(
                    """
                    UPDATE "BrainInboxItem"
                    SET status = 'triaged', "processedAt" = NOW(), "resultEntityId" = %s
                    WHERE id = %s
                    """,
                    (entity_id, item_id),
                )
                acted += 1
                continue

            # Everything else — annotate the item with the suggestion but leave pending
            current = query('SELECT "rawContent" FROM "BrainInboxItem" WHERE id = %s', (item_id,))
            if current:
                suggestion = f'\n\n[AI suggestion: {decision.action}'
                if decision.entity_name:
                    suggestion += f' → {decision.entity_type}: {decision.entity_name}'
                if decision.task_title:
                    suggestion += f' → Task: {decision.task_title}'
                suggestion += f' (conf {decision.confidence:.0%})]'

                # Only append if not already annotated
                existing = current[0]['rawContent']
                if '[AI suggestion:' not in existing:
                    execute(
                        'UPDATE "BrainInboxItem" SET "rawContent" = %s WHERE id = %s',
                        (existing + suggestion, item_id),
                    )

            deferred += 1

        except Exception as e:
            errors.append(f'{item_id}: {e}')
            deferred += 1

    return {
        'acted': acted,
        'deferred': deferred,
        'errors': errors,
    }


if __name__ == '__main__':
    dry_run = '--dry-run' in sys.argv
    result = run(dry_run=dry_run)
    print(json.dumps(result, indent=2))
