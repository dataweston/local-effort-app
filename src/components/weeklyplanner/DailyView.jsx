import React from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { DAYS } from './defaultSchedule';
import { dayTotals, teddyCoverage } from './financials';
import { DayTotalsBar } from './DayTotalsBar';
import { DailyCardExpanded } from './DailyCardExpanded';
import { useSwipe } from '../../hooks/useSwipe';

export function DailyView({ day, planner, onNextDay, onPrevDay, onDaySelect }) {
  const dayCards = planner.cardsByDay[day] || [];
  const totals = dayTotals(planner.cards, day);
  const coverage = teddyCoverage(planner.cards, day);

  const timedCards = dayCards
    .filter((c) => c.zone === 'timed')
    .sort((a, b) => {
      if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
      return (a.order || 0) - (b.order || 0);
    });

  const untimedCards = dayCards
    .filter((c) => c.zone === 'untimed')
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  // Build effect multipliers
  const effectMultipliers = {};
  for (const c of dayCards) {
    if (c.effectTarget && c.effectType === 'double_revenue' && (!c.optional || c.enabled)) {
      effectMultipliers[c.effectTarget] = (effectMultipliers[c.effectTarget] || 1) * 2;
    }
  }

  const swipeHandlers = useSwipe({
    onSwipeLeft: onNextDay,
    onSwipeRight: onPrevDay,
  });

  return (
    <div className="max-w-2xl mx-auto" {...swipeHandlers}>
      {/* Day navigation */}
      <div className="flex items-center justify-between py-4">
        <button
          onClick={onPrevDay}
          className="p-2 rounded-lg transition-colors touch-target-ios"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <ChevronLeft size={24} />
        </button>
        <h2
          className="text-xl font-bold font-display"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {day}
        </h2>
        <button
          onClick={onNextDay}
          className="p-2 rounded-lg transition-colors touch-target-ios"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Day selector pills */}
      <div className="flex justify-center gap-1 mb-4">
        {DAYS.map((d) => (
          <button
            key={d}
            onClick={() => onDaySelect(d)}
            className="px-2 py-1 text-xs font-medium rounded-full transition-colors"
            style={
              d === day
                ? {
                    backgroundColor: 'var(--color-action-primary-bg)',
                    color: 'var(--color-action-primary-text)',
                  }
                : {
                    color: 'var(--color-text-muted)',
                  }
            }
          >
            {d.slice(0, 3)}
          </button>
        ))}
      </div>

      {/* Totals bar */}
      <div
        className="rounded-xl p-4 mb-4 border"
        style={{
          backgroundColor: 'var(--color-bg-card)',
          borderColor: 'var(--color-border-default)',
        }}
      >
        <DayTotalsBar totals={totals} />
        {coverage.length > 0 && (
          <div
            className="mt-2 text-xs rounded px-2 py-1 inline-block"
            style={{
              color: 'var(--brand-ink)',
              backgroundColor: 'var(--brand-neutral-2)',
            }}
          >
            Teddy: {coverage.join(' / ')}
          </div>
        )}
      </div>

      {/* Timed cards */}
      {timedCards.length > 0 && (
        <div className="mb-4">
          <h3
            className="text-xs uppercase tracking-wider font-medium mb-2 px-1"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Timed
          </h3>
          <div className="space-y-3">
            {timedCards.map((card) => (
              <DailyCardExpanded
                key={card.id}
                card={card}
                onToggle={planner.handlers.handleToggle}
                onClick={planner.handlers.handleCardClick}
                effectMultiplier={effectMultipliers[card.id]}
              />
            ))}
          </div>
        </div>
      )}

      {/* Untimed cards */}
      {untimedCards.length > 0 && (
        <div className="mb-4">
          <h3
            className="text-xs uppercase tracking-wider font-medium mb-2 px-1"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Untimed
          </h3>
          <div className="space-y-3">
            {untimedCards.map((card) => (
              <DailyCardExpanded
                key={card.id}
                card={card}
                onToggle={planner.handlers.handleToggle}
                onClick={planner.handlers.handleCardClick}
                effectMultiplier={effectMultipliers[card.id]}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {dayCards.length === 0 && (
        <div
          className="text-center py-12 rounded-xl border border-dashed"
          style={{
            color: 'var(--color-text-muted)',
            borderColor: 'var(--color-border-default)',
          }}
        >
          <p className="text-sm">No cards scheduled</p>
        </div>
      )}

      {/* Add card */}
      <button
        onClick={() => planner.handlers.handleAddCard(day)}
        className="w-full mt-4 flex items-center justify-center gap-2 py-3 text-sm font-medium rounded-xl border border-dashed transition-colors touch-target-ios"
        style={{
          color: 'var(--color-text-muted)',
          borderColor: 'var(--color-border-default)',
        }}
      >
        <Plus size={16} />
        Add card
      </button>
    </div>
  );
}
