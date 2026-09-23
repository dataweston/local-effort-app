#!/usr/bin/env node
/**
 * Transaction classifier -- proposes a Local Budget classification for bank rows
 * that don't have one, using deterministic rules first and TypeSafe (Jev) only
 * for the rows that genuinely need judgment.
 *
 *   node scripts/classify-transactions.cjs eval [--n 150] [--batch 20]
 *   node scripts/classify-transactions.cjs run  [--out <path>]
 *   node scripts/classify-transactions.cjs plan            (no API calls)
 *
 * flags:
 *   --input   rows JSON; default artifacts/financial-snapshot-v2/diagnostic.json
 *   --n       eval sample size (labeled EXPENSE rows)       default 150
 *   --batch   transactions per API request                  default 20
 *   --model   TypeSafe model                                default jev-latest
 *   --seed    eval sampling seed                            default 7
 *
 * Needs TYPESAFE_API_KEY in .env for `eval` and `run`. `plan` runs without one.
 *
 * This script NEVER writes to Local Budget. It emits proposals to an artifact
 * file for a human to accept; miscategorized books are worse than empty ones.
 *
 * Why the work is split the way it is -- measured on the 632 labeled rows in the
 * v2 snapshot, not assumed:
 *   type=TRANSFER  -> classification TRANSFER in 147/147 rows. Pure code rule.
 *   type=INCOME    -> INCOME in 91%; the rest are TRANSFER/REIMBURSEMENT.
 *   type=EXPENSE   -> genuinely 4-way (OPERATING 41 / COGS 28 / PERSONAL 22 / TRANSFER 9).
 * So the model is asked about EXPENSE and INCOME rows only, and only after an
 * exact-merchant lookup has taken the rows we already have a precedent for.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { systemOne } = require('./lib/typesafe.cjs');

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? fallback : process.argv[i + 1];
};

const DEFAULT_INPUT = 'artifacts/financial-snapshot-v2/diagnostic.json';

/* ------------------------------------------------------------------ labels */

/**
 * The classification set, taken from what Local Budget actually uses in the
 * ledger rather than invented here. Rubrics name real merchants from the
 * labeled rows, because the hard calls in this book are business-specific: a
 * warehouse club run is COGS, a coffee is PERSONAL, and both are "food".
 */
const EXPENSE_CRITERIA = {
  COGS:
    'Ingredients, food, and consumable supplies bought to produce what the business sells. '
    + 'Includes sourcing runs at grocery, warehouse, and general retailers (Costco, Walmart, Whole Foods, Amazon, Target) '
    + 'when the goods are inputs to the food business; food co-ops and wholesale suppliers '
    + '(Eastside Food Cooperative, The Good Acre, Co-op Partners Warehouse, Clancey\'s, flour and cheese suppliers); '
    + 'and packaging or serving supplies consumed per order.',
  OPERATING:
    'Business costs that are not ingredients: fuel for delivery, catering, and market runs (Holiday, Kwik Trip, Speedway, Murphy); '
    + 'software, apps, and subscriptions; domains and web services (GoDaddy); lead generation and advertising (Thumbtack); '
    + 'licensing, permits, exam and county fees (Ramsey County, city licensing); printing and shipping (FedEx Office); '
    + 'vehicle purchase, repair, and insurance; professional education; bank and card service fees.',
  PERSONAL:
    'A founder\'s own spending that happens to clear an account the business also uses. '
    + 'Prepared food and drink bought to consume rather than to resell -- coffee shops, cafes, fast food, restaurants '
    + '(Starbucks, Chipotle, Shake Shack, Dogwood Coffee, Bogart\'s) -- personal retail, travel and hotels, '
    + 'and person-to-person payments that are not paying a supplier. '
    + 'Buying a coffee or a meal for yourself is PERSONAL even at a cafe or food business the company also does business with.',
  TRANSFER:
    'Money moved between accounts the owners control, or a payment toward a credit card balance, '
    + 'rather than the purchase of any good or service (transfers to Square, Mastercard or Chase card payments, Venmo top-ups).',
};

const INCOME_CRITERIA = {
  INCOME:
    'Revenue earned by the business: a customer, client, or venue paying for catering, an event, meal prep, '
    + 'pizza, wholesale, or an online order. Payments arriving under an individual person\'s name are '
    + 'usually customers paying an invoice.',
  TRANSFER:
    'Money arriving from another account the owners control, or a payout moving funds between '
    + 'the owners\' own accounts, rather than money earned from a customer.',
  REIMBURSEMENT:
    'Money coming back for an expense already paid -- a refund, a returned purchase, or someone repaying '
    + 'a cost the business fronted. Not new revenue.',
};

