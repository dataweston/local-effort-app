const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, 'reports', 'local-budget-pnl');
const chromeCandidates = [
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function localBudgetConfig() {
  const baseUrl = process.env.LOCAL_BUDGET_API_URL;
  const token = process.env.LOCAL_BUDGET_API_TOKEN;
  if (!baseUrl || !token) {
    throw new Error('LOCAL_BUDGET_API_URL and LOCAL_BUDGET_API_TOKEN are required');
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ''), token };
}

async function fetchLocalBudget(pathname, params = {}) {
  const { baseUrl, token } = localBudgetConfig();
  const url = new URL(`${baseUrl}${pathname}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Local Budget API ${response.status} for ${url.pathname}: ${body.slice(0, 300)}`);
  }
  return response.json();
}

function money(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function pct(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getEffectiveClassification(tx) {
  if (tx.classification) return tx.classification;
  if (tx.category && tx.category.defaultClassification) return tx.category.defaultClassification;
  if (tx.type === 'INCOME') return 'INCOME';
  if (tx.type === 'TRANSFER') return 'TRANSFER';
  return 'PERSONAL';
}

function applyLine(report, amount, classification, categoryId, categoryName) {
  if (classification === 'TRANSFER') return;

  const absAmount = Math.abs(Number(amount || 0));
  report.totalTransactionsConsidered += 1;

  if (classification === 'INCOME') {
    report.revenue += absAmount;
  } else if (classification === 'REIMBURSEMENT') {
    report.reimbursementIncome += absAmount;
  } else if (classification === 'COGS') {
    report.cogs += absAmount;
  } else if (classification === 'OPERATING') {
    report.operatingExpenses += absAmount;
  } else if (classification === 'REIMBURSABLE') {
    report.reimbursableExpenses += absAmount;
  } else {
    report.personalExpenses += absAmount;
  }

  const key = `${categoryId || 'uncategorized'}::${classification}`;
  if (!report.byCategory.has(key)) {
    report.byCategory.set(key, {
      categoryId: categoryId || null,
      name: categoryName || 'Uncategorized',
      classification,
      amount: 0,
      transactionCount: 0,
    });
  }

  const row = report.byCategory.get(key);
  row.amount += absAmount;
  row.transactionCount += 1;

  if (!categoryId) {
    report.uncategorizedAmount += absAmount;
    report.uncategorizedCount += 1;
  }
}

function finalizeReport(report, startDate, endDate) {
  report.totalRevenue = report.revenue + report.reimbursementIncome;
  report.grossProfit = report.totalRevenue - report.cogs;
  report.grossMargin = report.totalRevenue > 0 ? (report.grossProfit / report.totalRevenue) * 100 : 0;
  report.operatingIncome =
    report.grossProfit - report.operatingExpenses - report.reimbursableExpenses;
  report.operatingMargin =
    report.totalRevenue > 0 ? (report.operatingIncome / report.totalRevenue) * 100 : 0;
  report.totalExpenses =
    report.cogs + report.operatingExpenses + report.personalExpenses + report.reimbursableExpenses;
  report.netIncome = report.totalRevenue - report.totalExpenses;
  report.netMargin = report.totalRevenue > 0 ? (report.netIncome / report.totalRevenue) * 100 : 0;
  report.totalPnlVolume = report.totalRevenue + report.totalExpenses;

  const daysInPeriod = Math.max(
    1,
    Math.ceil((endDate.getTime() - startDate.getTime() + 1) / 86_400_000)
  );
  const monthsInPeriod = Math.max(daysInPeriod / 30.4375, 1 / 30.4375);
  report.daysInPeriod = daysInPeriod;
  report.monthsInPeriod = monthsInPeriod;
  report.averageMonthlyRevenue = report.totalRevenue / monthsInPeriod;
  report.averageMonthlyExpenses = report.totalExpenses / monthsInPeriod;
  report.averageMonthlyNet = report.netIncome / monthsInPeriod;
  report.operatingBurnRate =
    (report.cogs + report.operatingExpenses + report.reimbursableExpenses) / monthsInPeriod;

  report.categoryRows = Array.from(report.byCategory.values())
    .map((row) => ({
      ...row,
      percentOfTotal: report.totalPnlVolume > 0 ? (row.amount / report.totalPnlVolume) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

function blankReport(year) {
  return {
    year,
    revenue: 0,
    cogs: 0,
    operatingExpenses: 0,
    personalExpenses: 0,
    reimbursableExpenses: 0,
    reimbursementIncome: 0,
    uncategorizedAmount: 0,
    uncategorizedCount: 0,
    totalTransactionsConsidered: 0,
    byCategory: new Map(),
    statusCounts: new Map(),
    totalTransactionsInPeriod: 0,
    transferLineCount: 0,
  };
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function formatDisplayDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function pathToFileUrl(filePath) {
  return `file:///${path.resolve(filePath).replace(/\\/g, '/')}`;
}

function findBrowserExecutable() {
  const found = chromeCandidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error('Could not find Chrome or Edge for PDF generation.');
  }
  return found;
}

function renderPdf(browserPath, htmlPath, pdfPath) {
  fs.rmSync(pdfPath, { force: true });
  const profileRoot = fs.existsSync('C:\\tmp') ? 'C:\\tmp' : (process.env.TEMP || outputDir);
  const profileDir = path.join(profileRoot, 'local-budget-pnl-chrome-profile');
  fs.rmSync(profileDir, { recursive: true, force: true });
  fs.mkdirSync(profileDir, { recursive: true });
  execFileSync(browserPath, [
    '--headless',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${profileDir}`,
    `--print-to-pdf=${pdfPath}`,
    pathToFileUrl(htmlPath),
  ]);
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF was not created: ${pdfPath}`);
  }
  fs.rmSync(profileDir, { recursive: true, force: true });
}

function renderRows(rows) {
  return rows
    .map(
      (row) => `
        <tr>
          <td><span class="pill ${escapeHtml(row.classification.toLowerCase())}">${escapeHtml(row.classification)}</span></td>
          <td>${escapeHtml(row.name)}</td>
          <td class="num">${row.transactionCount}</td>
          <td class="num">${pct(row.percentOfTotal)}</td>
          <td class="num">${money(row.amount)}</td>
        </tr>`
    )
    .join('');
}

function renderStatement(report, metadata) {
  const title = `Local Budget Profit & Loss Statement ${report.year}`;
  const statusText = Array.from(report.statusCounts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([status, count]) => `${status}: ${count}`)
    .join(', ');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: Letter; margin: 0.55in; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #17202a;
      font: 12px/1.45 Arial, Helvetica, sans-serif;
      background: #fff;
    }
    header {
      border-bottom: 2px solid #17202a;
      padding-bottom: 14px;
      margin-bottom: 18px;
    }
    h1 {
      margin: 0;
      font-size: 25px;
      letter-spacing: 0;
    }
    .subhead {
      margin-top: 5px;
      color: #4f5f6f;
      font-size: 12px;
    }
    .summary {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
      margin: 14px 0 18px;
    }
    .metric {
      border: 1px solid #d8dee6;
      padding: 9px 10px;
      min-height: 58px;
    }
    .metric .label {
      color: #5d6b7a;
      font-size: 10px;
      text-transform: uppercase;
    }
    .metric .value {
      margin-top: 3px;
      font-size: 17px;
      font-weight: 700;
    }
    .section {
      margin-top: 18px;
      break-inside: avoid;
    }
    h2 {
      font-size: 15px;
      margin: 0 0 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid #d8dee6;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 6px 7px;
      border-bottom: 1px solid #e6eaf0;
      vertical-align: top;
    }
    th {
      background: #f5f7fa;
      color: #3f4d5d;
      font-size: 10px;
      text-align: left;
      text-transform: uppercase;
    }
    .num {
      text-align: right;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }
    .statement td:first-child {
      width: 70%;
    }
    .subtotal td {
      font-weight: 700;
      border-top: 1px solid #aeb8c4;
      background: #fbfcfd;
    }
    .total td {
      font-weight: 800;
      border-top: 2px solid #17202a;
      border-bottom: 2px solid #17202a;
      background: #f5f7fa;
    }
    .negative { color: #a43d35; }
    .positive { color: #19764a; }
    .pill {
      display: inline-block;
      border: 1px solid #c8d0da;
      border-radius: 999px;
      padding: 1px 7px;
      font-size: 9px;
      font-weight: 700;
      color: #314052;
      background: #f7f9fb;
      white-space: nowrap;
    }
    .income, .reimbursement { color: #17633f; border-color: #afd8c5; background: #eef8f3; }
    .cogs { color: #86540a; border-color: #e7cb96; background: #fff8e8; }
    .operating, .reimbursable { color: #8a3d36; border-color: #e5b8b4; background: #fff2f1; }
    .personal { color: #4f4f72; border-color: #c9c9e8; background: #f6f6ff; }
    .notes {
      color: #4f5f6f;
      font-size: 10.5px;
    }
    .muted { color: #647386; }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(title)}</h1>
    <div class="subhead">Period: ${escapeHtml(formatDisplayDate(report.startDate))} through ${escapeHtml(formatDisplayDate(report.endDate))}</div>
    <div class="subhead">Generated: ${escapeHtml(metadata.generatedAt)} from Local Budget API at ${escapeHtml(metadata.apiUrl)}</div>
  </header>

  <section class="summary">
    <div class="metric"><div class="label">Total Revenue</div><div class="value">${money(report.totalRevenue)}</div></div>
    <div class="metric"><div class="label">Gross Profit</div><div class="value">${money(report.grossProfit)}</div></div>
    <div class="metric"><div class="label">Net Income</div><div class="value ${report.netIncome < 0 ? 'negative' : 'positive'}">${money(report.netIncome)}</div></div>
    <div class="metric"><div class="label">Gross Margin</div><div class="value">${pct(report.grossMargin)}</div></div>
    <div class="metric"><div class="label">Operating Margin</div><div class="value">${pct(report.operatingMargin)}</div></div>
    <div class="metric"><div class="label">Net Margin</div><div class="value">${pct(report.netMargin)}</div></div>
  </section>

  <section class="section">
    <h2>Statement</h2>
    <table class="statement">
      <tbody>
        <tr><td>Revenue</td><td class="num">${money(report.revenue)}</td></tr>
        <tr><td>Reimbursement Income</td><td class="num">${money(report.reimbursementIncome)}</td></tr>
        <tr class="subtotal"><td>Total Revenue</td><td class="num">${money(report.totalRevenue)}</td></tr>
        <tr><td>Cost of Goods Sold</td><td class="num">(${money(report.cogs)})</td></tr>
        <tr class="subtotal"><td>Gross Profit</td><td class="num">${money(report.grossProfit)}</td></tr>
        <tr><td>Operating Expenses</td><td class="num">(${money(report.operatingExpenses)})</td></tr>
        <tr><td>Reimbursable Expenses</td><td class="num">(${money(report.reimbursableExpenses)})</td></tr>
        <tr class="subtotal"><td>Operating Income</td><td class="num">${money(report.operatingIncome)}</td></tr>
        <tr><td>Personal Expenses</td><td class="num">(${money(report.personalExpenses)})</td></tr>
        <tr class="total"><td>Net Income</td><td class="num">${money(report.netIncome)}</td></tr>
      </tbody>
    </table>
  </section>

  <section class="section">
    <h2>Category Detail</h2>
    <table>
      <thead>
        <tr>
          <th>Class</th>
          <th>Category</th>
          <th class="num">Lines</th>
          <th class="num">Share</th>
          <th class="num">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${renderRows(report.categoryRows)}
      </tbody>
    </table>
  </section>

  <section class="section notes">
    <h2>Basis And Notes</h2>
    <p>
      This statement uses the Local Budget app's profit/loss method: explicit transaction
      classification first, then category default classification, then transaction type fallback.
      Transfers are excluded from P&L lines.
    </p>
    <p>
      Transaction records in period: ${report.totalTransactionsInPeriod}. P&L lines considered:
      ${report.totalTransactionsConsidered}. Transfer lines excluded: ${report.transferLineCount}.
      Statuses present: ${escapeHtml(statusText || 'none')}.
    </p>
    <p>
      Uncategorized lines: ${report.uncategorizedCount}, totaling ${money(report.uncategorizedAmount)}.
      Average monthly net: ${money(report.averageMonthlyNet)}.
    </p>
    <p class="muted">
      Available database range: ${escapeHtml(metadata.minDate || 'n/a')} through ${escapeHtml(metadata.maxDate || 'n/a')}.
    </p>
  </section>
</body>
</html>`;
}

async function buildReport(year) {
  const { report: apiReport } = await fetchLocalBudget('/api/integration/v1/pnl', { year });
  const startDate = new Date(apiReport.startDate);
  const endDate = new Date(apiReport.endDate);
  const report = {
    ...blankReport(year),
    ...apiReport,
    startDate,
    endDate,
    totalTransactionsConsidered: apiReport.totalLinesConsidered || 0,
    categoryRows: (apiReport.byCategory || []).map((row) => ({ ...row })),
    statusCounts: new Map(),
  };

  report.operatingIncome =
    apiReport.netBusinessIncome ??
    report.totalRevenue - report.cogs - report.operatingExpenses - report.reimbursableExpenses;
  report.totalExpenses =
    report.cogs + report.operatingExpenses + report.personalExpenses + report.reimbursableExpenses;
  report.netIncome = report.totalRevenue - report.totalExpenses;
  report.operatingMargin = report.totalRevenue > 0 ? (report.operatingIncome / report.totalRevenue) * 100 : 0;
  report.netMargin = report.totalRevenue > 0 ? (report.netIncome / report.totalRevenue) * 100 : 0;
  report.totalPnlVolume = report.totalRevenue + report.totalExpenses;

  const daysInPeriod = Math.max(
    1,
    Math.ceil((endDate.getTime() - startDate.getTime() + 1) / 86_400_000)
  );
  const monthsInPeriod = Math.max(daysInPeriod / 30.4375, 1 / 30.4375);
  report.daysInPeriod = daysInPeriod;
  report.monthsInPeriod = monthsInPeriod;
  report.averageMonthlyRevenue = report.totalRevenue / monthsInPeriod;
  report.averageMonthlyExpenses = report.totalExpenses / monthsInPeriod;
  report.averageMonthlyNet = report.netIncome / monthsInPeriod;
  report.operatingBurnRate =
    (report.cogs + report.operatingExpenses + report.reimbursableExpenses) / monthsInPeriod;

  report.categoryRows = report.categoryRows
    .map((row) => ({
      ...row,
      percentOfTotal: report.totalPnlVolume > 0 ? (row.amount / report.totalPnlVolume) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
  return report;
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  loadEnv(path.join(rootDir, '.env'));
  const browserPath = findBrowserExecutable();

  const metadata = {
    generatedAt: new Date().toISOString(),
    apiUrl: localBudgetConfig().baseUrl,
    minDate: null,
    maxDate: null,
    counts: [],
  };

  const outputs = [];

  for (const year of [2025, 2026]) {
    const report = await buildReport(year);
    const html = renderStatement(report, metadata);
    const htmlPath = path.join(outputDir, `local-budget-profit-loss-${year}.html`);
    const pdfPath = path.join(outputDir, `local-budget-profit-loss-${year}.pdf`);
    fs.writeFileSync(htmlPath, html, 'utf8');
    renderPdf(browserPath, htmlPath, pdfPath);
    outputs.push({
      year,
      pdfPath,
      htmlPath,
      totalRevenue: report.totalRevenue,
      totalExpenses: report.totalExpenses,
      netIncome: report.netIncome,
      transactions: report.totalTransactionsInPeriod,
      pnlLines: report.totalTransactionsConsidered,
      statuses: Object.fromEntries(report.statusCounts),
    });
  }
  console.log(JSON.stringify({ metadata, browserPath, outputs }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
