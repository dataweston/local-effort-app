// VenueCalendar — the booking grid for /firehouse, /foodist and /private-events.
//
// Design: docs/design/VENUES.md. The four states are degrees of finish rather
// than colour chips, which is why nothing here maps a status to a background
// fill; the styling lives in venue-page.css and is driven by data-state.
//
// Two behaviours worth knowing before changing this:
//
//   1. It is FAIL-CLOSED. If /availability errors or the database is down the
//      grid does not render as open — it renders an enquiry message. An empty
//      calendar reads as "every night is free", which is how a room gets
//      double-booked.
//   2. Dates are handled as YYYY-MM-DD strings in UTC throughout. Building a
//      grid with local-time Date objects shifts the whole month by a day for
//      anyone west of UTC, and Minneapolis is UTC-5/6.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const pad = (n) => String(n).padStart(2, '0');
const isoOf = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const todayIso = () => new Date().toISOString().slice(0, 10);

const daysInMonth = (year, month) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
const firstWeekday = (year, month) => new Date(Date.UTC(year, month, 1)).getUTCDay();

const addMonths = (year, month, delta) => {
  const total = year * 12 + month + delta;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
};

const SELECTABLE = new Set(['open', 'unmanaged']);

const STATE_LABEL = {
  open: 'available',
  held: 'on hold for someone else',
  booked: 'booked',
  blocked: 'not available',
  unmanaged: 'ask us',
};

