const { getSupabase } = require('../../backend/api/supabaseClient');
const crypto = require('crypto');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const supabase = getSupabase();
  
  // Extract user session for auth
  const authHeader = req.headers.authorization;
  let isAdmin = false;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        const adminEmails = ['dataweston@gmail.com', 'colsen03@gmail.com'];
        isAdmin = adminEmails.includes(user.email?.toLowerCase());
      }
    } catch (err) {
      // Auth failed
    }
  }
  
  if (!isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  const { 
    customer_name, 
    customer_email, 
    pizza_count,
    expires_days = 30 
  } = req.body;
  
  if (!customer_name || !customer_email) {
    return res.status(400).json({ 
      error: 'customer_name and customer_email required' 
    });
  }
  
  // Generate unique token
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expires_days);
  
  // Store invitation in database
  const { data, error } = await supabase
    .from('calendar_invitations')
    .insert([{
      token,
      customer_name,
      customer_email,
      pizza_count: pizza_count || 1,
      status: 'pending',
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString()
    }])
    .select()
    .single();
  
  if (error) {
    console.error('Failed to create invitation:', error);
    return res.status(500).json({ error: 'Failed to create invitation' });
  }
  
  const scheduleUrl = `${req.headers.origin || 'https://localeffortfood.com'}/schedule/${token}`;
  
  return res.json({ 
    invitation: data,
    schedule_url: scheduleUrl,
    message: 'Invitation created successfully'
  });
};