/**
 * The broader level to fall back to when the model is not confident enough to
 * name a specific classification. For this book the business/personal split is
 * the bit that actually matters at tax time, so it survives when the detail does not.
 */
const ROLLUP = {
  COGS: 'business_expense',
  OPERATING: 'business_expense',
  PERSONAL: 'personal',
  TRANSFER: 'money_movement',
  REIMBURSEMENT: 'money_movement',
  INCOME: 'revenue',
};

/** Context every question is answered against. */
const BUSINESS = {
  name: 'Local Effort',
  what_it_is:
    'A small worker-owned food business in the Minneapolis/St Paul area. Revenue lines are catering and '
    + 'private events, weekly meal prep subscriptions, pizza (pop-ups, distribution, and frozen direct-to-consumer), '
    + 'and small wholesale accounts.',
  bookkeeping_note:
    'The founders\' personal spending clears through some of the same bank accounts as the business, which is '
    + 'why PERSONAL is one of the classifications. Personal rows are treated as owner draws, not business costs.',
  known_confusions: [
    'Happy Monday is a cafe the business sells to AND where a founder buys personal coffee. A small coffee or '
      + 'pastry charge there is PERSONAL; an invoice-sized amount is business.',
    'Warehouse and big-box stores (Costco, Walmart, Amazon, Target) are used for ingredient sourcing, so they '
      + 'are often COGS rather than personal retail.',
    'Gas stations are almost always OPERATING -- fuel for delivery and catering runs.',
  ],
};

/* ------------------------------------------------------------------- rows */

const stripCard = (s) => String(s || '').replace(/^Debit Card ?[0-9A-Z]{0,8}/, '').trim();
const merchantOf = (r) => stripCard(r.merchantName) || stripCard(r.description) || '';
const normMerchant = (r) => merchantOf(r).toUpperCase();

function loadRows(inputPath) {
  const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const rows = Array.isArray(raw) ? raw : raw.carRows;
  if (!Array.isArray(rows)) throw new Error(`No transaction rows found in ${inputPath}`);
  return rows;
}

/** The fields the model is allowed to see. Internal ids are not useful to it. */
const toState = (r, i) => ({
  ref: `t${i}`,
  merchant: merchantOf(r) || '(no merchant name)',
  description: stripCard(r.description) || null,
  amount_usd: Number(r.amount),
  direction: r.type === 'INCOME' ? 'money in' : 'money out',
  date: String(r.date).slice(0, 10),
  account: r.account && r.account.name,
  existing_category: r.category ? r.category.name : null,
});

/* -------------------------------------------------------------- code rules */

/**
 * Build merchant -> classification from rows we already trust, keeping only
 * merchants whose label is unanimous. A merchant that has been booked two ways
 * (Venmo shows up as both TRANSFER and PERSONAL) is exactly the case that needs
 * a judgment, so it is deliberately left for the model.
 */
function buildPrecedent(labeledRows) {
  const seen = new Map();
  for (const r of labeledRows) {
    const k = normMerchant(r);
    if (!k) continue;
    if (!seen.has(k)) seen.set(k, new Set());
    seen.get(k).add(r.classification);
  }
  const map = new Map();
  for (const [k, set] of seen) if (set.size === 1) map.set(k, [...set][0]);
  return map;
}

/* --------------------------------------------------------------- questions */

function buildRequest(batch, criteria, subject) {
  const questions = {};
  batch.forEach((row, i) => {
    questions[`t${i}`] = {
      type: 'choice',
      instructions:
        `Classify the ${subject} at \`transactions[${i}]\` (ref "t${i}", merchant "${row.merchant}", `
        + `$${row.amount_usd} on ${row.date}) for ${BUSINESS.name}'s books. `
        + 'Decide what the money was actually for, using the merchant name, the amount, and the account it cleared.',
      criteria,
    };
  });
  return { state: { business: BUSINESS, transactions: batch }, questions };
}

