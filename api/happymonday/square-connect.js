/**
 * Square OAuth Connect Endpoint
 * Initiates OAuth flow for Happy Monday to connect their Square account
 * This connects to THEIR Square account (not Local Effort's) for inventory sync
 */

const SQ_APP_ID = process.env.SQUARE_APP_ID || process.env.VITE_SQUARE_APP_ID;
const SQ_APP_SECRET = process.env.SQUARE_APP_SECRET;
const SQ_REDIRECT_URI = process.env.SQUARE_OAUTH_REDIRECT_URI || 'https://localeffortfood.com/api/happymonday/square-callback';
const SQ_ENVIRONMENT = (process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase();

const SQ_AUTH_BASE = SQ_ENVIRONMENT === 'sandbox'
  ? 'https://connect.squareupsandbox.com/oauth2/authorize'
  : 'https://connect.squareup.com/oauth2/authorize';

// Scopes needed for inventory management
const SQ_SCOPES = [
  'INVENTORY_READ',
  'INVENTORY_WRITE',
  'ITEMS_READ',
  'MERCHANT_PROFILE_READ',
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

  if (!SQ_APP_ID) {
    return res.status(500).json({
      error: 'Square OAuth not configured',
      message: 'SQUARE_APP_ID environment variable is missing'
    });
  }

  try {
    const crypto = require('crypto');
    const state = crypto.randomBytes(16).toString('hex');

    // Build OAuth authorization URL
    const authUrl = new URL(SQ_AUTH_BASE);
    authUrl.searchParams.set('client_id', SQ_APP_ID);
    authUrl.searchParams.set('scope', SQ_SCOPES);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('session', 'false'); // Don't require Square login if already logged in

    console.log('[HappyMonday] Square OAuth initiated for inventory sync');

    // Set state cookie for CSRF protection
    res.setHeader('Set-Cookie', `sq_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`);
    return res.redirect(302, authUrl.toString());

  } catch (error) {
    console.error('[HappyMonday] Square connect error:', error);
    return res.status(500).json({ error: 'Failed to initiate Square connection' });
  }
};
