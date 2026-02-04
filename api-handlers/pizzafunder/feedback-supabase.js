/**
 * GET /api/pizzafunder/feedback
 * Returns recent feedback from Supabase
 * POST /api/pizzafunder/feedback
 * Saves new feedback to Supabase
 * Replaces Firebase Firestore with Supabase Postgres
 */

const { getSupabase } = require('../../backend/api/supabaseClient');

module.exports = async (req, res) => {
  const supabase = getSupabase();

  if (!supabase) {
    return res.status(503).json({ error: 'Database temporarily unavailable' });
  }

  // GET: Fetch recent feedback
  if (req.method === 'GET') {
    try {
      const limit = parseInt(req.query.limit) || 10;

      const { data, error } = await supabase
        .from('crowdfund_feedback')
        .select('id, name, comment, rating, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[pizzafunder.feedback] Error fetching:', error.message);
        throw error;
      }

      // Transform to match Firebase structure
      const feedback = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        comment: item.comment,
        rating: item.rating,
        timestamp: item.created_at,
      }));

      return res.status(200).json({ feedback });
    } catch (error) {
      console.error('[pizzafunder.feedback] GET error:', error.message);
      return res.status(500).json({ 
        error: 'Failed to fetch feedback',
        details: error.message 
      });
    }
  }

  // POST: Submit new feedback
  if (req.method === 'POST') {
    try {
      const { name, comment, rating } = req.body;

      // Validation
      if (!name || !comment) {
        return res.status(400).json({ 
          error: 'Name and comment are required' 
        });
      }

      if (rating && (rating < 1 || rating > 5)) {
        return res.status(400).json({ 
          error: 'Rating must be between 1 and 5' 
        });
      }

      // Insert feedback
      const { data, error } = await supabase
        .from('crowdfund_feedback')
        .insert({
          name: name.trim().substring(0, 200),
          comment: comment.trim().substring(0, 1000),
          rating: rating || null,
        })
        .select()
        .single();

      if (error) {
        console.error('[pizzafunder.feedback] Error inserting:', error.message);
        throw error;
      }

      console.log('[pizzafunder.feedback] New feedback:', {
        id: data.id,
        name: data.name,
        rating: data.rating,
      });

      return res.status(201).json({ 
        success: true,
        feedback: {
          id: data.id,
          name: data.name,
          comment: data.comment,
          rating: data.rating,
          timestamp: data.created_at,
        }
      });
    } catch (error) {
      console.error('[pizzafunder.feedback] POST error:', error.message);
      return res.status(500).json({ 
        error: 'Failed to submit feedback',
        details: error.message 
      });
    }
  }

  // Other methods not allowed
  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
};
