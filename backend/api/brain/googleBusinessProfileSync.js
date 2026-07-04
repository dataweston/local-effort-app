/**
 * Google Business Profile -> Brain sync.
 *
 * Discovers accessible listings, snapshots basic listing state, pulls recent
 * Search/Maps interactions, and captures monthly discovery keywords.
 */

const { writeLedgerEvent } = require('./ledger');
const { withJobRun } = require('./jobRuns');
const {
  authorizeGoogleJobRequest,
  getAuthorizedOAuthClient,
  googleApiRequest,
} = require('./googleBusinessAuth');

const DAILY_METRICS = [
  'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
  'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
  'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
  'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
  'WEBSITE_CLICKS',
  'CALL_CLICKS',
  'BUSINESS_DIRECTION_REQUESTS',
  'BUSINESS_CONVERSATIONS',
  'BOOKINGS',
  'FOOD_ORDERS',
  'FOOD_MENU_CLICKS',
];

function dateParts(date) {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function isoDate(parts) {
  return [
    String(parts.year).padStart(4, '0'),
    String(parts.month).padStart(2, '0'),
    String(parts.day).padStart(2, '0'),
  ].join('-');
}

function atNoonUtc(parts) {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12));
}

function completedDateRange(daysBack) {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - daysBack + 1);
  return { start: dateParts(start), end: dateParts(end) };
}

async function discoverLocations(auth) {
  const configured = String(process.env.GOOGLE_BUSINESS_PROFILE_LOCATION_ID || '').trim();
  if (configured) {
    const name = configured.startsWith('locations/') ? configured : `locations/${configured}`;
    return [{ name, title: process.env.GOOGLE_BUSINESS_PROFILE_LOCATION_TITLE || null }];
  }

  const accounts = [];
  let accountPageToken;
  do {
    const params = new URLSearchParams({ pageSize: '20' });
    if (accountPageToken) params.set('pageToken', accountPageToken);
    const data = await googleApiRequest(
      auth,
      `https://mybusinessaccountmanagement.googleapis.com/v1/accounts?${params}`
    );
    accounts.push(...(data.accounts || []));
    accountPageToken = data.nextPageToken;
  } while (accountPageToken);

  const locations = [];
  for (const account of accounts) {
    let pageToken;
    do {
      const params = new URLSearchParams({
        readMask: 'name,title,storeCode,websiteUri,metadata,openInfo',
        pageSize: '100',
      });
      if (pageToken) params.set('pageToken', pageToken);
      const data = await googleApiRequest(
        auth,
        `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?${params}`
      );
      locations.push(...(data.locations || []));
      pageToken = data.nextPageToken;
    } while (pageToken);
  }
  return locations;
}

async function fetchDailyPerformance(auth, locationName, daysBack) {
  const range = completedDateRange(daysBack);
  const params = new URLSearchParams();
  for (const metric of DAILY_METRICS) params.append('dailyMetrics', metric);
  for (const [key, value] of Object.entries(range.start)) {
    params.set(`dailyRange.startDate.${key}`, String(value));
  }
  for (const [key, value] of Object.entries(range.end)) {
    params.set(`dailyRange.endDate.${key}`, String(value));
  }
  const data = await googleApiRequest(
    auth,
    `https://businessprofileperformance.googleapis.com/v1/${locationName}:fetchMultiDailyMetricsTimeSeries?${params}`
  );

  const byDate = new Map();
  for (const group of data.multiDailyMetricTimeSeries || []) {
    for (const series of group.dailyMetricTimeSeries || []) {
      for (const point of series.timeSeries?.datedValues || []) {
        if (!point.date) continue;
        const date = isoDate(point.date);
        if (!byDate.has(date)) byDate.set(date, { date });
        byDate.get(date)[series.dailyMetric] = Number(point.value || 0);
      }
    }
  }
  return [...byDate.values()];
}

function previousCompleteMonths(monthsBack) {
  const end = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  end.setUTCMonth(end.getUTCMonth() - 1);
  const start = new Date(end);
  start.setUTCMonth(start.getUTCMonth() - monthsBack + 1);
  return {
    start: { year: start.getUTCFullYear(), month: start.getUTCMonth() + 1 },
    end: { year: end.getUTCFullYear(), month: end.getUTCMonth() + 1 },
  };
}

async function fetchSearchKeywords(auth, locationName, monthsBack = 3) {
  const range = previousCompleteMonths(monthsBack);
  const keywords = [];
  let pageToken;
  do {
    const params = new URLSearchParams({
      'monthlyRange.startMonth.year': String(range.start.year),
      'monthlyRange.startMonth.month': String(range.start.month),
      'monthlyRange.endMonth.year': String(range.end.year),
      'monthlyRange.endMonth.month': String(range.end.month),
      pageSize: '100',
    });
    if (pageToken) params.set('pageToken', pageToken);
    const data = await googleApiRequest(
      auth,
      `https://businessprofileperformance.googleapis.com/v1/${locationName}/searchkeywords/impressions/monthly?${params}`
    );
    keywords.push(...(data.searchKeywordsCounts || []).map((row) => ({
      keyword: row.searchKeyword || '(not set)',
      impressions: row.insightsValue?.value == null ? null : Number(row.insightsValue.value),
      threshold: row.insightsValue?.threshold == null ? null : Number(row.insightsValue.threshold),
    })));
    pageToken = data.nextPageToken;
  } while (pageToken);
  return { range, keywords };
}

