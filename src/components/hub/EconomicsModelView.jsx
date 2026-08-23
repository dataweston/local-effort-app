import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  Database,
  RefreshCw,
  ShieldAlert,
  SlidersHorizontal,
} from 'lucide-react';

const INPUT_GROUPS = [
  {
    label: 'Volume & price',
    fields: [
      ['monthlyOrders', 'Monthly orders', 'orders'],
      ['averageRevenuePerOrder', 'Revenue / order', '$'],
      ['monthlyOrderCapacity', 'Monthly capacity', 'orders'],
    ],
  },
  {
    label: 'Direct cash cost per order',
    fields: [
      ['ingredientCostPerOrder', 'Ingredients', '$'],
      ['paidLaborHoursPerOrder', 'Paid labor', 'hours'],
      ['paidLaborHourlyRate', 'Paid labor rate', '$ / hr'],
      ['kitchenHoursPerOrder', 'Kitchen use', 'hours'],
      ['packagingDeliveryPerOrder', 'Packaging + delivery', '$'],
      ['otherVariableCostPerOrder', 'Other variable cost', '$'],
    ],
  },
  {
    label: 'Founder economic labor',
    fields: [
      ['founderLaborHoursPerOrder', 'Founder labor', 'hours'],
      ['founderLaborHourlyRate', 'Founder economic rate', '$ / hr'],
    ],
  },
];

function previousMonthEnd() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0)).toISOString().slice(0, 10);
}

function money(value, { compact = false } = {}) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : 0,
  }).format(Number(value));
}

function percent(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  return `${(Number(value) * 100).toFixed(1)}%`;
}

function shortDate(value) {
  if (!value) return 'Unavailable';
  return new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

async function requestModel(accessToken, input, method = 'GET') {
  const devApiRoot = import.meta.env.DEV && typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:3001`
    : '';
  const query = method === 'GET'
    ? `?start=${encodeURIComponent(input.start)}&end=${encodeURIComponent(input.end)}`
    : '';
  const response = await fetch(`${devApiRoot}/api/hub/economics-model${query}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(method === 'POST' ? { body: JSON.stringify(input) } : {}),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.error || 'Unable to load the economics model';
    throw new Error(payload.code ? `${message} (${payload.code})` : message);
  }
  return payload.model;
}

