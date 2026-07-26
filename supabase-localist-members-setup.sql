-- Localist membership roster
-- Run this SQL in your Supabase SQL Editor to create the table.
--
-- STATUS 2026-07-26: this table does NOT exist in production. It never has.
-- api-handlers/localist/subscribe.js has been writing to it since launch and
-- swallowing "relation does not exist" as a non-fatal error, so every Localist
-- signup recorded a Brevo contact and nothing else. api-handlers/hub/membership.js
-- reads the same table for a member's tier, so /hub/membership has been showing
-- every member as an untiered "Localist". Applying this file fixes both.
--
-- Written by /api/localist/subscribe (service role). Square is the billing
-- system of record; this table is the membership roster the co-op works from.

CREATE TABLE IF NOT EXISTS localist_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('monthly', 'annual', 'waived')),

  -- pending        waived member, or paid signup that never reached checkout
  -- checkout_started  hosted Square checkout link minted, payment not confirmed
  -- active         subscription confirmed paying
  -- cancelled      subscription ended
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'checkout_started', 'active', 'cancelled')),

  square_customer_id TEXT,
  -- Order behind the hosted checkout link; the join key back to Square when a
  -- payment webhook arrives.
  square_order_id TEXT,
  -- Set once the recurring subscription exists (post-payment).
  square_subscription_id TEXT,

  -- Square-hosted checkout takes card / Apple Pay / Google Pay / Cash App Pay.
  -- ACH is deliberately absent: payment links do not support bank transfer,
  -- which is why the ACH copy came off /localist in the same change.
  payment_method TEXT
    CHECK (payment_method IN ('card', 'apple_pay', 'google_pay', 'cash_app') OR payment_method IS NULL),

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT localist_members_unique_phone UNIQUE (phone)
);

CREATE INDEX IF NOT EXISTS idx_localist_members_email ON localist_members(email);
CREATE INDEX IF NOT EXISTS idx_localist_members_status ON localist_members(status);
CREATE INDEX IF NOT EXISTS idx_localist_members_created_at ON localist_members(created_at DESC);

ALTER TABLE localist_members ENABLE ROW LEVEL SECURITY;

-- All writes go through the backend with the service-role key; no public policies.
-- Authenticated users (admin dashboard) may read.
DROP POLICY IF EXISTS "Allow authenticated reads" ON localist_members;
CREATE POLICY "Allow authenticated reads" ON localist_members
  FOR SELECT TO authenticated USING (true);
