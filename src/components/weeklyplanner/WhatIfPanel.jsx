import React from 'react';
import { ToggleLeft, ToggleRight, DollarSign } from 'lucide-react';
import { cardCost, hoursFromTimes } from './financials';

export function WhatIfPanel({ cards, onToggle }) {
  const optionalCards = cards.filter((c) => c.optional);

  if (optionalCards.length === 0) return null;

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
        What-If Toggles
      </h3>
      <p
        className="text-xs mb-4"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Toggle optional labor to see how it changes your monthly projection.
      </p>

      <div className="space-y-3">
        {optionalCards.map((card) => {
          const hours = hoursFromTimes(card.startTime, card.endTime);
          const weeklyCost = card.enabled ? cardCost(card) : (card.costPerHour || 0) * hours;
          const monthlyCost = weeklyCost * 4;
          const hasEffect = card.effectType === 'double_revenue' && card.effectTarget;

          return (
            <div
              key={card.id}
              className="flex items-center justify-between gap-3 rounded-lg p-3 border"
              style={{
                borderColor: 'var(--color-border-default)',
                backgroundColor: 'var(--color-bg-page)',
              }}
            >
              <div className="flex-1 min-w-0">
                <div
                  className="text-sm font-medium truncate"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {card.title}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {card.day}
                  {hours > 0 && ` · ${hours}h`}
                  {monthlyCost > 0 && (
                    <span style={{ color: 'var(--color-state-danger)' }}>
                      {' '}· −${monthlyCost}/mo
                    </span>
                  )}
                  {hasEffect && (
                    <span style={{ color: 'var(--brand-ink)' }}> · 2× revenue</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => onToggle(card.id)}
                className="flex-shrink-0 touch-target-ios flex items-center justify-center"
                aria-label={card.enabled ? 'Disable' : 'Enable'}
              >
                {card.enabled ? (
                  <ToggleRight size={28} style={{ color: 'var(--color-action-primary-bg)' }} />
                ) : (
                  <ToggleLeft size={28} style={{ color: 'var(--color-text-muted)' }} />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
