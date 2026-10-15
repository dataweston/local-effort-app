import React from 'react';
import { formatWhen } from './routingRules';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function FeedStatus({ config }) {
  if (!config) return <p className="cr-note">No sync status yet.</p>;
  if (config.active === false) return <p className="cr-note">Paused. It is not being read.</p>;
  if (!config.lastSyncAt) return <p className="cr-note">Not read yet.</p>;
  const failed = config.lastStatus && config.lastStatus !== 'ok';
  return (
    <>
      <p className="cr-note" data-state={failed ? 'error' : 'ok'}>
        Last read {formatWhen(config.lastSyncAt)}
        {config.lastStatus ? `, ${config.lastStatus}` : ''}.
      </p>
      <p className="cr-note">{plural(config.lastBlockCount || 0, 'busy day', 'busy days')} on the last read.</p>
      {config.lastError ? <p className="cr-note cr-note--error">{config.lastError}</p> : null}
    </>
  );
}

export default function NodeBody({ node, live, google, links, problem, onConfig }) {
  if (node.kind === 'feed') {
    const config = live || node.config;
    return (
      <>
        <p className="cr-note">{config?.isGoogle ? 'A Google calendar we read.' : 'An iCal address we read.'}</p>
        <FeedStatus config={config} />
      </>
    );
  }

  if (node.kind === 'ics') {
    return (
      <>
        <p className="cr-note">Published address that Airbnb polls.</p>
        <p className="cr-mono">{node.config?.path || 'No path set.'}</p>
      </>
    );
  }

  if (node.kind === 'google') {
    const calendarId = node.config?.calendarId ?? '';
    const inputId = `cr-cal-${node.id}`;
    return (
      <>
        <label className="cr-field" htmlFor={inputId}>
          <span>Calendar ID</span>
          <input
            id={inputId}
            type="text"
            value={calendarId}
            placeholder="name@group.calendar.google.com"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={problem ? 'true' : undefined}
            onChange={(event) => onConfig(node.id, { calendarId: event.target.value })}
          />
        </label>
        {problem ? <p className="cr-note cr-note--error">{problem}</p> : null}
        {google && !google.configured ? (
          <p className="cr-note cr-note--error">
            The Google service account is not configured, so nothing is written to this calendar yet.
          </p>
        ) : null}
        {google?.serviceAccountEmail ? (
          <p className="cr-note">
            Share the calendar with <span className="cr-mono">{google.serviceAccountEmail}</span> and let it make changes to events.
          </p>
        ) : null}
      </>
    );
  }

  if (node.kind === 'hub') {
    return <p className="cr-note">Downstream only. The planner reads this calendar; nothing flows back.</p>;
  }

  // resource
  const window = node.config?.defaultOpen;
  return (
    <>
      <p className="cr-note">
        Closed by {plural(links.closing, 'source', 'sources')}. Copied to {plural(links.copied, 'place', 'places')}.
      </p>
      {window ? (
        <>
          <p className="cr-note">Open unless something blocks it, inside this window.</p>
          <div className="cr-field-row">
            <label className="cr-field" htmlFor={`cr-min-${node.id}`}>
              <span>Earliest, days ahead</span>
              <input
                id={`cr-min-${node.id}`}
                type="number"
                inputMode="numeric"
                min="0"
                value={window.minLeadDays ?? ''}
                aria-invalid={problem ? 'true' : undefined}
                onChange={(event) => onConfig(node.id, { defaultOpen: { ...window, minLeadDays: event.target.value === '' ? '' : Number(event.target.value) } })}
              />
            </label>
            <label className="cr-field" htmlFor={`cr-max-${node.id}`}>
              <span>Latest, days ahead</span>
              <input
                id={`cr-max-${node.id}`}
                type="number"
                inputMode="numeric"
                min="0"
                value={window.maxDays ?? ''}
                aria-invalid={problem ? 'true' : undefined}
                onChange={(event) => onConfig(node.id, { defaultOpen: { ...window, maxDays: event.target.value === '' ? '' : Number(event.target.value) } })}
              />
            </label>
          </div>
          {problem ? <p className="cr-note cr-note--error">{problem}</p> : null}
        </>
      ) : null}
    </>
  );
}
