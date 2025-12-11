-- Happy Monday Credit Balance Diagnostic SQL (Simple Version)
-- Run this in Supabase SQL Editor to check the credit system
-- This version avoids function calls and uses only basic queries

-- ============================================================================
-- SECTION 1: Current Credit Balance
-- ============================================================================
SELECT
  '1. CURRENT CREDIT BALANCE' as section,
  u.email,
  u.role,
  COALESCE(c.opening_credit_cents, 0) / 100.0 as opening_credit_dollars,
  COALESCE(c.balance_cents, 0) / 100.0 as current_balance_dollars,
  CASE
    WHEN COALESCE(c.balance_cents, 0) < 0 THEN 'Credit Available: $' || ABS(c.balance_cents / 100.0)
    WHEN COALESCE(c.balance_cents, 0) > 0 THEN 'Amount Owed: $' || (c.balance_cents / 100.0)
    ELSE 'Zero Balance'
  END as balance_status,
  c.updated_at as last_updated
FROM happymonday_users u
LEFT JOIN happymonday_credits c ON c.user_id = u.id
WHERE u.email = 'hello@happymonday.company';

-- ============================================================================
-- SECTION 2: All Orders (with details)
-- ============================================================================
SELECT
  '2. ALL ORDERS' as section,
  o.order_number,
  o.order_date,
  o.status,
  COALESCE(o.is_closed, false) as is_closed,
  o.total_cents / 100.0 as amount_dollars,
  CASE 
    WHEN o.created_by = u.id THEN 'CLIENT (counts toward balance)'
    ELSE 'ADMIN (does NOT count)'
  END as created_by_role,
  creator.email as created_by_email,
  o.created_at
FROM happymonday_orders o
JOIN happymonday_users u ON o.user_id = u.id
LEFT JOIN happymonday_users creator ON o.created_by = creator.id
WHERE u.email = 'hello@happymonday.company'
ORDER BY o.order_date DESC, o.created_at DESC;

-- ============================================================================
-- SECTION 3: All Payments
-- ============================================================================
SELECT
  '3. ALL PAYMENTS' as section,
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
ORDER BY p.created_at DESC;

-- ============================================================================
-- SECTION 4: Balance Calculation (THE IMPORTANT ONE!)
-- ============================================================================
WITH client AS (
  SELECT id FROM happymonday_users WHERE email = 'hello@happymonday.company'
),
stored AS (
  SELECT 
    COALESCE(c.opening_credit_cents, 150000) as opening_credit_cents,
    COALESCE(c.balance_cents, -150000) as stored_balance_cents
  FROM happymonday_credits c
  WHERE c.user_id = (SELECT id FROM client)
),
orders AS (
  SELECT
    COALESCE(SUM(CASE WHEN created_by = (SELECT id FROM client) THEN total_cents ELSE 0 END), 0) as client_orders_cents,
    COALESCE(SUM(CASE WHEN created_by != (SELECT id FROM client) OR created_by IS NULL THEN total_cents ELSE 0 END), 0) as admin_orders_cents,
    COALESCE(SUM(total_cents), 0) as all_orders_cents,
    COUNT(*) as total_order_count,
    COUNT(*) FILTER (WHERE created_by = (SELECT id FROM client)) as client_order_count,
    COUNT(*) FILTER (WHERE created_by != (SELECT id FROM client) OR created_by IS NULL) as admin_order_count
  FROM happymonday_orders
  WHERE user_id = (SELECT id FROM client)
),
payments AS (
  SELECT
    COALESCE(SUM(amount_cents), 0) as payments_cents,
    COUNT(*) as payment_count
  FROM happymonday_payments
  WHERE user_id = (SELECT id FROM client)
)
SELECT
  '4. BALANCE CALCULATION' as section,
  s.opening_credit_cents / 100.0 as "A. Opening Credit",
  o.client_orders_cents / 100.0 as "B. Client Orders (trigger updates balance)",
  o.admin_orders_cents / 100.0 as "C. Admin Orders (no trigger)",
  p.payments_cents / 100.0 as "D. Total Payments",
  '-------' as separator,
  (-s.opening_credit_cents + o.client_orders_cents - p.payments_cents) / 100.0 as "CALCULATED Balance (should be)",
  s.stored_balance_cents / 100.0 as "STORED Balance (what DB has)",
  (s.stored_balance_cents - (-s.opening_credit_cents + o.client_orders_cents - p.payments_cents)) / 100.0 as "❗DRIFT (difference)",
  '-------' as separator2,
  o.total_order_count as "Total Orders",
  o.client_order_count as "Client Orders",
  o.admin_order_count as "Admin Orders",
  p.payment_count as "Payments"
FROM stored s, orders o, payments p;

-- ============================================================================
-- SECTION 5: Summary by Status
-- ============================================================================
SELECT
  '5. ORDERS BY STATUS' as section,
  status,
  COUNT(*) as count,
  SUM(total_cents) / 100.0 as total_dollars,
  SUM(CASE WHEN created_by = u.id THEN total_cents ELSE 0 END) / 100.0 as client_orders_dollars,
  SUM(CASE WHEN created_by != u.id OR created_by IS NULL THEN total_cents ELSE 0 END) / 100.0 as admin_orders_dollars
FROM happymonday_orders o
JOIN happymonday_users u ON o.user_id = u.id
WHERE u.email = 'hello@happymonday.company'
GROUP BY status
ORDER BY status;

-- ============================================================================
-- SECTION 6: Check for Issues
-- ============================================================================
WITH client AS (
  SELECT id FROM happymonday_users WHERE email = 'hello@happymonday.company'
)
SELECT
  '6. POTENTIAL ISSUES' as section,
  CASE
    WHEN (SELECT COUNT(*) FROM happymonday_orders WHERE user_id = (SELECT id FROM client) AND status = 'paid' AND is_closed = false) > 0
    THEN '⚠️ Found ' || (SELECT COUNT(*) FROM happymonday_orders WHERE user_id = (SELECT id FROM client) AND status = 'paid' AND is_closed = false)::text || ' paid orders that are NOT marked as closed'
    ELSE '✅ All paid orders are properly closed'
  END as issue_1,
  CASE
    WHEN (SELECT COUNT(*) FROM happymonday_orders o WHERE o.user_id = (SELECT id FROM client) AND o.status = 'paid' AND NOT EXISTS (SELECT 1 FROM happymonday_payments p WHERE p.order_id = o.id)) > 0
    THEN '⚠️ Found ' || (SELECT COUNT(*) FROM happymonday_orders o WHERE o.user_id = (SELECT id FROM client) AND o.status = 'paid' AND NOT EXISTS (SELECT 1 FROM happymonday_payments p WHERE p.order_id = o.id))::text || ' paid orders with NO payment records'
    ELSE '✅ All paid orders have payment records'
  END as issue_2,
  CASE
    WHEN NOT EXISTS (SELECT 1 FROM happymonday_credits WHERE user_id = (SELECT id FROM client))
    THEN '❌ NO credit record found for client!'
    ELSE '✅ Credit record exists'
  END as issue_3;

-- ============================================================================
-- INSTRUCTIONS
-- ============================================================================
-- Look at SECTION 4 "BALANCE CALCULATION" - the DRIFT column is key!
-- 
-- If DRIFT is NOT zero, the stored balance is wrong. The balance formula is:
--   Balance = -Opening Credit + Client Orders - Payments
--
-- Note: Only CLIENT-authored orders affect balance via trigger
--       ADMIN-authored orders do NOT trigger balance updates
-- ============================================================================
