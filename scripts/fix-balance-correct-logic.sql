-- Fix Happy Monday Balance - Correct Business Logic
-- ALL paid invoices should deduct from credit, not just client-created ones

-- STEP 1: Show current vs correct calculation
WITH client AS (
  SELECT id FROM happymonday_users WHERE email = 'hello@happymonday.company'
),
current_calc AS (
  SELECT
    150000 as opening_credit_cents,
    (SELECT balance_cents FROM happymonday_credits WHERE user_id = (SELECT id FROM client)) as stored_balance_cents,
    (SELECT SUM(total_cents) FROM happymonday_orders WHERE user_id = (SELECT id FROM client) AND status IN ('paid', 'refunded')) as paid_orders_cents,
    (SELECT SUM(amount_cents) FROM happymonday_payments WHERE user_id = (SELECT id FROM client)) as payments_cents
)
SELECT
  '🔍 CURRENT STATE' as "═══════════════════",
  opening_credit_cents / 100.0 as "Opening Credit $",
  stored_balance_cents / 100.0 as "Stored Balance $",
  paid_orders_cents / 100.0 as "Paid Invoices Total $",
  payments_cents / 100.0 as "Payments Applied $",
  '---' as "───────",
  (-opening_credit_cents + paid_orders_cents) / 100.0 as "CORRECT Balance $ (Opening - Paid)",
  (stored_balance_cents - (-opening_credit_cents + paid_orders_cents)) / 100.0 as "Drift $"
FROM current_calc;

-- STEP 2: Fix the balance using the correct logic
-- Balance should be: -Opening Credit + ALL Paid Orders
WITH client AS (
  SELECT id FROM happymonday_users WHERE email = 'hello@happymonday.company'
),
correct_balance AS (
  SELECT
    -150000 + COALESCE((
      SELECT SUM(total_cents) 
      FROM happymonday_orders 
      WHERE user_id = (SELECT id FROM client) 
      AND status IN ('paid', 'refunded')
    ), 0) as balance_cents
)
UPDATE happymonday_credits
SET 
  balance_cents = (SELECT balance_cents FROM correct_balance),
  updated_at = now()
WHERE user_id = (SELECT id FROM client);

-- STEP 3: Verify the fix
WITH client AS (
  SELECT id FROM happymonday_users WHERE email = 'hello@happymonday.company'
)
SELECT 
  '✅ CORRECTED BALANCE' as "═══════════════════",
  balance_cents / 100.0 as "New Balance $",
  CASE 
    WHEN balance_cents < 0 THEN 'Credit Available: $' || ABS(balance_cents / 100.0)
    WHEN balance_cents > 0 THEN 'Amount Owed: $' || (balance_cents / 100.0)
    ELSE 'Zero Balance'
  END as "Status",
  '---' as "───────",
  opening_credit_cents / 100.0 as "Opening Credit $",
  (SELECT SUM(total_cents) / 100.0 FROM happymonday_orders WHERE user_id = (SELECT id FROM client) AND status IN ('paid', 'refunded')) as "Paid Invoices $",
  updated_at as "Updated At"
FROM happymonday_credits
WHERE user_id = (SELECT id FROM client);

-- STEP 4: Show breakdown
WITH client AS (
  SELECT id FROM happymonday_users WHERE email = 'hello@happymonday.company'
)
SELECT
  '📊 INVOICE BREAKDOWN' as "═══════════════════",
  COUNT(*) FILTER (WHERE status IN ('paid', 'refunded')) as "Paid Invoices",
  SUM(total_cents) FILTER (WHERE status IN ('paid', 'refunded')) / 100.0 as "Paid Total $",
  COUNT(*) FILTER (WHERE status IN ('unpaid', 'partial')) as "Unpaid Invoices",
  SUM(total_cents) FILTER (WHERE status IN ('unpaid', 'partial')) / 100.0 as "Unpaid Total $"
FROM happymonday_orders
WHERE user_id = (SELECT id FROM client);
