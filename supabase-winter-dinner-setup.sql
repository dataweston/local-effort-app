-- Winter Dinner Registrations Table
-- Run this SQL in your Supabase SQL Editor to create the table

CREATE TABLE IF NOT EXISTS winter_dinner_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  dietary_restrictions TEXT,
  includes_alcohol BOOLEAN DEFAULT true,
  ticket_price INTEGER NOT NULL,
  ticket_price_usd TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Indexes for common queries
  CONSTRAINT unique_payment_id UNIQUE (payment_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_winter_dinner_email ON winter_dinner_registrations(customer_email);
CREATE INDEX IF NOT EXISTS idx_winter_dinner_created_at ON winter_dinner_registrations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_winter_dinner_payment_id ON winter_dinner_registrations(payment_id);

-- Enable Row Level Security (RLS)
ALTER TABLE winter_dinner_registrations ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
-- Allow public inserts (needed for the checkout process)
CREATE POLICY "Allow public inserts" ON winter_dinner_registrations
  FOR INSERT
  WITH CHECK (true);

-- Only allow authenticated users to read (admins can query via Supabase dashboard)
CREATE POLICY "Allow authenticated reads" ON winter_dinner_registrations
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Comment the table and columns for documentation
COMMENT ON TABLE winter_dinner_registrations IS 'Stores winter dinner ticket purchases and customer information';
COMMENT ON COLUMN winter_dinner_registrations.id IS 'Unique registration ID';
COMMENT ON COLUMN winter_dinner_registrations.payment_id IS 'Square payment ID reference';
COMMENT ON COLUMN winter_dinner_registrations.customer_name IS 'Full name of the ticket purchaser';
COMMENT ON COLUMN winter_dinner_registrations.customer_email IS 'Email address for confirmation';
COMMENT ON COLUMN winter_dinner_registrations.customer_phone IS 'Contact phone number';
COMMENT ON COLUMN winter_dinner_registrations.dietary_restrictions IS 'Any dietary restrictions or allergies';
COMMENT ON COLUMN winter_dinner_registrations.includes_alcohol IS 'Whether ticket includes alcohol pairing';
COMMENT ON COLUMN winter_dinner_registrations.ticket_price IS 'Price in cents';
COMMENT ON COLUMN winter_dinner_registrations.ticket_price_usd IS 'Price formatted as USD';
COMMENT ON COLUMN winter_dinner_registrations.created_at IS 'Timestamp of registration';
