import React, { useEffect, useRef, useState } from 'react';
import { X, Trash2, Plus, Link2, CheckSquare, ChevronDown, ChevronUp, Inbox, Database, Search, RefreshCw } from 'lucide-react';
import { useBrainEntities } from '../../hooks/useBrainEntities';

const ENTITY_TYPES = [
  '', 'Vendor', 'Customer', 'Dish', 'Ingredient', 'Menu', 'Product',
  'Invoice', 'Payment', 'Order', 'Receipt', 'EmailThread', 'Feedback', 'Decision',
  'PriceQuote', 'LedgerTransaction',
  'BusinessLine', 'Offer', 'Occasion', 'Channel', 'CustomerSegment',
  'ProcessStep', 'Constraint', 'Asset', 'Opportunity', 'Risk', 'Metric',
  'NarrativeTheme', 'Supplier', 'Task', 'Note', 'Event',
];

const ENTITY_TYPE_COLORS = {
  Vendor:     { bg: '#f0f4ec', text: '#4a6741' },
  Customer:   { bg: '#edf1fb', text: '#3b5bdb' },
  Menu:       { bg: '#fdf4e7', text: '#b86e00' },
  Dish:       { bg: '#fce9e9', text: '#c0392b' },
  Ingredient: { bg: '#e9f5f0', text: '#1a7f5a' },
  Task:       { bg: '#f3eefb', text: '#7048e8' },
  Note:       { bg: '#f5f5f5', text: '#555' },
};

/**
 * Slide-in drawer with two tabs: Inbox and Entities.
 * Keyboard (inbox): j/k navigate · t trash · esc close
 */
export function BrainInboxDrawer({ open, onClose, items, triage, loading, accessToken }) {
  const [tab, setTab] = useState('inbox');

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col shadow-2xl"
        style={{
          width: 'min(520px, 100vw)',
          backgroundColor: 'var(--color-bg-card)',
          borderLeft: '1px solid var(--color-border-default)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--color-border-default)' }}
        >
          {/* Tabs */}
          <div className="flex items-center gap-1">
            <TabButton active={tab === 'inbox'} onClick={() => setTab('inbox')}>
              <Inbox size={13} />
              <span>Inbox</span>
              {items.length > 0 && (
                <span
                  className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--brand-rose, #e07070)', color: '#fff' }}
                >
                  {items.length}
                </span>
              )}
            </TabButton>
            <TabButton active={tab === 'entities'} onClick={() => setTab('entities')}>
              <Database size={13} />
              <span>Entities</span>
            </TabButton>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <X size={16} />
          </button>
        </div>

        {tab === 'inbox' ? (
          <InboxPanel items={items} triage={triage} loading={loading} onClose={onClose} />
        ) : (
          <EntitiesPanel accessToken={accessToken} />
        )}
      </div>
    </>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors"
      style={{
        backgroundColor: active ? 'var(--color-bg-hover, rgba(0,0,0,0.07))' : 'transparent',
        color: active ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
      }}
    >
      {children}
    </button>
  );
}


// ── Inbox panel ───────────────────────────────────────────────────────────────

function InboxPanel({ items, triage, loading, onClose }) {
  const [cursor, setCursor] = useState(0);
  const [triaging, setTriaging] = useState(null);

  useEffect(() => { setCursor(0); }, [items.length]);

  useEffect(() => {
    function handleKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        setCursor(c => Math.min(c + 1, items.length - 1));
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        setCursor(c => Math.max(c - 1, 0));
      } else if (e.key === 'x' || e.key === 'Escape') {
        onClose();
      } else if (e.key === 't' && items[cursor]) {
        handleTriage(items[cursor].id, 'trash');
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [cursor, items, onClose]);

  async function handleTriage(id, action, payload = {}) {
    setTriaging(id);
    await triage(id, action, payload);
    setTriaging(null);
  }

  return (
    <>
      <div
        className="px-4 py-1.5 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--color-border-default)' }}
      >
        <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          j/k navigate · t trash · esc close
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && items.length === 0 && (
          <div className="flex items-center justify-center h-32 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
            Loading…
          </div>
        )}
        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 gap-2" style={{ color: 'var(--color-text-tertiary)' }}>
            <Inbox size={32} opacity={0.4} />
            <span className="text-sm">Inbox zero</span>
          </div>
        )}
        {items.map((item, idx) => (
          <InboxItem
            key={item.id}
            item={item}
            active={idx === cursor}
            triaging={triaging === item.id}
            onClick={() => setCursor(idx)}
            onTriage={(action, payload) => handleTriage(item.id, action, payload)}
          />
        ))}
      </div>
    </>
  );
}

