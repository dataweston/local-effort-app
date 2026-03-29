let Client = null;
let Environment = null;
let _isV43Plus = false;

try {
  const squarePkg = require('square');
  // v37: { Client, Environment }; v43+: { SquareClient, SquareEnvironment }
  Client = squarePkg.Client || squarePkg.SquareClient || (squarePkg.default && (squarePkg.default.Client || squarePkg.default.SquareClient)) || null;
  Environment = squarePkg.Environment || squarePkg.SquareEnvironment || (squarePkg.default && (squarePkg.default.Environment || squarePkg.default.SquareEnvironment)) || null;
  _isV43Plus = !!squarePkg.SquareClient;
} catch (error) {
  console.warn('[square] SDK unavailable', error.message);
}

let cached = null;

function resolveEnvironmentName() {
  const raw = (process.env.SQUARE_ENVIRONMENT || process.env.SQUARE_ENV || 'production').toLowerCase();
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
    // v43+ uses { token } instead of { accessToken }
    const ctorOpts = _isV43Plus
      ? { token: accessToken, environment: env }
      : { accessToken, environment: env };
    const client = new Client(ctorOpts);
    
    // Validate that the client has the required catalog API (v37: catalogApi, v43: catalog)
    const hasCatalog = (client.catalogApi && typeof client.catalogApi.listCatalog === 'function')
      || (client.catalog && typeof client.catalog.list === 'function');
    if (!hasCatalog) {
      throw new Error('Square client missing catalogApi or listCatalog method');
    }
    
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
