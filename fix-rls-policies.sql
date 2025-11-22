-- Fix Happy Monday RLS policies to be case-insensitive
-- This solves the issue where Google OAuth emails don't match database emails due to case differences

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own record" ON public.happymonday_users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.happymonday_users;
DROP POLICY IF EXISTS "Users can view their own credits" ON public.happymonday_credits;
DROP POLICY IF EXISTS "Admins can view all credits" ON public.happymonday_credits;
DROP POLICY IF EXISTS "Admins can update credits" ON public.happymonday_credits;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.happymonday_orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.happymonday_orders;
DROP POLICY IF EXISTS "Authenticated users can create orders" ON public.happymonday_orders;
DROP POLICY IF EXISTS "Admins can update orders" ON public.happymonday_orders;
DROP POLICY IF EXISTS "Users can view their own payments" ON public.happymonday_payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON public.happymonday_payments;
DROP POLICY IF EXISTS "Authenticated users can create payments" ON public.happymonday_payments;
DROP POLICY IF EXISTS "Admins can view costing" ON public.happymonday_costing;
DROP POLICY IF EXISTS "Admins can manage costing" ON public.happymonday_costing;

-- Create helper function to check if current user is admin (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_happymonday_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.happymonday_users
    WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email')
    AND role = 'admin'
  );
END;
$$;

-- Recreate policies with case-insensitive email matching

-- Users table policies
CREATE POLICY "Users can view their own record"
  ON public.happymonday_users FOR SELECT
  USING (LOWER(auth.jwt() ->> 'email') = LOWER(email));

CREATE POLICY "Admins can view all users"
  ON public.happymonday_users FOR SELECT
  USING (public.is_happymonday_admin());

-- Credits table policies
CREATE POLICY "Users can view their own credits"
  ON public.happymonday_credits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.happymonday_users
      WHERE id = user_id AND LOWER(email) = LOWER(auth.jwt() ->> 'email')
    )
  );

CREATE POLICY "Admins can view all credits"
  ON public.happymonday_credits FOR SELECT
  USING (public.is_happymonday_admin());

CREATE POLICY "Admins can update credits"
  ON public.happymonday_credits FOR UPDATE
  USING (public.is_happymonday_admin());

-- Orders table policies
CREATE POLICY "Users can view their own orders"
  ON public.happymonday_orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.happymonday_users
      WHERE id = user_id AND LOWER(email) = LOWER(auth.jwt() ->> 'email')
    )
  );

CREATE POLICY "Admins can view all orders"
  ON public.happymonday_orders FOR SELECT
  USING (public.is_happymonday_admin());

CREATE POLICY "Authenticated users can create orders"
  ON public.happymonday_orders FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.happymonday_users
      WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email')
    )
  );

CREATE POLICY "Admins can update orders"
  ON public.happymonday_orders FOR UPDATE
  USING (public.is_happymonday_admin());

-- Payments table policies
CREATE POLICY "Users can view their own payments"
  ON public.happymonday_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.happymonday_users
      WHERE id = user_id AND LOWER(email) = LOWER(auth.jwt() ->> 'email')
    )
  );

CREATE POLICY "Admins can view all payments"
  ON public.happymonday_payments FOR SELECT
  USING (public.is_happymonday_admin());

CREATE POLICY "Authenticated users can create payments"
  ON public.happymonday_payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.happymonday_users
      WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email')
    )
  );

-- Costing table policies (admin only)
CREATE POLICY "Admins can view costing"
  ON public.happymonday_costing FOR SELECT
  USING (public.is_happymonday_admin());

CREATE POLICY "Admins can manage costing"
  ON public.happymonday_costing FOR ALL
  USING (public.is_happymonday_admin());
