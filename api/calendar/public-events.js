const { getSupabase } = require('../../backend/api/supabaseClient');

module.exports = async (req, res) => {
  const supabase = getSupabase();
  
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('calendar_events_public')
      .select('*')
      .limit(50);
    
    if (error) return res.status(500).json({ error: error.message });
    
    // Return array directly (not wrapped in object)
    return res.json(data || []);
  }
  
  res.status(405).json({ error: 'Method not allowed' });
};
