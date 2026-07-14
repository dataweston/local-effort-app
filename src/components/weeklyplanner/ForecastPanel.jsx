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
  const [expanded, setExpanded] = useState(true);

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
    return months.reduce((sum, month) => ({
      revenue: sum.revenue + month.revenueCents,
      costs: sum.costs + month.cogsCents + month.operatingCents + month.laborCents,
      net: sum.net + month.netCents,
    }), { revenue: 0, costs: 0, net: 0 });
  }, [data]);

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
              stale={(data.sources.localBudget.freshnessDays || 0) > 7}
              detail={freshnessLabel(data.sources.localBudget.lastEventAt)}
            />
            <SourcePill
              label="Labor"
              status={data.sources.planner.status}
              detail={`${data.sources.planner.laborCardCount} scheduled items${data.sources.localBudget.averageLaborCents ? ` · ${money(data.sources.localBudget.averageLaborCents)}/mo Local Budget actual` : ''}`}
            />
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2 sm:max-w-xl">
            {[
              ['Forecast revenue', totals.revenue, 'var(--color-state-success)'],
              ['Forecast costs', totals.costs, 'var(--color-state-danger)'],
              ['Forecast net', totals.net, totals.net >= 0 ? 'var(--color-state-success)' : 'var(--color-state-danger)'],
            ].map(([label, value, color]) => (
              <div key={label} className="rounded-lg border p-3" style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-page)' }}>
                <div className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{label}</div>
                <div className="mt-1 text-base font-bold" style={{ color }}>{money(value)}</div>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-xs">
              <thead>
                <tr style={{ color: 'var(--color-text-muted)' }}>
                  <th className="border-b px-2 py-2 text-left font-medium" style={{ borderColor: 'var(--color-border-default)' }}>Month</th>
                  <th className="border-b px-2 py-2 text-right font-medium" style={{ borderColor: 'var(--color-border-default)' }}>Square invoices</th>
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
                    <td className="border-b px-2 py-2.5 text-right" style={{ borderColor: 'var(--color-border-default)' }}>{money(month.happyMondayRevenueCents)}</td>
                    <td className="border-b px-2 py-2.5 text-right" style={{ borderColor: 'var(--color-border-default)' }}>{money(month.cogsCents)}</td>
                    <td className="border-b px-2 py-2.5 text-right" style={{ borderColor: 'var(--color-border-default)' }}>{money(month.operatingCents)}</td>
                    <td className="border-b px-2 py-2.5 text-right" style={{ borderColor: 'var(--color-border-default)' }}>{money(month.laborCents)}</td>
                    <td className="border-b px-2 py-2.5 text-right font-semibold" style={{ borderColor: 'var(--color-border-default)', color: month.netCents >= 0 ? 'var(--color-state-success)' : 'var(--color-state-danger)' }}>{money(month.netCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 space-y-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            <p>Square revenue uses four repeated monthly invoice series detected from actual invoice history, plus future one-off invoices already scheduled. Subscription records are not used.</p>
            <p>Happy Monday includes only orders already committed in its ledger; no run-rate extrapolation is applied. Local Budget inventory and operating projections use the average of six complete actual months.</p>
            <p>Local Budget actual baseline ({data.sources.localBudget.baselineMonths.join(', ')}): {money(data.sources.localBudget.averageCogsCents)}/mo inventory, {money(data.sources.localBudget.averageOperatingCents)}/mo operating, and {money(data.sources.localBudget.averageLaborCents)}/mo categorized labor.</p>
            <p>Labor in the table comes only from the rebuilt Hub schedule. Local Budget labor is shown as an actual comparison and is not added again.</p>
            <p>Planner event revenue ({money(data.sources.planner.excludedEventRevenueCents)}) is excluded until event forecasting is added. Amazon and Costco remain in their Local Budget categories until item-level purchase data can distinguish food, packaging, and paper goods.</p>
          </div>
        </div>
      )}
    </section>
  );
}
