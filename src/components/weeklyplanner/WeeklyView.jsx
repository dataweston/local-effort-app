import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { DayLane } from './DayLane';
import { MobileDaySelector } from './MobileDaySelector';
import { COGSSection } from './COGSSection';
import { formatDateShort } from './dateUtils';
import { useSwipe } from '../../hooks/useSwipe';

export function WeeklyView({ planner, weekDates, weekStart, onDayClick, onNextWeek, onPrevWeek }) {
  const { cardsByDate, cards, activeCard, handlers } = planner;
  const [mobileDateIndex, setMobileDateIndex] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const swipeHandlers = useSwipe({
    onSwipeLeft: () => setMobileDateIndex((i) => Math.min(i + 1, weekDates.length - 1)),
    onSwipeRight: () => setMobileDateIndex((i) => Math.max(i - 1, 0)),
  });

  const firstDate = formatDateShort(weekDates[0]);
  const lastDate = formatDateShort(weekDates[6]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handlers.handleDragStart}
      onDragOver={handlers.handleDragOver}
      onDragEnd={handlers.handleDragEnd}
    >
      {/* Week navigation header */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <button
          onClick={onPrevWeek}
          className="p-2 rounded-lg transition-colors touch-target-ios"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <ChevronLeft size={20} />
        </button>
        <span
          className="text-sm font-semibold font-display"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {firstDate} – {lastDate}
        </span>
        <button
          onClick={onNextWeek}
          className="p-2 rounded-lg transition-colors touch-target-ios"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Desktop: all 7 lanes */}
      <div className="hidden lg:grid grid-cols-7 gap-2">
        {weekDates.map((date) => (
          <div key={date} className="flex flex-col gap-2">
            <DayLane
              date={date}
              cards={cardsByDate[date] || []}
              allCards={cards}
              onToggle={handlers.handleToggle}
              onCardClick={handlers.handleCardClick}
              onDayClick={onDayClick}
            />
            <button
              onClick={() => handlers.handleAddCard(date)}
              className="flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg border border-dashed transition-colors touch-target-ios"
              style={{
                color: 'var(--color-text-muted)',
                borderColor: 'var(--color-border-default)',
              }}
            >
              <Plus size={14} />
              Add
            </button>
          </div>
        ))}
      </div>

      {/* Tablet: 3 visible lanes, horizontal scroll */}
      <div className="hidden md:flex lg:hidden overflow-x-auto snap-x snap-mandatory gap-3 pb-4 scrollbar-hide">
        {weekDates.map((date) => (
          <div key={date} className="snap-start flex-shrink-0 flex flex-col gap-2" style={{ width: 'calc(33.333% - 8px)' }}>
            <DayLane
              date={date}
              cards={cardsByDate[date] || []}
              allCards={cards}
              onToggle={handlers.handleToggle}
              onCardClick={handlers.handleCardClick}
              onDayClick={onDayClick}
            />
            <button
              onClick={() => handlers.handleAddCard(date)}
              className="flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg border border-dashed transition-colors touch-target-ios"
              style={{
                color: 'var(--color-text-muted)',
                borderColor: 'var(--color-border-default)',
              }}
            >
              <Plus size={14} />
              Add
            </button>
          </div>
        ))}
      </div>

      {/* Mobile: single lane + date selector + swipe */}
      <div className="md:hidden">
        <MobileDaySelector
          dates={weekDates}
          selectedIndex={mobileDateIndex}
          onChange={setMobileDateIndex}
        />
        <div {...swipeHandlers} className="mt-2">
          <DayLane
            date={weekDates[mobileDateIndex]}
            cards={cardsByDate[weekDates[mobileDateIndex]] || []}
            allCards={cards}
            onToggle={handlers.handleToggle}
            onCardClick={handlers.handleCardClick}
            onDayClick={onDayClick}
          />
          <button
            onClick={() => handlers.handleAddCard(weekDates[mobileDateIndex])}
            className="w-full mt-2 flex items-center justify-center gap-1.5 py-3 text-sm font-medium rounded-lg border border-dashed transition-colors touch-target-ios"
            style={{
              color: 'var(--color-text-muted)',
              borderColor: 'var(--color-border-default)',
            }}
          >
            <Plus size={16} />
            Add card
          </button>
        </div>
      </div>

      {/* Weekly COGS section */}
      <div className="mt-6 max-w-md">
        <COGSSection
          items={planner.weekCogs}
          weekStart={weekStart}
          onAdd={handlers.handleAddCOGS}
          onDelete={handlers.handleDeleteCOGS}
        />
      </div>

      <DragOverlay>
        {activeCard && (
          <div
            className="rounded-lg px-3 py-2.5 shadow-lg opacity-90 max-w-[220px] border"
            style={{
              backgroundColor: 'var(--color-bg-card)',
              borderColor: 'var(--color-action-primary-border)',
            }}
          >
            <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {activeCard.title}
            </div>
            {activeCard.people.length > 0 && (
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                {activeCard.people.join(', ')}
              </div>
            )}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
