-- Add function to update unpaid invoices
-- Allows admin to edit invoice items, totals, notes, and dates
-- Supports negative quantities for credit entries

CREATE OR REPLACE FUNCTION public.update_happymonday_order(
  p_order_id uuid,
  p_items jsonb,
  p_total_cents integer,
  p_notes text,
  p_order_date date,
  p_edited_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order record;
  v_credit record;
  v_old_total integer;
  v_total_difference integer;
BEGIN
  -- Get order details
  SELECT * INTO v_order FROM public.happymonday_orders WHERE id = p_order_id;

  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Check if order is closed
  IF v_order.is_closed = true THEN
    RAISE EXCEPTION 'Cannot edit a closed order';
  END IF;

  -- Check if order is paid or refunded
  IF v_order.status IN ('paid', 'refunded') THEN
    RAISE EXCEPTION 'Cannot edit a % order', v_order.status;
  END IF;

  v_old_total := v_order.total_cents;
  v_total_difference := p_total_cents - v_old_total;

  -- Update the order
  UPDATE public.happymonday_orders
  SET
    items = p_items,
    total_cents = p_total_cents,
    notes = p_notes,
    order_date = p_order_date,
    updated_at = now()
  WHERE id = p_order_id;

  -- If there's a total difference and the order was created by client, adjust credit balance
  IF v_total_difference != 0 AND v_order.created_by = v_order.user_id THEN
    -- Get current credit balance
    SELECT * INTO v_credit FROM public.happymonday_credits WHERE user_id = v_order.user_id;

    IF v_credit IS NOT NULL THEN
      -- Update credit balance to reflect the new total
      UPDATE public.happymonday_credits
      SET
        balance_cents = balance_cents + v_total_difference,
        updated_at = now()
      WHERE user_id = v_order.user_id;
    END IF;
  END IF;

  -- Return summary
  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'old_total', v_old_total,
    'new_total', p_total_cents,
    'total_difference', v_total_difference,
    'success', true
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_happymonday_order TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.update_happymonday_order IS 'Updates an unpaid order with new items, total, notes, and date. Supports negative quantities for credit entries. Only works on unpaid and unclosed orders.';
