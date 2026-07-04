/**
 * Google Ads -> Brain performance sync.
 *
 * Read-only GAQL reports for daily campaign performance and search terms.
 * Requires OAuth plus a Google Ads developer token.
 */

const crypto = require('crypto');
const { writeLedgerEvent } = require('./ledger');
const { withJobRun } = require('./jobRuns');
const {
  authorizeGoogleJobRequest,
  getAuthorizedOAuthClient,
} = require('./googleBusinessAuth');

function normalizeCustomerId(value) {
  const id = String(value || '').replace(/\D/g, '');
  if (!/^\d{10}$/.test(id)) throw new Error('Google Ads customer ID must contain 10 digits');
  return id;
}

async function accessToken(auth) {
  const result = await auth.getAccessToken();
  const token = typeof result === 'string' ? result : result?.token;
  if (!token) throw new Error('Unable to obtain Google Ads OAuth access token');
  return token;
}

function apiConfig() {
  const developerToken = String(process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '').trim();
  if (!developerToken) throw new Error('GOOGLE_ADS_DEVELOPER_TOKEN is required');
  return {
    developerToken,
    loginCustomerId: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID
      ? normalizeCustomerId(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID)
      : null,
    version: process.env.GOOGLE_ADS_API_VERSION || 'v24',
  };
}

function requestHeaders(token, config) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'developer-token': config.developerToken,
    ...(config.loginCustomerId ? { 'login-customer-id': config.loginCustomerId } : {}),
  };
}

async function googleAdsRequest(url, options) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.error?.message || body?.message || `Google Ads API HTTP ${response.status}`;
    throw new Error(message);
  }
  return body;
}

async function resolveCustomerId(auth, config) {
  if (process.env.GOOGLE_ADS_CUSTOMER_ID) {
    return normalizeCustomerId(process.env.GOOGLE_ADS_CUSTOMER_ID);
  }
  const token = await accessToken(auth);
  const body = await googleAdsRequest(
    `https://googleads.googleapis.com/${config.version}/customers:listAccessibleCustomers`,
    { headers: requestHeaders(token, config) }
  );
  const ids = (body.resourceNames || []).map((name) => normalizeCustomerId(name));
  if (ids.length === 1) return ids[0];
  if (ids.length === 0) throw new Error('No accessible Google Ads customers found');
  throw new Error(`Multiple Google Ads customers found; set GOOGLE_ADS_CUSTOMER_ID (${ids.join(', ')})`);
}

async function searchStream(auth, config, customerId, query) {
  const token = await accessToken(auth);
  const body = await googleAdsRequest(
    `https://googleads.googleapis.com/${config.version}/customers/${customerId}/googleAds:searchStream`,
    {
      method: 'POST',
      headers: requestHeaders(token, config),
      body: JSON.stringify({ query }),
    }
  );
  const batches = Array.isArray(body) ? body : [body];
  return batches.flatMap((batch) => batch.results || []);
}

function completedDateRange(daysBack) {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - daysBack + 1);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function campaignQuery(range) {
  return `
    SELECT
      segments.date,
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value
    FROM campaign
    WHERE segments.date BETWEEN '${range.start}' AND '${range.end}'
  `.replace(/\s+/g, ' ').trim();
}

function searchTermQuery(range) {
  return `
    SELECT
      segments.date,
      campaign.id,
      campaign.name,
      ad_group.id,
      ad_group.name,
      search_term_view.search_term,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions
    FROM search_term_view
    WHERE segments.date BETWEEN '${range.start}' AND '${range.end}'
      AND metrics.impressions > 0
  `.replace(/\s+/g, ' ').trim();
}

function numericMetrics(metrics = {}) {
  return {
    impressions: Number(metrics.impressions || 0),
    clicks: Number(metrics.clicks || 0),
    costMicros: Number(metrics.costMicros || 0),
    cost: Number(metrics.costMicros || 0) / 1_000_000,
    conversions: Number(metrics.conversions || 0),
    conversionsValue: Number(metrics.conversionsValue || 0),
  };
}

