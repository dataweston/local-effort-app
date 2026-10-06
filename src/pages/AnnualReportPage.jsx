import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import useSpecimenReveal from '../hooks/useSpecimenReveal';
import '../styles/specimen.css';
import '../styles/annual-report.css';

/* Annual report — the page is a sheet, not a dashboard.
   Direction and provenance: docs/design/ANNUAL-REPORT.md (extends SPECIMEN.md). */

const ANNUAL_REPORT_PASSWORD = 'nofryeroil';
const ANNUAL_REPORT_STORAGE_KEY = 'le:annualReportAccess';

const MONTHS = [
  { key: '2026-01', label: "Jan '26", income: 11085.47, inventory: 1815.23, labor: 0, operating: 8146.30, reimbursable: 0, personal: 533.54, transfer: 9175.84, unclassified: 30.46, operatingIncome: 1123.94, cashFlow: 559.94, transactionCount: 149, pending: 3, complete: false },
  { key: '2026-02', label: "Feb '26", income: 7979.21, inventory: 3486.39, labor: 40, operating: 2320.54, reimbursable: 0, personal: 1201.30, transfer: 6237.51, unclassified: 30.46, operatingIncome: 2132.28, cashFlow: 900.52, transactionCount: 164, pending: 6, complete: false },
  { key: '2026-03', label: "Mar '26", income: 12445.60, inventory: 2630.47, labor: 0, operating: 5716.75, reimbursable: 0, personal: 1677.76, transfer: 22165.25, unclassified: 144.02, operatingIncome: 4098.38, cashFlow: 2276.60, transactionCount: 220, pending: 0, complete: true },
  { key: '2026-04', label: "Apr '26", income: 15638.40, inventory: 3784.26, labor: 0, operating: 3622.93, reimbursable: 0, personal: 3862.46, transfer: 24608.12, unclassified: 226.98, operatingIncome: 8231.21, cashFlow: 4141.77, transactionCount: 272, pending: 0, complete: true },
  { key: '2026-05', label: "May '26", income: 15270.75, inventory: 3526.97, labor: 560, operating: 4477.61, reimbursable: 0, personal: 5007.43, transfer: 63142.96, unclassified: 568.26, operatingIncome: 6706.17, cashFlow: 1130.48, transactionCount: 399, pending: 0, complete: true },
  { key: '2026-06', label: "Jun '26", income: 12500.42, inventory: 3325.58, labor: 2566, operating: 5134.80, reimbursable: 0, personal: 3297.57, transfer: 25386.17, unclassified: 126.03, operatingIncome: 1474.04, cashFlow: -1949.56, transactionCount: 359, pending: 0, complete: true },
  { key: '2026-07', label: "Jul '26", income: 13338.23, inventory: 4312.22, labor: 1279, operating: 5181.88, reimbursable: 0, personal: 1432.52, transfer: 37148.37, unclassified: 293.93, operatingIncome: 2565.13, cashFlow: 838.68, transactionCount: 454, pending: 9, complete: false },
  { key: '2026-08', label: "Aug '26", income: 13055.57, inventory: 4126.80, labor: 1642, operating: 2402.81, reimbursable: 0, personal: 1837.94, transfer: 26874.51, unclassified: 553.98, operatingIncome: 4883.96, cashFlow: 2492.04, transactionCount: 389, pending: 0, complete: true },
  { key: '2026-09', label: "Sep '26", income: 9734.08, inventory: 3326.67, labor: 190, operating: 1979.44, reimbursable: 0, personal: 2020.71, transfer: 17810.79, unclassified: 393.55, operatingIncome: 4237.97, cashFlow: 1823.71, transactionCount: 343, pending: 0, complete: true },
];

