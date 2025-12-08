-- Fix for credit double-counting bug
-- This migration fixes the mark_happymonday_order_paid function to prevent
-- double-counting of credit adjustments

-- Update the function to remove manual balance update
CREATE OR REPLACE FUNCTION public.mark_happymonday_order_paid(
  p_order_id uuid,
  p_processed_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order record;
  v_credit record;
  v_amount_to_pay integer;
  v_credit_used integer;
  v_remaining_credit integer;
BEGIN
  -- Get order details
  SELECT * INTO v_order FROM public.happymonday_orders WHERE id = p_order_id;

  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.status = 'paid' THEN
    RAISE EXCEPTION 'Order is already paid';
  END IF;

  -- Get current credit balance
  SELECT * INTO v_credit FROM public.happymonday_credits WHERE user_id = v_order.user_id;

  IF v_credit IS NULL THEN
    -- No credit record, create one
    INSERT INTO public.happymonday_credits (user_id, balance_cents, opening_credit_cents)
    VALUES (v_order.user_id, 0, 0)
    RETURNING * INTO v_credit;
  END IF;

  v_amount_to_pay := v_order.total_cents;
  v_credit_used := 0;

  -- If user has available credit (negative balance), apply it
  IF v_credit.balance_cents < 0 THEN
    v_credit_used := LEAST(ABS(v_credit.balance_cents), v_amount_to_pay);
    v_amount_to_pay := v_amount_to_pay - v_credit_used;

    -- Record the credit usage as a payment
    -- Note: The trigger_update_credit_balance_after_payment will automatically
    -- update the balance when this payment record is inserted
    INSERT INTO public.happymonday_payments (
      user_id,
      order_id,
      amount_cents,
      payment_type,
      notes,
      processed_by
    ) VALUES (
      v_order.user_id,
      p_order_id,
      -v_credit_used, -- negative because it's reducing what they owe
      'credit_adjustment',
      'Credit applied to order ' || v_order.order_number,
      p_processed_by
    );
  END IF;

  -- Update order status
  UPDATE public.happymonday_orders
  SET status = 'paid',
      is_closed = true,
      updated_at = now()
  WHERE id = p_order_id;

  -- Get the updated credit balance (after the payment trigger has run)
  SELECT balance_cents INTO v_credit FROM public.happymonday_credits WHERE user_id = v_order.user_id;

  -- Return summary
  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'order_total', v_order.total_cents,
    'credit_used', v_credit_used,
    'amount_remaining', v_amount_to_pay,
    'new_credit_balance', v_credit.balance_cents
  );
END;
$$;

-- Optional: Recalculate credit balance from scratch for Happy Monday client
-- This will fix any existing double-counting issues
-- Uncomment if you want to reset the credit balance based on actual transactions

/*
DO $$
DECLARE
  v_client_id uuid;
  v_opening_credit integer := 150000; -- $1500 opening credit
  v_total_orders integer;
  v_total_payments integer;
  v_correct_balance integer;
BEGIN
  -- Get Happy Monday client ID
  SELECT id INTO v_client_id FROM public.happymonday_users
  WHERE email = 'hello@happymonday.company';

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Happy Monday client not found';
  END IF;

  -- Calculate total from all orders created by client
  SELECT COALESCE(SUM(total_cents), 0) INTO v_total_orders
  FROM public.happymonday_orders
  WHERE user_id = v_client_id;

  -- Calculate total payments (should be negative for credits applied)
  SELECT COALESCE(SUM(amount_cents), 0) INTO v_total_payments
  FROM public.happymonday_payments
  WHERE user_id = v_client_id;

  -- Calculate correct balance
  -- Starting with negative credit, add orders, subtract payments
  v_correct_balance := -v_opening_credit + v_total_orders - v_total_payments;

  -- Update the credit balance
  UPDATE public.happymonday_credits
  SET balance_cents = v_correct_balance,
      updated_at = now()
  WHERE user_id = v_client_id;

  RAISE NOTICE 'Credit balance recalculated:';
  RAISE NOTICE '  Opening credit: $%', (v_opening_credit / 100.0);
  RAISE NOTICE '  Total orders: $%', (v_total_orders / 100.0);
  RAISE NOTICE '  Total payments: $%', (v_total_payments / 100.0);
  RAISE NOTICE '  Correct balance: $%', (v_correct_balance / 100.0);
  RAISE NOTICE '  Balance type: %', CASE WHEN v_correct_balance < 0 THEN 'Credit Available' ELSE 'Amount Owed' END;
END $$;
*/

COMMENT ON FUNCTION public.mark_happymonday_order_paid IS
'Marks order as paid, applies available credits, and closes the order.
Credit balance is updated automatically by the payment trigger to prevent double-counting.';
