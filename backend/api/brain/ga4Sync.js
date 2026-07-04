/**
 * GA4 Data API -> Brain ledger sync.
 *
 * Pulls two daily reports:
 *   1. landing-page traffic
 *   2. session acquisition traffic
 *
 * Each report row becomes a `web.traffic.daily` LedgerEvent. Source IDs are
 * deterministic, and updatePayload=true lets recent GA4 data settle without
 * creating duplicate events.
 *
 * Routes:
 *   POST/GET /api/brain/ga4/sync (admin | Vercel cron | BRAIN_ADMIN_KEY)
 *     body/query: daysBack (default 3; max 730)
 */

const crypto = require('crypto');
const { GoogleAuth } = require('google-auth-library');
const { createAdminVerifier } = require('../utils/adminVerifier');
const { writeLedgerEvent } = require('./ledger');
const { withJobRun } = require('./jobRuns');
const {
  getAuthorizedOAuthClient,
  googleApiRequest,
  isAuthorizedCron,
  timingSafeEqual,
} = require('./googleBusinessAuth');

const verifyAdminRequest = createAdminVerifier();
const ANALYTICS_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
const REPORT_PAGE_SIZE = 100000;

const REPORTS = [
  {
    reportType: 'landing_page',
    dimensions: ['date', 'landingPage'],
    metrics: ['sessions', 'totalUsers', 'newUsers', 'engagedSessions'],
  },
  {
    reportType: 'acquisition',
    dimensions: ['date', 'sessionSource', 'sessionMedium', 'sessionDefaultChannelGroup'],
    metrics: ['sessions', 'totalUsers', 'newUsers', 'engagedSessions'],
  },
];

function normalizePropertyId(value = process.env.GA4_PROPERTY_ID) {
  const raw = String(value || '').trim();
  const propertyId = raw.replace(/^properties\//, '');
  if (!/^\d+$/.test(propertyId)) {
    throw new Error('GA4_PROPERTY_ID must be the numeric GA4 property ID');
  }
  return propertyId;
}

function normalizePrivateKey(value) {
  return String(value || '').replace(/\\n/g, '\n').trim();
}

function parseServiceAccountCredentials(env = process.env) {
  if (env.GA4_SERVICE_ACCOUNT_JSON) {
    let credentials;
    try {
      credentials = JSON.parse(env.GA4_SERVICE_ACCOUNT_JSON);
    } catch {
      throw new Error('GA4_SERVICE_ACCOUNT_JSON is not valid JSON');
    }
    if (credentials.private_key) {
      credentials.private_key = normalizePrivateKey(credentials.private_key);
    }
    return credentials;
  }

  if (env.GA4_CLIENT_EMAIL || env.GA4_PRIVATE_KEY) {
    if (!env.GA4_CLIENT_EMAIL || !env.GA4_PRIVATE_KEY) {
      throw new Error('GA4_CLIENT_EMAIL and GA4_PRIVATE_KEY must be configured together');
    }
    return {
      client_email: String(env.GA4_CLIENT_EMAIL).trim(),
      private_key: normalizePrivateKey(env.GA4_PRIVATE_KEY),
    };
  }

  return null;
}

async function createAnalyticsClient(env = process.env) {
  const credentials = parseServiceAccountCredentials(env);
  let auth;
  if (!credentials && !env.GOOGLE_APPLICATION_CREDENTIALS) {
    auth = await getAuthorizedOAuthClient();
  } else {
    auth = new GoogleAuth({
      ...(credentials ? { credentials } : {}),
      scopes: [ANALYTICS_SCOPE],
    });
  }

  return {
    properties: {
      runReport: async ({ property, requestBody }) => ({
        data: await googleApiRequest(
          auth,
          `https://analyticsdata.googleapis.com/v1beta/${property}:runReport`,
          { method: 'POST', body: requestBody }
        ),
      }),
    },
  };
}

async function runPagedReport(client, propertyId, report, daysBack) {
  const rows = [];
  let offset = 0;
  let rowCount = 0;

  do {
    const response = await client.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: `${daysBack}daysAgo`, endDate: 'yesterday' }],
        dimensions: report.dimensions.map((name) => ({ name })),
        metrics: report.metrics.map((name) => ({ name })),
        limit: String(REPORT_PAGE_SIZE),
        offset: String(offset),
        keepEmptyRows: false,
      },
    });

    const pageRows = response.data.rows || [];
    rowCount = Number(response.data.rowCount || pageRows.length);
    rows.push(...pageRows);
    offset += pageRows.length;
    if (pageRows.length === 0) break;
  } while (offset < rowCount);

  return rows;
}

