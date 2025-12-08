-- Canonical financial snapshot for Happy Monday
-- Computes balance from source data (opening credit + client-authored orders - payments)
-- Optional p_update_balance will rewrite happymonday_credits to the canonical balance

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
  v_requester_role text := COALESCE(auth.jwt() ->> 'role', '');
  v_is_service boolean := v_requester_role = 'service_role';
  v_is_admin boolean := public.is_happymonday_admin();
  v_target_email text;
  v_user_id uuid;
  v_original_stored integer := 0;
  v_opening_credit integer := 150000; -- default $1500 opening credit
  v_stored_balance integer := 0;
  v_client_authored_orders integer := 0;
  v_payment_total integer := 0;
  v_open_invoice_total integer := 0;
  v_closed_invoice_total integer := 0;
  v_open_invoice_count integer := 0;
  v_closed_invoice_count integer := 0;
  v_calculated_balance integer := 0;
  v_balance_drift integer := 0;
BEGIN
  -- Require authentication unless using service role
  IF NOT v_is_service AND v_requester_email = '' THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Determine which email we are allowed to inspect
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

  -- Fetch user and opening balance
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

  v_original_stored := v_stored_balance;

  -- Sum client-authored orders (these immediately impact balance via trigger)
  SELECT
    COALESCE(SUM(CASE WHEN created_by = v_user_id THEN total_cents ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status IN ('unpaid', 'partial') THEN total_cents ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status IN ('paid', 'refunded') THEN total_cents ELSE 0 END), 0),
    COALESCE(COUNT(*) FILTER (WHERE status IN ('unpaid', 'partial')), 0),
    COALESCE(COUNT(*) FILTER (WHERE status IN ('paid', 'refunded')), 0)
  INTO
    v_client_authored_orders,
    v_open_invoice_total,
    v_closed_invoice_total,
    v_open_invoice_count,
    v_closed_invoice_count
  FROM public.happymonday_orders
  WHERE user_id = v_user_id;

  -- Sum all payments (positive = cash received, negative = credit applied)
  SELECT COALESCE(SUM(amount_cents), 0)
  INTO v_payment_total
  FROM public.happymonday_payments
  WHERE user_id = v_user_id;

  -- Canonical balance: opening credit (negative) + client-authored orders - payments
  v_calculated_balance := -v_opening_credit + v_client_authored_orders - v_payment_total;
  v_balance_drift := v_stored_balance - v_calculated_balance;

  -- Optionally rewrite stored balance to canonical value
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
    'client_authored_order_total_cents', v_client_authored_orders,
    'payment_total_cents', v_payment_total,
    'calculated_balance_cents', v_calculated_balance,
    'stored_balance_cents', v_stored_balance,
    'balance_drift_cents', v_balance_drift,
    'stored_balance_before_repair_cents', v_original_stored,
    'open_invoice_total_cents', v_open_invoice_total,
    'closed_invoice_total_cents', v_closed_invoice_total,
    'open_invoice_count', v_open_invoice_count,
    'closed_invoice_count', v_closed_invoice_count
  );
END;
$$;

COMMENT ON FUNCTION public.happymonday_financial_snapshot IS
'Returns a canonical Happy Monday financial snapshot (opening credit + client-authored orders - payments), optionally repairing happymonday_credits.balance_cents.';

GRANT EXECUTE ON FUNCTION public.happymonday_financial_snapshot TO authenticated;
