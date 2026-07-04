/**
 * Google Merchant Center diagnostics -> Brain.
 *
 * Read-only by design. Captures account-level issues and aggregate product
 * eligibility so a broken Merchant Center account has a durable diagnostic
 * trail without letting an automated job mutate products or settings.
 */

const { google } = require('googleapis');
const { writeLedgerEvent } = require('./ledger');
const { withJobRun } = require('./jobRuns');
const {
  authorizeGoogleJobRequest,
  getAuthorizedOAuthClient,
} = require('./googleBusinessAuth');

function accountName(value) {
  const id = String(value || '').trim().replace(/^accounts\//, '');
  if (!/^\d+$/.test(id)) throw new Error('Merchant Center account ID must be numeric');
  return `accounts/${id}`;
}

async function discoverMerchantAccounts(client) {
  const configured = String(process.env.MERCHANT_CENTER_ACCOUNT_ID || '').trim();
  if (configured) return [{ name: accountName(configured) }];

  const accounts = [];
  let pageToken;
  do {
    const response = await client.accounts.list({
      pageSize: 500,
      ...(pageToken ? { pageToken } : {}),
    });
    accounts.push(...(response.data.accounts || []));
    pageToken = response.data.nextPageToken;
  } while (pageToken);
  return accounts;
}

async function listAccountIssues(client, parent) {
  const issues = [];
  let pageToken;
  do {
    const response = await client.accounts.issues.list({
      parent,
      pageSize: 100,
      languageCode: 'en-US',
      timeZone: 'America/Chicago',
      ...(pageToken ? { pageToken } : {}),
    });
    issues.push(...(response.data.accountIssues || []));
    pageToken = response.data.nextPageToken;
  } while (pageToken);
  return issues;
}

async function listAggregateProductStatuses(client, parent) {
  const statuses = [];
  let pageToken;
  do {
    const response = await client.accounts.aggregateProductStatuses.list({
      parent,
      pageSize: 250,
      ...(pageToken ? { pageToken } : {}),
    });
    statuses.push(...(response.data.aggregateProductStatuses || []));
    pageToken = response.data.nextPageToken;
  } while (pageToken);
  return statuses;
}

function summarizeProductStatuses(statuses) {
  const totals = {
    activeCount: 0,
    pendingCount: 0,
    disapprovedCount: 0,
    expiringCount: 0,
  };
  const issueCounts = new Map();

  for (const status of statuses) {
    for (const key of Object.keys(totals)) {
      totals[key] += Number(status.stats?.[key] || 0);
    }
    for (const issue of status.itemLevelIssues || []) {
      const key = issue.code || issue.title || issue.issueType || 'unknown';
      const count = Number(issue.productCount || issue.count || 0);
      issueCounts.set(key, (issueCounts.get(key) || 0) + count);
    }
  }

  return {
    totals,
    issueCounts: [...issueCounts.entries()]
      .map(([issue, count]) => ({ issue, count }))
      .sort((a, b) => b.count - a.count),
  };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function runGoogleMerchantSync({ logger, auth: authOverride = null } = {}) {
  const auth = authOverride || await getAuthorizedOAuthClient();
  const accountClient = google.merchantapi({ version: 'accounts_v1', auth });
  const issueClient = google.merchantapi({ version: 'issueresolution_v1', auth });
  const accounts = await discoverMerchantAccounts(accountClient);
  if (!accounts.length) throw new Error('No accessible Merchant Center accounts found');

  const stats = {
    accountsSeen: accounts.length,
    rowsSeen: 0,
    eventsWritten: 0,
    eventsUpdated: 0,
    eventsExisting: 0,
    criticalIssueCount: 0,
    disapprovedProductCount: 0,
    errors: [],
  };
  const snapshotDate = today();

  for (const account of accounts) {
    try {
      const parent = accountName(account.name);
      const [accountIssues, productStatuses] = await Promise.all([
        listAccountIssues(accountClient, parent),
        listAggregateProductStatuses(issueClient, parent),
      ]);
      const productSummary = summarizeProductStatuses(productStatuses);
      stats.rowsSeen += accountIssues.length + productStatuses.length;
      stats.criticalIssueCount += accountIssues.filter((issue) =>
        ['CRITICAL', 'ERROR'].includes(String(issue.severity || '').toUpperCase())
      ).length;
      stats.disapprovedProductCount += productSummary.totals.disapprovedCount;

      const event = await writeLedgerEvent({
        eventType: 'google.merchant.diagnostics.daily',
        source: 'google_merchant_center',
        sourceId: `${parent.replace('accounts/', '')}:${snapshotDate}`,
        occurredAt: `${snapshotDate}T12:00:00.000Z`,
        actorType: 'system',
        updatePayload: true,
        payload: {
          date: snapshotDate,
          account: {
            name: parent,
            accountName: account.accountName || account.name || null,
            adultContent: account.adultContent || false,
            testAccount: account.testAccount || false,
          },
          accountIssues,
          productSummary,
          aggregateProductStatuses: productStatuses,
        },
      });
      if (!event._existing) stats.eventsWritten += 1;
      else if (event._updated) stats.eventsUpdated += 1;
      else stats.eventsExisting += 1;
    } catch (error) {
      stats.errors.push(`${account.name}: ${error.message}`);
    }
  }

  logger?.info(stats, 'brain/google-merchant: sync complete');
  return stats;
}

let running = false;

function registerGoogleMerchantRoutes(app, { logger } = {}) {
  const handler = async (req, res) => {
    if (!await authorizeGoogleJobRequest(req)) {
      return res.status(403).json({ error: 'admin only' });
    }
    if (running) return res.status(409).json({ error: 'sync already running' });
    running = true;
    try {
      const result = await withJobRun(
        'google-merchant-sync',
        () => runGoogleMerchantSync({ logger })
      );
      return res.json({ ok: true, ...result });
    } catch (error) {
      logger?.error({ err: error }, 'brain/google-merchant: sync error');
      return res.status(500).json({ error: 'google-merchant-sync-failed', message: error.message });
    } finally {
      running = false;
    }
  };
  app.get('/api/brain/google-merchant/sync', handler);
  app.post('/api/brain/google-merchant/sync', handler);
}

module.exports = {
  accountName,
  discoverMerchantAccounts,
  listAccountIssues,
  listAggregateProductStatuses,
  registerGoogleMerchantRoutes,
  runGoogleMerchantSync,
  summarizeProductStatuses,
};
