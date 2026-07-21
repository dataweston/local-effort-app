import React from 'react';
import { DollarSign } from 'lucide-react';
import { money } from './financials';

export function DayTotalsBar({ totals }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      {totals.revenue > 0 && (
        <span className="flex items-center gap-0.5" style={{ color: 'var(--color-state-success)' }}>
          <DollarSign size={10} />+{money(totals.revenue)}
        </span>
      )}
      {totals.labor > 0 && (
        <span className="flex items-center gap-0.5" style={{ color: 'var(--color-state-danger)' }}>
          <DollarSign size={10} />−{money(totals.labor)} labor
        </span>
      )}
      {totals.facility > 0 && (
        <span className="flex items-center gap-0.5" style={{ color: 'var(--color-state-danger)' }}>
          <DollarSign size={10} />−{money(totals.facility)} facility
        </span>
      )}
      <span
        className="font-semibold"
        style={{ color: totals.net >= 0 ? 'var(--color-state-success)' : 'var(--color-state-danger)' }}
      >
        Net: ${money(totals.net)}
      </span>
    </div>
  );
}
