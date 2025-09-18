#!/usr/bin/env node
/* eslint-disable no-console */
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

// Load env from root .env then backend/.env (without overriding existing)
try {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
  const be = path.resolve(process.cwd(), 'backend/.env');
  if (fs.existsSync(be)) dotenv.config({ path: be, override: false });
} catch (err) {
  // ignore env load issues
}

// Minimal Brevo client using fetch
async function brevoUpsertContact({ apiKey, contact, listIds, updateEnabled = true }) {
  const body = { ...contact, updateEnabled };
  if (Array.isArray(listIds) && listIds.length) body.listIds = listIds.map(Number);
  const res = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify(body),
  });
  if (res.status === 204 || res.ok) return { ok: true };
  let data = {};
  try { data = await res.json(); } catch (err) { data = { error: 'non-json-response' }; }
  if (res.status === 400 && /exists|already/i.test(JSON.stringify(data))) {
    const email = encodeURIComponent(contact.email);
    const putRes = await fetch(`https://api.brevo.com/v3/contacts/${email}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify({
        attributes: contact.attributes || {},
        email: contact.email,
        sms: contact.sms,
        listIds: Array.isArray(listIds) ? listIds.map(Number) : undefined,
        unlinkListIds: [],
      }),
    });
    if (!putRes.ok) throw new Error(`PUT failed ${putRes.status}: ${await putRes.text()}`);
    return { ok: true, updated: true };
  }
  throw new Error(`POST failed ${res.status}: ${JSON.stringify(data)}`);
}

function squareBaseUrl(name) {
  const v = String(name || '').toLowerCase();
  if (v.startsWith('prod') || v === 'production' || v === 'live') return 'https://connect.squareup.com';
  return 'https://connect.squareupsandbox.com';
}

function usage() {
  console.log(`\nUsage: node tools/square-to-brevo.mjs [--dry] [--list <brevoListId>] [--limit <n>]\nEnv required:\n  SQUARE_ACCESS_TOKEN, BREVO_API_KEY\nOptional env:\n  SQUARE_ENVIRONMENT (production|sandbox), BREVO_LIST_ID\n`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) return usage();
  const dry = args.includes('--dry');
  const listIdx = Math.max(args.indexOf('--list'), args.indexOf('-l'));
  const limitIdx = Math.max(args.indexOf('--limit'), args.indexOf('-n'));
  const sourcesIdx = args.indexOf('--sources');
  const startIdx = args.indexOf('--start');
  const endIdx = args.indexOf('--end');
  const overrideListId = listIdx > -1 ? Number(args[listIdx + 1]) : undefined;
  const hardLimit = limitIdx > -1 ? Number(args[limitIdx + 1]) : undefined;
  const sources = sourcesIdx > -1 ? String(args[sourcesIdx + 1]).split(',').map(s => s.trim().toLowerCase()) : ['customers'];
  const startDateStr = startIdx > -1 ? String(args[startIdx + 1]) : undefined;
  const endDateStr = endIdx > -1 ? String(args[endIdx + 1]) : undefined;

  const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
  const SQUARE_ENVIRONMENT = process.env.SQUARE_ENVIRONMENT || 'Sandbox';
  const BREVO_API_KEY = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY;
  const BREVO_LIST_ID = overrideListId || (process.env.BREVO_LIST_ID ? Number(process.env.BREVO_LIST_ID) : undefined);
  const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID;

  if (!SQUARE_ACCESS_TOKEN || !BREVO_API_KEY) {
    console.error('Missing SQUARE_ACCESS_TOKEN or BREVO_API_KEY.');
    process.exit(1);
  }

  const base = squareBaseUrl(SQUARE_ENVIRONMENT);
  const iso = (d, end) => {
    if (!d) return undefined;
    const t = new Date(d);
    if (Number.isNaN(t.getTime())) return undefined;
    if (end) t.setUTCHours(23, 59, 59, 999); else t.setUTCHours(0, 0, 0, 0);
    return t.toISOString();
  };
  const startISO = iso(startDateStr || new Date(Date.now() - 1000 * 60 * 60 * 24 * 365 * 5), false);
  const endISO = iso(endDateStr || new Date(), true);

  const seenEmails = new Set();
  const queue = [];
  let total = 0, imported = 0, skipped = 0, failed = 0;
  let srcCounts = { customers: 0, orders: 0, invoices: 0 };

  async function pushContact(email, firstName, lastName, phone, source) {
    if (!email || !email.includes('@')) { skipped += 1; return; }
    if (seenEmails.has(email.toLowerCase())) return;
    seenEmails.add(email.toLowerCase());
    const attributes = {};
    if (firstName) attributes.FIRSTNAME = firstName;
    if (lastName) attributes.LASTNAME = lastName;
    const payload = { email, attributes };
    if (phone) payload.sms = phone;
    queue.push(payload);
    srcCounts[source] += 1;
  }

  if (sources.includes('customers')) {
    let cursor = null;
    do {
      const url = new URL('/v2/customers', base);
      if (cursor) url.searchParams.set('cursor', cursor);
      const sqRes = await fetch(url, { headers: { Authorization: `Bearer ${SQUARE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' } });
      if (!sqRes.ok) throw new Error(`Square Customers ${sqRes.status}: ${await sqRes.text()}`);
      const sqData = await sqRes.json();
      const customers = Array.isArray(sqData.customers) ? sqData.customers : [];
      cursor = sqData.cursor || null;
      for (const c of customers) {
        if (hardLimit && (queue.length >= hardLimit)) { cursor = null; break; }
        total += 1;
        await pushContact(c.emailAddress?.trim(), c.givenName, c.familyName, c.phoneNumber, 'customers');
      }
    } while (cursor);
  }

  if (sources.includes('orders')) {
    if (!SQUARE_LOCATION_ID) console.warn('orders source selected but SQUARE_LOCATION_ID missing; skipping orders');
    else {
      let cursor = null;
      do {
        const url = new URL('/v2/orders/search', base);
        const body = {
          location_ids: [SQUARE_LOCATION_ID],
          query: { filter: { date_time_filter: { created_at: { start_at: startISO, end_at: endISO } } } },
          limit: 200,
        };
        if (cursor) body.cursor = cursor;
        const sqRes = await fetch(url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${SQUARE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!sqRes.ok) throw new Error(`Square Orders ${sqRes.status}: ${await sqRes.text()}`);
        const sqData = await sqRes.json();
        const orders = Array.isArray(sqData.orders) ? sqData.orders : [];
        cursor = sqData.cursor || null;
        for (const o of orders) {
          if (hardLimit && (queue.length >= hardLimit)) { cursor = null; break; }
          total += 1;
          const email = o.buyerEmailAddress || o?.fulfillments?.[0]?.shipmentDetails?.recipient?.emailAddress;
          const name = o?.buyerDetails?.name || '';
          const [firstName, ...rest] = (name || '').split(' ');
          const lastName = rest.join(' ') || undefined;
          await pushContact(email && String(email).trim(), firstName || undefined, lastName, undefined, 'orders');
        }
      } while (cursor);
    }
  }

  if (sources.includes('invoices')) {
    if (!SQUARE_LOCATION_ID) console.warn('invoices source selected but SQUARE_LOCATION_ID missing; skipping invoices');
    else {
      let cursor = null;
      do {
        const url = new URL('/v2/invoices/search', base);
        const body = {
          query: { filter: { location_ids: [SQUARE_LOCATION_ID], updated_at: { start_at: startISO, end_at: endISO } } },
          limit: 200,
        };
        if (cursor) body.cursor = cursor;
        const sqRes = await fetch(url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${SQUARE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!sqRes.ok) throw new Error(`Square Invoices ${sqRes.status}: ${await sqRes.text()}`);
        const sqData = await sqRes.json();
        const invoices = Array.isArray(sqData.invoices) ? sqData.invoices : [];
        cursor = sqData.cursor || null;
        for (const inv of invoices) {
          if (hardLimit && (queue.length >= hardLimit)) { cursor = null; break; }
          total += 1;
          const pr = inv.primaryRecipient || inv.primary_recipient || {};
          const email = pr.emailAddress || pr.email_address;
          const givenName = pr.givenName || pr.given_name;
          const familyName = pr.familyName || pr.family_name;
          await pushContact(email && String(email).trim(), givenName, familyName, undefined, 'invoices');
        }
      } while (cursor);
    }
  }

  // Perform upserts
  for (const payload of queue) {
    if (dry) { imported += 1; console.log(`[dry] would upsert ${payload.email}`); continue; }
    try {
      await brevoUpsertContact({ apiKey: BREVO_API_KEY, contact: payload, listIds: BREVO_LIST_ID ? [BREVO_LIST_ID] : undefined });
      imported += 1;
      if (imported % 50 === 0) console.log(`Progress: imported=${imported} queue=${queue.length}`);
    } catch (e) {
      failed += 1;
      console.error(`Failed for ${payload.email}: ${e.message}`);
    }
  }

  console.log(`Sources -> customers=${srcCounts.customers} orders=${srcCounts.orders} invoices=${srcCounts.invoices}`);
  console.log(`Done. total=${total} imported=${imported} skipped=${skipped} failed=${failed}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((e) => { console.error('Fatal:', e && e.message); process.exit(1); });
