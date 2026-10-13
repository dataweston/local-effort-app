import React from 'react';
import { dropProgress, formatCountdown, formatDropMoment, isClosingSoon } from '../pizzaDrop';

// The order window, set the way the site sets its one moment of weight: a void
// band under the raking light (docs/design/SPECIMEN.md, "the dark band"), the
// countdown as the only large type, and the three dates as ruled ledger rows
// like the venue sheets (venue-page.css). Styles: pizza-on-smith.css `.ps-drop`.
// Every date and label arrives from the Sanity page document via props.
export default function DropBanner({ window, state, now, soldOut, fulfillmentLabel }) {
  if (!window) return null;
  const closingSoon = state === 'open' && isClosingSoon(window, now);
  const view = soldOut && state === 'open' ? 'soldout' : closingSoon ? 'closing' : state;
  const note = {
    upcoming: 'opens soon',
    open: 'ordering is open',
    closing: 'last call',
    soldout: 'sold out',
    closed: 'this drop is closed',
  }[view];
  const count =
    state === 'upcoming'
      ? `Opens in ${formatCountdown(window.opensAt - now)}`
      : state === 'open'
        ? soldOut ? 'Everything in this drop is claimed' : `Closes in ${formatCountdown(window.closesAt - now)}`
        : 'Orders are closed';
  const rows = [
    { label: 'ordering opens', value: formatDropMoment(window.opensAt), done: state !== 'upcoming' },
    { label: 'ordering closes', value: formatDropMoment(window.closesAt), done: state === 'closed' },
    { label: 'fulfillment', value: fulfillmentLabel, done: false },
  ].filter((row) => row.value);

  return (
    <aside
      className={`ps-drop specimen specimen-void ps-drop-${view}`}
      role="status"
      aria-label="Ordering window"
    >
      <span className="specimen-void__light" aria-hidden="true" />
      <div className="ps-drop-lead">
        <p className="ps-drop-count" suppressHydrationWarning>{count}</p>
        <div className="ps-drop-rule" aria-hidden="true">
          <span style={{ '--ps-drop-progress': dropProgress(window, now).toFixed(3) }} />
        </div>
        <div className="ps-drop-foot">
          <p className="ps-drop-note">{note}</p>
          {state === 'open' && !soldOut ? (
            <a className="ps-drop-cta" href="#order">Choose your pizzas</a>
          ) : null}
        </div>
      </div>
      <dl className="ps-drop-ledger">
        {rows.map((row) => (
          <div key={row.label} data-done={row.done ? 'true' : undefined}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
