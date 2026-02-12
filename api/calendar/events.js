const { getSupabase } = require('../../backend/api/supabaseClient');

function sanitizeEventPayload(payload = {}) {
  const sanitized = { ...payload };

  // Remove form-only fields that don't exist on the table
  delete sanitized.buffer_hours;
  delete sanitized.repeat;
  delete sanitized.repeatUntil;

  // Coerce optional date/time fields
  ['end_date'].forEach((field) => {
    if (!sanitized[field]) sanitized[field] = null;
  });

  ['start_time', 'end_time'].forEach((field) => {
    if (!sanitized[field]) sanitized[field] = null;
  });

  // Integers
  ['capacity', 'booked_slots'].forEach((field) => {
    if (sanitized[field] === '' || sanitized[field] === undefined) {
      sanitized[field] = null;
    } else if (sanitized[field] !== null) {
      const parsed = parseInt(sanitized[field], 10);
      sanitized[field] = Number.isNaN(parsed) ? null : parsed;
    }
  });

  // Numeric/decimal fields
  [
    'estimated_revenue',
    'estimated_food_cost',
    'estimated_labor_cost',
    'actual_revenue',
    'actual_food_cost',
    'actual_labor_cost',
  ].forEach((field) => {
    if (sanitized[field] === '' || sanitized[field] === undefined) {
      sanitized[field] = null;
    } else if (sanitized[field] !== null) {
      const parsed = parseFloat(sanitized[field]);
      sanitized[field] = Number.isNaN(parsed) ? null : parsed;
    }
  });

  // Empty strings to null for optional text fields
  ['location', 'notes', 'sanity_data', 'image_url', 'image_alt', 'description', 'link_url', 'link_label'].forEach((field) => {
    if (sanitized[field] === '') sanitized[field] = null;
  });

  return sanitized;
}

module.exports = async (req, res) => {
  const supabase = getSupabase();
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }
  
  // Extract user session if present (for auth-based filtering)
  const authHeader = req.headers.authorization;
  let userEmail = null;
  let isAdmin = false;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        userEmail = user.email;
        const adminEmails = ['dataweston@gmail.com', 'colsen03@gmail.com'];
        isAdmin = adminEmails.includes(userEmail?.toLowerCase());
      }
    } catch (err) {
      // Continue without auth
    }
  }
  
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
    
    // Filter by visibility unless user is admin
    if (!isAdmin) {
      query = query.eq('visibility', 'public');
    }
    
    if (start_date) query = query.gte('start_date', start_date);
    if (end_date) query = query.lte('start_date', end_date);
    if (visibility && isAdmin) query = query.eq('visibility', visibility);
    if (status) query = query.eq('status', status);
    if (event_type) query = query.eq('event_type', event_type);
    
    const { data, error } = await query.order('start_date', { ascending: true });
    
    if (error) return res.status(500).json({ error: 'Internal server error' });
    return res.json(data);
  }

  if (req.method === 'POST') {
    // Only admins can create events
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { repeat, repeatUntil, ...eventData } = req.body;
    const sanitizedEventData = sanitizeEventPayload(eventData);
    
    if (!sanitizedEventData.title || !sanitizedEventData.start_date) {
      return res.status(400).json({ error: 'Title and start_date required' });
    }
    
    const { data, error } = await supabase
      .from('calendar_events')
      .insert([sanitizedEventData])
      .select()
      .single();
    
    if (error) return res.status(500).json({ error: 'Internal server error' });

    if (repeat && repeat !== 'none' && repeatUntil) {
      const seriesId = data.id;
      const instances = generateRecurringInstances(sanitizedEventData, repeat, repeatUntil, seriesId);
      
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
    // Only admins can update events
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { id } = req.query;
    const eventData = sanitizeEventPayload(req.body);
    
    if (!id) return res.status(400).json({ error: 'Event ID required' });
    
    const { data, error } = await supabase
      .from('calendar_events')
      .update(eventData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) return res.status(500).json({ error: 'Internal server error' });
    return res.json(data);
  }

  if (req.method === 'DELETE') {
    // Only admins can delete events
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
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
        
        if (error) return res.status(500).json({ error: 'Internal server error' });
        return res.json({ deleted: 'series', series_id: event.series_id });
      }
    }
    
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id);
    
    if (error) return res.status(500).json({ error: 'Internal server error' });
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
