const { getSupabase } = require('../../backend/api/supabaseClient');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const supabase = getSupabase();
  const { token } = req.query;
  
  if (!token) {
    return res.status(400).json({ error: 'Token required' });
  }
  
  // Fetch invitation by token
  const { data, error } = await supabase
    .from('calendar_invitations')
    .select('*')
    .eq('token', token)
    .single();
  
  if (error || !data) {
    return res.status(404).json({ error: 'Invitation not found' });
  }
  
  // Check if expired
  const now = new Date();
  const expiresAt = new Date(data.expires_at);
  if (now > expiresAt) {
    return res.status(410).json({ error: 'Invitation expired' });
  }
  
  // Check if already used
  if (data.status === 'used') {
    return res.status(409).json({ error: 'Invitation already used' });
  }
  
  return res.json({ 
    invitation: {
      customer_name: data.customer_name,
      customer_email: data.customer_email,
      pizza_count: data.pizza_count,
      expires_at: data.expires_at
    },
    valid: true
  });
};
