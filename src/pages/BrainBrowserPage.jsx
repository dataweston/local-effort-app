import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { API_BASE } from '../lib/apiBase';
import { SigmaContainer, useLoadGraph, useRegisterEvents, useSigma } from '@react-sigma/core';
import Graph from 'graphology';
import { circular } from 'graphology-layout';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import '@react-sigma/core/lib/style.css';

const ENTITY_TYPES = [
  'Vendor', 'Customer', 'Dish', 'Ingredient', 'Menu', 'Product',
  'Invoice', 'Payment', 'Order', 'Receipt', 'EmailThread', 'Feedback', 'Decision',
  'PriceQuote', 'LedgerTransaction',
  'BusinessLine', 'Offer', 'Occasion', 'Channel', 'CustomerSegment',
  'ProcessStep', 'Constraint', 'Asset', 'Opportunity', 'Risk', 'Metric',
  'NarrativeTheme', 'Supplier', 'Task', 'Note', 'Event',
];

const TYPE_COLORS = {
  // Core
  Vendor:         '#4a6741',
  Customer:       '#3b5bdb',
  Dish:           '#c0392b',
  Ingredient:     '#1a7f5a',
  Menu:           '#b86e00',
  Product:        '#7048e8',
  Invoice:        '#7c2d12',
  Payment:        '#047857',
  Order:          '#6d28d9',
  Receipt:        '#92400e',
  EmailThread:    '#0369a1',
  Feedback:       '#be185d',
  Decision:       '#111827',
  PriceQuote:     '#0f766e',
  LedgerTransaction: '#475569',
  Supplier:       '#2d6a4f',
  // Business model
  BusinessLine:   '#0f4c81',
  Offer:          '#1565c0',
  Occasion:       '#6a0dad',
  Channel:        '#00838f',
  CustomerSegment:'#1b5e20',
  // Operations
  ProcessStep:    '#e65100',
  Constraint:     '#b71c1c',
  Asset:          '#4e342e',
  // Strategy
  Opportunity:    '#2e7d32',
  Risk:           '#c62828',
  Metric:         '#283593',
  NarrativeTheme: '#880e4f',
  // Utility
  Task:           '#d97706',
  Note:           '#888',
  Event:          '#0891b2',
};

const REL_TYPE_COLORS = {
  // Existing
  PRICED_AT:          'bg-blue-100 text-blue-800',
  CONTAINS:           'bg-green-100 text-green-800',
  ORDERED:            'bg-purple-100 text-purple-800',
  PAYMENT_SENT:       'bg-red-100 text-red-800',
  PAYMENT_RECEIVED:   'bg-emerald-100 text-emerald-800',
  SOURCED_FROM:       'bg-amber-100 text-amber-800',
  RECONCILED_WITH:    'bg-sky-100 text-sky-800',
  SPEND_HISTORY:      'bg-orange-100 text-orange-800',
  MENU_SNAPSHOT:      'bg-indigo-100 text-indigo-800',
  APPEARS_ON:         'bg-violet-100 text-violet-800',
  GAVE_FEEDBACK:      'bg-pink-100 text-pink-800',
  // New ontology rel types
  GENERATES_REVENUE_FOR: 'bg-green-200 text-green-900',
  SERVES_SEGMENT:        'bg-blue-200 text-blue-900',
  USES_INGREDIENT:       'bg-lime-100 text-lime-800',
  DEPENDS_ON_SUPPLIER:   'bg-yellow-100 text-yellow-800',
  TRIGGERED_BY_OCCASION: 'bg-purple-200 text-purple-900',
  CONSTRAINED_BY:        'bg-red-200 text-red-900',
  CREATES_CONTENT_ANGLE: 'bg-fuchsia-100 text-fuchsia-800',
  HAS_REPEAT_PATTERN:    'bg-teal-100 text-teal-800',
  CAUSES_COMPLEXITY:     'bg-orange-200 text-orange-900',
  CAN_BE_PACKAGED_AS:    'bg-cyan-100 text-cyan-800',
  EVIDENCED_BY:          'bg-gray-200 text-gray-800',
  CROSS_SELLS_TO:        'bg-indigo-200 text-indigo-900',
  SHOULD_SCALE_BECAUSE:  'bg-emerald-200 text-emerald-900',
  SHOULD_NOT_SCALE_BECAUSE: 'bg-rose-200 text-rose-900',
  HAS_MARGIN_DRIVER:     'bg-green-300 text-green-900',
  SUPPLIED_BY:           'bg-amber-200 text-amber-900',
  USDA_VERIFIED:         'bg-gray-100 text-gray-600',
  ABOUT:                 'bg-gray-100 text-gray-600',
};

