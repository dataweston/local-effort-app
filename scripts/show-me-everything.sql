-- Complete diagnostic of Happy Monday credit system
-- This will show EVERYTHING so we can see exactly what's wrong

-- Current balance
SELECT
  '1. CURRENT BALANCE IN DATABASE' as section,
  balance_cents / 100.0 as dollars,
  CASE
    WHEN balance_cents < 0 THEN 'Credit Available: $' || ABS(balance_cents / 100.0)
    WHEN balance_cents > 0 THEN 'Amount Owed: $' || (balance_cents / 100.0)
    ELSE 'Zero Balance'
  END as status
FROM happymonday_credits c
JOIN happymonday_users u ON c.user_id = u.id
WHERE u.email = 'hello@happymonday.company';

-- All orders with running total
WITH client AS (
  SELECT id FROM happymonday_users WHERE email = 'hello@happymonday.company'
),
orders_with_total AS (
  SELECT
    order_number,
    order_date,
    status,
    total_cents,
    created_at,
    SUM(total_cents) OVER (ORDER BY order_date, created_at) as running_total
  FROM happymonday_orders
  WHERE user_id = (SELECT id FROM client)
)
SELECT
  '2. ALL ORDERS (chronological)' as section,
  order_number,
  TO_CHAR(order_date, 'YYYY-MM-DD') as date,
  status,
  (total_cents / 100.0) as amount,
  (running_total / 100.0) as running_total_orders
FROM orders_with_total
ORDER BY order_date, created_at;

-- All payments with running total
WITH client AS (
  SELECT id FROM happymonday_users WHERE email = 'hello@happymonday.company'
),
payments_with_total AS (
  SELECT
    created_at,
    payment_type,
    amount_cents,
    notes,
    SUM(amount_cents) OVER (ORDER BY created_at) as running_total
  FROM happymonday_payments
  WHERE user_id = (SELECT id FROM client)
)
SELECT
  '3. ALL PAYMENTS (chronological)' as section,
  TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') as when_paid,
  payment_type,
  (amount_cents / 100.0) as amount,
  CASE
    WHEN amount_cents < 0 THEN '(credit applied)'
    WHEN amount_cents > 0 THEN '(payment received)'
  END as note,
  (running_total / 100.0) as running_total_payments
FROM payments_with_total
ORDER BY created_at;

-- The calculation
WITH client AS (
  SELECT id FROM happymonday_users WHERE email = 'hello@happymonday.company'
),
calc AS (
  SELECT
    150000 as opening_credit,
    COALESCE((SELECT SUM(total_cents) FROM happymonday_orders WHERE user_id = (SELECT id FROM client)), 0) as total_orders,
    COALESCE((SELECT SUM(amount_cents) FROM happymonday_payments WHERE user_id = (SELECT id FROM client)), 0) as total_payments,
    (SELECT balance_cents FROM happymonday_credits WHERE user_id = (SELECT id FROM client)) as current_balance
)
SELECT
  '4. CALCULATION BREAKDOWN' as section,
  NULL as step,
  NULL::numeric as dollars
UNION ALL
SELECT '', 'Opening Credit', -150000 / 100.0
UNION ALL
SELECT '', '+ Total Orders', (SELECT total_orders / 100.0 FROM calc)
UNION ALL
SELECT '', '- Total Payments', -(SELECT total_payments / 100.0 FROM calc)
UNION ALL
SELECT '', '= SHOULD BE', (SELECT (-opening_credit + total_orders - total_payments) / 100.0 FROM calc)
UNION ALL
SELECT '', '', NULL
UNION ALL
SELECT '', 'Current Balance (DB)', (SELECT current_balance / 100.0 FROM calc)
UNION ALL
SELECT '', 'Difference (ERROR)', (SELECT (current_balance - (-opening_credit + total_orders - total_payments)) / 100.0 FROM calc);

-- Count credit adjustments (these are the ones that might have been double-counted)
SELECT
  '5. CREDIT ADJUSTMENT ANALYSIS' as section,
  COUNT(*) as count_of_credit_adjustments,
  SUM(amount_cents) / 100.0 as total_credits_applied,
  'If this was double-counted, error = ' || ABS(SUM(amount_cents)) / 100.0 as potential_error
FROM happymonday_payments p
JOIN happymonday_users u ON p.user_id = u.id
WHERE u.email = 'hello@happymonday.company'
  AND payment_type = 'credit_adjustment';
