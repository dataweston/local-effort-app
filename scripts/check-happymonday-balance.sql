-- Happy Monday Credit Balance Diagnostic SQL
-- Run this in Supabase SQL Editor to check the credit system

-- 1. Get current credit balance
SELECT
  'Current Credit Balance' as section,
  u.email,
  u.role,
  c.opening_credit_cents / 100.0 as opening_credit_dollars,
  c.balance_cents / 100.0 as current_balance_dollars,
  CASE
    WHEN c.balance_cents < 0 THEN 'Credit Available: $' || ABS(c.balance_cents / 100.0)
    WHEN c.balance_cents > 0 THEN 'Amount Owed: $' || (c.balance_cents / 100.0)
    ELSE 'Zero Balance'
  END as balance_status,
  c.updated_at as last_updated
FROM happymonday_users u
LEFT JOIN happymonday_credits c ON c.user_id = u.id
WHERE u.email = 'hello@happymonday.company';

-- 2. Show all orders
SELECT
  'All Orders' as section,
  o.order_number,
  o.order_date,
  o.status,
  o.is_closed,
  o.total_cents / 100.0 as amount_dollars,
  CASE 
    WHEN o.created_by = u.id THEN 'CLIENT'
    ELSE 'ADMIN'
  END as created_by_role,
  creator.email as created_by_email,
  o.created_at
FROM happymonday_orders o
JOIN happymonday_users u ON o.user_id = u.id
LEFT JOIN happymonday_users creator ON o.created_by = creator.id
WHERE u.email = 'hello@happymonday.company'
ORDER BY o.order_date, o.created_at;

-- 3. Show all payments
SELECT
  'All Payments' as section,
  p.created_at,
  p.payment_type,
  p.amount_cents / 100.0 as amount_dollars,
  p.notes,
  o.order_number as related_order,
  processor.email as processed_by_email
FROM happymonday_payments p
JOIN happymonday_users u ON p.user_id = u.id
LEFT JOIN happymonday_orders o ON p.order_id = o.id
LEFT JOIN happymonday_users processor ON p.processed_by = processor.id
WHERE u.email = 'hello@happymonday.company'
ORDER BY p.created_at;

-- 4. Calculate what the balance SHOULD be
WITH client AS (
  SELECT id FROM happymonday_users WHERE email = 'hello@happymonday.company'
),
calcs AS (
  SELECT
    -150000 as opening_credit_cents,
    COALESCE((SELECT SUM(total_cents) FROM happymonday_orders WHERE user_id = (SELECT id FROM client) AND created_by = (SELECT id FROM client)), 0) as client_orders_cents,
    COALESCE((SELECT SUM(total_cents) FROM happymonday_orders WHERE user_id = (SELECT id FROM client) AND created_by != (SELECT id FROM client)), 0) as admin_orders_cents,
    COALESCE((SELECT SUM(total_cents) FROM happymonday_orders WHERE user_id = (SELECT id FROM client)), 0) as all_orders_cents,
    COALESCE((SELECT SUM(amount_cents) FROM happymonday_payments WHERE user_id = (SELECT id FROM client)), 0) as payments_cents
)
SELECT
  'Balance Calculation' as section,
  opening_credit_cents / 100.0 as opening_credit_dollars,
  client_orders_cents / 100.0 as client_authored_orders_dollars,
  admin_orders_cents / 100.0 as admin_authored_orders_dollars,
  all_orders_cents / 100.0 as all_orders_dollars,
  payments_cents / 100.0 as payments_dollars,
  (opening_credit_cents + client_orders_cents - payments_cents) / 100.0 as calculated_balance_dollars,
  (SELECT balance_cents / 100.0 FROM happymonday_credits c JOIN client cl ON c.user_id = cl.id) as stored_balance_dollars,
  (
    (SELECT balance_cents FROM happymonday_credits c JOIN client cl ON c.user_id = cl.id) -
    (opening_credit_cents + client_orders_cents - payments_cents)
  ) / 100.0 as drift_dollars
FROM calcs;

-- 5. Test the financial snapshot function (if it exists)
-- If this fails, the function may not be deployed yet
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'happymonday_financial_snapshot'
  ) THEN
    RAISE NOTICE 'Financial snapshot function exists - calling it...';
  ELSE
    RAISE NOTICE 'Financial snapshot function does not exist - skipping';
  END IF;
END $$;

-- Uncomment and run this separately if the function exists:
-- SELECT 'Financial Snapshot Function' as section, *
-- FROM happymonday_financial_snapshot('hello@happymonday.company'::text, false::boolean);

-- 6. Show summary by invoice status
SELECT
  'Summary by Status' as section,
  status,
  COUNT(*) as count,
  SUM(total_cents) / 100.0 as total_dollars
FROM happymonday_orders o
JOIN happymonday_users u ON o.user_id = u.id
WHERE u.email = 'hello@happymonday.company'
GROUP BY status
ORDER BY status;
