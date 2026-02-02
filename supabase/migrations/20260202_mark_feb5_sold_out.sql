-- Mark February 5, 2026 as sold out
-- This inserts a placeholder booking to make the date unavailable

INSERT INTO february_bookings (
  booking_date,
  guest_count,
  amount_cents,
  customer_name,
  customer_email,
  customer_phone,
  address_line1,
  address_city,
  address_state,
  address_postal,
  preferred_time,
  status,
  notes
) VALUES (
  '2026-02-05',
  4,
  30000,
  'SOLD OUT - Reserved',
  'yum@localeffortfood.com',
  '0000000000',
  'Reserved',
  'Minneapolis',
  'MN',
  '55113',
  'N/A',
  'confirmed',
  'Date manually marked as sold out'
)
ON CONFLICT (booking_date) WHERE status = 'confirmed' 
DO NOTHING;
