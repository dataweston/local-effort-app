// Guest services are not open for booking yet. Keep this a simple placeholder.

import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';

export default function GuestChefPrompt({ addressLabel }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef(null);

  // <dialog> rather than a hand-rolled overlay: it gives focus trapping, an
  // Escape handler and inertness on the rest of the page for free, none of
  // which are worth reimplementing for a scaffold.
  //
  // The backdrop-click listener is attached natively rather than in JSX. A
  // dialog reports a backdrop click as a click on itself, and putting that
  // handler on the element in JSX trips jsx-a11y/no-noninteractive-element-
  // interactions — correctly, since a click handler normally needs a keyboard
  // equivalent. Here the keyboard equivalent is Escape, which the element
  // already provides, so the listener belongs with the rest of the imperative
  // dialog wiring instead of being silenced with a disable comment.
  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return undefined;

    if (open && !node.open) {
      if (typeof node.showModal === 'function') node.showModal();
      else node.setAttribute('open', '');
    }
    if (!open && node.open) node.close();

    const onBackdropClick = (event) => {
      if (event.target === node) setOpen(false);
    };
    node.addEventListener('click', onBackdropClick);
    return () => node.removeEventListener('click', onBackdropClick);
  }, [open]);

  return (
    <>
      <p className="venue-guest-note">
        <span className="venue-guest-note__rule" aria-hidden="true" />
        Already a guest at {addressLabel} and looking for a personal chef?{' '}
        <button type="button" className="venue-guest-note__link" onClick={() => setOpen(true)}>
          Click here.
        </button>
      </p>

      <dialog
        ref={dialogRef}
        className="venue-guest-sheet"
        aria-labelledby="guest-chef-heading"
        onClose={() => setOpen(false)}
      >
        <div className="venue-guest-sheet__inner">
          <div className="venue-guest-sheet__head">
            <p className="ht-kicker">in-house —</p>
            <h2 id="guest-chef-heading">Coming soon</h2>
            <button
              type="button"
              className="venue-guest-sheet__close"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              &times;
            </button>
          </div>

          <p className="venue-guest-sheet__description">
            Personal chef services for guests at {addressLabel}.
          </p>
        </div>
      </dialog>
    </>
  );
}

GuestChefPrompt.propTypes = {
  /** How the building is named to someone already standing in it. */
  addressLabel: PropTypes.string.isRequired,
};
