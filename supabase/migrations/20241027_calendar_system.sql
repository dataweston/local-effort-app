-- Calendar System Complete Migration
-- Creates all tables, views, functions, and policies for the calendar feature

-- ============================================================
-- CALENDAR EVENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event Details
  title TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  start_time TIME,
  end_time TIME,
  all_day BOOLEAN DEFAULT true,
  
  -- Location & Type
  location TEXT,
  event_type TEXT DEFAULT 'other' CHECK (event_type IN (
    'pizza_party', 'pizza_pickup', 'catering', 'meal_prep', 
    'private_event', 'blocked', 'other'
  )),
  
  -- Visibility & Status
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
  status TEXT DEFAULT 'scheduled' CHECK (status IN (
    'draft', 'scheduled', 'confirmed', 'cancelled', 'completed'
  )),
  
  -- Booking Configuration
  capacity INTEGER,
  booked_slots INTEGER DEFAULT 0,
  is_bookable BOOLEAN DEFAULT false,
  
  -- Financial Tracking
  estimated_revenue DECIMAL(10,2),
  estimated_food_cost DECIMAL(10,2),
  estimated_labor_cost DECIMAL(10,2),
  actual_revenue DECIMAL(10,2),
  actual_food_cost DECIMAL(10,2),
  actual_labor_cost DECIMAL(10,2),
  
  -- Additional Info
  notes TEXT,
  internal_notes TEXT,
  
  -- Recurring Events
  series_id UUID REFERENCES calendar_events(id) ON DELETE SET NULL,
  recurrence_rule TEXT,
  
  -- Integration
  sanity_event_id TEXT,
  sanity_data JSONB,
  external_id TEXT,
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if table already exists (for upgrade path)
DO $$ 
BEGIN
  -- Add end_date if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_events' AND column_name='end_date') THEN
    ALTER TABLE calendar_events ADD COLUMN end_date DATE;
  END IF;
  
  -- Add start_time if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_events' AND column_name='start_time') THEN
    ALTER TABLE calendar_events ADD COLUMN start_time TIME;
  END IF;
  
  -- Add end_time if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_events' AND column_name='end_time') THEN
    ALTER TABLE calendar_events ADD COLUMN end_time TIME;
  END IF;
  
  -- Add all_day if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_events' AND column_name='all_day') THEN
    ALTER TABLE calendar_events ADD COLUMN all_day BOOLEAN DEFAULT true;
  END IF;
  
  -- Add location if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_events' AND column_name='location') THEN
    ALTER TABLE calendar_events ADD COLUMN location TEXT;
  END IF;
  
  -- Add event_type if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_events' AND column_name='event_type') THEN
    ALTER TABLE calendar_events ADD COLUMN event_type TEXT DEFAULT 'other' CHECK (event_type IN ('pizza_party', 'pizza_pickup', 'catering', 'meal_prep', 'private_event', 'blocked', 'other'));
  END IF;
  
  -- Add visibility if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_events' AND column_name='visibility') THEN
    ALTER TABLE calendar_events ADD COLUMN visibility TEXT DEFAULT 'private' CHECK (visibility IN ('public', 'private'));
  END IF;
  
  -- Add status if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_events' AND column_name='status') THEN
    ALTER TABLE calendar_events ADD COLUMN status TEXT DEFAULT 'scheduled' CHECK (status IN ('draft', 'scheduled', 'confirmed', 'cancelled', 'completed'));
  END IF;
  
  -- Add capacity if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_events' AND column_name='capacity') THEN
    ALTER TABLE calendar_events ADD COLUMN capacity INTEGER;
  END IF;
  
  -- Add booked_slots if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_events' AND column_name='booked_slots') THEN
    ALTER TABLE calendar_events ADD COLUMN booked_slots INTEGER DEFAULT 0;
  END IF;
  
  -- Add is_bookable if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_events' AND column_name='is_bookable') THEN
    ALTER TABLE calendar_events ADD COLUMN is_bookable BOOLEAN DEFAULT false;
  END IF;
  
  -- Add financial tracking columns if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_events' AND column_name='estimated_revenue') THEN
    ALTER TABLE calendar_events ADD COLUMN estimated_revenue DECIMAL(10,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_events' AND column_name='estimated_food_cost') THEN
    ALTER TABLE calendar_events ADD COLUMN estimated_food_cost DECIMAL(10,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_events' AND column_name='estimated_labor_cost') THEN
    ALTER TABLE calendar_events ADD COLUMN estimated_labor_cost DECIMAL(10,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_events' AND column_name='actual_revenue') THEN
    ALTER TABLE calendar_events ADD COLUMN actual_revenue DECIMAL(10,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_events' AND column_name='actual_food_cost') THEN
    ALTER TABLE calendar_events ADD COLUMN actual_food_cost DECIMAL(10,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_events' AND column_name='actual_labor_cost') THEN
    ALTER TABLE calendar_events ADD COLUMN actual_labor_cost DECIMAL(10,2);
  END IF;
  
  -- Add notes if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_events' AND column_name='notes') THEN
    ALTER TABLE calendar_events ADD COLUMN notes TEXT;
  END IF;
  
  -- Add internal_notes if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_events' AND column_name='internal_notes') THEN
    ALTER TABLE calendar_events ADD COLUMN internal_notes TEXT;
  END IF;
  
  -- Add series_id if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_events' AND column_name='series_id') THEN
    ALTER TABLE calendar_events ADD COLUMN series_id UUID REFERENCES calendar_events(id) ON DELETE SET NULL;
  END IF;
  
  -- Add recurrence_rule if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_events' AND column_name='recurrence_rule') THEN
    ALTER TABLE calendar_events ADD COLUMN recurrence_rule TEXT;
  END IF;
  
  -- Add sanity_event_id if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_events' AND column_name='sanity_event_id') THEN
    ALTER TABLE calendar_events ADD COLUMN sanity_event_id TEXT;
  END IF;
  
  -- Add sanity_data if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_events' AND column_name='sanity_data') THEN
    ALTER TABLE calendar_events ADD COLUMN sanity_data JSONB;
  END IF;
  
  -- Add external_id if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_events' AND column_name='external_id') THEN
    ALTER TABLE calendar_events ADD COLUMN external_id TEXT;
  END IF;
  
  -- Add metadata if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_events' AND column_name='metadata') THEN
    ALTER TABLE calendar_events ADD COLUMN metadata JSONB;
  END IF;
END $$;

-- Indexes for calendar_events
CREATE INDEX IF NOT EXISTS idx_calendar_events_dates ON calendar_events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON calendar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_calendar_events_visibility ON calendar_events(visibility);
CREATE INDEX IF NOT EXISTS idx_calendar_events_status ON calendar_events(status);
CREATE INDEX IF NOT EXISTS idx_calendar_events_bookable ON calendar_events(is_bookable) WHERE is_bookable = true;
CREATE INDEX IF NOT EXISTS idx_calendar_events_series ON calendar_events(series_id) WHERE series_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calendar_events_sanity ON calendar_events(sanity_event_id) WHERE sanity_event_id IS NOT NULL;

-- ============================================================
-- CALENDAR TIME SLOTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS calendar_time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Time Slot Details
  slot_date DATE NOT NULL,
  slot_time TIME NOT NULL,
  slot_type TEXT DEFAULT 'pizza_pickup' CHECK (slot_type IN (
    'pizza_pickup', 'delivery', 'meal_prep', 'catering', 'other'
  )),
  
  -- Capacity & Status
  capacity INTEGER,
  booked_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'available' CHECK (status IN (
    'available', 'booked', 'full', 'cancelled'
  )),
  is_bookable BOOLEAN DEFAULT true,
  
  -- Conflict Prevention
  buffer_hours INTEGER DEFAULT 4,
  
  -- Location & Notes
  location TEXT,
  notes TEXT,
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_slot_datetime UNIQUE (slot_date, slot_time, slot_type)
);

-- Add missing columns to calendar_time_slots if table already exists (for upgrade path)
DO $$ 
BEGIN
  -- Add slot_type if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_time_slots' AND column_name='slot_type') THEN
    ALTER TABLE calendar_time_slots ADD COLUMN slot_type TEXT DEFAULT 'pizza_pickup' CHECK (slot_type IN ('pizza_pickup', 'delivery', 'meal_prep', 'catering', 'other'));
  END IF;
  
  -- Add capacity if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_time_slots' AND column_name='capacity') THEN
    ALTER TABLE calendar_time_slots ADD COLUMN capacity INTEGER;
  END IF;
  
  -- Add booked_count if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_time_slots' AND column_name='booked_count') THEN
    ALTER TABLE calendar_time_slots ADD COLUMN booked_count INTEGER DEFAULT 0;
  END IF;
  
  -- Add status if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_time_slots' AND column_name='status') THEN
    ALTER TABLE calendar_time_slots ADD COLUMN status TEXT DEFAULT 'available' CHECK (status IN ('available', 'booked', 'full', 'cancelled'));
  END IF;
  
  -- Add is_bookable if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_time_slots' AND column_name='is_bookable') THEN
    ALTER TABLE calendar_time_slots ADD COLUMN is_bookable BOOLEAN DEFAULT true;
  END IF;
  
  -- Add buffer_hours if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_time_slots' AND column_name='buffer_hours') THEN
    ALTER TABLE calendar_time_slots ADD COLUMN buffer_hours INTEGER DEFAULT 4;
  END IF;
  
  -- Add location if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_time_slots' AND column_name='location') THEN
    ALTER TABLE calendar_time_slots ADD COLUMN location TEXT;
  END IF;
  
  -- Add notes if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_time_slots' AND column_name='notes') THEN
    ALTER TABLE calendar_time_slots ADD COLUMN notes TEXT;
  END IF;
  
  -- Add metadata if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_time_slots' AND column_name='metadata') THEN
    ALTER TABLE calendar_time_slots ADD COLUMN metadata JSONB;
  END IF;
END $$;

-- Indexes for calendar_time_slots
CREATE INDEX IF NOT EXISTS idx_calendar_time_slots_date ON calendar_time_slots(slot_date);
CREATE INDEX IF NOT EXISTS idx_calendar_time_slots_type ON calendar_time_slots(slot_type);
CREATE INDEX IF NOT EXISTS idx_calendar_time_slots_status ON calendar_time_slots(status);
CREATE INDEX IF NOT EXISTS idx_calendar_time_slots_bookable ON calendar_time_slots(is_bookable) WHERE is_bookable = true;

-- ============================================================
-- CALENDAR BOOKINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS calendar_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys (one or the other)
  event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
  time_slot_id UUID REFERENCES calendar_time_slots(id) ON DELETE CASCADE,
  
  -- Customer Info
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  
  -- Booking Details
  booking_type TEXT DEFAULT 'pizza_pickup',
  booking_status TEXT DEFAULT 'pending' CHECK (booking_status IN (
    'pending', 'confirmed', 'cancelled', 'completed', 'no_show'
  )),
  quantity INTEGER DEFAULT 1,
  slot_time TIME,
  
  -- Notes & Metadata
  notes TEXT,
  cancellation_reason TEXT,
  metadata JSONB,
  
  -- Invitation Link (if from invite)
  invitation_id UUID REFERENCES calendar_invitations(id),
  
  -- Timestamps
  booked_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT booking_has_event_or_slot CHECK (
    (event_id IS NOT NULL AND time_slot_id IS NULL) OR
    (event_id IS NULL AND time_slot_id IS NOT NULL)
  )
);

-- Add missing columns to calendar_bookings if table already exists (for upgrade path)
DO $$ 
BEGIN
  -- Add event_id if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_bookings' AND column_name='event_id') THEN
    ALTER TABLE calendar_bookings ADD COLUMN event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE;
  END IF;
  
  -- Add time_slot_id if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_bookings' AND column_name='time_slot_id') THEN
    ALTER TABLE calendar_bookings ADD COLUMN time_slot_id UUID REFERENCES calendar_time_slots(id) ON DELETE CASCADE;
  END IF;
  
  -- Add invitation_id if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_bookings' AND column_name='invitation_id') THEN
    ALTER TABLE calendar_bookings ADD COLUMN invitation_id UUID REFERENCES calendar_invitations(id);
  END IF;
  
  -- Add booking_type if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_bookings' AND column_name='booking_type') THEN
    ALTER TABLE calendar_bookings ADD COLUMN booking_type TEXT DEFAULT 'pizza_pickup';
  END IF;
  
  -- Add booking_status if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_bookings' AND column_name='booking_status') THEN
    ALTER TABLE calendar_bookings ADD COLUMN booking_status TEXT DEFAULT 'pending' CHECK (booking_status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show'));
  END IF;
  
  -- Add quantity if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_bookings' AND column_name='quantity') THEN
    ALTER TABLE calendar_bookings ADD COLUMN quantity INTEGER DEFAULT 1;
  END IF;
  
  -- Add slot_time if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_bookings' AND column_name='slot_time') THEN
    ALTER TABLE calendar_bookings ADD COLUMN slot_time TIME;
  END IF;
  
  -- Add notes if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_bookings' AND column_name='notes') THEN
    ALTER TABLE calendar_bookings ADD COLUMN notes TEXT;
  END IF;
  
  -- Add cancellation_reason if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_bookings' AND column_name='cancellation_reason') THEN
    ALTER TABLE calendar_bookings ADD COLUMN cancellation_reason TEXT;
  END IF;
  
  -- Add metadata if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_bookings' AND column_name='metadata') THEN
    ALTER TABLE calendar_bookings ADD COLUMN metadata JSONB;
  END IF;
  
  -- Add booked_at if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_bookings' AND column_name='booked_at') THEN
    ALTER TABLE calendar_bookings ADD COLUMN booked_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  
  -- Add confirmed_at if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_bookings' AND column_name='confirmed_at') THEN
    ALTER TABLE calendar_bookings ADD COLUMN confirmed_at TIMESTAMPTZ;
  END IF;
  
  -- Add cancelled_at if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_bookings' AND column_name='cancelled_at') THEN
    ALTER TABLE calendar_bookings ADD COLUMN cancelled_at TIMESTAMPTZ;
  END IF;
END $$;

-- Indexes for calendar_bookings
CREATE INDEX IF NOT EXISTS idx_calendar_bookings_event ON calendar_bookings(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calendar_bookings_slot ON calendar_bookings(time_slot_id) WHERE time_slot_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_calendar_bookings_customer ON calendar_bookings(customer_email);
CREATE INDEX IF NOT EXISTS idx_calendar_bookings_status ON calendar_bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_calendar_bookings_invitation ON calendar_bookings(invitation_id) WHERE invitation_id IS NOT NULL;

-- ============================================================
-- CALENDAR RECEIPTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS calendar_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to Event
  event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
  
  -- Receipt Details
  receipt_date DATE NOT NULL,
  receipt_type TEXT CHECK (receipt_type IN ('revenue', 'food_cost', 'labor_cost', 'other_expense')),
  
  -- Financial
  amount DECIMAL(10,2) NOT NULL,
  category TEXT,
  vendor TEXT,
  
  -- Documentation
  description TEXT,
  receipt_image_url TEXT,
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to calendar_receipts if table already exists (for upgrade path)
DO $$ 
BEGIN
  -- Add event_id if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_receipts' AND column_name='event_id') THEN
    ALTER TABLE calendar_receipts ADD COLUMN event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE;
  END IF;
  
  -- Add receipt_date if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_receipts' AND column_name='receipt_date') THEN
    ALTER TABLE calendar_receipts ADD COLUMN receipt_date DATE NOT NULL DEFAULT CURRENT_DATE;
  END IF;
  
  -- Add receipt_type if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_receipts' AND column_name='receipt_type') THEN
    ALTER TABLE calendar_receipts ADD COLUMN receipt_type TEXT CHECK (receipt_type IN ('revenue', 'food_cost', 'labor_cost', 'other_expense'));
  END IF;
  
  -- Add amount if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_receipts' AND column_name='amount') THEN
    ALTER TABLE calendar_receipts ADD COLUMN amount DECIMAL(10,2) NOT NULL DEFAULT 0;
  END IF;
  
  -- Add category if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_receipts' AND column_name='category') THEN
    ALTER TABLE calendar_receipts ADD COLUMN category TEXT;
  END IF;
  
  -- Add vendor if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_receipts' AND column_name='vendor') THEN
    ALTER TABLE calendar_receipts ADD COLUMN vendor TEXT;
  END IF;
  
  -- Add description if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_receipts' AND column_name='description') THEN
    ALTER TABLE calendar_receipts ADD COLUMN description TEXT;
  END IF;
  
  -- Add receipt_image_url if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_receipts' AND column_name='receipt_image_url') THEN
    ALTER TABLE calendar_receipts ADD COLUMN receipt_image_url TEXT;
  END IF;
  
  -- Add metadata if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='calendar_receipts' AND column_name='metadata') THEN
    ALTER TABLE calendar_receipts ADD COLUMN metadata JSONB;
  END IF;
END $$;

-- Indexes for calendar_receipts
CREATE INDEX IF NOT EXISTS idx_calendar_receipts_event ON calendar_receipts(event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_receipts_date ON calendar_receipts(receipt_date);
CREATE INDEX IF NOT EXISTS idx_calendar_receipts_type ON calendar_receipts(receipt_type);

-- ============================================================
-- VIEWS
-- ============================================================

-- Public Events View (only shows public, future events)
CREATE OR REPLACE VIEW calendar_events_public AS
SELECT 
  id,
  title,
  start_date,
  end_date,
  start_time,
  end_time,
  all_day,
  location,
  event_type,
  is_bookable,
  capacity,
  booked_slots,
  capacity - COALESCE(booked_slots, 0) AS available_slots,
  notes,
  created_at
FROM calendar_events
WHERE visibility = 'public'
  AND status IN ('scheduled', 'confirmed')
  AND start_date >= CURRENT_DATE
ORDER BY start_date, start_time;

-- Available Time Slots View (calculates availability)
CREATE OR REPLACE VIEW calendar_time_slots_available AS
SELECT 
  ts.*,
  CASE 
    WHEN ts.capacity IS NULL THEN NULL
    ELSE ts.capacity - COALESCE(ts.booked_count, 0)
  END AS available_slots,
  CASE 
    WHEN ts.capacity IS NOT NULL AND ts.capacity - COALESCE(ts.booked_count, 0) <= 0 THEN 'full'
    WHEN ts.status = 'cancelled' THEN 'cancelled'
    ELSE 'available'
  END AS computed_status
FROM calendar_time_slots ts
WHERE ts.is_bookable = true
  AND ts.slot_date >= CURRENT_DATE
ORDER BY ts.slot_date, ts.slot_time;

-- ============================================================
-- FUNCTIONS
-- ============================================================

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

DROP TRIGGER IF EXISTS update_calendar_time_slots_updated_at ON calendar_time_slots;
CREATE TRIGGER update_calendar_time_slots_updated_at
  BEFORE UPDATE ON calendar_time_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_calendar_bookings_updated_at ON calendar_bookings;
CREATE TRIGGER update_calendar_bookings_updated_at
  BEFORE UPDATE ON calendar_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update booked_count when booking is created/updated/deleted
CREATE OR REPLACE FUNCTION update_booking_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle time slot bookings
  IF TG_OP = 'INSERT' AND NEW.time_slot_id IS NOT NULL AND NEW.booking_status = 'confirmed' THEN
    UPDATE calendar_time_slots 
    SET booked_count = booked_count + 1
    WHERE id = NEW.time_slot_id;
    
  ELSIF TG_OP = 'UPDATE' AND NEW.time_slot_id IS NOT NULL THEN
    IF OLD.booking_status != 'confirmed' AND NEW.booking_status = 'confirmed' THEN
      UPDATE calendar_time_slots 
      SET booked_count = booked_count + 1
      WHERE id = NEW.time_slot_id;
    ELSIF OLD.booking_status = 'confirmed' AND NEW.booking_status != 'confirmed' THEN
      UPDATE calendar_time_slots 
      SET booked_count = GREATEST(0, booked_count - 1)
      WHERE id = NEW.time_slot_id;
    END IF;
    
  ELSIF TG_OP = 'DELETE' AND OLD.time_slot_id IS NOT NULL AND OLD.booking_status = 'confirmed' THEN
    UPDATE calendar_time_slots 
    SET booked_count = GREATEST(0, booked_count - 1)
    WHERE id = OLD.time_slot_id;
  END IF;
  
  -- Handle event bookings
  IF TG_OP = 'INSERT' AND NEW.event_id IS NOT NULL AND NEW.booking_status = 'confirmed' THEN
    UPDATE calendar_events 
    SET booked_slots = booked_slots + 1
    WHERE id = NEW.event_id;
    
  ELSIF TG_OP = 'UPDATE' AND NEW.event_id IS NOT NULL THEN
    IF OLD.booking_status != 'confirmed' AND NEW.booking_status = 'confirmed' THEN
      UPDATE calendar_events 
      SET booked_slots = booked_slots + 1
      WHERE id = NEW.event_id;
    ELSIF OLD.booking_status = 'confirmed' AND NEW.booking_status != 'confirmed' THEN
      UPDATE calendar_events 
      SET booked_slots = GREATEST(0, booked_slots - 1)
      WHERE id = NEW.event_id;
    END IF;
    
  ELSIF TG_OP = 'DELETE' AND OLD.event_id IS NOT NULL AND OLD.booking_status = 'confirmed' THEN
    UPDATE calendar_events 
    SET booked_slots = GREATEST(0, booked_slots - 1)
    WHERE id = OLD.event_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for booking counts
DROP TRIGGER IF EXISTS manage_booking_counts ON calendar_bookings;
CREATE TRIGGER manage_booking_counts
  AFTER INSERT OR UPDATE OR DELETE ON calendar_bookings
  FOR EACH ROW EXECUTE FUNCTION update_booking_counts();

-- Function to check scheduling conflicts
CREATE OR REPLACE FUNCTION check_scheduling_conflicts(
  check_date DATE,
  check_time TIME,
  check_buffer_hours INTEGER DEFAULT 4,
  exclude_event_id UUID DEFAULT NULL,
  exclude_slot_id UUID DEFAULT NULL
)
RETURNS TABLE (
  conflict_type TEXT,
  conflict_id UUID,
  conflict_title TEXT,
  conflict_start TIMESTAMPTZ,
  conflict_end TIMESTAMPTZ,
  buffer_overlap_minutes INTEGER
) AS $$
DECLARE
  check_start TIMESTAMPTZ;
  check_end TIMESTAMPTZ;
BEGIN
  -- Calculate the time range including buffer
  check_start := (check_date + check_time) - (check_buffer_hours || ' hours')::INTERVAL;
  check_end := (check_date + check_time) + (check_buffer_hours || ' hours')::INTERVAL;
  
  -- Check conflicts with events
  RETURN QUERY
  SELECT 
    'event'::TEXT,
    e.id,
    e.title,
    (e.start_date + COALESCE(e.start_time, '00:00'::TIME))::TIMESTAMPTZ,
    (COALESCE(e.end_date, e.start_date) + COALESCE(e.end_time, '23:59'::TIME))::TIMESTAMPTZ,
    EXTRACT(EPOCH FROM (
      LEAST(
        check_end,
        (COALESCE(e.end_date, e.start_date) + COALESCE(e.end_time, '23:59'::TIME))::TIMESTAMPTZ
      ) - GREATEST(
        check_start,
        (e.start_date + COALESCE(e.start_time, '00:00'::TIME))::TIMESTAMPTZ
      )
    ) / 60)::INTEGER AS buffer_overlap_minutes
  FROM calendar_events e
  WHERE e.status NOT IN ('cancelled', 'draft')
    AND (exclude_event_id IS NULL OR e.id != exclude_event_id)
    AND (e.start_date + COALESCE(e.start_time, '00:00'::TIME))::TIMESTAMPTZ < check_end
    AND (COALESCE(e.end_date, e.start_date) + COALESCE(e.end_time, '23:59'::TIME))::TIMESTAMPTZ > check_start;
  
  -- Check conflicts with time slots
  RETURN QUERY
  SELECT 
    'time_slot'::TEXT,
    ts.id,
    ts.slot_type || ' - ' || ts.slot_time::TEXT,
    (ts.slot_date + ts.slot_time)::TIMESTAMPTZ - (ts.buffer_hours || ' hours')::INTERVAL,
    (ts.slot_date + ts.slot_time)::TIMESTAMPTZ + (ts.buffer_hours || ' hours')::INTERVAL,
    EXTRACT(EPOCH FROM (
      LEAST(
        check_end,
        (ts.slot_date + ts.slot_time)::TIMESTAMPTZ + (ts.buffer_hours || ' hours')::INTERVAL
      ) - GREATEST(
        check_start,
        (ts.slot_date + ts.slot_time)::TIMESTAMPTZ - (ts.buffer_hours || ' hours')::INTERVAL
      )
    ) / 60)::INTEGER AS buffer_overlap_minutes
  FROM calendar_time_slots ts
  WHERE ts.status != 'cancelled'
    AND (exclude_slot_id IS NULL OR ts.id != exclude_slot_id)
    AND (ts.slot_date + ts.slot_time)::TIMESTAMPTZ - (ts.buffer_hours || ' hours')::INTERVAL < check_end
    AND (ts.slot_date + ts.slot_time)::TIMESTAMPTZ + (ts.buffer_hours || ' hours')::INTERVAL > check_start;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_receipts ENABLE ROW LEVEL SECURITY;

-- Public read access to public events
CREATE POLICY "Public events are viewable by everyone"
  ON calendar_events FOR SELECT
  USING (visibility = 'public' AND status IN ('scheduled', 'confirmed'));

-- Public read access to available time slots
CREATE POLICY "Available time slots are viewable by everyone"
  ON calendar_time_slots FOR SELECT
  USING (is_bookable = true AND status != 'cancelled');

-- Anyone can create bookings (customer-facing)
CREATE POLICY "Anyone can create bookings"
  ON calendar_bookings FOR INSERT
  WITH CHECK (true);

-- Customers can view their own bookings
CREATE POLICY "Customers can view their bookings"
  ON calendar_bookings FOR SELECT
  USING (true);

-- Service role has full access (for backend operations)
CREATE POLICY "Service role has full access to events"
  ON calendar_events FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to time slots"
  ON calendar_time_slots FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to bookings"
  ON calendar_bookings FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to receipts"
  ON calendar_receipts FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE calendar_events IS 'Master calendar events including public and private events';
COMMENT ON TABLE calendar_time_slots IS 'Bookable time slots for services like pizza pickup';
COMMENT ON TABLE calendar_bookings IS 'Customer bookings for events or time slots';
COMMENT ON TABLE calendar_receipts IS 'Financial receipts associated with events';
COMMENT ON VIEW calendar_events_public IS 'Public-facing view of upcoming public events';
COMMENT ON VIEW calendar_time_slots_available IS 'Available time slots with calculated capacity';
COMMENT ON FUNCTION check_scheduling_conflicts IS 'Checks for scheduling conflicts with buffer zones';
