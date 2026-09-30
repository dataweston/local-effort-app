#!/usr/bin/env node
/**
 * Read-only Square Capital payout audit.
 *
 * Lists payouts, inspects their payout entries, and summarizes Square Capital
 * payments and reversals. Results are written to stdout; the script never
 * mutates Square data or writes an evidence file.
 */
require('dotenv').config();

const CAPITAL_TYPES = new Set([
  'SQUARE_CAPITAL_PAYMENT',
  'SQUARE_CAPITAL_REVERSED_PAYMENT',
]);
const DEFAULT_API_VERSION = '2025-05-21';
const PAGE_LIMIT = '100';
const MAX_ATTEMPTS = 5;

function usage() {
  return [
    'Usage: node scripts/audit-square-capital.cjs [options]',
    '',
    'Options:',
    '  --from YYYY-MM-DD  Include payouts created on or after this date',
    '  --to YYYY-MM-DD    Include payouts created on or before this date',
    '  --details          Include individual Square Capital payout entries',
    '  --help             Show this help',
  ].join('\n');
}

function requiredValue(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value`);
  return value;
}

function parseArgs(argv) {
  const options = { from: null, to: null, details: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--from') {
      options.from = requiredValue(argv, index, arg);
      index += 1;
    } else if (arg === '--to') {
      options.to = requiredValue(argv, index, arg);
      index += 1;
    } else if (arg === '--details') {
      options.details = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function dateBoundary(value, endOfDay) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid date "${value}"; expected YYYY-MM-DD`);
  }
  const suffix = endOfDay ? 'T23:59:59.999Z' : 'T00:00:00.000Z';
  const date = new Date(`${value}${suffix}`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(`Invalid calendar date "${value}"`);
  }
  return date.toISOString();
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function responseError(status, body) {
  const message = Array.isArray(body?.errors)
    ? body.errors.map((error) => error?.detail || error?.code).filter(Boolean).join('; ')
    : '';
  const error = new Error(`Square API ${status}${message ? `: ${message}` : ''}`);
  error.status = status;
  return error;
}

