const fs = require('fs');
const path = require('path');

const inputPath = path.resolve('artifacts/financial-snapshot-v2/calculations.json');
const outputPath = path.resolve('artifacts/financial-snapshot-v2/artifact.json');
const model = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const sourceSql = fs.readFileSync(path.resolve('artifacts/financial-snapshot-v2/source-query.sql'), 'utf8');

const dollars = (cents) => Number(cents || 0) / 100;
const round = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const usd0 = (value) => `$${Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const signedUsd0 = (value) => `${value < 0 ? '-' : ''}${usd0(value)}`;
const pct1 = (value) => `${(value * 100).toFixed(1)}%`;

function aggregate(rows) {
  const sum = (field) => dollars(rows.reduce((total, row) => total + Number(row[field] || 0), 0));
  const grossRevenue = sum('revenueCents');
  const refunds = sum('refundCents');
  const netRevenue = grossRevenue - refunds;
  const inventory = sum('inventoryCents');
  const labor = sum('laborCents');
  const operating = sum('operatingCents');
  const unclassified = sum('unclassifiedCents');
  const debtService = sum('debtServiceCents');
  const founderDraws = sum('founderDrawsCents');
  const cashCfads = netRevenue - inventory - labor - operating - unclassified;
  return {
    months: rows.length,
    grossRevenue: round(grossRevenue), refunds: round(refunds), netRevenue: round(netRevenue),
    inventory: round(inventory), labor: round(labor), operating: round(operating),
    squareFees: round(sum('effectiveSquareFeeCents')), unclassified: round(unclassified),
    debtService: round(debtService), debtGross: round(sum('debtPaymentGrossCents')),
    debtReversals: round(sum('debtPaymentReversalCents')), founderDraws: round(founderDraws),
    founderCarPayments: round(sum('founderCarPaymentsCents')),
    financingProceeds: round(sum('financingProceedsCents')),
    supersededDebtRows: round(sum('supersededRepaymentRowsCents')),
    pendingAmount: round(sum('pendingAmountCents')),
    cashCfads: round(cashCfads),
    cashDscr: debtService ? cashCfads / debtService : null,
    freeAfterDebt: round(cashCfads - debtService),
    afterDraws: round(cashCfads - debtService - founderDraws),
    inventoryRate: netRevenue ? inventory / netRevenue : null,
    revenuePerInventoryDollar: inventory ? netRevenue / inventory : null,
    revenuePerPaidLaborDollar: labor ? netRevenue / labor : null,
    cfadsMargin: netRevenue ? cashCfads / netRevenue : null,
  };
}

const rows18 = model.months;
const rowsTtm = model.months.filter((row) => row.month >= '2025-08');
const rowsAprJul = model.months.filter((row) => row.month >= '2026-04');
const actual18 = aggregate(rows18);
const actualTtm = aggregate(rowsTtm);
const aprJul = aggregate(rowsAprJul);
const founderPolicyAnnual = 90000;
const founderPolicyMonthly = founderPolicyAnnual / 12;
const founderAccrualAprJul = founderPolicyMonthly * 4;
const founderBackpayDue = founderAccrualAprJul - aprJul.founderDraws;
const normalizedCfads = round(actualTtm.cashCfads - founderPolicyAnnual);
const normalizedFreeAfterDebt = round(normalizedCfads - actualTtm.debtService);
const normalizedDscr = actualTtm.debtService ? normalizedCfads / actualTtm.debtService : null;
const normalizedMonthlyBurnAfterDebt = Math.max(0, -normalizedFreeAfterDebt / 12);
const availableCash = dollars(model.currentBusinessCash?.availableBalanceCents);
const currentCash = dollars(model.currentBusinessCash?.currentBalanceCents);
const normalizedRunwayMonths = normalizedMonthlyBurnAfterDebt ? availableCash / normalizedMonthlyBurnAfterDebt : null;
const incomplete = model.months.filter((row) => !row.isCompleteMonth);
const pendingCount = incomplete.reduce((sum, row) => sum + row.pendingTransactionCount, 0);
const pendingAmount = dollars(incomplete.reduce((sum, row) => sum + row.pendingAmountCents, 0));
const settlementMatched = model.squareSettlementReconciliation.find((row) => row.status === 'MATCHED') || { count: 0, amountCents: 0 };
const settlementPartial = model.squareSettlementReconciliation.find((row) => row.status === 'PARTIAL') || { count: 0, amountCents: 0 };
const settlementDollarCoverage = settlementMatched.amountCents / (settlementMatched.amountCents + settlementPartial.amountCents);

const monthlyRows = model.months.map((row) => {
  const netRevenue = dollars(row.revenueCents - row.refundCents);
  const cashCosts = dollars(row.inventoryCents + row.laborCents + row.operatingCents + row.unclassifiedCents);
  return {
    month: row.month,
    status: row.isCompleteMonth ? 'Complete' : `Incomplete: ${row.pendingTransactionCount} pending`,
    netRevenue: round(netRevenue),
    inventory: round(dollars(row.inventoryCents)),
    labor: round(dollars(row.laborCents)),
    operating: round(dollars(row.operatingCents)),
    founderDraws: round(dollars(row.founderDrawsCents)),
    unclassified: round(dollars(row.unclassifiedCents)),
    debtService: round(dollars(row.debtServiceCents)),
    cashCfads: round(netRevenue - cashCosts),
  };
});

const monthlyTable = [
  '| Month | Status | Net revenue | Inventory | Paid labor | Operating | Unclassified | Founder draws | Debt service | Cash CFADS |',
  '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|',
  ...monthlyRows.map((row) => `| ${row.month} | ${row.status} | ${usd0(row.netRevenue)} | ${usd0(row.inventory)} | ${usd0(row.labor)} | ${usd0(row.operating)} | ${usd0(row.unclassified)} | ${usd0(row.founderDraws)} | ${usd0(row.debtService)} | ${signedUsd0(row.cashCfads)} |`),
].join('\n');

const coverageRows = [
  { view: 'As-paid cash CFADS', amount: actualTtm.cashCfads },
  { view: 'After debt and founder draws', amount: actualTtm.afterDraws },
  { view: 'Normalized founder compensation', amount: normalizedCfads },
];

const localBudgetSource = {
  id: 'local_budget_live_v2',
  label: 'Local Budget live production cash subledger',
  path: 'artifacts/financial-snapshot-v2/calculations.json',
  description: 'Fresh posted, split-aware aggregation through July 2026 using Local Budget operating-report scope, processor settlement entries, current Local Pizza balances, and owner-directed treatment of car and Square financing. Transformation: scripts/build-financial-snapshot-v2.cjs.',
  query: {
    engine: 'postgresql',
    language: 'sql',
    sql: sourceSql,
    executed_at: model.generatedAt,
    tables_used: ['public.transactions', 'public.transaction_splits', 'public.categories', 'public.reconciliation_allocations', 'public.processor_settlements', 'public.processor_settlement_entries', 'public.financial_accounts'],
    filters: ['2025-02-01 through 2026-07-31', 'status = POSTED', 'matched bank settlements excluded', 'current processor settlement entries only'],
  },
};
const exportSource = {
  id: 'local_budget_native_export',
  label: 'Local Budget native trailing-12-month P&L export',
  path: 'artifacts/financial-snapshot-v2/local-budget-export/profit-and-loss_2025-08_2026-07.csv',
  description: 'Independent native export used to reconcile gross P&L totals before financing, car, fee-source, and debt-service adjustments.',
};
const ownerSource = {
  id: 'owner_inputs_aug21',
  label: 'Owner inputs, August 21, 2026',
  description: 'Local Pizza is the primary business account; vehicle debt and paperwork belong to Weston; approximate vehicle balance $13,000, scheduled payment $550/month, approximately 80,000 miles; taxes deferred to a later analysis.',
};
const policySource = {
  id: 'current_facts',
  label: 'Local Effort current facts',
  path: 'skills/le-economist/references/current-facts.md',
  description: 'Owner-confirmed founder compensation policy: Weston $45,000 annual and Catherine $45,000 annual, $90,000 combined, effective April 1, 2026 and prorated from April for 2026.',
};
const capitalSource = {
  id: 'capital_master',
  label: 'Capital Master Record v2.3',
  path: 'artifacts/local_effort_capital_master_record_v2_3.docx',
  description: 'Owner-authorized capital record used for prior financing context; live Local Budget cash data controls current remittance totals.',
};
const obligationsSource = {
  id: 'recovery_obligations',
  label: 'Owner recovery-obligations list, August 18, 2026',
  path: 'docs/economics/wefunder-use-of-funds-analysis-2026-08-18.md',
  description: 'Owner planning record listing $11,550 of recovery obligations; classification and aging remain open.',
};

const title = 'Local Effort financial snapshot — revised August 2026';
const artifact = {
  surface: 'report',
  manifest: {
    version: 1,
    surface: 'report',
    title,
    description: 'Revised trailing 18-month cash snapshot through July 2026, with exact Square Capital remittances, founder-owned vehicle treatment, business cash, debt coverage, and capital productivity.',
    generatedAt: model.generatedAt,
    cards: [
      { id: 'revenue', description: 'Operating revenue excludes Square financing proceeds and nets refunds.', dataset: 'headline', sourceId: 'local_budget_live_v2', metrics: [
        { label: 'TTM net revenue', field: 'netRevenue', format: 'currency' },
        { label: '18-month net revenue', field: 'netRevenue18', format: 'currency' },
      ] },
      { id: 'cfads', description: 'Cash available for debt service before founder compensation or draws.', dataset: 'headline', sourceId: 'local_budget_live_v2', metrics: [
        { label: 'TTM cash CFADS', field: 'cashCfads', format: 'currency' },
        { label: 'CFADS margin', field: 'cfadsMargin', format: 'percent' },
      ] },
      { id: 'coverage', description: 'Exact net Square Capital remittances from settlement entries.', dataset: 'headline', sourceId: 'local_budget_live_v2', metrics: [
        { label: 'Debt service', field: 'debtService', format: 'currency' },
        { label: 'Cash DSCR', field: 'cashDscr', format: 'number' },
      ] },
      { id: 'liquidity', description: 'Provider-reported available balance in the owner-confirmed primary business account.', dataset: 'headline', sourceId: 'local_budget_live_v2', metrics: [
        { label: 'Available business cash', field: 'availableCash', format: 'currency' },
        { label: 'Current ledger balance', field: 'currentCash', format: 'currency' },
      ] },
    ],
    charts: [{
      id: 'coverage_chart',
      title: 'Trailing-12-month cash capacity by treatment',
      subtitle: 'Positive as-paid cash turns negative when current founder compensation is recognized.',
      type: 'horizontalBar',
      dataset: 'coverageRows',
      sourceId: 'local_budget_live_v2',
      valueFormat: 'currency',
      encodings: {
        x: { field: 'view', type: 'nominal', label: 'Treatment' },
        y: { field: 'amount', type: 'quantitative', label: 'Annual dollars', format: 'currency' },
      },
    }],
    tables: [],
    sources: [localBudgetSource, exportSource, ownerSource, policySource, capitalSource, obligationsSource],
    blocks: [
      { id: 'title', type: 'markdown', layout: 'full', body: `# ${title}` },
      { id: 'executive', type: 'markdown', layout: 'full', body: `## Executive Summary\n\n- **Cash operations improved materially.** TTM net operating revenue is **${usd0(actualTtm.netRevenue)}** and cash CFADS is **${usd0(actualTtm.cashCfads)}**. Exact net Square Capital service was **${usd0(actualTtm.debtService)}**, producing **${actualTtm.cashDscr.toFixed(2)}x cash DSCR** and **${usd0(actualTtm.freeAfterDebt)}** after debt.\n- **The business is not yet economically self-supporting at the current founder-pay policy.** Deducting the owner-confirmed **${usd0(founderPolicyAnnual)} annual combined** policy yields normalized CFADS of **${signedUsd0(normalizedCfads)}** and normalized free cash after debt of **${signedUsd0(normalizedFreeAfterDebt)}**.\n- **Liquidity is the binding constraint.** Local Pizza shows **${usd0(availableCash)} available** and **${usd0(currentCash)} current balance** as of the latest provider sync. That is effectively **zero normalized runway**.\n- **Confidence is medium for cash performance and low for lender-grade coverage.** Four months contain pending rows; ${settlementPartial.count} Square payouts remain partially reconciled; taxes, the current Square payoff, AP/AR, and a complete company balance sheet are not yet included.` },
      { id: 'metrics', type: 'metric-strip', layout: 'full', cardIds: ['revenue','cfads','coverage','liquidity'] },
      { id: 'changed', type: 'markdown', layout: 'full', body: `## The revised ledger changes the prior answer\n\nThe updated treatment excludes **${usd0(actualTtm.financingProceeds)}** of Square advances from operating revenue, replaces **${usd0(actualTtm.supersededDebtRows)}** of operating Debt-category placeholders with exact settlement remittances, and moves **${usd0(actualTtm.founderCarPayments)}** of TTM CarMax payments from company operating expense to founder draws. Processing fees are **${usd0(actualTtm.squareFees)}**: settlement-entry fees control when available, with the September 2025 legacy fee retained before settlement coverage begins.\n\nThe Local Budget native export reconciles the unadjusted P&L. The report then applies the financing and owner-policy adjustments above as a transparent management bridge.` },
      { id: 'cash_bridge', type: 'markdown', layout: 'full', body: `## The cash bridge supports debt, but not normalized founder pay\n\n**Trailing 12 months:** net revenue **${usd0(actualTtm.netRevenue)}** less inventory purchases **${usd0(actualTtm.inventory)}**, paid labor **${usd0(actualTtm.labor)}**, operating expense **${usd0(actualTtm.operating)}**, and unclassified outflow **${usd0(actualTtm.unclassified)}** produces cash CFADS of **${usd0(actualTtm.cashCfads)}**. After exact Square debt service of **${usd0(actualTtm.debtService)}**, free cash is **${usd0(actualTtm.freeAfterDebt)}**; after **${usd0(actualTtm.founderDraws)}** of founder draws, **${usd0(actualTtm.afterDraws)}** remains.\n\n**Eighteen months:** net revenue **${usd0(actual18.netRevenue)}**, inventory **${usd0(actual18.inventory)}**, paid labor **${usd0(actual18.labor)}**, operating expense **${usd0(actual18.operating)}**, unclassified **${usd0(actual18.unclassified)}**, cash CFADS **${usd0(actual18.cashCfads)}**, debt service **${usd0(actual18.debtService)}**, and free cash after debt **${usd0(actual18.freeAfterDebt)}**. Founder draws total **${usd0(actual18.founderDraws)}**.`, sourceId: 'local_budget_live_v2' },
      { id: 'chart_explain', type: 'markdown', layout: 'full', body: `## Founder compensation is the decisive normalization\n\nThe chart separates cash survival from full economics. As-paid operations cover current Square remittances, and cash remains positive after actual draws. Recognizing the **${usd0(founderPolicyAnnual)} annual combined** founder policy reverses the result to a **${usd0(Math.abs(normalizedCfads))} deficit before debt**. This is the binding economic frame: the operation produces cash, but current revenue does not yet support its intended founder labor cost.` },
      { id: 'coverage_chart_block', type: 'chart', layout: 'full', chartId: 'coverage_chart' },
      { id: 'debt', type: 'markdown', layout: 'full', body: `## Debt and accrued obligations\n\n- **Square Capital cash service:** ${usd0(actualTtm.debtGross)} gross payments less **${usd0(actualTtm.debtReversals)}** reversals = **${usd0(actualTtm.debtService)} net**. The current payoff balance is not available, so company debt principal cannot be reported responsibly.\n- **Weston vehicle obligation:** approximately **$13,000** remaining and **$550/month**, owner-reported, with roughly **80,000 miles** and useful life remaining. The lease/debt/title paperwork belongs to Weston, so this is excluded from company debt, CFADS, and DSCR and shown as founder personal debt.\n- **Founder deferred compensation:** the $90,000 combined annual policy is deferred and prorated from April. April–July accrual is **${usd0(founderAccrualAprJul)}**; **${usd0(aprJul.founderDraws)}** of company-covered founder expenses reduce that liability, leaving **${usd0(founderBackpayDue)} aggregate backpay due** through July. Local Budget does not yet allocate every PERSONAL outflow between Weston and Catherine, so only the aggregate is decision-grade.\n- **Investor obligations:** **$0 of executed investor return/redemption obligations is evidenced.** The contemplated raise is prospective. Owner-listed recovery obligations of **$11,550** remain unclassified by counterparty and legal form.\n- **Taxes:** intentionally excluded from this version at the owner's direction; adding them will reduce cash capacity.` },
      { id: 'liquidity_detail', type: 'markdown', layout: 'full', body: `## Liquidity and runway are effectively zero\n\nLocal Pizza is assigned to Local Effort and is the owner-confirmed primary business account. Its provider record shows **${usd0(availableCash)} available** but a **${usd0(currentCash)} current balance**, an internal inconsistency that should be resolved before relying on either figure. At the normalized post-debt burn of roughly **${usd0(normalizedMonthlyBurnAfterDebt)}/month**, available cash implies **less than 0.01 months of runway**.\n\nHistorical after-draw cash is positive, so a conventional trailing-burn runway calculation is not meaningful; the practical finding is simpler: there is no operating buffer for timing, taxes, or a bad month.`, sourceId: 'local_budget_live_v2' },
      { id: 'productivity', type: 'markdown', layout: 'full', body: `## Capital productivity is improving, but true ROIC remains blocked\n\n- **Revenue per inventory-purchase dollar: ${actualTtm.revenuePerInventoryDollar.toFixed(2)}x**; cash inventory purchases are **${pct1(actualTtm.inventoryRate)}** of net revenue. This is not consumed COGS because ending inventory is unmeasured.\n- **Revenue per paid-labor dollar: ${actualTtm.revenuePerPaidLaborDollar.toFixed(2)}x.** This is inflated by unpaid/deferred founder labor.\n- **Cash CFADS margin: ${pct1(actualTtm.cfadsMargin)}.** Free cash after debt is **${pct1(actualTtm.freeAfterDebt / actualTtm.netRevenue)}** of net revenue; after founder draws it is **${pct1(actualTtm.afterDraws / actualTtm.netRevenue)}**.\n- **Capital turnover and ROIC: unavailable.** Current invested capital, inventory value, fixed assets, AP/AR, and debt balances are not complete enough to calculate them without invention.`, sourceId: 'local_budget_live_v2' },
      { id: 'quality', type: 'markdown', layout: 'full', body: `## Data quality is better, but four months remain incomplete\n\n- **Incomplete months:** ${incomplete.map((row) => row.month).join(', ')} contain **${pendingCount} pending rows totaling ${usd0(pendingAmount)}**. All other months pass the complete-month gate.\n- **Split integrity:** zero split mismatches in the 18-month window.\n- **Square reconciliation:** ${settlementMatched.count} matched payouts and ${settlementPartial.count} partial payouts; matched payouts represent **${pct1(settlementDollarCoverage)} of payout dollars**.\n- **Duplicate screening:** ${model.duplicateEvidence.groupCount} exact-key candidate groups contain ${model.duplicateEvidence.excessRows} excess rows. These are candidates, not confirmed duplicates; repeated same-day sales can be legitimate.\n- **Freshness:** posted activity extends through ${model.sourceMaxDate}; the report was frozen at ${model.generatedAt}.\n\n${monthlyTable}`, sourceId: 'local_budget_live_v2' },
      { id: 'recommendation', type: 'markdown', layout: 'full', body: `## Recommendation and review conditions\n\n**Do not add fixed-payment business debt or make a lender-facing DSCR claim yet.** The cash result is encouraging, but the current business cash buffer is effectively zero and normalized founder compensation produces a large deficit.\n\nThe strongest honest case against waiting is that as-paid CFADS covers the observed Square remittances by **${actualTtm.cashDscr.toFixed(2)}x**, after-draw cash is positive, and the vehicle is not a company liability. The fact most likely to reverse this recommendation is a verified low Square payoff combined with funded working capital and a credible revenue/capacity plan that lifts normalized CFADS above zero.\n\n1. Resolve the **${pendingCount} pending rows**, candidate duplicates, and Local Pizza current-versus-available balance.\n2. Retrieve the exact Square payoff and complete debt schedule; add taxes in the next pass.\n3. Re-run monthly until normalized DSCR is at least **1.25x** and unrestricted business cash covers at least **two months of fully loaded fixed obligations**.\n\nThe smallest reversible next step is a one-page cash-and-debt close: freeze July, confirm the Square payoff, classify the recovery obligations, and establish a minimum cash reserve before considering new financing.` },
      { id: 'caveats', type: 'markdown', layout: 'full', body: `## Definitions and caveats\n\nCash CFADS equals net operating revenue less inventory purchases, paid labor, operating expense, and unclassified outflows; debt service is excluded from CFADS and deducted afterward. Founder compensation is deferred, and company-covered founder expenses reduce the backpay due; those offsets are not an additional operating cost. Normalized CFADS deducts the current annual founder-compensation policy. This is a cash-management report, not GAAP financial statements. Taxes, accrued interest, inventory consumption, depreciation, AP/AR, and legal debt balances are outside scope.` },
    ],
  },
  snapshot: {
    version: 1,
    generatedAt: model.generatedAt,
    status: incomplete.length ? 'partial' : 'complete',
    datasets: {
      headline: [{ netRevenue: actualTtm.netRevenue, netRevenue18: actual18.netRevenue, cashCfads: actualTtm.cashCfads, cfadsMargin: actualTtm.cfadsMargin, debtService: actualTtm.debtService, cashDscr: actualTtm.cashDscr, availableCash, currentCash }],
      coverageRows,
      monthlyRows,
    },
  },
  sources: [localBudgetSource, exportSource, ownerSource, policySource, capitalSource, obligationsSource],
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.resolve('artifacts/financial-snapshot-v2/summary.json'), `${JSON.stringify({ actual18, actualTtm, normalizedCfads, normalizedDscr, normalizedFreeAfterDebt, availableCash, currentCash, normalizedRunwayMonths, founderAccrualAprJul, aprJulFounderExpenseOffsets: aprJul.founderDraws, founderBackpayDue, incompleteMonths: incomplete.map((row) => row.month), pendingCount, pendingAmount, settlementDollarCoverage }, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ outputPath, actual18, actualTtm, normalizedCfads, normalizedDscr, normalizedFreeAfterDebt, availableCash, currentCash, founderBackpayDue, incompleteMonths: incomplete.map((row) => row.month) }, null, 2));
