-- Localist membership profiles
-- Run this SQL in your Supabase SQL Editor to create the table.
--
-- Written by /api/localist/subscribe (service role). Square is the billing
-- system of record (customer + invoice ids stored here); this table is the
-- membership roster the co-op works from.

CREATE TABLE IF NOT EXISTS localist_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('monthly', 'annual', 'waived')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'invoiced', 'active', 'cancelled')),
  square_customer_id TEXT,
  square_invoice_id TEXT,
  payment_method TEXT CHECK (payment_method IN ('ach', 'card') OR payment_method IS NULL),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT localist_members_unique_phone UNIQUE (phone)
);

CREATE INDEX IF NOT EXISTS idx_localist_members_email ON localist_members(email);
CREATE INDEX IF NOT EXISTS idx_localist_members_status ON localist_members(status);
CREATE INDEX IF NOT EXISTS idx_localist_members_created_at ON localist_members(created_at DESC);

ALTER TABLE localist_members ENABLE ROW LEVEL SECURITY;

-- All access goes through the backend with the service-role key; no public policies.
-- Authenticated users (admin dashboard) may read.
CREATE POLICY "Allow authenticated reads" ON localist_members
  FOR SELECT TO authenticated USING (true);
