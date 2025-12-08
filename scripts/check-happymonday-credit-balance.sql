-- Diagnostic script to check Happy Monday credit balance calculations
-- Run this in your Supabase SQL Editor to see if double-counting has occurred

-- Get client ID
WITH client_info AS (
  SELECT id, email FROM public.happymonday_users
  WHERE email = 'hello@happymonday.company'
),

-- Get current credit record
current_credit AS (
  SELECT
    c.balance_cents,
    c.opening_credit_cents
  FROM public.happymonday_credits c
  INNER JOIN client_info ci ON c.user_id = ci.id
),

-- Calculate total from all orders
order_totals AS (
  SELECT
    COUNT(*) as order_count,
    COALESCE(SUM(total_cents), 0) as total_orders
  FROM public.happymonday_orders o
  INNER JOIN client_info ci ON o.user_id = ci.id
),

-- Calculate payments
payment_totals AS (
  SELECT
    COUNT(*) as payment_count,
    COALESCE(SUM(amount_cents), 0) as total_payments,
    COUNT(CASE WHEN payment_type = 'credit_adjustment' THEN 1 END) as credit_adjustment_count,
    COALESCE(SUM(CASE WHEN payment_type = 'credit_adjustment' THEN amount_cents ELSE 0 END), 0) as total_credit_adjustments
  FROM public.happymonday_payments p
  INNER JOIN client_info ci ON p.user_id = ci.id
),

-- Calculate what the balance SHOULD be
calculated_balance AS (
  SELECT
    -cc.opening_credit_cents + ot.total_orders - pt.total_payments as correct_balance
  FROM current_credit cc
  CROSS JOIN order_totals ot
  CROSS JOIN payment_totals pt
)

-- Display results
SELECT
  '=== Happy Monday Credit Analysis ===' as section,
  NULL::text as detail,
  NULL::numeric as amount_dollars
UNION ALL
SELECT
  'Current Credit Record',
  'Balance in system',
  cc.balance_cents / 100.0
FROM current_credit cc
UNION ALL
SELECT
  '',
  'Opening credit',
  cc.opening_credit_cents / 100.0
FROM current_credit cc
UNION ALL
SELECT
  '',
  NULL,
  NULL
UNION ALL
SELECT
  'Order Summary',
  'Number of orders',
  ot.order_count::numeric
FROM order_totals ot
UNION ALL
SELECT
  '',
  'Total order value',
  ot.total_orders / 100.0
FROM order_totals ot
UNION ALL
SELECT
  '',
  NULL,
  NULL
UNION ALL
SELECT
  'Payment Summary',
  'Number of payments',
  pt.payment_count::numeric
FROM payment_totals pt
UNION ALL
SELECT
  '',
  'Total payments',
  pt.total_payments / 100.0
FROM payment_totals pt
UNION ALL
SELECT
  '',
  'Credit adjustments (count)',
  pt.credit_adjustment_count::numeric
FROM payment_totals pt
UNION ALL
SELECT
  '',
  'Credit adjustments (total)',
  pt.total_credit_adjustments / 100.0
FROM payment_totals pt
UNION ALL
SELECT
  '',
  NULL,
  NULL
UNION ALL
SELECT
  'Calculation Check',
  'Calculated correct balance',
  cb.correct_balance / 100.0
FROM calculated_balance cb
UNION ALL
SELECT
  '',
  'Current system balance',
  cc.balance_cents / 100.0
FROM current_credit cc
UNION ALL
SELECT
  '',
  'Difference (if not zero, bug exists)',
  (cc.balance_cents - cb.correct_balance) / 100.0
FROM current_credit cc
CROSS JOIN calculated_balance cb
UNION ALL
SELECT
  '',
  NULL,
  NULL
UNION ALL
SELECT
  'Balance Type',
  CASE
    WHEN cc.balance_cents < 0 THEN 'Credit Available'
    WHEN cc.balance_cents > 0 THEN 'Amount Owed'
    ELSE 'Zero Balance'
  END,
  ABS(cc.balance_cents) / 100.0
FROM current_credit cc
UNION ALL
SELECT
  '',
  NULL,
  NULL
UNION ALL
SELECT
  'Formula',
  '-$1500 (opening) + orders - payments',
  NULL;

-- Also show detailed order and payment history
SELECT '=== Order History ===' as section;

SELECT
  o.order_number,
  o.order_date,
  o.status,
  o.total_cents / 100.0 as amount_dollars,
  o.created_at
FROM public.happymonday_orders o
INNER JOIN public.happymonday_users u ON o.user_id = u.id
WHERE u.email = 'hello@happymonday.company'
ORDER BY o.order_date, o.created_at;

SELECT '=== Payment History ===' as section;

SELECT
  p.created_at,
  p.payment_type,
  p.amount_cents / 100.0 as amount_dollars,
  p.notes,
  o.order_number
FROM public.happymonday_payments p
INNER JOIN public.happymonday_users u ON p.user_id = u.id
LEFT JOIN public.happymonday_orders o ON p.order_id = o.id
WHERE u.email = 'hello@happymonday.company'
ORDER BY p.created_at;
