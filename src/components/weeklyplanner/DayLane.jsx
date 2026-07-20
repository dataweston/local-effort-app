import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { PlannerCard } from './PlannerCard';
import { dayTotalsWithActual, teddyCoverage } from './financials';
import { DayTotalsBar } from './DayTotalsBar';
import { getDayOfWeek, formatDateShort, isToday } from './dateUtils';

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

export function DayLane({ date, cards, allCards, actualsByDate = {}, onToggle, onCardClick, onDayClick }) {
  const dayOfWeek = getDayOfWeek(date);
  const today = isToday(date);

  const timedCards = cards
    .filter((c) => c.zone === 'timed')
    .sort((a, b) => {
      if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
      return (a.order || 0) - (b.order || 0);
    });

  const untimedCards = cards
    .filter((c) => c.zone === 'untimed')
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const totals = dayTotalsWithActual(allCards, date, actualsByDate);
  const coverage = teddyCoverage(allCards, date);

  const effectMultipliers = {};
  for (const c of cards) {
    if (c.effectTarget && c.effectType === 'double_revenue' && (!c.optional || c.enabled)) {
      effectMultipliers[c.effectTarget] = (effectMultipliers[c.effectTarget] || 1) * 2;
    }
  }

  const timedDropId = `${date}:timed`;
  const untimedDropId = `${date}:untimed`;
  const timedIds = timedCards.map((c) => c.id);
  const untimedIds = untimedCards.map((c) => c.id);

  const shortDate = formatDateShort(date);
  const dateNum = shortDate.split(' ')[1];

  return (
    <div
      className="flex flex-col rounded-xl border min-w-[200px] w-full"
      style={{
        backgroundColor: 'var(--color-bg-page)',
        borderColor: today ? 'var(--color-action-primary-bg)' : 'var(--color-border-default)',
        borderWidth: today ? '2px' : '1px',
      }}
    >
      <div
        className="px-3 py-2.5 rounded-t-xl cursor-pointer"
        style={{
          borderBottom: '1px solid var(--color-border-default)',
          backgroundColor: today
            ? 'color-mix(in srgb, var(--color-action-primary-bg) 8%, var(--color-bg-card))'
            : 'var(--color-bg-card)',
        }}
        onClick={() => onDayClick?.(date)}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold font-display" style={{ color: 'var(--color-text-primary)' }}>
              {dayOfWeek}
            </h3>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{dateNum}</span>
          </div>
        </div>

        {coverage.length > 0 && (
          <div
            className="mt-1 text-[10px] rounded px-1.5 py-0.5 inline-block"
            style={{ color: 'var(--brand-ink)', backgroundColor: 'var(--brand-neutral-2)' }}
          >
            Teddy: {coverage.join(' / ')}
          </div>
        )}

        <div className="mt-1.5">
          <DayTotalsBar totals={totals} />
          {totals.hasActual && <div className="mt-1 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>P ${totals.plannedRevenue} · A ${totals.actualRevenue}</div>}
        </div>
      </div>

      <div className="flex-1 p-1.5 space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
        <SortableContext items={timedIds} strategy={verticalListSortingStrategy}>
          <DroppableZone id={timedDropId} label="Timed" isEmpty={timedCards.length === 0}>
            {timedCards.map((card) => (
              <PlannerCard key={card.id} card={card} onToggle={onToggle} onClick={onCardClick} effectMultiplier={effectMultipliers[card.id]} />
            ))}
          </DroppableZone>
        </SortableContext>

        <SortableContext items={untimedIds} strategy={verticalListSortingStrategy}>
          <DroppableZone id={untimedDropId} label="Untimed" isEmpty={untimedCards.length === 0}>
            {untimedCards.map((card) => (
              <PlannerCard key={card.id} card={card} onToggle={onToggle} onClick={onCardClick} effectMultiplier={effectMultipliers[card.id]} />
            ))}
          </DroppableZone>
        </SortableContext>
      </div>
    </div>
  );
}
