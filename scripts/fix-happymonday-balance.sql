-- Happy Monday Balance Repair Script
-- This will fix the balance drift issue

-- STEP 1: Show what's currently wrong
WITH client AS (
  SELECT id FROM happymonday_users WHERE email = 'hello@happymonday.company'
)
SELECT 
  '❌ CURRENT PROBLEM' as status,
  (SELECT balance_cents / 100.0 FROM happymonday_credits WHERE user_id = (SELECT id FROM client)) as current_stored_balance,
  'Should be: -$593.70 (credit available)' as correct_balance,
  'Showing: $222.60 (amount owed) - WRONG!' as problem;

-- STEP 2: Recalculate and fix the balance
WITH client AS (
  SELECT id FROM happymonday_users WHERE email = 'hello@happymonday.company'
),
correct_calculation AS (
  SELECT
    -150000 as opening_credit_cents,
    COALESCE((
      SELECT SUM(total_cents) 
      FROM happymonday_orders 
      WHERE user_id = (SELECT id FROM client) 
      AND created_by = (SELECT id FROM client)
    ), 0) as client_orders_cents,
    COALESCE((
      SELECT SUM(amount_cents) 
      FROM happymonday_payments 
      WHERE user_id = (SELECT id FROM client)
    ), 0) as payment_cents
)
UPDATE happymonday_credits
SET 
  balance_cents = (
    SELECT opening_credit_cents + client_orders_cents - payment_cents
    FROM correct_calculation
  ),
  updated_at = now()
WHERE user_id = (SELECT id FROM client);

-- STEP 3: Verify the fix
WITH client AS (
  SELECT id FROM happymonday_users WHERE email = 'hello@happymonday.company'
)
SELECT 
  '✅ AFTER FIX' as status,
  balance_cents / 100.0 as new_balance_dollars,
  CASE 
    WHEN balance_cents < 0 THEN 'Credit Available: $' || ABS(balance_cents / 100.0)
    WHEN balance_cents > 0 THEN 'Amount Owed: $' || (balance_cents / 100.0)
    ELSE 'Zero Balance'
  END as balance_status,
  opening_credit_cents / 100.0 as opening_credit,
  updated_at
FROM happymonday_credits
WHERE user_id = (SELECT id FROM client);

-- STEP 4: Show order breakdown to verify
WITH client AS (
  SELECT id FROM happymonday_users WHERE email = 'hello@happymonday.company'
)
SELECT
  '📋 VERIFICATION' as section,
  COUNT(*) as total_orders,
  COUNT(*) FILTER (WHERE created_by = (SELECT id FROM client)) as client_authored,
  COUNT(*) FILTER (WHERE created_by != (SELECT id FROM client)) as admin_authored,
  SUM(CASE WHEN created_by = (SELECT id FROM client) THEN total_cents ELSE 0 END) / 100.0 as client_orders_total,
  SUM(CASE WHEN created_by != (SELECT id FROM client) THEN total_cents ELSE 0 END) / 100.0 as admin_orders_total
FROM happymonday_orders
WHERE user_id = (SELECT id FROM client);
