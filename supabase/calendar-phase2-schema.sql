-- Phase 2: Smart Scheduling with Time Slots and Conflict Detection
-- Run this AFTER calendar-schema.sql, calendar-rls.sql, and calendar-triggers.sql

-- Add buffer_hours to calendar_events (default 4 hours)
ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS buffer_hours INTEGER DEFAULT 4 CHECK (buffer_hours >= 0);

COMMENT ON COLUMN calendar_events.buffer_hours IS 'Minimum hours before/after this event to prevent conflicts';

-- Time slots table for granular scheduling
CREATE TABLE IF NOT EXISTS calendar_time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_date DATE NOT NULL,
  slot_time TIME NOT NULL,
  slot_type TEXT CHECK (slot_type IN ('pizza_pickup', 'delivery', 'meal_prep', 'catering', 'other')) DEFAULT 'pizza_pickup',
  capacity INTEGER CHECK (capacity IS NULL OR capacity >= 0),
  booked_count INTEGER DEFAULT 0 CHECK (booked_count >= 0),
  buffer_hours INTEGER DEFAULT 4 CHECK (buffer_hours >= 0),
  status TEXT CHECK (status IN ('available', 'booked', 'blocked')) DEFAULT 'available',
  location TEXT,
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_time_slot_capacity CHECK (capacity IS NULL OR booked_count <= capacity),
  CONSTRAINT unique_time_slot UNIQUE (slot_date, slot_time, slot_type)
);

CREATE INDEX IF NOT EXISTS idx_time_slots_date ON calendar_time_slots(slot_date);
CREATE INDEX IF NOT EXISTS idx_time_slots_status ON calendar_time_slots(status);
CREATE INDEX IF NOT EXISTS idx_time_slots_type ON calendar_time_slots(slot_type);

-- Update bookings table to support time slots
ALTER TABLE calendar_bookings
ADD COLUMN IF NOT EXISTS time_slot_id UUID REFERENCES calendar_time_slots(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_bookings_time_slot ON calendar_bookings(time_slot_id);

-- Conflict detection function
-- Checks if a given date/time conflicts with existing events or time slots within buffer window
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
  conflict_start TIMESTAMP,
  conflict_end TIMESTAMP,
  buffer_overlap_minutes INTEGER
) AS $$
DECLARE
  check_timestamp TIMESTAMP;
  check_start TIMESTAMP;
  check_end TIMESTAMP;
