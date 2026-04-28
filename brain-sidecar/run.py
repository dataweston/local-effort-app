#!/usr/bin/env python3
# Windows: requires Python 3.10+ — use C:/Users/user/AppData/Local/Programs/Python/Python310/python.exe
"""
Brain sidecar orchestrator.

Usage:
  python run.py                    # run all jobs
  python run.py gmail              # run only gmail extraction
  python run.py square             # run only square extraction
  python run.py inbox              # run only inbox triage
  python run.py --dry-run          # print what would happen, write nothing

Environment:
  DATABASE_URL       — same value as .env (Prisma postgres connection)
  ANTHROPIC_API_KEY  — Claude API key for Instructor extraction
"""

import sys
import json
import time
from datetime import datetime

DRY_RUN = '--dry-run' in sys.argv
FULL_REEMBED = '--full-reembed' in sys.argv
JOBS_ARG = [a for a in sys.argv[1:] if not a.startswith('-')]


def run_job(name: str, fn, **kwargs) -> dict:
    start = time.time()
    print(f'\n[{name}] starting…')
    try:
        result = fn(**kwargs)
        elapsed = round(time.time() - start, 1)
        print(f'[{name}] done in {elapsed}s: {json.dumps(result)}')
        return {'job': name, 'elapsed': elapsed, **result}
    except Exception as e:
        elapsed = round(time.time() - start, 1)
        print(f'[{name}] FAILED in {elapsed}s: {e}')
        return {'job': name, 'elapsed': elapsed, 'error': str(e)}


def main():
    from jobs.extract_gmail import run as run_gmail
    from jobs.extract_square import run as run_square
    from jobs.triage_inbox import run as run_inbox
    from jobs.embed import run as run_embed
    from jobs.clear_inbox import run as run_clear_inbox
    from jobs.extract_static import run as run_static
    from jobs.extract_orders import run as run_orders
    from jobs.extract_planner import run as run_planner
    from jobs.extract_january import run as run_january
    from jobs.extract_sanity import run as run_sanity
    from jobs.extract_brevo import run as run_brevo
    from jobs.extract_square_catalog import run as run_square_catalog
    from jobs.extract_xlsx_model import run as run_xlsx_model
    from jobs.extract_square_csv import run as run_square_csv
    from jobs.extract_receipts import run as run_receipts
    from jobs.extract_cpw_prices import run as run_cpw_prices
    from jobs.extract_vendor_crossref import run as run_vendor_crossref
    from jobs.seed_ontology import run as run_seed_ontology
    from jobs.harvest_sent_gmail import run as run_harvest_sent_gmail
    from jobs.audit_graph import run as run_audit_graph

    all_jobs = {
        # Phase 0 — Ontology seed (idempotent, no LLM)
        'seed_ontology': (run_seed_ontology, {}),
        # Phase 0 — Gmail (existing, LLM-based)
        'gmail':        (run_gmail,       {'max_workers': 4}),
        # Gmail sent-mail harvest (deterministic, no LLM)
        'gmail_sent':   (run_harvest_sent_gmail, {'days_back': 730}),
        # Phase 1 — Zero-LLM structured sources
        'static':       (run_static,      {}),
        'orders':       (run_orders,      {}),
        'planner':      (run_planner,     {}),
        'january':      (run_january,     {}),
        # Phase 2 — CMS / external APIs
        'sanity':       (run_sanity,      {}),
        'brevo':        (run_brevo,       {}),
        'square_catalog': (run_square_catalog, {}),
        'xlsx_model':   (run_xlsx_model,     {}),
        'square_csv':   (run_square_csv,     {}),
        'receipts':     (run_receipts,       {}),
        'cpw_prices':   (run_cpw_prices,     {}),
        'vendor_crossref': (run_vendor_crossref, {}),
        # Existing jobs
        'square':       (run_square,      {}),
        'inbox':        (run_inbox,       {}),
        'embed':        (run_embed,       {'full_reembed': FULL_REEMBED}),
        'clear_inbox':  (run_clear_inbox, {'source': 'gmail'}),
        'audit_graph':  (run_audit_graph, {}),
    }

    jobs_to_run = JOBS_ARG if JOBS_ARG else list(all_jobs.keys())
    unknown = [j for j in jobs_to_run if j not in all_jobs]
    if unknown:
        print(f'Unknown jobs: {unknown}. Available: {list(all_jobs.keys())}')
        sys.exit(1)

    print(f'Brain sidecar — {datetime.now().isoformat()} — jobs: {jobs_to_run} — dry_run={DRY_RUN}')

    results = []
    for job_name in jobs_to_run:
        fn, kwargs = all_jobs[job_name]
        result = run_job(job_name, fn, dry_run=DRY_RUN, **kwargs)
        results.append(result)

    print(f'\n=== Summary ===')
    for r in results:
        status = 'ERROR' if 'error' in r else 'ok'
        print(f'  {r["job"]}: {status} ({r["elapsed"]}s)')


if __name__ == '__main__':
    main()
