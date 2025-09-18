#!/usr/bin/env node
/* eslint-disable no-console */
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse';

// Simple logger
const log = (...args) => console.log('[brevo-import]', ...args);
const error = (...args) => console.error('[brevo-import][error]', ...args);

// Polyfill fetch for Node < 18 if available
async function ensureFetch() {
  if (typeof fetch === 'function') return;
  try {
    const { default: fetchFn } = await import('node-fetch');
    globalThis.fetch = fetchFn;
  } catch (e) {
    error('Global fetch not found. Use Node 18+ or install node-fetch (npm i node-fetch).');
    process.exit(1);
  }
}

// Env + config
const BREVO_API_KEY = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY || process.env.BREVO_KEY;
const DEFAULT_LIST_ID = process.env.BREVO_LIST_ID ? Number(process.env.BREVO_LIST_ID) : undefined;

if (!BREVO_API_KEY) {
  error('Missing BREVO_API_KEY (or SENDINBLUE_API_KEY). Set it in your environment.');
  process.exit(1);
}

// Minimal Brevo client using fetch
async function brevoUpsertContact(contact, { listIds, updateEnabled = true } = {}) {
  const body = { ...contact };
  if (Array.isArray(listIds) && listIds.length) body.listIds = listIds.map(Number);
  body.updateEnabled = updateEnabled;

  const res = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': BREVO_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 204 || res.ok) return { ok: true };

  // If contact exists, Brevo may return 400 with specific code; try PUT
  const data = await res.json().catch(() => ({}));

  if (res.status === 400 && /exists|already/i.test(JSON.stringify(data))) {
    const email = encodeURIComponent(contact.email);
    const putRes = await fetch(`https://api.brevo.com/v3/contacts/${email}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify({
        attributes: contact.attributes || {},
        email: contact.email,
        sms: contact.sms,
        listIds: Array.isArray(listIds) ? listIds.map(Number) : undefined,
        unlinkListIds: [],
      }),
    });
    if (!putRes.ok) {
      const putErr = await putRes.text();
      throw new Error(`PUT failed ${putRes.status}: ${putErr}`);
    }
    return { ok: true, updated: true };
  }

  throw new Error(`POST failed ${res.status}: ${JSON.stringify(data)}`);
}

function usage() {
  console.log(`\nUsage: node tools/brevo-import-csv.mjs <path-to.csv> [--list <id>] [--dry] [--delimiter ;|,]\n\nColumns (case-insensitive, flexible):\n- email (required)\n- firstName | firstname | first_name\n- lastName | lastname | last_name\n- phone | sms | mobile (for SMS field)\n- any other columns become attributes in Brevo (string)\n`);
}

function normalizeHeader(h) {
  return String(h || '').trim().toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9_]/g, '');
}

async function main() {
  await ensureFetch();
  const args = process.argv.slice(2);
  if (!args.length || args.includes('-h') || args.includes('--help')) {
    usage();
    process.exit(0);
  }

  const fileArg = args.find(a => !a.startsWith('-'));
  if (!fileArg) {
    usage();
    process.exit(1);
  }
  const csvPath = path.resolve(process.cwd(), fileArg);
  if (!fs.existsSync(csvPath)) {
    error('CSV not found at', csvPath);
    process.exit(1);
  }

  const listIdx = Math.max(args.indexOf('--list'), args.indexOf('-l'));
  const listId = listIdx > -1 ? Number(args[listIdx + 1]) : DEFAULT_LIST_ID;
  const dryRun = args.includes('--dry');
  const delimiterIdx = Math.max(args.indexOf('--delimiter'), args.indexOf('-d'));
  const delimiter = delimiterIdx > -1 ? args[delimiterIdx + 1] : undefined;

  if (!listId) {
    log('No list id provided. You can pass --list <id> or set BREVO_LIST_ID.');
  }

  log('Reading CSV:', csvPath);
  const parser = fs.createReadStream(csvPath).pipe(parse({ delimiter, columns: true, relax_column_count: true, trim: true }));

  let total = 0, success = 0, failed = 0;

  for await (const record of parser) {
    let row = record;

    total += 1;

    // Build normalized object
    const normalized = {};
    for (const [k, v] of Object.entries(row)) {
      normalized[normalizeHeader(k)] = v;
    }

    const email = normalized.email || normalized.e_mail || normalized.mail;
    const firstName = normalized.firstname || normalized.first_name || normalized.givenname || normalized.given_name;
    const lastName = normalized.lastname || normalized.last_name || normalized.surname || normalized.familyname || normalized.family_name;
    const sms = normalized.sms || normalized.phone || normalized.mobile || normalized.phonenumber || normalized.phone_number;

    if (!email || !String(email).includes('@')) {
      failed += 1;
      log(`Row ${total}: skipped (no valid email)`);
      continue;
    }

    const attributes = { ...normalized };
    delete attributes.email; delete attributes.e_mail; delete attributes.mail;
    delete attributes.firstname; delete attributes.first_name; delete attributes.givenname; delete attributes.given_name;
    delete attributes.lastname; delete attributes.last_name; delete attributes.surname; delete attributes.familyname; delete attributes.family_name;
    delete attributes.sms; delete attributes.phone; delete attributes.mobile; delete attributes.phonenumber; delete attributes.phone_number;

    if (firstName) attributes.FIRSTNAME = firstName;
    if (lastName) attributes.LASTNAME = lastName;

    const contactPayload = {
      email: String(email).trim(),
      attributes,
    };
    if (sms) contactPayload.sms = String(sms).trim();

    if (dryRun) {
      success += 1;
      log(`DRY: would upsert ${contactPayload.email}`);
      continue;
    }

    try {
      await brevoUpsertContact(contactPayload, { listIds: listId ? [listId] : undefined, updateEnabled: true });
      success += 1;
      if (success % 50 === 0) log(`Progress: ${success}/${total} upserts ok...`);
    } catch (e) {
      failed += 1;
      error(`Row ${total} failed for ${contactPayload.email}:`, e.message);
    }
  }

  log(`Done. total=${total} success=${success} failed=${failed}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((e) => {
  error('Fatal:', e);
  process.exit(1);
});
