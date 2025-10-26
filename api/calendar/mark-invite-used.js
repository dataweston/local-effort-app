const { getSupabase } = require('../../backend/api/supabaseClient');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const supabase = getSupabase();
  const { token, booking_id } = req.body;
  
  if (!token || !booking_id) {
    return res.status(400).json({ error: 'token and booking_id required' });
  }
  
  // Update invitation status
  const { error } = await supabase
    .from('calendar_invitations')
    .update({
      status: 'used',
      booking_id,
      used_at: new Date().toISOString()
    })
    .eq('token', token)
    .select()
    .single();
  
  if (error) {
    console.error('Failed to mark invitation as used:', error);
    return res.status(500).json({ error: error.message });
  }
  
  return res.json({ 
    success: true,
    message: 'Invitation marked as used'
  });
};
