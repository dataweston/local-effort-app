"""
Purge all CPW (Co-op Partners Warehouse) data from the brain graph.

BrainAssertion.sourceId stores the LedgerEvent.id that created each assertion.
So we find all CPW ledger events, then delete all assertions whose sourceId
points to one of those events, then delete CPW-only entities, then the ledger events.

Run with --dry-run to preview.
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
os.chdir(os.path.dirname(os.path.dirname(__file__)))

from dotenv import load_dotenv
from pathlib import Path
load_dotenv(dotenv_path=Path('.env'))

from db import query, execute

DRY_RUN = '--dry-run' in sys.argv


def run():
    print(f'[purge_cpw] dry_run={DRY_RUN}')

    # 1. Find all CPW ledger event IDs
    cpw_le = query("""SELECT id FROM "LedgerEvent" WHERE source = 'extract_cpw_prices'""")
    cpw_le_ids = [r['id'] for r in cpw_le]
    print(f'  CPW LedgerEvents: {len(cpw_le_ids)}')
    for lid in cpw_le_ids:
        print(f'    {lid}')

    if not cpw_le_ids:
        print('  Nothing to delete.')
        return

    # 2. Find assertions whose sourceId points to a CPW ledger event
    cpw_assertions = query("""
        SELECT id, "srcId", "dstId", "relType"
        FROM "BrainAssertion"
        WHERE "sourceId" = ANY(%s)
    """, (cpw_le_ids,))
    print(f'  CPW assertions: {len(cpw_assertions)}')

    # 3. Entities referenced by those assertions
    cpw_entity_ids = set()
    for a in cpw_assertions:
        cpw_entity_ids.add(a['srcId'])
        cpw_entity_ids.add(a['dstId'])
    print(f'  Entities referenced: {len(cpw_entity_ids)}')

    # 4. Which of those entities have NO other assertions?
    if cpw_entity_ids:
        ids_list = list(cpw_entity_ids)
        has_other = query("""
            SELECT DISTINCT e.id
            FROM "BrainEntity" e
            WHERE e.id = ANY(%s)
              AND EXISTS (
                SELECT 1 FROM "BrainAssertion" a
                WHERE (a."srcId" = e.id OR a."dstId" = e.id)
                  AND a."sourceId" != ALL(%s)
              )
        """, (ids_list, cpw_le_ids))
        keep_ids = {r['id'] for r in has_other}
        delete_entity_ids = cpw_entity_ids - keep_ids
    else:
        delete_entity_ids = set()

    print(f'  Entities to delete (CPW-only): {len(delete_entity_ids)}')
    print(f'  Entities to keep (have other assertions): {len(keep_ids) if cpw_entity_ids else 0}')

    # 5. Also check for crossref ledger events that reference CPW entities
    crossref_le = query("""SELECT id FROM "LedgerEvent" WHERE source = 'extract_vendor_crossref'""")
    crossref_le_ids = [r['id'] for r in crossref_le]
    crossref_assertions = query("""
        SELECT COUNT(*) as cnt FROM "BrainAssertion"
        WHERE "sourceId" = ANY(%s)
    """, (crossref_le_ids,)) if crossref_le_ids else [{'cnt': 0}]
    print(f'  Crossref LedgerEvents: {len(crossref_le_ids)}, assertions: {crossref_assertions[0]["cnt"]}')

    if DRY_RUN:
        print('\n[DRY RUN] Would delete:')
        print(f'  {len(cpw_assertions)} assertions (CPW ledger event sourceId)')
        print(f'  {len(delete_entity_ids)} entities (CPW-only, no other assertions)')
        print(f'  {len(cpw_le_ids)} CPW ledger events')
        print(f'  {len(crossref_le_ids)} crossref ledger events (0 assertions)')
        return

    # Execute
    cpw_assertion_ids = [a['id'] for a in cpw_assertions]
    if cpw_assertion_ids:
        execute("""DELETE FROM "BrainAssertion" WHERE id = ANY(%s)""", (cpw_assertion_ids,))
        print(f'  Deleted {len(cpw_assertion_ids)} assertions')

    if delete_entity_ids:
        execute("""DELETE FROM "BrainEntity" WHERE id = ANY(%s)""", (list(delete_entity_ids),))
        print(f'  Deleted {len(delete_entity_ids)} entities')

    if cpw_le_ids:
        execute("""DELETE FROM "LedgerEvent" WHERE source = 'extract_cpw_prices'""")
        print(f'  Deleted {len(cpw_le_ids)} CPW ledger events')

    if crossref_le_ids:
        execute("""DELETE FROM "LedgerEvent" WHERE source = 'extract_vendor_crossref'""")
        print(f'  Deleted {len(crossref_le_ids)} crossref ledger events')

    print('[purge_cpw] done')


if __name__ == '__main__':
    run()
