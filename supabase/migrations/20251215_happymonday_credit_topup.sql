-- Happy Monday ledger credit top-up: add $1,500 in available credit
-- Inserts a manual credit adjustment so the portal shows the new standing credit.

DO $$
DECLARE
  v_client_id uuid;
  v_admin_id uuid;
  v_note text := 'Standing credit top-up (Dec 2025)';
BEGIN
  SELECT id INTO v_client_id
  FROM public.happymonday_users
  WHERE LOWER(email) = 'hello@happymonday.company';

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Happy Monday client record not found';
  END IF;

  -- Avoid duplicating the same top-up if this migration is re-run.
  IF EXISTS (
    SELECT 1
    FROM public.happymonday_payments
    WHERE user_id = v_client_id
      AND payment_type = 'credit_adjustment'
      AND amount_cents = 150000
      AND notes = v_note
  ) THEN
    RAISE NOTICE 'Credit top-up already exists; skipping insert.';
  ELSE
    SELECT id INTO v_admin_id
    FROM public.happymonday_users
    WHERE role = 'admin'
    ORDER BY created_at ASC
    LIMIT 1;

    INSERT INTO public.happymonday_payments (
      user_id,
      amount_cents,
      payment_type,
      notes,
      processed_by
    ) VALUES (
      v_client_id,
      150000, -- $1,500 credit increase
      'credit_adjustment',
      v_note,
      v_admin_id
    );

    -- Recalculate and repair the stored balance so the UI reflects the new credit immediately.
    PERFORM public.happymonday_financial_snapshot('hello@happymonday.company', true);
  END IF;
END;
$$;
