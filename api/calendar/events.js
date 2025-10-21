const { getSupabase } = require('../../backend/api/supabaseClient');

module.exports = async (req, res) => {
  const supabase = getSupabase();
  
  if (req.method === 'GET') {
    const { id } = req.query;
    
    if (id) {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) return res.status(404).json({ error: 'Event not found' });
      return res.json(data);
    }
    
    const { start_date, end_date, visibility, status, event_type } = req.query;
    let query = supabase.from('calendar_events').select('*');
    
    if (start_date) query = query.gte('start_date', start_date);
    if (end_date) query = query.lte('start_date', end_date);
    if (visibility) query = query.eq('visibility', visibility);
    if (status) query = query.eq('status', status);
    if (event_type) query = query.eq('event_type', event_type);
    
    const { data, error } = await query.order('start_date', { ascending: true });
    
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }
  
  if (req.method === 'POST') {
    const { repeat, repeatUntil, ...eventData } = req.body;
    
    if (!eventData.title || !eventData.start_date) {
      return res.status(400).json({ error: 'Title and start_date required' });
    }
    
    const { data, error } = await supabase
      .from('calendar_events')
      .insert([eventData])
      .select()
      .single();
    
    if (error) return res.status(500).json({ error: error.message });
    
    if (repeat && repeat !== 'none' && repeatUntil) {
      const seriesId = data.id;
      const instances = generateRecurringInstances(eventData, repeat, repeatUntil, seriesId);
      
      if (instances.length > 0) {
        await supabase.from('calendar_events').insert(instances);
        await supabase.from('calendar_events')
          .update({ series_id: seriesId })
          .eq('id', seriesId);
      }
    }
    
    return res.status(201).json(data);
  }
  
  if (req.method === 'PUT') {
    const { id } = req.query;
    const eventData = req.body;
    
    if (!id) return res.status(400).json({ error: 'Event ID required' });
    
    const { data, error } = await supabase
      .from('calendar_events')
      .update(eventData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }
  
  if (req.method === 'DELETE') {
    const { id, series } = req.query;
    
    if (!id) return res.status(400).json({ error: 'Event ID required' });
    
    if (series === 'true') {
      const { data: event } = await supabase
        .from('calendar_events')
        .select('series_id')
        .eq('id', id)
        .single();
      
      if (event?.series_id) {
        const { error } = await supabase
          .from('calendar_events')
          .delete()
          .eq('series_id', event.series_id);
        
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ deleted: 'series', series_id: event.series_id });
      }
    }
    
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id);
    
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ deleted: 'single', id });
  }
  
  res.status(405).json({ error: 'Method not allowed' });
};

function generateRecurringInstances(baseEvent, repeat, repeatUntil, seriesId) {
  const instances = [];
  const startDate = new Date(baseEvent.start_date);
  const endDate = new Date(repeatUntil);
  let currentDate = new Date(startDate);
  
  const increment = {
    weekly: 7,
    biweekly: 14,
    monthly: 30
  }[repeat] || 0;
  
  while (currentDate < endDate) {
    currentDate.setDate(currentDate.getDate() + increment);
    if (currentDate <= endDate) {
      instances.push({
        ...baseEvent,
        start_date: currentDate.toISOString().split('T')[0],
        end_date: baseEvent.end_date ? new Date(new Date(baseEvent.end_date).getTime() + increment * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : null,
        series_id: seriesId
      });
    }
  }
  
  return instances;
}
