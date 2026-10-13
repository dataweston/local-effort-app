#!/usr/bin/env node
/**
 * Adds Square customers that are missing from Brevo to the "LE | Customers" and
 * "Pizza Drop 1 | Target" lists created by brevo-consolidate-audiences.cjs.
 *
 *   node scripts/brevo-add-square-customers.cjs           # dry run, counts only
 *   node scripts/brevo-add-square-customers.cjs --apply   # write to Brevo
 *
 * Square customer profiles come from paid checkouts (INSTANT_PROFILE) or the
 * owner's own dashboard entries (DIRECTORY/MERGE), so they are existing customer
 * relationships. Skipped: Square email-unsubscribed profiles, internal
 * addresses, malformed emails, and any email Brevo already knows (so Brevo
 * blacklists and unsubscribes are never overridden). Phone numbers are NOT
 * copied: marketing SMS needs separate opt-in (docs/growth-measurement.md).
 * Never sends mail.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const APPLY = process.argv.includes('--apply');
const LISTS = ['LE | Customers', 'Pizza Drop 1 | Target'];

function env() {
  const out = {};
  for (const f of ['.env', '.env.local']) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
      if (m) out[m[1]] = m[2];
    }
  }
  return out;
}
const E = env();
const internal = (e) => /@localeffortfood\.com$|^dataweston@|@example\.com$|brevosend\.com$/.test(e);
const valid = (e) => /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(e);

async function brevo(method, route, body) {
  const res = await fetch(`https://api.brevo.com/v3${route}`, {
    method,
    headers: { 'api-key': E.BREVO_API_KEY, accept: 'application/json', 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok && res.status !== 404) throw new Error(`${method} ${route} -> ${res.status} ${text.slice(0, 200)}`);
  return { status: res.status, json: text ? JSON.parse(text) : {} };
}

async function squareCustomers() {
  const base = /sandbox/i.test(E.SQUARE_ENVIRONMENT || '') ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com';
  const all = [];
  let cursor;
  do {
    const res = await fetch(`${base}/v2/customers?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`, {
      headers: { Authorization: `Bearer ${E.SQUARE_ACCESS_TOKEN}`, 'Square-Version': '2024-10-17' },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`Square customers -> ${res.status}`);
    all.push(...(json.customers || []));
    cursor = json.cursor;
  } while (cursor);
  return all;
}

(async () => {
  const lists = (await brevo('GET', '/contacts/lists?limit=50')).json.lists || [];
  const listIds = LISTS.map((name) => {
    const l = lists.find((x) => x.name === name);
    if (!l) throw new Error(`Brevo list "${name}" missing; run brevo-consolidate-audiences.cjs --apply first`);
    return l.id;
  });

  const seen = new Set();
  const plan = { square: 0, noEmail: 0, optedOut: 0, internalOrInvalid: 0, existsInBrevo: 0, toAdd: [] };
  for (const c of await squareCustomers()) {
    plan.square++;
    const email = String(c.email_address || '').trim().toLowerCase();
    if (!email) { plan.noEmail++; continue; }
    if (c.preferences && c.preferences.email_unsubscribed) { plan.optedOut++; continue; }
    if (internal(email) || !valid(email) || seen.has(email)) { plan.internalOrInvalid++; continue; }
    seen.add(email);
    if ((await brevo('GET', `/contacts/${encodeURIComponent(email)}`)).status === 200) { plan.existsInBrevo++; continue; }
    plan.toAdd.push({
      email,
      attributes: {
        FIRSTNAME: c.given_name || undefined,
        LASTNAME: c.family_name || undefined,
        ZIP: (c.address && c.address.postal_code) || undefined,
      },
    });
  }
  console.log({ ...plan, toAdd: plan.toAdd.length, listIds, apply: APPLY });
  if (!APPLY) return;
  for (const c of plan.toAdd) {
    await brevo('POST', '/contacts', { email: c.email, attributes: c.attributes, listIds, updateEnabled: false });
  }
  console.log(`Added ${plan.toAdd.length} contacts. Nothing was sent.`);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
