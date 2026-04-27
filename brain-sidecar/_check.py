import sys, os
sys.path.insert(0, os.path.dirname(__file__))
os.chdir(os.path.dirname(__file__))
from dotenv import load_dotenv
from pathlib import Path
load_dotenv(dotenv_path=Path('../.env'))
from db import query

print('=== CPW ===')
cpw_a = query("""SELECT COUNT(*) as cnt FROM "BrainAssertion" WHERE "sourceType" = 'extract_cpw_prices'""")
print('CPW assertions:', cpw_a)
cpw_le = query("""SELECT COUNT(*) as cnt FROM "LedgerEvent" WHERE source = 'extract_cpw_prices'""")
print('CPW ledger events:', cpw_le)

print('=== Crossref ===')
crossref_le = query("""SELECT COUNT(*) as cnt FROM "LedgerEvent" WHERE source = 'extract_vendor_crossref'""")
print('Crossref ledger events:', crossref_le)
crossref_a = query("""SELECT "relType", COUNT(*) as cnt FROM "BrainAssertion" WHERE "sourceType" = 'extract_vendor_crossref' GROUP BY "relType" """)
print('Crossref assertions by type:', crossref_a)

print('=== CPW entity types ===')
cpw_entity_types = query("""
  SELECT e."entityType", COUNT(*) as cnt
  FROM "BrainEntity" e
  WHERE e.id IN (SELECT DISTINCT "srcId" FROM "BrainAssertion" WHERE "sourceType" = 'extract_cpw_prices')
    OR e.id IN (SELECT DISTINCT "dstId" FROM "BrainAssertion" WHERE "sourceType" = 'extract_cpw_prices')
  GROUP BY e."entityType"
""")
print(cpw_entity_types)

print('=== Gmail progress ===')
gmail_le = query("""SELECT COUNT(*) as cnt FROM "LedgerEvent" WHERE source = 'extract_gmail'""")
print('Gmail ledger events:', gmail_le)
inbox = query("""SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'triaged') as triaged FROM "BrainInboxItem" """)
print('Inbox items:', inbox)
unextracted = query("""
  SELECT COUNT(*) as cnt FROM "BrainInboxItem" bi
  WHERE bi.status = 'triaged'
  AND NOT EXISTS (
    SELECT 1 FROM "LedgerEvent" le
    WHERE le.source = 'extract_gmail'
    AND le."sourceId" = bi."threadId"
  )
""")
print('Unextracted triaged threads:', unextracted)
