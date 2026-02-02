// Script to mark February 5, 2026 as sold out
// This inserts a placeholder booking record to make the date unavailable

const { getSupabase } = require('../backend/api/supabaseClient');

async function markFeb5Sold() {
  const supabase = getSupabase();
  if (!supabase) {
    console.error('❌ Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const bookingDate = '2026-02-05';
  
  // Check if already booked
  const { data: existing } = await supabase
    .from('february_bookings')
    .select('id, customer_name')
    .eq('booking_date', bookingDate)
    .eq('status', 'confirmed')
    .single();

  if (existing) {
    console.log(`✓ February 5, 2026 is already booked (customer: ${existing.customer_name})`);
    process.exit(0);
  }

  // Insert a placeholder booking to mark as sold out
  const { data, error } = await supabase
    .from('february_bookings')
    .insert({
      booking_date: bookingDate,
      guest_count: 4,
      amount_cents: 30000,
      customer_name: 'SOLD OUT - Reserved',
      customer_email: 'yum@localeffortfood.com',
      customer_phone: '0000000000',
      address_line1: 'Reserved',
      address_city: 'Minneapolis',
      address_state: 'MN',
      address_postal: '55113',
      preferred_time: 'N/A',
      status: 'confirmed',
      notes: 'Date manually marked as sold out'
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Failed to mark date as sold:', error);
    process.exit(1);
  }

  console.log('✓ Successfully marked February 5, 2026 as SOLD OUT');
  console.log('  Booking ID:', data.id);
  process.exit(0);
}

markFeb5Sold();
