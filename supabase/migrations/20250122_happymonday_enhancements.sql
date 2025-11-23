-- Happy Monday Portal Enhancements
-- Adds invoice audit history, editable flag, and improved payment handling

-- Table: happymonday_order_history
-- Tracks all changes to orders before they are closed
CREATE TABLE IF NOT EXISTS public.happymonday_order_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.happymonday_orders(id) ON DELETE CASCADE,
  edited_by uuid REFERENCES public.happymonday_users(id) ON DELETE SET NULL,
  field_name text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz DEFAULT now()
);

-- Add closed flag to orders (once closed, can't be edited)
ALTER TABLE public.happymonday_orders 
ADD COLUMN IF NOT EXISTS is_closed boolean DEFAULT false;

-- Add index for order history
CREATE INDEX IF NOT EXISTS idx_happymonday_order_history_order_id 
  ON public.happymonday_order_history(order_id);
CREATE INDEX IF NOT EXISTS idx_happymonday_order_history_created_at 
  ON public.happymonday_order_history(created_at DESC);

-- Function to track order edits
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

-- Create trigger for order edits
DROP TRIGGER IF EXISTS track_order_edits ON public.happymonday_orders;
CREATE TRIGGER track_order_edits
  BEFORE UPDATE ON public.happymonday_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.track_happymonday_order_edit();

-- Function to mark order as paid and apply credits
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
    
    -- Update credit balance (reduce negative balance or increase positive)
    UPDATE public.happymonday_credits
    SET balance_cents = balance_cents + v_credit_used,
        updated_at = now()
    WHERE user_id = v_order.user_id;
    
    -- Record the credit usage as a payment
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
  
  -- Return summary
  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'order_total', v_order.total_cents,
    'credit_used', v_credit_used,
    'amount_remaining', v_amount_to_pay,
    'new_credit_balance', v_credit.balance_cents + v_credit_used
  );
END;
$$;

-- RLS policies for order history
ALTER TABLE public.happymonday_order_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view history for their orders"
  ON public.happymonday_order_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.happymonday_orders o
      JOIN public.happymonday_users u ON o.user_id = u.id
      WHERE o.id = order_id
      AND LOWER(u.email) = LOWER(auth.jwt() ->> 'email')
    )
  );

CREATE POLICY "Admins can view all order history"
  ON public.happymonday_order_history FOR SELECT
  USING (public.is_happymonday_admin());

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.mark_happymonday_order_paid TO authenticated;

-- Add comment
COMMENT ON TABLE public.happymonday_order_history IS 'Audit log for all order edits before they are closed';
COMMENT ON FUNCTION public.mark_happymonday_order_paid IS 'Marks order as paid, applies available credits, and closes the order';
