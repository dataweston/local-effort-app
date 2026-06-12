import React, { useEffect, useState } from 'react';
import { Brain, ChevronDown, ChevronUp, Inbox, AlertTriangle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../../lib/apiBase';

const STALE_SOURCE_DAYS = 14;

function daysAgo(dateStr) {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

/**
 * Compact "what does the brain know" strip for the weekly planner.
 * Header row is always visible (counts); expanding shows active inferences
 * and ingestion-source freshness.
 */
export function BrainPulsePanel({ accessToken, enabled, onOpenInbox }) {
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!enabled || !accessToken) return;
    let cancelled = false;
    fetch(`${API_BASE}/api/brain/cockpit`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(r => r.json())
      .then(d => { if (!cancelled && d.ok) setData(d); else if (!cancelled) setError(true); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [enabled, accessToken]);

  if (!enabled || error || !data) return null;

  const { counts, inferences, sources } = data;
  const staleSources = (sources || []).filter(s => {
    const d = daysAgo(s.lastEventAt);
    return d !== null && d > STALE_SOURCE_DAYS;
  });
  const activeInferences = (inferences || []).filter(i => !i.stale);

  return (
    <div
      className="mx-4 mb-3 rounded-lg border"
      style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border-default)' }}
    >
      {/* Header row — always visible */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-3 py-2 text-left"
      >
        <Brain size={15} style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }} />
        <span className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Brain
        </span>

        <span
          role="link"
          tabIndex={0}
          onClick={e => { e.stopPropagation(); onOpenInbox?.(); }}
          onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); onOpenInbox?.(); } }}
          className="flex items-center gap-1 text-xs cursor-pointer hover:underline"
          style={{ color: counts.inboxPending > 0 ? 'var(--brand-rose, #c0392b)' : 'var(--color-text-tertiary)' }}
        >
          <Inbox size={12} />
          {counts.inboxPending} inbox
        </span>

        <Link
          to="/brain"
          onClick={e => e.stopPropagation()}
          className="flex items-center gap-1 text-xs hover:underline"
          style={{ color: counts.provisionalPending > 0 ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)' }}
        >
          {counts.provisionalPending} to review
        </Link>

        {staleSources.length > 0 && (
          <span className="hidden sm:flex items-center gap-1 text-xs" style={{ color: '#b07d3a' }}>
            <AlertTriangle size={12} />
            {staleSources.length} stale source{staleSources.length === 1 ? '' : 's'}
          </span>
        )}

        {activeInferences.length > 0 && !expanded ? (
          <span className="hidden md:block flex-1 truncate text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {activeInferences[0].entity?.name}: {activeInferences[0].summary}
          </span>
        ) : (
          <span className="flex-1" />
        )}

        <span style={{ color: 'var(--color-text-tertiary)' }}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t" style={{ borderColor: 'var(--color-border-default)' }}>
          {/* Inferences */}
          <div className="mt-2">
            <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-tertiary)' }}>
              Signals
            </div>
            {activeInferences.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                No active inferences. The nightly pass needs fresh ledger events to find patterns.
              </p>
            ) : (
              <div className="space-y-1">
                {activeInferences.slice(0, 6).map(inf => (
                  <div key={inf.id} className="flex items-baseline gap-2 text-xs">
                    <span
                      className="shrink-0 font-mono text-[10px] px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: 'var(--color-bg-page)', color: 'var(--color-text-secondary)' }}
                    >
                      {inf.type}
                    </span>
                    <span className="font-medium shrink-0" style={{ color: 'var(--color-text-primary)' }}>
                      {inf.entity?.name}
                    </span>
                    <span className="truncate" style={{ color: 'var(--color-text-secondary)' }}>
                      {inf.summary}
                    </span>
                    <span className="shrink-0 font-mono text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                      {Math.round((inf.confidence || 0) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Source freshness */}
          <div className="mt-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-tertiary)' }}>
              Data sources
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(sources || []).slice(0, 12).map(s => {
                const d = daysAgo(s.lastEventAt);
                const stale = d !== null && d > STALE_SOURCE_DAYS;
                return (
                  <span
                    key={s.source}
                    className="text-[10px] px-1.5 py-0.5 rounded border font-mono"
                    style={{
                      borderColor: stale ? '#f5dfa0' : 'var(--color-border-default)',
                      backgroundColor: stale ? '#fef3e2' : 'var(--color-bg-page)',
                      color: stale ? '#b07d3a' : 'var(--color-text-secondary)',
                    }}
                    title={`${s.totalEvents} events total`}
                  >
                    {s.source} · {d === null ? '—' : d === 0 ? 'today' : `${d}d`}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="mt-3 flex justify-end">
            <Link
              to="/brain"
              className="flex items-center gap-1 text-xs hover:underline"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Open brain browser <ExternalLink size={11} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
