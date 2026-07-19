import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { API_BASE } from '../lib/apiBase';
import { SigmaContainer, useLoadGraph, useRegisterEvents, useSigma } from '@react-sigma/core';
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, Crosshair, LayoutGrid, Maximize2, Network, RotateCcw, Search as SearchIcon, SlidersHorizontal, X } from 'lucide-react';
import Graph from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import '@react-sigma/core/lib/style.css';
import { BrainExplorePanel } from '../components/brain/BrainExplorePanel';
import { BrainInsightsPanel } from '../components/brain/BrainInsightsPanel';
import { BrainQualityPanel } from '../components/brain/BrainQualityPanel';

const ENTITY_TYPES = [
  'Vendor', 'Customer', 'Dish', 'Ingredient', 'Menu', 'Product',
  'Invoice', 'Payment', 'Order', 'Receipt', 'EmailThread', 'Feedback', 'Decision',
  'PriceQuote', 'LedgerTransaction', 'PriceReference',
  'BusinessLine', 'Offer', 'Occasion', 'Channel', 'CustomerSegment',
  'ProcessStep', 'Constraint', 'Asset', 'Opportunity', 'Risk', 'Metric',
  'NarrativeTheme', 'Supplier', 'Task', 'Note', 'Event', 'Campaign',
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
  PriceReference: '#8a8475',
  Supplier:       '#2d6a4f',
  // Business model
  BusinessLine:   '#0f4c81',
  Offer:          '#1565c0',
  Occasion:       '#6a0dad',
  Channel:        '#00838f',
  Campaign:       '#ad1457',
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
  QUOTED:             'bg-emerald-100 text-emerald-800',
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
  const [showMerge, setShowMerge] = useState(false);
  const [mergeTarget, setMergeTarget] = useState(null);
  const [mergeError, setMergeError] = useState('');

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

  async function handleMerge() {
    if (!mergeTarget?.id) return;
    if (!confirm(`Merge "${entity.name}" into "${mergeTarget.name}" (${mergeTarget.entityType})? This entity's assertions and aliases move to the target, then it is archived.`)) return;
    setSaving(true);
    setMergeError('');
    try {
      const res = await fetch(`${API_BASE}/api/brain/entities/${id}/merge-into/${mergeTarget.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'merge failed');
      onUpdated?.();
      onClose();
    } catch (err) {
      setMergeError(err.message || 'merge failed');
    } finally {
      setSaving(false);
    }
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
          <button onClick={() => setShowMerge(v => !v)} disabled={saving}
            className={`text-xs px-2 py-1 border rounded disabled:opacity-50 ${showMerge ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
            Merge…
          </button>
          <button onClick={handleTombstone} disabled={saving}
            className="text-xs px-2 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50 disabled:opacity-50">
            Archive
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 text-xl leading-none ml-1">×</button>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 p-4 space-y-4">
        {showMerge && (
          <div className="rounded border border-gray-200 bg-gray-50 p-3 space-y-2">
            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Merge this entity into…
            </div>
            <EntityPicker label="Surviving entity" value={mergeTarget} accessToken={accessToken} onChange={setMergeTarget} />
            {mergeError && <div className="text-xs text-red-700">{mergeError}</div>}
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowMerge(false); setMergeTarget(null); }} className="text-xs px-2 py-1 border rounded bg-white">Cancel</button>
              <button
                onClick={handleMerge}
                disabled={saving || !mergeTarget || mergeTarget.id === id}
                className="text-xs px-2 py-1 rounded bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50"
              >
                {saving ? 'Merging…' : 'Merge into target'}
              </button>
            </div>
          </div>
        )}
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
      <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm rounded hover:bg-gray-700">
        <SearchIcon size={15} aria-hidden="true" />
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

function graphPosition(id, layoutMode, typeIndex, typeCount) {
  let xHash = 2166136261;
  let yHash = 2166136261;
  for (let index = 0; index < id.length; index += 1) {
    const code = id.charCodeAt(index);
    xHash = Math.imul(xHash ^ code, 16777619);
    yHash = Math.imul(yHash ^ (code + index), 2246822519);
  }
  const unitX = ((xHash >>> 0) % 997) / 997;
  const unitY = ((yHash >>> 0) % 991) / 991;
  if (layoutMode !== 'groups') return { x: unitX, y: unitY };

  // Stable type clusters make the map interpretable before the user touches it.
  const angle = ((typeIndex || 0) / Math.max(1, typeCount)) * Math.PI * 2 - Math.PI / 2;
  const clusterRadius = typeCount > 1 ? 0.34 : 0;
  const jitterAngle = unitX * Math.PI * 2;
  const jitterRadius = 0.04 + unitY * 0.13;
  return {
    x: 0.5 + Math.cos(angle) * clusterRadius + Math.cos(jitterAngle) * jitterRadius,
    y: 0.5 + Math.sin(angle) * clusterRadius + Math.sin(jitterAngle) * jitterRadius,
  };
}

const RELATION_COLORS = ['#0f766e', '#2563eb', '#b45309', '#be123c', '#6d28d9', '#4d7c0f', '#0369a1', '#9f1239'];

function relationshipColor(relType = '', provisional) {
  if (provisional) return '#d6a84b';
  let hash = 0;
  for (let index = 0; index < relType.length; index += 1) {
    hash = ((hash << 5) - hash) + relType.charCodeAt(index);
    hash |= 0;
  }
  return RELATION_COLORS[Math.abs(hash) % RELATION_COLORS.length];
}

function relationshipLabel(relType) {
  return relType.toLowerCase().replaceAll('_', ' ');
}

function GraphLoader({ nodes, edges, layoutMode, sizeMode, onNodeClick, onNodeHover, onStageClick }) {
  const loadGraph = useLoadGraph();
  const registerEvents = useRegisterEvents();
  const sigma = useSigma();

  useEffect(() => {
    const graph = new Graph({ multi: true, type: 'directed' });
    const typeOrder = [...new Set(nodes.map(node => node.entityType))].sort();
    const typeIndex = new Map(typeOrder.map((type, index) => [type, index]));
    const visibleDegree = new Map(nodes.map(node => [node.id, 0]));
    edges.forEach(edge => {
      visibleDegree.set(edge.source, (visibleDegree.get(edge.source) || 0) + 1);
      visibleDegree.set(edge.target, (visibleDegree.get(edge.target) || 0) + 1);
    });

    nodes.forEach(e => {
      if (!graph.hasNode(e.id)) {
        const position = graphPosition(e.id, layoutMode, typeIndex.get(e.entityType), typeOrder.length);
        const magnitude = sizeMode === 'uniform'
          ? 1
          : sizeMode === 'visible'
            ? visibleDegree.get(e.id) || 0
            : e.assertionCount || 0;
        graph.addNode(e.id, {
          label: e.name,
          size: sizeMode === 'uniform' ? 5 : Math.max(4, Math.min(17, 4 + Math.sqrt(magnitude) * 1.65)),
          color: TYPE_COLORS[e.entityType] || '#999',
          x: position.x,
          y: position.y,
          entityType: e.entityType,
          activity: e.assertionCount || 0,
          degree: visibleDegree.get(e.id) || 0,
        });
      }
    });

    (edges || []).forEach(edge => {
      if (!graph.hasNode(edge.source) || !graph.hasNode(edge.target)) return;
      if (edge.source === edge.target) return;
      graph.addDirectedEdgeWithKey(edge.id, edge.source, edge.target, {
        label: edge.relType,
        size: edge.provisional ? 1 : 1.25,
        color: relationshipColor(edge.relType, edge.provisional),
      });
    });

    if (graph.order > 1 && layoutMode === 'network') {
      forceAtlas2.assign(graph, {
        iterations: Math.min(220, Math.max(90, graph.order)),
        settings: { gravity: 0.8, scalingRatio: 7, slowDown: 2, barnesHutOptimize: graph.order > 80 },
      });
    }
    loadGraph(graph);
  }, [nodes, edges, layoutMode, loadGraph, sizeMode]);

  useEffect(() => {
    registerEvents({
      clickNode: ({ node }) => onNodeClick(node),
      enterNode: ({ node }) => onNodeHover(node),
      leaveNode: () => onNodeHover(null),
      clickStage: () => onStageClick?.(),
      doubleClickStage: () => sigma.getCamera().animatedReset({ duration: 350 }),
    });
  }, [registerEvents, onNodeClick, onNodeHover, onStageClick, sigma]);

  return null;
}

function GraphCameraBinding({ sigmaRef }) {
  const sigma = useSigma();

  useEffect(() => {
    sigmaRef.current = sigma;
    return () => { sigmaRef.current = null; };
  }, [sigma, sigmaRef]);

  return null;
}

function GraphView({ nodes, edges, onNodeClick, selectedId }) {
  const [hiddenTypes, setHiddenTypes] = useState([]);
  const [hiddenRelationships, setHiddenRelationships] = useState([]);
  const [showProvisional, setShowProvisional] = useState(true);
  const [hideOrphans, setHideOrphans] = useState(false);
  const [focusDepth, setFocusDepth] = useState(0);
  const [labelMode, setLabelMode] = useState('auto');
  const [layoutMode, setLayoutMode] = useState('network');
  const [sizeMode, setSizeMode] = useState('visible');
  const [hoveredId, setHoveredId] = useState(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [nodeQuery, setNodeQuery] = useState('');
  const sigmaRef = useRef(null);

  const availableTypes = useMemo(
    () => [...new Set(nodes.map(node => node.entityType))].sort(),
    [nodes]
  );
  const availableRelationships = useMemo(
    () => [...new Set(edges.map(edge => edge.relType))].sort(),
    [edges]
  );

  const { visibleNodes, visibleEdges } = useMemo(() => {
    const typeVisibleNodes = nodes.filter(node => !hiddenTypes.includes(node.entityType));
    const typeVisibleIds = new Set(typeVisibleNodes.map(node => node.id));
    const filteredEdges = edges.filter(edge => (
      typeVisibleIds.has(edge.source) &&
      typeVisibleIds.has(edge.target) &&
      (showProvisional || !edge.provisional) &&
      !hiddenRelationships.includes(edge.relType)
    ));

    let visibleIds = new Set(typeVisibleIds);
    if (selectedId && focusDepth > 0 && typeVisibleIds.has(selectedId)) {
      const adjacency = new Map();
      filteredEdges.forEach(edge => {
        if (!adjacency.has(edge.source)) adjacency.set(edge.source, new Set());
        if (!adjacency.has(edge.target)) adjacency.set(edge.target, new Set());
        adjacency.get(edge.source).add(edge.target);
        adjacency.get(edge.target).add(edge.source);
      });
      const focusedIds = new Set([selectedId]);
      let frontier = new Set([selectedId]);
      for (let depth = 0; depth < focusDepth; depth += 1) {
        const next = new Set();
        frontier.forEach(id => (adjacency.get(id) || new Set()).forEach(neighbor => {
          if (!focusedIds.has(neighbor)) next.add(neighbor);
        }));
        next.forEach(id => focusedIds.add(id));
        frontier = next;
      }
      visibleIds = focusedIds;
    }

    if (hideOrphans) {
      const connectedIds = new Set();
      filteredEdges.forEach(edge => {
        if (visibleIds.has(edge.source) && visibleIds.has(edge.target)) {
          connectedIds.add(edge.source);
          connectedIds.add(edge.target);
        }
      });
      visibleIds = new Set([...visibleIds].filter(id => connectedIds.has(id)));
    }

    return {
      visibleNodes: nodes.filter(node => visibleIds.has(node.id)),
      visibleEdges: filteredEdges.filter(edge => visibleIds.has(edge.source) && visibleIds.has(edge.target)),
    };
  }, [edges, focusDepth, hiddenRelationships, hiddenTypes, hideOrphans, nodes, selectedId, showProvisional]);

  const activeNodeId = hoveredId || selectedId;
  const activeNeighborhood = useMemo(() => {
    if (!activeNodeId) return new Set();
    const neighbors = new Set([activeNodeId]);
    visibleEdges.forEach(edge => {
      if (edge.source === activeNodeId) neighbors.add(edge.target);
      if (edge.target === activeNodeId) neighbors.add(edge.source);
    });
    return neighbors;
  }, [activeNodeId, visibleEdges]);
  const activeEdgeIds = useMemo(() => new Set(
    visibleEdges
      .filter(edge => edge.source === activeNodeId || edge.target === activeNodeId)
      .map(edge => edge.id)
  ), [activeNodeId, visibleEdges]);
  const nodeById = useMemo(() => new Map(visibleNodes.map(node => [node.id, node])), [visibleNodes]);
  const visibleTypeSummary = useMemo(() => (
    visibleNodes.reduce((summary, node) => {
      summary[node.entityType] = (summary[node.entityType] || 0) + 1;
      return summary;
    }, {})
  ), [visibleNodes]);
  const relationshipSummary = useMemo(() => (
    Object.entries(visibleEdges.reduce((summary, edge) => {
      summary[edge.relType] = (summary[edge.relType] || 0) + 1;
      return summary;
    }, {}))
      .map(([relType, count]) => ({ relType, count }))
      .sort((left, right) => right.count - left.count)
  ), [visibleEdges]);
  const selectedNode = selectedId ? nodeById.get(selectedId) : null;
  const selectedConnections = useMemo(() => (
    selectedId ? visibleEdges.filter(edge => edge.source === selectedId || edge.target === selectedId) : []
  ), [selectedId, visibleEdges]);
  const selectedOutgoing = selectedConnections.filter(edge => edge.source === selectedId).length;
  const selectedIncoming = selectedConnections.length - selectedOutgoing;
  const hoveredNode = hoveredId ? nodeById.get(hoveredId) : null;
  const nodeMatches = useMemo(() => {
    const query = nodeQuery.trim().toLowerCase();
    if (query.length < 2) return [];
    return visibleNodes
      .filter(node => node.name.toLowerCase().includes(query) || node.entityType.toLowerCase().includes(query))
      .sort((left, right) => (right.assertionCount || 0) - (left.assertionCount || 0))
      .slice(0, 7);
  }, [nodeQuery, visibleNodes]);

  const toggleHiddenFilter = (value, setFilters) => {
    setFilters(current => current.includes(value)
      ? current.filter(item => item !== value)
      : [...current, value]);
  };

  const resetGraph = () => {
    setHiddenTypes([]);
    setHiddenRelationships([]);
    setShowProvisional(true);
    setHideOrphans(false);
    setFocusDepth(0);
    setLabelMode('auto');
    setLayoutMode('network');
    setSizeMode('visible');
    setHoveredId(null);
    setNodeQuery('');
    sigmaRef.current?.getCamera().animatedReset({ duration: 350 });
  };

  const isolateType = type => setHiddenTypes(current => (
    current.length === availableTypes.length - 1 && !current.includes(type)
      ? []
      : availableTypes.filter(candidate => candidate !== type)
  ));

  const isolateRelationship = relType => setHiddenRelationships(current => (
    current.length === availableRelationships.length - 1 && !current.includes(relType)
      ? []
      : availableRelationships.filter(candidate => candidate !== relType)
  ));

  const moveCameraTo = id => {
    if (!id || !visibleNodes.some(node => node.id === id)) return;
    try {
      const node = sigmaRef.current?.getNodeDisplayData(id);
      if (node) sigmaRef.current.getCamera().animate({ x: node.x, y: node.y, ratio: 0.42 }, { duration: 350 });
    } catch {
      // Sigma can briefly lag a graph replacement; the selected node remains inspectable.
    }
  };

  const chooseNode = id => {
    onNodeClick(id);
    setNodeQuery('');
    window.setTimeout(() => moveCameraTo(id), 0);
  };

  const focusSelected = () => {
    if (!selectedId) return;
    setFocusDepth(1);
    window.setTimeout(() => moveCameraTo(selectedId), 0);
  };

  if (!nodes.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
        No entities to display
      </div>
    );
  }

  return (
    <div className="flex-1 relative bg-[#edf4ef]" style={{ minHeight: 0 }}>
      <aside className={`absolute top-0 left-0 z-20 h-full w-72 overflow-y-auto border-r border-[#d8e3db] bg-[#fbfdfb]/95 shadow-[8px_0_24px_rgba(25,52,43,0.08)] transition-transform duration-200 ${panelOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="bg-[#163d35] px-4 py-4 text-white">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Network size={17} aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-wide">Knowledge map</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex border border-white/25 text-[10px]">
                <button type="button" onClick={() => setFocusDepth(0)} className={`px-2 py-1 ${focusDepth === 0 ? 'bg-white text-[#163d35]' : 'text-white/75 hover:bg-white/10'}`}>Full</button>
                <button type="button" onClick={() => selectedId && setFocusDepth(1)} disabled={!selectedId} className={`border-l border-white/20 px-2 py-1 ${focusDepth > 0 ? 'bg-white text-[#163d35]' : 'text-white/75 hover:bg-white/10'} disabled:cursor-not-allowed disabled:opacity-40`}>Local</button>
              </div>
              <button type="button" onClick={() => setPanelOpen(false)} className="p-1 text-white/65 hover:bg-white/10 hover:text-white" title="Collapse analysis panel" aria-label="Collapse analysis panel"><ChevronLeft size={15} /></button>
            </div>
          </div>
          <div className="mt-3 text-lg font-semibold leading-tight truncate">{selectedNode?.name || 'Network overview'}</div>
          <div className="mt-1 text-[11px] text-white/65">{selectedNode?.entityType || `${availableTypes.length} entity types`}</div>
        </div>

        <div className="border-b border-[#dce7df] p-3">
          <div className="relative">
            <SearchIcon size={14} className="pointer-events-none absolute left-2.5 top-2.5 text-gray-400" />
            <input value={nodeQuery} onChange={event => setNodeQuery(event.target.value)} placeholder="Find an entity" className="w-full border border-[#cddbd2] bg-white py-2 pl-8 pr-8 text-xs text-gray-800 outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e]" />
            {nodeQuery && <button type="button" onClick={() => setNodeQuery('')} className="absolute right-2 top-2 p-0.5 text-gray-400 hover:text-gray-700" aria-label="Clear map search"><X size={14} /></button>}
          </div>
          {nodeMatches.length > 0 && (
            <div className="mt-1 max-h-48 overflow-y-auto border border-[#d8e3db] bg-white">
              {nodeMatches.map(node => (
                <button type="button" key={node.id} onClick={() => chooseNode(node.id)} className="flex w-full items-center gap-2 border-b border-gray-100 px-2 py-2 text-left last:border-0 hover:bg-[#f0f7f3]">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: TYPE_COLORS[node.entityType] || '#999' }} />
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-gray-800">{node.name}</span>
                  <span className="max-w-16 truncate text-[10px] text-gray-400">{node.entityType}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-b border-[#dce7df] px-4 py-3">
          <div className="grid grid-cols-3 divide-x divide-[#dce7df] text-center">
            <div><div className="text-lg font-semibold tabular-nums text-[#163d35]">{visibleNodes.length}</div><div className="text-[10px] uppercase tracking-wide text-gray-500">Entities</div></div>
            <div><div className="text-lg font-semibold tabular-nums text-[#163d35]">{visibleEdges.length}</div><div className="text-[10px] uppercase tracking-wide text-gray-500">Links</div></div>
            <div><div className="text-lg font-semibold tabular-nums text-[#163d35]">{relationshipSummary.length}</div><div className="text-[10px] uppercase tracking-wide text-gray-500">Relations</div></div>
          </div>
        </div>

        {selectedNode ? (
          <div className="border-b border-[#dce7df] px-4 py-4">
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Connection profile</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="border border-[#dce7df] bg-white px-3 py-2">
                <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-gray-500"><ArrowUpRight size={12} /> Outgoing</div>
                <div className="mt-1 text-xl font-semibold tabular-nums text-[#163d35]">{selectedOutgoing}</div>
              </div>
              <div className="border border-[#dce7df] bg-white px-3 py-2">
                <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-gray-500"><ArrowDownRight size={12} /> Incoming</div>
                <div className="mt-1 text-xl font-semibold tabular-nums text-[#163d35]">{selectedIncoming}</div>
              </div>
            </div>
            <div className="mt-3 max-h-40 space-y-1 overflow-y-auto">
              {selectedConnections.slice(0, 6).map(edge => {
                const isOutgoing = edge.source === selectedId;
                const other = nodeById.get(isOutgoing ? edge.target : edge.source);
                return (
                  <button type="button" key={edge.id} onClick={() => other && chooseNode(other.id)} className="flex w-full items-center gap-2 py-1 text-left text-xs text-gray-700 hover:text-[#0f766e]">
                    {isOutgoing ? <ArrowUpRight size={12} className="shrink-0 text-[#0f766e]" /> : <ArrowDownRight size={12} className="shrink-0 text-[#2563eb]" />}
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: relationshipColor(edge.relType, edge.provisional) }} />
                    <span className="min-w-0 flex-1 truncate">{other?.name || 'Unknown entity'}</span>
                    <span className="max-w-24 truncate font-mono text-[10px] text-gray-400">{relationshipLabel(edge.relType)}</span>
                  </button>
                );
              })}
              {!selectedConnections.length && <div className="text-xs text-gray-400">No visible connections</div>}
            </div>
          </div>
        ) : (
          <div className="border-b border-[#dce7df] px-4 py-4">
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Entity mix</div>
            <div className="space-y-2">
              {Object.entries(visibleTypeSummary).sort(([, left], [, right]) => right - left).slice(0, 6).map(([type, count]) => (
                <button type="button" key={type} onClick={() => isolateType(type)} className="flex w-full items-center gap-2 text-left text-xs hover:text-[#0f766e]" title={`Show only ${type}; click again to restore`}>
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: TYPE_COLORS[type] || '#999' }} />
                  <span className="min-w-0 flex-1 truncate text-gray-700">{type}</span>
                  <span className="font-mono text-gray-400">{count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="px-4 py-4">
          <div className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Relationship mix</div>
          <div className="space-y-2">
            {relationshipSummary.slice(0, 5).map(({ relType, count }) => (
              <button type="button" key={relType} onClick={() => isolateRelationship(relType)} className="block w-full text-left" title={`Show only ${relationshipLabel(relType)}; click again to restore`}>
                <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
                  <span className="truncate text-gray-700">{relationshipLabel(relType)}</span>
                  <span className="font-mono text-gray-400">{count}</span>
                </div>
                <div className="h-1.5 bg-[#dce7df]"><div className="h-full" style={{ width: `${Math.max(4, (count / (relationshipSummary[0]?.count || 1)) * 100)}%`, backgroundColor: relationshipColor(relType, false) }} /></div>
              </button>
            ))}
            {!relationshipSummary.length && <div className="text-xs text-gray-400">No visible relationships</div>}
          </div>
        </div>
      </aside>
      {!panelOpen && (
        <button type="button" onClick={() => setPanelOpen(true)} className="absolute left-3 top-3 z-20 flex items-center gap-1.5 border border-[#cddbd2] bg-white/95 px-2.5 py-2 text-xs font-medium text-[#163d35] shadow-sm hover:bg-white" aria-label="Open analysis panel">
          <ChevronRight size={14} /> Analyze
        </button>
      )}
      <div className={`absolute left-[6.75rem] top-3 z-10 w-64 ${panelOpen ? 'hidden' : ''}`}>
        <div className="relative shadow-sm">
          <SearchIcon size={14} className="pointer-events-none absolute left-2.5 top-2.5 text-gray-400" />
          <input value={nodeQuery} onChange={event => setNodeQuery(event.target.value)} placeholder="Find an entity in this map" className="w-full border border-[#cddbd2] bg-white/95 py-2 pl-8 pr-8 text-xs text-gray-800 outline-none focus:border-[#0f766e] focus:ring-1 focus:ring-[#0f766e]" />
          {nodeQuery && <button type="button" onClick={() => setNodeQuery('')} className="absolute right-2 top-2 p-0.5 text-gray-400 hover:text-gray-700" aria-label="Clear map search"><X size={14} /></button>}
        </div>
        {nodeMatches.length > 0 && (
          <div className="mt-1 max-h-64 overflow-y-auto border border-[#d8e3db] bg-white shadow-lg">
            {nodeMatches.map(node => (
              <button type="button" key={node.id} onClick={() => chooseNode(node.id)} className="flex w-full items-center gap-2 border-b border-gray-100 px-3 py-2 text-left last:border-0 hover:bg-[#f0f7f3]">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: TYPE_COLORS[node.entityType] || '#999' }} />
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-gray-800">{node.name}</span>
                <span className="text-[10px] text-gray-400">{node.entityType}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="absolute top-3 right-3 z-10 flex items-start gap-2">
        <details className="border border-gray-200 bg-white/95 shadow-sm">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">
            <SlidersHorizontal size={14} aria-hidden="true" />
            Filters
          </summary>
          <div className="w-72 border-t border-gray-100 p-3 space-y-3 text-xs">
            <div>
              <div className="mb-1.5 font-semibold uppercase tracking-wide text-[10px] text-gray-500">Entity types</div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 max-h-28 overflow-y-auto">
                {availableTypes.map(type => (
                  <label key={type} className="flex min-w-0 items-center gap-1.5 text-gray-700">
                    <input type="checkbox" checked={!hiddenTypes.includes(type)} onChange={() => toggleHiddenFilter(type, setHiddenTypes)} />
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: TYPE_COLORS[type] || '#999' }} />
                    <span className="truncate">{type}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1.5 font-semibold uppercase tracking-wide text-[10px] text-gray-500">Relationships</div>
              <div className="max-h-28 space-y-1 overflow-y-auto">
                {availableRelationships.map(relType => (
                  <label key={relType} className="flex min-w-0 items-center gap-1.5 text-gray-700">
                    <input type="checkbox" checked={!hiddenRelationships.includes(relType)} onChange={() => toggleHiddenFilter(relType, setHiddenRelationships)} />
                    <span className="font-mono truncate">{relType}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1.5 border-t border-gray-100 pt-2">
              <label className="flex items-center gap-1.5 text-gray-700"><input type="checkbox" checked={showProvisional} onChange={e => setShowProvisional(e.target.checked)} /> Show provisional</label>
              <label className="flex items-center gap-1.5 text-gray-700"><input type="checkbox" checked={hideOrphans} onChange={e => setHideOrphans(e.target.checked)} /> Hide orphans</label>
              <label className="flex items-center justify-between gap-2 text-gray-700">
                Focus depth
                <select value={focusDepth} onChange={e => setFocusDepth(Number(e.target.value))} className="border border-gray-300 bg-white px-1.5 py-1 text-xs">
                  <option value={0}>Entire graph</option>
                  <option value={1}>1 hop</option>
                  <option value={2}>2 hops</option>
                  <option value={3}>3 hops</option>
                </select>
              </label>
              <label className="flex items-center justify-between gap-2 text-gray-700">
                Labels
                <select value={labelMode} onChange={e => setLabelMode(e.target.value)} className="border border-gray-300 bg-white px-1.5 py-1 text-xs">
                  <option value="auto">Auto</option>
                  <option value="all">All</option>
                  <option value="none">None</option>
                </select>
              </label>
              <label className="flex items-center justify-between gap-2 text-gray-700">
                Layout
                <select value={layoutMode} onChange={e => setLayoutMode(e.target.value)} className="border border-gray-300 bg-white px-1.5 py-1 text-xs">
                  <option value="network">Connections</option>
                  <option value="groups">Entity groups</option>
                </select>
              </label>
              <label className="flex items-center justify-between gap-2 text-gray-700">
                Node size
                <select value={sizeMode} onChange={e => setSizeMode(e.target.value)} className="border border-gray-300 bg-white px-1.5 py-1 text-xs">
                  <option value="visible">Visible links</option>
                  <option value="activity">All activity</option>
                  <option value="uniform">Uniform</option>
                </select>
              </label>
            </div>
          </div>
        </details>
        <div className="flex border border-gray-200 bg-white/95 shadow-sm">
          <button type="button" onClick={() => sigmaRef.current?.getCamera().animatedReset({ duration: 350 })} title="Fit graph" aria-label="Fit graph" className="p-2 text-gray-600 hover:bg-gray-50"><Maximize2 size={15} /></button>
          <button type="button" onClick={focusSelected} disabled={!selectedId} title="Focus selected entity" aria-label="Focus selected entity" className="border-l border-gray-200 p-2 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"><Crosshair size={15} /></button>
          <button type="button" onClick={resetGraph} title="Reset graph controls" aria-label="Reset graph controls" className="border-l border-gray-200 p-2 text-gray-600 hover:bg-gray-50"><RotateCcw size={15} /></button>
        </div>
      </div>
      <SigmaContainer
        style={{ width: '100%', height: '100%', backgroundColor: '#edf4ef' }}
        settings={{
          renderLabels: labelMode !== 'none' && (labelMode === 'all' || visibleNodes.length < 150),
          labelSize: 11,
          labelColor: { color: '#374151' },
          labelWeight: '500',
          labelDensity: 0.12,
          labelGridCellSize: 120,
          labelRenderedSizeThreshold: 5,
          defaultEdgeColor: '#d1d5db',
          defaultEdgeType: 'arrow',
          renderEdgeLabels: Boolean(activeNodeId),
          edgeLabelSize: 9,
          edgeLabelWeight: '600',
          edgeLabelColor: { color: '#36594f' },
          hideEdgesOnMove: visibleEdges.length > 700,
          zIndex: true,
          nodeReducer: (node, data) => ({
            ...data,
            highlighted: node === selectedId,
            forceLabel: labelMode !== 'none' && (node === selectedId || node === hoveredId),
            zIndex: node === selectedId ? 3 : activeNeighborhood.has(node) ? 2 : 1,
            color: activeNodeId && !activeNeighborhood.has(node) ? '#cbd9d0' : data.color,
            size: node === selectedId ? data.size * 2.35 : activeNodeId && activeNeighborhood.has(node) ? data.size * 1.3 : activeNodeId ? Math.max(2, data.size * 0.6) : data.size,
          }),
          edgeReducer: (edge, data) => ({
            ...data,
            forceLabel: activeEdgeIds.has(edge),
            color: activeNodeId && !activeEdgeIds.has(edge) ? '#d5e0d9' : data.color,
            size: activeEdgeIds.has(edge) ? Math.max(2.5, data.size * 2.25) : activeNodeId ? 0.55 : data.size,
          }),
        }}
      >
        <GraphLoader nodes={visibleNodes} edges={visibleEdges} layoutMode={layoutMode} sizeMode={sizeMode} onNodeClick={onNodeClick} onNodeHover={setHoveredId} onStageClick={() => setNodeQuery('')} />
        <GraphCameraBinding sigmaRef={sigmaRef} />
      </SigmaContainer>
      {hoveredNode && hoveredNode.id !== selectedId && (
        <div className="pointer-events-none absolute bottom-12 left-1/2 z-10 min-w-48 -translate-x-1/2 border border-[#d8e3db] bg-white/95 px-3 py-2 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TYPE_COLORS[hoveredNode.entityType] || '#999' }} />
            <span className="max-w-64 truncate text-xs font-semibold text-gray-900">{hoveredNode.name}</span>
          </div>
          <div className="mt-1 text-[10px] text-gray-500">{hoveredNode.entityType} · {activeEdgeIds.size} visible connections · click to inspect</div>
        </div>
      )}
      <div className="absolute bottom-3 right-3 flex items-center gap-2 bg-white/85 px-2 py-1 text-[10px] text-gray-500 shadow-sm pointer-events-none">
        <LayoutGrid size={11} /> {layoutMode === 'network' ? 'Connection layout' : 'Grouped by entity type'} · {visibleNodes.length} entities · {visibleEdges.length} links
      </div>
    </div>
  );
}

function PartnerReviewPanel({ accessToken }) {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({});
  const [decisionReason, setDecisionReason] = useState('');
  const [learnRule, setLearnRule] = useState(true);
  const [operation, setOperation] = useState('');
  const [operationResult, setOperationResult] = useState(null);
  const [saveState, setSaveState] = useState(null);
  const [filter, setFilter] = useState('needs_review');
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [batchRelationship, setBatchRelationship] = useState('operational_vendor');
  const load = useCallback((keepSelectedId) => {
    setLoading(true);
    fetch(`${API_BASE}/api/brain/partners/review?limit=250`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Unable to load partners');
        const nextItems = data.items || [];
        setItems(nextItems);
        if (keepSelectedId) {
          const fresh = nextItems.find(item => item.id === keepSelectedId);
          if (fresh) { setSelected(fresh); setDraft({ ...fresh.properties, partnerRelationshipType: fresh.properties.partnerRelationshipType || fresh.relationshipGuess.value }); }
        }
      })
      .catch(error => setSaveState({ type: 'error', message: error.message }))
      .finally(() => setLoading(false));
  }, [accessToken]);
  useEffect(() => { if (accessToken) load(); }, [accessToken, load]);
  const choose = item => {
    setSelected(item);
    setDraft({ ...item.properties, partnerRelationshipType: item.properties.partnerRelationshipType || item.relationshipGuess.value });
    setDecisionReason(''); setSaveState(null);
  };
  const save = async action => {
    if (!selected) return;
    setSaving(true);
    setSaveState(null);
    try {
      const response = await fetch(`${API_BASE}/api/brain/partners/${selected.id}/review`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, action, decisionReason, learnRule, evidenceIds: selected.evidence.map(e => e.id) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Save failed');
      setSaveState({ type: 'success', message: action === 'approve' ? 'Approved and published.' : action === 'reject' ? 'Rejected and kept private.' : 'Draft saved.' });
      await load(selected.id);
    } catch (error) {
      setSaveState({ type: 'error', message: error.message });
    } finally { setSaving(false); }
  };
  const runOperation = async (path, body) => {
    setOperation(path);
    const response = await fetch(`${API_BASE}${path}`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setOperationResult(await response.json().catch(() => ({ error: 'request failed' })));
    setOperation(''); load(selected?.id);
  };
  const toggleSelected = id => setSelectedIds(previous => {
    const next = new Set(previous);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const selectCluster = clusterKey => setSelectedIds(previous => {
    const next = new Set(previous);
    visibleItems.filter(item => item.cluster.key === clusterKey).forEach(item => next.add(item.id));
    return next;
  });
  const runBatch = async action => {
    if (!selectedIds.size) return;
    await runOperation('/api/brain/partners/batch-review', { vendorIds: [...selectedIds], action, partnerRelationshipType: batchRelationship, reason: 'batch triage from Partners view' });
    setSelectedIds(new Set());
  };
  const runMerge = async (targetId, sourceIds) => {
    const sources = items.filter(item => sourceIds.includes(item.id));
    const target = items.find(item => item.id === targetId);
    if (!target || !sources.length) return;
    if (!window.confirm(`Merge ${sources.map(item => item.name).join(', ')} into ${target.name}? All graph history moves to ${target.name}; source names become aliases.`)) return;
    await runOperation('/api/brain/partners/merge', { targetId, sourceIds, reason: 'confirmed in partner merge review' });
    setSelectedIds(new Set());
  };
  const visibleItems = items.filter(item => {
    if (query && !item.name.toLowerCase().includes(query.toLowerCase())) return false;
    if (filter === 'needs_review') return item.reviewStatus === 'unreviewed' && item.rawEvidenceCount > 0;
    if (filter === 'orphans') return item.rawEvidenceCount === 0;
    if (filter === 'approved') return item.reviewStatus === 'approved';
    if (filter === 'draft') return item.reviewStatus === 'draft';
    if (filter === 'rejected') return item.reviewStatus === 'rejected';
    return true;
  });
  const formatMoney = cents => cents ? `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : null;
  if (loading && !items.length) return <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Loading partner review…</div>;
  return (
    <div className="flex-1 flex overflow-hidden w-full h-full min-h-0">
      <div className="w-2/5 h-full min-h-0 overflow-y-auto border-r border-gray-200 bg-white">
        <div className="p-3 border-b space-y-2">
          <div className="text-xs text-gray-500">Grouped evidence, not individual purchases. Approval is explicit and publishes only reviewed profile fields.</div>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Find vendor…" className="w-full border rounded px-2 py-1.5 text-xs" />
          <div className="flex flex-wrap gap-1">{[['needs_review', 'Needs review'], ['draft', 'Drafts'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['orphans', 'No evidence'], ['all', 'All']].map(([value, label]) => <button key={value} onClick={() => setFilter(value)} className={`rounded px-2 py-1 text-[10px] ${filter === value ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>{label}</button>)}</div>
        </div>
        <div className="p-3 border-b flex flex-wrap gap-2 text-[11px]">
          <button disabled={!!operation} onClick={() => runOperation('/api/brain/gmail/vendor-documents/batch', { batchSize: 50, monthsBack: 36 })} className="border rounded px-2 py-1">Ingest next Gmail batch</button>
          <button disabled={!!operation} onClick={() => runOperation('/api/brain/partners/reconcile-payments', { apply: false, daysBack: 1095 })} className="border rounded px-2 py-1">Preview invoice matches</button>
          <button disabled={!!operation} onClick={() => runOperation('/api/brain/partners/reconcile-payments', { apply: true, daysBack: 1095 })} className="border rounded px-2 py-1 bg-amber-50">Create match suggestions</button>
          {operationResult && <div className="w-full text-gray-500">{operationResult.error || `${operationResult.processed ?? operationResult.suggestions ?? 0} processed; ${operationResult.errors ?? operationResult.autoEligible ?? 0} flagged`}</div>}
        </div>
        <div className="sticky top-0 z-10 bg-white border-b p-2 text-[11px] shadow-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <strong>{selectedIds.size} selected</strong>
            <button onClick={() => setSelectedIds(new Set(visibleItems.map(item => item.id)))} className="underline">select visible</button>
            <button onClick={() => setSelectedIds(new Set())} className="underline">clear</button>
            {[...new Map(visibleItems.map(item => [item.cluster.key, item.cluster])).values()].map(cluster => <button key={cluster.key} onClick={() => selectCluster(cluster.key)} className="rounded bg-gray-100 px-1.5 py-1">+ {cluster.label}</button>)}
          </div>
          {selectedIds.size > 0 && <div className="flex items-center gap-2 mt-2 flex-wrap">
            <select value={batchRelationship} onChange={e => setBatchRelationship(e.target.value)} className="border rounded px-2 py-1"><option value="operational_vendor">operational vendor</option><option value="advertising_platform">advertising platform</option><option value="service_provider">service provider</option><option value="retailer">retailer</option><option value="vendor">food vendor</option><option value="valued_vendor">valued vendor</option><option value="do_not_publish">do not publish</option></select>
            <button disabled={!!operation} onClick={() => runBatch('save_draft')} className="rounded bg-gray-900 text-white px-2 py-1">Batch set</button>
            <button disabled={!!operation} onClick={() => runBatch('approve')} className="rounded bg-green-700 text-white px-2 py-1">Batch approve</button>
            <button disabled={!!operation} onClick={() => runBatch('reject')} className="rounded border border-red-300 text-red-700 px-2 py-1">Batch reject</button>
            {selected && [...selectedIds].some(id => id !== selected.id) && <button disabled={!!operation} onClick={() => runMerge(selected.id, [...selectedIds].filter(id => id !== selected.id))} className="rounded border border-purple-300 text-purple-800 px-2 py-1">Merge selected into {selected.name}</button>}
          </div>}
        </div>
        {visibleItems.map(item => (
          <div key={item.id} className={`flex items-start border-b hover:bg-gray-50 ${selected?.id === item.id ? 'bg-amber-50' : ''}`}>
            <label className="p-3 pr-0"><input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelected(item.id)} aria-label={`Select ${item.name}`} /></label>
            <button onClick={() => choose(item)} className="flex-1 min-w-0 text-left p-3">
              <div className="flex justify-between gap-2"><span className="font-medium text-sm truncate">{item.name}</span><span className={`text-[9px] uppercase rounded px-1.5 py-0.5 ${item.reviewStatus === 'approved' ? 'bg-green-100 text-green-800' : item.reviewStatus === 'rejected' ? 'bg-red-100 text-red-700' : item.reviewStatus === 'draft' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-800'}`}>{item.reviewStatus}</span></div>
              <div className="text-xs text-gray-500 mt-1">{item.cluster.label} · {item.rawEvidenceCount} facts in {item.evidenceSummary.length} groups</div>
            </button>
          </div>
        ))}
        {!visibleItems.length && <div className="p-6 text-center text-xs text-gray-400">No vendors in this view.</div>}
      </div>
      <div className="w-3/5 h-full min-h-0 overflow-y-auto p-5 overscroll-contain">
        {!selected ? <div className="text-sm text-gray-400">Choose a vendor to review.</div> : <>
          <div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-semibold">{selected.name}</h2><div className="text-xs text-gray-500 mt-1">{selected.rawEvidenceCount} raw facts collapsed into {selected.evidenceSummary.length} useful groups</div></div><span className="text-xs uppercase font-semibold">{selected.reviewStatus}</span></div>
          <div className="grid grid-cols-2 gap-2 mt-4">{selected.evidenceSummary.map(group => <div key={group.key} className="border rounded p-3 bg-white"><div className="text-[10px] uppercase text-gray-500">{group.bucket} · {group.source}</div><div className="font-semibold text-sm mt-1">{group.count} {group.relType.toLowerCase().replaceAll('_', ' ')}</div>{formatMoney(group.totalCents) && <div className="text-xs text-gray-600">{formatMoney(group.totalCents)} observed</div>}<div className="text-[10px] text-gray-400 mt-1">latest {new Date(group.lastAt).toLocaleDateString()}</div></div>)}</div>
          {selected.mergeCandidates?.length > 0 && <div className="mt-4 border border-purple-200 bg-purple-50 rounded p-3"><h3 className="text-xs font-semibold text-purple-950">Possible duplicate identities</h3><div className="mt-2 space-y-2">{selected.mergeCandidates.map(candidate => <div key={candidate.id} className="flex items-center justify-between gap-2 text-xs"><span>{candidate.name} · {Math.round(candidate.score * 100)}% · {candidate.evidenceCount} facts</span><div className="flex gap-1"><button onClick={() => runMerge(selected.id, [candidate.id])} className="border border-purple-300 rounded px-2 py-1">merge into {selected.name}</button><button onClick={() => runMerge(candidate.id, [selected.id])} className="border border-purple-300 rounded px-2 py-1">use {candidate.name}</button></div></div>)}</div></div>}
          <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
            <label>Relationship<select value={draft.partnerRelationshipType || selected.relationshipGuess.value} onChange={e => setDraft({ ...draft, partnerRelationshipType: e.target.value })} className="block w-full border rounded p-2 mt-1"><option>observed</option><option>vendor</option><option>valued_vendor</option><option>operational_vendor</option><option>advertising_platform</option><option>service_provider</option><option>retailer</option><option>stockist</option><option>distributor</option><option>producer</option><option>collaborator</option><option>venue</option><option>historical_vendor</option><option>do_not_publish</option></select></label>
            <label>Partner tier<select value={draft.partnerTier || ''} onChange={e => setDraft({ ...draft, partnerTier: e.target.value })} className="block w-full border rounded p-2 mt-1"><option value="">none</option><option value="featured">featured</option><option value="core">core</option><option value="supporting">supporting</option></select></label>
            {['website', 'instagram', 'physicalAddress', 'whatWeBuy'].map(k => <label key={k} className={k === 'whatWeBuy' ? 'col-span-2' : ''}>{k}<input value={Array.isArray(draft[k]) ? draft[k].join(', ') : (draft[k] || '')} onChange={e => setDraft({ ...draft, [k]: k === 'whatWeBuy' ? e.target.value.split(',').map(x => x.trim()).filter(Boolean) : e.target.value })} className="block w-full border rounded p-2 mt-1" /></label>)}
            <label className="col-span-2">Review notes<textarea value={draft.reviewNotes || ''} onChange={e => setDraft({ ...draft, reviewNotes: e.target.value })} className="block w-full border rounded p-2 mt-1" rows={3} /></label>
            <label className="col-span-2">Why this correction?<input value={decisionReason} onChange={e => setDecisionReason(e.target.value)} placeholder="A short reason improves future suggestions" className="block w-full border rounded p-2 mt-1" /></label>
            <label className="col-span-2 flex items-center gap-2"><input type="checkbox" checked={learnRule} onChange={e => setLearnRule(e.target.checked)} /> Learn a vendor-scoped rule from identity and relationship corrections</label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2"><button onClick={() => save('approve')} disabled={saving} className="px-4 py-2 rounded bg-green-700 text-white text-xs font-semibold">Approve vendor</button><button onClick={() => save('save_draft')} disabled={saving} className="px-4 py-2 rounded bg-gray-900 text-white text-xs">Save draft</button><button onClick={() => save('reject')} disabled={saving} className="px-4 py-2 rounded border border-red-300 text-red-700 text-xs">Reject / keep private</button></div>
          {saveState && <div className={`mt-3 rounded p-2 text-xs ${saveState.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{saveState.message}</div>}
          {selected.evidence.length > 0 && <><h3 className="font-semibold mt-6 mb-2">Relationship evidence</h3><div className="space-y-2">{selected.evidence.map(ev => <div key={ev.id} className="border rounded p-3 text-xs bg-white"><div className="font-mono">{ev.relType} · {ev.sourceType} · {Math.round(ev.confidence * 100)}% {ev.provisional ? '· provisional' : ''}</div><div className="text-gray-600 mt-1">{ev.other?.entityType}: {ev.other?.name}</div>{ev.ledgerEvent && <div className="text-gray-500 mt-1">{ev.ledgerEvent.source} · {new Date(ev.ledgerEvent.occurredAt).toLocaleDateString()}</div>}</div>)}</div></>}
        </>}
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
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [graphLoading, setGraphLoading] = useState(false);
  const LIMIT = 50;

  // Graph view gets its own nodes+edges fetch (the table fetch has no edges)
  useEffect(() => {
    if (viewMode !== 'graph' || !auth.accessToken) return;
    let cancelled = false;
    setGraphLoading(true);
    const params = new URLSearchParams({ limit: '200' });
    if (typeFilter) params.set('type', typeFilter);
    if (activeQuery) params.set('q', activeQuery);
    fetch(`${API_BASE}/api/brain/graph?${params}`, {
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    })
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        if (d.ok) setGraphData({ nodes: d.nodes || [], edges: d.edges || [] });
        setGraphLoading(false);
      })
      .catch(() => { if (!cancelled) setGraphLoading(false); });
    return () => { cancelled = true; };
  }, [viewMode, typeFilter, activeQuery, auth.accessToken]);

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

  const handleInsightTypeSelect = type => {
    if (!type) return;
    setTypeFilter(type);
    setOffset(0);
    setSelectedId(null);
    setViewMode('table');
  };

  const openProvisionalReview = () => {
    setReviewMode(true);
    setOffset(0);
    setSelectedId(null);
    setViewMode('table');
  };

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
              <button
                onClick={() => { setViewMode('insights'); setSelectedId(null); }}
                className={`px-3 py-1.5 ${viewMode === 'insights' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                Insights
              </button>
              <button
                onClick={() => { setViewMode('explore'); setSelectedId(null); }}
                className={`px-3 py-1.5 ${viewMode === 'explore' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                Explore
              </button>
              <button
                onClick={() => { setViewMode('quality'); setSelectedId(null); }}
                className={`px-3 py-1.5 ${viewMode === 'quality' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                Quality
              </button>
              <button
                onClick={() => { setViewMode('partners'); setSelectedId(null); }}
                className={`px-3 py-1.5 ${viewMode === 'partners' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                Partners
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
        {viewMode === 'insights' ? (
          <BrainInsightsPanel
            accessToken={auth.accessToken}
            onSelectType={handleInsightTypeSelect}
            onOpenReview={openProvisionalReview}
          />
        ) : viewMode === 'explore' ? (
          <BrainExplorePanel accessToken={auth.accessToken} />
        ) : viewMode === 'partners' ? (
          <PartnerReviewPanel accessToken={auth.accessToken} />
        ) : viewMode === 'quality' ? (
          <BrainQualityPanel accessToken={auth.accessToken} onMerged={handleRefresh} />
        ) : viewMode === 'graph' ? (
          <>
            <div className={`flex overflow-hidden ${showDetail ? 'w-3/5' : 'w-full'}`} style={{ minHeight: 0 }}>
              {graphLoading ? (
                <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Loading…</div>
              ) : (
                <GraphView
                  nodes={graphData.nodes}
                  edges={graphData.edges}
                  selectedId={selectedId}
                  onNodeClick={id => setSelectedId(id === selectedId ? null : id)}
                />
              )}
            </div>
            {showDetail && (
              <div className="w-2/5 min-w-[20rem] bg-white border-l border-gray-200 overflow-hidden flex flex-col">
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
