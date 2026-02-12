const { getSupabase } = require('../../backend/api/supabaseClient');

module.exports = async (req, res) => {
  const supabase = getSupabase();

  if (req.method === 'GET') {
    const { event_type, limit = '50' } = req.query;

    let query = supabase
      .from('calendar_events_public')
      .select('*');

    // Filter by event type if specified
    if (event_type) {
      query = query.eq('event_type', event_type);
    }

    const limitNum = parseInt(limit, 10);
    if (!isNaN(limitNum) && limitNum > 0 && limitNum <= 100) {
      query = query.limit(limitNum);
    } else {
      query = query.limit(50);
    }

    const { data, error } = await query;

    if (error) return res.status(500).json({ error: 'Internal server error' });

    // Return array directly (not wrapped in object)
    return res.json(data || []);
  }

  res.status(405).json({ error: 'Method not allowed' });
};
