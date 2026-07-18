import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, CheckCircle2, Database, GitBranch, RefreshCw } from 'lucide-react';
import { API_BASE } from '../../lib/apiBase';

const ENTITY_COLORS = {
  Vendor: '#4a6741',
  Customer: '#3b5bdb',
  Dish: '#c0392b',
  Ingredient: '#1a7f5a',
  Menu: '#b86e00',
  Product: '#7048e8',
  Invoice: '#7c2d12',
  Payment: '#047857',
  Order: '#6d28d9',
  Receipt: '#92400e',
  EmailThread: '#0369a1',
  Feedback: '#be185d',
  Decision: '#111827',
  Opportunity: '#2e7d32',
  Risk: '#c62828',
  Task: '#d97706',
  Note: '#888888',
  Event: '#0891b2',
};

const FALLBACK_COLORS = ['#0f766e', '#2563eb', '#b45309', '#be123c', '#7c3aed', '#4d7c0f'];

const tooltipStyle = {
  border: '1px solid #e5e7eb',
  borderRadius: '4px',
  background: '#ffffff',
  boxShadow: '0 4px 12px rgb(15 23 42 / 0.08)',
  fontSize: '12px',
};

function formatCount(value) {
  return Number(value || 0).toLocaleString();
}

function formatMonth(value) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function formatMoney(value) {
  const amount = Number(value || 0) / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function Metric({ icon: Icon, label, value, detail, tone = 'gray' }) {
  const tones = {
    gray: 'border-gray-200 bg-white text-gray-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    rose: 'border-rose-200 bg-rose-50 text-rose-900',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  };

  return (
    <div className={`border p-3 ${tones[tone] || tones.gray}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
        <Icon size={14} aria-hidden="true" />
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
      {detail && <div className="mt-1 text-[11px] opacity-70">{detail}</div>}
    </div>
  );
}

function ChartPanel({ title, action, children }) {
  return (
    <section className="border border-gray-200 bg-white p-4 min-w-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * A compact operational dashboard over the existing admin-only Brain query API.
 * It intentionally keeps the graph and review workflows separate, then gives
 * their current state a quick, quantitative read.
 */
export function BrainInsightsPanel({ accessToken, onSelectType, onOpenReview }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` };
    const query = (body) => fetch(`${API_BASE}/api/brain/query`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }).then(async (response) => {
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || 'Could not load insight data');
      return payload.rows || [];
    });

    try {
      const [entities, relationships, provisional, monthlyActivity] = await Promise.all([
        query({ dataset: 'entities', groupBy: ['type'], limit: 100 }),
        query({ dataset: 'assertions', groupBy: ['relType'], limit: 12 }),
        query({ dataset: 'assertions', groupBy: ['provisional'], limit: 10 }),
        query({ dataset: 'ledger', groupBy: [{ field: 'occurredAt', bucket: 'month' }], limit: 48 }),
      ]);
      setData({ entities, relationships, provisional, monthlyActivity });
    } catch (loadError) {
      setError(loadError.message || 'Could not load insight data');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { load(); }, [load]);

  const entityData = useMemo(() => (
    (data?.entities || [])
      .map((row) => ({ ...row, count: Number(row.count || 0) }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 12)
  ), [data]);

  const relationshipData = useMemo(() => (
    (data?.relationships || [])
      .map((row) => ({ ...row, count: Number(row.count || 0) }))
      .sort((left, right) => right.count - left.count)
  ), [data]);

  const activityData = useMemo(() => (
    (data?.monthlyActivity || [])
      .map((row) => ({
        ...row,
        month: formatMonth(row.occurredAt_month),
        timestamp: new Date(row.occurredAt_month).getTime(),
        count: Number(row.count || 0),
        amount: Number(row.sum_amountCents || 0),
      }))
      .filter((row) => Number.isFinite(row.timestamp))
      .sort((left, right) => left.timestamp - right.timestamp)
  ), [data]);

  const totalEntities = useMemo(
    () => (data?.entities || []).reduce((total, row) => total + Number(row.count || 0), 0),
    [data]
  );
  const assertionTotal = useMemo(
    () => (data?.provisional || []).reduce((total, row) => total + Number(row.count || 0), 0),
    [data]
  );
  const provisionalTotal = useMemo(
    () => (data?.provisional || [])
      .filter((row) => row.provisional === true || row.provisional === 'true')
      .reduce((total, row) => total + Number(row.count || 0), 0),
    [data]
  );
  const confirmedTotal = Math.max(0, assertionTotal - provisionalTotal);
  const latestActivity = activityData[activityData.length - 1];

  if (loading && !data) {
    return <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Loading insights...</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-semibold text-gray-900">Brain insights</h1>
            <p className="mt-0.5 text-xs text-gray-500">Current knowledge shape, review pressure, and source activity.</p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
            Refresh
          </button>
        </div>

        {error && <div className="border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</div>}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={Database} label="Active entities" value={formatCount(totalEntities)} detail={`${data?.entities?.length || 0} types represented`} />
          <Metric icon={GitBranch} label="Active assertions" value={formatCount(assertionTotal)} detail={`${relationshipData.length} relationship types`} />
          <Metric icon={AlertTriangle} label="Awaiting review" value={formatCount(provisionalTotal)} detail={provisionalTotal ? 'Provisional assertions' : 'Review queue is clear'} tone={provisionalTotal ? 'amber' : 'green'} />
          <Metric icon={CheckCircle2} label="Latest source activity" value={latestActivity ? formatCount(latestActivity.count) : '0'} detail={latestActivity ? `${latestActivity.month} ledger events` : 'No dated ledger events'} tone="gray" />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <ChartPanel
            title="Knowledge by entity type"
            action={entityData.length > 0 ? <span className="text-[10px] text-gray-400">Top {entityData.length}</span> : null}
          >
            {entityData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={entityData} layout="vertical" margin={{ top: 2, right: 16, left: 8, bottom: 2 }}>
                    <CartesianGrid horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="type" width={96} tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={tooltipStyle} formatter={(value) => [formatCount(value), 'Entities']} />
                    <Bar dataKey="count" radius={[0, 2, 2, 0]} cursor="pointer" onClick={(entry) => onSelectType?.(entry?.type)}>
                      {entityData.map((entry, index) => (
                        <Cell key={entry.type} fill={ENTITY_COLORS[entry.type] || FALLBACK_COLORS[index % FALLBACK_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <div className="h-80 flex items-center justify-center text-sm text-gray-400">No entity data yet.</div>}
          </ChartPanel>

          <ChartPanel
            title="Most common relationships"
            action={provisionalTotal ? (
              <button type="button" onClick={onOpenReview} className="text-[11px] font-medium text-amber-800 hover:text-amber-950">
                Review {formatCount(provisionalTotal)}
              </button>
            ) : null}
          >
            {relationshipData.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={relationshipData} layout="vertical" margin={{ top: 2, right: 16, left: 8, bottom: 2 }}>
                    <CartesianGrid horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="relType" width={146} tick={{ fontSize: 10, fill: '#475569' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={tooltipStyle} formatter={(value) => [formatCount(value), 'Assertions']} />
                    <Bar dataKey="count" fill="#0f766e" radius={[0, 2, 2, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <div className="h-80 flex items-center justify-center text-sm text-gray-400">No relationship data yet.</div>}
          </ChartPanel>
        </div>

        <ChartPanel
          title="Ledger activity over time"
          action={latestActivity?.amount ? <span className="text-[10px] text-gray-400">Latest amount: {formatMoney(latestActivity.amount)}</span> : null}
        >
          {activityData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData} margin={{ top: 8, right: 16, left: 0, bottom: 2 }}>
                  <defs>
                    <linearGradient id="brainActivityFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} minTickGap={24} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, name) => [formatCount(value), name === 'count' ? 'Events' : name]}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  <Area type="monotone" dataKey="count" name="Events" stroke="#2563eb" strokeWidth={2} fill="url(#brainActivityFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="h-72 flex items-center justify-center text-sm text-gray-400">No dated ledger activity yet.</div>}
          <div className="mt-2 text-[11px] text-gray-400">{formatCount(confirmedTotal)} confirmed assertions are currently active.</div>
        </ChartPanel>
      </div>
    </div>
  );
}