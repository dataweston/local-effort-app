-- Fix RLS policies for Happy Monday portal
-- This ensures both admin and client can see ALL orders in this customer-provider relationship

-- Drop existing order policies
DROP POLICY IF EXISTS "Users can view their own orders" ON public.happymonday_orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.happymonday_orders;

-- Create new unified policy that allows both users to see all orders
-- Since this is a single customer-provider relationship, all orders should be visible to both parties
CREATE POLICY "Happy Monday users can view all orders"
  ON public.happymonday_orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.happymonday_users
      WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email')
    )
  );

-- Admin can still update orders
CREATE POLICY "Admins can update orders"
  ON public.happymonday_orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.happymonday_users
      WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email') AND role = 'admin'
    )
  );

-- Comment explaining the change
COMMENT ON POLICY "Happy Monday users can view all orders" ON public.happymonday_orders IS 
  'Allows both admin and client users to view all orders since this is a single customer-provider portal';
