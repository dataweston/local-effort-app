-- Event Requests Table
-- Stores event booking requests from the services page form
CREATE TABLE IF NOT EXISTS event_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  event_date DATE,
  city TEXT,
  state TEXT,
  zip TEXT,
  event_type TEXT,
  guest_count INTEGER,
  notes TEXT,
  send_copy BOOLEAN DEFAULT FALSE,
  dedupe_key TEXT,
  sanity_message_id TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on dedupe_key for faster lookups
CREATE INDEX IF NOT EXISTS idx_event_requests_dedupe_key ON event_requests(dedupe_key);
CREATE INDEX IF NOT EXISTS idx_event_requests_email ON event_requests(email);
CREATE INDEX IF NOT EXISTS idx_event_requests_created_at ON event_requests(created_at DESC);

-- Meal Prep Waitlist Table
-- Stores waitlist sign-ups from the meal prep page
CREATE TABLE IF NOT EXISTS meal_prep_waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  family_size TEXT,
  children TEXT,
  days_per_week TEXT,
  meals_per_day TEXT,
  allergies TEXT,
  questions TEXT,
  sanity_message_id TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for the waitlist table
CREATE INDEX IF NOT EXISTS idx_meal_prep_waitlist_email ON meal_prep_waitlist(email);
CREATE INDEX IF NOT EXISTS idx_meal_prep_waitlist_created_at ON meal_prep_waitlist(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE event_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_prep_waitlist ENABLE ROW LEVEL SECURITY;

-- Create policies to allow inserts from authenticated and anon users
-- (Your backend will use the service role key, so these policies allow public form submissions)
CREATE POLICY "Allow public insert on event_requests" ON event_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public insert on meal_prep_waitlist" ON meal_prep_waitlist
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Create policies to allow authenticated users to read their own submissions
CREATE POLICY "Allow users to read their own event requests" ON event_requests
  FOR SELECT TO authenticated
  USING (email = auth.jwt() ->> 'email');

CREATE POLICY "Allow users to read their own waitlist entries" ON meal_prep_waitlist
  FOR SELECT TO authenticated
  USING (email = auth.jwt() ->> 'email');

-- Add updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to update the updated_at column
DROP TRIGGER IF EXISTS update_event_requests_updated_at ON event_requests;
CREATE TRIGGER update_event_requests_updated_at
  BEFORE UPDATE ON event_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_meal_prep_waitlist_updated_at ON meal_prep_waitlist;
CREATE TRIGGER update_meal_prep_waitlist_updated_at
  BEFORE UPDATE ON meal_prep_waitlist
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
