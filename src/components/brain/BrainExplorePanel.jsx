import React, { useEffect, useMemo, useState } from 'react';
import { Download, Play, Plus, X } from 'lucide-react';
import { API_BASE } from '../../lib/apiBase';

const OPS = [
  { value: 'equals', label: '=' },
  { value: 'not_equals', label: '≠' },
  { value: 'contains', label: 'contains' },
  { value: 'gte', label: '≥' },
  { value: 'lte', label: '≤' },
];

const PRESETS = [
  {
    label: 'Entities by type',
    query: { dataset: 'entities', filters: [], groupBy: ['type'] },
  },
  {
    label: 'Ledger volume by source × month',
    query: { dataset: 'ledger', filters: [], groupBy: ['source', { field: 'occurredAt', bucket: 'month' }] },
  },
  {
    label: 'Spend by month',
    query: { dataset: 'ledger', filters: [{ field: 'eventType', op: 'equals', value: 'payment.completed' }], groupBy: [{ field: 'occurredAt', bucket: 'month' }] },
  },
  {
    label: 'Menu feedback (rows)',
    query: { dataset: 'ledger', filters: [{ field: 'eventType', op: 'equals', value: 'menu.feedback' }], groupBy: [] },
  },
  {
    label: 'Assertions by relType × source',
    query: { dataset: 'assertions', filters: [], groupBy: ['relType', 'sourceType'] },
  },
  {
    label: 'Inbox by source × status',
    query: { dataset: 'inbox', filters: [], groupBy: ['source', 'status'] },
  },
];

