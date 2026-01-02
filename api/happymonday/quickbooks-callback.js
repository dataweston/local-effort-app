/**
 * QuickBooks OAuth Callback Endpoint
 * Handles the OAuth callback and stores tokens
 */

const QB_CLIENT_ID = process.env.QUICKBOOKS_CLIENT_ID;
const QB_CLIENT_SECRET = process.env.QUICKBOOKS_CLIENT_SECRET;
const QB_REDIRECT_URI = process.env.QUICKBOOKS_REDIRECT_URI || 'https://localeffortfood.com/api/happymonday/quickbooks-callback';
const QB_ENVIRONMENT = process.env.QUICKBOOKS_ENVIRONMENT || 'production';

const QB_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';

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

  const { code, state, realmId, error: oauthError } = req.query;

  // Handle OAuth errors
  if (oauthError) {
    console.error('[HappyMonday] QuickBooks OAuth error:', oauthError);
    return res.redirect('/partners/happy-monday?qb_error=' + encodeURIComponent(oauthError));
  }

  if (!code || !realmId) {
    return res.redirect('/partners/happy-monday?qb_error=missing_code');
  }

  if (!QB_CLIENT_ID || !QB_CLIENT_SECRET) {
    console.error('[HappyMonday] QuickBooks credentials not configured');
    return res.redirect('/partners/happy-monday?qb_error=not_configured');
  }

  if (!supabase) {
    console.error('[HappyMonday] Supabase not configured');
    return res.redirect('/partners/happy-monday?qb_error=db_error');
  }

  try {
    // Exchange authorization code for tokens
    const basicAuth = Buffer.from(`${QB_CLIENT_ID}:${QB_CLIENT_SECRET}`).toString('base64');
    
    const tokenResponse = await fetch(QB_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: QB_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('[HappyMonday] QuickBooks token exchange failed:', errorData);
      return res.redirect('/partners/happy-monday?qb_error=token_exchange_failed');
    }

    const tokens = await tokenResponse.json();
    
    // Calculate token expiry
    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000));

    // Upsert integration record
    const { error: dbError } = await supabase
      .from('happymonday_integrations')
      .upsert({
        provider: 'quickbooks',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        realm_id: realmId,
        scopes: ['com.intuit.quickbooks.accounting'],
        is_active: true,
        last_error: null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'provider',
      });

    if (dbError) {
      console.error('[HappyMonday] Error saving QuickBooks tokens:', dbError);
      return res.redirect('/partners/happy-monday?qb_error=db_save_failed');
    }

    console.log('[HappyMonday] ✅ QuickBooks connected successfully for realm:', realmId);

    // Redirect back to portal with success
    return res.redirect('/partners/happy-monday?qb_connected=true');

  } catch (error) {
    console.error('[HappyMonday] QuickBooks callback error:', error);
    return res.redirect('/partners/happy-monday?qb_error=unknown');
  }
};