function relBadge(relType, provisional) {
  const cls = REL_TYPE_COLORS[relType] || 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono ${cls}`}>
      {relType}
      {provisional && <span className="opacity-60">?</span>}
    </span>
  );
}

// ── Entity detail panel ───────────────────────────────────────────────────────

function EntityPicker({ label, value, accessToken, onChange }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2 || !accessToken) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ q: query.trim(), limit: '8', sort: 'name', order: 'asc' });
    fetch(`${API_BASE}/api/brain/entities?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(r => r.json())
      .then(d => { if (!cancelled) setResults(d.entities || []); })
      .catch(() => { if (!cancelled) setResults([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [query, accessToken]);

  return (
    <div>
      <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</div>
      <div className="rounded border border-gray-200 bg-gray-50 px-2 py-1.5">
        <div className="text-xs font-medium text-gray-900 truncate">{value?.name || 'None selected'}</div>
        <div className="text-[10px] text-gray-400 font-mono truncate">{value?.entityType || 'Entity'} {value?.id || ''}</div>
      </div>
      <input
        className="mt-1 w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-gray-400"
        placeholder={`Search ${label.toLowerCase()}...`}
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      {loading && <div className="mt-1 text-[10px] text-gray-400">Searching...</div>}
      {results.length > 0 && (
        <div className="mt-1 max-h-28 overflow-y-auto border border-gray-200 rounded bg-white">
          {results.map(result => (
            <button
              key={result.id}
              type="button"
              onClick={() => { onChange(result); setQuery(''); setResults([]); }}
              className="block w-full text-left px-2 py-1.5 hover:bg-gray-50 border-b last:border-b-0 border-gray-100"
            >
              <span className="block text-xs text-gray-900 truncate">{result.name}</span>
              <span className="block text-[10px] text-gray-400 font-mono">{result.entityType}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AssertionReviewRow({ assertion, direction, accessToken, onChanged }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState(assertion);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [relType, setRelType] = useState(assertion.relType || '');
  const [src, setSrc] = useState(assertion.src || null);
  const [dst, setDst] = useState(assertion.dst || null);
  const [confidence, setConfidence] = useState(assertion.confidence ?? 0.5);
  const [metadataText, setMetadataText] = useState(JSON.stringify(assertion.metadata || {}, null, 2));
  const [relationships, setRelationships] = useState({});

  const current = detail || assertion;
  const source = current.review?.source;
  const warnings = current.review?.warnings || [];

  async function openReview() {
    setExpanded(v => !v);
    if (expanded || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/brain/assertion/${assertion.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Could not load assertion');
      setDetail(data.assertion);
      setRelationships(data.relationships || {});
      setRelType(data.assertion.relType || '');
      setSrc(data.assertion.src || null);
      setDst(data.assertion.dst || null);
      setConfidence(data.assertion.confidence ?? 0.5);
      setMetadataText(JSON.stringify(data.assertion.metadata || {}, null, 2));
    } catch (err) {
      setError(err.message || 'Could not load assertion');
    } finally {
      setLoading(false);
    }
  }

  async function save({ confirmAfter = false } = {}) {
    setSaving(true);
    setError('');
    try {
      let metadata = {};
      try {
        metadata = metadataText.trim() ? JSON.parse(metadataText) : {};
      } catch {
        throw new Error('Metadata must be valid JSON.');
      }
      const res = await fetch(`${API_BASE}/api/brain/assertion/${assertion.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ relType, srcId: src?.id, dstId: dst?.id, confidence, metadata }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Could not save assertion');
      setDetail(data.assertion);
      if (confirmAfter) {
        await fetch(`${API_BASE}/api/brain/assertions/${assertion.id}/confirm`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      }
      onChanged?.();
    } catch (err) {
      setError(err.message || 'Could not save assertion');
    } finally {
      setSaving(false);
    }
  }

  async function action(kind) {
    setSaving(true);
    setError('');
    try {
      await fetch(`${API_BASE}/api/brain/assertions/${assertion.id}/${kind}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      onChanged?.();
    } catch {
      setError(`Could not ${kind} assertion`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded border border-gray-100 bg-white">
      <div className="flex items-start gap-2 text-sm group p-2">
        {(direction === 'in' || direction === 'queue') && <span className="text-gray-500 text-xs font-mono shrink-0 mt-0.5">{current.src?.entityType}:</span>}
        {(direction === 'in' || direction === 'queue') && <span className="text-gray-800 shrink-0 truncate max-w-[9rem]">{current.src?.name || '-'}</span>}
        <div className="shrink-0 mt-0.5">{relBadge(current.relType, current.provisional)}</div>
        <div className="min-w-0 flex-1">
          {(direction === 'out' || direction === 'queue') && (
            <>
              <span className="text-gray-500 text-xs font-mono">{current.dst?.entityType}:</span>{' '}
              <span className="text-gray-900">{current.dst?.name || '-'}</span>
            </>
          )}
          {warnings.length > 0 && <div className="mt-0.5 text-[10px] text-red-600 truncate">{warnings[0]}</div>}
          {!warnings.length && current.provisional && current.review?.trustedAutoConfirm && (
            <div className="mt-0.5 text-[10px] text-green-700">trusted source shape</div>
          )}
          {current.metadata && Object.keys(current.metadata).length > 0 && (
            <div className="text-xs text-gray-400 font-mono mt-0.5 truncate">
              {Object.entries(current.metadata).slice(0, 3).map(([k, v]) =>
                `${k}=${typeof v === 'object' ? '...' : v}`
              ).join('  ')}
            </div>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          {current.provisional && (
            <button onClick={openReview} disabled={saving} className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded hover:bg-amber-200 disabled:opacity-50">
              Review
            </button>
          )}
          {current.provisional && (
            <button onClick={() => action('confirm')} disabled={saving} className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50">
              OK
            </button>
          )}
          <button onClick={() => action('retract')} disabled={saving} className="text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded hover:bg-red-200 disabled:opacity-50">
            Drop
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 p-3 bg-gray-50 space-y-3">
          {loading ? (
            <div className="text-xs text-gray-400">Loading source...</div>
          ) : (
            <>
              {error && <div className="text-xs text-red-700">{error}</div>}
              <div className="grid grid-cols-2 gap-2">
                <EntityPicker label="Source entity" value={src} accessToken={accessToken} onChange={setSrc} />
                <EntityPicker label="Target entity" value={dst} accessToken={accessToken} onChange={setDst} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Relationship</div>
                  <input list={`rels-${assertion.id}`} value={relType} onChange={e => setRelType(e.target.value.toUpperCase())} className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono" />
                  <datalist id={`rels-${assertion.id}`}>
                    {Object.keys(relationships).map(rel => <option key={rel} value={rel} />)}
                  </datalist>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Confidence</div>
                  <input type="number" min="0" max="1" step="0.05" value={confidence} onChange={e => setConfidence(Number(e.target.value))} className="w-full border border-gray-300 rounded px-2 py-1 text-xs" />
                </div>
              </div>
              {source && (
                <div>
                  <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Source evidence</div>
                  <div className="rounded border border-gray-200 bg-white p-2">
                    <div className="text-[10px] text-gray-400 font-mono mb-1">{source.eventType} / {source.source} / {source.sourceId}</div>
                    {source.subject && <div className="text-xs font-semibold text-gray-800 mb-1">{source.subject}</div>}
                    <div className="text-xs text-gray-700 whitespace-pre-wrap max-h-32 overflow-y-auto">{source.excerpt || 'No readable excerpt in this ledger event.'}</div>
                  </div>
                </div>
              )}
              <div>
                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Metadata JSON</div>
                <textarea value={metadataText} onChange={e => setMetadataText(e.target.value)} rows={5} className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono" />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => save()} disabled={saving} className="text-xs px-2 py-1 border rounded bg-white hover:bg-gray-50 disabled:opacity-50">Save</button>
                {current.provisional && (
                  <button onClick={() => save({ confirmAfter: true })} disabled={saving} className="text-xs px-2 py-1 rounded bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50">Save + confirm</button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function EntityDetail({ id, accessToken, onClose, onUpdated, reviewMode = false }) {
  const [entity, setEntity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = reviewMode ? '?provisionalOnly=true' : '';
    fetch(`${API_BASE}/api/brain/entities/${id}${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(r => r.json())
      .then(d => { setEntity(d.entity); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id, accessToken, reviewMode]);

  useEffect(() => { load(); }, [load]);

  async function handleSaveName() {
    if (!editName.trim() || editName === entity.name) { setEditing(false); return; }
    setSaving(true);
    await fetch(`${API_BASE}/api/brain/entities/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName }),
    });
    setSaving(false);
    setEditing(false);
    onUpdated?.();
    load();
  }

  async function handleTombstone() {
    if (!confirm(`Archive "${entity.name}"? This removes it from active views.`)) return;
    setSaving(true);
    await fetch(`${API_BASE}/api/brain/entities/${id}/tombstone`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    setSaving(false);
    onUpdated?.();
    onClose();
  }

  async function handleAssertionAction(assertionId, action) {
    setActionId(assertionId + action);
    await fetch(`${API_BASE}/api/brain/assertions/${assertionId}/${action}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    setActionId(null);
    load();
  }

  if (loading) return <div className="p-6 text-sm text-gray-400">Loading…</div>;
  if (!entity) return <div className="p-6 text-sm text-red-500">Not found</div>;

  const srcAssertions = (entity.srcAssertions || []).filter(a => !a.retractedAt);
  const dstAssertions = (entity.dstAssertions || []).filter(a => !a.retractedAt);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-gray-200 shrink-0">
        <div className="flex-1 min-w-0 mr-2">
          <div className="text-xs text-gray-400 font-mono uppercase tracking-wide mb-1">{entity.entityType}</div>
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                className="flex-1 text-base font-semibold border-b border-gray-400 focus:outline-none bg-transparent"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveName();
                  if (e.key === 'Escape') setEditing(false);
                }}
              />
              <button onClick={handleSaveName} disabled={saving}
                className="text-xs px-2 py-1 bg-gray-900 text-white rounded disabled:opacity-50">
                {saving ? '…' : 'Save'}
              </button>
              <button onClick={() => setEditing(false)} className="text-xs px-2 py-1 border rounded">Cancel</button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold text-gray-900 leading-tight">{entity.name}</h2>
              <button
                onClick={() => { setEditName(entity.name); setEditing(true); }}
                className="text-gray-400 hover:text-gray-700 text-xs px-1.5 py-0.5 border rounded shrink-0"
              >
                Rename
              </button>
            </div>
          )}
          {entity.status !== 'active' && (
            <span className="text-xs text-amber-600 font-mono">{entity.status}</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={handleTombstone} disabled={saving}
            className="text-xs px-2 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50 disabled:opacity-50">
            Archive
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 text-xl leading-none ml-1">×</button>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 p-4 space-y-4">
        {entity.properties && Object.keys(entity.properties).length > 0 && (
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Properties</div>
            <div className="bg-gray-50 rounded p-3 text-xs font-mono text-gray-700 whitespace-pre-wrap overflow-x-auto">
              {JSON.stringify(entity.properties, null, 2)}
            </div>
          </div>
        )}

        {srcAssertions.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Outgoing ({srcAssertions.length})
            </div>
            <div className="space-y-1.5">
              {srcAssertions.map(a => (
                <div key={a.id} className="flex items-start gap-2 text-sm group">
                  <div className="shrink-0 mt-0.5">{relBadge(a.relType, a.provisional)}</div>
                  <div className="min-w-0 flex-1">
                    <span className="text-gray-500 text-xs font-mono">{a.dst?.entityType}:</span>{' '}
                    <span className="text-gray-900">{a.dst?.name || '—'}</span>
                    {a.metadata && Object.keys(a.metadata).length > 0 && (
                      <div className="text-xs text-gray-400 font-mono mt-0.5 truncate">
                        {Object.entries(a.metadata).slice(0, 3).map(([k, v]) =>
                          `${k}=${typeof v === 'object' ? '…' : v}`
                        ).join('  ')}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {a.provisional && (
                      <button
                        onClick={() => handleAssertionAction(a.id, 'confirm')}
                        disabled={!!actionId}
                        title="Confirm this assertion"
                        className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
                      >
                        ✓
                      </button>
                    )}
                    <button
                      onClick={() => handleAssertionAction(a.id, 'retract')}
                      disabled={!!actionId}
                      title="Retract this assertion"
                      className="text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded hover:bg-red-200 disabled:opacity-50"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {dstAssertions.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Incoming ({dstAssertions.length})
            </div>
            <div className="space-y-1.5">
              {dstAssertions.map(a => (
                <div key={a.id} className="flex items-start gap-2 text-sm group">
                  <span className="text-gray-500 text-xs font-mono shrink-0 mt-0.5">{a.src?.entityType}:</span>
                  <span className="text-gray-800 shrink-0">{a.src?.name || '—'}</span>
                  <div className="shrink-0">{relBadge(a.relType, a.provisional)}</div>
                  <div className="flex gap-1 shrink-0 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                    {a.provisional && (
                      <button
                        onClick={() => handleAssertionAction(a.id, 'confirm')}
                        disabled={!!actionId}
                        title="Confirm"
                        className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
                      >
                        ✓
                      </button>
                    )}
                    <button
                      onClick={() => handleAssertionAction(a.id, 'retract')}
                      disabled={!!actionId}
                      title="Retract"
                      className="text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded hover:bg-red-200 disabled:opacity-50"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-gray-400 font-mono pt-2 border-t border-gray-100">
          id: {entity.id}<br />
          created: {new Date(entity.createdAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}

// ── Search bar ────────────────────────────────────────────────────────────────

function SearchBar({ value, onChange, onSubmit }) {
  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <input
        className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
        placeholder="Search entities…"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      <button type="submit" className="px-4 py-2 bg-gray-900 text-white text-sm rounded hover:bg-gray-700">
        Search
      </button>
    </form>
  );
}

// ── Sigma graph internals ─────────────────────────────────────────────────────

function SmartReviewPanel({ accessToken, enabled, onApplied }) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [queue, setQueue] = useState([]);
  const [automation, setAutomation] = useState({ confirmCount: 0, retractCount: 0 });
  const [summary, setSummary] = useState({ pendingCount: 0, reviewedCount: 0 });
  const [actionKey, setActionKey] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!enabled || !accessToken) return;
    setLoading(true);
    setError('');
    Promise.all([
      fetch(`${API_BASE}/api/brain/assertions/provisional/suggestions?limit=1000`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then(r => r.json()),
      fetch(`${API_BASE}/api/brain/assertions/provisional?limit=25`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then(r => r.json()),
    ])
      .then(([suggestionData, queueData]) => {
        if (!suggestionData.ok) throw new Error(suggestionData.error || 'smart review failed');
        if (!queueData.ok) throw new Error(queueData.error || 'review queue failed');
        setSuggestions(suggestionData.suggestions || []);
        setQueue(queueData.assertions || []);
        setAutomation(suggestionData.automation || { confirmCount: 0, retractCount: 0 });
        setSummary({ pendingCount: suggestionData.pendingCount || 0, reviewedCount: suggestionData.reviewedCount || 0 });
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Could not load smart review suggestions');
        setLoading(false);
      });
  }, [enabled, accessToken]);

  useEffect(() => { load(); }, [load]);

  async function applySuggestion(suggestion) {
    const actionLabel = suggestion.action === 'confirm' ? 'confirm' : 'retract';
    const totalLabel = suggestion.totalCount && suggestion.totalCount > suggestion.count
      ? `${suggestion.count} of ${suggestion.totalCount}`
      : suggestion.count;
    if (!confirm(`${actionLabel} ${totalLabel} provisional assertion${suggestion.count === 1 ? '' : 's'}?`)) return;
    setActionKey(suggestion.key);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/brain/assertions/provisional/bulk`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: suggestion.action,
          assertionIds: suggestion.assertionIds,
          reason: suggestion.reason,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'bulk review failed');
      onApplied?.();
      load();
    } catch (err) {
      setError(err.message || 'Bulk review failed');
    } finally {
      setActionKey(null);
    }
  }

  async function applyAutomation() {
    const total = (automation.confirmCount || 0) + (automation.retractCount || 0);
    if (!total) return;
    if (!confirm(`Apply automatic review rules to ${total} assertion${total === 1 ? '' : 's'}?`)) return;
    setActionKey('automation');
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/brain/assertions/provisional/auto`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: false, limit: 1000 }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'auto review failed');
      onApplied?.();
      load();
    } catch (err) {
      setError(err.message || 'Auto review failed');
    } finally {
      setActionKey(null);
    }
  }

  if (!enabled) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 shrink-0">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-amber-950 uppercase tracking-wide">Smart review</div>
            <div className="text-xs text-amber-800 mt-0.5">
              {loading
                ? 'Learning from prior decisions...'
                : `${summary.pendingCount.toLocaleString()} provisionals scanned; ${summary.reviewedCount.toLocaleString()} prior decisions available.`}
            </div>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="text-xs px-2.5 py-1 rounded border border-amber-300 bg-white text-amber-900 hover:bg-amber-100 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {error && <div className="mt-2 text-xs text-red-700">{error}</div>}

        {((automation.confirmCount || 0) > 0 || (automation.retractCount || 0) > 0) && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded border border-amber-200 bg-white px-3 py-2">
            <div className="text-xs text-amber-900">
              Rules can confirm {automation.confirmCount || 0} trusted-valid and retract {automation.retractCount || 0} structurally invalid assertion{((automation.confirmCount || 0) + (automation.retractCount || 0)) === 1 ? '' : 's'}.
            </div>
            <button
              onClick={applyAutomation}
              disabled={!!actionKey}
              className="shrink-0 text-xs px-2.5 py-1 rounded bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50"
            >
              {actionKey === 'automation' ? 'Applying...' : 'Apply rules'}
            </button>
          </div>
        )}

        {!loading && suggestions.length === 0 && (
          <div className="mt-2 text-xs text-amber-800">
            No safe batch suggestions yet. Confirm or retract a few examples and this panel will start grouping similar ones.
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {suggestions.map(s => (
              <div key={s.key} className="bg-white border border-amber-200 rounded p-3 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {relBadge(s.relType, true)}
                      <span className="text-gray-500 font-mono">{s.srcType} -&gt; {s.dstType}</span>
                    </div>
                    <div className="mt-1 text-gray-700 line-clamp-2">{s.reason}</div>
                  </div>
                  <button
                    onClick={() => applySuggestion(s)}
                    disabled={!!actionKey}
                    className={`shrink-0 px-2 py-1 rounded font-medium disabled:opacity-50 ${
                      s.action === 'confirm'
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                  >
                    {actionKey === s.key ? '...' : `${s.action} ${s.count}`}
                  </button>
                </div>
                <div className="mt-2 text-gray-400 font-mono">
                  score {Math.round((s.score || 0) * 100)}% &middot; source {s.sourceType}
                  {s.totalCount > s.count ? `; first ${s.count} of ${s.totalCount}` : ''}
                </div>
                {s.samples?.length > 0 && (
                  <div className="mt-2 space-y-1 text-gray-500">
                    {s.samples.slice(0, 2).map(sample => (
                      <div key={sample.id} className="truncate">
                        {sample.src?.name || 'unknown'} -&gt; {sample.dst?.name || 'unknown'}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {queue.length > 0 && (
          <div className="mt-4">
            <div className="text-xs font-semibold text-amber-950 uppercase tracking-wide mb-2">Review queue</div>
            <div className="grid gap-2 lg:grid-cols-2">
              {queue.map(assertion => (
                <AssertionReviewRow
                  key={assertion.id}
                  assertion={assertion}
                  direction="queue"
                  accessToken={accessToken}
                  onChanged={() => { onApplied?.(); load(); }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GraphLoader({ entities, onNodeClick }) {
  const loadGraph = useLoadGraph();
  const registerEvents = useRegisterEvents();
  const sigma = useSigma();

  useEffect(() => {
    if (!entities.length) return;
    const graph = new Graph({ multi: false, type: 'directed' });

    entities.forEach(e => {
      if (!graph.hasNode(e.id)) {
        graph.addNode(e.id, {
          label: e.name,
          size: Math.max(4, Math.min(18, 4 + Math.sqrt(e.assertionCount || 0) * 2)),
          color: TYPE_COLORS[e.entityType] || '#999',
          x: Math.random(),
          y: Math.random(),
        });
      }
    });

    loadGraph(graph);
    circular.assign(graph);
    forceAtlas2.assign(graph, { iterations: 120, settings: { gravity: 1, scalingRatio: 2, barnesHutOptimize: true } });
  }, [entities, loadGraph]);

  useEffect(() => {
    registerEvents({
      clickNode: ({ node }) => onNodeClick(node),
      doubleClickStage: () => sigma.getCamera().setState({ x: 0.5, y: 0.5, ratio: 1 }),
    });
  }, [registerEvents, onNodeClick, sigma]);

  return null;
}

function GraphView({ entities, onNodeClick, selectedId }) {
  if (!entities.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
        No entities to display
      </div>
    );
  }

  return (
    <div className="flex-1 relative" style={{ minHeight: 0 }}>
      {/* Type legend */}
      <div className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur rounded shadow-sm p-2 flex flex-wrap gap-x-3 gap-y-1 max-w-xs text-xs text-gray-600">
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <span key={type} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: color }} />
            {type}
          </span>
        ))}
      </div>
      <SigmaContainer
        style={{ width: '100%', height: '100%' }}
        settings={{
          renderLabels: entities.length < 150,
          labelSize: 11,
          labelColor: { color: '#374151' },
          defaultEdgeColor: '#d1d5db',
          defaultEdgeType: 'arrow',
          nodeReducer: (node, data) => ({
            ...data,
            highlighted: node === selectedId,
            size: node === selectedId ? data.size * 1.5 : data.size,
          }),
        }}
      >
        <GraphLoader entities={entities} onNodeClick={onNodeClick} />
      </SigmaContainer>
      <div className="absolute bottom-3 right-3 text-xs text-gray-400 bg-white/80 rounded px-2 py-1 pointer-events-none">
        scroll=zoom · drag=pan · click=inspect · dbl-click=reset
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BrainBrowserPage() {
  const auth = useSupabaseAuth();

  const [viewMode, setViewMode] = useState('table');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [sort, setSort] = useState('updatedAt');
  const [reviewMode, setReviewMode] = useState(false);
  const [entities, setEntities] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const LIMIT = 50;

  const fetchEntities = useCallback((q, type, sortField, off) => {
    if (!auth.accessToken) return;
    setLoading(true);
    const params = new URLSearchParams({ limit: LIMIT, offset: off, sort: sortField, order: 'desc' });
    if (type) params.set('type', type);
    if (q) params.set('q', q);
    if (reviewMode) params.set('provisionalOnly', 'true');
    fetch(`${API_BASE}/api/brain/entities?${params}`, {
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    })
      .then(r => r.json())
      .then(d => {
        setEntities(d.entities || []);
        setTotal(d.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [auth.accessToken, reviewMode]);

  useEffect(() => {
    fetchEntities(activeQuery, typeFilter, sort, offset);
  }, [activeQuery, typeFilter, sort, offset, fetchEntities]);

  const handleSearch = e => {
    e.preventDefault();
    setOffset(0);
    setActiveQuery(searchInput);
  };

  const handleTypeFilter = t => {
    setTypeFilter(t);
    setOffset(0);
    setSelectedId(null);
  };

  const handleRefresh = () => fetchEntities(activeQuery, typeFilter, sort, offset);

  if (!auth.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
        Admin access required
      </div>
    );
  }

  const showDetail = !!selectedId;

  return (
    <div className="fullpage-demo-scope min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-base font-semibold font-display text-gray-900">Brain Browser</h1>
            <div className="text-xs text-gray-400">{total.toLocaleString()} entities</div>
          </div>
          <div className="flex-1 max-w-md">
            <SearchBar value={searchInput} onChange={setSearchInput} onSubmit={handleSearch} />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setReviewMode(v => !v); setOffset(0); setSelectedId(null); }}
              className={`px-3 py-1.5 rounded border text-xs font-medium ${reviewMode ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
            >
              Provisional review
            </button>
            {/* View toggle */}
            <div className="flex rounded border border-gray-300 overflow-hidden text-xs">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 ${viewMode === 'table' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                Table
              </button>
              <button
                onClick={() => setViewMode('graph')}
                className={`px-3 py-1.5 ${viewMode === 'graph' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                Graph
              </button>
            </div>
            {viewMode === 'table' && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Sort:</span>
                {['updatedAt', 'name', 'assertionCount'].map(s => (
                  <button
                    key={s}
                    onClick={() => { setSort(s); setOffset(0); }}
                    className={`px-2 py-1 rounded ${sort === s ? 'bg-gray-900 text-white' : 'hover:bg-gray-100'}`}
                  >
                    {s === 'updatedAt' ? 'recent' : s === 'assertionCount' ? 'activity' : 'name'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Type filter strip */}
      <div className="bg-white border-b border-gray-100 px-4 py-2 shrink-0">
        <div className="max-w-7xl mx-auto flex gap-1.5 overflow-x-auto">
          <button
            onClick={() => handleTypeFilter('')}
            className={`shrink-0 px-3 py-1 text-xs rounded-full border ${!typeFilter ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 text-gray-600 hover:border-gray-500'}`}
          >
            All
          </button>
          {ENTITY_TYPES.map(t => (
            <button
              key={t}
              onClick={() => handleTypeFilter(t)}
              className={`shrink-0 px-3 py-1 text-xs rounded-full border ${typeFilter === t ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 text-gray-600 hover:border-gray-500'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <SmartReviewPanel
        accessToken={auth.accessToken}
        enabled={reviewMode}
        onApplied={handleRefresh}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden max-w-7xl w-full mx-auto" style={{ minHeight: 0 }}>
        {viewMode === 'graph' ? (
          <>
            <div className={`flex overflow-hidden ${showDetail ? 'w-1/2' : 'w-full'}`} style={{ minHeight: 0 }}>
              {loading ? (
                <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Loading…</div>
              ) : (
                <GraphView
                  entities={entities}
                  selectedId={selectedId}
                  onNodeClick={id => setSelectedId(id === selectedId ? null : id)}
                />
              )}
            </div>
            {showDetail && (
              <div className="w-1/2 bg-white border-l border-gray-200 overflow-hidden flex flex-col">
                <EntityDetail
                  id={selectedId}
                  accessToken={auth.accessToken}
                  onClose={() => setSelectedId(null)}
                  onUpdated={handleRefresh}
                  reviewMode={reviewMode}
                />
              </div>
            )}
          </>
        ) : (
          <>
            {/* Table view */}
            <div className={`flex flex-col overflow-hidden ${showDetail ? 'w-1/2' : 'w-full'} border-r border-gray-200`}>
              {loading ? (
                <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Loading…</div>
              ) : entities.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-sm text-gray-400">No entities found</div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Type</th>
                          <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                          <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Links</th>
                          <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28 hidden md:table-cell">Last signal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {entities.map(e => (
                          <tr
                            key={e.id}
                            onClick={() => setSelectedId(e.id === selectedId ? null : e.id)}
                            className={`cursor-pointer transition-colors ${e.id === selectedId ? 'bg-gray-900 text-white' : 'hover:bg-gray-50'}`}
                          >
                            <td className="px-4 py-2.5">
                              <span
                                className="text-xs font-mono px-1.5 py-0.5 rounded"
                                style={e.id !== selectedId
                                  ? { backgroundColor: (TYPE_COLORS[e.entityType] || '#999') + '22', color: TYPE_COLORS[e.entityType] || '#555' }
                                  : { backgroundColor: '#374151', color: '#e5e7eb' }
                                }
                              >
                                {e.entityType}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 font-medium truncate max-w-0">
                              <span className="block truncate">{e.name}</span>
                              {e.provisionalCount > 0 && (
                                <span className={`inline-block mt-1 text-[10px] font-mono px-1.5 py-0.5 rounded ${e.id === selectedId ? 'bg-amber-200 text-amber-950' : 'bg-amber-100 text-amber-800'}`}>
                                  {e.provisionalCount} provisional
                                </span>
                              )}
                            </td>
                            <td className={`px-4 py-2.5 text-right font-mono text-xs ${e.id === selectedId ? 'text-gray-300' : 'text-gray-400'}`}>
                              {e.assertionCount}
                            </td>
                            <td className={`px-4 py-2.5 text-right font-mono text-xs hidden md:table-cell ${e.id === selectedId ? 'text-gray-300' : 'text-gray-400'}`}>
                              {e.lastSignalAt ? new Date(e.lastSignalAt).toLocaleDateString() : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="shrink-0 border-t border-gray-200 px-4 py-2 flex items-center justify-between bg-white text-xs text-gray-500">
                    <span>{offset + 1}–{Math.min(offset + LIMIT, total)} of {total.toLocaleString()}</span>
                    <div className="flex gap-2">
                      <button
                        disabled={offset === 0}
                        onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                        className="px-3 py-1 border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50"
                      >
                        ← Prev
                      </button>
                      <button
                        disabled={offset + LIMIT >= total}
                        onClick={() => setOffset(offset + LIMIT)}
                        className="px-3 py-1 border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Detail panel */}
            {showDetail && (
              <div className="w-1/2 bg-white overflow-hidden flex flex-col">
                <EntityDetail
                  id={selectedId}
                  accessToken={auth.accessToken}
                  onClose={() => setSelectedId(null)}
                  onUpdated={handleRefresh}
                  reviewMode={reviewMode}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
