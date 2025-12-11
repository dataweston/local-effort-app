-- Single Query Diagnosis for Happy Monday Credit System
-- This will show everything in ONE result set

WITH client AS (
  SELECT id FROM happymonday_users WHERE email = 'hello@happymonday.company'
),
current_state AS (
  SELECT 
    c.opening_credit_cents,
    c.balance_cents as stored_balance_cents
  FROM happymonday_credits c
  WHERE c.user_id = (SELECT id FROM client)
),
order_totals AS (
  SELECT
    COUNT(*) as total_orders,
    SUM(CASE WHEN created_by = (SELECT id FROM client) THEN total_cents ELSE 0 END) as client_orders_cents,
    SUM(CASE WHEN created_by != (SELECT id FROM client) OR created_by IS NULL THEN total_cents ELSE 0 END) as admin_orders_cents,
    SUM(CASE WHEN status = 'paid' THEN total_cents ELSE 0 END) as paid_orders_cents,
    SUM(CASE WHEN status = 'unpaid' THEN total_cents ELSE 0 END) as unpaid_orders_cents
  FROM happymonday_orders
  WHERE user_id = (SELECT id FROM client)
),
payment_totals AS (
  SELECT
    COUNT(*) as total_payments,
    SUM(amount_cents) as payment_cents
  FROM happymonday_payments
  WHERE user_id = (SELECT id FROM client)
)
SELECT
  '🏦 CREDIT SYSTEM DIAGNOSIS' as "══════════════════════",
  
  -- Current stored values
  cs.opening_credit_cents / 100.0 as "1️⃣ Opening Credit $",
  cs.stored_balance_cents / 100.0 as "2️⃣ Stored Balance $ (what frontend shows)",
  CASE 
    WHEN cs.stored_balance_cents < 0 THEN 'CREDIT AVAILABLE'
    WHEN cs.stored_balance_cents > 0 THEN 'AMOUNT OWED'
    ELSE 'ZERO'
  END as "   Balance Type",
  
  '---' as "─────────────",
  
  -- Order breakdown
  ot.total_orders as "3️⃣ Total Orders",
  ot.client_orders_cents / 100.0 as "4️⃣ Client Orders $ (affects balance)",
  ot.admin_orders_cents / 100.0 as "5️⃣ Admin Orders $ (does NOT affect)",
  ot.paid_orders_cents / 100.0 as "6️⃣ Paid Orders $",
  ot.unpaid_orders_cents / 100.0 as "7️⃣ Unpaid Orders $",
  
  '---' as "──────────────",
  
  -- Payments
  pt.total_payments as "8️⃣ Total Payments",
  pt.payment_cents / 100.0 as "9️⃣ Payment Total $",
  
  '---' as "───────────────",
  
  -- THE CRITICAL CALCULATION
  (-cs.opening_credit_cents + ot.client_orders_cents - pt.payment_cents) / 100.0 as "🧮 CALCULATED Balance $ (should be)",
  cs.stored_balance_cents / 100.0 as "💾 STORED Balance $ (what DB has)",
  (cs.stored_balance_cents - (-cs.opening_credit_cents + ot.client_orders_cents - pt.payment_cents)) / 100.0 as "⚠️ DRIFT $ (DIFFERENCE)",
  
  '---' as "────────────────",
  
  -- What it means
  CASE
    WHEN (cs.stored_balance_cents - (-cs.opening_credit_cents + ot.client_orders_cents - pt.payment_cents)) = 0 
    THEN '✅ Balance is CORRECT'
    WHEN (cs.stored_balance_cents - (-cs.opening_credit_cents + ot.client_orders_cents - pt.payment_cents)) > 0
    THEN '❌ Stored balance is TOO HIGH by $' || ABS((cs.stored_balance_cents - (-cs.opening_credit_cents + ot.client_orders_cents - pt.payment_cents)) / 100.0)::text
    ELSE '❌ Stored balance is TOO LOW by $' || ABS((cs.stored_balance_cents - (-cs.opening_credit_cents + ot.client_orders_cents - pt.payment_cents)) / 100.0)::text
  END as "📊 DIAGNOSIS"

FROM current_state cs, order_totals ot, payment_totals pt;
