-- Triggers for Calendar System

-- Auto-update booked_slots when booking created/cancelled
CREATE OR REPLACE FUNCTION update_event_booked_slots()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.booking_status = 'confirmed' THEN
    UPDATE calendar_events 
    SET booked_slots = booked_slots + COALESCE(NEW.quantity, 1)
    WHERE id = NEW.event_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.booking_status = 'confirmed' AND NEW.booking_status = 'cancelled' THEN
      UPDATE calendar_events 
      SET booked_slots = booked_slots - COALESCE(OLD.quantity, 1)
      WHERE id = OLD.event_id;
    ELSIF OLD.booking_status != 'confirmed' AND NEW.booking_status = 'confirmed' THEN
      UPDATE calendar_events 
      SET booked_slots = booked_slots + COALESCE(NEW.quantity, 1)
      WHERE id = NEW.event_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.booking_status = 'confirmed' THEN
    UPDATE calendar_events 
    SET booked_slots = booked_slots - COALESCE(OLD.quantity, 1)
    WHERE id = OLD.event_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_booked_slots
  AFTER INSERT OR UPDATE OR DELETE ON calendar_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_event_booked_slots();

-- Prevent overbooking
CREATE OR REPLACE FUNCTION prevent_overbooking()
RETURNS TRIGGER AS $$
DECLARE
  event_capacity INTEGER;
  current_booked INTEGER;
BEGIN
  SELECT capacity, booked_slots INTO event_capacity, current_booked
  FROM calendar_events
  WHERE id = NEW.event_id
  FOR UPDATE;
  
  IF event_capacity IS NOT NULL AND 
     current_booked + COALESCE(NEW.quantity, 1) > event_capacity THEN
    RAISE EXCEPTION 'Event is at capacity. Available: %, Requested: %', 
      event_capacity - current_booked, NEW.quantity;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_overbooking
  BEFORE INSERT ON calendar_bookings
  FOR EACH ROW
  WHEN (NEW.booking_status = 'confirmed')
  EXECUTE FUNCTION prevent_overbooking();

COMMENT ON FUNCTION update_event_booked_slots() IS 'Auto-updates booked_slots counter when bookings change';
COMMENT ON FUNCTION prevent_overbooking() IS 'Prevents creating bookings that exceed event capacity';
