"""
Thin psycopg2 connection to the same DATABASE_URL used by Prisma.
All reads/writes go through plain SQL — no ORM needed for the sidecar.
"""

import os
import time
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

_conn = None


def _new_conn():
    url = os.environ['DATABASE_URL']
    conn = psycopg2.connect(
        url,
        cursor_factory=psycopg2.extras.RealDictCursor,
        connect_timeout=10,
        keepalives=1,
        keepalives_idle=30,
        keepalives_interval=10,
        keepalives_count=5,
    )
    conn.autocommit = False
    return conn


def get_conn():
    global _conn
    if _conn is None or _conn.closed:
        _conn = _new_conn()
        return _conn
    # Ping to detect stale connection before use
    try:
        _conn.cursor().execute('SELECT 1')
        _conn.rollback()
    except Exception:
        try:
            _conn.close()
        except Exception:
            pass
        _conn = _new_conn()
    return _conn


def query(sql: str, params=None) -> list[dict]:
    global _conn
    for attempt in range(4):
        try:
            conn = get_conn()
            with conn.cursor() as cur:
                cur.execute(sql, params or ())
                return [dict(r) for r in cur.fetchall()]
        except psycopg2.OperationalError:
            try:
                _conn.rollback()
            except Exception:
                pass
            _conn = None  # force reconnect on retry
            if attempt < 3:
                time.sleep(2 ** attempt)  # 1s, 2s, 4s
                continue
            raise
        except Exception:
            try:
                _conn.rollback()
            except Exception:
                pass
            raise


def execute(sql: str, params=None):
    """Execute a write statement, return the first column of first row if RETURNING."""
    global _conn
    for attempt in range(4):
        try:
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
        except psycopg2.OperationalError:
            try:
                _conn.rollback()
            except Exception:
                pass
            _conn = None  # force reconnect on retry
            if attempt < 3:
                time.sleep(2 ** attempt)  # 1s, 2s, 4s
                continue
            raise
        except Exception:
            try:
                _conn.rollback()
            except Exception:
                pass
            raise
