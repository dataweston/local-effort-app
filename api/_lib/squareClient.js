let Client = null;
let Environment = null;

try {
  const squarePkg = require('square');
  Client = squarePkg.Client || (squarePkg.default && squarePkg.default.Client) || null;
  Environment = squarePkg.Environment || (squarePkg.default && squarePkg.default.Environment) || null;
} catch (error) {
  console.warn('[square] SDK unavailable', error.message);
}

let cached = null;

function resolveEnvironmentName() {
  const raw = (process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase();
  if (raw === 'sandbox') return 'Sandbox';
  return 'Production';
}

function getSquareClient() {
  if (cached) return cached;

  const accessToken = process.env.SQUARE_ACCESS_TOKEN || '';
  const locationId = process.env.SQUARE_LOCATION_ID || '';
  const environmentName = resolveEnvironmentName();

  if (!Client || !accessToken) {
    cached = { client: null, locationId, environmentName };
    if (!Client) {
      console.warn('[square] Client class unavailable; skipping initialization');
    } else if (!accessToken) {
      console.warn('[square] access token missing; square client disabled');
    }
    return cached;
  }

  try {
    const env = (Environment && Environment[environmentName]) || (Environment && Environment.Production) || environmentName;
    const client = new Client({ accessToken, environment: env });
    cached = { client, locationId, environmentName };
    if (process.env.NODE_ENV !== 'production') {
      const tail = accessToken.slice(-4);
      // eslint-disable-next-line no-console
      console.log('[square] client initialized', { environmentName, hasLocation: !!locationId, tokenTail: tail });
    }
  } catch (error) {
    console.warn('[square] failed to initialize client', error.message);
    cached = { client: null, locationId, environmentName };
  }

  return cached;
}

module.exports = { getSquareClient };
