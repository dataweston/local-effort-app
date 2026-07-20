import React, { useState } from 'react';
import { Plus, Trash2, DollarSign } from 'lucide-react';

export function COGSSection({ items = [], weekStart, onAdd, onDelete }) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');

  const handleAdd = () => {
    const trimmed = name.trim();
    const amountCents = Math.round(Number(amount) * 100);
    if (!trimmed || !amountCents || amountCents <= 0) return;
    onAdd({ weekStart, name: trimmed, amount: Math.round(amountCents / 100), amountCents, status: 'projected' });
    setName('');
    setAmount('');
  };

  const itemAmount = (item) => item.amountCents != null ? item.amountCents / 100 : (item.amount || 0);
  const total = items.reduce((sum, item) => sum + itemAmount(item), 0);

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
        Weekly COGS
      </h3>
      <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
        Cost of goods sold — ingredients, supplies, etc.
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
                {item.status && (
                  <span className="ml-2 rounded-full px-1.5 py-0.5 text-[9px] uppercase" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-muted)' }}>
                    {item.status}
                  </span>
                )}
                {item.notes && <span className="mt-0.5 block text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{item.notes}</span>}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: 'var(--color-state-danger)' }}>
                  ${itemAmount(item).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              Total COGS
            </span>
            <span className="text-sm flex items-center gap-0.5" style={{ color: 'var(--color-state-danger)' }}>
              <DollarSign size={12} />{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="$"
          min="0"
          step="0.01"
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
