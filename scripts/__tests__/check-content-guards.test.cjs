'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { scanRetiredPhrases, scanPageSource, scanRepo } = require('../check-content-guards.cjs');

const cmsImport = "import data from '../store/data/generatedPizzaOnSmithPageData.json';\n";

test('flags retired Tuesday-pickup copy but not unrelated Tuesday mentions', () => {
  for (const text of [
    'Frozen pizza · Tuesday pickup',
    'Pickup on Tuesdays. Perfect frozen pizzas',
    'Pickup is on Tuesdays at 608 Smith Ave S',
    'Pizza on Smith is pickup only: Tuesdays at 608 Smith Ave S',
    'Your Tuesday stop.',
  ]) {
    assert.equal(scanRetiredPhrases('f.txt', text).length, 1, text);
  }
  for (const text of ['Tuesday, 2pm-4pm', 'Tabs fall off Tuesday', "dayOfWeek: 'Tuesday'"]) {
    assert.deepEqual(scanRetiredPhrases('f.js', text), [], text);
  }
});

test('reports the line of a retired phrase', () => {
  const [finding] = scanRetiredPhrases('llms.txt', 'ok\nok\n- Tuesday pickup at 608 Smith Ave S');
  assert.equal(finding.line, 3);
  assert.equal(finding.rule, 'retired-phrase');
});

test('flags hard-coded order windows and ISO gates in CMS-backed pages', () => {
  const page = `${cmsImport}const intro = 'Order October 13–28 for pickup the week of November 2.';
const open = Date.now() < Date.parse('2026-10-29T05:00:00Z');`;
  const rules = scanPageSource('src/pages/P.jsx', page).map((f) => `${f.rule}:${f.line}`);
  assert.deepEqual(rules, ['hard-coded-window:2', 'hard-coded-window:2', 'hard-coded-window:3']);
});

test('ignores dates in comments and pages that are not CMS-backed', () => {
  assert.deepEqual(scanPageSource('src/pages/P.jsx', `${cmsImport}// ran October 13–28 last year\nconst a = 1;`), []);
  assert.deepEqual(scanPageSource('src/pages/Blog.jsx', "const d = 'Order October 13–28';"), []);
});

test('flags a fallback forced over CMS values but allows CMS-wins merges', () => {
  const forced = `${cmsImport}const mergePage = (nextPage) => ({
  ...fallbackPage,
  ...(nextPage || {}),
  introduction: fallbackPage.introduction,
  notes: fallbackPage.notes,
});`;
  assert.deepEqual(scanPageSource('src/pages/P.jsx', forced).map((f) => f.rule), ['fallback-over-cms']);

  const cmsWins = `${cmsImport}const mergePage = (nextPage) => ({
  ...fallbackPage,
  ...(nextPage || {}),
  notes: nextPage?.notes?.length ? nextPage.notes : fallbackPage.notes,
});`;
  assert.deepEqual(scanPageSource('src/pages/P.jsx', cmsWins), []);
});

test('scanRepo walks only served roots, skips tests, and keeps documented exceptions quiet', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'content-guards-'));
  try {
    const write = (rel, text) => {
      const file = path.join(root, rel);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, text);
    };
    write('public/llms.txt', 'Tuesday pickup at 608 Smith Ave S');
    write('src/pages/Store.jsx', `${cmsImport}const x = 'Order October 13–28';`);
    write('src/pages/Store.test.jsx', 'Tuesday pickup');
    write('api-handlers/__tests__/a.test.js', 'Tuesday pickup');
    write('docs/old.md', 'Tuesday pickup');
    const found = scanRepo(root).map((f) => `${f.file}:${f.rule}`).sort();
    assert.deepEqual(found, ['public/llms.txt:retired-phrase', 'src/pages/Store.jsx:hard-coded-window']);

    write('src/pages/ChezGaragePage.jsx', `${cmsImport}const RUN = { startDate: '2026-07-30' };`);
    assert.ok(!scanRepo(root).some((f) => f.file === 'src/pages/ChezGaragePage.jsx'));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
