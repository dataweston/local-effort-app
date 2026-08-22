const fs = require('fs');
const path = require('path');

const inputPath = path.resolve('artifacts/financial-snapshot/calculations.json');
const outputPath = path.resolve('artifacts/financial-snapshot/artifact.json');
const model = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const sourceSql = fs.readFileSync(path.resolve('artifacts/financial-snapshot/source-query.sql'), 'utf8');

const dollars = (cents) => Number(cents || 0) / 100;
const sum = (rows, field) => rows.reduce((total, row) => total + Number(row[field] || 0), 0);
const round = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

function aggregate(rows, label) {
  const grossRevenue = dollars(sum(rows, 'revenueCents'));
  const refunds = dollars(sum(rows, 'refundCents'));
  const netRevenue = grossRevenue - refunds;
  const inventory = dollars(sum(rows, 'inventoryCents'));
  const labor = dollars(sum(rows, 'laborCents'));
  const operatingInclDebt = dollars(sum(rows, 'operatingCents'));
  const unclassified = dollars(sum(rows, 'unclassifiedCents'));
  const debtService = dollars(sum(rows, 'debtServiceCents'));
  const founderDraws = dollars(sum(rows, 'founderDrawsCents'));
  const operatingExDebt = operatingInclDebt - debtService;
  const cashCfads = netRevenue - inventory - labor - operatingExDebt - unclassified;
  const freeCashAfterDebt = cashCfads - debtService;
  return {
    label,
    months: rows.length,
    grossRevenue: round(grossRevenue),
    refunds: round(refunds),
    netRevenue: round(netRevenue),
    inventory: round(inventory),
    labor: round(labor),
    operatingExDebt: round(operatingExDebt),
    unclassified: round(unclassified),
    founderDraws: round(founderDraws),
    debtService: round(debtService),
    cashCfads: round(cashCfads),
    cashDscr: debtService ? round(cashCfads / debtService) : null,
    freeCashAfterDebt: round(freeCashAfterDebt),
    cfadsMargin: netRevenue ? cashCfads / netRevenue : null,
    inventoryPurchaseRate: netRevenue ? inventory / netRevenue : null,
    revenuePerInventoryDollar: inventory ? round(netRevenue / inventory) : null,
    revenuePerPaidLaborDollar: labor ? round(netRevenue / labor) : null,
  };
}

const rows18 = model.months;
const rowsTtm = model.months.filter((row) => row.month >= '2025-08');
const actual18 = aggregate(rows18, '18-month posted actuals');
const actualTtm = aggregate(rowsTtm, 'Trailing 12 months');

const founderAnnualPolicy = 90000;
const founderPolicyAprJul = 30000;
const fullyLoadedCfads = round(actualTtm.cashCfads - founderAnnualPolicy);
const fullyLoadedFreeCash = round(fullyLoadedCfads - actualTtm.debtService);
const fullyLoadedDscr = actualTtm.debtService ? round(fullyLoadedCfads / actualTtm.debtService) : null;
const cashAfterActualDraws = round(actualTtm.freeCashAfterDebt - actualTtm.founderDraws);
const observedMonthlyBurnAfterDraws = round(Math.max(0, -cashAfterActualDraws / 12));
const resolvedLiquid = dollars(model.cashPosition.totalResolvedLiquidCents);
const providerAvailable = dollars(model.cashPosition.accounts.reduce(
  (total, account) => total + Number(account.availableBalanceCents || 0),
  0
));
const providerCurrent = dollars(model.cashPosition.accounts.reduce(
  (total, account) => total + Number(account.currentBalanceCents || 0),
  0
));
const runwayLower = observedMonthlyBurnAfterDraws ? resolvedLiquid / observedMonthlyBurnAfterDraws : null;
const runwayProvider = observedMonthlyBurnAfterDraws ? providerAvailable / observedMonthlyBurnAfterDraws : null;
const incompleteMonths = model.months.filter((row) => !row.isCompleteMonth).map((row) => row.month);

