import React, { useState } from 'react';

// Reads a Google calendar so that what is on it closes dates. This is the
// inbound side: the Google nodes on the board only receive bookings.
export default function AddGoogleFeed({ resources, serviceAccount, disabled, busy, onAdd, onSyncNow }) {
  const [label, setLabel] = useState('');
  const [calendarId, setCalendarId] = useState('');
  const [resource, setResource] = useState('');
  const chosen = resource || resources[0]?.slug || '';

  const submit = (event) => {
    event.preventDefault();
    if (disabled || busy || !label.trim() || !calendarId.trim() || !chosen) return;
    onAdd({ label: label.trim(), googleCalendarId: calendarId.trim(), resource: chosen }).then((ok) => {
      if (ok) {
        setLabel('');
        setCalendarId('');
      }
    });
  };

  return (
    <section className="cr-addfeed" aria-labelledby="cr-addfeed-title">
      <h2 id="cr-addfeed-title">Read a Google calendar</h2>
      <p className="cr-note">
        Anything on this calendar closes that date for the calendar you pick, and for every calendar cabled to it.
        Share the Google calendar with{' '}
        {serviceAccount ? <strong>{serviceAccount}</strong> : 'the Local Effort service account'} (“See all event details”),
        then paste its ID from Google Calendar → Settings → Integrate calendar.
        Events marked “Free” are ignored.
      </p>
      <form className="cr-addfeed__form" onSubmit={submit}>
        <label className="cr-field" htmlFor="cr-feed-label">
          <span>Name</span>
          <input id="cr-feed-label" value={label} maxLength={60} onChange={(event) => setLabel(event.target.value)} />
        </label>
        <label className="cr-field" htmlFor="cr-feed-id">
          <span>Google calendar ID</span>
          <input id="cr-feed-id" value={calendarId} autoComplete="off" spellCheck="false" onChange={(event) => setCalendarId(event.target.value)} />
        </label>
        <label className="cr-field" htmlFor="cr-feed-resource">
          <span>Closes dates on</span>
          <select id="cr-feed-resource" value={chosen} onChange={(event) => setResource(event.target.value)}>
            {resources.map((item) => (
              <option key={item.slug} value={item.slug}>{item.label}</option>
            ))}
          </select>
        </label>
        <div className="cr-bar__actions">
          <button type="submit" className="cr-primary" disabled={disabled || busy || !label.trim() || !calendarId.trim()}>
            Read this calendar
          </button>
          <button type="button" onClick={onSyncNow} disabled={disabled || busy}>Read all calendars now</button>
        </div>
      </form>
      {disabled ? <p className="cr-note">Save or revert your changes first.</p> : null}
    </section>
  );
}
