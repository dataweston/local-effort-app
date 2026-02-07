import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DollarSign, Clock, Users, GripVertical, ToggleLeft, ToggleRight } from 'lucide-react';
import { cardCost, cardBaseRevenue, hoursFromTimes } from './financials';

const CARD_COLORS = {
  'Co-op': '#bf501b',
  'Cook': '#8b6d2e',
  'Pizza': '#b5442e',
  'Admin': '#9e6b3a',
  'Babysitter for Teddy': '#c47a2a',
  'Catherine off with Teddy': '#7a846e',
  'Second cook': '#a85d34',
  'Substitute cook': '#8a5a3c',
  'Teddy with Weston': '#6b7d5e',
};

function getCardColor(title) {
  if (CARD_COLORS[title]) return CARD_COLORS[title];
  for (const [key, color] of Object.entries(CARD_COLORS)) {
    if (title.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return 'var(--color-border-default)';
}

export function PlannerCard({ card, onToggle, onClick, effectMultiplier }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: { card },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const isDisabled = card.optional && !card.enabled;
  const baseRev = cardBaseRevenue(card);
  const effectiveRevenue = baseRev * (effectMultiplier || 1);
  const cost = cardCost(card);
  const hasFinancial = effectiveRevenue > 0 || cost > 0;
  const accentColor = getCardColor(card.title);

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, borderLeftColor: accentColor, borderLeftWidth: '3px' }}
      className={`
        group relative rounded-lg border px-3 py-2.5 mb-2 cursor-pointer
        transition-shadow hover:shadow-md
        ${isDragging ? 'shadow-lg' : ''}
        ${isDisabled ? 'opacity-60' : ''}
      `}
      onClick={() => onClick(card)}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="absolute left-0.5 top-1/2 -translate-y-1/2 p-1.5 cursor-grab active:cursor-grabbing touch-target-ios"
        style={{ color: 'var(--color-text-muted)' }}
        onClick={(e) => e.stopPropagation()}
        aria-label="Drag to reorder"
      >
        <GripVertical size={14} />
      </button>

      <div className="ml-5">
        {/* Title row */}
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-sm font-medium"
            style={{ color: isDisabled ? 'var(--color-text-muted)' : 'var(--color-text-primary)' }}
          >
            {card.title}
          </span>
          {card.optional && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle(card.id);
              }}
              className="flex-shrink-0 transition-colors touch-target-ios flex items-center justify-center"
              aria-label={card.enabled ? 'Disable' : 'Enable'}
            >
              {card.enabled ? (
                <ToggleRight size={22} style={{ color: 'var(--color-action-primary-bg)' }} />
              ) : (
                <ToggleLeft size={22} style={{ color: 'var(--color-text-muted)' }} />
              )}
            </button>
          )}
        </div>

        {/* People */}
        {card.people.length > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <Users size={12} style={{ color: 'var(--color-text-muted)' }} />
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {card.people.join(', ')}
            </span>
          </div>
        )}

        {/* Time */}
        {card.startTime && card.endTime && (
          <div className="flex items-center gap-1 mt-0.5">
            <Clock size={12} style={{ color: 'var(--color-text-muted)' }} />
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {card.startTime}–{card.endTime}
              {card.costPerHour > 0 && ` (${hoursFromTimes(card.startTime, card.endTime)}h)`}
            </span>
          </div>
        )}

        {/* Financial indicators */}
        {hasFinancial && !isDisabled && (
          <div className="flex items-center gap-3 mt-1.5">
            {effectiveRevenue > 0 && (
              <span
                className="inline-flex items-center gap-0.5 text-xs font-medium rounded px-1.5 py-0.5"
                style={{
                  color: 'var(--color-state-success)',
                  backgroundColor: 'color-mix(in srgb, var(--color-state-success) 12%, transparent)',
                }}
              >
                <DollarSign size={10} />
                +{effectiveRevenue}
                {effectMultiplier > 1 && (
                  <span className="ml-0.5 text-[10px] opacity-70">({effectMultiplier}×)</span>
                )}
              </span>
            )}
            {cost > 0 && (
              <span
                className="inline-flex items-center gap-0.5 text-xs font-medium rounded px-1.5 py-0.5"
                style={{
                  color: 'var(--color-state-danger)',
                  backgroundColor: 'color-mix(in srgb, var(--color-state-danger) 12%, transparent)',
                }}
              >
                <DollarSign size={10} />
                −{cost}
              </span>
            )}
          </div>
        )}

        {/* Effect badge */}
        {card.effectType === 'double_revenue' && card.effectTarget && !isDisabled && (
          <div className="mt-1">
            <span
              className="text-[10px] font-medium rounded px-1.5 py-0.5"
              style={{
                color: 'var(--brand-ink)',
                backgroundColor: 'var(--brand-neutral-1)',
              }}
            >
              2× revenue boost
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
