import React from 'react';
import { getMonthDates, getWeekStart, isToday, getDayOfWeek, formatDateShort } from './dateUtils';
import { dayTotalsWithActual } from './financials';

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function MonthCalendarGrid({ year, month, cards, actualsByDate = {}, onUpsertRevenueActual, onSelectWeek }) {
  const allDates = getMonthDates(year, month);
  // Group into weeks (rows of 7)
  const weeks = [];
  for (let i = 0; i < allDates.length; i += 7) {
    weeks.push(allDates.slice(i, i + 7));
  }

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        backgroundColor: 'var(--color-bg-card)',
        borderColor: 'var(--color-border-default)',
      }}
    >
      {/* Day headers */}
      <div
        className="grid grid-cols-7"
        style={{ borderBottom: '1px solid var(--color-border-default)' }}
      >
        {DAY_HEADERS.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] uppercase tracking-wider font-medium py-2"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Week rows */}
      {weeks.map((week, wi) => {
        const weekStart = getWeekStart(week[0]);
        return (
          <div
            key={wi}
            className="grid grid-cols-7 cursor-pointer transition-colors group"
            style={{
              borderBottom: wi < weeks.length - 1 ? '1px solid var(--color-border-default)' : undefined,
            }}
            onClick={() => onSelectWeek(weekStart)}
          >
            {week.map((date) => {
              const dateMonth = parseInt(date.split('-')[1], 10);
              const isCurrentMonth = dateMonth === month;
              const today = isToday(date);
              const dateNum = parseInt(date.split('-')[2], 10);
              const t = dayTotalsWithActual(cards, date, actualsByDate);
              const eventCount = cards.filter((card) => card.date === date && card.objectType === 'event').length;
              const actual = actualsByDate[date];

              return (
                <div
                  key={date}
                  className="relative p-1.5 min-h-[52px] group-hover:bg-[color-mix(in_srgb,var(--color-action-primary-bg)_5%,transparent)]"
                  style={{
                    opacity: isCurrentMonth ? 1 : 0.35,
                  }}
                >
                  <div
                    className="text-xs font-medium text-center"
                    style={{
                      color: today ? 'var(--color-action-primary-bg)' : 'var(--color-text-primary)',
                      fontWeight: today ? 700 : 500,
                    }}
                  >
                    {today ? (
                      <span
                        className="inline-flex items-center justify-center w-6 h-6 rounded-full"
                        style={{ backgroundColor: 'var(--color-action-primary-bg)', color: 'var(--color-action-primary-text)' }}
                      >
                        {dateNum}
                      </span>
                    ) : (
                      dateNum
                    )}
                  </div>

                  {/* Mini financial summary */}
                  {(t.revenue > 0 || t.plannedRevenue > 0 || t.cost > 0) && isCurrentMonth && (
                    <div className="mt-0.5 flex items-center justify-center gap-1">
                      {t.hasActual ? (
                        <>
                          {t.plannedRevenue > 0 && <span className="text-[8px]" style={{ color: 'var(--color-text-muted)' }}>P {t.plannedRevenue}</span>}
                          <span className="text-[8px] font-semibold" style={{ color: 'var(--color-state-success)' }}>A {t.actualRevenue}</span>
                        </>
                      ) : t.revenue > 0 && (
                        <span className="text-[8px] font-medium" style={{ color: 'var(--color-state-success)' }}>
                          +{t.revenue}
                        </span>
                      )}
                      {t.cost > 0 && (
                        <span className="text-[8px] font-medium" style={{ color: 'var(--color-state-danger)' }}>
                          −{t.cost}
                        </span>
                      )}
                    </div>
                  )}
                  {eventCount > 0 && isCurrentMonth && (
                    <div className="mt-0.5 text-center text-[8px] font-semibold" style={{ color: 'var(--color-action-primary-bg)' }}>
                      • {eventCount} event{eventCount === 1 ? '' : 's'}
                    </div>
                  )}
                  {isCurrentMonth && onUpsertRevenueActual && (
                    <input
                      aria-label={`Actual revenue for ${date}`}
                      type="number"
                      min="0"
                      placeholder="Actual $"
                      value={actual ? (actual.revenueCents != null ? actual.revenueCents / 100 : actual.revenue) : ''}
                      step="0.01"
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => onUpsertRevenueActual(date, event.target.value, actual?.title === 'Actual revenue' ? '' : (actual?.title || ''))}
                      className="mt-1 w-full rounded border px-1 py-0.5 text-[10px] text-center outline-none"
                      style={{ backgroundColor: 'var(--color-bg-page)', borderColor: 'var(--color-border-default)', color: 'var(--color-text-primary)' }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
