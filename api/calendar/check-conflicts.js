import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      check_date,
      check_time = '00:00',
      check_buffer_hours = 4,
      exclude_event_id = null,
      exclude_slot_id = null
    } = req.body;

    if (!check_date) {
      return res.status(400).json({ error: 'check_date is required' });
    }

    // Call the conflict detection function
    const { data, error } = await supabase
      .rpc('check_scheduling_conflicts', {
        check_date,
        check_time,
        check_buffer_hours,
        exclude_event_id,
        exclude_slot_id
      });

    if (error) {
      console.error('Conflict check error:', error);
      throw error;
    }

    return res.json({
      conflicts: data || [],
      has_conflicts: data && data.length > 0
    });

  } catch (error) {
    console.error('Check conflicts API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