function MetricCard({ label, value, detail, tone = 'neutral' }) {
  return (
    <article className={`econ-metric econ-tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function StatusPill({ status }) {
  const ready = status === 'ready' || status === 'cash_ready';
  const partial = status === 'cash_ready_economic_blocked';
  return (
    <span className={`econ-status ${ready ? 'is-ready' : partial ? 'is-partial' : 'is-blocked'}`}>
      {ready ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
      {ready ? 'Ready' : partial ? 'Cash ready' : 'Blocked'}
    </span>
  );
}

function ActualsPanel({ model }) {
  const bridge = model.companyBridge;
  const lines = model.lineActuals || [];
  const maxLineRevenue = Math.max(1, ...lines.map((line) => Number(line.observedSquareRevenue || 0)));
  const bridgeRows = [
    ['Gross operating revenue', bridge.grossOperatingRevenue, 'positive'],
    ['Refunds and returns', -bridge.refundsAndReturns, 'cost'],
    ['Net operating revenue', bridge.cashRevenue, 'subtotal'],
    ['COGS', -bridge.cogs, 'cost'],
    ['Paid nonfounder labor', -bridge.paidNonfounderLabor, 'cost'],
    ['Operating expense ex labor', -bridge.operatingExpenseExLabor, 'cost'],
    ['Unresolved expense', -bridge.unknownOrUnresolvedExpense, 'warning'],
    ['Cash contribution before founder draws', bridge.cashContributionBeforeFounderDraws, 'subtotal'],
    ['Founder compensation policy', -bridge.founderCompensationPolicyExpense, 'cost'],
    ['Fully loaded operating result', bridge.fullyLoadedOperatingResult, 'total'],
  ];

  return (
    <div className="econ-stack">
      <section className="econ-panel">
        <div className="econ-section-head">
          <div>
            <span className="econ-eyebrow">Company bridge</span>
            <h3>Cash is not the same as economic profit</h3>
          </div>
          <span className="econ-period-label">{shortDate(model.period.start)}–{shortDate(model.period.end)}</span>
        </div>
        <div className="econ-bridge">
          {bridgeRows.map(([label, value, kind]) => (
            <div className={`econ-bridge-row econ-bridge-${kind}`} key={label}>
              <span>{label}</span>
              <strong>{money(value)}</strong>
            </div>
          ))}
        </div>
        <p className="econ-footnote">Reimbursements and unresolved income are excluded from operating revenue. PERSONAL offsets founder accrual only after owner review.</p>
      </section>

      <section className="econ-panel">
        <div className="econ-section-head">
          <div>
            <span className="econ-eyebrow">Observed mix</span>
            <h3>Square line-item attribution</h3>
          </div>
          <span className="econ-period-label">{model.sources.revenueAttribution.orderCount} orders</span>
        </div>
        <div className="econ-line-chart">
          {lines.map((line) => (
            <div className="econ-line-row" key={line.id}>
              <div className="econ-line-label">
                <strong>{line.name}</strong>
                <span>{money(line.observedSquareRevenue)} · {percent(line.shareOfObservedSquareRevenue)}</span>
              </div>
              <div className="econ-track" aria-label={`${line.name}: ${money(line.observedSquareRevenue)}`}>
                <span style={{ width: `${Math.max(line.observedSquareRevenue ? 2 : 0, line.observedSquareRevenue / maxLineRevenue * 100)}%` }} />
              </div>
              {line.observedItemLabels?.length > 0 && (
                <details>
                  <summary>Source labels</summary>
                  <div className="econ-label-list">
                    {line.observedItemLabels.map((item) => <span key={item.name}>{item.name} <b>{money(item.revenue)}</b></span>)}
                  </div>
                </details>
              )}
              {line.attributionMethods?.some((item) => item.method.includes('identity') || item.method.includes('cross_source')) && (
                <div className="econ-recovery-note">
                  Cross-source identity recovered {money(line.attributionMethods
                    .filter((item) => item.method.includes('identity') || item.method.includes('cross_source'))
                    .reduce((sum, item) => sum + Number(item.revenue || 0), 0))}
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="econ-footnote">Square coverage is a diagnostic, not a cash reconciliation. Order dates and settlement dates differ.</p>
      </section>
    </div>
  );
}

function ScenarioPanel({ model, draft, setDraft, onRun, onSeed, running, dirty }) {
  const results = useMemo(() => new Map((model.scenario?.lines || []).map((line) => [line.id, line])), [model.scenario]);

  function update(id, key, value) {
    setDraft((current) => current.map((line) => line.id === id ? { ...line, [key]: value } : line));
  }

  return (
    <div className="econ-stack">
      <section className="econ-panel econ-scenario-intro">
        <div>
          <span className="econ-eyebrow">Editable scenario</span>
          <h3>Build contribution from operating drivers</h3>
          <p>Blank fields stay unknown. Primary kitchen allocation follows modeled kitchen hours; order-count and revenue-share results test whether that choice changes the answer.</p>
        </div>
        <div className="econ-actions">
          <button className="econ-button econ-button-secondary" onClick={onSeed}>Seed observed volume + price</button>
          <button className="econ-button econ-button-primary" onClick={onRun} disabled={running}>
            <RefreshCw size={14} className={running ? 'econ-spin' : ''} />
            {running ? 'Running…' : dirty ? 'Run updated scenario' : 'Run scenario'}
          </button>
        </div>
      </section>

      <div className="econ-scenario-lines">
        {draft.map((line) => {
          const result = results.get(line.id) || { status: 'blocked' };
          return (
            <details className="econ-line-editor" key={line.id} open={line.id === 'weekly_meal_subscription'}>
              <summary>
                <div>
                  <strong>{line.name}</strong>
                  <span>{result.status === 'ready' || result.status === 'cash_ready_economic_blocked'
                    ? `${money(result.monthlyRevenue)} monthly revenue · ${percent(result.cashContributionMargin)} cash contribution margin`
                    : `${result.missingCashInputs?.length || 0} cash inputs missing`}</span>
                </div>
                <StatusPill status={result.status} />
              </summary>
              <div className="econ-editor-body">
                {INPUT_GROUPS.map((group) => (
                  <fieldset key={group.label}>
                    <legend>{group.label}</legend>
                    <div className="econ-input-grid">
                      {group.fields.map(([key, label, unit]) => (
                        <label key={key}>
                          <span>{label}</span>
                          <div className="econ-input-wrap">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={line[key] ?? ''}
                              onChange={(event) => update(line.id, key, event.target.value)}
                              inputMode="decimal"
                            />
                            <small>{unit}</small>
                          </div>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
                {(result.status === 'ready' || result.status === 'cash_ready_economic_blocked') && (
                  <div className="econ-result-strip">
                    <div><span>Cash contribution</span><strong>{money(result.cashContributionBeforeStorageAndFixedOverhead)}</strong></div>
                    <div><span>Economic contribution</span><strong>{money(result.economicContributionBeforeStorageAndFixedOverhead)}</strong></div>
                    <div><span>Allocation sensitivity</span><strong>{money(result.cashContributionSensitivity?.range?.low)}–{money(result.cashContributionSensitivity?.range?.high)}</strong></div>
                    <div><span>Kitchen hours</span><strong>{result.monthlyKitchenHours ?? '—'}</strong></div>
                    <div><span>Capacity use</span><strong>{percent(result.capacityUtilization)}</strong></div>
                  </div>
                )}
              </div>
            </details>
          );
        })}
      </div>

      <section className="econ-panel econ-portfolio-result">
        <div>
          <span className="econ-eyebrow">Portfolio scenario</span>
          <h3><StatusPill status={model.scenario?.status} /> Contribution model</h3>
        </div>
        <div className="econ-portfolio-numbers">
          <div><span>Kitchen hours</span><strong>{model.scenario?.totalKitchenHours ?? '—'}</strong></div>
          <div><span>Hourly kitchen cost</span><strong>{money(model.scenario?.hourlyKitchenCost)}</strong></div>
          <div><span>Storage overhead</span><strong>{money(model.scenario?.monthlyStorageFixedOverhead)}</strong></div>
        </div>
        <p className="econ-footnote">Modeled kitchen hours control the primary allocation; order-count and revenue-share allocations define the displayed sensitivity range. The $200 storage charge remains portfolio overhead. Raise sizing still requires target mix, ramp timing, and uses of funds.</p>
      </section>
    </div>
  );
}

function EvidencePanel({ model }) {
  const recoveredLines = model.evidenceRecovery?.lines || [];
  return (
    <div className="econ-evidence-grid">
      <section className="econ-panel">
        <div className="econ-section-head">
          <div><span className="econ-eyebrow">Source health</span><h3>What controls each number</h3></div>
          <Database size={20} />
        </div>
        <div className="econ-source-list">
          <div><strong>Cash actuals</strong><span>Local Budget · {model.sources.cashActuals.postingCount} postings</span><small>Current through {shortDate(model.sources.cashActuals.lastTransactionDate)}</small></div>
          <div><strong>Line attribution</strong><span>Company Brain · Square order events</span><small>Latest order {shortDate(model.sources.revenueAttribution.latestOrderDate)}</small></div>
          <div><strong>Recovered evidence</strong><span>Gmail + Brain + Local Budget</span><small>{percent(model.evidenceRecovery?.squareRevenueAttributionCoverage)} of observed Square revenue assigned</small></div>
          <div><strong>Founder compensation</strong><span>Owner-stated policy</span><small>$160K annual combined · month-end assessment</small></div>
        </div>
      </section>

      <section className="econ-panel econ-wide">
        <div className="econ-section-head">
          <div><span className="econ-eyebrow">Partial line economics</span><h3>Recovered components, without invented allocations</h3></div>
          <CheckCircle2 size={20} />
        </div>
        <div className="econ-recovered-grid">
          {recoveredLines.map((line) => (
            <article className="econ-recovered-card" key={line.id}>
              <div className="econ-recovered-head">
                <strong>{line.name}</strong>
                <span>{line.status === 'unresolved' ? 'Unresolved' : 'Partial evidence'}</span>
              </div>
              <div className="econ-recovered-numbers">
                <div><span>Observed revenue</span><strong>{money(line.observedRevenue)}</strong></div>
                <div><span>Relevant shared pool</span><strong>{money(line.sharedCogsPoolRelevantToLine)}</strong></div>
                <div><span>Channel spend</span><strong>{money(line.lineRelatedOperatingSpend)}</strong></div>
              </div>
              {line.costPools?.map((pool) => (
                <p className="econ-evidence-note" key={pool.id}><b>{pool.name}: {money(pool.amount)}</b> {pool.note}</p>
              ))}
              {line.referenceEvidence?.map((item) => (
                <details className="econ-evidence-detail" key={item.id}>
                  <summary>{item.title} <span>{item.confidence.replace('_', ' ')} confidence</span></summary>
                  <ul>{item.facts.map((fact) => <li key={fact}>{fact}</li>)}</ul>
                  <p>{item.note}</p>
                  <small>{item.sourceLabel}</small>
                </details>
              ))}
              {!line.referenceEvidence?.length && !line.costPools?.length && <p className="econ-evidence-note">No line-specific evidence recovered for this period.</p>}
            </article>
          ))}
        </div>
        <p className="econ-footnote">Shared COGS and candidate delivery costs are shown as relevant pools, never deducted from more than one line. A full contribution margin remains blank until production or job-level matching supports the allocation.</p>
      </section>

      <section className="econ-panel">
        <div className="econ-section-head">
          <div><span className="econ-eyebrow">Decision blockers</span><h3>Required before sizing a raise</h3></div>
          <ShieldAlert size={20} />
        </div>
        <ul className="econ-blocker-list">
          {model.dataQuality.missingRequiredEvidence.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>

      <section className="econ-panel econ-wide">
        <span className="econ-eyebrow">Definitions</span>
        <div className="econ-definition-grid">
          <div><strong>Observed</strong><p>Directly supported by the named source and comparable period.</p></div>
          <div><strong>Modeled</strong><p>An editable operating assumption, never silently promoted to fact.</p></div>
          <div><strong>Unallocated</strong><p>Preserved when product or cost evidence cannot support a line assignment.</p></div>
          <div><strong>Candidate cost</strong><p>A real expense relevant to a line but not yet matched closely enough to deduct.</p></div>
        </div>
      </section>
    </div>
  );
}

export default function EconomicsModelView({ accessToken }) {
  const [start, setStart] = useState('2026-04-01');
  const [end, setEnd] = useState(previousMonthEnd);
  const [model, setModel] = useState(null);
  const [draft, setDraft] = useState([]);
  const [activeView, setActiveView] = useState('actuals');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');

  const loadActuals = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const next = await requestModel(accessToken, { start, end });
      setModel(next);
      setDraft(next.scenarioInputs || []);
      setDirty(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [accessToken, start, end]);

  useEffect(() => { loadActuals(); }, [loadActuals]);

  async function runScenario() {
    setRunning(true);
    setError('');
    try {
      const next = await requestModel(accessToken, { start, end, scenarioInputs: draft }, 'POST');
      setModel(next);
      setDraft(next.scenarioInputs || []);
      setDirty(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  }

  function seedObserved() {
    const actuals = new Map((model?.lineActuals || []).map((line) => [line.id, line]));
    const months = model?.period?.completeCalendarMonths || 1;
    setDraft((current) => current.map((line) => {
      const actual = actuals.get(line.id);
      if (!actual?.observedOrderCount) return line;
      return {
        ...line,
        monthlyOrders: Math.round(actual.observedOrderCount / months * 100) / 100,
        averageRevenuePerOrder: actual.averageObservedRevenuePerOrder,
      };
    }));
    setDirty(true);
  }

  if (loading && !model) {
    return <div className="econ-loading"><RefreshCw className="econ-spin" /> Reconciling Local Budget and Brain…<style>{economicsCss}</style></div>;
  }

  return (
    <section className="econ-workspace">
      <style>{economicsCss}</style>
      <div className="econ-toolbar">
        <div className="econ-toolbar-title">
          <CircleDollarSign size={22} />
          <div><strong>LE Economist</strong><span>Line economics · working taxonomy</span></div>
        </div>
        <div className="econ-period-controls">
          <label><span>Start</span><input type="date" value={start} onChange={(event) => setStart(event.target.value)} /></label>
          <label><span>End</span><input type="date" value={end} onChange={(event) => setEnd(event.target.value)} /></label>
          <button className="econ-button econ-button-secondary" onClick={loadActuals} disabled={loading}><RefreshCw size={14} /> Refresh</button>
        </div>
      </div>

      {error && <div className="econ-error"><AlertTriangle size={16} /> {error}</div>}

      {model && (
        <>
          <div className="econ-blocked-banner">
            <Database size={18} />
            <div><strong>Partial line economics recovered</strong><span>Exact identities, unit prices, quotes, and real cost pools are visible below. Full margins and a raise point estimate still need job-level cost and capacity matches.</span></div>
          </div>

          <div className="econ-metrics">
            <MetricCard label="Operating revenue" value={money(model.companyBridge.cashRevenue, { compact: true })} detail={`${model.period.completeCalendarMonths ?? 'Partial'} month period`} tone="positive" />
            <MetricCard label="Square line coverage" value={percent(model.revenueAttribution.squareRevenueAttributionCoverage)} detail={`${money(model.revenueAttribution.unallocatedSquareRevenue)} remains unallocated`} tone="positive" />
            <MetricCard label="Cash contribution" value={money(model.companyBridge.cashContributionBeforeFounderDraws, { compact: true })} detail="Before founder draws" tone={model.companyBridge.cashContributionBeforeFounderDraws >= 0 ? 'positive' : 'negative'} />
            <MetricCard label="Fully loaded result" value={money(model.companyBridge.fullyLoadedOperatingResult, { compact: true })} detail="After founder policy" tone={model.companyBridge.fullyLoadedOperatingResult >= 0 ? 'positive' : 'negative'} />
            <MetricCard label="Deferred founder comp" value={money(model.companyBridge.deferredFounderCompensationIncrease, { compact: true })} detail="Increase in period" tone="warning" />
          </div>

          <div className="econ-tabs" role="tablist" aria-label="Economics model views">
            {[
              ['actuals', BarChart3, 'Actuals'],
              ['scenario', SlidersHorizontal, 'Line scenario'],
              ['evidence', Database, 'Evidence'],
            ].map(([id, Icon, label]) => (
              <button key={id} role="tab" aria-selected={activeView === id} className={activeView === id ? 'is-active' : ''} onClick={() => setActiveView(id)}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          {activeView === 'actuals' && <ActualsPanel model={model} />}
          {activeView === 'scenario' && (
            <ScenarioPanel
              model={model}
              draft={draft}
              setDraft={(updater) => { setDraft(updater); setDirty(true); }}
              onRun={runScenario}
              onSeed={seedObserved}
              running={running}
              dirty={dirty}
            />
          )}
          {activeView === 'evidence' && <EvidencePanel model={model} />}

          <footer className="econ-footer">
            <span>Generated {new Date(model.generatedAt).toLocaleString()}</span>
            <span>Complete calendar months recommended</span>
          </footer>
        </>
      )}
    </section>
  );
}

const economicsCss = `
.econ-workspace { --econ-good:#2f6a55; --econ-bad:#a04438; --econ-warn:#9a6a1f; display:grid; gap:14px; max-width:1220px; margin:0 auto; }
.econ-toolbar,.econ-panel,.econ-metric,.econ-line-editor { background:var(--hub-panel); border:1px solid var(--hub-border); border-radius:10px; }
.econ-toolbar { padding:12px 14px; display:flex; align-items:center; justify-content:space-between; gap:14px; }
.econ-toolbar-title { display:flex; align-items:center; gap:9px; color:var(--hub-accent); }
.econ-toolbar-title strong,.econ-toolbar-title span { display:block; }
.econ-toolbar-title strong { font-size:14px; color:var(--hub-ink); }
.econ-toolbar-title span { color:var(--hub-muted); font-size:11px; }
.econ-period-controls,.econ-actions { display:flex; align-items:end; gap:8px; flex-wrap:wrap; }
.econ-period-controls label { display:grid; gap:3px; color:var(--hub-muted); font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; }
.econ-period-controls input,.econ-input-wrap input { border:1px solid var(--hub-border); background:#fff; color:var(--hub-ink); border-radius:6px; font:inherit; }
.econ-period-controls input { height:34px; padding:0 8px; }
.econ-button { min-height:34px; border-radius:6px; padding:0 11px; display:inline-flex; align-items:center; justify-content:center; gap:6px; font:inherit; font-weight:650; cursor:pointer; }
.econ-button:disabled { opacity:.55; cursor:wait; }
.econ-button-primary { color:#fff; background:var(--hub-accent); border:1px solid var(--hub-accent); }
.econ-button-secondary { color:var(--hub-ink); background:#fff; border:1px solid var(--hub-border); }
.econ-blocked-banner,.econ-error { border-radius:9px; padding:10px 12px; display:flex; align-items:flex-start; gap:9px; }
.econ-blocked-banner { background:#fff7e8; border:1px solid #ead3a8; color:#704b14; }
.econ-blocked-banner strong,.econ-blocked-banner span { display:block; }
.econ-blocked-banner span { margin-top:1px; color:#8a6329; font-size:11px; }
.econ-error { color:#7f3028; background:#fff0ee; border:1px solid #ecc8c3; }
.econ-metrics { display:grid; grid-template-columns:repeat(5,minmax(140px,1fr)); gap:9px; }
.econ-metric { padding:11px 12px; border-top:3px solid var(--hub-border); }
.econ-metric>span,.econ-metric>small { display:block; color:var(--hub-muted); }
.econ-metric>span { font-size:10px; font-weight:750; text-transform:uppercase; letter-spacing:.045em; }
.econ-metric strong { display:block; margin:3px 0 1px; font-size:22px; line-height:1.15; font-variant-numeric:tabular-nums; }
.econ-metric small { font-size:10px; }
.econ-tone-positive { border-top-color:var(--econ-good); }.econ-tone-positive strong { color:var(--econ-good); }
.econ-tone-negative { border-top-color:var(--econ-bad); }.econ-tone-negative strong { color:var(--econ-bad); }
.econ-tone-warning { border-top-color:var(--econ-warn); }.econ-tone-warning strong { color:var(--econ-warn); }
.econ-tabs { display:flex; gap:4px; border-bottom:1px solid var(--hub-border); }
.econ-tabs button { border:0; border-bottom:2px solid transparent; background:transparent; color:var(--hub-muted); padding:8px 11px; display:flex; align-items:center; gap:6px; font:inherit; font-weight:650; cursor:pointer; }
.econ-tabs button.is-active { color:var(--hub-accent); border-bottom-color:var(--hub-accent); }
.econ-stack { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:12px; align-items:start; }
.econ-panel { padding:14px; min-width:0; }
.econ-section-head { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; margin-bottom:12px; }
.econ-eyebrow { color:var(--hub-accent); font-size:9px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
.econ-section-head h3,.econ-scenario-intro h3,.econ-portfolio-result h3 { margin:2px 0 0; font-size:15px; }
.econ-period-label { color:var(--hub-muted); font-size:10px; white-space:nowrap; }
.econ-bridge { display:grid; }
.econ-bridge-row { display:flex; align-items:center; justify-content:space-between; gap:12px; min-height:34px; border-bottom:1px solid var(--hub-border-light); }
.econ-bridge-row strong { font-variant-numeric:tabular-nums; }.econ-bridge-cost strong { color:var(--econ-bad); }
.econ-bridge-subtotal { margin-top:4px; border-top:1px solid var(--hub-border); font-weight:700; }
.econ-bridge-total { margin-top:4px; border:0; border-radius:6px; padding:0 8px; background:#f7ecea; color:var(--econ-bad); font-weight:800; }
.econ-bridge-warning { color:var(--econ-warn); }
.econ-footnote { margin:10px 0 0; color:var(--hub-muted); font-size:10px; line-height:1.45; }
.econ-line-chart { display:grid; gap:12px; }.econ-line-row { display:grid; gap:5px; }
.econ-line-label { display:flex; justify-content:space-between; gap:8px; }.econ-line-label span { color:var(--hub-muted); font-size:11px; font-variant-numeric:tabular-nums; }
.econ-track { height:7px; border-radius:99px; background:#eeeae2; overflow:hidden; }.econ-track span { display:block; height:100%; border-radius:inherit; background:var(--hub-accent); }
.econ-line-row details summary { width:max-content; color:var(--hub-muted); font-size:10px; cursor:pointer; }
.econ-label-list { display:flex; flex-wrap:wrap; gap:5px; padding-top:5px; }.econ-label-list span { background:var(--hub-row-hover); border:1px solid var(--hub-border-light); border-radius:99px; padding:2px 7px; font-size:9px; }.econ-label-list b { margin-left:3px; }
.econ-recovery-note { width:max-content; max-width:100%; color:var(--econ-good); background:#eaf4ee; border-radius:99px; padding:3px 7px; font-size:9px; font-weight:750; }
.econ-scenario-intro,.econ-portfolio-result { grid-column:1/-1; display:flex; align-items:center; justify-content:space-between; gap:14px; }
.econ-scenario-intro p { margin:4px 0 0; color:var(--hub-muted); font-size:11px; }
.econ-scenario-lines { grid-column:1/-1; display:grid; gap:8px; }
.econ-line-editor { overflow:hidden; }.econ-line-editor>summary { list-style:none; padding:11px 13px; display:flex; justify-content:space-between; align-items:center; gap:10px; cursor:pointer; }.econ-line-editor>summary::-webkit-details-marker { display:none; }
.econ-line-editor>summary strong,.econ-line-editor>summary span { display:block; }.econ-line-editor>summary span { color:var(--hub-muted); font-size:10px; margin-top:1px; }
.econ-status { display:inline-flex!important; flex-direction:row; align-items:center; gap:4px; border-radius:99px; padding:3px 7px; font-size:9px!important; font-weight:800; white-space:nowrap; }
.econ-status.is-ready { color:#245640; background:#e5f2eb; }.econ-status.is-partial { color:#755113; background:#fff1d8; }.econ-status.is-blocked { color:#84372f; background:#f9e7e4; }
.econ-editor-body { border-top:1px solid var(--hub-border-light); padding:13px; background:#fbfaf7; display:grid; gap:14px; }
.econ-editor-body fieldset { border:0; margin:0; padding:0; }.econ-editor-body legend { color:var(--hub-muted); font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:.06em; margin-bottom:6px; }
.econ-input-grid { display:grid; grid-template-columns:repeat(3,minmax(130px,1fr)); gap:8px; }.econ-input-grid label>span { display:block; font-size:10px; font-weight:650; margin-bottom:3px; }
.econ-input-wrap { display:flex; align-items:center; border:1px solid var(--hub-border); border-radius:6px; background:#fff; overflow:hidden; }.econ-input-wrap input { width:100%; min-width:0; height:32px; padding:0 7px; border:0; border-radius:0; outline:none; }.econ-input-wrap small { padding:0 7px; color:var(--hub-muted); white-space:nowrap; border-left:1px solid var(--hub-border-light); }
.econ-result-strip,.econ-portfolio-numbers { display:grid; grid-template-columns:repeat(4,minmax(100px,1fr)); gap:6px; }.econ-result-strip>div,.econ-portfolio-numbers>div { background:#fff; border:1px solid var(--hub-border-light); border-radius:6px; padding:7px 8px; }.econ-result-strip span,.econ-portfolio-numbers span { display:block; color:var(--hub-muted); font-size:9px; }.econ-result-strip strong,.econ-portfolio-numbers strong { display:block; margin-top:2px; font-size:13px; }
.econ-portfolio-result { display:grid; }.econ-portfolio-result h3 { display:flex; align-items:center; gap:7px; }.econ-portfolio-numbers { grid-template-columns:repeat(3,minmax(100px,1fr)); }
.econ-evidence-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }.econ-wide { grid-column:1/-1; }
.econ-source-list { display:grid; gap:7px; }.econ-source-list>div { border:1px solid var(--hub-border-light); border-radius:7px; padding:8px 9px; }.econ-source-list strong,.econ-source-list span,.econ-source-list small { display:block; }.econ-source-list span { margin-top:1px; }.econ-source-list small { color:var(--hub-muted); }
.econ-blocker-list { margin:0; padding-left:18px; display:grid; gap:7px; color:#684b21; }.econ-blocker-list li::marker { color:var(--econ-warn); }
.econ-recovered-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:9px; }
.econ-recovered-card { border:1px solid var(--hub-border-light); border-radius:8px; padding:10px; min-width:0; display:grid; gap:8px; background:#fff; }
.econ-recovered-head { display:flex; align-items:center; justify-content:space-between; gap:8px; }.econ-recovered-head>span { color:#755113; background:#fff1d8; border-radius:99px; padding:3px 7px; font-size:9px; font-weight:800; }
.econ-recovered-numbers { display:grid; grid-template-columns:repeat(3,1fr); gap:5px; }.econ-recovered-numbers>div { background:var(--hub-row-hover); border-radius:6px; padding:6px 7px; }.econ-recovered-numbers span,.econ-recovered-numbers strong { display:block; }.econ-recovered-numbers span { color:var(--hub-muted); font-size:8px; text-transform:uppercase; letter-spacing:.035em; }.econ-recovered-numbers strong { margin-top:2px; font-size:12px; }
.econ-evidence-note { margin:0; color:var(--hub-muted); font-size:9px; line-height:1.45; }.econ-evidence-note b { color:var(--hub-ink); }
.econ-evidence-detail { border-top:1px solid var(--hub-border-light); padding-top:7px; }.econ-evidence-detail summary { cursor:pointer; font-size:10px; font-weight:700; }.econ-evidence-detail summary span { color:var(--econ-good); font-size:8px; text-transform:uppercase; }.econ-evidence-detail ul { margin:7px 0; padding-left:17px; display:grid; gap:3px; font-size:9px; }.econ-evidence-detail p,.econ-evidence-detail small { color:var(--hub-muted); font-size:9px; line-height:1.4; }.econ-evidence-detail p { margin:5px 0; }.econ-evidence-detail small { display:block; }
.econ-definition-grid { margin-top:8px; display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }.econ-definition-grid>div { background:var(--hub-row-hover); border-radius:7px; padding:9px; }.econ-definition-grid p { margin:3px 0 0; color:var(--hub-muted); font-size:10px; }
.econ-footer { display:flex; justify-content:space-between; color:var(--hub-muted); font-size:9px; padding:2px 1px 18px; }
.econ-loading { min-height:280px; display:flex; align-items:center; justify-content:center; gap:8px; color:var(--hub-muted); }.econ-spin { animation:econ-spin .9s linear infinite; } @keyframes econ-spin { to { transform:rotate(360deg); } }
@media (max-width:980px) { .econ-metrics { grid-template-columns:repeat(3,1fr); }.econ-stack,.econ-evidence-grid { grid-template-columns:1fr; }.econ-scenario-intro,.econ-portfolio-result,.econ-wide { grid-column:1; }.econ-definition-grid { grid-template-columns:repeat(2,1fr); } }
@media (max-width:640px) { .econ-toolbar,.econ-scenario-intro { align-items:stretch; flex-direction:column; }.econ-period-controls { display:grid; grid-template-columns:1fr 1fr; }.econ-period-controls .econ-button { grid-column:1/-1; }.econ-metrics { grid-template-columns:1fr 1fr; }.econ-metric strong { font-size:19px; }.econ-input-grid { grid-template-columns:1fr 1fr; }.econ-result-strip { grid-template-columns:1fr 1fr; }.econ-portfolio-numbers,.econ-definition-grid,.econ-recovered-grid,.econ-recovered-numbers { grid-template-columns:1fr; }.econ-footer { display:grid; gap:2px; } }
`;