function parseGaDate(value) {
  const raw = String(value || '');
  const match = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!match) throw new Error(`invalid GA4 date: ${raw}`);
  const [, year, month, day] = match;
  return {
    date: `${year}-${month}-${day}`,
    occurredAt: new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12)),
  };
}

function rowToRecord(report, row) {
  const dimensions = Object.fromEntries(
    report.dimensions.map((name, index) => [name, row.dimensionValues?.[index]?.value || '(not set)'])
  );
  const metrics = Object.fromEntries(
    report.metrics.map((name, index) => {
      const value = Number(row.metricValues?.[index]?.value || 0);
      return [name, Number.isFinite(value) ? value : 0];
    })
  );
  const { date, occurredAt } = parseGaDate(dimensions.date);
  const identity = report.dimensions
    .filter((name) => name !== 'date')
    .map((name) => dimensions[name])
    .join('\u001f');
  const rowHash = crypto.createHash('sha256').update(identity).digest('hex').slice(0, 24);

  return {
    occurredAt,
    sourceId: `${report.reportType}:${date}:${rowHash}`,
    payload: {
      reportType: report.reportType,
      ...dimensions,
      date,
      ...metrics,
      syncedBy: 'ga4_data_api',
    },
  };
}

async function runGa4Sync({
  logger,
  daysBack = 3,
  analyticsClient = null,
  propertyId: propertyIdOverride = null,
} = {}) {
  const propertyId = normalizePropertyId(propertyIdOverride || process.env.GA4_PROPERTY_ID);
  const client = analyticsClient || await createAnalyticsClient();
  const stats = {
    propertyId,
    daysBack,
    reportsRun: 0,
    rowsSeen: 0,
    eventsWritten: 0,
    eventsUpdated: 0,
    eventsExisting: 0,
    errors: [],
  };

  for (const report of REPORTS) {
    const rows = await runPagedReport(client, propertyId, report, daysBack);
    stats.reportsRun += 1;
    stats.rowsSeen += rows.length;

    for (const row of rows) {
      try {
        const record = rowToRecord(report, row);
        const event = await writeLedgerEvent({
          eventType: 'web.traffic.daily',
          occurredAt: record.occurredAt,
          source: 'ga4',
          sourceId: `${propertyId}:${record.sourceId}`,
          actorType: 'system',
          updatePayload: true,
          payload: {
            propertyId,
            ...record.payload,
          },
        });
        if (!event._existing) stats.eventsWritten += 1;
        else if (event._updated) stats.eventsUpdated += 1;
        else stats.eventsExisting += 1;
      } catch (error) {
        stats.errors.push(`${report.reportType}: ${error.message}`);
        if (stats.errors.length >= 30) break;
      }
    }
  }

  logger?.info(stats, 'brain/ga4: sync complete');
  return stats;
}

function hasBrainAdminHeader(req) {
  return timingSafeEqual(req.headers['x-brain-admin-key'], process.env.BRAIN_ADMIN_KEY);
}

let running = false;
let lastRun = null;

function registerGa4Routes(app, { logger } = {}) {
  const runHandler = async (req, res) => {
    try {
      const admin = await verifyAdminRequest(req);
      if (!admin && !isAuthorizedCron(req) && !hasBrainAdminHeader(req)) {
        return res.status(403).json({ error: 'admin only' });
      }
      if (running) return res.status(409).json({ error: 'sync already running', lastRun });

      const daysBack = Math.min(
        Math.max(parseInt(req.body?.daysBack || req.query?.daysBack, 10) || 3, 1),
        730
      );

      running = true;
      try {
        const result = await withJobRun(
          'ga4-sync',
          () => runGa4Sync({ logger, daysBack })
        );
        lastRun = { completedAt: new Date().toISOString(), ...result };
        return res.json({ ok: true, ...lastRun });
      } finally {
        running = false;
      }
    } catch (error) {
      logger?.error({ err: error }, 'brain/ga4: sync error');
      return res.status(500).json({
        error: 'ga4-sync-failed',
        message: error.message,
      });
    }
  };

  app.post('/api/brain/ga4/sync', runHandler);
  app.get('/api/brain/ga4/sync', runHandler);
}

module.exports = {
  REPORTS,
  createAnalyticsClient,
  normalizePropertyId,
  parseServiceAccountCredentials,
  rowToRecord,
  runGa4Sync,
  registerGa4Routes,
};
