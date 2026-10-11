import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import useSpecimenReveal from '../hooks/useSpecimenReveal';
import '../styles/specimen.css';
import '../styles/annual-report.css';

/* Annual report — the page is a sheet, not a dashboard.
   Direction and provenance: docs/design/ANNUAL-REPORT.md (extends SPECIMEN.md). */

const ANNUAL_REPORT_PASSWORD = 'nofryeroil';
const ANNUAL_REPORT_STORAGE_KEY = 'le:annualReportAccess';

// Aggregate-only snapshot of posted cash activity, refreshed October 10, 2026.
// Financing follows the source Investments category (including Square loans);
// transfer-classified movements remain excluded.
const MONTHS = [
  { key: '2026-01', label: "Jan '26", income: 11085.47, financing: 5550, inventory: 1815.23, labor: 0, operating: 8146.30, reimbursable: 0, personal: 533.54, transfer: 9175.84, unclassified: 30.46, transactionCount: 149, pending: 3, complete: false },
  { key: '2026-02', label: "Feb '26", income: 7979.21, financing: 1080, inventory: 3486.39, labor: 40, operating: 2320.54, reimbursable: 0, personal: 1201.30, transfer: 6237.51, unclassified: 30.46, transactionCount: 164, pending: 6, complete: false },
  { key: '2026-03', label: "Mar '26", income: 12445.60, financing: 0, inventory: 2630.47, labor: 0, operating: 5716.75, reimbursable: 0, personal: 1677.76, transfer: 22165.25, unclassified: 144.02, transactionCount: 220, pending: 0, complete: true },
  { key: '2026-04', label: "Apr '26", income: 15638.40, financing: 0, inventory: 3784.26, labor: 0, operating: 3622.93, reimbursable: 0, personal: 3862.46, transfer: 24608.12, unclassified: 226.98, transactionCount: 272, pending: 0, complete: true },
  { key: '2026-05', label: "May '26", income: 15270.75, financing: 9000, inventory: 3526.97, labor: 560, operating: 4477.61, reimbursable: 0, personal: 5007.43, transfer: 63142.96, unclassified: 568.26, transactionCount: 399, pending: 0, complete: true },
  { key: '2026-06', label: "Jun '26", income: 12500.42, financing: 2110, inventory: 3325.58, labor: 2566, operating: 5134.80, reimbursable: 0, personal: 3297.57, transfer: 25386.17, unclassified: 126.03, transactionCount: 359, pending: 0, complete: true },
  { key: '2026-07', label: "Jul '26", income: 13338.23, financing: 0, inventory: 4312.22, labor: 1279, operating: 5181.88, reimbursable: 0, personal: 1432.52, transfer: 37148.37, unclassified: 293.93, transactionCount: 454, pending: 9, complete: false },
  { key: '2026-08', label: "Aug '26", income: 13055.57, financing: 2732.27, inventory: 4126.80, labor: 1642, operating: 2402.81, reimbursable: 0, personal: 1837.94, transfer: 26874.51, unclassified: 553.98, transactionCount: 389, pending: 0, complete: true },
  { key: '2026-09', label: "Sep '26", income: 9734.08, financing: 538.76, inventory: 3326.67, labor: 190, operating: 1979.44, reimbursable: 0, personal: 2020.71, transfer: 17810.79, unclassified: 393.55, transactionCount: 343, pending: 0, complete: true },
].map((month) => {
  const cents = (value) => Math.round(value * 100);
  const income = cents(month.income) - cents(month.financing);
  const operatingIncome = income - cents(month.inventory) - cents(month.labor) - cents(month.operating);
  return {
    ...month,
    income: income / 100,
    operatingIncome: operatingIncome / 100,
    cashFlow: (operatingIncome + cents(month.financing) - cents(month.unclassified) - cents(month.personal)) / 100,
  };
});

