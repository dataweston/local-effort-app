-- Master Calendar System Schema
-- Created: 2025-10-21

-- Main events table (replaces Firebase events from Gallant-Hawking)
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  start_time TIME,
  end_time TIME,
  event_type TEXT CHECK (event_type IN ('pizza_party', 'pizza_pickup', 'meal_prep', 'catering', 'private_event', 'blocked', 'other')) DEFAULT 'other',
  visibility TEXT CHECK (visibility IN ('public', 'private', 'internal')) DEFAULT 'private',
  status TEXT CHECK (status IN ('draft', 'scheduled', 'confirmed', 'completed', 'cancelled', 'postponed', 'sold_out')) DEFAULT 'scheduled',
  location TEXT,
  capacity INTEGER CHECK (capacity IS NULL OR capacity >= 0),
  booked_slots INTEGER DEFAULT 0 CHECK (booked_slots >= 0),
  estimated_revenue NUMERIC(10, 2) DEFAULT 0,
  estimated_food_cost NUMERIC(10, 2) DEFAULT 0,
  estimated_labor_cost NUMERIC(10, 2) DEFAULT 0,
  actual_revenue NUMERIC(10, 2) DEFAULT 0,
  actual_food_cost NUMERIC(10, 2) DEFAULT 0,
  actual_labor_cost NUMERIC(10, 2) DEFAULT 0,
  notes TEXT,
  sanity_data JSONB,
  series_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_capacity CHECK (capacity IS NULL OR booked_slots <= capacity)
);

-- Customer bookings table
CREATE TABLE IF NOT EXISTS calendar_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  booking_type TEXT CHECK (booking_type IN ('pizza_pickup', 'instant_booking', 'other')) DEFAULT 'other',
  booking_status TEXT CHECK (booking_status IN ('pending', 'confirmed', 'cancelled')) DEFAULT 'pending',
  slot_time TIME,
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Receipts table (from Gallant-Hawking)
CREATE TABLE IF NOT EXISTS calendar_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store TEXT NOT NULL,
  total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_start_date ON calendar_events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_visibility ON calendar_events(visibility);
CREATE INDEX IF NOT EXISTS idx_events_status ON calendar_events(status);
CREATE INDEX IF NOT EXISTS idx_events_series ON calendar_events(series_id) WHERE series_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_event ON calendar_bookings(event_id);
CREATE INDEX IF NOT EXISTS idx_bookings_email ON calendar_bookings(customer_email);
CREATE INDEX IF NOT EXISTS idx_receipts_date ON calendar_receipts(date);

-- View for public events (SEO/homepage)
CREATE OR REPLACE VIEW calendar_events_public AS
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
  sanity_data,
  created_at
FROM calendar_events
WHERE visibility = 'public' 
  AND status IN ('scheduled', 'confirmed')
  AND start_date >= CURRENT_DATE
ORDER BY start_date ASC;

-- View for admin financial dashboard
CREATE OR REPLACE VIEW calendar_events_financial AS
SELECT 
  id,
  title,
  start_date,
  event_type,
  status,
  estimated_revenue,
  estimated_food_cost,
  estimated_labor_cost,
  estimated_revenue - estimated_food_cost - estimated_labor_cost AS estimated_profit,
  actual_revenue,
  actual_food_cost,
  actual_labor_cost,
  actual_revenue - actual_food_cost - actual_labor_cost AS actual_profit,
  EXTRACT(YEAR FROM start_date) AS year,
  EXTRACT(MONTH FROM start_date) AS month
FROM calendar_events
WHERE status != 'cancelled'
ORDER BY start_date DESC;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER update_calendar_events_updated_at 
  BEFORE UPDATE ON calendar_events 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_calendar_bookings_updated_at ON calendar_bookings;
CREATE TRIGGER update_calendar_bookings_updated_at 
  BEFORE UPDATE ON calendar_bookings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE calendar_events IS 'Master calendar - single source of truth for all events';
COMMENT ON TABLE calendar_bookings IS 'Customer bookings for events (pizza pickups, instant bookings)';
COMMENT ON TABLE calendar_receipts IS 'Food/supply receipts for expense tracking (from Gallant-Hawking)';
