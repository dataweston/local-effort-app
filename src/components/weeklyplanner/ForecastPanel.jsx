import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, RefreshCw, TrendingUp } from 'lucide-react';

function money(cents) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format((Number(cents) || 0) / 100);
}

function monthLabel(key) {
  const [year, month] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, 1)));
}

function freshnessLabel(value) {
  if (!value) return 'No data';
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000));
  if (days === 0) return 'Updated today';
  if (days === 1) return 'Updated yesterday';
  return `Updated ${days} days ago`;
}

function statusLabel(value) {
  return String(value || 'planned')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function SourcePill({ label, status, detail, stale = false }) {
  const unavailable = status !== 'ready';
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px]"
      style={{
        color: unavailable || stale ? '#9a5b25' : 'var(--color-text-secondary)',
        borderColor: unavailable || stale ? '#e7c99c' : 'var(--color-border-default)',
        backgroundColor: unavailable || stale ? '#fff8ec' : 'var(--color-bg-page)',
      }}
      title={detail}
    >
      {(unavailable || stale) && <AlertTriangle size={11} />}
      <strong>{label}</strong>
      <span>{detail}</span>
    </span>
  );
}

export function ForecastPanel({ accessToken, enabled }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/planner/forecast', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error(`Forecast unavailable (${response.status})`);
      const next = await response.json();
      setData(next);
    } catch (err) {
      setError(err.message || 'Forecast unavailable');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (enabled && accessToken) load();
  }, [enabled, accessToken, load]);

  const totals = useMemo(() => {
    const months = data?.months || [];
    const costsAvailable = months.length > 0 && months.every((month) => month.costsAvailable);
    const sums = months.reduce((sum, month) => ({
      revenue: sum.revenue + month.revenueCents,
      costs: sum.costs + (month.costCents || 0),
      net: sum.net + (month.netCents || 0),
    }), { revenue: 0, costs: 0, net: 0 });
    return { ...sums, costsAvailable };
  }, [data]);
  const localBudgetWarnings = data?.sources?.localBudget?.warnings || [];
  const localBudgetQuality = data?.sources?.localBudget?.quality || {};

  if (!enabled) return null;

  return (
    <section
      className="mx-4 mb-4 overflow-hidden rounded-xl border"
      style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border-default)' }}
      aria-labelledby="forecast-heading"
    >
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <TrendingUp size={17} style={{ color: 'var(--brand-olive)' }} />
        <div className="min-w-0 flex-1">
          <h2 id="forecast-heading" className="text-sm font-bold font-display" style={{ color: 'var(--color-text-primary)' }}>
            Six-month operating outlook
          </h2>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Recurring Square invoices, committed orders, Local Budget actuals, and scheduled labor
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium disabled:opacity-50"
          style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-secondary)' }}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex min-h-9 min-w-9 items-center justify-center rounded-lg"
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse forecast' : 'Expand forecast'}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {error && (
        <div className="mx-4 mb-3 rounded-lg border px-3 py-2 text-xs" style={{ color: '#9a5b25', borderColor: '#e7c99c', backgroundColor: '#fff8ec' }}>
          {error}
        </div>
      )}

      {expanded && data && (
        <div className="border-t px-4 py-4" style={{ borderColor: 'var(--color-border-default)' }}>
          <div className="mb-4 flex flex-wrap gap-2">
            <SourcePill
              label="Square"
              status={data.sources.square.status}
              detail={`${data.sources.square.recurringSeriesCount} monthly series · ${money(data.sources.square.recurringMonthlyCents)}/mo`}
            />
            <SourcePill
              label="Happy Monday"
              status={data.sources.happyMonday.status}
              detail={`${data.sources.happyMonday.futureOrderCount} committed orders · through ${data.sources.happyMonday.lastOrderDate || '—'}`}
            />
            <SourcePill
              label="Local Budget"
              status={data.sources.localBudget.status}
              stale={(data.sources.localBudget.freshnessDays || 0) > 7 || localBudgetWarnings.length > 0 || (localBudgetQuality.unclassifiedCents || 0) > 0 || (localBudgetQuality.splitMismatchCount || 0) > 0}
              detail={`${freshnessLabel(data.sources.localBudget.lastEventAt)}${localBudgetWarnings.length ? ` · ${localBudgetWarnings.length} quality warning${localBudgetWarnings.length === 1 ? '' : 's'}` : ''}`}
            />
            <SourcePill
              label="Labor"
              status={data.sources.planner.status}
              detail={`${data.sources.planner.laborCardCount} costed items${data.sources.localBudget.averageLaborCents ? ` · ${money(data.sources.localBudget.averageLaborCents)}/mo actual baseline` : ''}`}
            />
            <SourcePill
              label="Events"
              status={data.sources.planner.unpricedEventCount > 0 ? 'review' : data.sources.planner.status}
              detail={`${money(data.sources.planner.securedEventBalanceCents)} deposit-backed · ${money(data.sources.planner.plannedEventBalanceCents)} planned${data.sources.planner.unpricedEventCount ? ` · ${data.sources.planner.unpricedEventCount} needs pricing` : ''}`}
            />
            <SourcePill
              label="Meal prep"
              status={data.sources.planner.pausedBillingSeries.length > 0 ? 'review' : data.sources.planner.status}
              detail={`${data.sources.planner.billingSeries.length} active billing schedules${data.sources.planner.pausedBillingSeries.length ? ` · ${data.sources.planner.pausedBillingSeries.length} paused` : ''}`}
            />
          </div>

          {!totals.costsAvailable && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs" style={{ color: '#9a5b25', borderColor: '#e7c99c', backgroundColor: '#fff8ec' }}>
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>Local Budget costs are unavailable. Cash-in is shown, but costs and net are withheld rather than treated as zero.</span>
            </div>
          )}

          <div className="mb-4 grid grid-cols-3 gap-2 sm:max-w-xl">
            {[
              ['Expected cash in', money(totals.revenue), 'var(--color-state-success)'],
              ['Forecast costs', totals.costsAvailable ? money(totals.costs) : 'Unavailable', 'var(--color-state-danger)'],
              ['Forecast net', totals.costsAvailable ? money(totals.net) : 'Unavailable', totals.net >= 0 ? 'var(--color-state-success)' : 'var(--color-state-danger)'],
            ].map(([label, value, color]) => (
              <div key={label} className="rounded-lg border p-3" style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-page)' }}>
                <div className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
                <div className="mt-1 text-base font-bold" style={{ color }}>{value}</div>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-xs">
              <thead>
                <tr style={{ color: 'var(--color-text-muted)' }}>
                  <th className="border-b px-2 py-2 text-left font-medium" style={{ borderColor: 'var(--color-border-default)' }}>Month</th>
                  <th className="border-b px-2 py-2 text-right font-medium" style={{ borderColor: 'var(--color-border-default)' }}>Square invoices</th>
                  <th className="border-b px-2 py-2 text-right font-medium" style={{ borderColor: 'var(--color-border-default)' }}>Event balances</th>
                  <th className="border-b px-2 py-2 text-right font-medium" style={{ borderColor: 'var(--color-border-default)' }}>Meal prep billing</th>
                  <th className="border-b px-2 py-2 text-right font-medium" style={{ borderColor: 'var(--color-border-default)' }}>Happy Monday</th>
                  <th className="border-b px-2 py-2 text-right font-medium" style={{ borderColor: 'var(--color-border-default)' }}>Inventory/COGS</th>
                  <th className="border-b px-2 py-2 text-right font-medium" style={{ borderColor: 'var(--color-border-default)' }}>Operating</th>
                  <th className="border-b px-2 py-2 text-right font-medium" style={{ borderColor: 'var(--color-border-default)' }}>Labor</th>
                  <th className="border-b px-2 py-2 text-right font-medium" style={{ borderColor: 'var(--color-border-default)' }}>Net</th>
                </tr>
              </thead>
              <tbody>
                {data.months.map((month) => (
                  <tr key={month.month}>
                    <th className="border-b px-2 py-2.5 text-left font-semibold" style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-primary)' }}>{monthLabel(month.month)}</th>
                    <td className="border-b px-2 py-2.5 text-right" style={{ borderColor: 'var(--color-border-default)' }}>{money(month.squareRevenueCents)}</td>
                    <td className="border-b px-2 py-2.5 text-right" style={{ borderColor: 'var(--color-border-default)' }}>{money(month.plannerEventRevenueCents)}</td>
                    <td className="border-b px-2 py-2.5 text-right" style={{ borderColor: 'var(--color-border-default)' }}>{money(month.mealPrepRevenueCents)}</td>
                    <td className="border-b px-2 py-2.5 text-right" style={{ borderColor: 'var(--color-border-default)' }}>{money(month.happyMondayRevenueCents)}</td>
                    <td className="border-b px-2 py-2.5 text-right" style={{ borderColor: 'var(--color-border-default)' }}>{month.costsAvailable ? money(month.cogsCents) : '—'}</td>
                    <td className="border-b px-2 py-2.5 text-right" style={{ borderColor: 'var(--color-border-default)' }}>{month.costsAvailable ? money(month.operatingCents) : '—'}</td>
                    <td className="border-b px-2 py-2.5 text-right" style={{ borderColor: 'var(--color-border-default)' }}>{money(month.laborCents)}</td>
                    <td className="border-b px-2 py-2.5 text-right font-semibold" style={{ borderColor: 'var(--color-border-default)', color: month.netCents == null ? 'var(--color-text-muted)' : month.netCents >= 0 ? 'var(--color-state-success)' : 'var(--color-state-danger)' }}>{month.netCents == null ? '—' : money(month.netCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.sources.planner.events.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <h3 className="mb-2 text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>Upcoming event cash</h3>
              <table className="w-full min-w-[560px] border-collapse text-xs">
                <thead>
                  <tr style={{ color: 'var(--color-text-muted)' }}>
                    <th className="border-b px-2 py-2 text-left font-medium" style={{ borderColor: 'var(--color-border-default)' }}>Event</th>
                    <th className="border-b px-2 py-2 text-left font-medium" style={{ borderColor: 'var(--color-border-default)' }}>Date</th>
                    <th className="border-b px-2 py-2 text-left font-medium" style={{ borderColor: 'var(--color-border-default)' }}>Stage</th>
                    <th className="border-b px-2 py-2 text-right font-medium" style={{ borderColor: 'var(--color-border-default)' }}>Expected total</th>
                    <th className="border-b px-2 py-2 text-right font-medium" style={{ borderColor: 'var(--color-border-default)' }}>Received</th>
                    <th className="border-b px-2 py-2 text-right font-medium" style={{ borderColor: 'var(--color-border-default)' }}>To collect</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sources.planner.events.map((event) => (
                    <tr key={event.id}>
                      <th className="border-b px-2 py-2.5 text-left font-semibold" style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-primary)' }}>{event.title}</th>
                      <td className="border-b px-2 py-2.5" style={{ borderColor: 'var(--color-border-default)' }}>{event.date}</td>
                      <td className="border-b px-2 py-2.5" style={{ borderColor: 'var(--color-border-default)', color: event.secured ? 'var(--color-state-success)' : 'var(--color-text-muted)' }}>{statusLabel(event.financialStatus)}</td>
                      <td className="border-b px-2 py-2.5 text-right" style={{ borderColor: 'var(--color-border-default)' }}>{money(event.revenueCents)}</td>
                      <td className="border-b px-2 py-2.5 text-right" style={{ borderColor: 'var(--color-border-default)' }}>{money(event.cashReceivedCents)}</td>
                      <td className="border-b px-2 py-2.5 text-right font-semibold" style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-state-success)' }}>{money(event.balanceCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(data.sources.planner.billingSeries.length > 0 || data.sources.planner.pausedBillingSeries.length > 0) && (
            <div className="mt-4 overflow-x-auto">
              <h3 className="mb-2 text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>Meal prep billing schedule</h3>
              <table className="w-full min-w-[560px] border-collapse text-xs">
                <thead>
                  <tr style={{ color: 'var(--color-text-muted)' }}>
                    <th className="border-b px-2 py-2 text-left font-medium" style={{ borderColor: 'var(--color-border-default)' }}>Customer</th>
                    <th className="border-b px-2 py-2 text-left font-medium" style={{ borderColor: 'var(--color-border-default)' }}>Status</th>
                    <th className="border-b px-2 py-2 text-left font-medium" style={{ borderColor: 'var(--color-border-default)' }}>Next billing</th>
                    <th className="border-b px-2 py-2 text-left font-medium" style={{ borderColor: 'var(--color-border-default)' }}>Cadence</th>
                    <th className="border-b px-2 py-2 text-right font-medium" style={{ borderColor: 'var(--color-border-default)' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.sources.planner.billingSeries, ...data.sources.planner.pausedBillingSeries].map((series) => (
                    <tr key={series.templateId}>
                      <th className="border-b px-2 py-2.5 text-left font-semibold" style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-primary)' }}>{series.name}</th>
                      <td className="border-b px-2 py-2.5" style={{ borderColor: 'var(--color-border-default)', color: series.billingStatus === 'active' ? 'var(--color-state-success)' : '#9a5b25' }}>{statusLabel(series.billingStatus)}</td>
                      <td className="border-b px-2 py-2.5" style={{ borderColor: 'var(--color-border-default)' }}>{series.nextBillingDate || 'Pending'}</td>
                      <td className="border-b px-2 py-2.5" style={{ borderColor: 'var(--color-border-default)' }}>{statusLabel(series.billingCadence)}</td>
                      <td className="border-b px-2 py-2.5 text-right font-semibold" style={{ borderColor: 'var(--color-border-default)' }}>{money(series.billingAmountCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-3 space-y-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            <p>Square revenue uses {data.sources.square.recurringSeriesCount} non-overridden monthly invoice series detected from actual invoice history, plus future one-off invoices already scheduled. Meal-prep recipients with owner-confirmed schedules are excluded from this Square projection.</p>
            <p>Happy Monday includes only orders already committed in its ledger; no run-rate extrapolation is applied. Local Budget inventory and operating projections use the average of six complete actual months.</p>
            <p>Local Budget actual baseline ({data.sources.localBudget.baselineMonths.join(', ')}): {money(data.sources.localBudget.averageCogsCents)}/mo inventory, {money(data.sources.localBudget.averageOperatingCents)}/mo operating, and {money(data.sources.localBudget.averageLaborCents)}/mo categorized labor.</p>
            <p>Labor uses the higher of costed planner shifts or the six-month Local Budget labor baseline, avoiding a false zero when future shifts are not fully scheduled.</p>
            <p>Event cash uses each dated event's unpaid balance and assumes collection in the service month. Deposits already received ({money(data.sources.planner.eventCashReceivedCents)}) are not counted again. Operational planner revenue ({money(data.sources.planner.excludedOperationalRevenueCents)}) stays excluded because Square and Happy Monday already cover those streams.</p>
            <p>Meal-prep cash follows the billing dates above, not weekly service dates. Matching Square projections excluded by these overrides total {money(data.sources.square.ownerOverrideExcludedCents)} in the current horizon.</p>
            {data.sources.localBudget.status === 'ready' && ((localBudgetQuality.unclassifiedCents || 0) > 0 || (localBudgetQuality.splitMismatchCount || 0) > 0 || localBudgetWarnings.length > 0) && (
              <p style={{ color: '#9a5b25' }}>
                Local Budget quality: {money(localBudgetQuality.unclassifiedCents)} unclassified, {localBudgetQuality.splitMismatchCount || 0} split mismatch{localBudgetQuality.splitMismatchCount === 1 ? '' : 'es'}.
                {localBudgetWarnings.length ? ` ${localBudgetWarnings.join(' ')}` : ''}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
