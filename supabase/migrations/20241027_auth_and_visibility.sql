-- Migration: Add Google OAuth support and ensure visibility column exists
-- Date: 2025-10-27

-- Ensure visibility column exists with proper constraint
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'calendar_events' 
        AND column_name = 'visibility'
    ) THEN
        ALTER TABLE calendar_events 
        ADD COLUMN visibility TEXT DEFAULT 'private' 
        CHECK (visibility IN ('public', 'private'));
    END IF;
END $$;

-- Update existing NULL visibility to 'private'
UPDATE calendar_events 
SET visibility = 'private' 
WHERE visibility IS NULL;

-- Enable Row Level Security
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public events are viewable by everyone" ON calendar_events;
DROP POLICY IF EXISTS "Authenticated users can view all events" ON calendar_events;
DROP POLICY IF EXISTS "Admin users have full access" ON calendar_events;

-- Policy: Public events viewable by everyone (even unauthenticated)
CREATE POLICY "Public events are viewable by everyone"
ON calendar_events
FOR SELECT
USING (visibility = 'public');

-- Policy: Authenticated users can view public events (redundant but explicit)
CREATE POLICY "Authenticated users can view public events"
ON calendar_events
FOR SELECT
TO authenticated
USING (visibility = 'public');

-- Policy: Admin users (specific emails) have full access
CREATE POLICY "Admin users have full access"
ON calendar_events
FOR ALL
TO authenticated
USING (
    auth.jwt() ->> 'email' IN ('dataweston@gmail.com', 'colsen03@gmail.com')
);

-- Ensure calendar_time_slots table has proper structure
CREATE TABLE IF NOT EXISTS calendar_time_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
    slot_date DATE NOT NULL,
    slot_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    capacity INTEGER DEFAULT 1,
    booked_count INTEGER DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add is_available column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'calendar_time_slots' 
        AND column_name = 'is_available'
    ) THEN
        ALTER TABLE calendar_time_slots 
        ADD COLUMN is_available BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Enable RLS on time slots
ALTER TABLE calendar_time_slots ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view available time slots" ON calendar_time_slots;
DROP POLICY IF EXISTS "Admin users can manage time slots" ON calendar_time_slots;

-- Policy: Anyone can view available time slots (only if is_available column exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'calendar_time_slots' 
        AND column_name = 'is_available'
    ) THEN
        EXECUTE 'CREATE POLICY "Anyone can view available time slots"
        ON calendar_time_slots
        FOR SELECT
        USING (is_available = true)';
    ELSE
        -- Fallback: allow viewing all time slots if is_available doesn't exist
        EXECUTE 'CREATE POLICY "Anyone can view time slots"
        ON calendar_time_slots
        FOR SELECT
        USING (true)';
    END IF;
END $$;

-- Policy: Admin users can manage time slots
CREATE POLICY "Admin users can manage time slots"
ON calendar_time_slots
FOR ALL
TO authenticated
USING (
    auth.jwt() ->> 'email' IN ('dataweston@gmail.com', 'colsen03@gmail.com')
);