const sum = (field) => MONTHS.reduce((total, month) => total + month[field], 0);
const TOTALS = {
  income: sum('income'),
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
  latestBankSyncAt: '2026-10-03T03:59:07.038Z',
  sourceMaxDate: '2026-10-02',
  transactionRows: 3303,
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
const LOSS_INDEX = MONTHS.findIndex((month) => month.operatingIncome < 0);
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

// Cashflow bridge. Unclassified outflow stays visible instead of being folded
// into operating expense, and transfers remain excluded from business cash.
const FALL = (() => {
  let remaining = TOTALS.income;
  const steps = [{ key: 'income', label: 'Income', value: TOTALS.income, left: 0, kind: 'whole' }];
  [
    { key: 'inventory', label: 'Inventory', value: TOTALS.inventory },
    { key: 'labor', label: 'Labor', value: TOTALS.labor },
    { key: 'operating', label: 'Operating costs', value: TOTALS.operating },
  ].forEach((step) => {
    remaining -= step.value;
    steps.push({ ...step, left: (remaining / TOTALS.income) * 100, kind: 'out' });
  });
  steps.push({ key: 'operatingIncome', label: 'Operating remainder', value: TOTALS.operatingIncome, left: 0, kind: 'whole' });
  [
    { key: 'unclassified', label: 'Unclassified outflow', value: TOTALS.unclassified },
    { key: 'personal', label: 'Founder draws', value: TOTALS.personal },
  ].forEach((step) => {
    remaining -= step.value;
    steps.push({ ...step, left: (remaining / TOTALS.income) * 100, kind: 'out' });
  });
  steps.push({ key: 'cashFlow', label: 'Tracked cash remainder', value: TOTALS.cashFlow, left: 0, kind: 'whole' });
  return steps.map((step) => ({
    ...step,
    width: (step.value / TOTALS.income) * 100,
    share: (step.value / TOTALS.income) * 100,
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
                <div><dt>Income</dt><dd>{usd(TOTALS.income)}</dd><dd className="ar-ledger__note">Posted cash inflow in the January–September window</dd></div>
                <div><dt>Operating remainder</dt><dd>{usd(TOTALS.operatingIncome)}</dd><dd className="ar-ledger__note">After inventory, labor and operating costs</dd></div>
                <div><dt>Tracked cash remainder</dt><dd>{usd(TOTALS.cashFlow)}</dd><dd className="ar-ledger__note">After unclassified outflow and founder draws</dd></div>
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
                    {index === LOSS_INDEX && <span className="ar-months__note">the only loss</span>}
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
                Of {usd(TOTALS.income)} in posted income, {usd(TOTALS.inventory)} went to inventory,
                {' '}{usd(TOTALS.labor)} to labor and {usd(TOTALS.operating)} to operating costs.
                {' '}{usd(TOTALS.operatingIncome)} remained before unresolved outflows.
              </p>
              <p className="ar-small">
                {usd(TOTALS.unclassified)} of outflow remains unclassified. Transfers ({usd(TOTALS.transfer)}) are excluded
                from business cash, and founder draws appear below the operating remainder.
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
            <ol className="ar-fall" aria-label="Income to tracked cash remainder">
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
            <p className="ar-void__aside">The tracked cash remainder after both was {usd(TOTALS.cashFlow)}.</p>
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
                The API classifies posted bank activity into income, inventory, labor, operating costs,
                founder draws and transfers excluded from business cash.
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
                <span className="ar-channels__track" aria-hidden="true"><i style={{ width: `${(TOTALS.transfer / (TOTALS.transfer + TOTALS.income)) * 100}%` }} /></span>
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
                    <LedgerRow label="Income" values={MONTHS.map((m) => m.income)} total={TOTALS.income} kind="total" />

                    <StatementSectionRow>Direct cash costs</StatementSectionRow>
                    <LedgerRow label="Inventory" values={MONTHS.map((m) => m.inventory)} total={TOTALS.inventory} />
                    <LedgerRow label="Labor" values={MONTHS.map((m) => m.labor)} total={TOTALS.labor} />
                    <LedgerRow label="Operating costs" values={MONTHS.map((m) => m.operating)} total={TOTALS.operating} />
                    <LedgerRow label="Operating remainder" values={MONTHS.map((m) => m.operatingIncome)} total={TOTALS.operatingIncome} kind="result" />

                    <StatementSectionRow>Below the operating remainder</StatementSectionRow>
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
                <div><dt>Operating remainder</dt><dd>Posted income less inventory, labor and operating costs. It is a cashflow measure, not an accrual profit claim.</dd></div>
                <div><dt>Founder draws</dt><dd>Personal outflows shown below the operating remainder, not inside operating costs.</dd></div>
                <div><dt>Tracked cash remainder</dt><dd>Operating remainder less unresolved outflow and founder draws. Transfers are excluded.</dd></div>
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
                <li>Read-only audit artifact · .tmp/accuracy-audit/accuracy-audit-january-through-september.json</li>
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
