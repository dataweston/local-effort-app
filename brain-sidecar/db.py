"""
Thin psycopg2 connection to the same DATABASE_URL used by Prisma.
All reads/writes go through plain SQL — no ORM needed for the sidecar.
"""

import os
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

_conn = None


def get_conn():
    global _conn
    if _conn is None or _conn.closed:
        url = os.environ['DATABASE_URL']
        _conn = psycopg2.connect(url, cursor_factory=psycopg2.extras.RealDictCursor)
        _conn.autocommit = False
    return _conn


def query(sql: str, params=None) -> list[dict]:
    conn = get_conn()
    with conn.cursor() as cur:
        cur.execute(sql, params or ())
        return [dict(r) for r in cur.fetchall()]


def execute(sql: str, params=None) -> str | None:
    """Execute a write statement, return the first column of first row if RETURNING."""
    conn = get_conn()
    with conn.cursor() as cur:
        cur.execute(sql, params or ())
        try:
            row = cur.fetchone()
            result = row[list(row.keys())[0]] if row else None
        except Exception:
            result = None
    conn.commit()
    return result
