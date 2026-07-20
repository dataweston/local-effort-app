import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { PEOPLE } from './defaultSchedule';
import { formatDateShort } from './dateUtils';

export function StaffScheduleView({ planner, weekDates, onNextWeek, onPrevWeek }) {
  const people = useMemo(() => {
    const names = new Set(PEOPLE);
    planner.cards.forEach((card) => (card.people || []).forEach((name) => names.add(name)));
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [planner.cards]);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onPrevWeek} className="rounded-lg p-2" style={{ color: 'var(--color-text-secondary)' }}><ChevronLeft size={20} /></button>
        <div className="text-center">
          <h2 className="text-lg font-bold font-display" style={{ color: 'var(--color-text-primary)' }}>Staff schedule</h2>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{formatDateShort(weekDates[0])} – {formatDateShort(weekDates[6])}</p>
        </div>
        <button type="button" onClick={onNextWeek} className="rounded-lg p-2" style={{ color: 'var(--color-text-secondary)' }}><ChevronRight size={20} /></button>
      </div>
      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-card)' }}>
        <div className="min-w-[760px]">
          <div className="grid grid-cols-[150px_repeat(7,minmax(85px,1fr))] border-b" style={{ borderColor: 'var(--color-border-default)' }}>
            <div className="p-3 text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}><Users size={14} className="inline mr-1" />Person</div>
            {weekDates.map((date) => <div key={date} className="p-3 text-center text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{formatDateShort(date)}</div>)}
          </div>
          {people.map((person) => (
            <div key={person} className="grid grid-cols-[150px_repeat(7,minmax(85px,1fr))] border-b last:border-b-0" style={{ borderColor: 'var(--color-border-default)' }}>
              <div className="p-3 text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{person}</div>
              {weekDates.map((date) => {
                const items = planner.cardsByDate[date].filter((card) => (card.people || []).includes(person));
                return <div key={date} className="min-h-16 border-l p-1.5 space-y-1" style={{ borderColor: 'var(--color-border-default)' }}>
                  {items.map((card) => <button key={card.id} type="button" onClick={() => planner.handlers.handleCardClick(card)} className="block w-full rounded px-1.5 py-1 text-left text-[10px]" style={{ backgroundColor: card.objectType === 'event' ? 'color-mix(in srgb, var(--color-action-primary-bg) 18%, transparent)' : 'var(--color-bg-page)', color: 'var(--color-text-primary)' }}><strong className="block truncate">{card.title}</strong><span style={{ color: 'var(--color-text-muted)' }}>{card.startTime || 'all day'}{card.endTime ? `–${card.endTime}` : ''}</span></button>)}
                </div>;
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