export default function VenueCalendar({
  venueSlug,
  venueNickname,
  monthsAhead,
  selectedDate,
  onSelectDate,
}) {
  const start = useMemo(() => {
    const now = new Date();
    return { year: now.getUTCFullYear(), month: now.getUTCMonth() };
  }, []);

  // Open on the month of a date the visitor arrived with (the ReserveAction
  // entry point, `?date=`), not on today — otherwise a December link lands on
  // a September grid with the selection off-screen. Clamped to the navigable
  // range so a far-future date cannot strand the nav past its own end stop.
  const [cursor, setCursor] = useState(() => {
    if (!selectedDate) return start;
    const [year, month] = selectedDate.split('-').map(Number);
    const target = { year, month: month - 1 };
    const last = addMonths(start.year, start.month, monthsAhead);
    const asIndex = (m) => m.year * 12 + m.month;
    if (asIndex(target) < asIndex(start) || asIndex(target) > asIndex(last)) return start;
    return target;
  });
  const [dayStates, setDayStates] = useState(null); // null = not loaded yet
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  // Kept so a late response from an abandoned request cannot overwrite a newer
  // one; venue switching on /private-events makes that race real.
  const requestRef = useRef(0);

  useEffect(() => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const from = todayIso();
    const end = addMonths(start.year, start.month, monthsAhead);
    const to = isoOf(end.year, end.month, daysInMonth(end.year, end.month));

    fetch(`/api/venues/${encodeURIComponent(venueSlug)}/availability?from=${from}&to=${to}`)
      .then((response) => {
        if (!response.ok) throw new Error(`availability-${response.status}`);
        return response.json();
      })
      .then((payload) => {
        if (cancelled || requestRef.current !== requestId) return;
        const map = new Map();
        for (const day of payload.days || []) map.set(day.date, day);
        setDayStates(map);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled || requestRef.current !== requestId) return;
        setError(err);
        setDayStates(null);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [venueSlug, monthsAhead, start.year, start.month]);

  const stateFor = useCallback(
    (iso) => {
      if (!dayStates) return 'unmanaged';
      const entry = dayStates.get(iso);
      if (!entry) return 'unmanaged';
      return entry.status || 'unmanaged';
    },
    [dayStates],
  );

  /**
   * Open on the first month that has something to sell.
   *
   * Availability is published in runs — the first was October to December,
   * opened well inside September — so "start on the current month" meant a
   * visitor landed on a grid where every square was greyed out and had to
   * guess that pressing the arrow would help. Nothing about an empty month
   * tells you a later one is full.
   *
   * Only when the visitor did not arrive with a date of their own, and only
   * ever forwards: if this month has open nights it is left alone.
   */
  const jumpedRef = useRef(false);
  useEffect(() => {
    if (!dayStates || selectedDate || jumpedRef.current) return;
    jumpedRef.current = true;

    const today = todayIso();
    const openDates = [...dayStates.values()]
      .filter((day) => day.status === 'open' && day.date >= today)
      .map((day) => day.date)
      .sort();
    if (!openDates.length) return;

    const first = openDates[0];
    const [year, month] = first.split('-').map(Number);
    setCursor((current) =>
      current.year === year && current.month === month - 1
        ? current
        : { year, month: month - 1 },
    );
  }, [dayStates, selectedDate]);

  /**
   * Resolve a date the visitor arrived with, once the calendar knows anything.
   *
   * buildVenueJsonLd advertises `/<slug>?date={date}` as the ReserveAction
   * entry point, so an ad, a Maps surface or a shared link can land someone on
   * a specific night. That gives the page a date but no STATE, and state is
   * what decides whether the night can be paid for — so without this the
   * deposit button stays disabled for exactly the visitors the entry point was
   * built to serve.
   *
   * Guarded by a ref rather than by the dependency list: onSelectDate writes to
   * the parent, which flows back in as a new selectedDate, and keying the
   * effect on that would re-enter. One resolution per availability load is all
   * this needs.
   */
  const resolvedRef = useRef(null);
  useEffect(() => {
    if (!dayStates || !selectedDate) return;
    if (resolvedRef.current === selectedDate) return;
    resolvedRef.current = selectedDate;

    const resolved = selectedDate < todayIso() ? 'blocked' : stateFor(selectedDate);
    // A night that turns out to be taken is dropped rather than carried
    // forward, so the form can never hold a date the grid shows as struck.
    if (SELECTABLE.has(resolved)) onSelectDate(selectedDate, resolved);
    else onSelectDate(null, null);
  }, [dayStates, selectedDate, stateFor, onSelectDate]);

  const cells = useMemo(() => {
    const { year, month } = cursor;
    const lead = firstWeekday(year, month);
    const count = daysInMonth(year, month);
    const today = todayIso();

    const out = [];
    for (let i = 0; i < lead; i += 1) out.push({ key: `pad-${i}`, pad: true });
    for (let day = 1; day <= count; day += 1) {
      const iso = isoOf(year, month, day);
      // A past date is never offered, whatever the feed says about it.
      const state = iso < today ? 'blocked' : stateFor(iso);
      out.push({ key: iso, iso, day, state, past: iso < today });
    }
    return out;
  }, [cursor, stateFor]);

  const atStart = cursor.year === start.year && cursor.month === start.month;
  const last = addMonths(start.year, start.month, monthsAhead);
  const atEnd = cursor.year === last.year && cursor.month === last.month;

  const step = (delta) => setCursor((current) => addMonths(current.year, current.month, delta));

  // The calendar is not rendered at all when availability could not be read.
  // See the fail-closed note at the top of this file.
  if (error) {
    return (
      <div className="venue-calendar">
        <p className="venue-calendar__error" role="status">
          We can’t show {venueNickname}’s calendar right now. Send us the date you
          have in mind and we’ll confirm it by hand — usually the same day.
        </p>
      </div>
    );
  }

  return (
    <div className="venue-calendar">
      <div className="venue-calendar__head">
        <h3 className="venue-calendar__month">
          {MONTH_NAMES[cursor.month]} {cursor.year}
        </h3>
        <div className="venue-calendar__nav">
          <button
            type="button"
            className="venue-calendar__step"
            onClick={() => step(-1)}
            disabled={atStart}
            aria-label="Previous month"
          >
            &larr;
          </button>
          <button
            type="button"
            className="venue-calendar__step"
            onClick={() => step(1)}
            disabled={atEnd}
            aria-label="Next month"
          >
            &rarr;
          </button>
        </div>
      </div>

      <div className="venue-calendar__grid" role="grid" aria-label={`${venueNickname} availability`}>
        {DOW.map((letter, index) => (
          // eslint-disable-next-line react/no-array-index-key
          <div key={`dow-${index}`} className="venue-calendar__dow" aria-hidden="true">
            {letter}
          </div>
        ))}

        {cells.map((cell) =>
          cell.pad ? (
            <span key={cell.key} className="venue-day venue-day--pad" aria-hidden="true" />
          ) : (
            <button
              key={cell.key}
              type="button"
              className="venue-day"
              data-state={cell.state}
              disabled={!SELECTABLE.has(cell.state)}
              aria-pressed={selectedDate === cell.iso}
              aria-label={`${cell.iso} — ${STATE_LABEL[cell.state] || cell.state}`}
              onClick={() => SELECTABLE.has(cell.state) && onSelectDate(cell.iso, cell.state)}
            >
              {cell.day}
            </button>
          ),
        )}
      </div>

      <p className="venue-calendar__legend" aria-hidden="true">
        <span>open — raised</span>
        <span>held — outlined</span>
        <span>booked — struck</span>
        <span>ask us — queried</span>
        <span>closed — faint</span>
      </p>

      {/* aria-live so a screen reader hears the result of picking a date, and
          so the loading state is announced once rather than on every repaint. */}
      <p className="venue-calendar__status" role="status" aria-live="polite">
        {loading
          ? 'Checking the calendar…'
          : selectedDate
            ? `You picked ${selectedDate}. Add your details below and we’ll hold it.`
            : `Pick a date to start. Anything faint isn’t spoken for — ask and we’ll check.`}
      </p>
    </div>
  );
}

VenueCalendar.propTypes = {
  venueSlug: PropTypes.string.isRequired,
  venueNickname: PropTypes.string.isRequired,
  monthsAhead: PropTypes.number,
  selectedDate: PropTypes.string,
  onSelectDate: PropTypes.func.isRequired,
};

VenueCalendar.defaultProps = {
  monthsAhead: 11,
  selectedDate: null,
};
