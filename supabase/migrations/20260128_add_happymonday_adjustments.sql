-- Add adjustments column and support custom credit line items on invoices

ALTER TABLE public.happymonday_orders
ADD COLUMN IF NOT EXISTS adjustments jsonb NOT NULL DEFAULT '[]';

COMMENT ON COLUMN public.happymonday_orders.adjustments IS 'Custom line items/credits: [{id, description, amount_cents}]';

-- Track adjustments in order history
CREATE OR REPLACE FUNCTION public.track_happymonday_order_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only track changes if order is not closed
  IF OLD.is_closed = false THEN
    -- Track total_cents changes
    IF OLD.total_cents != NEW.total_cents THEN
      INSERT INTO public.happymonday_order_history (order_id, edited_by, field_name, old_value, new_value)
      VALUES (NEW.id, NEW.created_by, 'total_cents', to_jsonb(OLD.total_cents), to_jsonb(NEW.total_cents));
    END IF;

    -- Track items changes
    IF OLD.items::text != NEW.items::text THEN
      INSERT INTO public.happymonday_order_history (order_id, edited_by, field_name, old_value, new_value)
      VALUES (NEW.id, NEW.created_by, 'items', OLD.items, NEW.items);
    END IF;

    -- Track adjustments changes
    IF OLD.adjustments::text != NEW.adjustments::text THEN
      INSERT INTO public.happymonday_order_history (order_id, edited_by, field_name, old_value, new_value)
      VALUES (NEW.id, NEW.created_by, 'adjustments', OLD.adjustments, NEW.adjustments);
    END IF;

    -- Track notes changes
    IF (OLD.notes IS DISTINCT FROM NEW.notes) THEN
      INSERT INTO public.happymonday_order_history (order_id, edited_by, field_name, old_value, new_value)
      VALUES (NEW.id, NEW.created_by, 'notes', to_jsonb(OLD.notes), to_jsonb(NEW.notes));
    END IF;

    -- Track order_date changes
    IF OLD.order_date != NEW.order_date THEN
      INSERT INTO public.happymonday_order_history (order_id, edited_by, field_name, old_value, new_value)
      VALUES (NEW.id, NEW.created_by, 'order_date', to_jsonb(OLD.order_date), to_jsonb(NEW.order_date));
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Update order editing function to include adjustments
CREATE OR REPLACE FUNCTION public.update_happymonday_order(
  p_order_id uuid,
  p_items jsonb,
  p_adjustments jsonb,
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
    adjustments = COALESCE(p_adjustments, '[]'::jsonb),
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

GRANT EXECUTE ON FUNCTION public.update_happymonday_order TO authenticated;

COMMENT ON FUNCTION public.update_happymonday_order IS 'Updates an unpaid order with new items, adjustments, total, notes, and date. Supports negative quantities and custom adjustments.';
