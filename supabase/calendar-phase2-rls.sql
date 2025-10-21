-- RLS Policies for calendar_time_slots (Phase 2)
-- Run this after calendar-phase2-schema.sql

-- Enable RLS on time slots table
ALTER TABLE calendar_time_slots ENABLE ROW LEVEL SECURITY;

-- Public: Read available time slots only
CREATE POLICY "Public can view available time slots"
  ON calendar_time_slots FOR SELECT
  TO anon
  USING (status = 'available' AND slot_date >= CURRENT_DATE);

-- Authenticated admin: Full access
CREATE POLICY "Admins have full access to time slots"
  ON calendar_time_slots FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant access to views
GRANT SELECT ON calendar_time_slots_available TO anon, authenticated;