BEGIN
  -- Convert date + time to timestamp
  check_timestamp := check_date + check_time;
  check_start := check_timestamp - (check_buffer_hours || ' hours')::INTERVAL;
  check_end := check_timestamp + (check_buffer_hours || ' hours')::INTERVAL;
  
  -- Check conflicts with calendar_events
  RETURN QUERY
  SELECT 
    'event'::TEXT as conflict_type,
    e.id as conflict_id,
    e.title as conflict_title,
    (e.start_date + COALESCE(e.start_time, '00:00'::TIME))::TIMESTAMP as conflict_start,
    (COALESCE(e.end_date, e.start_date) + COALESCE(e.end_time, '23:59'::TIME))::TIMESTAMP as conflict_end,
    EXTRACT(EPOCH FROM (
      LEAST(
        check_end,
        (COALESCE(e.end_date, e.start_date) + COALESCE(e.end_time, '23:59'::TIME))::TIMESTAMP
      ) - GREATEST(
        check_start,
        (e.start_date + COALESCE(e.start_time, '00:00'::TIME))::TIMESTAMP
      )
    ) / 60)::INTEGER as buffer_overlap_minutes
  FROM calendar_events e
  WHERE 
    e.status NOT IN ('cancelled', 'draft')
    AND (exclude_event_id IS NULL OR e.id != exclude_event_id)
    AND (
      -- Event overlaps with check window
      tsrange(
        (e.start_date + COALESCE(e.start_time, '00:00'::TIME))::TIMESTAMP - (COALESCE(e.buffer_hours, 4) || ' hours')::INTERVAL,
        (COALESCE(e.end_date, e.start_date) + COALESCE(e.end_time, '23:59'::TIME))::TIMESTAMP + (COALESCE(e.buffer_hours, 4) || ' hours')::INTERVAL,
        '[]'
      ) && tsrange(check_start, check_end, '[]')
    );
  
  -- Check conflicts with time_slots
  RETURN QUERY
  SELECT 
    'time_slot'::TEXT as conflict_type,
    ts.id as conflict_id,
    COALESCE(ts.slot_type || ' slot', 'Time slot') as conflict_title,
    (ts.slot_date + ts.slot_time)::TIMESTAMP as conflict_start,
    (ts.slot_date + ts.slot_time + '1 hour'::INTERVAL)::TIMESTAMP as conflict_end,
    EXTRACT(EPOCH FROM (
      LEAST(
        check_end,
        (ts.slot_date + ts.slot_time + '1 hour'::INTERVAL)::TIMESTAMP
      ) - GREATEST(
        check_start,
        (ts.slot_date + ts.slot_time)::TIMESTAMP
      )
    ) / 60)::INTEGER as buffer_overlap_minutes
  FROM calendar_time_slots ts
  WHERE 
    ts.status != 'blocked'
    AND (exclude_slot_id IS NULL OR ts.id != exclude_slot_id)
    AND (
      -- Time slot overlaps with check window
      tsrange(
        (ts.slot_date + ts.slot_time)::TIMESTAMP - (COALESCE(ts.buffer_hours, 4) || ' hours')::INTERVAL,
        (ts.slot_date + ts.slot_time + '1 hour'::INTERVAL)::TIMESTAMP + (COALESCE(ts.buffer_hours, 4) || ' hours')::INTERVAL,
        '[]'
      ) && tsrange(check_start, check_end, '[]')
    );
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent event creation/update with conflicts
CREATE OR REPLACE FUNCTION prevent_event_conflicts()
RETURNS TRIGGER AS $$
DECLARE
  conflict_record RECORD;
  conflict_count INTEGER;
BEGIN
  -- Check for conflicts
  SELECT COUNT(*) INTO conflict_count
  FROM check_scheduling_conflicts(
    NEW.start_date,
    COALESCE(NEW.start_time, '00:00'::TIME),
    COALESCE(NEW.buffer_hours, 4),
    NEW.id,
    NULL
  );
  
  IF conflict_count > 0 THEN
    -- Get first conflict for error message
    SELECT * INTO conflict_record
    FROM check_scheduling_conflicts(
      NEW.start_date,
      COALESCE(NEW.start_time, '00:00'::TIME),
      COALESCE(NEW.buffer_hours, 4),
      NEW.id,
      NULL
    )
    LIMIT 1;
    
    RAISE EXCEPTION 'Scheduling conflict: % within % hour buffer (overlaps by % minutes)',
      conflict_record.conflict_title,
      COALESCE(NEW.buffer_hours, 4),
      conflict_record.buffer_overlap_minutes
    USING HINT = 'Change the date/time or reduce buffer_hours';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_event_conflicts
  BEFORE INSERT OR UPDATE ON calendar_events
  FOR EACH ROW
  WHEN (NEW.status NOT IN ('cancelled', 'draft'))
  EXECUTE FUNCTION prevent_event_conflicts();

-- Trigger to prevent time slot creation/update with conflicts
CREATE OR REPLACE FUNCTION prevent_timeslot_conflicts()
RETURNS TRIGGER AS $$
DECLARE
  conflict_record RECORD;
  conflict_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO conflict_count
  FROM check_scheduling_conflicts(
    NEW.slot_date,
    NEW.slot_time,
    COALESCE(NEW.buffer_hours, 4),
    NULL,
    NEW.id
  );
  
  IF conflict_count > 0 THEN
    SELECT * INTO conflict_record
    FROM check_scheduling_conflicts(
      NEW.slot_date,
      NEW.slot_time,
      COALESCE(NEW.buffer_hours, 4),
      NULL,
      NEW.id
    )
    LIMIT 1;
    
    RAISE EXCEPTION 'Scheduling conflict: % within % hour buffer (overlaps by % minutes)',
      conflict_record.conflict_title,
      COALESCE(NEW.buffer_hours, 4),
      conflict_record.buffer_overlap_minutes
    USING HINT = 'Change the date/time or reduce buffer_hours';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_timeslot_conflicts
  BEFORE INSERT OR UPDATE ON calendar_time_slots
  FOR EACH ROW
  WHEN (NEW.status != 'blocked')
  EXECUTE FUNCTION prevent_timeslot_conflicts();

