// GET /api/payments/status
// Lightweight diagnostic endpoint (no secrets) to verify server-side Square configuration.
// Returns: { configured, environment, locationIdPresent, appIdPresent, timestamp }

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const envRaw = (process.env.SQUARE_ENVIRONMENT || '').toLowerCase();
  const environment = envRaw === 'sandbox' ? 'Sandbox' : 'Production';
  // Backend does not have the App ID (public) unless you also inject it here; treat presence via env var fallback.
  const appIdPresent = !!(process.env.VITE_SQUARE_APP_ID || process.env.SQUARE_APP_ID || process.env.PUBLIC_SQUARE_APP_ID);
  const locationIdPresent = !!process.env.SQUARE_LOCATION_ID;
  const configured = !!process.env.SQUARE_ACCESS_TOKEN && locationIdPresent;
  return res.status(200).json({ configured, environment, locationIdPresent, appIdPresent, timestamp: new Date().toISOString() });
};
