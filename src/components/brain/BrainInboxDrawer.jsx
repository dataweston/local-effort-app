import React, { useEffect, useRef, useState } from 'react';
import { X, Trash2, Plus, Link2, CheckSquare, ChevronDown, ChevronUp, Inbox } from 'lucide-react';

/**
 * Slide-in inbox triage drawer.
 * Keyboard: j/k navigate, t=trash, n=new_entity, a=append_entity, x=close
 */
export function BrainInboxDrawer({ open, onClose, items, triage, loading }) {
  const [cursor, setCursor] = useState(0);
  const [triaging, setTriaging] = useState(null); // id being actioned
  const containerRef = useRef(null);

  // Reset cursor when items change
  useEffect(() => { setCursor(0); }, [items.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
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
  }, [open, cursor, items, onClose]);

  async function handleTriage(id, action, payload = {}) {
    setTriaging(id);
    await triage(id, action, payload);
    setTriaging(null);
  }

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
        ref={containerRef}
        className="fixed top-0 right-0 h-full z-50 flex flex-col shadow-2xl"
        style={{
          width: 'min(480px, 100vw)',
          backgroundColor: 'var(--color-bg-card)',
          borderLeft: '1px solid var(--color-border-default)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--color-border-default)' }}
        >
          <div className="flex items-center gap-2">
            <Inbox size={16} style={{ color: 'var(--color-text-secondary)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Brain Inbox
            </span>
            {items.length > 0 && (
              <span
                className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: 'var(--brand-rose, #e07070)',
                  color: '#fff',
                }}
              >
                {items.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              j/k navigate · t trash · esc close
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded transition-colors"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Item list */}
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
      </div>
    </>
  );
}

function InboxItem({ item, active, triaging, onClick, onTriage }) {
  const [expanded, setExpanded] = useState(false);

  const sourceLabel = {
    gmail: 'Gmail',
    square: 'Square',
    admin_ux: 'Manual',
    drafts: 'Drafts',
    obsidian: 'Obsidian',
    shortcut: 'Shortcut',
  }[item.source] ?? item.source;

  const age = formatAge(item.capturedAt);

  return (
    <div
      onClick={onClick}
      className="px-4 py-3 border-b cursor-pointer transition-colors"
      style={{
        borderColor: 'var(--color-border-default)',
        backgroundColor: active
          ? 'var(--color-bg-hover, rgba(0,0,0,0.04))'
          : 'transparent',
        opacity: triaging ? 0.5 : 1,
      }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <p
          className="text-sm flex-1 leading-snug"
          style={{ color: 'var(--color-text-primary)' }}
        >
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

      {/* Meta row */}
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

      {/* Actions — shown when active */}
      {active && (
        <div className="flex items-center gap-2 mt-2">
          <ActionButton
            icon={<Trash2 size={12} />}
            label="Trash"
            shortcut="t"
            danger
            onClick={e => { e.stopPropagation(); onTriage('trash'); }}
          />
          <ActionButton
            icon={<Plus size={12} />}
            label="New entity"
            shortcut="n"
            onClick={e => { e.stopPropagation(); onTriage('new_entity', { entityType: 'Vendor', name: item.rawContent.slice(0, 60) }); }}
          />
          <ActionButton
            icon={<Link2 size={12} />}
            label="Append"
            shortcut="a"
            onClick={e => { e.stopPropagation(); onTriage('append_entity', { entityId: null, note: item.rawContent }); }}
          />
          <ActionButton
            icon={<CheckSquare size={12} />}
            label="Task"
            shortcut="k"
            onClick={e => { e.stopPropagation(); onTriage('new_task', { title: item.rawContent.slice(0, 80) }); }}
          />
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
      <kbd
        className="ml-0.5 text-xs opacity-50"
        style={{ fontFamily: 'monospace' }}
      >
        {shortcut}
      </kbd>
    </button>
  );
}

function formatAge(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