// Keep source category names: Amazon does not establish what was purchased.
const OPERATING_COSTS = [
  { label: 'Rent', values: [6350, 1538, 1889, 2180, 1163.33, 1525, 3849.50, 1133.83, 1179.02] },
  { label: 'Car', values: [572.53, 0, 2000, 0, 1565.02, 287.18, 0, 0, 240.69] },
  { label: 'Amazon', values: [213.59, 278.79, 579.34, 415.90, 375.07, 812.39, 595.80, 217.20, 130.71] },
  { label: 'Gas', values: [270.19, 109.95, 235.26, 232.86, 283.44, 321.77, 276.27, 452.12, 254.96] },
  { label: 'Software & Tools', values: [124.16, 127.35, 304.34, 351.20, 389.65, 140.32, 143.23, 246.37, 139.81] },
  { label: 'Marketing', values: [260.35, 171.68, 414.25, 205.43, 213.05, 228.01, 132.43, 293.29, 0] },
  { label: 'Debt', values: [252.73, 0, 116.44, 0, 0, 1090, 0, 0, 0] },
  { label: 'Licensing and Permits', values: [99.75, 94.77, 34.25, 130, 119.25, 646.50, 34.25, 34.25, 34.25] },
  { label: 'Delivery', values: [3, 0, 143.87, 107.54, 68.80, 83.63, 150.40, 25.75, 0] },
  { label: 'Utilities', values: [0, 0, 0, 0, 300, 0, 0, 0, 0] },
].map((cost) => ({
  ...cost,
  total: cost.values.reduce((total, value) => total + Math.round(value * 100), 0) / 100,
}));

const sum = (field) => MONTHS.reduce((total, month) => total + month[field], 0);
const TOTALS = {
  income: sum('income'),
  financing: sum('financing'),
  inventory: sum('inventory'),
  labor: sum('labor'),
  operating: sum('operating'),
  reimbursable: sum('reimbursable'),
  personal: sum('personal'),
  transfer: sum('transfer'),
  unclassified: sum('unclassified'),
  operatingIncome: sum('operatingIncome'),
  cashFlow: sum('cashFlow'),
  transactionCount: sum('transactionCount'),
  pending: sum('pending'),
};

const QUALITY = {
  unclassifiedTransactionCount: 89,
  unclassifiedCents: 236767,
  splitMismatchCount: 0,
  pendingTransactionCount: 18,
  latestBankSyncAt: '2026-10-07T22:21:53.658Z',
  sourceMaxDate: '2026-10-06',
  transactionRows: 3275,
  transactionPages: 17,
  lineageVersion: 'transaction-lineage-v1',
  receiptRows: 0,
};

// The requested report window is the complete January through September 2026
// calendar period.
const REPORT_WINDOW = 'January 1, 2026 – September 30, 2026';
const FULL_MONTHS = MONTHS.map((month) => month.label);
const MAX_INCOME = Math.max(...MONTHS.map((month) => month.income));
const AVERAGE_INCOME = TOTALS.income / MONTHS.length;
const POSITIVE_MONTHS = MONTHS.filter((month) => month.operatingIncome > 0).length;
const PEAK_INDEX = MONTHS.findIndex((month) => month.income === MAX_INCOME);
const LOSS_MONTHS = MONTHS.filter((month) => month.operatingIncome < 0).map((month) => month.label);
const NEGATIVE_CASH_MONTHS = MONTHS.filter((month) => month.cashFlow < 0).map((month) => month.label);
const NEGATIVE_CASH_VERB = NEGATIVE_CASH_MONTHS.length === 1 ? 'shows' : 'show';


const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usd = (value) => `$${nf0.format(Math.round(value))}`;
const usd2 = (value) => `$${nf2.format(value)}`;
const pct = (value) => `${value.toFixed(1)}%`;
// Thousands with one decimal, negatives in parentheses: 10.9, (1.6)
const thousands = (value) => (value < 0 ? `(${(-value / 1000).toFixed(1)})` : (value / 1000).toFixed(1));
// Ledger cell: zero is a dash and negatives sit in parentheses, so the decimals
// line up down every column.
const cell = (value) => {
  const rounded = Math.round(value * 100) / 100;
  if (rounded === 0) return '–';
  return rounded < 0 ? `(${nf2.format(-rounded)})` : nf2.format(rounded);
};

