/**
 * Google Search Console -> Brain organic search sync.
 *
 * Read-only Search Analytics reports: daily query performance and daily page
 * performance for the site property. Fills the organic-search gap the other
 * Google sources leave (GBP explains local Search/Maps; GA4 explains sessions
 * once visitors arrive; Search Console explains ranking/queries/CTR).
 *
 * Ledger events: `google.search_console.daily`, reportType `query` | `page`.
 * The query report feeds the search-demand mapper in googleGraphProjector.js.
 *
 * Uses the shared google-business-integrations OAuth grant, which must include
 * the `webmasters.readonly` scope — grants made before that scope was added
 * need to be re-authorized via /api/brain/google/auth.
 *
 * Env:
 *   SEARCH_CONSOLE_SITE_URL   optional; defaults to sc-domain:localeffortfood.com
 *
 * Routes:
 *   POST/GET /api/brain/search-console/sync   (admin | cron | BRAIN_ADMIN_KEY)
 *     body/query: daysBack (default 5 — Search Console data settles late)
 */

const crypto = require('crypto');
const { writeLedgerEvent } = require('./ledger');
const { withJobRun } = require('./jobRuns');
const {
  authorizeGoogleJobRequest,
  getAuthorizedOAuthClient,
  googleApiRequest,
} = require('./googleBusinessAuth');

const DEFAULT_SITE_URL = 'sc-domain:localeffortfood.com';
const ROW_LIMIT = 25000;
const MAX_ROWS_PER_REPORT_DAY = 50000;
const SEARCH_CONSOLE_TIME_ZONE = 'America/Los_Angeles';

function siteUrl() {
  return String(process.env.SEARCH_CONSOLE_SITE_URL || DEFAULT_SITE_URL).trim();
}

