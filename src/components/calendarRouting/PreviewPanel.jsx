import React, { useMemo, useState } from 'react';
import { addDaysIso, countChangedDates, STATUS_LABEL } from './routingRules';

export const PREVIEW_DAYS = 120;

const STATUSES = ['open', 'held', 'booked', 'blocked', 'none'];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const SOURCE_TEXT = {
  booking: 'a booking on this calendar',
  resource: 'a booking on a cabled calendar',
  feed: 'an inbound calendar',
};

const parts = (iso) => iso.split('-').map(Number);
const dayOfWeek = (iso) => {
  const [y, m, d] = parts(iso);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};
const monthName = (iso) => {
  const [y, m, d] = parts(iso);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
};
const longDate = (iso) => {
  const [y, m, d] = parts(iso);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
};

function buildRows(from) {
  const lead = dayOfWeek(from);
  const cells = [...Array(lead).fill(null), ...Array.from({ length: PREVIEW_DAYS }, (_, i) => addDaysIso(from, i))];
  while (cells.length % 7) cells.push(null);
  const rows = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

export default function PreviewPanel({ resources, resource, onResource, from, days, savedDays, busy, error, dirty }) {
  const [picked, setPicked] = useState(null);
  const rows = useMemo(() => buildRows(from), [from]);
  const entry = useMemo(() => new Map((days || []).map((day) => [day.date, day])), [days]);
  const saved = useMemo(() => new Map((savedDays || []).map((day) => [day.date, day.status])), [savedDays]);

  const statusOf = (date) => entry.get(date)?.status || 'none';
  const counts = useMemo(() => {
    const total = Object.fromEntries(STATUSES.map((status) => [status, 0]));
    rows.flat().forEach((date) => {
      if (date) total[entry.get(date)?.status || 'none'] += 1;
    });
    return total;
  }, [rows, entry]);

  const changed = useMemo(() => countChangedDates(
    (savedDays || []).filter((day) => day.date >= from && day.date <= addDaysIso(from, PREVIEW_DAYS - 1)),
    (days || []).filter((day) => day.date >= from && day.date <= addDaysIso(from, PREVIEW_DAYS - 1)),
  ), [savedDays, days, from]);

  const pickedEntry = picked ? entry.get(picked) : null;

  return (
    <section className="cr-preview" aria-labelledby="cr-preview-title" aria-busy={busy ? 'true' : 'false'}>
      <h2 id="cr-preview-title">What buyers would see</h2>
      <p className="cr-note">
        The next {PREVIEW_DAYS} days of one calendar, worked out from the cables as they are on the board now, saved or not.
      </p>

      <label className="cr-field" htmlFor="cr-preview-resource">
        <span>Calendar</span>
        <select id="cr-preview-resource" value={resource} onChange={(event) => { setPicked(null); onResource(event.target.value); }}>
          {resources.map((item) => (
            <option key={item.slug} value={item.slug}>{item.label}</option>
          ))}
        </select>
      </label>

      <p className="cr-diff" role="status" aria-live="polite">
        {busy ? 'Working out the preview…' : error ? '' : !dirty ? 'The board matches what is saved.' : changed === 0 ? 'No dates change from what is saved.' : `${changed} ${changed === 1 ? 'date changes' : 'dates change'} from what is saved. They are outlined below.`}
      </p>
      {error ? <p className="cr-note cr-note--error" role="alert">{error}</p> : null}

      <table className="cr-grid" data-busy={busy ? 'true' : undefined}>
        <caption className="cr-sr">Dates for the chosen calendar, a week to a row, starting {longDate(from)}.</caption>
        <thead>
          <tr>
            <th scope="col"><span className="cr-sr">Month</span></th>
            {WEEKDAYS.map((name, index) => (
              <th key={index} scope="col" aria-label={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][index]}>{name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => {
            const first = row.find(Boolean);
            const starts = row.find((date) => date && date.endsWith('-01'));
            const label = rowIndex === 0 ? monthName(first) : starts ? monthName(starts) : '';
            return (
              <tr key={row.find(Boolean)}>
                <th scope="row" className="cr-grid__month">{label}</th>
                {row.map((date, index) => {
                  if (!date) return <td key={`gap-${index}`} className="cr-grid__gap" />;
                  const status = statusOf(date);
                  const differs = (saved.get(date) || 'none') !== status;
                  return (
                    <td key={date}>
                      <button
                        type="button"
                        className={`cr-day cr-day--${status}${differs ? ' is-changed' : ''}${picked === date ? ' is-picked' : ''}`}
                        aria-label={`${longDate(date)}: ${STATUS_LABEL[status]}${differs ? ', changed from saved' : ''}`}
                        aria-pressed={picked === date}
                        onClick={() => setPicked(picked === date ? null : date)}
                      >
                        {Number(date.slice(8))}
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="cr-pick" role="status" aria-live="polite">
        {picked
          ? `${longDate(picked)}: ${STATUS_LABEL[statusOf(picked)].toLowerCase()}${pickedEntry?.source ? `, from ${SOURCE_TEXT[pickedEntry.source] || pickedEntry.source}` : ''}${(saved.get(picked) || 'none') !== statusOf(picked) ? `. Saved, it is ${STATUS_LABEL[saved.get(picked) || 'none'].toLowerCase()}.` : '.'}`
          : 'Pick a date to see why it has that status.'}
      </p>

      <dl className="cr-legend">
        {STATUSES.map((status) => (
          <div key={status} className="cr-legend__row">
            <dt><span className={`cr-day cr-day--${status} cr-legend__swatch`} aria-hidden="true" />{STATUS_LABEL[status]}</dt>
            <dd>{counts[status]}</dd>
          </div>
        ))}
      </dl>
      <p className="cr-note">
        When two things disagree about a date, the strongest wins: booked, then held, then closed, then open.
        A date with no entry is not offered unless the calendar is open by default.
      </p>
    </section>
  );
}
