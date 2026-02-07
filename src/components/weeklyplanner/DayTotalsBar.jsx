import React from 'react';
import { DollarSign } from 'lucide-react';

export function DayTotalsBar({ totals }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      {totals.revenue > 0 && (
        <span className="flex items-center gap-0.5" style={{ color: 'var(--color-state-success)' }}>
          <DollarSign size={10} />+{totals.revenue}
        </span>
      )}
      {totals.cost > 0 && (
        <span className="flex items-center gap-0.5" style={{ color: 'var(--color-state-danger)' }}>
          <DollarSign size={10} />−{totals.cost} labor
        </span>
      )}
      <span
        className="font-semibold"
        style={{ color: totals.net >= 0 ? 'var(--color-state-success)' : 'var(--color-state-danger)' }}
      >
        Net: ${totals.net}
      </span>
    </div>
  );
}
