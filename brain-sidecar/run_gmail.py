#!/usr/bin/env python3
"""
Standalone gmail extraction runner.
Logs to brain-sidecar/gmail_extract.log so you can tail -f it.

Usage:
  python run_gmail.py              # extract all unextracted threads
  python run_gmail.py --limit 50   # extract only first 50
  python run_gmail.py --dry-run    # preview without writing
  python run_gmail.py --reextract  # wipe and redo all
    python run_gmail.py --snippet-only # skip Gmail body fetch; use ledger snippets only
"""

import sys
import os
import time
import json
import logging

sys.path.insert(0, os.path.dirname(__file__))
os.chdir(os.path.dirname(__file__))

from dotenv import load_dotenv
from pathlib import Path
load_dotenv(dotenv_path=Path('../.env'))

# Log to both file and stdout
log_path = Path(__file__).parent / 'gmail_extract.log'
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(message)s',
    handlers=[
        logging.FileHandler(log_path, encoding='utf-8'),
        logging.StreamHandler(sys.stdout),
    ]
)
log = logging.getLogger('gmail_extract')

DRY_RUN  = '--dry-run'  in sys.argv
REEXTRACT = '--reextract' in sys.argv
SNIPPET_ONLY = '--snippet-only' in sys.argv
LIMIT = 2000
for i, arg in enumerate(sys.argv):
    if arg == '--limit' and i + 1 < len(sys.argv):
        LIMIT = int(sys.argv[i + 1])

log.info(
    f'Starting gmail extraction: dry_run={DRY_RUN} reextract={REEXTRACT} '
    f'snippet_only={SNIPPET_ONLY} limit={LIMIT}'
)
log.info(f'Log file: {log_path}')

from jobs.extract_gmail import run

start = time.time()
try:
    result = run(
        dry_run=DRY_RUN,
        max_workers=1,
        batch_size=25,
        limit=LIMIT,
        snippet_only=SNIPPET_ONLY,
    )
    elapsed = round(time.time() - start, 1)
    log.info(f'Finished in {elapsed}s: {json.dumps(result, default=str)}')
except Exception as e:
    log.exception(f'Failed: {e}')
    sys.exit(1)