const monthRows = model.months.map((row) => {
  const netRevenue = dollars(row.revenueCents - row.refundCents);
  const debtService = dollars(row.debtServiceCents);
  const inventory = dollars(row.inventoryCents);
  const labor = dollars(row.laborCents);
  const operatingExDebt = dollars(row.operatingCents - row.debtServiceCents);
  const unclassified = dollars(row.unclassifiedCents);
  const cashOperatingCost = inventory + labor + operatingExDebt + unclassified;
  return {
    month: row.month,
    monthDate: `${row.month}-01`,
    completeness: row.isCompleteMonth ? 'Complete' : `Incomplete (${row.pendingTransactionCount} pending)`,
    netRevenue: round(netRevenue),
    inventory: round(inventory),
    labor: round(labor),
    operatingExDebt: round(operatingExDebt),
    unclassified: round(unclassified),
    debtService: round(debtService),
    cashCfads: round(netRevenue - cashOperatingCost),
    cashOperatingCost: round(cashOperatingCost),
    founderDraws: round(dollars(row.founderDrawsCents)),
    pending: row.pendingTransactionCount,
    splitMismatches: row.splitMismatchCount,
    transactionCount: row.transactionCount,
  };
});

const monthlyTrend = monthRows.flatMap((row) => [
  { ...row, monthDate: `${row.month}-01`, series: 'Net revenue', amount: row.netRevenue },
  { ...row, monthDate: `${row.month}-01`, series: 'Cash operating cost', amount: round(row.inventory + row.labor + row.operatingExDebt + row.unclassified) },
]);
const monthRowsTtm = monthRows.filter((row) => row.month >= '2025-08');

const aggregateBridge = [
  { metric: 'Net operating revenue', period18: actual18.netRevenue, ttm: actualTtm.netRevenue, treatment: 'Gross operating receipts less refunds; financing and reimbursements excluded.' },
  { metric: 'Inventory purchases', period18: actual18.inventory, ttm: actualTtm.inventory, treatment: 'Cash purchases, not consumed COGS or ending inventory valuation.' },
  { metric: 'Paid labor', period18: actual18.labor, ttm: actualTtm.labor, treatment: 'Cash labor identified by category/payroll evidence; founder labor excluded.' },
  { metric: 'Operating expense before debt', period18: actual18.operatingExDebt, ttm: actualTtm.operatingExDebt, treatment: 'Cash operating cost with observed debt-category payments removed.' },
  { metric: 'Unclassified cash outflow', period18: actual18.unclassified, ttm: actualTtm.unclassified, treatment: 'Conservatively deducted from CFADS until classified.' },
  { metric: 'Cash CFADS', period18: actual18.cashCfads, ttm: actualTtm.cashCfads, treatment: 'Net revenue less inventory, paid labor, operating expense before debt, and unclassified outflows.' },
  { metric: 'Observed debt service', period18: actual18.debtService, ttm: actualTtm.debtService, treatment: 'Debt-category cash payments only; schedule and Square payoff remain incomplete.' },
  { metric: 'Free cash after observed debt', period18: actual18.freeCashAfterDebt, ttm: actualTtm.freeCashAfterDebt, treatment: 'Cash CFADS less observed debt service; founder draws excluded.' },
  { metric: 'Founder draws / PERSONAL', period18: actual18.founderDraws, ttm: actualTtm.founderDraws, treatment: 'Owner distributions; not treated as an operating expense or added to founder compensation.' },
];

