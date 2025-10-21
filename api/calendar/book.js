const { getSupabase } = require('../../backend/api/supabaseClient');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const supabase = getSupabase();
  const { event_id, customer_name, customer_email, customer_phone, booking_type, slot_time, quantity, notes } = req.body;
  
  if (!event_id || !customer_name || !customer_email) {
    return res.status(400).json({ error: 'event_id, customer_name, and customer_email required' });
  }
  
  const bookingData = {
    event_id,
    customer_name,
    customer_email,
    customer_phone: customer_phone || null,
    booking_type: booking_type || 'other',
    booking_status: 'confirmed',
    slot_time: slot_time || null,
    quantity: quantity || 1,
    notes: notes || null
  };
  
  const { data, error } = await supabase
    .from('calendar_bookings')
    .insert([bookingData])
    .select()
    .single();
  
  if (error) {
    if (error.message.includes('at capacity')) {
      return res.status(409).json({ error: 'Event is at capacity', details: error.message });
    }
    return res.status(500).json({ error: error.message });
  }
  
  return res.status(201).json({ booking: data, message: 'Booking confirmed' });
};
