#!/usr/bin/env node
/**
 * Consolidates the ad-hoc Brevo lists into a small set of purpose-based
 * audience lists. Dry run by default; --apply creates the folder/lists and
 * adds contacts. It never removes anyone from an existing list, never
 * touches blacklist flags, and never sends or schedules a campaign.
 *
 *   node scripts/brevo-consolidate-audiences.cjs            # plan + counts
 *   node scripts/brevo-consolidate-audiences.cjs --apply    # build in Brevo
 *
 * Reads BREVO_API_KEY from .env.local or .env. Writes the plan summary (counts
 * only, no PII) to .tmp/brevo-audience-plan.json.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const APPLY = process.argv.includes('--apply');
const FOLDER_NAME = 'Audiences 2026-10';

function apiKey() {
  for (const f of ['.env.local', '.env']) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    const m = fs.readFileSync(p, 'utf8').match(/^\s*BREVO_API_KEY\s*=\s*"?([^"\r\n]+)"?/m);
    if (m) return m[1].trim();
  }
  throw new Error('BREVO_API_KEY not found in .env.local or .env');
}
const KEY = apiKey();

async function brevo(method, route, body) {
  const res = await fetch(`https://api.brevo.com/v3${route}`, {
    method,
    headers: { 'api-key': KEY, accept: 'application/json', 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${route} -> ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

async function allContacts() {
  const out = [];
  for (let offset = 0; ; offset += 500) {
    const page = await brevo('GET', `/contacts?limit=500&offset=${offset}`);
    out.push(...page.contacts);
    if (page.contacts.length < 500) break;
  }
  return out;
}

// Existing list ids, grouped by what the audience is.
const OLD = {
  customers: [18, 14, 7, 13], // Local Effort Customers, may customers, square import, Fundraiser purchasers
  mealPrep: [20, 16], // Meal Prep Trial warm leads, meal prep waitlist
  community: [15, 12, 11, 10], // Localist, og+fam, mailchimp, tc import
  events: [22, 21, 19], // Summer Sale ranked/wave 1, July
  thumbtack: [17],
  partners: [9, 8, 5, 4], // Fundraising partners, media, identified, conversations
};

const NEW_LISTS = [
  { key: 'customers', name: 'LE | Customers' },
  { key: 'mealPrep', name: 'LE | Meal Prep' },
  { key: 'community', name: 'LE | Community & Neighbors' },
  { key: 'events', name: 'LE | Events & Summer Sale Leads' },
  { key: 'thumbtack', name: 'LE | Thumbtack Leads' },
  { key: 'partners', name: 'LE | Partners & Media (no consumer promos)' },
  { key: 'phoneOnly', name: 'LE | Phone Only (no email - SMS opt-in required)' },
  { key: 'pizzaDrop1', name: 'Pizza Drop 1 | Target' },
];

const has = (c, ids) => (c.listIds || []).some((id) => ids.includes(id));
const attr = (c) => c.attributes || {};

function categorize(c) {
  const a = attr(c);
  const paid = Number(a.PAYMENT_COUNT) > 0 || Number(a.TOTAL_SPEND) > 0;
  const thumbtackDone = /job done/i.test(a.THUMBTACK_STATUS || '');
  const onlyPartners =
    has(c, OLD.partners) &&
    !has(c, [...OLD.customers, ...OLD.mealPrep, ...OLD.community, ...OLD.events, ...OLD.thumbtack]);
  if (onlyPartners) return 'partners';
  if (paid || thumbtackDone || has(c, OLD.customers)) return 'customers';
  if (has(c, OLD.mealPrep)) return 'mealPrep';
  if (has(c, OLD.community)) return 'community';
  if (has(c, OLD.events)) return 'events';
  if (has(c, OLD.thumbtack)) return 'thumbtack';
  if (has(c, OLD.partners)) return 'partners';
  return 'unassigned';
}

// Pizza Drop 1: people who bought from, lived near, or asked about Local Effort,
// excluding partners/media and cold Thumbtack inquiries that never hired.
const DROP_CATEGORIES = new Set(['customers', 'mealPrep', 'community', 'events']);

async function ensureFolder() {
  const folders = await brevo('GET', '/contacts/folders?limit=50&offset=0');
  const hit = (folders.folders || []).find((f) => f.name === FOLDER_NAME);
  if (hit) return hit.id;
  return (await brevo('POST', '/contacts/folders', { name: FOLDER_NAME })).id;
}

async function ensureList(folderId, name) {
  const lists = await brevo('GET', '/contacts/lists?limit=50&offset=0');
  const hit = (lists.lists || []).find((l) => l.name === name);
  if (hit) return hit.id;
  return (await brevo('POST', '/contacts/lists', { name, folderId })).id;
}

async function addByIds(listId, ids) {
  for (let i = 0; i < ids.length; i += 150) {
    await brevo('POST', `/contacts/lists/${listId}/contacts/add`, { ids: ids.slice(i, i + 150) });
  }
}

(async () => {
  const contacts = await allContacts();
  const buckets = Object.fromEntries(NEW_LISTS.map((l) => [l.key, []]));
  const skipped = { blacklisted: 0, unassigned: 0, noEmailNoPhone: 0 };
  const seenEmail = new Set();

  for (const c of contacts) {
    const email = (c.email || '').trim().toLowerCase();
    const sms = attr(c).SMS || attr(c).SMS_NUMBER || '';
    if (!email) {
      if (sms && !c.smsBlacklisted) buckets.phoneOnly.push(c.id);
      else skipped.noEmailNoPhone++;
      continue;
    }
    if (/@localeffortfood\.com$|^dataweston@|@example\.com$|brevosend\.com$/.test(email)) continue;
    if (c.emailBlacklisted) {
      skipped.blacklisted++;
      continue;
    }
    if (seenEmail.has(email)) continue;
    seenEmail.add(email);
    const cat = categorize(c);
    if (cat === 'unassigned') {
      skipped.unassigned++;
      continue;
    }
    buckets[cat].push(c.id);
    if (DROP_CATEGORIES.has(cat)) buckets.pizzaDrop1.push(c.id);
  }

  const counts = Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, v.length]));
  console.log({ mode: APPLY ? 'APPLY' : 'DRY RUN', contacts: contacts.length, counts, skipped });
  fs.mkdirSync(path.join(ROOT, '.tmp'), { recursive: true });
  fs.writeFileSync(
    path.join(ROOT, '.tmp', 'brevo-audience-plan.json'),
    JSON.stringify({ counts, skipped }, null, 2)
  );
  if (!APPLY) return;

  const folderId = await ensureFolder();
  const result = {};
  for (const l of NEW_LISTS) {
    const id = await ensureList(folderId, l.name);
    await addByIds(id, buckets[l.key]);
    result[l.name] = { id, added: buckets[l.key].length };
  }
  console.log({ folderId, result });
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