const coverageRows = [
  { view: 'As-paid cash', cfads: actualTtm.cashCfads, debtService: actualTtm.debtService, dscr: actualTtm.cashDscr, freeCashAfterDebt: actualTtm.freeCashAfterDebt, decisionUse: 'Diagnostic only' },
  { view: 'Fully loaded at current founder policy', cfads: fullyLoadedCfads, debtService: actualTtm.debtService, dscr: fullyLoadedDscr, freeCashAfterDebt: fullyLoadedFreeCash, decisionUse: 'Economically no coverage' },
  { view: 'After actual founder draws', cfads: round(actualTtm.cashCfads - actualTtm.founderDraws), debtService: actualTtm.debtService, dscr: actualTtm.debtService ? round((actualTtm.cashCfads - actualTtm.founderDraws) / actualTtm.debtService) : null, freeCashAfterDebt: cashAfterActualDraws, decisionUse: 'Observed owner-cash view' },
];

const obligationRows = [
  { item: 'Square Capital', currentAmount: null, knownAmount: 2110, status: 'Original June 2026 proceeds known; current payoff balance and full remittance history unavailable.' },
  { item: 'Vehicle finance and other business debt', currentAmount: null, knownAmount: null, status: 'Real but not recorded as liability accounts; complete schedule unavailable.' },
  { item: 'Founder deferred compensation', currentAmount: 21244.36, knownAmount: 30000, status: 'Provisional through July 31 using Capital Master Record offsets; fresh cash pull implies $22,597.26, a $1,352.90 conflict.' },
  { item: 'Owner-listed cashflow recovery obligations', currentAmount: 11550, knownAmount: 11550, status: 'Nine obligations; counterparties, aging, and settlement classification are not in the public record.' },
  { item: 'Current investor return/redemption obligation', currentAmount: 0, knownAmount: 0, status: 'No executed Wefunder instrument is evidenced. The $65k / 6% cumulative concept is prospective and legally open.' },
];

const productivityRows = [
  { metric: 'Revenue per inventory-purchase dollar', value: actualTtm.revenuePerInventoryDollar, unit: 'x', interpretation: 'A 27.4% cash inventory-purchase ratio; not product gross margin because inventory consumption is unmeasured.' },
  { metric: 'Cash CFADS margin', value: round(actualTtm.cfadsMargin * 100), unit: '%', interpretation: 'Before founder compensation; conservatively deducts all unclassified outflows.' },
  { metric: 'Revenue per paid-labor dollar', value: actualTtm.revenuePerPaidLaborDollar, unit: 'x', interpretation: 'Artificially high because founder labor is unpaid and payroll evidence remains incomplete.' },
  { metric: 'True capital turnover / ROIC', value: null, unit: 'n/a', interpretation: 'Blocked: invested capital, debt balances, inventory valuation, fixed assets, and a business-only balance sheet are missing.' },
];

const generatedAt = new Date().toISOString();
const localBudgetSource = {
  id: 'local_budget_corrected',
  label: 'Local Budget corrected cash actuals',
  path: 'artifacts/financial-snapshot/calculations.json',
  description: 'Posted, split-aware Local Budget cash actuals for February 2025 through July 2026 from public.transactions, public.transaction_splits, public.categories, public.financial_accounts, and public.account_balance_snapshots. The reproducible Prisma transformation is scripts/build-financial-snapshot.cjs; it excludes the Square processor-ledger account to prevent duplicate revenue, lets splits replace parent amounts, and defines cash CFADS as net operating revenue less inventory purchases, paid labor, operating expenses before debt, and unclassified cash outflows.',
  query: {
    engine: 'postgresql',
    language: 'sql',
    description: 'Monthly posted, split-aware cash actuals with Square processor-ledger accounts excluded.',
    executed_at: model.generatedAt,
    tables_used: ['public.transactions', 'public.transaction_splits', 'public.categories', 'public.financial_accounts'],
    filters: ['2025-02-01 through 2026-07-31', 'status = POSTED', 'processor-ledger accounts excluded', 'splits replace parent amount'],
    metric_definitions: {
      cashCfads: 'Net operating revenue minus inventory purchases, paid labor, operating expenses before debt, and unclassified cash outflows.',
      debtService: 'Cash outflows classified as operating and identified by debt/loan category or description.',
      cashDscr: 'Cash CFADS divided by observed debt-category payments; diagnostic because the debt schedule is incomplete.',
      fullyLoadedCfads: 'Trailing cash CFADS minus the current $90,000 annual combined founder-compensation policy.',
    },
    sql: sourceSql,
  },
};
const capitalSource = {
  id: 'capital_master_v23',
  label: 'Capital Master Record v2.3',
  path: 'artifacts/local_effort_capital_master_record_v2_3.docx',
  description: 'Owner-authorized financing record for founder compensation, capitalization, Square Capital, and current diligence gaps.',
};
const ownerUsesSource = {
  id: 'owner_obligations',
  label: 'Owner use-of-funds and recovery obligations, August 18, 2026',
  path: 'docs/economics/wefunder-use-of-funds-analysis-2026-08-18.md',
  description: 'Owner-authored planning list including $11,550 of recovery obligations and prospective Wefunder uses; not a final debt schedule.',
};