async function runGoogleBusinessProfileSync({
  logger,
  daysBack = 7,
  monthsBack = 3,
  auth: authOverride = null,
} = {}) {
  const auth = authOverride || await getAuthorizedOAuthClient();
  const locations = await discoverLocations(auth);
  if (!locations.length) throw new Error('No accessible Google Business Profile locations found');

  const stats = {
    locationsSeen: locations.length,
    rowsSeen: 0,
    eventsWritten: 0,
    eventsUpdated: 0,
    eventsExisting: 0,
    errors: [],
  };

  for (const location of locations) {
    try {
      const locationId = String(location.name).replace(/^locations\//, '');
      const current = await writeLedgerEvent({
        eventType: 'google.business_profile.current',
        source: 'google_business_profile',
        sourceId: locationId,
        actorType: 'system',
        updatePayload: true,
        payload: {
          locationId,
          name: location.title || null,
          storeCode: location.storeCode || null,
          websiteUri: location.websiteUri || null,
          metadata: location.metadata || null,
          openInfo: location.openInfo || null,
          syncedAt: new Date().toISOString(),
        },
      });
      if (!current._existing) stats.eventsWritten += 1;
      else if (current._updated) stats.eventsUpdated += 1;
      else stats.eventsExisting += 1;

      const dailyRows = await fetchDailyPerformance(auth, location.name, daysBack);
      stats.rowsSeen += dailyRows.length;
      for (const row of dailyRows) {
        const event = await writeLedgerEvent({
          eventType: 'google.business_profile.daily',
          source: 'google_business_profile',
          sourceId: `${locationId}:${row.date}`,
          occurredAt: `${row.date}T12:00:00.000Z`,
          actorType: 'system',
          updatePayload: true,
          payload: { locationId, locationName: location.title || null, ...row },
        });
        if (!event._existing) stats.eventsWritten += 1;
        else if (event._updated) stats.eventsUpdated += 1;
        else stats.eventsExisting += 1;
      }

      const keywordReport = await fetchSearchKeywords(auth, location.name, monthsBack);
      const monthId = `${keywordReport.range.start.year}-${String(keywordReport.range.start.month).padStart(2, '0')}`
        + `_${keywordReport.range.end.year}-${String(keywordReport.range.end.month).padStart(2, '0')}`;
      const keywordEvent = await writeLedgerEvent({
        eventType: 'google.business_profile.search_keywords',
        source: 'google_business_profile',
        sourceId: `${locationId}:${monthId}`,
        occurredAt: atNoonUtc({ ...keywordReport.range.end, day: 1 }),
        actorType: 'system',
        updatePayload: true,
        payload: {
          locationId,
          locationName: location.title || null,
          range: keywordReport.range,
          keywords: keywordReport.keywords,
        },
      });
      if (!keywordEvent._existing) stats.eventsWritten += 1;
      else if (keywordEvent._updated) stats.eventsUpdated += 1;
      else stats.eventsExisting += 1;
    } catch (error) {
      stats.errors.push(`${location.name}: ${error.message}`);
    }
  }

  logger?.info(stats, 'brain/google-business-profile: sync complete');
  return stats;
}

let running = false;

function registerGoogleBusinessProfileRoutes(app, { logger } = {}) {
  const handler = async (req, res) => {
    if (!await authorizeGoogleJobRequest(req)) {
      return res.status(403).json({ error: 'admin only' });
    }
    if (running) return res.status(409).json({ error: 'sync already running' });
    const daysBack = Math.min(Math.max(parseInt(req.body?.daysBack || req.query?.daysBack, 10) || 7, 1), 90);
    const monthsBack = Math.min(Math.max(parseInt(req.body?.monthsBack || req.query?.monthsBack, 10) || 3, 1), 18);
    running = true;
    try {
      const result = await withJobRun(
        'google-business-profile-sync',
        () => runGoogleBusinessProfileSync({ logger, daysBack, monthsBack })
      );
      return res.json({ ok: true, ...result });
    } catch (error) {
      logger?.error({ err: error }, 'brain/google-business-profile: sync error');
      return res.status(500).json({ error: 'google-business-profile-sync-failed', message: error.message });
    } finally {
      running = false;
    }
  };
  app.get('/api/brain/google-business-profile/sync', handler);
  app.post('/api/brain/google-business-profile/sync', handler);
}

module.exports = {
  DAILY_METRICS,
  discoverLocations,
  fetchDailyPerformance,
  fetchSearchKeywords,
  registerGoogleBusinessProfileRoutes,
  runGoogleBusinessProfileSync,
};
