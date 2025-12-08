-- Quick script to diagnose and fix Happy Monday credit balance
-- Run this in Supabase SQL Editor

-- STEP 1: Show current situation
DO $$
DECLARE
  v_client_id uuid;
  v_current_balance integer;
  v_opening_credit integer := 150000; -- $1500
  v_total_orders integer;
  v_total_payments integer;
  v_correct_balance integer;
  v_difference integer;
BEGIN
  -- Get client
  SELECT id INTO v_client_id FROM happymonday_users WHERE email = 'hello@happymonday.company';

  -- Get current balance
  SELECT balance_cents INTO v_current_balance FROM happymonday_credits WHERE user_id = v_client_id;

  -- Calculate totals
  SELECT COALESCE(SUM(total_cents), 0) INTO v_total_orders FROM happymonday_orders WHERE user_id = v_client_id;
  SELECT COALESCE(SUM(amount_cents), 0) INTO v_total_payments FROM happymonday_payments WHERE user_id = v_client_id;

  -- Calculate what it SHOULD be
  v_correct_balance := -v_opening_credit + v_total_orders - v_total_payments;
  v_difference := v_current_balance - v_correct_balance;

  RAISE NOTICE '==========================================';
  RAISE NOTICE 'HAPPY MONDAY CREDIT BALANCE DIAGNOSIS';
  RAISE NOTICE '==========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Formula: -$1500 (opening) + orders - payments';
  RAISE NOTICE '';
  RAISE NOTICE 'Opening Credit:    -$%', (v_opening_credit / 100.0);
  RAISE NOTICE 'Total Orders:      +$%', (v_total_orders / 100.0);
  RAISE NOTICE 'Total Payments:    -$%', (v_total_payments / 100.0);
  RAISE NOTICE '';
  RAISE NOTICE '----------------------------------------';
  RAISE NOTICE 'Current Balance:   $% %',
    (v_current_balance / 100.0),
    CASE WHEN v_current_balance < 0 THEN '(credit available)' ELSE '(amount owed)' END;
  RAISE NOTICE 'Correct Balance:   $% %',
    (v_correct_balance / 100.0),
    CASE WHEN v_correct_balance < 0 THEN '(credit available)' ELSE '(amount owed)' END;
  RAISE NOTICE '----------------------------------------';
  RAISE NOTICE '';

  IF v_difference = 0 THEN
    RAISE NOTICE '✓ BALANCE IS CORRECT! No fix needed.';
  ELSE
    RAISE NOTICE '✗ BALANCE IS WRONG by $%', ABS(v_difference / 100.0);
    RAISE NOTICE '';
    RAISE NOTICE 'This is likely due to the double-counting bug.';
    RAISE NOTICE 'Run the FIX section below to correct it.';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '==========================================';
END $$;

-- STEP 2: Show detailed breakdown
SELECT '=== ORDER HISTORY ===' as info;

SELECT
  order_number,
  TO_CHAR(order_date, 'YYYY-MM-DD') as date,
  status,
  (total_cents / 100.0) as amount,
  TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') as created
FROM happymonday_orders o
JOIN happymonday_users u ON o.user_id = u.id
WHERE u.email = 'hello@happymonday.company'
ORDER BY order_date, created_at;

SELECT '=== PAYMENT HISTORY ===' as info;

SELECT
  TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') as when_paid,
  payment_type,
  (amount_cents / 100.0) as amount,
  CASE
    WHEN amount_cents < 0 THEN 'Credit Applied'
    WHEN amount_cents > 0 THEN 'Payment Received'
    ELSE 'Zero'
  END as direction,
  notes
FROM happymonday_payments p
JOIN happymonday_users u ON p.user_id = u.id
WHERE u.email = 'hello@happymonday.company'
ORDER BY created_at;

-- STEP 3: FIX THE BALANCE (uncomment to run)
-- After reviewing the output above, if balance is wrong, uncomment this section:

/*
DO $$
DECLARE
  v_client_id uuid;
  v_opening_credit integer := 150000;
  v_total_orders integer;
  v_total_payments integer;
  v_correct_balance integer;
BEGIN
  SELECT id INTO v_client_id FROM happymonday_users WHERE email = 'hello@happymonday.company';
  SELECT COALESCE(SUM(total_cents), 0) INTO v_total_orders FROM happymonday_orders WHERE user_id = v_client_id;
  SELECT COALESCE(SUM(amount_cents), 0) INTO v_total_payments FROM happymonday_payments WHERE user_id = v_client_id;

  v_correct_balance := -v_opening_credit + v_total_orders - v_total_payments;

  UPDATE happymonday_credits
  SET balance_cents = v_correct_balance,
      updated_at = now()
  WHERE user_id = v_client_id;

  RAISE NOTICE '✓ Balance fixed! New balance: $%', (v_correct_balance / 100.0);
END $$;
*/
