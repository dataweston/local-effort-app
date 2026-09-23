// GuestChefPrompt — the other reason someone is on this page.
//
// The venue page assumes you are booking the room. A guest already staying at
// the building is a different customer with a different need: they have the
// room already and want someone to cook in it. That is a second product line,
// not a second venue, so it gets a footnote near the top and its own sheet
// rather than a share of the page's one climax.
//
// STATUS: SCAFFOLD. The owner has named the two products — "Fill the fridge"
// and "Personal chef" — and nothing else. Per instruction (2026-09-22) no copy,
// pricing, field list or checkout has been invented to fill the gap. Every
// unknown renders as a visible `coming soon` so an unfinished product cannot be
// mistaken for a finished one, in the same spirit as the TODO gate in
// venues.json.
//
// TO FINISH THIS, the owner needs to supply, per product:
//   - one line of description, in the register of the shipped pages
//   - the price or price basis, which should land in
//     backend/api/pricing/priceBookManifest.js as rules, not hard-coded here
//   - the fields actually needed to fulfil it (dates? headcount? diet?)
//   - whether it takes a deposit or is paid in full
// The checkout then reuses the Square path already built for the room deposit
// in backend/api/routes/venues.js.

import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';

// Owner-named, 2026-09-22. These two strings are the only product copy that
// exists; everything else on this sheet is deliberately blank.
const PRODUCTS = [
  { key: 'fill_the_fridge', label: 'Fill the fridge' },
  { key: 'personal_chef', label: 'Personal chef' },
];

export default function GuestChefPrompt({ addressLabel }) {
  const [open, setOpen] = useState(false);
  const [product, setProduct] = useState(PRODUCTS[0].key);
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
            <h2 id="guest-chef-heading">A chef, where you’re already staying</h2>
            <button
              type="button"
              className="venue-guest-sheet__close"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              &times;
            </button>
          </div>

          <p className="venue-guest-sheet__pending" role="status">
            Coming soon — we’re still writing this one. The two options below are real; the details
            under them are not final.
          </p>

          {/* Ruled rows, for the same reason the service styles are: two or
              three options is exactly the shape that wants to become cards,
              and SPECIMEN.md rules those out. */}
          <div className="venue-book__styles" role="radiogroup" aria-label="What you want">
            {PRODUCTS.map((entry) => (
              <label key={entry.key} className="venue-book__style">
                <input
                  type="radio"
                  name="guestChefProduct"
                  value={entry.key}
                  checked={product === entry.key}
                  onChange={() => setProduct(entry.key)}
                />
                <span className="venue-book__style-name">{entry.label}</span>
                <span className="venue-book__style-rate venue-guest-sheet__soon">coming soon</span>
              </label>
            ))}
          </div>

          {/* The form skeleton. Intentionally inert: disabled inputs with no
              labels invented for them, so the shape is reviewable without the
              page making a promise the product cannot keep. */}
          <div className="venue-guest-sheet__form" aria-label="Order details">
            {[1, 2, 3].map((slot) => (
              <p key={slot} className="venue-guest-sheet__slot">
                <span className="venue-guest-sheet__slot-label">field {slot}</span>
                <input type="text" disabled placeholder="coming soon" aria-label={`Field ${slot}, coming soon`} />
              </p>
            ))}
          </div>

          <div className="venue-book__submit">
            <button type="button" className="ht-submit" disabled>
              Checkout — coming soon
            </button>
          </div>

          <p className="ht-footnote">
            Want this before it ships? Book the room above and put it in the notes, or email us and
            we’ll sort it by hand.
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
