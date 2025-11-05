-- Add image and rich description support to calendar events
-- Created: 2025-11-05

-- Add columns for images and rich text description
ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS image_alt TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Add comment to explain the description field
COMMENT ON COLUMN calendar_events.description IS 'Rich text description supporting basic markdown/formatting for public display';
COMMENT ON COLUMN calendar_events.image_url IS 'URL to event hero image for public calendar views';
COMMENT ON COLUMN calendar_events.image_alt IS 'Alt text for event image (accessibility)';

-- Drop and recreate the public view to include images and description
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
  sanity_data,
  created_at
FROM calendar_events
WHERE visibility = 'public'
  AND status IN ('scheduled', 'confirmed')
  AND start_date >= CURRENT_DATE
ORDER BY start_date ASC;
