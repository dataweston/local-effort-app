#!/usr/bin/env node
/**
 * Gmail CLI — read-only search over the founder's mailbox.
 *
 *   node scripts/gmail.cjs status
 *   node scripts/gmail.cjs search "rad pizza" [--max 8] [--chars 2000]
 *   node scripts/gmail.cjs thread <threadId>
 *   node scripts/gmail.cjs auth-url
 *
 * Token loading, refresh, and persistence all go through backend/api/brain/gmailSync.js
 * so this CLI and the server share one grant. `status` is non-throwing and tells
 * you exactly how to reconnect when the grant has lapsed.
 */
require('dotenv').config();

const {
  getAuthorizedGmailClient,
  getGmailAuthHealth,
  getAuthUrl,
} = require('../backend/api/brain/gmailSync.js');

const RECONNECT = [
  'Reconnect Gmail:',
  '  1. Open the Brain UI -> Partners view -> "Connect Gmail".',
  '     (That POSTs with your admin session so the OAuth state secret matches',
  '      production. A locally generated URL can fail state verification.)',
  '  2. Complete Google consent. The callback stores tokens in BrainApiToken.',
  '  3. Re-run: node scripts/gmail.cjs status',
].join('\n');

const TESTING_MODE_WARNING = [
  'WARNING: this OAuth client is in "Testing" publishing status, so Google',
  'expires refresh tokens after 7 days and Gmail will break again next week.',
  'Fix permanently: Google Cloud Console -> APIs & Services -> OAuth consent',
  'screen -> Publish app (moves to "In production", tokens stop expiring).',
].join('\n');

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? fallback : process.argv[i + 1];
}

function headerMap(payload) {
  return Object.fromEntries((payload?.headers || []).map((h) => [h.name.toLowerCase(), h.value]));
}

function walk(part, mime) {
  if (!part) return '';
  if (part.mimeType === mime && part.body?.data) {
    return Buffer.from(part.body.data, 'base64').toString('utf8');
  }
  for (const child of part.parts || []) {
    const found = walk(child, mime);
    if (found) return found;
  }
  return '';
}

function extractText(payload) {
  const plain = walk(payload, 'text/plain');
  if (plain) return plain;
  return walk(payload, 'text/html')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}

function clean(text) {
  return text.replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function printMessage(msg, chars) {
  const h = headerMap(msg.payload);
  console.log('='.repeat(78));
  console.log(`DATE:    ${h.date || ''}`);
  console.log(`FROM:    ${h.from || ''}`);
  console.log(`TO:      ${h.to || ''}`);
  if (h.cc) console.log(`CC:      ${h.cc}`);
  console.log(`SUBJECT: ${h.subject || '(no subject)'}`);
  console.log(`THREAD:  ${msg.threadId}   https://mail.google.com/mail/u/0/#all/${msg.threadId}`);
  console.log('-'.repeat(78));
  const body = clean(extractText(msg.payload));
  console.log(body.slice(0, chars) || '(no text body)');
  if (body.length > chars) console.log(`\n... [${body.length - chars} more chars — raise --chars]`);
  console.log();
}

async function cmdStatus() {
  const health = await getGmailAuthHealth();
  console.log(`Gmail auth: ${health.ok ? 'OK' : 'BROKEN'}  (${health.reason})`);
  if (health.detail) console.log(`  detail: ${health.detail}`);
  if (health.expiresAt) console.log(`  access token expires: ${health.expiresAt}`);

  // Index freshness is a separate failure mode: auth can be fine while the
  // ingested copy in the brain is months stale.
  try {
    const { getPrisma } = require('../backend/api/utils/prisma');
    const prisma = getPrisma();
    const newest = await prisma.ledgerEvent.findFirst({
      where: { source: 'gmail' },
      orderBy: { occurredAt: 'desc' },
      select: { occurredAt: true },
    });
    const total = await prisma.ledgerEvent.count({ where: { source: 'gmail' } });
    if (newest) {
      const ageDays = Math.floor((Date.now() - new Date(newest.occurredAt).getTime()) / 86400000);
      console.log(`Brain gmail index: ${total} threads, newest ${newest.occurredAt.toISOString().slice(0, 10)} (${ageDays}d old)`);
      if (ageDays > 14) console.log('  NOTE: index is stale — run POST /api/brain/gmail/sync after reconnecting.');
    } else {
      console.log('Brain gmail index: empty');
    }
  } catch (err) {
    console.log(`Brain gmail index: unavailable (${err.message})`);
  }

  if (health.testingModeGrant) console.log(`\n${TESTING_MODE_WARNING}`);
  if (!health.ok) {
    console.log(`\n${RECONNECT}`);
    process.exitCode = 1;
  }
}

async function withClient(fn) {
  const health = await getGmailAuthHealth();
  if (!health.ok) {
    console.error(`Gmail auth BROKEN (${health.reason}): ${health.detail || ''}`);
    if (health.testingModeGrant) console.error(`\n${TESTING_MODE_WARNING}`);
    console.error(`\n${RECONNECT}`);
    process.exitCode = 1;
    return;
  }
  if (health.testingModeGrant) console.error(`${TESTING_MODE_WARNING}\n`);
  await fn(await getAuthorizedGmailClient());
}

async function cmdSearch(query) {
  const max = Number(arg('--max', 8));
  const chars = Number(arg('--chars', 2000));
  await withClient(async (gmail) => {
    const res = await gmail.users.messages.list({ userId: 'me', q: query, maxResults: max });
    const msgs = res.data.messages || [];
    console.log(`QUERY: ${query}  ->  ${msgs.length} message(s)\n`);
    for (const stub of msgs) {
      const full = await gmail.users.messages.get({ userId: 'me', id: stub.id, format: 'full' });
      printMessage(full.data, chars);
    }
  });
}

async function cmdThread(threadId) {
  const chars = Number(arg('--chars', 4000));
  await withClient(async (gmail) => {
    const res = await gmail.users.threads.get({ userId: 'me', id: threadId, format: 'full' });
    const msgs = res.data.messages || [];
    console.log(`THREAD ${threadId}  ->  ${msgs.length} message(s)\n`);
    for (const m of msgs) printMessage(m, chars);
  });
}

function cmdAuthUrl() {
  console.log(getAuthUrl());
  console.log('\nNOTE: prefer the Brain UI "Connect Gmail" button. This URL is signed with');
  console.log('the LOCAL state secret; if it differs from production the callback rejects it.');
}

async function main() {
  const cmd = process.argv[2];
  if (cmd === 'status') return cmdStatus();
  if (cmd === 'search') {
    const q = process.argv[3];
    if (!q) throw new Error('usage: gmail.cjs search "<gmail query>" [--max N] [--chars N]');
    return cmdSearch(q);
  }
  if (cmd === 'thread') {
    const id = process.argv[3];
    if (!id) throw new Error('usage: gmail.cjs thread <threadId>');
    return cmdThread(id);
  }
  if (cmd === 'auth-url') return cmdAuthUrl();
  console.log(require('fs').readFileSync(__filename, 'utf8').split('*/')[0].split('\n').slice(1).map((l) => l.replace(/^ \* ?/, '')).join('\n'));
  process.exitCode = 1;
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`);
  process.exitCode = 1;
});
