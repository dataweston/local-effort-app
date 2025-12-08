-- STEP 1: Show the current situation
DO $$
DECLARE
  v_client_id uuid;
  v_current_balance integer;
  v_total_orders integer;
  v_total_payments integer;
  v_total_credit_adjustments integer;
  v_correct_balance integer;
BEGIN
  SELECT id INTO v_client_id FROM happymonday_users WHERE email = 'hello@happymonday.company';
  SELECT balance_cents INTO v_current_balance FROM happymonday_credits WHERE user_id = v_client_id;
  SELECT COALESCE(SUM(total_cents), 0) INTO v_total_orders FROM happymonday_orders WHERE user_id = v_client_id;
  SELECT COALESCE(SUM(amount_cents), 0) INTO v_total_payments FROM happymonday_payments WHERE user_id = v_client_id;
  SELECT COALESCE(SUM(amount_cents), 0) INTO v_total_credit_adjustments
    FROM happymonday_payments WHERE user_id = v_client_id AND payment_type = 'credit_adjustment';

  v_correct_balance := -150000 + v_total_orders - v_total_payments;

  RAISE NOTICE '==============================================';
  RAISE NOTICE 'HAPPY MONDAY CREDIT BALANCE - BEFORE FIX';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Opening Credit:           -$1500.00';
  RAISE NOTICE 'Total Orders:             +$%', (v_total_orders / 100.0);
  RAISE NOTICE 'Total Payments:           -$%', (v_total_payments / 100.0);
  RAISE NOTICE '  (of which credit adj:    $%)', (v_total_credit_adjustments / 100.0);
  RAISE NOTICE '';
  RAISE NOTICE 'Current Balance (DB):     $%', (v_current_balance / 100.0);
  RAISE NOTICE 'Should Be:                $%', (v_correct_balance / 100.0);
  RAISE NOTICE 'Error Amount:             $%', ((v_current_balance - v_correct_balance) / 100.0);
  RAISE NOTICE '';
  RAISE NOTICE 'If error = total credit adj, then YES - double counting bug!';
  RAISE NOTICE '==============================================';
END $$;

-- STEP 2: FIX THE BALANCE
DO $$
DECLARE
  v_client_id uuid;
  v_old_balance integer;
  v_correct_balance integer;
  v_total_orders integer;
  v_total_payments integer;
BEGIN
  SELECT id INTO v_client_id FROM happymonday_users WHERE email = 'hello@happymonday.company';
  SELECT balance_cents INTO v_old_balance FROM happymonday_credits WHERE user_id = v_client_id;
  SELECT COALESCE(SUM(total_cents), 0) INTO v_total_orders FROM happymonday_orders WHERE user_id = v_client_id;
  SELECT COALESCE(SUM(amount_cents), 0) INTO v_total_payments FROM happymonday_payments WHERE user_id = v_client_id;

  v_correct_balance := -150000 + v_total_orders - v_total_payments;

  UPDATE happymonday_credits
  SET balance_cents = v_correct_balance,
      updated_at = now()
  WHERE user_id = v_client_id;

  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'BALANCE FIXED!';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Old Balance:    $%', (v_old_balance / 100.0);
  RAISE NOTICE 'New Balance:    $%', (v_correct_balance / 100.0);
  RAISE NOTICE 'Adjustment:     $%', ((v_correct_balance - v_old_balance) / 100.0);
  RAISE NOTICE '';
  RAISE NOTICE '%',
    CASE
      WHEN v_correct_balance < 0 THEN 'Client has $' || ABS(v_correct_balance / 100.0) || ' in credit available'
      WHEN v_correct_balance > 0 THEN 'Client owes $' || (v_correct_balance / 100.0)
      ELSE 'Balance is zero - all settled'
    END;
  RAISE NOTICE '';
  RAISE NOTICE 'Refresh the frontend to see the corrected balance!';
  RAISE NOTICE '==============================================';
END $$;
