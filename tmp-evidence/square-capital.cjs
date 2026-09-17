#!/usr/bin/env node
/* THROWAWAY read-only Square evidence pull. GET requests only. */
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const SQUARE_BASE = (process.env.SQUARE_BASE || 'https://connect.squareup.com/v2').replace(/\/$/, '');
const SQUARE_VERSION = process.env.SQUARE_VERSION || '2026-01-22';
const TOKEN = process.env.SQUARE_ACCESS_TOKEN || '';
if (!TOKEN) throw new Error('SQUARE_ACCESS_TOKEN not set');

const calls = [];

async function squareGet(p, params = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v != null && v !== '') qs.set(k, String(v));
  const url = `${SQUARE_BASE}/${p}${qs.toString() ? `?${qs}` : ''}`;
  const resp = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Square-Version': SQUARE_VERSION, Accept: 'application/json' },
  });
  const text = await resp.text();
  calls.push({ method: 'GET', path: p, params, status: resp.status });
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-json */ }
  return { ok: resp.ok, status: resp.status, json, text: text.slice(0, 400) };
}

async function main() {
  const out = { generatedAt: new Date().toISOString(), squareVersion: SQUARE_VERSION, base: SQUARE_BASE };

  // ── 0. merchant + locations (context only)
  const loc = await squareGet('locations');
  out.locations = (loc.json?.locations || []).map((l) => ({ id: l.id, name: l.name, currency: l.currency, status: l.status }));

  // ── 1. probe for any loan / capital bearing endpoint. Verify by response.
  const probes = [
    'loans', 'capital', 'capital/loans', 'loans/loan-applications', 'loans/loans',
    'financing', 'financing/offers', 'financing/loans', 'capital/advances', 'merchant-loans',
  ];
  out.endpointProbes = [];
  for (const p of probes) {
    const r = await squareGet(p, { limit: 1 });
    out.endpointProbes.push({ path: `GET /v2/${p}`, status: r.status, body: r.text });
  }

  // ── 2. payouts since 2026-05-01
  const BEGIN = '2026-05-01T00:00:00Z';
  const payouts = [];
  for (const l of out.locations) {
    let cursor; let pages = 0;
    do {
      const r = await squareGet('payouts', { limit: 100, cursor, location_id: l.id, begin_time: BEGIN, sort_order: 'ASC' });
      if (!r.ok) { out.payoutsError = r.text; break; }
      for (const pay of r.json?.payouts || []) payouts.push(pay);
      cursor = r.json?.cursor; pages += 1;
    } while (cursor && pages < 50);
  }
  // de-dupe by id
  const byId = new Map();
  for (const p of payouts) byId.set(p.id, p);
  const allPayouts = [...byId.values()].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  out.payoutCount = allPayouts.length;
  out.payouts = allPayouts.map((p) => ({
    id: p.id,
    status: p.status,
    type: p.type,
    created_at: p.created_at,
    arrival_date: p.arrival_date,
    amount: p.amount_money,
    destination: p.destination?.type || null,
  }));

  // ── 3. payout entries for every payout in window
  out.entries = [];
  for (const p of allPayouts) {
    let cursor; let pages = 0;
    do {
      const r = await squareGet(`payouts/${p.id}/payout-entries`, { limit: 100, cursor, sort_order: 'ASC' });
      if (!r.ok) { out.entries.push({ payout_id: p.id, error: r.text }); break; }
      for (const e of r.json?.payout_entries || []) {
        out.entries.push({
          entry_id: e.id,
          payout_id: e.payout_id || p.id,
          type: e.type,
          effective_at: e.effective_at,
          gross: e.gross_amount_money,
          fee: e.fee_amount_money,
          net: e.net_amount_money,
          type_details_keys: Object.keys(e).filter((k) => k.endsWith('_details')),
        });
      }
      cursor = r.json?.cursor; pages += 1;
    } while (cursor && pages < 50);
  }

  // ── 4. gross card sales by month from payments (2026-05-01 → now)
  const payments = [];
  {
    let cursor; let pages = 0;
    do {
      const r = await squareGet('payments', { limit: 100, cursor, begin_time: BEGIN, sort_order: 'ASC' });
      if (!r.ok) { out.paymentsError = r.text; break; }
      for (const pm of r.json?.payments || []) payments.push(pm);
      cursor = r.json?.cursor; pages += 1;
    } while (cursor && pages < 100);
    out.paymentPages = pages;
  }
  out.paymentCount = payments.length;
  out.payments = payments.map((pm) => ({
    id: pm.id,
    created_at: pm.created_at,
    status: pm.status,
    source_type: pm.source_type,
    amount: pm.amount_money,
    total: pm.total_money,
    approved: pm.approved_money,
    fee: (pm.processing_fee || []).reduce((s, f) => s + Number(f.amount_money?.amount || 0), 0),
    refunded: pm.refunded_money,
  }));

  // ── 5. refunds in window (for net card sales context)
  {
    let cursor; let pages = 0; const refunds = [];
    do {
      const r = await squareGet('refunds', { limit: 100, cursor, begin_time: BEGIN, sort_order: 'ASC' });
      if (!r.ok) { out.refundsError = r.text; break; }
      for (const rf of r.json?.refunds || []) refunds.push(rf);
      cursor = r.json?.cursor; pages += 1;
    } while (cursor && pages < 50);
    out.refunds = refunds.map((rf) => ({ id: rf.id, created_at: rf.created_at, status: rf.status, amount: rf.amount_money }));
  }

  // ── 6. bank accounts (read-only; ids only, no numbers) — confirms payout destination kinds
  const ba = await squareGet('bank-accounts', { limit: 10 });
  out.bankAccounts = (ba.json?.bank_accounts || []).map((b) => ({ id: b.id, status: b.status, holder_present: Boolean(b.account_number_suffix) }));
  out.bankAccountsStatus = ba.status;

  out.calls = calls;
  const dest = path.join(__dirname, 'square-raw.json');
  fs.writeFileSync(dest, JSON.stringify(out, null, 2));
  console.log('wrote', dest, 'payouts', out.payoutCount, 'entries', out.entries.length, 'payments', out.paymentCount, 'calls', calls.length);
  console.log('non-GET calls:', calls.filter((c) => c.method !== 'GET').length);
}

main().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
