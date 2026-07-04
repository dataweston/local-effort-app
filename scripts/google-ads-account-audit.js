#!/usr/bin/env node

/**
 * Read-only Google Ads account audit.
 *
 * Run with production credentials in memory:
 *   vercel env run -e production -- node scripts/google-ads-account-audit.js 1234567890
 *
 * This script does not write ledger events or print credentials.
 */

const {
  getAuthorizedOAuthClient,
  googleApiRequest,
} = require('../backend/api/brain/googleBusinessAuth');

function normalizeCustomerId(value) {
  const id = String(value || '').replace(/\D/g, '');
  if (!/^\d{10}$/.test(id)) {
    throw new Error(`Invalid Google Ads customer ID: ${value}`);
  }
  return id;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function auditRange() {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCFullYear(start.getUTCFullYear() - 10);
  return { start: isoDate(start), end: isoDate(end) };
}

function config() {
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

function headers(cfg, includeLoginCustomer = true) {
  return {
    'developer-token': cfg.developerToken,
    ...(includeLoginCustomer && cfg.loginCustomerId
      ? { 'login-customer-id': cfg.loginCustomerId }
      : {}),
  };
}

async function search(auth, cfg, customerId, query, includeLoginCustomer = true) {
  const body = await googleApiRequest(
    auth,
    `https://googleads.googleapis.com/${cfg.version}/customers/${customerId}/googleAds:searchStream`,
    {
      method: 'POST',
      headers: headers(cfg, includeLoginCustomer),
      body: { query: query.replace(/\s+/g, ' ').trim() },
    }
  );
  const batches = Array.isArray(body) ? body : [body];
  return batches.flatMap((batch) => batch.results || []);
}

async function establishAccess(auth, cfg, customerId) {
  const query = `
    SELECT
      customer.id,
      customer.descriptive_name,
      customer.currency_code,
      customer.time_zone,
      customer.manager,
      customer.test_account
    FROM customer
    LIMIT 1
  `;
  try {
    return {
      accessPath: cfg.loginCustomerId ? `manager:${cfg.loginCustomerId}` : 'direct',
      rows: await search(auth, cfg, customerId, query, true),
      includeLoginCustomer: true,
    };
  } catch (managerError) {
    if (!cfg.loginCustomerId) throw managerError;
    try {
      return {
        accessPath: 'direct',
        rows: await search(auth, cfg, customerId, query, false),
        includeLoginCustomer: false,
      };
    } catch (directError) {
      throw new Error(
        `Manager access failed: ${managerError.message}; direct access failed: ${directError.message}`
      );
    }
  }
}

function metricNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

async function auditAccount(auth, cfg, customerId) {
  const access = await establishAccess(auth, cfg, customerId);
  const customer = access.rows[0]?.customer || {};
  const range = auditRange();
  const dailyRows = await search(auth, cfg, customerId, `
    SELECT
      segments.date,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value
    FROM customer
    WHERE segments.date BETWEEN '${range.start}' AND '${range.end}'
    ORDER BY segments.date
  `, access.includeLoginCustomer);
  const campaignRows = await search(auth, cfg, customerId, `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      campaign.start_date,
      campaign.end_date,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value
    FROM campaign
    WHERE segments.date BETWEEN '${range.start}' AND '${range.end}'
  `, access.includeLoginCustomer);

  const activeDays = dailyRows.filter((row) => {
    const metrics = row.metrics || {};
    return metricNumber(metrics.impressions)
      || metricNumber(metrics.clicks)
      || metricNumber(metrics.costMicros)
      || metricNumber(metrics.conversions);
  });
  const totals = activeDays.reduce((sum, row) => {
    const metrics = row.metrics || {};
    sum.impressions += metricNumber(metrics.impressions);
    sum.clicks += metricNumber(metrics.clicks);
    sum.costMicros += metricNumber(metrics.costMicros);
    sum.conversions += metricNumber(metrics.conversions);
    sum.conversionsValue += metricNumber(metrics.conversionsValue);
    return sum;
  }, {
    impressions: 0,
    clicks: 0,
    costMicros: 0,
    conversions: 0,
    conversionsValue: 0,
  });

  return {
    customerId,
    accessible: true,
    accessPath: access.accessPath,
    account: {
      name: customer.descriptiveName || null,
      currencyCode: customer.currencyCode || null,
      timeZone: customer.timeZone || null,
      manager: Boolean(customer.manager),
      testAccount: Boolean(customer.testAccount),
    },
    inspectedRange: range,
    firstActivityDate: activeDays[0]?.segments?.date || null,
    lastActivityDate: activeDays.at(-1)?.segments?.date || null,
    activeDays: activeDays.length,
    campaignCount: campaignRows.length,
    campaignsWithActivity: campaignRows.filter((row) => {
      const metrics = row.metrics || {};
      return metricNumber(metrics.impressions)
        || metricNumber(metrics.clicks)
        || metricNumber(metrics.costMicros)
        || metricNumber(metrics.conversions);
    }).length,
    totals: {
      impressions: totals.impressions,
      clicks: totals.clicks,
      cost: totals.costMicros / 1_000_000,
      conversions: totals.conversions,
      conversionsValue: totals.conversionsValue,
    },
  };
}

async function main() {
  const customerIds = process.argv.slice(2).map(normalizeCustomerId);
  if (!customerIds.length) {
    throw new Error('Provide at least one Google Ads customer ID');
  }
  const cfg = config();
  const auth = await getAuthorizedOAuthClient();
  const results = [];
  for (const customerId of customerIds) {
    try {
      results.push(await auditAccount(auth, cfg, customerId));
    } catch (error) {
      results.push({
        customerId,
        accessible: false,
        error: error.message,
      });
    }
  }
  process.stdout.write(`${JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2)}\n`);
  if (results.every((result) => !result.accessible)) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`Google Ads account audit failed: ${error.message}\n`);
  process.exitCode = 1;
});

