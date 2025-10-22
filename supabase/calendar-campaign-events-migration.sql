-- Migration: Add PizzaFunder Campaign Event Support
-- Run this if you've already deployed the Phase 1 schema

-- Add 'pizza_pickup' to event_type enum
ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_event_type_check;
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_event_type_check 
  CHECK (event_type IN ('pizza_party', 'pizza_pickup', 'meal_prep', 'catering', 'private_event', 'blocked', 'other'));

-- Add 'postponed' and 'sold_out' to status enum
ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_status_check;
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_status_check 
  CHECK (status IN ('draft', 'scheduled', 'confirmed', 'completed', 'cancelled', 'postponed', 'sold_out'));

-- Verify the changes
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name IN ('calendar_events_event_type_check', 'calendar_events_status_check');
