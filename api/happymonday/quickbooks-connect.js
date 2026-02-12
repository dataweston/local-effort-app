/**
 * QuickBooks OAuth Connect Endpoint
 * Initiates OAuth flow for Happy Monday to connect their QuickBooks account
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

const QB_CLIENT_ID = process.env.QUICKBOOKS_CLIENT_ID;
const QB_CLIENT_SECRET = process.env.QUICKBOOKS_CLIENT_SECRET;
const QB_REDIRECT_URI = process.env.QUICKBOOKS_REDIRECT_URI || 'https://localeffortfood.com/api/happymonday/quickbooks-callback';
const QB_ENVIRONMENT = process.env.QUICKBOOKS_ENVIRONMENT || 'production'; // 'sandbox' or 'production'

const QB_AUTH_BASE = QB_ENVIRONMENT === 'sandbox' 
  ? 'https://appcenter.intuit.com/connect/oauth2'
  : 'https://appcenter.intuit.com/connect/oauth2';

const QB_SCOPES = [
  'com.intuit.quickbooks.accounting',  // Full accounting access (invoices, customers)
].join(' ');

const ALLOWED_ORIGINS = ['https://localeffortfood.com', 'https://www.localeffortfood.com'];

module.exports = async function handler(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!QB_CLIENT_ID) {
    return res.status(500).json({ 
      error: 'QuickBooks not configured',
      message: 'QUICKBOOKS_CLIENT_ID environment variable is missing'
    });
  }

  try {
    // Generate a state token for CSRF protection
    const crypto = require('crypto');
    const state = crypto.randomBytes(16).toString('hex');

    // Store state in a cookie or session (we'll use a simple approach here)
    // In production, store this in the database or session
    
    // Build OAuth authorization URL
    const authUrl = new URL(QB_AUTH_BASE);
    authUrl.searchParams.set('client_id', QB_CLIENT_ID);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', QB_SCOPES);
    authUrl.searchParams.set('redirect_uri', QB_REDIRECT_URI);
    authUrl.searchParams.set('state', state);

    console.log('[HappyMonday] QuickBooks OAuth initiated, redirecting to:', authUrl.toString());

    // Redirect to QuickBooks authorization
    res.setHeader('Set-Cookie', `qb_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`);
    return res.redirect(302, authUrl.toString());

  } catch (error) {
    console.error('[HappyMonday] QuickBooks connect error:', error);
    return res.status(500).json({ error: 'Failed to initiate QuickBooks connection' });
  }
};
