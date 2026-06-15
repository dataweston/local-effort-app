import React, { useCallback, useEffect, useState } from 'react';
import { GitMerge, RefreshCw, Archive } from 'lucide-react';
import { API_BASE } from '../../lib/apiBase';

/**
 * Data-quality dashboard for the /brain maintenance bench.
 * Shows duplicate clusters (same-type and cross-type) with one-click merge:
 * pick the survivor, merge the rest into it.
 */
export function BrainQualityPanel({ accessToken, onMerged }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [merging, setMerging] = useState(null); // cluster key while merging
  const [survivors, setSurvivors] = useState({}); // cluster key → entity id
  const [fragments, setFragments] = useState(null); // { fragments: [], count }
  const [archiving, setArchiving] = useState(false);

  const load = useCallback(() => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    Promise.all([
      fetch(`${API_BASE}/api/brain/quality`, { headers: { Authorization: `Bearer ${accessToken}` } }).then((r) => r.json()),
      fetch(`${API_BASE}/api/brain/quality/fragments`, { headers: { Authorization: `Bearer ${accessToken}` } }).then((r) => r.json()),
    ])
      .then(([quality, frag]) => {
        if (!quality.ok) throw new Error(quality.error || 'quality report failed');
        setData(quality);
        setFragments(frag.ok ? frag : { fragments: [], count: 0 });
      })
      .catch((err) => setError(err.message || 'quality report failed'))
      .finally(() => setLoading(false));
  }, [accessToken]);

  useEffect(() => { load(); }, [load]);

  async function archiveFragments(ids) {
    const body = ids === 'all' ? { all: true } : { ids };
    const label = ids === 'all' ? `all ${fragments?.count || 0} fragment entities` : '1 entity';
    if (!confirm(`Archive ${label}? This is reversible — they become status=archived and drop out of active views. Their assertions are kept.`)) return;
    setArchiving(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/brain/quality/fragments/archive`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error || 'archive failed');
      onMerged?.();
      load();
    } catch (err) {
      setError(err.message || 'archive failed');
    } finally {
      setArchiving(false);
    }
  }

  async function mergeCluster(key, members) {
    const survivorId = survivors[key] || members[0]?.id;
    const losers = members.filter((m) => m.id !== survivorId);
    if (!losers.length) return;
    const survivor = members.find((m) => m.id === survivorId);
    if (!confirm(`Merge ${losers.length} entit${losers.length === 1 ? 'y' : 'ies'} into "${survivor?.name}" (${survivor?.entityType})? Their assertions, inferences, and aliases move to the survivor; the duplicates are archived.`)) return;

    setMerging(key);
    setError('');
    try {
      for (const loser of losers) {
        const res = await fetch(`${API_BASE}/api/brain/entities/${loser.id}/merge-into/${survivorId}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const d = await res.json();
        if (!d.ok) throw new Error(d.error || `merge failed for ${loser.name}`);
      }
      onMerged?.();
      load();
    } catch (err) {
      setError(err.message || 'merge failed');
    } finally {
      setMerging(null);
    }
  }

  function ClusterCard({ clusterKey, label, members }) {
    const survivorId = survivors[clusterKey] || members[0]?.id;
    return (
      <div className="bg-white border border-gray-200 rounded p-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-semibold text-gray-700 truncate">{label}</span>
          <button
            onClick={() => mergeCluster(clusterKey, members)}
            disabled={!!merging}
            className="shrink-0 inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50"
          >
            <GitMerge size={12} />
            {merging === clusterKey ? 'Merging…' : `Merge ${members.length - 1} in`}
          </button>
        </div>
        <div className="space-y-1">
          {members.map((m) => (
            <label key={m.id} className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="radio"
                name={`survivor-${clusterKey}`}
                checked={survivorId === m.id}
                onChange={() => setSurvivors((prev) => ({ ...prev, [clusterKey]: m.id }))}
              />
              <span className="font-mono text-[10px] text-gray-400 w-24 truncate">{m.entityType}</span>
              <span className="text-gray-800 truncate" title={m.id}>{m.name}</span>
              {survivorId === m.id && <span className="text-[10px] text-green-700 font-medium shrink-0">keep</span>}
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Loading quality report…</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-4 space-y-5">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Pick the entity to keep in each cluster, then merge. Assertions, inferences, inbox links, and aliases all move to the survivor.
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {error && <div className="text-xs text-red-700">{error}</div>}

        {data && (
          <>
            {/* Summary chips */}
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-1 rounded bg-white border border-gray-200 text-gray-700">
                {data.provisionalAssertions?.toLocaleString?.() ?? data.provisionalAssertions} provisional assertions
              </span>
              <span className="px-2 py-1 rounded bg-white border border-gray-200 text-gray-700">
                {(data.duplicateEntities || []).length} same-type clusters
              </span>
              <span className="px-2 py-1 rounded bg-white border border-gray-200 text-gray-700">
                {(data.crossTypeDuplicates || []).length} cross-type clusters
              </span>
              <span className="px-2 py-1 rounded bg-white border border-gray-200 text-gray-700">
                {(data.orphanedEntitiesByType || []).reduce((s, o) => s + Number(o.n || 0), 0)} orphaned entities
              </span>
              {fragments?.count > 0 && (
                <span className="px-2 py-1 rounded bg-rose-50 border border-rose-200 text-rose-800">
                  {fragments.count} fragment food names
                </span>
              )}
            </div>

            {/* Fragment food names — the "dishes" mess. Sentence fragments the
                gmail extractor minted mid-sentence as Dish/Ingredient/Menu. */}
            {fragments?.count > 0 && (
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Fragment food names <span className="font-normal normal-case text-gray-400">(sentence fragments minted as Dish/Ingredient/Menu — archive these)</span>
                  </h2>
                  <button
                    onClick={() => archiveFragments('all')}
                    disabled={archiving}
                    className="shrink-0 inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    <Archive size={12} />
                    {archiving ? 'Archiving…' : `Archive all ${fragments.count}`}
                  </button>
                </div>
                <div className="bg-white border border-gray-200 rounded divide-y divide-gray-100 max-h-80 overflow-y-auto">
                  {fragments.fragments.map((f) => (
                    <div key={f.id} className="flex items-center gap-2 px-3 py-1.5 text-xs group">
                      <span className="font-mono text-[10px] text-gray-400 w-20 shrink-0">{f.entityType}</span>
                      <span className="text-gray-700 truncate flex-1" title={f.name}>{f.name}</span>
                      <button
                        onClick={() => archiveFragments([f.id])}
                        disabled={archiving}
                        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 hover:bg-rose-100 hover:text-rose-700 disabled:opacity-50"
                      >
                        Archive
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Cross-type duplicates — the audit's main merge target */}
            <section>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Cross-type duplicates <span className="font-normal normal-case text-gray-400">(same name, different entity types — e.g. Dish↔Product twins)</span>
              </h2>
              {(data.crossTypeDuplicates || []).length === 0 ? (
                <p className="text-xs text-gray-400">None found.</p>
              ) : (
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {data.crossTypeDuplicates.map((c) => (
                    <ClusterCard key={`x-${c.canonical}`} clusterKey={`x-${c.canonical}`} label={c.canonical} members={c.members || []} />
                  ))}
                </div>
              )}
            </section>

            {/* Same-type duplicates */}
            <section>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Same-type duplicates</h2>
              {(data.duplicateEntities || []).length === 0 ? (
                <p className="text-xs text-gray-400">None found.</p>
              ) : (
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {data.duplicateEntities.map((c) => (
                    <ClusterCard
                      key={`s-${c.entityType}-${c.canonical}`}
                      clusterKey={`s-${c.entityType}-${c.canonical}`}
                      label={`${c.entityType}: ${c.canonical}`}
                      members={c.members || []}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Orphans + self edges, read-only context */}
            <section className="grid gap-3 md:grid-cols-2">
              <div className="bg-white border border-gray-200 rounded p-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Orphaned entities (no assertions)</h3>
                <div className="space-y-0.5">
                  {(data.orphanedEntitiesByType || []).map((o) => (
                    <div key={o.entityType} className="flex justify-between text-xs text-gray-700">
                      <span className="font-mono">{o.entityType}</span>
                      <span>{o.n}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded p-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Self-edges by relType</h3>
                {(data.selfEdges || []).length === 0 ? (
                  <p className="text-xs text-gray-400">None.</p>
                ) : (
                  <div className="space-y-0.5">
                    {data.selfEdges.map((s, i) => (
                      <div key={i} className="flex justify-between text-xs text-gray-700">
                        <span className="font-mono">{s.relType} ({s.entityType})</span>
                        <span>{s.n}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