function createSquareRequest({ accessToken, apiBase, apiVersion }) {
  return async function squareRequest(pathname) {
    let lastError;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      try {
        const response = await fetch(`${apiBase}${pathname}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
            'Square-Version': apiVersion,
          },
          signal: AbortSignal.timeout(30_000),
        });
        const text = await response.text();
        let body = {};
        if (text) {
          try {
            body = JSON.parse(text);
          } catch (_error) {
            throw new Error(`Square API ${response.status} returned invalid JSON`);
          }
        }
        if (response.ok) return body;

        const error = responseError(response.status, body);
        if (response.status !== 429 || attempt === MAX_ATTEMPTS - 1) throw error;
        lastError = error;
        const retryAfterSeconds = Number(response.headers.get('retry-after'));
        const delay = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
          ? retryAfterSeconds * 1000
          : Math.min(8_000, 500 * (2 ** attempt));
        await sleep(delay);
      } catch (error) {
        lastError = error;
        if (error?.status !== 429 || attempt === MAX_ATTEMPTS - 1) throw error;
      }
    }
    throw lastError;
  };
}

async function collectPages(request, pathname, resultKey, initialParams = {}) {
  const results = [];
  const seenCursors = new Set();
  let cursor = null;
  do {
    const params = new URLSearchParams({ ...initialParams, limit: PAGE_LIMIT });
    if (cursor) params.set('cursor', cursor);
    const page = await request(`${pathname}?${params}`);
    results.push(...(Array.isArray(page[resultKey]) ? page[resultKey] : []));
    cursor = page.cursor || null;
    if (cursor && seenCursors.has(cursor)) {
      throw new Error(`Square API repeated a pagination cursor for ${pathname}`);
    }
    if (cursor) seenCursors.add(cursor);
  } while (cursor);
  return results;
}

function addAmount(map, dimensions, amount) {
  const key = dimensions.join('\u0000');
  const current = map.get(key) || { dimensions, entryCount: 0, netAmountCents: 0 };
  current.entryCount += 1;
  current.netAmountCents += amount;
  map.set(key, current);
}

function sortedTotals(map, names) {
  return [...map.values()]
    .map(({ dimensions, ...values }) => Object.fromEntries([
      ...names.map((name, index) => [name, dimensions[index]]),
      ...Object.entries(values),
    ]))
    .sort((left, right) => names.map((name) => String(left[name]).localeCompare(String(right[name])))
      .find((comparison) => comparison !== 0) || 0);
}

function summarize(payouts, payoutEntries, options, environment) {
  const byType = new Map();
  const byMonth = new Map();
  const capitalEntries = [];

  for (const { payout, entry } of payoutEntries) {
    if (!CAPITAL_TYPES.has(entry.type)) continue;
    const netAmountCents = Number(entry.net_amount_money?.amount || 0);
    const currency = entry.net_amount_money?.currency || 'UNKNOWN';
    const effectiveAt = entry.effective_at || payout.created_at || null;
    const month = effectiveAt ? effectiveAt.slice(0, 7) : 'unknown';
    addAmount(byType, [entry.type, currency], netAmountCents);
    addAmount(byMonth, [month, entry.type, currency], netAmountCents);
    capitalEntries.push({
      payoutId: payout.id,
      payoutStatus: payout.status,
      payoutCreatedAt: payout.created_at,
      entryId: entry.id,
      effectiveAt,
      type: entry.type,
      netAmountCents,
      currency,
    });
  }

  capitalEntries.sort((left, right) => String(left.effectiveAt).localeCompare(String(right.effectiveAt))
    || String(left.entryId).localeCompare(String(right.entryId)));

  const output = {
    generatedAt: new Date().toISOString(),
    environment,
    payoutCreatedRange: { from: options.from, to: options.to },
    payoutCount: payouts.length,
    payoutEntryCount: payoutEntries.length,
    capitalEntryCount: capitalEntries.length,
    totalsByType: sortedTotals(byType, ['type', 'currency']),
    totalsByMonth: sortedTotals(byMonth, ['month', 'type', 'currency']),
  };
  if (options.details) output.entries = capitalEntries;
  return output;
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  const beginTime = dateBoundary(options.from, false);
  const endTime = dateBoundary(options.to, true);
  if (beginTime && endTime && beginTime > endTime) {
    throw new Error('--from must not be later than --to');
  }

  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  if (!accessToken) throw new Error('SQUARE_ACCESS_TOKEN is not configured');
  const environment = String(process.env.SQUARE_ENVIRONMENT || process.env.SQUARE_ENV || 'production').toLowerCase();
  if (!['production', 'sandbox'].includes(environment)) {
    throw new Error('SQUARE_ENVIRONMENT must be production or sandbox');
  }
  const apiBase = environment === 'sandbox'
    ? 'https://connect.squareupsandbox.com'
    : 'https://connect.squareup.com';
  const request = createSquareRequest({
    accessToken,
    apiBase,
    apiVersion: process.env.SQUARE_API_VERSION || DEFAULT_API_VERSION,
  });

  const payoutParams = { sort_order: 'ASC' };
  if (beginTime) payoutParams.begin_time = beginTime;
  if (endTime) payoutParams.end_time = endTime;
  if (process.env.SQUARE_LOCATION_ID) payoutParams.location_id = process.env.SQUARE_LOCATION_ID;
  const payouts = await collectPages(request, '/v2/payouts', 'payouts', payoutParams);

  const payoutEntries = [];
  for (const payout of payouts) {
    const entries = await collectPages(
      request,
      `/v2/payouts/${encodeURIComponent(payout.id)}/payout-entries`,
      'payout_entries',
    );
    for (const entry of entries) payoutEntries.push({ payout, entry });
  }

  process.stdout.write(`${JSON.stringify(summarize(payouts, payoutEntries, options, environment), null, 2)}\n`);
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`Square capital audit failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { dateBoundary, parseArgs, summarize };
