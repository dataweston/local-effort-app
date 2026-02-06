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
import { Plus } from 'lucide-react';
import { DAYS } from './defaultSchedule';
import { DayLane } from './DayLane';
import { TimeGutter } from './TimeGutter';
import { MobileDaySelector } from './MobileDaySelector';
import { useSwipe } from '../../hooks/useSwipe';

export function WeeklyView({ planner, onDayClick }) {
  const { cardsByDay, cards, activeCard, handlers } = planner;
  const [mobileDayIndex, setMobileDayIndex] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const swipeHandlers = useSwipe({
    onSwipeLeft: () => setMobileDayIndex((i) => Math.min(i + 1, DAYS.length - 1)),
    onSwipeRight: () => setMobileDayIndex((i) => Math.max(i - 1, 0)),
  });

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handlers.handleDragStart}
      onDragOver={handlers.handleDragOver}
      onDragEnd={handlers.handleDragEnd}
    >
      {/* Desktop: all 7 lanes with time gutter */}
      <div className="hidden lg:flex gap-0">
        <TimeGutter />
        <div className="flex-1 grid grid-cols-7 gap-2 pl-1">
          {DAYS.map((day) => (
            <div key={day} className="flex flex-col gap-2">
              <DayLane
                day={day}
                cards={cardsByDay[day]}
                allCards={cards}
                onToggle={handlers.handleToggle}
                onCardClick={handlers.handleCardClick}
                timePositioned
                onDayClick={onDayClick}
              />
              <button
                onClick={() => handlers.handleAddCard(day)}
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
      </div>

      {/* Tablet: 3 visible lanes, horizontal scroll */}
      <div className="hidden md:flex lg:hidden overflow-x-auto snap-x snap-mandatory gap-3 pb-4 scrollbar-hide">
        {DAYS.map((day) => (
          <div key={day} className="snap-start flex-shrink-0 flex flex-col gap-2" style={{ width: 'calc(33.333% - 8px)' }}>
            <DayLane
              day={day}
              cards={cardsByDay[day]}
              allCards={cards}
              onToggle={handlers.handleToggle}
              onCardClick={handlers.handleCardClick}
              onDayClick={onDayClick}
            />
            <button
              onClick={() => handlers.handleAddCard(day)}
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

      {/* Mobile: single lane + day selector + swipe */}
      <div className="md:hidden">
        <MobileDaySelector
          days={DAYS}
          selectedIndex={mobileDayIndex}
          onChange={setMobileDayIndex}
        />
        <div {...swipeHandlers} className="mt-2">
          <DayLane
            day={DAYS[mobileDayIndex]}
            cards={cardsByDay[DAYS[mobileDayIndex]]}
            allCards={cards}
            onToggle={handlers.handleToggle}
            onCardClick={handlers.handleCardClick}
            onDayClick={onDayClick}
          />
          <button
            onClick={() => handlers.handleAddCard(DAYS[mobileDayIndex])}
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
