import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const { method } = req;

  try {
    // GET - List time slots with filters
    if (method === 'GET') {
      const { date, type, status, available_only } = req.query;
      
      let query = available_only === 'true' 
        ? supabase.from('calendar_time_slots_available').select('*')
        : supabase.from('calendar_time_slots').select('*');
      
      if (date) {
        query = query.eq('slot_date', date);
      }
      
      if (type) {
        query = query.eq('slot_type', type);
      }
      
      if (status && available_only !== 'true') {
        query = query.eq('status', status);
      }
      
      query = query.order('slot_date', { ascending: true })
                   .order('slot_time', { ascending: true });
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return res.json(data || []);
    }
    
    // POST - Create new time slot
    if (method === 'POST') {
      const {
        slot_date,
        slot_time,
        slot_type = 'pizza_pickup',
        capacity = null,
        buffer_hours = 4,
        location,
        notes,
        metadata
      } = req.body;
      
      if (!slot_date || !slot_time) {
        return res.status(400).json({ 
          error: 'Missing required fields: slot_date, slot_time' 
        });
      }
      
      // Check for conflicts before creating
      const { data: conflicts, error: conflictError } = await supabase
        .rpc('check_scheduling_conflicts', {
          check_date: slot_date,
          check_time: slot_time,
          check_buffer_hours: buffer_hours
        });
      
      if (conflictError) {
        console.error('Conflict check error:', conflictError);
      }
      
      if (conflicts && conflicts.length > 0) {
        return res.status(409).json({
          error: 'Scheduling conflict detected',
          conflicts: conflicts.map(c => ({
            type: c.conflict_type,
            title: c.conflict_title,
            start: c.conflict_start,
            end: c.conflict_end,
            overlap_minutes: c.buffer_overlap_minutes
          }))
        });
      }
      
      const { data, error } = await supabase
        .from('calendar_time_slots')
        .insert({
          slot_date,
          slot_time,
          slot_type,
          capacity,
          buffer_hours,
          location,
          notes,
          metadata,
          status: 'available'
        })
        .select()
        .single();
      
      if (error) {
        // Conflict caught by trigger
        if (error.message?.includes('Scheduling conflict')) {
          return res.status(409).json({ 
            error: 'Scheduling conflict',
            message: error.message 
          });
        }
        throw error;
      }
      
      return res.status(201).json(data);
    }
    
    // PATCH - Update time slot
    if (method === 'PATCH') {
      const { id } = req.query;
      const updates = req.body;
      
      if (!id) {
        return res.status(400).json({ error: 'Missing time slot ID' });
      }
      
      // If changing date/time, check for conflicts
      if (updates.slot_date || updates.slot_time || updates.buffer_hours) {
        const { data: existing } = await supabase
          .from('calendar_time_slots')
          .select('slot_date, slot_time, buffer_hours')
          .eq('id', id)
          .single();
        
        const checkDate = updates.slot_date || existing.slot_date;
        const checkTime = updates.slot_time || existing.slot_time;
        const checkBuffer = updates.buffer_hours || existing.buffer_hours;
        
        const { data: conflicts } = await supabase
          .rpc('check_scheduling_conflicts', {
            check_date: checkDate,
            check_time: checkTime,
            check_buffer_hours: checkBuffer,
            exclude_slot_id: id
          });
        
        if (conflicts && conflicts.length > 0) {
          return res.status(409).json({
            error: 'Scheduling conflict detected',
            conflicts: conflicts.map(c => ({
              type: c.conflict_type,
              title: c.conflict_title,
              start: c.conflict_start,
              end: c.conflict_end,
              overlap_minutes: c.buffer_overlap_minutes
            }))
          });
        }
      }
      
      const { data, error } = await supabase
        .from('calendar_time_slots')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        if (error.message?.includes('Scheduling conflict')) {
          return res.status(409).json({ 
            error: 'Scheduling conflict',
            message: error.message 
          });
        }
        throw error;
      }
      
      if (!data) {
        return res.status(404).json({ error: 'Time slot not found' });
      }
      
      return res.json(data);
    }
    
    // DELETE - Delete time slot
    if (method === 'DELETE') {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ error: 'Missing time slot ID' });
      }
      
      // Check if slot has bookings
      const { data: bookings } = await supabase
        .from('calendar_bookings')
        .select('id')
        .eq('time_slot_id', id)
        .eq('booking_status', 'confirmed');
      
      if (bookings && bookings.length > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete time slot with confirmed bookings',
          booking_count: bookings.length
        });
      }
      
      const { error } = await supabase
        .from('calendar_time_slots')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      return res.status(204).end();
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('Time slots API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