function formatCell(value) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function toCsv(columns, rows) {
  const escape = (v) => {
    const s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [columns.join(',')];
  for (const row of rows) {
    lines.push(columns.map((c) => escape(row[c])).join(','));
  }
  return lines.join('\n');
}

/**
 * Self-serve query builder over the brain's datasets — filter, group, export.
 * Backed by POST /api/brain/query (whitelisted fields, parameterized values).
 */
export function BrainExplorePanel({ accessToken }) {
  const [schema, setSchema] = useState(null);
  const [dataset, setDataset] = useState('entities');
  const [filters, setFilters] = useState([]);
  const [groupBy, setGroupBy] = useState([]); // [{ field, bucket }]
  const [limit, setLimit] = useState(200);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    fetch(`${API_BASE}/api/brain/query/schema`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.json())
      .then((d) => { if (d.ok) setSchema(d.datasets); })
      .catch(() => {});
  }, [accessToken]);

  const ds = schema?.[dataset];
  const fields = ds?.fields || [];

  async function run(overrideQuery = null) {
    if (!accessToken) return;
    const query = overrideQuery || {
      dataset,
      filters: filters.filter((f) => f.field && f.op && String(f.value ?? '').length > 0),
      groupBy: groupBy.filter((g) => g.field).map((g) => (g.bucket ? { field: g.field, bucket: g.bucket } : g.field)),
      limit,
    };
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/brain/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(query),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'query failed');
      setResult(data);
    } catch (err) {
      setError(err.message || 'query failed');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function applyPreset(preset) {
    const q = preset.query;
    setDataset(q.dataset);
    setFilters((q.filters || []).map((f) => ({ ...f })));
    setGroupBy((q.groupBy || []).map((g) => (typeof g === 'string' ? { field: g, bucket: '' } : { field: g.field, bucket: g.bucket })));
    run({ ...q, limit });
  }

  function downloadCsv() {
    if (!result?.rows?.length) return;
    const csv = toCsv(result.columns, result.rows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brain-${dataset}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const visibleColumns = useMemo(() => {
    if (!result) return [];
    // Hide bulky text columns in group mode; keep everything in rows mode
    return result.columns.filter((c) => c !== 'payloadText');
  }, [result]);

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        {/* Presets */}
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className="px-2.5 py-1 text-xs rounded-full border border-gray-300 bg-white text-gray-700 hover:border-gray-500"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Query builder */}
        <div className="bg-white rounded border border-gray-200 p-4 space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Dataset</div>
              <select
                value={dataset}
                onChange={(e) => { setDataset(e.target.value); setFilters([]); setGroupBy([]); setResult(null); }}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
              >
                {Object.keys(schema || { entities: 1, assertions: 1, ledger: 1, inferences: 1, inbox: 1 }).map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Limit</div>
              <input
                type="number"
                min="1"
                max="2000"
                value={limit}
                onChange={(e) => setLimit(Math.min(2000, Math.max(1, parseInt(e.target.value) || 200)))}
                className="w-24 border border-gray-300 rounded px-2 py-1.5 text-sm"
              />
            </div>
            <button
              onClick={() => run()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gray-900 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50"
            >
              <Play size={13} /> {loading ? 'Running…' : 'Run'}
            </button>
            {result?.rows?.length > 0 && (
              <button
                onClick={downloadCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 bg-white text-sm rounded text-gray-700 hover:bg-gray-50"
              >
                <Download size={13} /> CSV
              </button>
            )}
          </div>

          {/* Filters */}
          <div>
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Filters</div>
            <div className="space-y-1.5">
              {filters.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <select
                    value={f.field}
                    onChange={(e) => setFilters(filters.map((x, j) => (j === i ? { ...x, field: e.target.value } : x)))}
                    className="border border-gray-300 rounded px-2 py-1 text-xs bg-white"
                  >
                    <option value="">field…</option>
                    {fields.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                  <select
                    value={f.op}
                    onChange={(e) => setFilters(filters.map((x, j) => (j === i ? { ...x, op: e.target.value } : x)))}
                    className="border border-gray-300 rounded px-2 py-1 text-xs bg-white"
                  >
                    {OPS.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
                  </select>
                  <input
                    value={f.value ?? ''}
                    onChange={(e) => setFilters(filters.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                    onKeyDown={(e) => e.key === 'Enter' && run()}
                    placeholder={ds?.dateFields?.includes(f.field) ? 'YYYY-MM-DD' : 'value'}
                    className="flex-1 max-w-xs border border-gray-300 rounded px-2 py-1 text-xs"
                  />
                  <button onClick={() => setFilters(filters.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-600 p-1">
                    <X size={13} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setFilters([...filters, { field: '', op: 'equals', value: '' }])}
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800"
              >
                <Plus size={12} /> Add filter
              </button>
            </div>
          </div>

          {/* Group by */}
          <div>
            <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Group by <span className="normal-case font-normal text-gray-400">(empty = raw rows)</span>
            </div>
            <div className="space-y-1.5">
              {groupBy.map((g, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <select
                    value={g.field}
                    onChange={(e) => setGroupBy(groupBy.map((x, j) => (j === i ? { ...x, field: e.target.value, bucket: '' } : x)))}
                    className="border border-gray-300 rounded px-2 py-1 text-xs bg-white"
                  >
                    <option value="">field…</option>
                    {fields.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                  {ds?.dateFields?.includes(g.field) && (
                    <select
                      value={g.bucket || ''}
                      onChange={(e) => setGroupBy(groupBy.map((x, j) => (j === i ? { ...x, bucket: e.target.value } : x)))}
                      className="border border-gray-300 rounded px-2 py-1 text-xs bg-white"
                    >
                      <option value="">exact</option>
                      <option value="day">by day</option>
                      <option value="week">by week</option>
                      <option value="month">by month</option>
                    </select>
                  )}
                  <button onClick={() => setGroupBy(groupBy.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-600 p-1">
                    <X size={13} />
                  </button>
                </div>
              ))}
              {groupBy.length < 3 && (
                <button
                  onClick={() => setGroupBy([...groupBy, { field: '', bucket: '' }])}
                  className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800"
                >
                  <Plus size={12} /> Add group field
                </button>
              )}
            </div>
          </div>

          {error && <div className="text-xs text-red-700">{error}</div>}
        </div>

        {/* Results */}
        {result && (
          <div className="bg-white rounded border border-gray-200 overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>{result.rows.length} row{result.rows.length === 1 ? '' : 's'} · {result.mode === 'group' ? 'grouped' : 'raw'}</span>
            </div>
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                  <tr>
                    {visibleColumns.map((c) => (
                      <th key={c} className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {result.rows.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      {visibleColumns.map((c) => (
                        <td key={c} className="px-3 py-1.5 text-xs text-gray-800 max-w-md truncate" title={typeof row[c] === 'string' ? row[c] : undefined}>
                          {formatCell(row[c])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.rows.length === 0 && (
                <div className="py-10 text-center text-sm text-gray-400">No rows matched.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
