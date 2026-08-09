import React, { useMemo, useState } from 'react';
import { CalendarCheck2, Clock, DollarSign, Users } from 'lucide-react';
import { formatDateFull } from './dateUtils';
import { money } from './financials';

const CONFIRMED_STATUSES = new Set(['confirmed', 'booked', 'scheduled']);

export function EventsView({ planner }) {
  const [showPast, setShowPast] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const events = useMemo(() => planner.cards
    .filter((card) => card.objectType === 'event' && (showPast || card.date >= today))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.startTime || '').localeCompare(String(b.startTime || ''))),
  [planner.cards, showPast, today]);

  const confirmedCount = events.filter((card) => CONFIRMED_STATUSES.has(card.status)).length;
  const expectedRevenue = events.reduce((sum, card) => sum + Number(card.revenue || 0), 0);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold font-display" style={{ color: 'var(--color-text-primary)' }}>Events</h2>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {confirmedCount} confirmed service date{confirmedCount === 1 ? '' : 's'} · ${money(expectedRevenue)} expected revenue entered
          </p>
        </div>
        <button type="button" className={`planner-button ${showPast ? 'is-active' : ''}`} onClick={() => setShowPast((value) => !value)}>
          {showPast ? 'Hide past events' : 'Show past events'}
        </button>
      </div>

      <div className="grid gap-3">
        {events.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => planner.handlers.handleCardClick(card)}
            className="grid w-full gap-3 rounded-xl border p-4 text-left sm:grid-cols-[150px_minmax(0,1fr)_auto]"
            style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-card)' }}
          >
            <span>
              <span className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--color-action-primary-bg)' }}>
                <CalendarCheck2 size={15} /> {formatDateFull(card.date)}
              </span>
              {card.startTime && <span className="mt-1 flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-muted)' }}><Clock size={11} />{card.startTime}{card.endTime ? `–${card.endTime}` : ''}</span>}
            </span>
            <span className="min-w-0">
              <strong className="block text-sm" style={{ color: 'var(--color-text-primary)' }}>{card.title}</strong>
              <span className="mt-1 flex flex-wrap gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                <span className="rounded-full px-2 py-0.5" style={{ backgroundColor: CONFIRMED_STATUSES.has(card.status) ? '#edf0e5' : 'var(--color-bg-page)' }}>
                  {CONFIRMED_STATUSES.has(card.status) ? 'Confirmed' : (card.status || 'Unconfirmed')}
                </span>
                {card.people?.length > 0 && <span className="inline-flex items-center gap-1"><Users size={11} />{card.people.join(', ')}</span>}
              </span>
            </span>
            <span className="flex items-center gap-1 text-sm font-semibold" style={{ color: card.revenue > 0 ? 'var(--color-state-success)' : 'var(--color-text-muted)' }}>
              <DollarSign size={14} />{card.revenue > 0 ? money(card.revenue) : 'Pricing TBD'}
            </span>
          </button>
        ))}
        {events.length === 0 && <p className="rounded-xl border p-6 text-center text-sm" style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-muted)' }}>No events to show.</p>}
      </div>
    </div>
  );
}
