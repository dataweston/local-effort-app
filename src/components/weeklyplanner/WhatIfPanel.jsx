import React from 'react';
import { ToggleLeft, ToggleRight } from 'lucide-react';
import { cardCost, hoursFromTimes } from './financials';

export function WhatIfPanel({ cards, onToggle }) {
  const optionalCards = cards.filter((c) => c.optional);

  if (optionalCards.length === 0) return null;

  // Deduplicate by templateId so recurring cards show once.
  // When toggled, all instances with the same templateId get toggled.
  const seen = new Map();
  const uniqueCards = [];
  for (const card of optionalCards) {
    const key = card.templateId || card.id;
    if (!seen.has(key)) {
      seen.set(key, []);
      uniqueCards.push(card);
    }
    seen.get(key).push(card.id);
  }

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
        {uniqueCards.map((card) => {
          const hours = hoursFromTimes(card.startTime, card.endTime);
          const weeklyLabor = card.enabled ? cardCost(card) : (card.costPerHour || 0) * hours;
          const instanceCount = seen.get(card.templateId || card.id).length;
          const monthlyLabor = weeklyLabor * instanceCount;
          const hasEffect = card.effectType === 'double_revenue' && card.effectTarget;
          const allIds = seen.get(card.templateId || card.id);

          return (
            <div
              key={card.templateId || card.id}
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
                  {card.dayOfWeek || card.day}
                  {hours > 0 && ` · ${hours}h`}
                  {monthlyLabor > 0 && (
                    <span style={{ color: 'var(--color-state-danger)' }}>
                      {' '}· −${monthlyLabor}/mo labor
                    </span>
                  )}
                  {hasEffect && (
                    <span style={{ color: 'var(--brand-ink)' }}> · 2× revenue</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  for (const id of allIds) onToggle(id);
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
