-- Add link/CTA support to calendar events
-- Created: 2025-11-05

-- Add columns for event links (tickets, registration, etc.)
ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS link_url TEXT,
  ADD COLUMN IF NOT EXISTS link_label TEXT;

-- Add comments
COMMENT ON COLUMN calendar_events.link_url IS 'External link URL for tickets, registration, or more info';
COMMENT ON COLUMN calendar_events.link_label IS 'Label for the link button (e.g., "Buy Tickets", "Register", "Learn More")';

-- Update the public view to include link fields
DROP VIEW IF EXISTS calendar_events_public;
CREATE VIEW calendar_events_public AS
SELECT
  id,
  title,
  start_date,
  end_date,
  start_time,
  end_time,
  event_type,
  location,
  capacity,
  booked_slots,
  capacity - booked_slots AS available_slots,
  (capacity IS NULL OR capacity > booked_slots) AS is_bookable,
  image_url,
  image_alt,
  description,
  link_url,
  link_label,
  sanity_data,
  created_at
FROM calendar_events
WHERE visibility = 'public'
  AND status IN ('scheduled', 'confirmed')
  AND start_date >= CURRENT_DATE
ORDER BY start_date ASC;
