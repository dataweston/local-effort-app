/**
 * Get Integration Status Endpoint
 * Returns the current status of QuickBooks and Square integrations
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

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    // Get all integrations
    const { data: integrations, error } = await supabase
      .from('happymonday_integrations')
      .select('provider, is_active, last_sync_at, last_error, token_expires_at, location_id, realm_id, created_at, updated_at')
      .order('provider');

    if (error) {
      console.error('[HappyMonday] Error fetching integrations:', error);
      return res.status(500).json({ error: error.message });
    }

    // Format response
    const status = {
      quickbooks: {
        connected: false,
        lastSync: null,
        error: null,
        realmId: null,
      },
      square: {
        connected: false,
        lastSync: null,
        error: null,
        locationId: null,
      },
    };

    for (const integration of (integrations || [])) {
      if (integration.provider === 'quickbooks') {
        status.quickbooks = {
          connected: integration.is_active,
          lastSync: integration.last_sync_at,
          error: integration.last_error,
          realmId: integration.realm_id,
          tokenExpires: integration.token_expires_at,
        };
      } else if (integration.provider === 'square') {
        status.square = {
          connected: integration.is_active,
          lastSync: integration.last_sync_at,
          error: integration.last_error,
          locationId: integration.location_id,
          tokenExpires: integration.token_expires_at,
        };
      }
    }

    return res.status(200).json({
      success: true,
      integrations: status,
    });

  } catch (error) {
    console.error('[HappyMonday] Error getting integration status:', error);
    return res.status(500).json({ error: error.message });
  }
};
