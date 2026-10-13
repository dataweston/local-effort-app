#!/usr/bin/env node
'use strict';

// Content guards: cheap, deterministic checks for the failure class behind the
// 2026-10-13 Pizza on Smith update (see AGENTS.md "Content ownership").
//   1. Retired customer-facing phrases must not survive anywhere public/served.
//   2. Public page JSX must not hard-code date windows next to CMS-backed fields,
//      and must not force fallback values over CMS values.
// Run: pnpm check:content   (exit 1 on any finding)

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const PHRASE_ROOTS = ['src', 'public', 'api-handlers', 'backend'];
const PAGE_ROOT = 'src/pages';
const TEXT_EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.cjs', '.mjs', '.json', '.txt', '.md', '.html', '.xml']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '__tests__']);

// Owner: Local Effort owner. As of 2026-10-13. Review by 2026-11-13. Add a phrase when
// the owner retires a customer-facing fact; remove it when the phrase is legitimate again.
const RETIRED_PHRASES = [
  {
    name: 'Pizza on Smith Tuesday pickup',
    reason: 'Pizza on Smith fulfillment is owned by the CMS drop window, not "Tuesday pickup".',
    pattern: /tuesdays?\s+pick-?up|pick-?\s?up\s+(?:is\s+|only:?\s+)?(?:on\s+)?tuesdays?|your tuesday stop|tuesdays?\s+at\s+608/i,
  },
];

// Known, owner-visible exceptions. Each needs a reason; remove the entry when fixed.
// Owner: Local Effort owner. As of 2026-10-13. Review by 2026-11-13.
const KNOWN_EXCEPTIONS = [
  {
    file: 'src/pages/ChezGaragePage.jsx',
    rule: 'hard-coded-window',
    reason: 'Chez Garage run dates are a single RUN constant; the Sanity page has no date fields yet. Move to the CMS when the owner wants to edit them.',
  },
];

const MONTH = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?';
const DATE_WINDOW_LITERALS = [
  {
    name: 'month-day range',
    pattern: new RegExp(`\\b${MONTH}\\s+\\d{1,2}\\s*(?:–|—|-|to)\\s*\\d{1,2}\\b`, 'i'),
  },
  {
    name: '"week of <date>"',
    pattern: new RegExp(`\\bweek of ${MONTH}\\s+\\d{1,2}\\b`, 'i'),
  },
  {
    name: 'ISO date/time literal',
    pattern: /['"`]20\d\d-\d\d-\d\d(?:T[\d:.]+(?:Z|[+-]\d\d:\d\d))?['"`]/,
  },
];

// A page is CMS-backed when it imports generated CMS data or talks to Sanity.
const CMS_BACKED = /generated\w*PageData|@sanity\/|sanityClient|sanityImageUrl|fetchSanity|cdn\.sanity\.io/i;
// `...(cms || {}),` immediately followed by `field: fallbackX.field,` overrides the CMS.
const FORCED_FALLBACK = /\.\.\.\s*\(?\s*[\w.?]+\s*\|\|\s*\{\}\s*\)?\s*,(?:[ \t]*\r?\n[ \t]*[\w'"-]+:[^\n]*,)*?[ \t]*\r?\n[ \t]*\w+:\s*fallback\w*\.\w+\s*,/;

const lineOf = (text, index) => text.slice(0, index).split('\n').length;
const ignoreComments = (text) => text.replace(/\/\*[\s\S]*?\*\/|(^|[^:])\/\/[^\n]*/g, (m, p) => (p || '') + m.slice((p || '').length).replace(/[^\n]/g, ' '));

function scanRetiredPhrases(file, text) {
  const findings = [];
  for (const { name, reason, pattern } of RETIRED_PHRASES) {
    const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
    for (const match of text.matchAll(new RegExp(pattern.source, flags))) {
      findings.push({ file, line: lineOf(text, match.index), rule: 'retired-phrase', message: `"${match[0]}" — ${name}: ${reason}` });
    }
  }
  return findings;
}

function scanPageSource(file, text) {
  if (!CMS_BACKED.test(text)) return [];
  const code = ignoreComments(text);
  const findings = [];
  for (const { name, pattern } of DATE_WINDOW_LITERALS) {
    const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
    for (const match of code.matchAll(new RegExp(pattern.source, flags))) {
      findings.push({
        file,
        line: lineOf(code, match.index),
        rule: 'hard-coded-window',
        message: `${name} ${match[0]} in a CMS-backed page; dates/windows belong in the CMS (generate fallbacks from it).`,
      });
    }
  }
  const forced = FORCED_FALLBACK.exec(code);
  if (forced) {
    findings.push({
      file,
      line: lineOf(code, forced.index),
      rule: 'fallback-over-cms',
      message: 'Fallback value assigned after the CMS spread; CMS values must win.',
    });
  }
  return findings;
}

function* walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) yield* walk(path.join(dir, entry.name));
    } else if (TEXT_EXT.has(path.extname(entry.name)) && !/\.test\.\w+$/.test(entry.name)) {
      yield path.join(dir, entry.name);
    }
  }
}

function scanRepo(root = ROOT) {
  const findings = [];
  const rel = (file) => path.relative(root, file).split(path.sep).join('/');
  for (const dir of PHRASE_ROOTS) {
    for (const file of walk(path.join(root, dir))) {
      findings.push(...scanRetiredPhrases(rel(file), fs.readFileSync(file, 'utf8')));
    }
  }
  for (const file of walk(path.join(root, PAGE_ROOT))) {
    if (/\.(jsx|tsx)$/.test(file)) findings.push(...scanPageSource(rel(file), fs.readFileSync(file, 'utf8')));
  }
  return findings.filter((f) => !KNOWN_EXCEPTIONS.some((e) => e.file === f.file && e.rule === f.rule));
}

module.exports = { RETIRED_PHRASES, KNOWN_EXCEPTIONS, scanRetiredPhrases, scanPageSource, scanRepo };

if (require.main === module) {
  const findings = scanRepo();
  for (const f of findings) console.error(`${f.file}:${f.line} [${f.rule}] ${f.message}`);
  if (findings.length) {
    console.error(`\n${findings.length} content guard finding(s). See AGENTS.md "Content ownership".`);
    process.exit(1);
  }
  console.log('Content guards passed.');
}
