-- Happy Monday credit fix: only deduct credit when invoices are closed/paid.
-- This migration does three things:
--   1) Stops order creation from mutating credit balances (credits change when paid, not when drafted).
--   2) Ensures marking an order paid always records the full invoice amount as a credit adjustment.
--   3) Recalculates the stored balance from payments and fixes a short payment on HM-1764880723471.

---------------------------------------------------------------------------------------------------
-- 1) Disable the order-insert balance mutation (was double-counting client-authored invoices)
---------------------------------------------------------------------------------------------------

-- Make the hook a no-op for forward compatibility
CREATE OR REPLACE FUNCTION public.update_credit_balance_after_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Credit is deducted when an invoice is marked paid, not when it is drafted.
  RETURN NEW;
END;
$$;

-- Drop the trigger so new invoices never touch the credit balance on insert
DROP TRIGGER IF EXISTS trigger_update_credit_balance_after_order ON public.happymonday_orders;

---------------------------------------------------------------------------------------------------
-- 2) Mark-as-paid should consume the full invoice total once, regardless of who authored it
---------------------------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.mark_happymonday_order_paid(
  p_order_id uuid,
  p_processed_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order              public.happymonday_orders%ROWTYPE;
  v_credit_before      integer;
  v_credit_used        integer;
  v_amount_remaining   integer;
  v_new_balance        integer;
BEGIN
  SELECT * INTO v_order FROM public.happymonday_orders WHERE id = p_order_id;
  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  IF v_order.status = 'paid' THEN
    RAISE EXCEPTION 'Order is already paid';
  END IF;

  -- Snapshot balance before we apply this invoice
  SELECT balance_cents INTO v_credit_before
  FROM public.happymonday_credits
  WHERE user_id = v_order.user_id
  FOR UPDATE;

  IF v_credit_before IS NULL THEN
    INSERT INTO public.happymonday_credits (user_id, balance_cents, opening_credit_cents)
    VALUES (v_order.user_id, 0, 150000)
    ON CONFLICT (user_id) DO NOTHING;
    v_credit_before := 0;
  END IF;

  -- Record a credit adjustment for the full invoice amount (negative = consume credit)
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
    -v_order.total_cents,
    'credit_adjustment',
    'Credit applied to order ' || v_order.order_number,
    p_processed_by
  );

  -- Close the invoice
  UPDATE public.happymonday_orders
  SET status = 'paid',
      is_closed = true,
      updated_at = now()
  WHERE id = p_order_id;

  -- Balance after the payment trigger has run
  SELECT balance_cents INTO v_new_balance
  FROM public.happymonday_credits
  WHERE user_id = v_order.user_id;

  -- How much of this invoice was covered by credit vs now owed
  v_credit_used := LEAST(v_order.total_cents, GREATEST(ABS(v_credit_before), 0));
  v_amount_remaining := GREATEST(v_credit_before + v_order.total_cents, 0);

  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'order_total', v_order.total_cents,
    'credit_used', v_credit_used,
    'amount_remaining', v_amount_remaining,
    'new_credit_balance', v_new_balance
  );
END;
$$;

COMMENT ON FUNCTION public.mark_happymonday_order_paid IS
'Marks order as paid, records a single credit adjustment for the full invoice amount, and closes the invoice.';

GRANT EXECUTE ON FUNCTION public.mark_happymonday_order_paid TO authenticated;

