#!/usr/bin/env node
// Read-only triage of checkout failures: what failed, where, why, and what to do.
//
//   node scripts/checkout-failures.cjs [--days 7] [--store pizza-on-smith] [--env .vercel/.env.production.local]
//
// Reads the Brain ledger (source web_checkout) and FinancePaymentAttempt. Prints
// no customer contact details: events carry only a session id, amount, stage and
// error code. A session that tried to pay but ended with neither an order nor a
// failure is reported as UNRECORDED — that is the signature of a lost record and
// means the payment path must be checked against Square directly.
const fs = require('fs');
const path = require('path');

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const raw of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index < 1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}

function argValue(name, fallback = '') {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

// Advice per code lives with the owner alert email so the two always agree.
const { adviceFor } = require('../backend/api/finance/checkoutFailureAdvice');

async function main() {
  loadEnv(path.resolve(argValue('env', '.vercel/.env.production.local')));
  const days = Number(argValue('days', '7'));
  const storeFilter = argValue('store');
  const { prisma } = require('../backend/api/utils/prisma');
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const events = await prisma.ledgerEvent.findMany({
    where: { source: 'web_checkout', occurredAt: { gte: since }, eventType: { in: ['payment.attempted', 'payment.failed', 'order.placed', 'page.error'] } },
    orderBy: { occurredAt: 'asc' },
  });

  const sessions = new Map();
  const pageErrors = [];
  for (const row of events) {
    const payload = row.payload || {};
    if (storeFilter && payload.store !== storeFilter) continue;
    if (row.eventType === 'page.error') { pageErrors.push({ at: row.occurredAt, payload }); continue; }
    const id = payload.sessionId || `${row.eventType}@${row.occurredAt.toISOString()}`;
    const entry = sessions.get(id) || { id, store: payload.store, attempted: null, placed: false, failures: [] };
    if (row.eventType === 'payment.attempted') { entry.attempted = row.occurredAt; entry.amountCents = payload.amountCents; }
    if (row.eventType === 'order.placed') entry.placed = true;
    if (row.eventType === 'payment.failed') entry.failures.push({ at: row.occurredAt, payload });
    sessions.set(id, entry);
  }

  const fmt = (cents) => (Number.isFinite(cents) ? `$${(cents / 100).toFixed(2)}` : '$?');
  const failed = [];
  const unrecorded = [];
  for (const entry of sessions.values()) {
    if (entry.placed) continue;
    if (entry.failures.length) failed.push(entry);
    else if (entry.attempted) unrecorded.push(entry);
  }

  console.log(`Checkout failures since ${since.toISOString()}${storeFilter ? ` (${storeFilter})` : ''}`);
  console.log(`\nRECORDED FAILURES (${failed.length})`);
  for (const entry of failed) {
    const f = entry.failures[entry.failures.length - 1];
    const p = f.payload;
    const session = entry.attempted || p.origin ? String(entry.id).slice(-8) : '(none: recorded before session ids)';
    console.log(`- ${f.at.toISOString()} ${entry.store} ${fmt(entry.amountCents)} session ${session} origin=${p.origin || 'client'} stage=${p.stage || '?'} http=${p.httpStatus || '-'} code=${p.declineCodes || p.code || '-'}`);
    console.log(`    reason: ${p.reason || '-'}`);
    console.log(`    next:   ${adviceFor(p)}`);
  }

  console.log(`\nUNRECORDED (${unrecorded.length}) — tried to pay, no order and no failure on file`);
  for (const entry of unrecorded) {
    console.log(`- ${entry.attempted.toISOString()} ${entry.store} ${fmt(entry.amountCents)} session ${String(entry.id).slice(-8)}`);
  }
  if (unrecorded.length) {
    console.log('    next:   Check Square payments for that time. If none exist the failure was in the browser or the record was lost; see page.error events below.');
  }

  console.log(`\nPAGE ERRORS (${pageErrors.length})`);
  for (const { at, payload } of pageErrors) {
    console.log(`- ${at.toISOString()} ${payload.store} ${payload.stage} ${payload.code || ''}: ${payload.reason || ''}`);
  }

  const attempts = await prisma.financePaymentAttempt.findMany({
    where: { status: 'failed', startedAt: { gte: since } },
    orderBy: { startedAt: 'asc' },
    select: { startedAt: true, requestedCents: true, failureCode: true, failureMessage: true },
  });
  console.log(`\nSERVER PAYMENT ATTEMPTS THAT FAILED (${attempts.length})`);
  for (const a of attempts) {
    console.log(`- ${a.startedAt.toISOString()} ${fmt(a.requestedCents)} ${a.failureCode}: ${a.failureMessage}`);
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
