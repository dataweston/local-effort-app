import React, { useState } from 'react';
import { Plus, Trash2, DollarSign } from 'lucide-react';

export function OverheadSection({ items = [], onAdd, onDelete }) {
  const [name, setName] = useState('');
  const [monthlyCost, setMonthlyCost] = useState('');

  const handleAdd = () => {
    const trimmed = name.trim();
    const num = parseInt(monthlyCost, 10);
    if (!trimmed || !num || num <= 0) return;
    onAdd({ name: trimmed, monthlyCost: num });
    setName('');
    setMonthlyCost('');
  };

  const total = items.reduce((sum, i) => sum + (i.monthlyCost || 0), 0);

  return (
    <div
      className="rounded-xl p-4 border"
      style={{
        backgroundColor: 'var(--color-bg-card)',
        borderColor: 'var(--color-border-default)',
      }}
    >
      <h3
        className="text-sm font-semibold font-display mb-3"
        style={{ color: 'var(--color-text-primary)' }}
      >
        Monthly Overhead
      </h3>
      <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
        Fixed monthly expenses — rent, insurance, subscriptions, etc.
      </p>

      {items.length > 0 && (
        <div className="space-y-2 mb-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 border"
              style={{
                borderColor: 'var(--color-border-default)',
                backgroundColor: 'var(--color-bg-page)',
              }}
            >
              <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                {item.name}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: 'var(--color-state-danger)' }}>
                  ${item.monthlyCost}/mo
                </span>
                <button
                  onClick={() => onDelete(item.id)}
                  className="p-1 rounded transition-colors"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}

          <div
            className="flex items-center justify-between px-3 py-2 rounded-lg font-semibold"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-state-danger) 8%, transparent)',
            }}
          >
            <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
              Total Overhead
            </span>
            <span className="text-sm flex items-center gap-0.5" style={{ color: 'var(--color-state-danger)' }}>
              <DollarSign size={12} />{total}/mo
            </span>
          </div>
        </div>
      )}

      {/* Add form */}
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Expense name"
          className="flex-1 rounded-lg px-3 py-2 text-sm outline-none border"
          style={{
            borderColor: 'var(--color-border-default)',
            backgroundColor: 'var(--color-bg-page)',
            color: 'var(--color-text-primary)',
          }}
        />
        <input
          type="number"
          value={monthlyCost}
          onChange={(e) => setMonthlyCost(e.target.value)}
          placeholder="$/mo"
          min="0"
          className="w-20 rounded-lg px-3 py-2 text-sm outline-none border"
          style={{
            borderColor: 'var(--color-border-default)',
            backgroundColor: 'var(--color-bg-page)',
            color: 'var(--color-text-primary)',
          }}
        />
        <button
          onClick={handleAdd}
          className="flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors"
          style={{
            backgroundColor: 'var(--color-action-primary-bg)',
            color: 'var(--color-action-primary-text)',
          }}
        >
          <Plus size={14} />
          Add
        </button>
      </div>
    </div>
  );
}
