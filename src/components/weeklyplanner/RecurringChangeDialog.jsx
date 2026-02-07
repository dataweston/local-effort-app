import React from 'react';
import { X } from 'lucide-react';

export function RecurringChangeDialog({ pendingChange, onConfirm, onCancel }) {
  if (!pendingChange) return null;

  const isDelete = pendingChange.type === 'delete';
  const title = isDelete ? 'Delete recurring card?' : 'Edit recurring card?';
  const description = isDelete
    ? 'This card repeats weekly. Would you like to delete just this occurrence, or this and all future occurrences?'
    : 'This card repeats weekly. Would you like to change just this occurrence, or this and all future occurrences?';

  return (
    <>
      <div
        className="fixed inset-0 z-50"
        style={{ backgroundColor: 'var(--color-overlay)' }}
        onClick={onCancel}
      />
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm rounded-xl shadow-xl p-5"
        style={{
          backgroundColor: 'var(--color-bg-card)',
          border: '1px solid var(--color-border-default)',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3
            className="text-sm font-semibold font-display"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {title}
          </h3>
          <button
            onClick={onCancel}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-xs mb-5" style={{ color: 'var(--color-text-muted)' }}>
          {description}
        </p>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => onConfirm('single')}
            className="w-full py-2.5 text-sm font-medium rounded-lg border transition-colors touch-target-ios"
            style={{
              borderColor: 'var(--color-border-default)',
              color: 'var(--color-text-primary)',
              backgroundColor: 'var(--color-bg-page)',
            }}
          >
            Just this one
          </button>
          <button
            onClick={() => onConfirm('future')}
            className="w-full py-2.5 text-sm font-medium rounded-lg transition-colors touch-target-ios"
            style={{
              backgroundColor: isDelete ? 'var(--color-state-danger)' : 'var(--color-action-primary-bg)',
              color: isDelete ? '#fff' : 'var(--color-action-primary-text)',
            }}
          >
            {isDelete ? 'Delete this and all future' : 'Change this and all future'}
          </button>
          <button
            onClick={onCancel}
            className="w-full py-2 text-xs font-medium rounded-lg transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}
