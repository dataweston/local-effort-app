/**
 * GET /api/pizzafunder/status
 * Returns current pizza funding totals from Supabase
 * Replaces Firebase Firestore with Supabase Postgres
 */

const { getSupabase } = require('../../backend/api/supabaseClient');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getSupabase();
  
  if (!supabase) {
    // Graceful fallback - return safe defaults
    return res.status(200).json({
      pizzas: 0,
      backers: 0,
      goal: 1000,
      source: 'fallback',
    });
  }

  try {
    // Use the helper function or direct query
    const { data, error } = await supabase
      .from('crowdfund_aggregates')
      .select('pizzas, backers, goal, last_updated')
      .eq('id', 'crowdfunding')
      .single();

    if (error) {
      console.error('[pizzafunder.status] Supabase error:', error.message);
      throw error;
    }

    if (!data) {
      return res.status(200).json({
        pizzas: 0,
        backers: 0,
        goal: 1000,
        source: 'default',
      });
    }
    
    return res.status(200).json({
      pizzas: Number(data.pizzas) || 0,
      backers: Number(data.backers) || 0,
      goal: Number(data.goal) || 1000,
      lastUpdated: data.last_updated || null,
      source: 'supabase',
    });
  } catch (error) {
    console.error('[pizzafunder.status] Error fetching totals:', error.message);
    
    // Still return graceful fallback
    return res.status(200).json({
      pizzas: 0,
      backers: 0,
      goal: 1000,
      source: 'error-fallback',
      error: 'Failed to fetch current totals',
    });
  }
};
