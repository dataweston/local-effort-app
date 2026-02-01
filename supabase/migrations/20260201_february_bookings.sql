-- February Bookings Table
-- Stores in-home dinner reservations for February

CREATE TABLE IF NOT EXISTS february_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_date DATE NOT NULL,
  guest_count INTEGER NOT NULL CHECK (guest_count >= 4 AND guest_count <= 12),
  amount_cents INTEGER NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  address_city TEXT NOT NULL,
  address_state TEXT NOT NULL DEFAULT 'MN',
  address_postal TEXT NOT NULL,
  preferred_time TEXT,
  dietary_notes TEXT,
  notes TEXT,
  square_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure only one booking per date (when status is confirmed)
CREATE UNIQUE INDEX IF NOT EXISTS february_bookings_date_confirmed_idx 
  ON february_bookings (booking_date) 
  WHERE status = 'confirmed';

-- Index for fetching booked dates
CREATE INDEX IF NOT EXISTS february_bookings_date_status_idx 
  ON february_bookings (booking_date, status);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_february_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS february_bookings_updated_at ON february_bookings;
CREATE TRIGGER february_bookings_updated_at
  BEFORE UPDATE ON february_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_february_bookings_updated_at();

-- RLS policies
ALTER TABLE february_bookings ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role has full access" ON february_bookings
  FOR ALL
  USING (true)
  WITH CHECK (true);
