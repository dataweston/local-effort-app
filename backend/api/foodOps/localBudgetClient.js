'use strict';

/**
 * Read purchased vendor lines from Local Budget through its bearer API
 * (`GET /api/integration/v1/items`) and shape them for
 * `catalog.planVendorLines`. Read-only; this module never writes to LB and
 * never decides a mapping.
 *
 * LB's `unitPrice` is the price per invoiced unit. It becomes a cost
 * observation for the vendor item; it is only a pack cost once an operator
 * confirms the item's pack size, which is why items arrive `unmapped`.
 */

const PAGE_LIMIT = 1000;
const MAX_PAGES = 50;

function apiConfig(env = process.env) {
  const baseUrl = String(env.LOCAL_BUDGET_API_URL || '').trim().replace(/\/+$/, '');
  const rawToken = String(env.LOCAL_BUDGET_API_TOKEN || '').trim();
  const token = rawToken.replace(/^Bearer\s+/i, '').replace(/^(['"])(.*)\1$/, '$2').trim();
  if (!baseUrl || !token) throw new Error('LOCAL_BUDGET_API_URL and LOCAL_BUDGET_API_TOKEN are required');
  if (/[\r\n]/.test(token)) throw new Error('LOCAL_BUDGET_API_TOKEN contains a newline; provide the raw token');
  let parsed;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error('LOCAL_BUDGET_API_URL must be a valid URL');
  }
  if (!/^https?:$/.test(parsed.protocol)) throw new Error('LOCAL_BUDGET_API_URL must use http or https');
  return { baseUrl, token };
}

function toCents(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) : null;
}

function isoDaysAgo(days) {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

function dateOnly(value) {
  const text = String(value || '');
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : null;
}

/** A purchased line has no sourceUid (LB stamps sourceUid on sold Square lines). */
function toVendorLine(row) {
  if (row.sourceUid) return null;
  const vendor = String(row.vendorName || '').trim();
  const description = String(row.description || row.itemName || '').trim();
  const observedAt = dateOnly(row.date);
  if (!vendor || !description || !observedAt || row.id === undefined || row.id === null) return null;
  return {
    sourceKey: String(row.id),
    vendor,
    localBudgetVendorId: row.vendorId ? String(row.vendorId) : undefined,
    localBudgetItemId: row.itemId ? String(row.itemId) : undefined,
    description,
    packText: row.unitOfMeasure ? String(row.unitOfMeasure) : undefined,
    observedAt,
    unitPriceCents: toCents(row.unitPrice) ?? undefined,
    quantity: Number.isFinite(Number(row.quantity)) && Number(row.quantity) > 0 ? Number(row.quantity) : undefined,
    lineTotalCents: toCents(row.totalPrice) ?? undefined,
  };
}

async function fetchPage(config, params, fetchImpl) {
  const url = new URL(`${config.baseUrl}/api/integration/v1/items`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }
  const response = await fetchImpl(url, { headers: { Authorization: `Bearer ${config.token}`, accept: 'application/json' } });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`local budget items ${response.status}: ${body.slice(0, 200)}`);
  }
  return response.json();
}

async function fetchPurchasedLines({ sinceDays = 90, fetchImpl = fetch, env = process.env } = {}) {
  const config = apiConfig(env);
  const lines = [];
  let skipped = 0;
  let cursor = null;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const body = await fetchPage(config, {
      from: sinceDays ? isoDaysAgo(sinceDays) : null,
      lineType: 'ITEM',
      limit: PAGE_LIMIT,
      cursor,
    }, fetchImpl);
    for (const row of Array.isArray(body?.items) ? body.items : []) {
      const line = toVendorLine(row);
      if (line) lines.push(line);
      else skipped += 1;
    }
    cursor = body?.nextCursor || null;
    if (!cursor) return { lines, skipped, truncated: false };
  }
  return { lines, skipped, truncated: true };
}

/**
 * Monthly cash actuals (`GET /api/integration/v1/cashflow-actuals`, contract 2, method `-v2.1`):
 * `incomeCents` is LB's classified income for the month and `inventoryCents` its inventory/COGS
 * bucket. Only complete months are returned by LB; `unclassifiedCents` says how much posted money
 * LB has not classified yet, so `inventoryCents` is a floor, not a total. Read-only.
 * Used by `usage.js` for purchase coverage and revenue-normalised ratios.
 */
async function fetchCashflowMonths({ from, toExclusive, fetchImpl = fetch, env = process.env } = {}) {
  const config = apiConfig(env);
  const url = new URL(`${config.baseUrl}/api/integration/v1/cashflow-actuals`);
  url.searchParams.set('from', from);
  url.searchParams.set('to', toExclusive);
  url.searchParams.set('grain', 'month');
  url.searchParams.set('contract', '2');
  const response = await fetchImpl(url, { headers: { Authorization: `Bearer ${config.token}`, accept: 'application/json' } });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`local budget cashflow-actuals ${response.status}: ${body.slice(0, 200)}`);
  }
  const payload = await response.json();
  if (payload?.contractVersion !== 2 || !/^cashflow-actuals-v2/.test(String(payload?.methodVersion)) || payload?.currency !== 'USD') {
    throw new Error('Local Budget API returned an unsupported cashflow contract');
  }
  const cents = (value) => (Number.isFinite(Number(value)) ? Math.round(Number(value)) : null);
  return {
    methodVersion: payload.methodVersion,
    sourceMaxDate: payload.sourceMaxDate || null,
    generatedAt: payload.generatedAt || null,
    warnings: Array.isArray(payload.quality?.warnings) ? payload.quality.warnings.map(String) : [],
    months: (Array.isArray(payload.months) ? payload.months : [])
      .filter((row) => /^\d{4}-\d{2}$/.test(String(row?.month)))
      .map((row) => ({
        month: row.month,
        complete: row.complete === true,
        incomeCents: cents(row.incomeCents),
        inventoryCents: cents(row.inventoryCents),
        unclassifiedCents: cents(row.unclassifiedCents),
      })),
  };
}

module.exports = { apiConfig, fetchCashflowMonths, fetchPurchasedLines, toVendorLine };
