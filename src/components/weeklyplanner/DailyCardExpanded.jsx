import React from 'react';
import { DollarSign, Clock, Users, ToggleLeft, ToggleRight } from 'lucide-react';
import { cardCost, cardBaseRevenue, hoursFromTimes } from './financials';

export function DailyCardExpanded({ card, onToggle, onClick, effectMultiplier }) {
  const isDisabled = card.optional && !card.enabled;
  const baseRev = cardBaseRevenue(card);
  const effectiveRevenue = baseRev * (effectMultiplier || 1);
  const cost = cardCost(card);
  const duration = hoursFromTimes(card.startTime, card.endTime);

  return (
    <div
      className="rounded-xl border p-4 transition-shadow hover:shadow-md cursor-pointer"
      style={{
        backgroundColor: 'var(--color-bg-card)',
        borderColor: 'var(--color-border-default)',
        opacity: isDisabled ? 0.55 : 1,
      }}
      onClick={() => onClick(card)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          {/* Title */}
          <h4
            className="text-base font-semibold font-display"
            style={{ color: isDisabled ? 'var(--color-text-muted)' : 'var(--color-text-primary)' }}
          >
            {card.title}
          </h4>

          {/* People */}
          {card.people.length > 0 && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <Users size={14} style={{ color: 'var(--color-text-muted)' }} />
              <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {card.people.join(', ')}
              </span>
            </div>
          )}

          {/* Time */}
          {card.startTime && card.endTime && (
            <div className="flex items-center gap-1.5 mt-1">
              <Clock size={14} style={{ color: 'var(--color-text-muted)' }} />
              <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {card.startTime} – {card.endTime}
                <span className="ml-1 opacity-70">({duration}h)</span>
              </span>
            </div>
          )}
        </div>

        {/* Optional toggle */}
        {card.optional && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(card.id);
            }}
            className="flex-shrink-0 touch-target-ios flex items-center justify-center"
            aria-label={card.enabled ? 'Disable' : 'Enable'}
          >
            {card.enabled ? (
              <ToggleRight size={28} style={{ color: 'var(--color-action-primary-bg)' }} />
            ) : (
              <ToggleLeft size={28} style={{ color: 'var(--color-text-muted)' }} />
            )}
          </button>
        )}
      </div>

      {/* Financial row */}
      {(effectiveRevenue > 0 || cost > 0) && !isDisabled && (
        <div className="flex items-center gap-4 mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border-default)' }}>
          {effectiveRevenue > 0 && (
            <div className="flex items-center gap-1">
              <DollarSign size={14} style={{ color: 'var(--color-state-success)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--color-state-success)' }}>
                +${effectiveRevenue}
              </span>
              {effectMultiplier > 1 && (
                <span className="text-xs opacity-60 ml-0.5">({effectMultiplier}×)</span>
              )}
            </div>
          )}
          {cost > 0 && (
            <div className="flex items-center gap-1">
              <DollarSign size={14} style={{ color: 'var(--color-state-danger)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--color-state-danger)' }}>
                −${cost}
              </span>
              {card.costPerHour > 0 && (
                <span className="text-xs opacity-60 ml-0.5">(${card.costPerHour}/hr)</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Effect badge */}
      {card.effectType === 'double_revenue' && card.effectTarget && !isDisabled && (
        <div className="mt-2">
          <span
            className="text-xs font-medium rounded-full px-2.5 py-1"
            style={{
              color: 'var(--brand-ink)',
              backgroundColor: 'var(--brand-neutral-1)',
            }}
          >
            2× revenue boost active
          </span>
        </div>
      )}
    </div>
  );
}
