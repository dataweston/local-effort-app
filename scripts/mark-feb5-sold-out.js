const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function markFeb5SoldOut() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in .env file');
    console.log('');
    console.log('📋 Please run this manually:');
    console.log('');
    console.log('INSERT INTO february_bookings (');
    console.log("  booking_date, guest_count, amount_cents, customer_name, customer_email,");
    console.log("  customer_phone, address_line1, address_city, address_state, address_postal,");
    console.log("  preferred_time, status, notes");
    console.log(') VALUES (');
    console.log("  '2026-02-05', 4, 30000, 'SOLD OUT - Reserved', 'yum@localeffortfood.com',");
    console.log("  '0000000000', 'Reserved', 'Minneapolis', 'MN', '55113',");
    console.log("  'N/A', 'confirmed', 'Date manually marked as sold out'");
    console.log(')');
    console.log("ON CONFLICT (booking_date) WHERE status = 'confirmed' DO NOTHING;");
    console.log('');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  console.log('🔍 Checking if February 5, 2026 is already booked...');
  
  // Check if already booked
  const { data: existing, error: checkError } = await supabase
    .from('february_bookings')
    .select('id, customer_name')
    .eq('booking_date', '2026-02-05')
    .eq('status', 'confirmed')
    .maybeSingle();

  if (checkError && checkError.code !== 'PGRST116') {
    console.error('❌ Error checking existing bookings:', checkError);
    process.exit(1);
  }

  if (existing) {
    console.log(`✓ February 5, 2026 is already booked`);
    console.log(`  Customer: ${existing.customer_name}`);
    console.log(`  Booking ID: ${existing.id}`);
    process.exit(0);
  }
  
  console.log('📝 Marking February 5, 2026 as SOLD OUT...');
  
  // Insert the sold out record
  const { data, error } = await supabase
    .from('february_bookings')
    .insert({
      booking_date: '2026-02-05',
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
    console.error('❌ Failed to mark date as sold out:', error);
    console.log('');
    console.log('📋 Please run this SQL manually in Supabase:');
    console.log('');
    console.log('INSERT INTO february_bookings (');
    console.log("  booking_date, guest_count, amount_cents, customer_name, customer_email,");
    console.log("  customer_phone, address_line1, address_city, address_state, address_postal,");
    console.log("  preferred_time, status, notes");
    console.log(') VALUES (');
    console.log("  '2026-02-05', 4, 30000, 'SOLD OUT - Reserved', 'yum@localeffortfood.com',");
    console.log("  '0000000000', 'Reserved', 'Minneapolis', 'MN', '55113',");
    console.log("  'N/A', 'confirmed', 'Date manually marked as sold out'");
    console.log(');');
    console.log('');
    process.exit(1);
  }

  console.log('✅ Successfully marked February 5, 2026 as SOLD OUT');
  console.log(`  Booking ID: ${data.id}`);
  console.log(`  Created at: ${data.created_at}`);
  console.log('');
  console.log('🎯 February 5 will now appear as sold out on the booking page.');
  process.exit(0);
}

markFeb5SoldOut();