// Financing is added separately, never counted in operating income.
// Cost details reconcile to the operating subtotal without double-counting it.
const FALL = (() => {
  const totalInflow = TOTALS.income + TOTALS.financing;
  let remaining = totalInflow;
  const steps = [
    { key: 'income', label: 'Income', value: TOTALS.income, left: 0, kind: 'whole' },
    { key: 'financing', label: 'Loans and investments', value: TOTALS.financing, left: (TOTALS.income / totalInflow) * 100, kind: 'in' },
    { key: 'totalInflow', label: 'Total cash inflow', value: totalInflow, left: 0, kind: 'whole' },
  ];
  [
    { key: 'inventory', label: 'Inventory', value: TOTALS.inventory },
    { key: 'labor', label: 'Labor', value: TOTALS.labor },
    ...OPERATING_COSTS.map((cost) => ({ key: cost.label, label: cost.label, value: cost.total })),
  ].forEach((step) => {
    remaining -= step.value;
    steps.push({ ...step, left: (remaining / totalInflow) * 100, kind: 'out' });
  });
  steps.push({ key: 'afterCosts', label: 'Cash after business costs', value: remaining, left: 0, kind: 'whole' });
  [
    { key: 'unclassified', label: 'Unclassified outflow', value: TOTALS.unclassified },
    { key: 'personal', label: 'Founder draws', value: TOTALS.personal },
  ].forEach((step) => {
    remaining -= step.value;
    steps.push({ ...step, left: (remaining / totalInflow) * 100, kind: 'out' });
  });
  steps.push({ key: 'cashFlow', label: 'Tracked cash remainder', value: TOTALS.cashFlow, left: 0, kind: 'whole' });
  return steps.map((step) => ({
    ...step,
    width: (step.value / totalInflow) * 100,
    share: (step.value / totalInflow) * 100,
  }));
})();

const SECTIONS = [
  { id: 'summary', label: 'Summary' },
  { id: 'costs', label: 'Costs' },
  { id: 'coverage', label: 'Coverage' },
  { id: 'quality', label: 'Quality' },
  { id: 'statement', label: 'Statement' },
  { id: 'notes', label: 'Notes' },
];

// ── Parts ──────────────────────────────────────────────────────────────────

// One section of the sheet. Each finishes (rule draws, plate settles) the first
// time it is scrolled to — see useSpecimenReveal and specimen.css.
function Sheet({ id, className = '', children }) {
  const { ref, finish } = useSpecimenReveal();
  return (
    <section id={id} ref={ref} data-finish={finish} className={`ar-section specimen-sheet specimen-reveal ${className}`}>
      {children}
    </section>
  );
}

function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) setActive(entry.target.id); });
    }, { rootMargin: '-35% 0px -60% 0px' });
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

function LedgerRow({ label, values, total, kind = '' }) {
  return (
    <tr className={kind ? `ar-row--${kind}` : undefined}>
      <th scope="row">{label}</th>
      {values.map((value, index) => (
        <td key={FULL_MONTHS[index]} className={value < 0 ? 'is-negative' : undefined}>{cell(value)}</td>
      ))}
      <td className={total < 0 ? 'is-negative' : undefined}>{cell(total)}</td>
    </tr>
  );
}

function StatementSectionRow({ children }) {
  return <tr className="ar-row--section"><th colSpan={MONTHS.length + 2} scope="colgroup">{children}</th></tr>;
}