const chunk = (arr, n) => {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

/** One request per batch; every question in a batch is independent and runs in parallel. */
async function classifyBatched(rows, criteria, subject, { batchSize, model }) {
  const results = [];
  const usage = { input_tokens: 0, output_tokens: 0, requests: 0 };

  for (const [bi, group] of chunk(rows, batchSize).entries()) {
    const states = group.map(toState);
    const { state, questions } = buildRequest(states, criteria, subject);
    process.stderr.write(`  request ${bi + 1} (${group.length} rows)...`);
    const res = await systemOne({ state, questions, model });
    group.forEach((row, i) => {
      const a = res.answers[`t${i}`];
      results.push({
        row,
        choice: a.choice,
        confidence: a.confidence,
        probabilities: a.probabilities,
      });
    });
    usage.input_tokens += res.usage.input_tokens;
    usage.output_tokens += res.usage.output_tokens;
    usage.requests += 1;
    process.stderr.write(' ok\n');
  }
  return { results, usage };
}

/* -------------------------------------------------------------------- eval */

const mulberry32 = (seed) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

function sample(arr, n, seed) {
  const rand = mulberry32(seed);
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

/**
 * Accuracy on rows we already have a human label for.
 *
 * Deliberately model-only and EXPENSE-only: the code rules score ~100% by
 * construction, so including them would inflate the number into meaninglessness.
 * The precedent lookup is not applied here either -- it is built from labeled
 * rows, so using it to predict labeled rows would leak the answer.
 */
async function runEval(rows, opts) {
  const labeled = rows.filter((r) => r.classification && r.type === 'EXPENSE');
  const picked = sample(labeled, Math.min(opts.n, labeled.length), opts.seed);
  console.log(`Eval: ${picked.length} labeled EXPENSE rows (of ${labeled.length}), model=${opts.model}\n`);

  const { results, usage } = await classifyBatched(picked, EXPENSE_CRITERIA, 'transaction', opts);

  const BANDS = [
    ['>= 0.90', (c) => c >= 0.9],
    ['0.75-0.90', (c) => c >= 0.75 && c < 0.9],
    ['0.50-0.75', (c) => c >= 0.5 && c < 0.75],
    ['< 0.50', (c) => c < 0.5],
  ];

  const correct = results.filter((r) => r.choice === r.row.classification).length;
  console.log(`\nExact accuracy: ${correct}/${results.length} (${(100 * correct / results.length).toFixed(1)}%)\n`);

  console.log('By confidence band:');
  console.log('  band        n    exact    rolled-up');
  for (const [label, test] of BANDS) {
    const band = results.filter((r) => test(r.confidence));
    if (!band.length) { console.log(`  ${label.padEnd(11)} 0`); continue; }
    const ex = band.filter((r) => r.choice === r.row.classification).length;
    const ru = band.filter((r) => ROLLUP[r.choice] === ROLLUP[r.row.classification]).length;
    console.log(
      `  ${label.padEnd(11)} ${String(band.length).padEnd(4)} `
      + `${(100 * ex / band.length).toFixed(0).padStart(4)}%    ${(100 * ru / band.length).toFixed(0).padStart(4)}%`,
    );
  }

  const confusion = {};
  for (const r of results) {
    if (r.choice === r.row.classification) continue;
    const k = `${r.row.classification} -> ${r.choice}`;
    confusion[k] = (confusion[k] || 0) + 1;
  }
  const misses = Object.entries(confusion).sort((a, b) => b[1] - a[1]);
  if (misses.length) {
    console.log('\nMisses (actual -> predicted):');
    for (const [k, n] of misses.slice(0, 12)) console.log(`  ${String(n).padStart(3)}  ${k}`);
    console.log('\nWorst calls (confidently wrong):');
    for (const r of results.filter((x) => x.choice !== x.row.classification)
      .sort((a, b) => b.confidence - a.confidence).slice(0, 6)) {
      console.log(`  conf ${r.confidence.toFixed(2)}  "${merchantOf(r.row)}" $${r.row.amount}  `
        + `said ${r.choice}, book says ${r.row.classification}`);
    }
  }
  console.log(`\nUsage: ${usage.requests} requests, ${usage.input_tokens} in / ${usage.output_tokens} out tokens`);
  console.log('Pick thresholds from this table, not from the defaults in any cookbook.');
}

/* --------------------------------------------------------------------- run */

async function runClassify(rows, opts) {
  const labeled = rows.filter((r) => r.classification);
  const todo = rows.filter((r) => !r.classification);
  const precedent = buildPrecedent(labeled);

  const proposals = [];
  const needsModel = { EXPENSE: [], INCOME: [] };

  for (const r of todo) {
    if (r.type === 'TRANSFER') {
      proposals.push({ row: r, classification: 'TRANSFER', source: 'rule:type', confidence: 1 });
      continue;
    }
    const hit = precedent.get(normMerchant(r));
    if (hit) {
      proposals.push({ row: r, classification: hit, source: 'rule:merchant-precedent', confidence: 1 });
      continue;
    }
    if (needsModel[r.type]) needsModel[r.type].push(r);
    else proposals.push({ row: r, classification: null, source: 'unhandled-type', confidence: 0 });
  }

  console.log(`${todo.length} unclassified rows: `
    + `${proposals.length} by code rule, `
    + `${needsModel.EXPENSE.length + needsModel.INCOME.length} need a judgment\n`);

  const usage = { input_tokens: 0, output_tokens: 0, requests: 0 };
  for (const [type, criteria] of [['EXPENSE', EXPENSE_CRITERIA], ['INCOME', INCOME_CRITERIA]]) {
    if (!needsModel[type].length) continue;
    console.log(`${type}:`);
    const out = await classifyBatched(needsModel[type], criteria, 'transaction', opts);
    for (const r of out.results) {
      proposals.push({
        row: r.row,
        classification: r.choice,
        rollup: ROLLUP[r.choice],
        confidence: r.confidence,
        probabilities: r.probabilities,
        source: 'model',
      });
    }
    usage.input_tokens += out.usage.input_tokens;
    usage.output_tokens += out.usage.output_tokens;
    usage.requests += out.usage.requests;
  }

  const modelled = proposals.filter((p) => p.source === 'model');
  if (modelled.length) {
    console.log('\nProposals needing a look, least confident first:');
    for (const p of [...modelled].sort((a, b) => a.confidence - b.confidence)) {
      console.log(`  ${p.confidence.toFixed(2)}  ${String(p.classification).padEnd(13)} `
        + `${merchantOf(p.row).slice(0, 44).padEnd(44)} $${p.row.amount}`);
    }
  }

  const outPath = arg('--out', `artifacts/transaction-classification-${new Date().toISOString().slice(0, 10)}.json`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    model: opts.model,
    note: 'Proposals only. Nothing was written to Local Budget.',
    usage,
    proposals: proposals.map((p) => ({
      id: p.row.id,
      date: String(p.row.date).slice(0, 10),
      merchant: merchantOf(p.row),
      amount: p.row.amount,
      type: p.row.type,
      account: p.row.account && p.row.account.name,
      proposed: p.classification,
      rollup: p.rollup || ROLLUP[p.classification],
      confidence: p.confidence,
      source: p.source,
      probabilities: p.probabilities,
    })),
  }, null, 2));
  console.log(`\nWrote ${proposals.length} proposals -> ${outPath}`);
  if (usage.requests) console.log(`Usage: ${usage.requests} requests, ${usage.input_tokens} in / ${usage.output_tokens} out tokens`);
}

