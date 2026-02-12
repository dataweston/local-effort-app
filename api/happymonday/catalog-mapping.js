/**
 * Save Catalog Mapping Endpoint
 * Saves item-to-catalog mappings for inventory sync
 */

// Supabase client
let supabase = null;
try {
  const { createClient } = require('@supabase/supabase-js');
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
  }
} catch (err) {
  console.warn('[HappyMonday] Supabase not available:', err.message);
}

const ALLOWED_ORIGINS = ['https://localeffortfood.com', 'https://www.localeffortfood.com'];

module.exports = async function handler(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  // GET - Fetch current mappings
  if (req.method === 'GET') {
    try {
      const { data: mappings, error } = await supabase
        .from('happymonday_item_catalog_mapping')
        .select('*')
        .order('local_item_id', { ascending: true });

      if (error) {
        return res.status(500).json({ error: 'Internal server error' });
      }

      return res.status(200).json({
        success: true,
        mappings: mappings || [],
      });

    } catch (error) {
      console.error('[HappyMonday] Error fetching mappings:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // POST - Save mappings
  if (req.method === 'POST') {
    try {
      const { mappings } = req.body;

      if (!Array.isArray(mappings)) {
        return res.status(400).json({ error: 'Mappings must be an array' });
      }

      // Validate and prepare mappings
      const validMappings = mappings
        .filter(m => m.local_item_id && (m.square_catalog_object_id || m.square_catalog_variation_id))
        .map(m => ({
          local_item_id: parseInt(m.local_item_id),
          local_item_name: m.local_item_name || `Item ${m.local_item_id}`,
          square_catalog_object_id: m.square_catalog_object_id || null,
          square_catalog_variation_id: m.square_catalog_variation_id || null,
          qb_item_id: m.qb_item_id || null,
          qb_item_name: m.qb_item_name || null,
          is_active: m.is_active !== false,
          updated_at: new Date().toISOString(),
        }));

      if (validMappings.length === 0) {
        return res.status(400).json({ error: 'No valid mappings provided' });
      }

      // Upsert mappings
      const { data, error } = await supabase
        .from('happymonday_item_catalog_mapping')
        .upsert(validMappings, {
          onConflict: 'local_item_id',
        })
        .select();

      if (error) {
        console.error('[HappyMonday] Error saving mappings:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }

      console.log(`[HappyMonday] ✅ Saved ${data.length} catalog mappings`);

      return res.status(200).json({
        success: true,
        saved: data.length,
        mappings: data,
      });

    } catch (error) {
      console.error('[HappyMonday] Error saving mappings:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
