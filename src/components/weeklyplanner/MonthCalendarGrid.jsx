import React, { useMemo } from 'react';
import { getMonthDates, getWeekStart, isToday } from './dateUtils';
import { dayTotalsWithActual, money } from './financials';
import { ACTIVE_BLOCK_STATUSES, displayWorkBlocks } from './plannerOperations';

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function keyboardSelect(event, onSelect) {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  onSelect();
}

export function MonthCalendarGrid({
  year,
  month,
  cards,
  workBlocks = [],
  actualsByDate = {},
  onUpsertRevenueActual,
  onSelectWeek,
}) {
  const allDates = useMemo(() => getMonthDates(year, month), [year, month]);
  const weeks = useMemo(() => {
    const rows = [];
    for (let index = 0; index < allDates.length; index += 7)
      rows.push(allDates.slice(index, index + 7));
    return rows;
  }, [allDates]);
  const operationalBlocks = useMemo(
    () => displayWorkBlocks(cards, workBlocks),
    [cards, workBlocks]
  );
  const blocksByDate = useMemo(() => {
    const grouped = new Map();
    for (const block of operationalBlocks) {
      if (!block.date || block.status === 'cancelled') continue;
      if (!grouped.has(block.date)) grouped.set(block.date, []);
      grouped.get(block.date).push(block);
    }
    return grouped;
  }, [operationalBlocks]);
  const eventsByDate = useMemo(() => {
    const grouped = new Map();
    for (const card of cards) {
      if (card.objectType !== 'event' || !card.date || card.enabled === false) continue;
      if (!grouped.has(card.date)) grouped.set(card.date, []);
      grouped.get(card.date).push(card);
    }
    return grouped;
  }, [cards]);

  return (
    <section className="planner-month-calendar" aria-label="Monthly operations calendar">
      <div className="planner-month-calendar__legend" aria-label="Work block legend">
        <span>
          <i data-type="prep" />
          Prep
        </span>
        <span>
          <i data-type="service" />
          Service
        </span>
        <span>
          <i data-type="error" />
          Needs attention
        </span>
        <small>Select any day to open its week.</small>
      </div>
      <div className="planner-month-calendar__scroll">
        <div className="planner-month-calendar__grid">
          <div className="planner-month-calendar__headers">
            {DAY_HEADERS.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          {weeks.map((week) => (
            <div key={week[0]} className="planner-month-calendar__week">
              {week.map((date) => {
                const isCurrentMonth = Number(date.slice(5, 7)) === month;
                const today = isToday(date);
                const dateNum = Number(date.slice(8, 10));
                const totals = dayTotalsWithActual(cards, date, actualsByDate);
                const actual = actualsByDate[date];
                const dateBlocks = blocksByDate.get(date) || [];
                const eventCards = eventsByDate.get(date) || [];
                const prepOnly = dateBlocks.filter(
                  (block) =>
                    block.blockType === 'prep' &&
                    !eventCards.some((card) => String(card.id) === block.plannerCardId)
                );
                const labels = [
                  ...eventCards.map((card) => ({
                    id: `event:${card.id}`,
                    kind: 'service',
                    title: card.title,
                  })),
                  ...prepOnly.map((block) => ({
                    id: `prep:${block.id}`,
                    kind: 'prep',
                    title: block.title,
                  })),
                ];
                const selectWeek = () => onSelectWeek?.(getWeekStart(date));

                return (
                  <div
                    key={date}
                    role="button"
                    tabIndex={isCurrentMonth ? 0 : -1}
                    className="planner-month-day"
                    data-current-month={isCurrentMonth ? 'true' : 'false'}
                    data-today={today ? 'true' : 'false'}
                    onClick={(event) => {
                      if (!event.target.closest?.('.planner-month-day__actual')) selectWeek();
                    }}
                    onKeyDown={(event) => {
                      if (!event.target.closest?.('.planner-month-day__actual'))
                        keyboardSelect(event, selectWeek);
                    }}
                    aria-label={`Open week containing ${date}`}
                  >
                    <div className="planner-month-edge-markers" aria-hidden="true">
                      {dateBlocks.slice(0, 4).map((block) => (
                        <i
                          key={block.id}
                          data-type={
                            block.syncStatus === 'error' || block.status === 'needs_schedule'
                              ? 'error'
                              : block.blockType
                          }
                          title={`${block.blockType}: ${block.title}`}
                        />
                      ))}
                    </div>

                    <div className="planner-month-day__number">
                      <span>{dateNum}</span>
                    </div>
                    {isCurrentMonth && labels.length > 0 && (
                      <div className="planner-month-day__events">
                        {labels.slice(0, 2).map((item) => (
                          <span key={item.id} data-kind={item.kind} title={item.title}>
                            <i />
                            {item.kind === 'prep' ? 'Prep · ' : ''}
                            {item.title}
                          </span>
                        ))}
                        {labels.length > 2 && <small>+{labels.length - 2} more</small>}
                      </div>
                    )}

                    {isCurrentMonth &&
                      (totals.revenue > 0 || totals.plannedRevenue > 0 || totals.cost > 0) && (
                        <div className="planner-month-day__money">
                          {totals.hasActual ? (
                            <>
                              {totals.plannedRevenue > 0 && (
                                <span>Plan {money(totals.plannedRevenue)}</span>
                              )}
                              <strong>Actual {money(totals.actualRevenue)}</strong>
                            </>
                          ) : totals.revenue > 0 ? (
                            <strong>+{money(totals.revenue)}</strong>
                          ) : null}
                          {totals.cost > 0 && <em>−{money(totals.cost)}</em>}
                        </div>
                      )}

                    {isCurrentMonth && onUpsertRevenueActual && (
                      <details className="planner-month-day__actual">
                        <summary>{actual ? 'Edit actual' : 'Add actual'}</summary>
                        <input
                          aria-label={`Actual revenue for ${date}`}
                          type="number"
                          min="0"
                          placeholder="Revenue $"
                          value={
                            actual
                              ? actual.revenueCents != null
                                ? actual.revenueCents / 100
                                : actual.revenue
                              : ''
                          }
                          step="0.01"
                          onChange={(event) =>
                            onUpsertRevenueActual(
                              date,
                              event.target.value,
                              actual?.title === 'Actual revenue' ? '' : actual?.title || ''
                            )
                          }
                        />
                      </details>
                    )}
                    {dateBlocks.some(
                      (block) =>
                        ACTIVE_BLOCK_STATUSES.has(block.status) && block.syncStatus === 'synced'
                    ) && (
                      <span
                        className="planner-month-day__synced"
                        title="At least one work block is on Google Calendar"
                      >
                        G
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