/* -------------------------------------------------------------------- plan */

/** Show the funnel and one real request body without spending anything. */
function runPlan(rows) {
  const labeled = rows.filter((r) => r.classification);
  const todo = rows.filter((r) => !r.classification);
  const precedent = buildPrecedent(labeled);

  let byRule = 0; const model = [];
  for (const r of todo) {
    if (r.type === 'TRANSFER' || precedent.has(normMerchant(r))) byRule += 1;
    else model.push(r);
  }

  console.log(`rows              ${rows.length}`);
  console.log(`  labeled         ${labeled.length}  (eval set)`);
  console.log(`  unclassified    ${todo.length}`);
  console.log(`    by code rule  ${byRule}`);
  console.log(`    need model    ${model.length}`);
  console.log(`precedent map     ${precedent.size} unanimous merchants\n`);

  const sampleRows = model.slice(0, 2).map(toState);
  const req = buildRequest(sampleRows, EXPENSE_CRITERIA, 'transaction');
  console.log('Example request body (truncated):');
  console.log(`${JSON.stringify({ model: 'jev-latest', ...req }, null, 2).slice(0, 1700)}\n...`);
}

/* -------------------------------------------------------------------- main */

async function main() {
  const cmd = process.argv[2];
  const opts = {
    n: Number(arg('--n', 150)),
    batchSize: Number(arg('--batch', 20)),
    model: arg('--model', 'jev-latest'),
    seed: Number(arg('--seed', 7)),
  };
  const rows = loadRows(arg('--input', DEFAULT_INPUT));

  if (cmd === 'eval') return runEval(rows, opts);
  if (cmd === 'run') return runClassify(rows, opts);
  if (cmd === 'plan') return runPlan(rows);

  console.log('usage: classify-transactions.cjs <eval|run|plan> [flags]  (see header)');
  return process.exit(1);
}

main().catch((err) => { console.error(`\n${err.message}`); process.exit(1); });
