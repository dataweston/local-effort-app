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

    all_jobs = {
        'gmail':  (run_gmail,  {}),
        'square': (run_square, {}),
        'inbox':  (run_inbox,  {}),
        'embed':  (run_embed,  {'full_reembed': FULL_REEMBED}),
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
