const { getSupabase } = require('../../backend/api/supabaseClient');

module.exports = async (req, res) => {
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
  
  // All receipts operations require admin access
  if (!isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  if (req.method === 'GET') {
    const { date, month } = req.query;
    let query = supabase.from('calendar_receipts').select('*');
    
    if (date) {
      query = query.eq('date', date);
    } else if (month) {
      const [year, monthNum] = month.split('-');
      const startDate = `${year}-${monthNum}-01`;
      const endDate = `${year}-${monthNum}-31`;
      query = query.gte('date', startDate).lte('date', endDate);
    }
    
    const { data, error } = await query.order('date', { ascending: false });
    
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }
  
  if (req.method === 'POST') {
    const { store, total, date, notes } = req.body;
    
    if (!store || !total || !date) {
      return res.status(400).json({ error: 'store, total, and date required' });
    }
    
    const { data, error } = await supabase
      .from('calendar_receipts')
      .insert([{ store, total, date, notes }])
      .select()
      .single();
    
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }
  
  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Receipt ID required' });
    
    const { error } = await supabase
      .from('calendar_receipts')
      .delete()
      .eq('id', id);
    
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ deleted: id });
  }
  
  res.status(405).json({ error: 'Method not allowed' });
};
