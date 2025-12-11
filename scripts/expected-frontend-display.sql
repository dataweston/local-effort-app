-- What the Happy Monday frontend SHOULD show after fix

WITH client AS (
  SELECT id FROM happymonday_users WHERE email = 'hello@happymonday.company'
),
balance AS (
  SELECT balance_cents, opening_credit_cents
  FROM happymonday_credits
  WHERE user_id = (SELECT id FROM client)
),
invoices AS (
  SELECT
    SUM(CASE WHEN status IN ('unpaid', 'partial') THEN total_cents ELSE 0 END) as open_cents,
    SUM(CASE WHEN status IN ('paid', 'refunded') THEN total_cents ELSE 0 END) as closed_cents,
    COUNT(*) FILTER (WHERE status IN ('unpaid', 'partial')) as open_count,
    COUNT(*) FILTER (WHERE status IN ('paid', 'refunded')) as closed_count
  FROM happymonday_orders
  WHERE user_id = (SELECT id FROM client)
)
SELECT
  '💰 WHAT FRONTEND SHOULD DISPLAY' as "═══════════════════════════",
  
  -- Main balance display (top of page)
  CASE 
    WHEN b.balance_cents < 0 THEN 'Credit Available'
    WHEN b.balance_cents > 0 THEN 'Balance Due'
    ELSE 'Zero Balance'
  END as "Balance Label",
  ABS(b.balance_cents) / 100.0 as "Balance Amount $",
  CASE 
    WHEN b.balance_cents < 0 THEN '(shown in GREEN)'
    WHEN b.balance_cents > 0 THEN '(shown in RED)'
    ELSE ''
  END as "Color",
  
  '---' as "─────────────",
  
  -- Opening credit
  b.opening_credit_cents / 100.0 as "Opening Credit $",
  
  '---' as "──────────────",
  
  -- Invoice summary (for admins)
  i.closed_cents / 100.0 as "Closed Invoices $",
  i.closed_count as "Closed Count",
  i.open_cents / 100.0 as "Open Invoices $",
  i.open_count as "Open Count",
  
  '---' as "───────────────",
  
  -- Net calculation
  (i.open_cents + b.balance_cents) / 100.0 as "Net After Credit $",
  CASE
    WHEN (i.open_cents + b.balance_cents) < 0 
    THEN 'Credit remains after open invoices'
    WHEN (i.open_cents + b.balance_cents) > 0
    THEN 'Amount owed after applying credit'
    ELSE 'Breaks even'
  END as "Net Meaning"

FROM balance b, invoices i;