async function writePerformanceEvent({ eventType, sourceId, occurredAt, payload }) {
  return writeLedgerEvent({
    eventType,
    source: 'google_ads',
    sourceId,
    occurredAt: `${occurredAt}T12:00:00.000Z`,
    actorType: 'system',
    updatePayload: true,
    payload,
  });
}

async function runGoogleAdsSync({
  logger,
  daysBack = 7,
  auth: authOverride = null,
} = {}) {
  const auth = authOverride || await getAuthorizedOAuthClient();
  const config = apiConfig();
  const customerId = await resolveCustomerId(auth, config);
  const range = completedDateRange(daysBack);
  const [campaignRows, searchTermRows] = await Promise.all([
    searchStream(auth, config, customerId, campaignQuery(range)),
    searchStream(auth, config, customerId, searchTermQuery(range)),
  ]);
  const stats = {
    customerId,
    daysBack,
    rowsSeen: campaignRows.length + searchTermRows.length,
    campaignRows: campaignRows.length,
    searchTermRows: searchTermRows.length,
    eventsWritten: 0,
    eventsUpdated: 0,
    eventsExisting: 0,
    errors: [],
  };

  const countEvent = (event) => {
    if (!event._existing) stats.eventsWritten += 1;
    else if (event._updated) stats.eventsUpdated += 1;
    else stats.eventsExisting += 1;
  };

  for (const row of campaignRows) {
    try {
      const date = row.segments?.date;
      const campaignId = String(row.campaign?.id || '');
      const event = await writePerformanceEvent({
        eventType: 'google.ads.campaign.daily',
        sourceId: `${customerId}:${date}:${campaignId}`,
        occurredAt: date,
        payload: {
          date,
          customerId,
          campaignId,
          campaignName: row.campaign?.name || null,
          campaignStatus: row.campaign?.status || null,
          channelType: row.campaign?.advertisingChannelType || null,
          ...numericMetrics(row.metrics),
        },
      });
      countEvent(event);
    } catch (error) {
      stats.errors.push(`campaign: ${error.message}`);
    }
  }

  for (const row of searchTermRows) {
    try {
      const date = row.segments?.date;
      const searchTerm = row.searchTermView?.searchTerm || '(not set)';
      const identity = [
        customerId,
        date,
        row.campaign?.id || '',
        row.adGroup?.id || '',
        searchTerm,
      ].join('\u001f');
      const hash = crypto.createHash('sha256').update(identity).digest('hex').slice(0, 24);
      const event = await writePerformanceEvent({
        eventType: 'google.ads.search_term.daily',
        sourceId: `${customerId}:${date}:${hash}`,
        occurredAt: date,
        payload: {
          date,
          customerId,
          campaignId: row.campaign?.id || null,
          campaignName: row.campaign?.name || null,
          adGroupId: row.adGroup?.id || null,
          adGroupName: row.adGroup?.name || null,
          searchTerm,
          ...numericMetrics(row.metrics),
        },
      });
      countEvent(event);
    } catch (error) {
      stats.errors.push(`search-term: ${error.message}`);
    }
  }

  logger?.info(stats, 'brain/google-ads: sync complete');
  return stats;
}

let running = false;

function registerGoogleAdsRoutes(app, { logger } = {}) {
  const handler = async (req, res) => {
    if (!await authorizeGoogleJobRequest(req)) {
      return res.status(403).json({ error: 'admin only' });
    }
    if (running) return res.status(409).json({ error: 'sync already running' });
    const daysBack = Math.min(Math.max(parseInt(req.body?.daysBack || req.query?.daysBack, 10) || 7, 1), 90);
    running = true;
    try {
      const result = await withJobRun(
        'google-ads-sync',
        () => runGoogleAdsSync({ logger, daysBack })
      );
      return res.json({ ok: true, ...result });
    } catch (error) {
      logger?.error({ err: error }, 'brain/google-ads: sync error');
      return res.status(500).json({ error: 'google-ads-sync-failed', message: error.message });
    } finally {
      running = false;
    }
  };
  app.get('/api/brain/google-ads/sync', handler);
  app.post('/api/brain/google-ads/sync', handler);
}

module.exports = {
  campaignQuery,
  normalizeCustomerId,
  registerGoogleAdsRoutes,
  runGoogleAdsSync,
  searchTermQuery,
};
