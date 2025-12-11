-- Happy Monday Partner Portal Schema
-- This schema handles orders, credits, payments for the Happy Monday partnership

-- Table: happymonday_users
-- Stores user information for Happy Monday portal (admin and client)
CREATE TABLE IF NOT EXISTS public.happymonday_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'client')),
  name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table: happymonday_credits
-- Tracks credit balances for each user (negative means credit available)
CREATE TABLE IF NOT EXISTS public.happymonday_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.happymonday_users(id) ON DELETE CASCADE,
  balance_cents integer NOT NULL DEFAULT 0, -- negative = credit available, positive = owed
  opening_credit_cents integer DEFAULT 0, -- initial credit given
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Table: happymonday_orders
-- Stores all orders/invoices created in the system
CREATE TABLE IF NOT EXISTS public.happymonday_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  user_id uuid REFERENCES public.happymonday_users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.happymonday_users(id) ON DELETE SET NULL,
  order_date date NOT NULL,
  items jsonb NOT NULL DEFAULT '{}', -- {itemId: quantity}
  total_cents integer NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'partial', 'refunded')),
  email_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table: happymonday_payments
-- Tracks all payments made through Square or manual adjustments
CREATE TABLE IF NOT EXISTS public.happymonday_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.happymonday_users(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.happymonday_orders(id) ON DELETE SET NULL,
  amount_cents integer NOT NULL,
  payment_type text NOT NULL CHECK (payment_type IN ('square_ach', 'square_card', 'credit_adjustment', 'manual')),
  square_payment_id text, -- Square payment ID for tracking
  notes text,
  processed_by uuid REFERENCES public.happymonday_users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Table: happymonday_costing
-- Stores costing worksheet data (migrated from Firebase)
CREATE TABLE IF NOT EXISTS public.happymonday_costing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id integer NOT NULL,
  flour numeric(10,2) DEFAULT 0,
  meat numeric(10,2) DEFAULT 0,
  vegetables numeric(10,2) DEFAULT 0,
  dairy numeric(10,2) DEFAULT 0,
  other_toppings numeric(10,2) DEFAULT 0,
  packaging numeric(10,2) DEFAULT 0,
  label numeric(10,2) DEFAULT 0,
  custom jsonb DEFAULT '[]', -- array of {name, cost}
  updated_at timestamptz DEFAULT now(),
  UNIQUE(item_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_happymonday_orders_user_id ON public.happymonday_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_happymonday_orders_created_by ON public.happymonday_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_happymonday_orders_status ON public.happymonday_orders(status);
CREATE INDEX IF NOT EXISTS idx_happymonday_orders_created_at ON public.happymonday_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_happymonday_payments_user_id ON public.happymonday_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_happymonday_payments_order_id ON public.happymonday_payments(order_id);

-- RLS Policies

-- Enable RLS
ALTER TABLE public.happymonday_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.happymonday_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.happymonday_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.happymonday_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.happymonday_costing ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view their own record"
  ON public.happymonday_users FOR SELECT
  USING (auth.jwt() ->> 'email' = email);

CREATE POLICY "Admins can view all users"
  ON public.happymonday_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.happymonday_users
      WHERE email = auth.jwt() ->> 'email' AND role = 'admin'
    )
  );

-- Credits table policies
CREATE POLICY "Users can view their own credits"
  ON public.happymonday_credits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.happymonday_users
      WHERE id = user_id AND email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Admins can view all credits"
  ON public.happymonday_credits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.happymonday_users
      WHERE email = auth.jwt() ->> 'email' AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update credits"
  ON public.happymonday_credits FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.happymonday_users
      WHERE email = auth.jwt() ->> 'email' AND role = 'admin'
    )
  );

-- Orders table policies
CREATE POLICY "Users can view their own orders"
  ON public.happymonday_orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.happymonday_users
      WHERE id = user_id AND email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Admins can view all orders"
  ON public.happymonday_orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.happymonday_users
      WHERE email = auth.jwt() ->> 'email' AND role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can create orders"
  ON public.happymonday_orders FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.happymonday_users
      WHERE email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Admins can update orders"
  ON public.happymonday_orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.happymonday_users
      WHERE email = auth.jwt() ->> 'email' AND role = 'admin'
    )
  );

-- Payments table policies
CREATE POLICY "Users can view their own payments"
  ON public.happymonday_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.happymonday_users
      WHERE id = user_id AND email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Admins can view all payments"
  ON public.happymonday_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.happymonday_users
      WHERE email = auth.jwt() ->> 'email' AND role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can create payments"
  ON public.happymonday_payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.happymonday_users
      WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Costing table policies (admin only)
CREATE POLICY "Admins can view costing"
  ON public.happymonday_costing FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.happymonday_users
      WHERE email = auth.jwt() ->> 'email' AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage costing"
  ON public.happymonday_costing FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.happymonday_users
      WHERE email = auth.jwt() ->> 'email' AND role = 'admin'
    )
  );

-- Insert initial users
INSERT INTO public.happymonday_users (email, role, name)
VALUES
  ('dataweston@gmail.com', 'admin', 'Weston'),
  ('hello@happymonday.company', 'client', 'Happy Monday')
ON CONFLICT (email) DO NOTHING;

-- Insert initial credit balance for client (negative = credit available)
INSERT INTO public.happymonday_credits (user_id, balance_cents, opening_credit_cents)
SELECT
  id,
  -150000, -- -$1500 credit available
  150000   -- $1500 opening credit
FROM public.happymonday_users
WHERE email = 'hello@happymonday.company'
ON CONFLICT (user_id) DO NOTHING;

-- Deprecated: balance changes happen when invoices are paid, not when they are drafted
CREATE OR REPLACE FUNCTION update_credit_balance_after_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Intentionally a no-op
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update balance after payment
CREATE OR REPLACE FUNCTION update_credit_balance_after_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Update credit balance (subtract payment, making it more negative or less positive)
  UPDATE public.happymonday_credits
  SET
    balance_cents = balance_cents - NEW.amount_cents,
    updated_at = now()
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update balance when payment is made
CREATE TRIGGER trigger_update_credit_balance_after_payment
AFTER INSERT ON public.happymonday_payments
FOR EACH ROW
EXECUTE FUNCTION update_credit_balance_after_payment();
