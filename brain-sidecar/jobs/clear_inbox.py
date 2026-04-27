"""
Job: clear_inbox

Marks all pending BrainInboxItems from gmail source as 'triaged'
so they stop cluttering the inbox drawer.

The data is preserved in LedgerEvent — this only affects the inbox UI.

Run:
  python run.py clear_inbox
  python -m jobs.clear_inbox --source gmail        # gmail only (default)
  python -m jobs.clear_inbox --source all          # everything pending
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from db import query, execute


def run(source: str = 'gmail', dry_run: bool = False) -> dict:
    if source == 'all':
        where = "status = 'pending'"
        params = ()
    else:
        where = "status = 'pending' AND source = %s"
        params = (source,)

    rows = query(f'SELECT COUNT(*) as n FROM "BrainInboxItem" WHERE {where}', params)
    count = rows[0]['n']

    if dry_run:
        print(f'[DRY] would clear {count} inbox items (source={source})')
        return {'cleared': 0, 'would_clear': count}

    execute(
        f'UPDATE "BrainInboxItem" SET status = \'triaged\', "processedAt" = NOW() WHERE {where}',
        params,
    )
    print(f'[clear_inbox] cleared {count} items (source={source})')
    return {'cleared': count}


if __name__ == '__main__':
    source = 'gmail'
    for arg in sys.argv[1:]:
        if arg.startswith('--source='):
            source = arg.split('=')[1]
        elif arg == '--all':
            source = 'all'
    dry_run = '--dry-run' in sys.argv
    import json
    print(json.dumps(run(source=source, dry_run=dry_run), indent=2))
