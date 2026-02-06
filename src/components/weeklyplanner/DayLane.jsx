import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { PlannerCard } from './PlannerCard';
import { dayTotals, teddyCoverage } from './financials';
import { DayTotalsBar } from './DayTotalsBar';
import { timeToOffset, timeToHeight, GUTTER_TOTAL_HEIGHT } from './TimeGutter';

function DroppableZone({ id, children, label, isEmpty }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className="min-h-[60px] rounded-md p-2 transition-colors"
      style={isOver ? {
        backgroundColor: 'color-mix(in srgb, var(--color-action-primary-bg) 15%, transparent)',
        boxShadow: 'inset 0 0 0 1px var(--color-action-primary-border)',
        borderRadius: '8px',
      } : {}}
    >
      <div
        className="text-[10px] uppercase tracking-wider font-medium mb-1.5 px-1"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {label}
      </div>
      {children}
      {isEmpty && !isOver && (
        <div
          className="text-xs text-center py-3 border border-dashed rounded"
          style={{
            color: 'var(--color-text-muted)',
            borderColor: 'var(--color-border-default)',
          }}
        >
          Drop here
        </div>
      )}
    </div>
  );
}

export function DayLane({ day, cards, allCards, onToggle, onCardClick, timePositioned, onDayClick }) {
  const timedCards = cards
    .filter((c) => c.zone === 'timed')
    .sort((a, b) => {
      if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
      return (a.order || 0) - (b.order || 0);
    });

  const untimedCards = cards
    .filter((c) => c.zone === 'untimed')
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const totals = dayTotals(allCards, day);
  const coverage = teddyCoverage(allCards, day);

  const effectMultipliers = {};
  for (const c of cards) {
    if (c.effectTarget && c.effectType === 'double_revenue' && (!c.optional || c.enabled)) {
      effectMultipliers[c.effectTarget] = (effectMultipliers[c.effectTarget] || 1) * 2;
    }
  }

  const timedDropId = `${day}:timed`;
  const untimedDropId = `${day}:untimed`;
  const timedIds = timedCards.map((c) => c.id);
  const untimedIds = untimedCards.map((c) => c.id);

  return (
    <div
      className="flex flex-col rounded-xl border min-w-[200px] w-full"
      style={{
        backgroundColor: 'var(--color-bg-page)',
        borderColor: 'var(--color-border-default)',
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-2.5 rounded-t-xl cursor-pointer"
        style={{
          borderBottom: '1px solid var(--color-border-default)',
          backgroundColor: 'var(--color-bg-card)',
        }}
        onClick={() => onDayClick?.(day)}
      >
        <div className="flex items-center justify-between">
          <h3
            className="text-sm font-semibold font-display"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {day}
          </h3>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {cards.length}
          </span>
        </div>

        {coverage.length > 0 && (
          <div
            className="mt-1 text-[10px] rounded px-1.5 py-0.5 inline-block"
            style={{
              color: 'var(--brand-ink)',
              backgroundColor: 'var(--brand-neutral-2)',
            }}
          >
            Teddy: {coverage.join(' / ')}
          </div>
        )}

        <div className="mt-1.5">
          <DayTotalsBar totals={totals} />
        </div>
      </div>

      {/* Card zones */}
      <div
        className="flex-1 p-1.5 space-y-1 overflow-y-auto"
        style={{ maxHeight: timePositioned ? undefined : 'calc(100vh - 260px)' }}
      >
        {/* Timed zone */}
        <SortableContext items={timedIds} strategy={verticalListSortingStrategy}>
          {timePositioned ? (
            <DroppableZone id={timedDropId} label="Timed" isEmpty={timedCards.length === 0}>
              <div className="relative" style={{ height: GUTTER_TOTAL_HEIGHT }}>
                {timedCards.map((card) => {
                  const top = timeToOffset(card.startTime);
                  const height = timeToHeight(card.startTime, card.endTime);
                  return (
                    <div
                      key={card.id}
                      className="absolute left-0 right-0"
                      style={{ top, height, minHeight: 28, zIndex: 1 }}
                    >
                      <PlannerCard
                        card={card}
                        onToggle={onToggle}
                        onClick={onCardClick}
                        effectMultiplier={effectMultipliers[card.id]}
                      />
                    </div>
                  );
                })}
              </div>
            </DroppableZone>
          ) : (
            <DroppableZone id={timedDropId} label="Timed" isEmpty={timedCards.length === 0}>
              {timedCards.map((card) => (
                <PlannerCard
                  key={card.id}
                  card={card}
                  onToggle={onToggle}
                  onClick={onCardClick}
                  effectMultiplier={effectMultipliers[card.id]}
                />
              ))}
            </DroppableZone>
          )}
        </SortableContext>

        {/* Untimed zone */}
        <SortableContext items={untimedIds} strategy={verticalListSortingStrategy}>
          <DroppableZone id={untimedDropId} label="Untimed" isEmpty={untimedCards.length === 0}>
            {untimedCards.map((card) => (
              <PlannerCard
                key={card.id}
                card={card}
                onToggle={onToggle}
                onClick={onCardClick}
                effectMultiplier={effectMultipliers[card.id]}
              />
            ))}
          </DroppableZone>
        </SortableContext>
      </div>
    </div>
  );
}