---------------------------------------------------------------------------------------------------
-- 3) Canonical snapshot: opening credit + payments (credit adjustments are negative amounts)
---------------------------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.happymonday_financial_snapshot(
  p_user_email text DEFAULT NULL,
  p_update_balance boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requester_email text := LOWER(COALESCE(auth.jwt() ->> 'email', ''));
  v_requester_role  text := COALESCE(auth.jwt() ->> 'role', '');
  v_is_service      boolean := v_requester_role = 'service_role';
  v_is_admin        boolean := public.is_happymonday_admin();
  v_target_email    text;
  v_user_id         uuid;
  v_opening_credit  integer := 150000;
  v_stored_balance  integer := 0;
  v_payment_total   integer := 0;
  v_open_invoice_total   integer := 0;
  v_closed_invoice_total integer := 0;
  v_open_invoice_count   integer := 0;
  v_closed_invoice_count integer := 0;
  v_calculated_balance   integer := 0;
  v_balance_drift        integer := 0;
BEGIN
  IF NOT v_is_service AND v_requester_email = '' THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_is_service THEN
    v_target_email := LOWER(COALESCE(p_user_email, 'hello@happymonday.company'));
  ELSIF v_is_admin THEN
    v_target_email := LOWER(COALESCE(p_user_email, v_requester_email));
  ELSE
    v_target_email := LOWER(COALESCE(p_user_email, v_requester_email));
    IF v_target_email != v_requester_email THEN
      RAISE EXCEPTION 'Not authorized to view other users';
    END IF;
  END IF;

  SELECT
    u.id,
    COALESCE(c.opening_credit_cents, 150000) AS opening_credit_cents,
    COALESCE(c.balance_cents, -COALESCE(c.opening_credit_cents, 150000)) AS stored_balance_cents
  INTO v_user_id, v_opening_credit, v_stored_balance
  FROM public.happymonday_users u
  LEFT JOIN public.happymonday_credits c ON c.user_id = u.id
  WHERE LOWER(u.email) = v_target_email;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Happy Monday user not found for %', v_target_email;
  END IF;

  -- Payments are the single source of truth for balance changes.
  SELECT COALESCE(SUM(amount_cents), 0)
  INTO v_payment_total
  FROM public.happymonday_payments
  WHERE user_id = v_user_id;

  -- Invoice breakdown for UI
  SELECT
    COALESCE(SUM(CASE WHEN status IN ('unpaid', 'partial') THEN total_cents ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status IN ('paid', 'refunded') THEN total_cents ELSE 0 END), 0),
    COALESCE(COUNT(*) FILTER (WHERE status IN ('unpaid', 'partial')), 0),
    COALESCE(COUNT(*) FILTER (WHERE status IN ('paid', 'refunded')), 0)
  INTO
    v_open_invoice_total,
    v_closed_invoice_total,
    v_open_invoice_count,
    v_closed_invoice_count
  FROM public.happymonday_orders
  WHERE user_id = v_user_id;

  -- Canonical balance: opening credit (negative) plus all payments
  v_calculated_balance := -v_opening_credit - v_payment_total;
  v_balance_drift := v_stored_balance - v_calculated_balance;

  IF p_update_balance AND v_stored_balance IS DISTINCT FROM v_calculated_balance THEN
    INSERT INTO public.happymonday_credits (user_id, balance_cents, opening_credit_cents, updated_at)
    VALUES (v_user_id, v_calculated_balance, v_opening_credit, now())
    ON CONFLICT (user_id) DO UPDATE
      SET balance_cents = EXCLUDED.balance_cents,
          opening_credit_cents = EXCLUDED.opening_credit_cents,
          updated_at = now();
    v_stored_balance := v_calculated_balance;
  END IF;

  RETURN jsonb_build_object(
    'user_id', v_user_id,
    'opening_credit_cents', v_opening_credit,
    'payment_total_cents', v_payment_total,
    'calculated_balance_cents', v_calculated_balance,
    'stored_balance_cents', v_stored_balance,
    'balance_drift_cents', v_balance_drift,
    'open_invoice_total_cents', v_open_invoice_total,
    'closed_invoice_total_cents', v_closed_invoice_total,
    'open_invoice_count', v_open_invoice_count,
    'closed_invoice_count', v_closed_invoice_count
  );
END;
$$;

COMMENT ON FUNCTION public.happymonday_financial_snapshot IS
'Returns a canonical Happy Monday financial snapshot based on payments (opening credit + payments), optionally repairing happymonday_credits.balance_cents.';

GRANT EXECUTE ON FUNCTION public.happymonday_financial_snapshot TO authenticated;

---------------------------------------------------------------------------------------------------
-- 4) Data repair: true-up the short payment and recalc stored balance
---------------------------------------------------------------------------------------------------

-- Fix the short payment on HM-1764880723471 (missing $14.40)
UPDATE public.happymonday_payments p
SET amount_cents = -19380
WHERE p.order_id = (
  SELECT id FROM public.happymonday_orders WHERE order_number = 'HM-1764880723471'
) AND p.amount_cents = -17940;

-- Recalculate the stored balance from the canonical formula
SELECT public.happymonday_financial_snapshot('hello@happymonday.company', true);
