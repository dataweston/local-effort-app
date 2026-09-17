#!/usr/bin/env node
/* THROWAWAY read-only: full payout history + entries, to date the FIRST Square Capital
   repayment and look for any advance-disbursement entry. GET only. */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const SQUARE_BASE = (process.env.SQUARE_BASE || 'https://connect.squareup.com/v2').replace(/\/$/, '');
const SQUARE_VERSION = process.env.SQUARE_VERSION || '2026-01-22';
const TOKEN = process.env.SQUARE_ACCESS_TOKEN || '';
const calls = [];
async function squareGet(p, params = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v != null && v !== '') qs.set(k, String(v));
  const url = `${SQUARE_BASE}/${p}${qs.toString() ? `?${qs}` : ''}`;
  const resp = await fetch(url, { method: 'GET', headers: { Authorization: `Bearer ${TOKEN}`, 'Square-Version': SQUARE_VERSION, Accept: 'application/json' } });
  const text = await resp.text();
  calls.push({ method: 'GET', path: p, status: resp.status });
  let json = null; try { json = JSON.parse(text); } catch {}
  return { ok: resp.ok, status: resp.status, json, text: text.slice(0, 300) };
}
async function main() {
  const out = { generatedAt: new Date().toISOString() };
  const payouts = [];
  let cursor; let pages = 0;
  do {
    const r = await squareGet('payouts', { limit: 100, cursor, sort_order: 'ASC' });
    if (!r.ok) { out.error = r.text; break; }
    for (const p of r.json?.payouts || []) payouts.push(p);
    cursor = r.json?.cursor; pages += 1;
  } while (cursor && pages < 100);
  out.pages = pages;
  out.payoutTotal = payouts.length;
  out.earliest = payouts[0]?.created_at || null;
  out.latest = payouts.at(-1)?.created_at || null;
  const pre = payouts.filter((p) => String(p.created_at) < '2026-05-01');
  out.prePayoutCount = pre.length;
  out.preEntries = [];
  for (const p of pre) {
    let c; let pg = 0;
    do {
      const r = await squareGet(`payouts/${p.id}/payout-entries`, { limit: 100, cursor: c, sort_order: 'ASC' });
      if (!r.ok) break;
      for (const e of r.json?.payout_entries || []) {
        if (String(e.type).startsWith('SQUARE_CAPITAL') || !['CHARGE', 'REFUND', 'ADJUSTMENT', 'RETURNED_PAYOUT', 'FEE', 'DISPUTE'].includes(e.type)) {
          out.preEntries.push({ entry_id: e.id, payout_id: p.id, type: e.type, effective_at: e.effective_at, gross: e.gross_amount_money, net: e.net_amount_money });
        }
      }
      c = r.json?.cursor; pg += 1;
    } while (c && pg < 20);
  }
  out.preTypeCensus = {};
  out.calls = calls.length;
  fs.writeFileSync(path.join(__dirname, 'square-history.json'), JSON.stringify(out, null, 2));
  console.log('payouts total', out.payoutTotal, 'pre-May', out.prePayoutCount, 'capital-ish pre entries', out.preEntries.length, 'calls', calls.length, 'non-GET', calls.filter(c=>c.method!=='GET').length);
  console.log('earliest payout', out.earliest);
}
main().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