function calendarDateInTimeZone(now = new Date(), timeZone = SEARCH_CONSOLE_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function completedDates(daysBack, now = new Date()) {
  // Search Console final data normally trails by roughly two Pacific calendar
  // days. Query one date at a time so each day gets its own API row allowance.
  const pacificToday = new Date(`${calendarDateInTimeZone(now)}T12:00:00Z`);
  const end = new Date(pacificToday);
  end.setUTCDate(end.getUTCDate() - 2);
  const dates = [];
  for (let offset = daysBack - 1; offset >= 0; offset -= 1) {
    const date = new Date(end);
    date.setUTCDate(date.getUTCDate() - offset);
    dates.push(date.toISOString().slice(0, 10));
  }
  return dates;
}

async function queryReport(auth, site, { date, dimensions }) {
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`;
  const rows = [];
  let startRow = 0;
  while (startRow < MAX_ROWS_PER_REPORT_DAY) {
    const body = await googleApiRequest(auth, url, {
      method: 'POST',
      body: {
        startDate: date,
        endDate: date,
        dimensions,
        type: 'web',
        dataState: 'final',
        rowLimit: ROW_LIMIT,
        startRow,
      },
    });
    const batch = body.rows || [];
    rows.push(...batch);
    if (batch.length < ROW_LIMIT) {
      return { rows, truncated: false };
    }
    startRow += batch.length;
  }
  return { rows, truncated: true };
}

function normalizePageUrl(pageUrl) {
  try {
    const url = new URL(pageUrl);
    url.search = '';
    url.hash = '';
    return {
      pageUrl: url.toString(),
      page: url.pathname || '/',
    };
  } catch {
    return { pageUrl, page: pageUrl };
  }
}

async function runSearchConsoleSync({ logger, daysBack = 5 } = {}) {
  const site = siteUrl();
  const auth = await getAuthorizedOAuthClient();
  const dates = completedDates(daysBack);
  const stats = {
    site,
    daysBack,
    range: { start: dates[0], end: dates[dates.length - 1] },
    reportsRun: 0,
    rowsSeen: 0,
    truncatedReports: 0,
    eventsWritten: 0,
    eventsUpdated: 0,
    eventsExisting: 0,
    errors: [],
  };

  const reports = [
    { reportType: 'query', dimensions: ['query'] },
    { reportType: 'page', dimensions: ['page'] },
    // This deliberately supplements, rather than replaces, the query and page
    // totals. Query+page results are top rows and can omit anonymized/low-volume
    // queries, but they preserve the evidence needed for opportunity mapping.
    { reportType: 'query_page', dimensions: ['query', 'page'] },
  ];

  for (const date of dates) {
    for (const report of reports) {
      let response;
      try {
        response = await queryReport(auth, site, {
          date,
          dimensions: report.dimensions,
        });
        stats.reportsRun += 1;
        stats.rowsSeen += response.rows.length;
        if (response.truncated) stats.truncatedReports += 1;
      } catch (error) {
        stats.errors.push(`${date}:${report.reportType}: ${error.message}`);
        continue;
      }

      for (const row of response.rows) {
        try {
          const keys = row.keys || [];
          if (keys.length !== report.dimensions.length || keys.some((key) => !key)) continue;
          const identity = keys.join('\u001f');
          const hash = crypto.createHash('sha256').update(identity).digest('hex').slice(0, 24);
          const payload = {
            site,
            date,
            reportType: report.reportType,
            dataCompleteness: 'top_rows',
            truncated: response.truncated,
            clicks: Number(row.clicks || 0),
            impressions: Number(row.impressions || 0),
            ctr: Number(row.ctr || 0),
            position: Number(row.position || 0),
            syncedBy: 'search_console_api',
          };
          if (report.reportType === 'query') {
            [payload.query] = keys;
          } else if (report.reportType === 'page') {
            Object.assign(payload, normalizePageUrl(keys[0]));
          } else {
            payload.query = keys[0];
            Object.assign(payload, normalizePageUrl(keys[1]));
          }
          const event = await writeLedgerEvent({
            eventType: 'google.search_console.daily',
            occurredAt: new Date(`${date}T12:00:00Z`),
            source: 'search_console',
            sourceId: `${site}:${report.reportType}:${date}:${hash}`,
            actorType: 'system',
            updatePayload: true,
            payload,
          });
          if (!event._existing) stats.eventsWritten += 1;
          else if (event._updated) stats.eventsUpdated += 1;
          else stats.eventsExisting += 1;
        } catch (error) {
          stats.errors.push(`${date}:${report.reportType}: ${error.message}`);
          if (stats.errors.length >= 30) break;
        }
      }
    }
  }

  logger?.info(stats, 'brain/search-console: sync complete');
  return stats;
}

let running = false;
let lastRun = null;

function registerSearchConsoleRoutes(app, { logger } = {}) {
  const handler = async (req, res) => {
    try {
      if (!(await authorizeGoogleJobRequest(req))) {
        return res.status(403).json({ error: 'admin only' });
      }
      if (running) return res.status(409).json({ error: 'sync already running', lastRun });

      const daysBack = Math.min(Math.max(parseInt(req.body?.daysBack || req.query?.daysBack, 10) || 5, 1), 90);

      running = true;
      try {
        const result = await withJobRun('search-console-sync', () => runSearchConsoleSync({ logger, daysBack }));
        lastRun = { completedAt: new Date().toISOString(), ...result };
        return res.json({ ok: true, ...result });
      } finally {
        running = false;
      }
    } catch (error) {
      logger?.error({ err: error }, 'brain/search-console: sync error');
      return res.status(500).json({ error: 'search-console-sync-failed', message: error.message });
    }
  };
  app.post('/api/brain/search-console/sync', handler);
  app.get('/api/brain/search-console/sync', handler);
}

module.exports = {
  calendarDateInTimeZone,
  completedDates,
  normalizePageUrl,
  queryReport,
  registerSearchConsoleRoutes,
  runSearchConsoleSync,
};
