-- Create calendar_invitations table for token-based scheduling links
CREATE TABLE IF NOT EXISTS calendar_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  pizza_count INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'used', 'cancelled')),
  booking_id UUID REFERENCES calendar_bookings(id),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  CONSTRAINT valid_pizza_count CHECK (pizza_count > 0)
);

-- Add index on token for fast lookups
CREATE INDEX idx_calendar_invitations_token ON calendar_invitations(token);
CREATE INDEX idx_calendar_invitations_status ON calendar_invitations(status);
CREATE INDEX idx_calendar_invitations_expires ON calendar_invitations(expires_at);

-- Enable RLS
ALTER TABLE calendar_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read pending invitations by token (for validation)
CREATE POLICY "Anyone can read pending invitations by token"
  ON calendar_invitations FOR SELECT
  USING (status = 'pending');

-- Policy: Service role can manage all invitations
CREATE POLICY "Service role can manage invitations"
  ON calendar_invitations FOR ALL
  USING (auth.role() = 'service_role');

-- Update booking.js to mark invitation as used after successful booking
-- (This will be handled in application code)
