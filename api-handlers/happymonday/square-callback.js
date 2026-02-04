/**
 * Square OAuth Callback Endpoint
 * Handles the OAuth callback from Happy Monday's Square authorization
 * Stores tokens for inventory sync operations
 */

const { Client, Environment } = require('square');

const SQ_APP_ID = process.env.SQUARE_APP_ID || process.env.VITE_SQUARE_APP_ID;
const SQ_APP_SECRET = process.env.SQUARE_APP_SECRET;
const SQ_ENVIRONMENT = (process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase();

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state, error: oauthError } = req.query;

  // Handle OAuth errors
  if (oauthError) {
    console.error('[HappyMonday] Square OAuth error:', oauthError);
    return res.redirect('/partners/happy-monday?sq_error=' + encodeURIComponent(oauthError));
  }

  if (!code) {
    return res.redirect('/partners/happy-monday?sq_error=missing_code');
  }

  if (!SQ_APP_ID || !SQ_APP_SECRET) {
    console.error('[HappyMonday] Square OAuth credentials not configured');
    return res.redirect('/partners/happy-monday?sq_error=not_configured');
  }

  if (!supabase) {
    console.error('[HappyMonday] Supabase not configured');
    return res.redirect('/partners/happy-monday?sq_error=db_error');
  }

  try {
    // Create Square client for token exchange
    const env = SQ_ENVIRONMENT === 'sandbox' ? Environment.Sandbox : Environment.Production;
    const squareClient = new Client({ environment: env });

    // Exchange authorization code for tokens
    const tokenResponse = await squareClient.oAuthApi.obtainToken({
      clientId: SQ_APP_ID,
      clientSecret: SQ_APP_SECRET,
      code,
      grantType: 'authorization_code',
    });

    const result = tokenResponse.result;
    
    if (!result.accessToken) {
      console.error('[HappyMonday] Square token exchange failed:', result);
      return res.redirect('/partners/happy-monday?sq_error=token_exchange_failed');
    }

    // Calculate token expiry
    const expiresAt = result.expiresAt 
      ? new Date(result.expiresAt)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default 30 days

    // Get merchant info to find location
    const merchantClient = new Client({
      accessToken: result.accessToken,
      environment: env,
    });

    let locationId = null;
    let merchantId = result.merchantId;

    try {
      const locationsResponse = await merchantClient.locationsApi.listLocations();
      const locations = locationsResponse.result.locations || [];
      
      // Use the first active location
      const activeLocation = locations.find(l => l.status === 'ACTIVE');
      if (activeLocation) {
        locationId = activeLocation.id;
      }
      
      console.log('[HappyMonday] Found Square locations:', locations.length, 'Active:', locationId);
    } catch (locErr) {
      console.warn('[HappyMonday] Could not fetch Square locations:', locErr.message);
    }

    // Upsert integration record
    const { error: dbError } = await supabase
      .from('happymonday_integrations')
      .upsert({
        provider: 'square',
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
        token_expires_at: expiresAt.toISOString(),
        merchant_id: merchantId,
        location_id: locationId,
        scopes: ['INVENTORY_READ', 'INVENTORY_WRITE', 'ITEMS_READ', 'MERCHANT_PROFILE_READ'],
        is_active: true,
        last_error: null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'provider',
      });

    if (dbError) {
      console.error('[HappyMonday] Error saving Square tokens:', dbError);
      return res.redirect('/partners/happy-monday?sq_error=db_save_failed');
    }

    console.log('[HappyMonday] ✅ Square connected successfully for merchant:', merchantId);

    // Redirect back to portal with success
    return res.redirect('/partners/happy-monday?sq_connected=true');

  } catch (error) {
    console.error('[HappyMonday] Square callback error:', error);
    return res.redirect('/partners/happy-monday?sq_error=unknown');
  }
};