-- Auto-update time slot booked_count when bookings change
CREATE OR REPLACE FUNCTION update_timeslot_booked_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.time_slot_id IS NOT NULL AND NEW.booking_status = 'confirmed' THEN
    UPDATE calendar_time_slots 
    SET booked_count = booked_count + COALESCE(NEW.quantity, 1)
    WHERE id = NEW.time_slot_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.time_slot_id IS NOT NULL THEN
    IF OLD.booking_status = 'confirmed' AND NEW.booking_status = 'cancelled' THEN
      UPDATE calendar_time_slots 
      SET booked_count = booked_count - COALESCE(OLD.quantity, 1)
      WHERE id = OLD.time_slot_id;
    ELSIF OLD.booking_status != 'confirmed' AND NEW.booking_status = 'confirmed' THEN
      UPDATE calendar_time_slots 
      SET booked_count = booked_count + COALESCE(NEW.quantity, 1)
      WHERE id = NEW.time_slot_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.time_slot_id IS NOT NULL AND OLD.booking_status = 'confirmed' THEN
    UPDATE calendar_time_slots 
    SET booked_count = booked_count - COALESCE(OLD.quantity, 1)
    WHERE id = OLD.time_slot_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_timeslot_booked_count
  AFTER INSERT OR UPDATE OR DELETE ON calendar_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_timeslot_booked_count();

-- Prevent overbooking time slots
CREATE OR REPLACE FUNCTION prevent_timeslot_overbooking()
RETURNS TRIGGER AS $$
DECLARE
  slot_capacity INTEGER;
  current_booked INTEGER;
BEGIN
  IF NEW.time_slot_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  SELECT capacity, booked_count INTO slot_capacity, current_booked
  FROM calendar_time_slots
  WHERE id = NEW.time_slot_id
  FOR UPDATE;
  
  IF slot_capacity IS NOT NULL AND 
     current_booked + COALESCE(NEW.quantity, 1) > slot_capacity THEN
    RAISE EXCEPTION 'Time slot at capacity. Available: %, Requested: %', 
      slot_capacity - current_booked, NEW.quantity;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_timeslot_overbooking
  BEFORE INSERT ON calendar_bookings
  FOR EACH ROW
  WHEN (NEW.booking_status = 'confirmed' AND NEW.time_slot_id IS NOT NULL)
  EXECUTE FUNCTION prevent_timeslot_overbooking();

-- View for available time slots (customer-facing)
CREATE OR REPLACE VIEW calendar_time_slots_available AS
SELECT 
  ts.id,
  ts.slot_date,
  ts.slot_time,
  ts.slot_type,
  ts.capacity,
  ts.booked_count,
  CASE 
    WHEN ts.capacity IS NULL THEN NULL
    ELSE ts.capacity - ts.booked_count
  END AS available_slots,
  (ts.capacity IS NULL OR ts.capacity > ts.booked_count) AS is_bookable,
  ts.location,
  ts.metadata
FROM calendar_time_slots ts
WHERE 
  ts.status = 'available'
  AND ts.slot_date >= CURRENT_DATE
  AND (ts.capacity IS NULL OR ts.capacity > ts.booked_count)
ORDER BY ts.slot_date ASC, ts.slot_time ASC;

-- Trigger for time slot updated_at
CREATE TRIGGER update_calendar_time_slots_updated_at 
  BEFORE UPDATE ON calendar_time_slots 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE calendar_time_slots IS 'Granular time slots for inventory-style scheduling control';
COMMENT ON FUNCTION check_scheduling_conflicts IS 'Returns all conflicts within buffer window for given date/time';
COMMENT ON FUNCTION prevent_event_conflicts IS 'Trigger to block event creation/update if conflicts exist';
COMMENT ON FUNCTION prevent_timeslot_conflicts IS 'Trigger to block time slot creation/update if conflicts exist';
