import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, DollarSign, ExternalLink, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cardCost, isFacilityCard, money } from './financials';
import { formatDateFull, formatDateShort } from './dateUtils';

const FILTERS = [
  { id: 'schedule', label: 'Schedule' },
  { id: 'revenue', label: 'Revenue work' },
  { id: 'open', label: 'Open shifts' },
  { id: 'all', label: 'Everything' },
];

function includeCard(card, filter) {
  if (filter === 'all') return true;
  if (filter === 'revenue') return card.enabled && card.revenue > 0;
  if (filter === 'open') return card.enabled && (card.status === 'open' || (card.optional && (!card.people || card.people.length === 0)));
  return card.enabled && (!card.optional || card.status === 'open');
}

function CardRow({ card, onClick }) {
  const cost = cardCost(card);
  const costLabel = isFacilityCard(card) ? 'facility' : null;
  return (
    <button
      type="button"
      onClick={() => onClick(card)}
      className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-lg border px-3 py-2.5 text-left transition-shadow hover:shadow-sm"
      style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-card)' }}
    >
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-1.5">
          <strong className="truncate text-sm" style={{ color: 'var(--color-text-primary)' }}>{card.title}</strong>
          {card.templateId && (
            <span className="rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-wide" style={{ backgroundColor: 'var(--color-bg-page)', color: 'var(--color-text-muted)' }}>
              repeats
            </span>
          )}
          {card.status === 'open' && (
            <span className="rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-wide" style={{ backgroundColor: '#fff3df', color: '#9a5b25' }}>
              open
            </span>
          )}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          {card.startTime && <span className="inline-flex items-center gap-1"><Clock size={11} />{card.startTime}{card.endTime ? `–${card.endTime}` : ''}</span>}
          {card.people?.length > 0 && <span className="inline-flex items-center gap-1"><Users size={11} />{card.people.join(', ')}</span>}
        </span>
      </span>
      <span className="flex flex-col items-end gap-1 text-xs font-semibold">
        {card.revenue > 0 && <span style={{ color: 'var(--color-state-success)' }}>+${money(card.revenue)}</span>}
        {cost > 0 && <span style={{ color: 'var(--color-state-danger)' }}>−${money(cost)}{costLabel ? ` ${costLabel}` : ''}</span>}
      </span>
    </button>
  );
}

export function AgendaView({ planner, weekDates, onNextWeek, onPrevWeek }) {
  const [filter, setFilter] = useState('schedule');
  const [expandedDates, setExpandedDates] = useState(() => new Set());
  const visibleByDate = useMemo(() => {
    return weekDates.map((date) => {
      const cards = (planner.cardsByDate[date] || [])
        .filter((card) => includeCard(card, filter))
        .sort((a, b) => String(a.startTime || '99:99').localeCompare(String(b.startTime || '99:99')));
      return { date, cards };
    });
  }, [filter, planner.cardsByDate, weekDates]);

  const weekRevenue = visibleByDate.flatMap((day) => day.cards).reduce((sum, card) => sum + Number(card.revenue || 0), 0);
  const weekLabor = visibleByDate.flatMap((day) => day.cards).reduce((sum, card) => sum + cardCost(card), 0);
  const openShifts = visibleByDate.flatMap((day) => day.cards).filter((card) => card.status === 'open').length;

  const toggleDate = (date) => {
    setExpandedDates((current) => {
      const next = new Set(current);
      if (next.has(date)) next.delete(date); else next.add(date);
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button type="button" onClick={onPrevWeek} className="flex min-h-10 min-w-10 items-center justify-center rounded-lg" aria-label="Previous week" style={{ color: 'var(--color-text-secondary)' }}><ChevronLeft size={20} /></button>
          <div className="min-w-[150px] text-center text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {formatDateShort(weekDates[0])} – {formatDateShort(weekDates[6])}
          </div>
          <button type="button" onClick={onNextWeek} className="flex min-h-10 min-w-10 items-center justify-center rounded-lg" aria-label="Next week" style={{ color: 'var(--color-text-secondary)' }}><ChevronRight size={20} /></button>
        </div>

        <div className="flex flex-1 flex-wrap gap-1" role="group" aria-label="Calendar filter">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className="min-h-9 rounded-full border px-3 text-xs font-medium"
              aria-pressed={filter === item.id}
              style={filter === item.id
                ? { backgroundColor: 'var(--color-action-primary-bg)', color: 'var(--color-action-primary-text)', borderColor: 'var(--color-action-primary-bg)' }
                : { color: 'var(--color-text-secondary)', borderColor: 'var(--color-border-default)' }}
            >
              {item.label}
            </button>
          ))}
        </div>

        <Link to="/hub?tab=shifts" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium" style={{ color: 'var(--color-text-secondary)', borderColor: 'var(--color-border-default)' }}>
          Staff shift details <ExternalLink size={12} />
        </Link>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-lg border p-3" style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-card)' }}><span className="text-[10px] uppercase" style={{ color: 'var(--color-text-muted)' }}>Scheduled revenue</span><strong className="mt-1 flex items-center text-base" style={{ color: 'var(--color-state-success)' }}><DollarSign size={14} />{weekRevenue}</strong></div>
        <div className="rounded-lg border p-3" style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-card)' }}><span className="text-[10px] uppercase" style={{ color: 'var(--color-text-muted)' }}>Scheduled labor</span><strong className="mt-1 flex items-center text-base" style={{ color: 'var(--color-state-danger)' }}><DollarSign size={14} />{weekLabor}</strong></div>
        <div className="rounded-lg border p-3" style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-card)' }}><span className="text-[10px] uppercase" style={{ color: 'var(--color-text-muted)' }}>Open shifts</span><strong className="mt-1 text-base" style={{ color: openShifts ? '#9a5b25' : 'var(--color-text-primary)' }}>{openShifts}</strong></div>
      </div>

      <div className="space-y-3">
        {visibleByDate.map(({ date, cards }) => {
          const expanded = expandedDates.has(date);
          const shown = expanded ? cards : cards.slice(0, 4);
          return (
            <section key={date} className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-page)' }}>
              <div className="flex items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-card)' }}>
                <h3 className="text-sm font-bold font-display" style={{ color: 'var(--color-text-primary)' }}>{formatDateFull(date)}</h3>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{cards.length} item{cards.length === 1 ? '' : 's'}</span>
              </div>
              {cards.length === 0 ? (
                <div className="px-4 py-5 text-sm" style={{ color: 'var(--color-text-muted)' }}>No items in this view.</div>
              ) : (
                <div className="space-y-2 p-3">
                  {shown.map((card) => <CardRow key={card.id} card={card} onClick={planner.handlers.handleCardClick} />)}
                  {cards.length > 4 && (
                    <button type="button" onClick={() => toggleDate(date)} className="w-full rounded-lg py-2 text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                      {expanded ? 'Show fewer' : `Show ${cards.length - 4} more`}
                    </button>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
