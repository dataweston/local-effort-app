#!/usr/bin/env node
/*
Parse large email exports into structured JSON for KB ingest.
Usage:
  node tools/email-extract.js --input path/to/export.mbox --out out/emails.json \
    --include "yum@localeffortfood.com" --include "invoice" --include "proposal"
Supports .mbox, .eml, or a folder of .eml/.txt files.
*/
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const readline = require('readline');

function getArg(name, def = undefined) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return def;
  const v = process.argv[idx + 1];
  if (!v || v.startsWith('--')) return true;
  return v;
}
const INPUT = getArg('--input');
const OUT = getArg('--out', 'out/emails.json');
const INCLUDES = process.argv
  .map((v, i, a) => (v === '--include' ? a[i + 1] : null))
  .filter(Boolean)
  .map((s) => s.toLowerCase());

if (!INPUT) {
  console.error('Missing --input <fileOrFolder>');
  process.exit(1);
}

function ensureDir(filePath) {
  const dir = path.dirname(path.resolve(filePath));
  fs.mkdirSync(dir, { recursive: true });
}

function parseHeaders(lines) {
  const headers = {};
  let i = 0;
  for (; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) break;
    const m = line.match(/^(.*?):\s*(.*)$/);
    if (m) {
      const key = m[1].toLowerCase();
      const val = m[2];
      headers[key] = headers[key] ? `${headers[key]} ${val}` : val;
    }
  }
  return { headers, bodyLines: lines.slice(i + 1) };
}

function includeEmail(headers, body) {
  const hay = [
    headers.from, headers.to, headers.cc, headers.bcc, headers.subject, body
  ].filter(Boolean).join('\n').toLowerCase();
  if (INCLUDES.length === 0) return true;
  return INCLUDES.some((needle) => hay.includes(needle));
}

async function parseMbox(file) {
  const stream = fs.createReadStream(file, 'utf8');
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  const results = [];
  let buf = [];
  for await (const line of rl) {
    if (line.startsWith('From ')) {
      if (buf.length) {
        const { headers, bodyLines } = parseHeaders(buf);
        const body = bodyLines.join('\n');
        if (includeEmail(headers, body)) results.push({ headers, body });
      }
      buf = [];
    } else {
      buf.push(line);
    }
  }
  if (buf.length) {
    const { headers, bodyLines } = parseHeaders(buf);
    const body = bodyLines.join('\n');
    if (includeEmail(headers, body)) results.push({ headers, body });
  }
  return results;
}

function parseEml(file) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  const { headers, bodyLines } = parseHeaders(lines);
  const body = bodyLines.join('\n');
  return includeEmail(headers, body) ? [{ headers, body }] : [];
}

function walkFolder(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) out.push(...walkFolder(full));
    else if (/\.(eml|txt)$/i.test(name)) out.push(...parseEml(full));
  }
  return out;
}

async function main() {
  let results = [];
  const abs = path.resolve(INPUT);
  if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
    results = walkFolder(abs);
  } else if (/\.mbox$/i.test(abs)) {
    results = await parseMbox(abs);
  } else if (/\.eml$/i.test(abs)) {
    results = parseEml(abs);
  } else {
    console.error('Unsupported input type. Use a folder, .mbox, or .eml');
    process.exit(1);
  }

  // Consolidate: group by conversation (subject) and summarize basics
  const groups = new Map();
  for (const r of results) {
    const subj = (r.headers.subject || 'No Subject').trim();
    if (!groups.has(subj)) groups.set(subj, []);
    groups.get(subj).push(r);
  }
  const consolidated = [];
  for (const [subject, items] of groups.entries()) {
    items.sort((a, b) => String(a.headers.date || '').localeCompare(String(b.headers.date || '')));
    consolidated.push({
      subject,
      count: items.length,
      firstDate: items[0]?.headers?.date || null,
      lastDate: items[items.length - 1]?.headers?.date || null,
      participants: Array.from(new Set(items.flatMap((i) => [i.headers.from, i.headers.to, i.headers.cc].filter(Boolean)))).filter(Boolean),
      bodies: items.map((i) => i.body),
    });
  }

  ensureDir(OUT);
  fs.writeFileSync(OUT, JSON.stringify({ extractedAt: new Date().toISOString(), total: results.length, conversations: consolidated }, null, 2));
  console.log(`Wrote ${consolidated.length} conversations, ${results.length} emails -> ${OUT}`);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
