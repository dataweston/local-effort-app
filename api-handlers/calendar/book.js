const { getSupabase } = require('../../backend/api/supabaseClient');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const supabase = getSupabase();
  const { 
    event_id, 
    time_slot_id,
    customer_name, 
    customer_email, 
    customer_phone, 
    booking_type, 
    slot_time, 
    quantity, 
    notes 
  } = req.body;
  
  // Must provide either event_id or time_slot_id
  if ((!event_id && !time_slot_id) || !customer_name || !customer_email) {
    return res.status(400).json({ 
      error: 'Must provide (event_id or time_slot_id), customer_name, and customer_email' 
    });
  }
  
  // If booking a time slot, verify it's available
  if (time_slot_id) {
    const { data: timeSlot, error: slotError } = await supabase
      .from('calendar_time_slots')
      .select('capacity, booked_count, status')
      .eq('id', time_slot_id)
      .single();
    
    if (slotError || !timeSlot) {
      return res.status(404).json({ error: 'Time slot not found' });
    }
    
    if (timeSlot.status !== 'available') {
      return res.status(400).json({ error: 'Time slot is not available' });
    }
    
    if (timeSlot.capacity !== null && 
        timeSlot.booked_count + (quantity || 1) > timeSlot.capacity) {
      return res.status(409).json({ 
        error: 'Time slot at capacity',
        available: timeSlot.capacity - timeSlot.booked_count,
        requested: quantity || 1
      });
    }
  }
  
  const bookingData = {
    event_id: event_id || null,
    time_slot_id: time_slot_id || null,
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
      return res.status(409).json({ 
        error: 'At capacity', 
        details: error.message 
      });
    }
    if (error.message.includes('Scheduling conflict')) {
      return res.status(409).json({ 
        error: 'Scheduling conflict', 
        details: error.message 
      });
    }
    console.error('Booking error:', error);
    return res.status(500).json({ error: error.message });
  }
  
  return res.status(201).json({ 
    booking: data, 
    message: 'Booking confirmed',
    type: time_slot_id ? 'time_slot' : 'event'
  });
};
