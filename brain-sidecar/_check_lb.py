import sys, os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(__file__))
os.chdir(os.path.dirname(__file__))
import psycopg2, psycopg2.extras
from pathlib import Path

lb_env = Path('c:/Users/user/Local Budget/.env').read_text()
for line in lb_env.splitlines():
    k, _, v = line.partition('=')
    if k == 'DATABASE_URL':
        lb_url = v.strip().strip('"')
        break

conn = psycopg2.connect(lb_url, cursor_factory=psycopg2.extras.RealDictCursor, connect_timeout=15)
with conn.cursor() as cur:
    # categories table
    cur.execute("""SELECT id, name, "defaultClassification", "parentId" FROM categories ORDER BY name""")
    cats = cur.fetchall()
    print('=== categories table ===')
    for c in cats:
        print(f"  {c['name']:30s}  classification={c['defaultClassification']}  parent={c['parentId']}")

    # categoryId distribution in transactions
    cur.execute("""
        SELECT t."categoryId", c.name, c."defaultClassification", COUNT(*) as cnt, SUM(ABS(t.amount)) as total
        FROM transactions t
        LEFT JOIN categories c ON c.id = t."categoryId"
        GROUP BY t."categoryId", c.name, c."defaultClassification"
        ORDER BY cnt DESC
    """)
    rows = cur.fetchall()
    print('\n=== Category distribution in transactions ===')
    for r in rows:
        print(f"  {str(r['name'] or 'NULL'):30s}  {str(r['defaultClassification'] or '?'):12s}  {r['cnt']:4d} txns  ${float(r['total'] or 0):9.2f}")

    # classification field on transactions themselves
    cur.execute("""SELECT classification, COUNT(*) as cnt FROM transactions GROUP BY classification ORDER BY cnt DESC""")
    rows = cur.fetchall()
    print('\n=== Transaction classification field ===')
    for r in rows:
        print(f"  {str(r['classification'] or 'NULL'):20s}  {r['cnt']:4d}")

    # financial_accounts
    cur.execute('SELECT id, name, type, "isActive" FROM financial_accounts LIMIT 20')
    print('\n=== financial_accounts ===')
    for r in cur.fetchall():
        print(f"  {r['name']:30s}  type={r['type']}  active={r['isActive']}")

conn.close()