function Gate({ onUnlock }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = (event) => {
    event.preventDefault();
    if (password !== ANNUAL_REPORT_PASSWORD) {
      setError('Incorrect password.');
      return;
    }
    try { window.sessionStorage.setItem(ANNUAL_REPORT_STORAGE_KEY, '1'); } catch { /* private mode: unlocks for this view only */ }
    onUnlock();
  };

  return (
    <div className="annual-report specimen">
      <Helmet>
        <title>Private report | Local Effort Cooperative</title>
        <meta name="robots" content="noindex, nofollow, noarchive" />
      </Helmet>
      <main className="ar-gate specimen-sheet">
        <form className="ar-gate__slip specimen-frame" onSubmit={submit}>
          <span className="specimen-frame__folio">internal</span>
          <h1>January–September cash report</h1>
          <p>Local Effort Cooperative. Enter the password to read the internal cashflow report.</p>
          <label htmlFor="annual-report-password">Password</label>
          <input
            id="annual-report-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
          <button type="submit">Open the report</button>
          {error && <p className="ar-gate__error" role="alert">{error}</p>}
        </form>
      </main>
    </div>
  );
}

function Report() {
  const active = useActiveSection(SECTIONS.map((section) => section.id));
  const voidBand = useSpecimenReveal();

  return (
    <div className="annual-report specimen" id="top">
      <Helmet>
        <title>January–September cash report | Local Effort Cooperative</title>
        <meta name="description" content="Internal January–September cashflow report from Local Effort Cooperative." />
        <meta name="robots" content="noindex, nofollow, noarchive" />
      </Helmet>

      <header className="ar-bar">
        <a className="ar-bar__mark" href="#top">Local Effort</a>
        <nav aria-label="Report sections">
          {SECTIONS.map((section) => (
            <a key={section.id} href={`#${section.id}`} aria-current={active === section.id ? 'true' : undefined}>{section.label}</a>
          ))}
        </nav>
      </header>

      <main>
        {/* Cover: a plate with its caption strip along the bottom, the way the
            de Boodt sheet is built. Above the fold, so it never waits to reveal. */}
        <section id="cover" className="ar-cover specimen-sheet" aria-labelledby="report-title">
          <div className="ar-cover__body">
            <h1 id="report-title">January–September<br />cash report</h1>
            <figure className="ar-cover__plate">
              <img
                className="specimen-figure specimen-figure--lifted"
                src="/annual-report/tart.webp"
                width="1400"
                height="1400"
                alt="A fruit tart with peach, strawberries, grapes and blueberries"
              />
            </figure>
          </div>
          <div className="specimen-caption ar-cover__caption" style={{ '--sp-caption-cells': 4 }}>
            <span className="specimen-caption__data">Local Effort Cooperative</span>
            <span className="specimen-caption__data">{REPORT_WINDOW}</span>
            <span className="specimen-caption__data">Cash basis · US dollars</span>
            <span className="specimen-caption__hand">internal working draft</span>
          </div>
        </section>

        <Sheet id="summary" className="ar-summary">
          <div className="ar-wrap ar-summary__grid">
            <div className="ar-summary__text">
              <h2>January through September</h2>
              <p>
                {POSITIVE_MONTHS} of the {MONTHS.length} calendar months show a positive operating remainder.
                {' '}{NEGATIVE_CASH_MONTHS.join(' and ')} {NEGATIVE_CASH_VERB} negative tracked cash.
              </p>
              <dl className="ar-ledger">
                <div><dt>Income</dt><dd>{usd(TOTALS.income)}</dd><dd className="ar-ledger__note">Posted income excluding loans and investments</dd></div>
                <div><dt>Loans and investments</dt><dd>{usd(TOTALS.financing)}</dd><dd className="ar-ledger__note">Financing inflows, not operating income</dd></div>
                <div><dt>Operating remainder</dt><dd>{usd(TOTALS.operatingIncome)}</dd><dd className="ar-ledger__note">After inventory, labor and operating costs; excludes financing</dd></div>
                <div><dt>Tracked cash remainder</dt><dd>{usd(TOTALS.cashFlow)}</dd><dd className="ar-ledger__note">Includes financing; after unclassified outflow and founder draws</dd></div>
                <div><dt>Unclassified outflow</dt><dd>{usd(TOTALS.unclassified)}</dd><dd className="ar-ledger__note">{QUALITY.unclassifiedTransactionCount} posted transactions still need classification</dd></div>
                <div><dt>Founder draws</dt><dd>{usd(TOTALS.personal)}</dd><dd className="ar-ledger__note">Excluded from operating costs</dd></div>
              </dl>
            </div>
            <figure className="ar-months">
              <figcaption><h3>Income by calendar bucket</h3></figcaption>
              <ol className="ar-months__plot">
                {MONTHS.map((month, index) => (
                  <li
                    key={month.key}
                    style={{ '--h': `${(month.income / MAX_INCOME) * 100}%`, '--i': index }}
                    aria-label={`${FULL_MONTHS[index]}: income ${usd(month.income)}, operating remainder ${usd(month.operatingIncome)}`}
                  >
                    <span className="ar-months__value" aria-hidden="true">{thousands(month.income)}</span>
                    <span className="ar-months__bar" aria-hidden="true" />
                    {index === PEAK_INDEX && <span className="ar-months__note ar-months__note--peak" aria-hidden="true">the high</span>}
                  </li>
                ))}
              </ol>
              <ol className="ar-months__axis" aria-hidden="true">
                {MONTHS.map((month) => <li key={month.key}>{month.label}</li>)}
              </ol>
              <p className="ar-months__rowname">Operating remainder</p>
              <ol className="ar-months__income" aria-hidden="true">
                {MONTHS.map((month, index) => (
                  <li key={month.key} className={month.operatingIncome < 0 ? 'is-negative' : undefined}>
                    {thousands(month.operatingIncome)}
                    {index === MONTHS.findIndex((m) => m.operatingIncome < 0) && <span className="ar-months__note">{LOSS_MONTHS.length === 1 ? 'the only loss' : 'first loss'}</span>}
                  </li>
                ))}
              </ol>
              <div className="specimen-caption" style={{ '--sp-caption-cells': 2 }}>
                <span className="specimen-caption__data">Both rows in thousands of dollars</span>
                <span className="specimen-caption__data">Average bucket: {usd(AVERAGE_INCOME)} income</span>
              </div>
            </figure>
          </div>
        </Sheet>

        <Sheet id="costs" className="ar-costs">
          <div className="ar-wrap ar-costs__grid">
            <div className="ar-costs__text">
              <h2>Where the money went</h2>
              <p>
                Of {usd(TOTALS.income)} in income and {usd(TOTALS.financing)} in loans and investments,
                {' '}{usd(TOTALS.inventory)} went to inventory, {usd(TOTALS.labor)} to labor
                and {usd(TOTALS.operating)} to the operating costs broken out here.
                The operating remainder, excluding financing, was {usd(TOTALS.operatingIncome)}.
              </p>
              <p className="ar-small">
                {usd(TOTALS.unclassified)} of outflow remains unclassified. Transfers ({usd(TOTALS.transfer)}) are excluded
                from business cash, and founder draws appear below the operating remainder.
                {' '}Cost labels follow the source categories; Amazon purchases and debt payments are not further inferred.
                Chart percentages use total cash inflow, including financing.
              </p>
              <figure className="ar-plate ar-plate--tile">
                <img
                  className="specimen-figure"
                  src="https://iiif.micr.io/maCBx/full/480,/0/default.webp"
                  width="480"
                  height="480"
                  loading="lazy"
                  decoding="async"
                  alt="A Delft tile painted in blue and yellow with a bowl of fruit"
                />
                <figcaption className="ar-credit">Tile with fruit basket, c. 1640–1660 · Rijksmuseum BK-1955-287</figcaption>
              </figure>
            </div>
            <ol className="ar-fall" aria-label="Income and financing to tracked cash remainder">
              {FALL.map((step, index) => (
                <li key={step.key} className={`ar-fall__row ar-fall__row--${step.kind}`} style={{ '--i': index }}>
                  <span className="ar-fall__label">{step.label}{step.note && <small>{step.note}</small>}</span>
                  <span className="ar-fall__track" aria-hidden="true">
                    <i style={{ left: `${step.left}%`, width: `${step.width}%` }} />
                  </span>
                  <span className="ar-fall__value">{usd(step.value)}<small>{pct(step.share)}</small></span>
                </li>
              ))}
            </ol>
          </div>
        </Sheet>

        {/* The one dark band. Coorte's ground is the measured --brand-void, so
            the painting dissolves into the section instead of sitting in a box. */}
        <section
          className="ar-void specimen-void specimen-reveal"
          ref={voidBand.ref}
          data-finish={voidBand.finish}
          aria-label="Operating remainder, {REPORT_WINDOW}"
        >
          <span className="specimen-void__light" aria-hidden="true" />
          <div className="ar-void__text">
            <p className="ar-void__figure">{usd(TOTALS.operatingIncome)}</p>
            <p className="ar-void__line">
              Operating remainder, {REPORT_WINDOW}, before unclassified outflow and founder draws.
            </p>
            <p className="ar-void__aside">With {usd(TOTALS.financing)} in loans and investments, the tracked cash remainder after both was {usd(TOTALS.cashFlow)}.</p>
          </div>
          <figure className="ar-void__plate">
            <img
              className="specimen-figure"
              src="https://iiif.micr.io/OHDPD/full/1400,/0/default.webp"
              srcSet="https://iiif.micr.io/OHDPD/full/800,/0/default.webp 800w, https://iiif.micr.io/OHDPD/full/1400,/0/default.webp 1400w"
              sizes="(max-width: 52rem) 100vw, 46vw"
              width="1400"
              height="1742"
              loading="lazy"
              decoding="async"
              alt="A bundle of white asparagus tied with string on a stone ledge, painted against a dark ground"
            />
            <figcaption className="ar-credit">Adriaen Coorte, Still Life with Asparagus, 1697 · Rijksmuseum SK-A-2099</figcaption>
          </figure>
        </section>

        <Sheet id="coverage" className="ar-revenue">
          <div className="ar-wrap">
            <div className="ar-revenue__head">
              <h2>What the audit covers</h2>
              <p>
                This report is built from Local Budget cashflow actuals, not order-level sales reporting.
                Posted income is separated from loans and investments using the source Investments category,
                including Square loans. Operating costs retain the source category names.
                Founder draws and transfers remain separate from business operating costs.
              </p>
            </div>
            <ol className="ar-channels">
              <li className="ar-channels__row" style={{ '--i': 0 }}>
                <span className="ar-channels__name">Posted cash activity<small>Rows in the January–September cashflow response</small></span>
                <span className="ar-channels__track" aria-hidden="true"><i style={{ width: '100%' }} /></span>
                <span className="ar-channels__value">{nf0.format(TOTALS.transactionCount)}<small>rows</small></span>
              </li>
              <li className="ar-channels__row" style={{ '--i': 1 }}>
                <span className="ar-channels__name">Receipt evidence<small>Order-level evidence returned by the audit endpoint</small></span>
                <span className="ar-channels__track" aria-hidden="true"><i style={{ width: '0%' }} /></span>
                <span className="ar-channels__value">{nf0.format(QUALITY.receiptRows)}<small>rows</small></span>
              </li>
              <li className="ar-channels__row" style={{ '--i': 2 }}>
                <span className="ar-channels__name">Transfer excluded<small>Not subtracted from business operating cash</small></span>
                <span className="ar-channels__track" aria-hidden="true"><i style={{ width: `${(TOTALS.transfer / (TOTALS.transfer + TOTALS.income + TOTALS.financing)) * 100}%` }} /></span>
                <span className="ar-channels__value">{usd(TOTALS.transfer)}<small>excluded</small></span>
              </li>
            </ol>
            <p className="ar-small ar-revenue__foot">
              No reliable channel or food-kind breakdown is published here. The receipt-evidence route returned zero rows,
              so this report does not reuse the prior partial Square and Happy Monday extracts.
            </p>
          </div>
        </Sheet>

        <Sheet id="quality" className="ar-hm">
          <div className="ar-wrap ar-hm__grid">
            <figure className="ar-plate ar-hm__plate">
              <img
                className="specimen-figure specimen-figure--lifted"
                src="/annual-report/tart.webp"
                width="1000"
                height="1000"
                loading="lazy"
                decoding="async"
                alt="A fruit tart with peach, strawberries, grapes and blueberries"
              />
              <figcaption className="ar-credit">Audit status · internal working draft</figcaption>
            </figure>
            <div className="ar-hm__body">
              <h2>Data quality</h2>
              <p>
                The figures are usable for a cashflow report, but not yet a closed January–September statement.
                The audit passed its read-only API checks and kept unresolved activity visible.
              </p>
              <dl className="ar-ledger ar-ledger--tight">
                <div><dt>Unclassified outflow</dt><dd>{usd2(QUALITY.unclassifiedCents / 100)}</dd><dd className="ar-ledger__note">{QUALITY.unclassifiedTransactionCount} posted transactions</dd></div>
                <div><dt>Pending transactions</dt><dd>{nf0.format(QUALITY.pendingTransactionCount)}</dd><dd className="ar-ledger__note">Not included in complete-month claims</dd></div>
                <div><dt>Split mismatches</dt><dd>{nf0.format(QUALITY.splitMismatchCount)}</dd><dd className="ar-ledger__note">Cashflow and transaction lineage checks</dd></div>
                <div><dt>Latest bank sync</dt><dd>{QUALITY.latestBankSyncAt.slice(0, 10)}</dd><dd className="ar-ledger__note">Source maximum date: {QUALITY.sourceMaxDate}</dd></div>
              </dl>
              <p className="ar-small ar-hm__audit">
                <strong>Readiness gate.</strong> The annual report remains an internal working draft until the
                unclassified and pending counts are cleared and receipt evidence is available.
              </p>
            </div>
          </div>
        </Sheet>

        <Sheet id="statement" className="ar-statement">
          <div className="ar-wrap ar-wrap--wide">
            <h2>Cashflow statement</h2>
            <p className="ar-statement__lede">Cash basis, US dollars. Parentheses are negative; a dash is zero. Transfers are shown separately and excluded.</p>
            <div className="specimen-frame ar-statement__frame">
              <span className="specimen-frame__folio">{REPORT_WINDOW}</span>
              {/* A scrolling region has to take focus or keyboard users cannot reach the columns. */}
              {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
              <div className="ar-tablewrap" tabIndex={0} role="region" aria-label="Cashflow statement, scrollable">
                <table className="ar-table">
                  <thead>
                    <tr>
                      <th scope="col">Line</th>
                      {MONTHS.map((month) => <th scope="col" key={month.key}>{month.label}</th>)}
                      <th scope="col">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <StatementSectionRow>Posted cashflow</StatementSectionRow>
                    <LedgerRow label="Income (excluding financing)" values={MONTHS.map((m) => m.income)} total={TOTALS.income} kind="total" />

                    <StatementSectionRow>Direct cash costs</StatementSectionRow>
                    <LedgerRow label="Inventory" values={MONTHS.map((m) => m.inventory)} total={TOTALS.inventory} />
                    <LedgerRow label="Labor" values={MONTHS.map((m) => m.labor)} total={TOTALS.labor} />
                    <StatementSectionRow>Operating costs</StatementSectionRow>
                    {OPERATING_COSTS.map((cost) => <LedgerRow key={cost.label} label={cost.label} values={cost.values} total={cost.total} />)}
                    <LedgerRow label="Total operating costs" values={MONTHS.map((m) => m.operating)} total={TOTALS.operating} kind="total" />
                    <LedgerRow label="Operating remainder" values={MONTHS.map((m) => m.operatingIncome)} total={TOTALS.operatingIncome} kind="result" />

                    <StatementSectionRow>Financing inflows</StatementSectionRow>
                    <LedgerRow label="Loans and investments" values={MONTHS.map((m) => m.financing)} total={TOTALS.financing} kind="total" />

                    <StatementSectionRow>Other cash activity</StatementSectionRow>
                    <LedgerRow label="Unclassified outflow" values={MONTHS.map((m) => m.unclassified)} total={TOTALS.unclassified} kind="quiet" />
                    <LedgerRow label="Reimbursable" values={MONTHS.map((m) => m.reimbursable)} total={TOTALS.reimbursable} kind="quiet" />
                    <LedgerRow label="Founder draws" values={MONTHS.map((m) => m.personal)} total={TOTALS.personal} />
                    <LedgerRow label="Tracked cash remainder" values={MONTHS.map((m) => m.cashFlow)} total={TOTALS.cashFlow} kind="final" />
                    <LedgerRow label="Transfer excluded" values={MONTHS.map((m) => m.transfer)} total={TOTALS.transfer} kind="quiet" />
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Sheet>

        <Sheet id="notes" className="ar-notes">
          <div className="ar-wrap ar-notes__grid">
            <figure className="ar-plate ar-notes__plate">
              <img
                className="specimen-figure"
                src="https://res.cloudinary.com/dokyhfvyd/image/upload/c_limit,f_auto,q_auto,w_900/v1769975355/jo5t7cv3zuvuuvsyuh8c.jpg"
                width="900"
                height="982"
                loading="lazy"
                decoding="async"
                alt="A handwritten menu on paper: carrot, gnocchi, pizza, blood orange tart"
              />
              <div className="specimen-caption" style={{ '--sp-caption-cells': 2 }}>
                <span className="specimen-caption__data">Handwritten menu</span>
                <span className="specimen-caption__hand">carrot · gnocchi · pizza · blood orange tart</span>
              </div>
            </figure>
            <div className="ar-notes__body">
              <h2>Notes and sources</h2>

              <h3>Terms</h3>
              <dl className="ar-terms">
                <div><dt>Operating remainder</dt><dd>Posted income excluding loans and investments, less inventory, labor and operating costs. It is a cashflow measure, not an accrual profit claim.</dd></div>
                <div><dt>Loans and investments</dt><dd>Posted income in the source Investments category, including Square loan proceeds. Transfer-classified movements stay excluded to avoid counting the same cash twice.</dd></div>
                <div><dt>Operating costs</dt><dd>Source-category amounts on the same basis as Local Budget cashflow actuals. Debt is the source cash-payment category, not a claim that all payments are interest expense.</dd></div>
                <div><dt>Founder draws</dt><dd>Personal outflows shown below the operating remainder, not inside operating costs.</dd></div>
                <div><dt>Tracked cash remainder</dt><dd>Operating remainder plus loans and investments, less unresolved outflow and founder draws. Transfers are excluded.</dd></div>
              </dl>

              <h3>Still open</h3>
              <ul className="ar-open">
                <li>{QUALITY.unclassifiedTransactionCount} posted transactions contain {usd(QUALITY.unclassifiedCents / 100)} of unclassified outflow.</li>
                <li>{QUALITY.pendingTransactionCount} transactions remain pending, so the January–September window is not a closed statement.</li>
                <li>Receipt evidence returned zero rows. Channel and food-kind revenue should not be inferred from this report.</li>
              </ul>

              <h3>Sources</h3>
              <ul className="ar-sources">
                <li>Local Budget cashflow actuals API · {REPORT_WINDOW} · contract v2 · method cashflow-actuals-v2.1</li>
                <li>Local Budget transaction lineage API · {QUALITY.transactionRows.toLocaleString('en-US')} rows across {QUALITY.transactionPages} pages · {QUALITY.lineageVersion}</li>
                <li>Aggregate snapshot refreshed October 10, 2026 · posted cash rows only · monthly financing and cost categories reconciled to cashflow actuals</li>
              </ul>
              <p className="ar-small">Prepared October 2026. Internal working draft; not a closed January–September statement.</p>
              <a className="ar-top" href="#top">Back to the top</a>
            </div>
          </div>
        </Sheet>
      </main>
    </div>
  );
}

function AnnualReportPage() {
  const [unlocked, setUnlocked] = useState(() => {
    try {
      return typeof window !== 'undefined' && window.sessionStorage.getItem(ANNUAL_REPORT_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  return unlocked ? <Report /> : <Gate onUnlock={() => setUnlocked(true)} />;
}

export default AnnualReportPage;
