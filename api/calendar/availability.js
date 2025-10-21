const { getSupabase } = require('../../backend/api/supabaseClient');

module.exports = async (req, res) => {
  const supabase = getSupabase();
  
  if (req.method === 'GET') {
    const { date, event_id } = req.query;
    
    if (!date && !event_id) {
      return res.status(400).json({ error: 'date or event_id required' });
    }
    
    let query = supabase.from('calendar_events').select('id, title, start_date, capacity, booked_slots');
    
    if (event_id) {
      query = query.eq('id', event_id);
    } else {
      query = query.eq('start_date', date);
    }
    
    query = query.eq('visibility', 'public')
      .in('status', ['scheduled', 'confirmed'])
      .not('capacity', 'is', null);
    
    const { data, error } = await query;
    
    if (error) return res.status(500).json({ error: error.message });
    
    const availability = data.map(event => ({
      event_id: event.id,
      title: event.title,
      date: event.start_date,
      available_slots: event.capacity - event.booked_slots,
      capacity: event.capacity
    }));
    
    return res.json(availability);
  }
  
  res.status(405).json({ error: 'Method not allowed' });
};
