#!/usr/bin/env node
/**
 * Read-only recovery of menu proposals the owner wrote in Gmail.
 *
 *   node scripts/recover-gmail-menus.cjs list    # candidate ids per query -> .tmp/menu-recovery/ids.json
 *   node scripts/recover-gmail-menus.cjs fetch   # bodies/attachments/doc links -> .tmp/menu-recovery/messages.jsonl
 *
 * Output stays in the gitignored .tmp/ directory: it contains customer names and pricing.
 * Only gmail.readonly is used. Nothing is sent, labelled or modified.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { getAuthorizedGmailClient } = require('../backend/api/brain/gmailSync.js');
const { parseGmailFullMessage } = require('../backend/api/brain/gmailMime.js');
const { prisma } = require('../backend/api/utils/prisma');

const OUT = path.join(__dirname, '..', '.tmp', 'menu-recovery');
const FOOD = '(appetizer OR entree OR entrée OR passed OR buffet OR plated OR "family style" OR dessert OR canapé OR canape OR charcuterie OR salad OR "hors d\'oeuvres")';
const QUERIES = {
  menuWord: 'from:me (menu OR menus OR "sample menu" OR "proposed menu" OR "menu proposal" OR "draft menu")',
  pricedFood: `from:me ("per person" OR "per head" OR "a head" OR headcount OR "guest count" OR guests) ${FOOD}`,
  docLinks: 'from:me ("docs.google.com/document" OR "drive.google.com") (menu OR proposal OR dinner OR event)',
  attachments: 'from:me has:attachment (filename:pdf OR filename:docx OR filename:doc) (menu OR proposal OR dinner)',
  drafts: 'in:drafts (menu OR guests OR "per person")',
  mealPrep: 'from:me ("meal prep" OR "weekly meals" OR "meal plan") (menu OR sample OR example OR "this week" OR "next week")',
};

async function listIds(gmail, q, limit = 3000) {
  const rows = [];
  let pageToken;
  while (rows.length < limit) {
    const r = await gmail.users.messages.list({ userId: 'me', q, maxResults: 500, includeSpamTrash: false, ...(pageToken ? { pageToken } : {}) });
    rows.push(...(r.data.messages || []));
    pageToken = r.data.nextPageToken;
    if (!pageToken) break;
  }
  return rows;
}

async function stageList(gmail) {
  fs.mkdirSync(OUT, { recursive: true });
  const byId = {};
  const counts = {};
  for (const [name, q] of Object.entries(QUERIES)) {
    const rows = await listIds(gmail, q);
    counts[name] = rows.length;
    for (const row of rows) (byId[row.id] ||= { id: row.id, threadId: row.threadId, queries: [] }).queries.push(name);
  }
  fs.writeFileSync(path.join(OUT, 'ids.json'), JSON.stringify(Object.values(byId)));
  console.log(JSON.stringify({ counts, unique: Object.keys(byId).length }, null, 2));
}

function docLinks(text, html) {
  const hay = `${text}\n${html || ''}`;
  const found = new Set();
  for (const m of hay.matchAll(/https?:\/\/(?:docs|drive)\.google\.com\/[^\s"'<>)\]]+/gi)) found.add(m[0].replace(/[.,;]+$/, ''));
  return [...found];
}

async function stageFetch(gmail) {
  const ids = JSON.parse(fs.readFileSync(path.join(OUT, 'ids.json'), 'utf8'));
  const file = path.join(OUT, 'messages.jsonl');
  const done = new Set(fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l).id) : []);
  const todo = ids.filter((r) => !done.has(r.id));
  console.log(`fetching ${todo.length} of ${ids.length}`);
  const out = fs.createWriteStream(file, { flags: 'a' });
  let n = 0;
  const worker = async () => {
    while (todo.length) {
      const row = todo.shift();
      try {
        const res = await gmail.users.messages.get({ userId: 'me', id: row.id, format: 'full' });
        const p = parseGmailFullMessage(res.data);
        out.write(`${JSON.stringify({
          id: row.id, threadId: res.data.threadId, queries: row.queries,
          date: res.data.internalDate ? new Date(Number(res.data.internalDate)).toISOString() : null,
          labels: res.data.labelIds || [],
          from: p.headerMap.from || '', to: p.headerMap.to || '', cc: p.headerMap.cc || '',
          subject: p.title, text: p.textContent,
          attachments: (p.attachments || []).map((a) => ({ filename: a.filename, mimeType: a.mimeType, size: a.size, attachmentId: a.attachmentId || a.body?.attachmentId || null })),
          docLinks: docLinks(p.textContent, p.htmlContent),
        })}\n`);
      } catch (e) {
        console.error(`skip ${row.id}: ${e.message}`);
      }
      if (++n % 100 === 0) console.log(`${n} fetched`);
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  await new Promise((r) => out.end(r));
  console.log('done');
}

const EXTRA = {
  foodWords: 'from:me (braised OR roasted OR seared OR pickled OR "house-made" OR "house made" OR "served with" OR "with a side of" OR crostini OR tart OR risotto OR "pork belly" OR "duck breast") -in:drafts',
  menuSubject: '(subject:menu OR subject:dinner OR subject:event OR subject:catering OR subject:party) from:me',
  menuInbound: 'to:me (menu OR "your menu" OR "the menu") ("per person" OR guests OR dinner)',
};

async function stageListExtra(gmail) {
  const have = new Set(JSON.parse(fs.readFileSync(path.join(OUT, 'ids.json'), 'utf8')).map((r) => r.id));
  const fresh = {};
  const counts = {};
  for (const [name, q] of Object.entries(EXTRA)) {
    const rows = await listIds(gmail, q, 2000);
    counts[name] = { total: rows.length, new: rows.filter((r) => !have.has(r.id)).length };
    for (const row of rows) if (!have.has(row.id)) (fresh[row.id] ||= { id: row.id, threadId: row.threadId, queries: [] }).queries.push(name);
  }
  fs.writeFileSync(path.join(OUT, 'ids-extra.json'), JSON.stringify(Object.values(fresh)));
  console.log(JSON.stringify({ counts, unique: Object.keys(fresh).length }, null, 2));
}

function* partsOf(part) {
  if (!part) return;
  yield part;
  for (const c of part.parts || []) yield* partsOf(c);
}

async function stageThreads(gmail) {
  const ids = JSON.parse(fs.readFileSync(path.join(OUT, 'thread-ids.json'), 'utf8'));
  fs.mkdirSync(path.join(OUT, 'att'), { recursive: true });
  const file = path.join(OUT, 'threads.jsonl');
  const done = new Set(fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l).threadId) : []);
  const todo = ids.filter((t) => !done.has(t));
  console.log(`threads ${todo.length} of ${ids.length}`);
  const out = fs.createWriteStream(file, { flags: 'a' });
  const worker = async () => {
    while (todo.length) {
      const threadId = todo.shift();
      try {
        const t = await gmail.users.threads.get({ userId: 'me', id: threadId, format: 'full' });
        const messages = [];
        for (const message of t.data.messages || []) {
          const p = parseGmailFullMessage(message);
          const saved = [];
          for (const part of partsOf(message.payload)) {
            const name = part.filename || '';
            if (!name || !part.body?.attachmentId || !/\.(pdf|docx|txt|csv|xlsx)$/i.test(name) || (part.body.size || 0) > 8e6) continue;
            const dest = `${message.id}__${name.replace(/[^\w.\- ]/g, '_')}`;
            const full = path.join(OUT, 'att', dest);
            if (!fs.existsSync(full)) {
              const a = await gmail.users.messages.attachments.get({ userId: 'me', messageId: message.id, id: part.body.attachmentId });
              fs.writeFileSync(full, Buffer.from(a.data.data, 'base64'));
            }
            saved.push(dest);
          }
          messages.push({
            id: message.id, date: message.internalDate ? new Date(Number(message.internalDate)).toISOString() : null,
            labels: message.labelIds || [], from: p.headerMap.from || '', to: p.headerMap.to || '',
            subject: p.title, text: p.textContent, savedAttachments: saved,
            otherAttachments: (p.attachments || []).map((a) => a.filename).filter(Boolean),
            docLinks: docLinks(p.textContent, p.htmlContent),
          });
        }
        out.write(`${JSON.stringify({ threadId, messages })}\n`);
      } catch (e) {
        console.error(`skip ${threadId}: ${e.message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  await new Promise((r) => out.end(r));
  console.log('done');
}

async function stageListAllSent(gmail) {
  const have = new Set(JSON.parse(fs.readFileSync(path.join(OUT, 'ids.json'), 'utf8')).map((r) => r.id));
  const rows = await listIds(gmail, 'from:me -in:chats', 20000);
  const fresh = rows.filter((r) => !have.has(r.id)).map((r) => ({ id: r.id, threadId: r.threadId, queries: ['allSent'] }));
  fs.writeFileSync(path.join(OUT, 'ids-allsent.json'), JSON.stringify(fresh));
  console.log(JSON.stringify({ sentTotal: rows.length, notYetFetched: fresh.length }));
}

(async () => {
  const cmd = process.argv[2];
  const gmail = await getAuthorizedGmailClient();
  if (cmd === 'list') await stageList(gmail);
  else if (cmd === 'fetch') await stageFetch(gmail);
  else if (cmd === 'list-extra') await stageListExtra(gmail);
  else if (cmd === 'list-allsent') await stageListAllSent(gmail);
  else if (cmd === 'threads') await stageThreads(gmail);
  else console.log('usage: recover-gmail-menus.cjs list|fetch');
})().catch((e) => { console.error(`ERROR: ${e.message}`); process.exitCode = 1; }).finally(() => prisma?.$disconnect?.());
