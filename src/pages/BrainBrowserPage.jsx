import { useState, useEffect, useCallback } from 'react';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const ENTITY_TYPES = ['Vendor', 'Customer', 'Dish', 'Ingredient', 'Menu', 'Product', 'Note', 'Task', 'Event'];
const REL_TYPE_COLORS = {
  PRICED_AT: 'bg-blue-100 text-blue-800',
  CONTAINS: 'bg-green-100 text-green-800',
  ORDERED: 'bg-purple-100 text-purple-800',
  PAYMENT_SENT: 'bg-red-100 text-red-800',
  PAYMENT_RECEIVED: 'bg-emerald-100 text-emerald-800',
  SOURCED_FROM: 'bg-amber-100 text-amber-800',
  RECONCILED_WITH: 'bg-sky-100 text-sky-800',
  SPEND_HISTORY: 'bg-orange-100 text-orange-800',
  MENU_SNAPSHOT: 'bg-indigo-100 text-indigo-800',
  APPEARS_ON: 'bg-violet-100 text-violet-800',
  GAVE_FEEDBACK: 'bg-pink-100 text-pink-800',
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

function EntityDetail({ id, accessToken, onClose }) {
  const [entity, setEntity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/brain/entities/${id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(r => r.json())
      .then(d => { setEntity(d.entity); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id, accessToken]);

  if (loading) return <div className="p-6 text-sm text-gray-400">Loading…</div>;
  if (!entity) return <div className="p-6 text-sm text-red-500">Not found</div>;

  const srcAssertions = entity.srcAssertions || [];
  const dstAssertions = entity.dstAssertions || [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-start justify-between p-4 border-b border-gray-200 shrink-0">
        <div>
          <div className="text-xs text-gray-400 font-mono uppercase tracking-wide mb-1">{entity.entityType}</div>
          <h2 className="text-lg font-semibold text-gray-900 leading-tight">{entity.name}</h2>
          {entity.status !== 'active' && (
            <span className="text-xs text-amber-600 font-mono">{entity.status}</span>
          )}
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 text-xl leading-none">×</button>
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
              Outgoing assertions ({srcAssertions.length})
            </div>
            <div className="space-y-1.5">
              {srcAssertions.map(a => (
                <div key={a.id} className="flex items-start gap-2 text-sm">
                  <div className="shrink-0 mt-0.5">{relBadge(a.relType, a.provisional)}</div>
                  <div className="min-w-0">
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
                </div>
              ))}
            </div>
          </div>
        )}

        {dstAssertions.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Incoming assertions ({dstAssertions.length})
            </div>
            <div className="space-y-1.5">
              {dstAssertions.map(a => (
                <div key={a.id} className="flex items-start gap-2 text-sm">
                  <span className="text-gray-500 text-xs font-mono shrink-0 mt-0.5">{a.src?.entityType}:</span>
                  <span className="text-gray-800 shrink-0">{a.src?.name || '—'}</span>
                  <div className="shrink-0">{relBadge(a.relType, a.provisional)}</div>
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

function SearchBar({ value, onChange, onSubmit }) {
  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <input
        className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
        placeholder="Search entities…"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      <button
        type="submit"
        className="px-4 py-2 bg-gray-900 text-white text-sm rounded hover:bg-gray-700"
      >
        Search
      </button>
    </form>
  );
}

export default function BrainBrowserPage() {
  const auth = useSupabaseAuth();

  const [typeFilter, setTypeFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [sort, setSort] = useState('updatedAt');
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
  }, [auth.accessToken]);

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

  if (!auth.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
        Admin access required
      </div>
    );
  }

  return (
    <div className="fullpage-demo-scope min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-semibold font-display text-gray-900">Brain Browser</h1>
            <div className="text-xs text-gray-400">{total.toLocaleString()} entities</div>
          </div>
          <div className="flex-1 max-w-md">
            <SearchBar value={searchInput} onChange={setSearchInput} onSubmit={handleSearch} />
          </div>
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

      {/* Main */}
      <div className="flex-1 flex overflow-hidden max-w-7xl w-full mx-auto">
        {/* Entity list */}
        <div className={`flex flex-col overflow-hidden ${selectedId ? 'w-1/2' : 'w-full'} border-r border-gray-200`}>
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
                          <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${e.id === selectedId ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-500'}`}>
                            {e.entityType}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-medium truncate max-w-0">
                          <span className="block truncate">{e.name}</span>
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
        {selectedId && (
          <div className="w-1/2 bg-white overflow-hidden flex flex-col">
            <EntityDetail
              id={selectedId}
              accessToken={auth.accessToken}
              onClose={() => setSelectedId(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
