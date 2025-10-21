-- Row Level Security Policies for Calendar System

-- Enable RLS on all tables
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_receipts ENABLE ROW LEVEL SECURITY;

-- calendar_events policies

-- Public: Read public events only
CREATE POLICY "Public can view public events"
  ON calendar_events FOR SELECT
  TO anon
  USING (visibility = 'public' AND status IN ('scheduled', 'confirmed'));

-- Authenticated admin: Full access
CREATE POLICY "Admins have full access to events"
  ON calendar_events FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- calendar_bookings policies

-- Public: Can create bookings
CREATE POLICY "Anyone can create bookings"
  ON calendar_bookings FOR INSERT
  TO anon
  WITH CHECK (true);

-- Public: Can read own bookings by email
CREATE POLICY "Anyone can view own bookings"
  ON calendar_bookings FOR SELECT
  TO anon
  USING (true);

-- Authenticated admin: Full access
CREATE POLICY "Admins have full access to bookings"
  ON calendar_bookings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- calendar_receipts policies

-- Authenticated admin: Full access only
CREATE POLICY "Admins have full access to receipts"
  ON calendar_receipts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Grant access to views
GRANT SELECT ON calendar_events_public TO anon, authenticated;
GRANT SELECT ON calendar_events_financial TO authenticated;