function InboxItem({ item, active, triaging, onClick, onTriage }) {
  const [expanded, setExpanded] = useState(false);

  const sourceLabel = {
    gmail: 'Gmail', square: 'Square', admin_ux: 'Manual',
    drafts: 'Drafts', obsidian: 'Obsidian', shortcut: 'Shortcut',
  }[item.source] ?? item.source;

  const age = formatAge(item.capturedAt);

  return (
    <div
      onClick={onClick}
      className="px-4 py-3 border-b cursor-pointer transition-colors"
      style={{
        borderColor: 'var(--color-border-default)',
        backgroundColor: active ? 'var(--color-bg-hover, rgba(0,0,0,0.04))' : 'transparent',
        opacity: triaging ? 0.5 : 1,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm flex-1 leading-snug" style={{ color: 'var(--color-text-primary)' }}>
          {item.rawContent.length > 120 && !expanded
            ? item.rawContent.slice(0, 120) + '…'
            : item.rawContent}
        </p>
        {item.rawContent.length > 120 && (
          <button
            onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
            style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 mt-1">
        <span
          className="text-xs px-1.5 py-0.5 rounded"
          style={{
            backgroundColor: 'var(--color-bg-page)',
            color: 'var(--color-text-secondary)',
            border: '1px solid var(--color-border-default)',
          }}
        >
          {sourceLabel}
        </span>
        <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{age}</span>
        {item.attachments?.length > 0 && (
          <a
            href={item.attachments[0].url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-xs flex items-center gap-0.5"
            style={{ color: 'var(--color-action-primary-bg)' }}
          >
            <Link2 size={11} />
            {item.attachments[0].label || 'Link'}
          </a>
        )}
      </div>
      {active && (
        <div className="flex items-center gap-2 mt-2">
          <ActionButton icon={<Trash2 size={12} />} label="Trash" shortcut="t" danger
            onClick={e => { e.stopPropagation(); onTriage('trash'); }} />
          <ActionButton icon={<Plus size={12} />} label="New entity" shortcut="n"
            onClick={e => { e.stopPropagation(); onTriage('new_entity', { entityType: 'Vendor', name: item.rawContent.slice(0, 60) }); }} />
          <ActionButton icon={<Link2 size={12} />} label="Append" shortcut="a"
            onClick={e => { e.stopPropagation(); onTriage('append_entity', { entityId: null, note: item.rawContent }); }} />
          <ActionButton icon={<CheckSquare size={12} />} label="Task" shortcut="k"
            onClick={e => { e.stopPropagation(); onTriage('new_task', { title: item.rawContent.slice(0, 80) }); }} />
        </div>
      )}
    </div>
  );
}

function ActionButton({ icon, label, shortcut, danger, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors"
      style={{
        backgroundColor: danger ? 'var(--brand-rose, #fde8e8)' : 'var(--color-bg-page)',
        color: danger ? 'var(--brand-rose-text, #c0392b)' : 'var(--color-text-secondary)',
        border: '1px solid var(--color-border-default)',
      }}
    >
      {icon}
      <span>{label}</span>
      <kbd className="ml-0.5 text-xs opacity-50" style={{ fontFamily: 'monospace' }}>{shortcut}</kbd>
    </button>
  );
}


// ── Entities panel ────────────────────────────────────────────────────────────

function EntitiesPanel({ accessToken }) {
  const { entities, total, loading, filters, setFilters, refetch, tombstone } = useBrainEntities({
    accessToken,
    enabled: !!accessToken,
  });

  const [search, setSearch] = useState('');
  const [tombstoning, setTombstoning] = useState(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters(f => ({ ...f, q: search }));
      refetch({ q: search });
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  function handleTypeChange(e) {
    const type = e.target.value;
    setFilters(f => ({ ...f, type }));
    refetch({ type });
  }

  function handleSortChange(sort) {
    const order = filters.sort === sort && filters.order === 'desc' ? 'asc' : 'desc';
    setFilters(f => ({ ...f, sort, order }));
    refetch({ sort, order });
  }

  async function handleTombstone(e, id) {
    e.stopPropagation();
    setTombstoning(id);
    await tombstone(id);
    setTombstoning(null);
  }

  return (
    <>
      {/* Toolbar */}
      <div
        className="px-3 py-2 border-b flex items-center gap-2"
        style={{ borderColor: 'var(--color-border-default)' }}
      >
        {/* Search */}
        <div className="relative flex-1">
          <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--color-text-tertiary)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search entities…"
            className="w-full pl-7 pr-2 py-1.5 text-xs rounded border"
            style={{
              backgroundColor: 'var(--color-bg-page)',
              color: 'var(--color-text-primary)',
              borderColor: 'var(--color-border-default)',
              outline: 'none',
            }}
          />
        </div>

        {/* Type filter */}
        <select
          value={filters.type}
          onChange={handleTypeChange}
          className="text-xs px-2 py-1.5 rounded border"
          style={{
            backgroundColor: 'var(--color-bg-page)',
            color: 'var(--color-text-primary)',
            borderColor: 'var(--color-border-default)',
          }}
        >
          {ENTITY_TYPES.map(t => (
            <option key={t} value={t}>{t || 'All types'}</option>
          ))}
        </select>

        <button
          onClick={() => refetch()}
          className="p-1.5 rounded border"
          style={{
            backgroundColor: 'var(--color-bg-page)',
            borderColor: 'var(--color-border-default)',
            color: 'var(--color-text-secondary)',
          }}
          title="Refresh"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Sort bar */}
      <div
        className="px-4 py-1.5 border-b flex items-center gap-4 text-xs"
        style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-tertiary)' }}
      >
        <span>{total} entities</span>
        <span>Sort:</span>
        {[
          { key: 'updatedAt', label: 'Recent' },
          { key: 'assertionCount', label: 'Signals' },
          { key: 'name', label: 'Name' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleSortChange(key)}
            className="font-medium"
            style={{
              color: filters.sort === key
                ? 'var(--color-text-primary)'
                : 'var(--color-text-tertiary)',
              textDecoration: filters.sort === key ? 'underline' : 'none',
            }}
          >
            {label}{filters.sort === key ? (filters.order === 'desc' ? ' ↓' : ' ↑') : ''}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading && entities.length === 0 && (
          <div className="flex items-center justify-center h-32 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
            Loading…
          </div>
        )}
        {!loading && entities.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 gap-2" style={{ color: 'var(--color-text-tertiary)' }}>
            <Database size={32} opacity={0.4} />
            <span className="text-sm">No entities found</span>
          </div>
        )}
        {entities.map(entity => (
          <EntityRow
            key={entity.id}
            entity={entity}
            tombstoning={tombstoning === entity.id}
            onTombstone={e => handleTombstone(e, entity.id)}
          />
        ))}
      </div>
    </>
  );
}

function EntityRow({ entity, tombstoning, onTombstone }) {
  const colors = ENTITY_TYPE_COLORS[entity.entityType] || { bg: '#f0f0f0', text: '#555' };
  const lastSignal = entity.lastSignalAt ? formatAge(entity.lastSignalAt) : null;

  return (
    <div
      className="px-4 py-3 border-b flex items-start gap-3"
      style={{
        borderColor: 'var(--color-border-default)',
        opacity: tombstoning ? 0.4 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      {/* Type badge */}
      <span
        className="text-xs font-semibold px-1.5 py-0.5 rounded shrink-0 mt-0.5"
        style={{ backgroundColor: colors.bg, color: colors.text }}
      >
        {entity.entityType}
      </span>

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium leading-snug truncate"
          style={{ color: 'var(--color-text-primary)' }}
          title={entity.name}
        >
          {entity.name}
        </p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
            {entity.assertionCount} signal{entity.assertionCount !== 1 ? 's' : ''}
          </span>
          {lastSignal && (
            <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              last {lastSignal}
            </span>
          )}
        </div>
      </div>

      {/* Tombstone button */}
      <button
        onClick={onTombstone}
        disabled={tombstoning}
        title="Archive entity"
        className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:opacity-100"
        style={{ color: 'var(--color-text-tertiary)' }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--brand-rose, #c0392b)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-tertiary)'}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}


// ── Shared utils ──────────────────────────────────────────────────────────────

function formatAge(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
