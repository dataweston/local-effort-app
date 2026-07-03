-- July Dinner Registrations Table
-- Run this SQL in your Supabase SQL Editor to create the table

CREATE TABLE IF NOT EXISTS july_dinner_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  booking_type TEXT NOT NULL DEFAULT 'seats' CHECK (booking_type IN ('seats', 'buyout')),
  party_size INTEGER,
  beverage_interests TEXT,
  dietary_restrictions TEXT,
  music_preferences TEXT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price_per_seat_cents INTEGER,
  total_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT july_dinner_unique_payment_id UNIQUE (payment_id)
);

CREATE INDEX IF NOT EXISTS idx_july_dinner_email ON july_dinner_registrations(customer_email);
CREATE INDEX IF NOT EXISTS idx_july_dinner_created_at ON july_dinner_registrations(created_at DESC);

ALTER TABLE july_dinner_registrations ENABLE ROW LEVEL SECURITY;

-- All access goes through the backend with the service-role key; no public policies.
-- Authenticated users (admin dashboard) may read.
CREATE POLICY "Allow authenticated reads" ON july_dinner_registrations
  FOR SELECT
  USING (auth.role() = 'authenticated');

COMMENT ON TABLE july_dinner_registrations IS 'Ticket purchases for the July Dinner event (/julydinner). Seats sold = SUM(quantity); capacity lives in Sanity dinnerEvent (fallback 20). A buy-out row has booking_type=buyout, quantity=capacity (closes the room), party_size up to 30, price_per_seat_cents NULL, total_cents 255000.';