const artifact = {
  surface: 'report',
  manifest: {
    version: 1,
    surface: 'report',
    title: 'Local Effort financial snapshot',
    description: 'Reconciled trailing 18-month cash performance, debt coverage, liquidity, obligations, and capital productivity through July 2026.',
    generatedAt,
    cards: [
      { id: 'revenue_card', description: 'Trailing 12-month net operating revenue after refunds.', dataset: 'headline', sourceId: 'local_budget_corrected', metrics: [
        { label: 'TTM net revenue', field: 'ttmNetRevenue', format: 'currency' },
        { label: '18-month total', field: 'period18NetRevenue', format: 'currency' },
      ]},
      { id: 'cfads_card', description: 'Cash CFADS conservatively deducts unclassified outflows; fully loaded CFADS adds current founder compensation.', dataset: 'headline', sourceId: 'local_budget_corrected', metrics: [
        { label: 'Cash CFADS', field: 'cashCfads', format: 'currency' },
        { label: 'Fully loaded', field: 'fullyLoadedCfads', format: 'currency', signed: true },
      ]},
      { id: 'debt_card', description: 'Observed debt-category payments only; the complete debt schedule is missing.', dataset: 'headline', sourceId: 'local_budget_corrected', metrics: [
        { label: 'Observed debt service', field: 'debtService', format: 'currency' },
        { label: 'Diagnostic cash DSCR', field: 'cashDscr', format: 'number' },
      ]},
      { id: 'free_cash_card', description: 'Cash remaining after observed debt, before founder draws.', dataset: 'headline', sourceId: 'local_budget_corrected', metrics: [
        { label: 'Free cash after debt', field: 'freeCashAfterDebt', format: 'currency' },
        { label: 'After actual draws', field: 'cashAfterActualDraws', format: 'currency', signed: true },
      ]},
    ],
    charts: [
      {
        id: 'monthly_cash_chart',
        title: 'Trailing-12-month CFADS by treatment',
        subtitle: 'Cash, fully loaded founder compensation, and actual-founder-draw views.',
        type: 'horizontalBar',
        dataset: 'coverageRows',
        sourceId: 'local_budget_corrected',
        valueFormat: 'currency',
        encodings: {
          x: { field: 'view', type: 'nominal', label: 'Treatment' },
          y: { field: 'cfads', type: 'quantitative', label: 'CFADS', format: 'currency' },
          tooltip: [
            { field: 'debtService', type: 'quantitative', label: 'Observed debt service', format: 'currency' },
            { field: 'dscr', type: 'quantitative', label: 'DSCR', format: 'number' },
            { field: 'freeCashAfterDebt', type: 'quantitative', label: 'Free cash after debt', format: 'currency' },
          ],
        },
      },
    ],
    tables: [],
    sources: [localBudgetSource, capitalSource, ownerUsesSource],
    blocks: [
      { id: 'title', type: 'markdown', layout: 'full', body: '# Local Effort financial snapshot' },
      { id: 'executive_summary', type: 'markdown', layout: 'full', body: `## Executive Summary\n\n- **Cash operations are positive, but normalized economics are not.** Trailing-12-month cash CFADS is **$${actualTtm.cashCfads.toLocaleString('en-US', {maximumFractionDigits: 0})}** after conservatively deducting **$${actualTtm.unclassified.toLocaleString('en-US', {maximumFractionDigits: 0})}** of unclassified outflow. At the current **$90k annual** founder-compensation policy, normalized CFADS is **-$${Math.abs(fullyLoadedCfads).toLocaleString('en-US', {maximumFractionDigits: 0})}**.\n- **The apparent ${actualTtm.cashDscr.toFixed(1)}x cash DSCR is not lender-ready.** It uses only **$${actualTtm.debtService.toLocaleString('en-US', {maximumFractionDigits: 0})}** of observed debt-category payments; current Square Capital payoff, vehicle finance, and a complete debt schedule are missing. Fully loaded coverage is negative.\n- **Liquidity is critical and not fully verifiable.** Strictly resolved liquid cash is **$${resolvedLiquid.toFixed(2)}**; provider available balances total **$${providerAvailable.toFixed(2)}**, but accounts are not separated cleanly between business and personal and three liquid accounts fail anchored reconciliation.\n- **Do not use the generic P&L export.** It double-counted one Square processor-ledger account. The corrected pull reconciles July revenue to the Capital Master Record at **$13,211.14**.`, sourceId: 'local_budget_corrected' },
      { id: 'metric_strip', type: 'metric-strip', layout: 'full', cardIds: ['revenue_card','cfads_card','debt_card','free_cash_card'] },
      { id: 'cash_story', type: 'markdown', layout: 'full', body: `## Revenue growth has improved cash contribution, but unpaid founder labor carries the result\n\nThe corrected posted records show **$${actual18.netRevenue.toLocaleString('en-US')}** of net operating revenue over 18 months and **$${actualTtm.netRevenue.toLocaleString('en-US')}** over the latest 12. The TTM inventory-purchase ratio is **${(actualTtm.inventoryPurchaseRate * 100).toFixed(1)}%**, close to the owner’s 25–28% operating food-cost range, but this remains a cash-purchase measure rather than consumed COGS.\n\nThe chart compares the as-paid result with current founder compensation and actual founder draws. It makes the binding economic fact visible: positive cash contribution depends on deferred founder compensation.`, sourceId: 'local_budget_corrected' },
      { id: 'monthly_chart_block', type: 'chart', layout: 'half', chartId: 'monthly_cash_chart' },
      { id: 'bridge_intro', type: 'markdown', layout: 'full', body: `## The conservative cash bridge leaves a modest surplus before founder compensation\n\n**18 months:** net revenue **$${actual18.netRevenue.toLocaleString('en-US')}** less inventory purchases **$${actual18.inventory.toLocaleString('en-US')}**, paid labor **$${actual18.labor.toLocaleString('en-US')}**, operating expense before debt **$${actual18.operatingExDebt.toLocaleString('en-US')}**, and unclassified outflow **$${actual18.unclassified.toLocaleString('en-US')}** produces cash CFADS of **$${actual18.cashCfads.toLocaleString('en-US')}**. After observed debt service of **$${actual18.debtService.toLocaleString('en-US')}**, free cash is **$${actual18.freeCashAfterDebt.toLocaleString('en-US')}**. Founder draws were **$${actual18.founderDraws.toLocaleString('en-US')}**.\n\n**Trailing 12 months:** net revenue **$${actualTtm.netRevenue.toLocaleString('en-US')}**; inventory **$${actualTtm.inventory.toLocaleString('en-US')}**; paid labor **$${actualTtm.labor.toLocaleString('en-US')}**; operating expense before debt **$${actualTtm.operatingExDebt.toLocaleString('en-US')}**; unclassified outflow **$${actualTtm.unclassified.toLocaleString('en-US')}**; cash CFADS **$${actualTtm.cashCfads.toLocaleString('en-US')}**; observed debt service **$${actualTtm.debtService.toLocaleString('en-US')}**; free cash after debt **$${actualTtm.freeCashAfterDebt.toLocaleString('en-US')}**; founder draws **$${actualTtm.founderDraws.toLocaleString('en-US')}**.\n\nUnclassified outflows are deducted rather than treated as zero. Founder draws are distributions against deferred compensation, not an additional operating expense.`, sourceId: 'local_budget_corrected' },
      { id: 'coverage_intro', type: 'markdown', layout: 'full', body: `## Coverage is positive only in the as-paid view\n\n- **As-paid cash:** CFADS **$${actualTtm.cashCfads.toLocaleString('en-US')}**, diagnostic DSCR **${actualTtm.cashDscr.toFixed(2)}x**, and free cash after observed debt **$${actualTtm.freeCashAfterDebt.toLocaleString('en-US')}**.\n- **Fully loaded at the current founder policy:** CFADS **$${fullyLoadedCfads.toLocaleString('en-US')}**, DSCR **${fullyLoadedDscr.toFixed(2)}x**, and free cash after observed debt **$${fullyLoadedFreeCash.toLocaleString('en-US')}**.\n- **After actual founder draws:** free cash after observed debt **$${cashAfterActualDraws.toLocaleString('en-US')}**.\n\nThe cash DSCR is a diagnostic—not an underwriting conclusion—because the debt-service denominator is incomplete.`, sourceId: 'local_budget_corrected' },
      { id: 'liquidity_section', type: 'markdown', layout: 'full', body: `## Current unrestricted cash and runway are not decision-grade\n\nThe strict anchored method resolves only **$${resolvedLiquid.toFixed(2)}** of liquid cash. Current provider balances sum to **$${providerCurrent.toFixed(2)}** and available balances to **$${providerAvailable.toFixed(2)}**, but three liquid accounts are unresolved and every account remains assigned to a single personal entity.\n\nUsing the observed post-draw burn of roughly **$${observedMonthlyBurnAfterDraws.toFixed(2)}/month**, those balances imply only **${runwayLower.toFixed(1)}–${runwayProvider.toFixed(1)} months** of diagnostic runway. That range must not be called unrestricted business runway until account ownership, restrictions, transfers, and current balances reconcile.`, sourceId: 'local_budget_corrected' },
      { id: 'obligation_intro', type: 'markdown', layout: 'full', body: `## Debt totals are unavailable; related-party obligations are material\n\n- **Square Capital:** the original advance was **$2,110**; current payoff and withheld remittances have not been retrieved.\n- **Vehicle finance and other business debt:** real but absent from liability accounts, so current debt total is unavailable.\n- **Founder deferred compensation:** the Capital Master Record reports **$21,244.36** provisionally through July 31; the fresh cash pull implies **$22,597.26**, a **$1,352.90** conflict.\n- **Owner-listed recovery obligations:** **$11,550** across nine items, with classification and aging still open.\n- **Investor obligations:** no executed Wefunder obligation is evidenced today. The contemplated **$65k** raise and **6% cumulative** return are prospective, not accrued investor debt.` },
      { id: 'productivity_intro', type: 'markdown', layout: 'full', body: `## Operating productivity is measurable; true capital productivity is blocked\n\n- **Revenue per inventory-purchase dollar: ${actualTtm.revenuePerInventoryDollar.toFixed(2)}x.** This is a ${(actualTtm.inventoryPurchaseRate * 100).toFixed(1)}% cash-purchase ratio, not product gross margin because consumed inventory is unmeasured.\n- **Cash CFADS margin: ${(actualTtm.cfadsMargin * 100).toFixed(1)}%.** This is before founder compensation and after conservatively deducting unclassified outflows.\n- **Revenue per paid-labor dollar: ${actualTtm.revenuePerPaidLaborDollar.toFixed(2)}x.** It is artificially high because founder labor is unpaid and payroll evidence remains incomplete.\n- **Capital turnover and ROIC: unavailable.** Invested capital, debt balances, inventory valuation, fixed assets, and a business-only balance sheet are missing.`, sourceId: 'local_budget_corrected' },
      { id: 'monthly_detail_intro', type: 'markdown', layout: 'full', body: `## Three months fail the complete-month gate\n\nThe 18 calendar months are included for transparency, but **${incompleteMonths.join(', ')}** carry pending imports. No month has a split mismatch. Resolve the pending rows before using the series in an external financing package.` , sourceId: 'local_budget_corrected' },
      { id: 'next_steps', type: 'markdown', layout: 'full', body: `## Recommended next steps\n\n1. **Do not circulate a DSCR or runway claim yet.** Retrieve the Square Capital payoff/remittance history, vehicle-finance statement, every other note or card, taxes, AP, and scheduled payments.\n2. **Close the three incomplete months** and classify the **$${actualTtm.unclassified.toLocaleString('en-US')}** TTM unresolved outflow, preserving before/after results.\n3. **Reconcile current unrestricted business cash** by assigning accounts to the business entity and resolving the three anchor failures and transfer direction.\n4. **Resolve the $1,352.90 founder-draw conflict** with the owner and accountant, then issue one signed deferred-compensation schedule.\n5. **Recompute CFADS and DSCR** only after items 1–4, using the exact prospective debt terms. The kill condition for any new fixed-payment financing is normalized DSCR below **1.25x** or unrestricted cash below **two months** of fully loaded fixed obligations.\n\n**Strongest case against waiting:** posted cash operations show positive TTM CFADS and observed debt-category payments are small, so a low-balance Square advance may be serviceable while founder compensation remains deferred. The decisive reversal fact would be a complete debt schedule confirming low total service and clean unrestricted cash. The smallest reversible next step is the one-page debt-and-cash reconciliation—not a new financing commitment.` },
      { id: 'questions', type: 'markdown', layout: 'full', body: '## Further questions\n\n- What is the exact Square Capital payoff and total remittance by month?\n- Which current accounts are legally and operationally unrestricted business cash?\n- What portion of unclassified outflows is operating, personal, debt, tax, or transfer?\n- Are the $11,550 recovery obligations debt, AP, founder-related, investor-related, or other working-capital commitments?\n- What are current AP, AR, taxes, inventory on hand, and credit-card balances?' },
      { id: 'caveats', type: 'markdown', layout: 'full', body: '## Caveats and assumptions\n\nThis is a cash-management snapshot, not GAAP financial statements. Inventory is purchases rather than consumed COGS; founder labor hours are not measured; the fully loaded view uses the current $90,000 annual combined founder policy across the TTM for normalization; debt service includes only identified debt-category cash payments; and liquidity is unresolved because account ownership and anchored balances are incomplete. The generic P&L export is retained only as a data-quality exhibit and is not used for the corrected metrics.' },
    ],
  },
  snapshot: {
    version: 1,
    generatedAt,
    status: 'partial',
    datasets: {
      headline: [{
        ttmNetRevenue: actualTtm.netRevenue,
        period18NetRevenue: actual18.netRevenue,
        cashCfads: actualTtm.cashCfads,
        fullyLoadedCfads,
        debtService: actualTtm.debtService,
        cashDscr: actualTtm.cashDscr,
        freeCashAfterDebt: actualTtm.freeCashAfterDebt,
        cashAfterActualDraws,
      }],
      monthlyTrend,
      monthRowsTtm,
      monthRows,
      aggregateBridge,
      coverageRows,
      obligationRows,
      productivityRows,
    },
  },
  sources: [localBudgetSource, capitalSource, ownerUsesSource],
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ outputPath, generatedAt, incompleteMonths, actual18, actualTtm, fullyLoadedCfads, fullyLoadedFreeCash, cashAfterActualDraws, resolvedLiquid, providerAvailable, providerCurrent }, null, 2));
