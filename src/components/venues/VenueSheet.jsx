// VenueSheet — the body shared by /firehouse, /foodist and the two panels of
// /private-events. One component, because the brief is three pages that should
// feel like the same instrument with a different room in it.
//
// The script (docs/design/VENUES.md):
//   1. the room, on the sheet      a plate with a cast shadow, name beneath
//   2. the ledger                  what the room is, ruled
//   3. the ask                     calendar + deposit, side by side
//   4. the gallery                 rooms and food, one grid
//   5. the void                    a dark band, the quote, the feed
//
// This differs from the service pages, which open on the order slip. A dinner
// party needs no introduction; a room does. That is the one deliberate
// departure from the house script and it is argued in VENUES.md.
//
// Beat 3 changed in 2026-09: it used to collect an enquiry and wait for a human
// to reply. It now takes a 20% deposit through Square and holds the night on
// the spot, because the journey this page is built for — someone who came to
// book a chef, saw the room, and wants the date — dies in the gap between an
// enquiry and an answer. A night we have not published still cannot be paid
// for, but it is the same panel and the same vocabulary — it sends an enquiry
// instead of minting a payment link, rather than handing the visitor a second
// form that opens by asking what kind of party they are having.
//
// Beats 4 and 5 swapped in the same pass. Photographs used to be scattered
// down the page one at a time, each alone inside its own vertical rhythm, with
// a titled wall of food at the very bottom; they are now a single grid.

import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useSearchParams } from 'react-router-dom';
import { useSpecimenReveal } from '../../hooks/useSpecimenReveal';
import VenueCalendar from './VenueCalendar';
import VenueBooking from './VenueBooking';
import GuestChefPrompt from './GuestChefPrompt';
import { SHARED_PHOTOS, missingFacts } from '../../config/venues';

const CLOUD_NAME = import.meta.env?.VITE_CLOUDINARY_CLOUD_NAME || 'dokyhfvyd';

/**
 * A Cloudinary delivery URL, built by hand rather than through
 * components/common/cloudinaryImage.jsx.
 *
 * That component is a good default elsewhere — it does a blur-up placeholder
 * and watches the underlying <img> for load. Both cost JavaScript, and neither
 * survives prerendering: the markup it emits has no real `src` until React
 * hydrates. These plates sit on a page whose entire argument is that what
 * matters ships in the HTML, and the other plates here are plain <img>, so
 * these are too. Cloudinary still does the work that matters — format
 * negotiation, DPR, and the crop — through the transformation string.
 */
const cloudinarySrc = (publicId, width) =>
  `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/` +
  `f_auto,q_auto,c_fill,g_auto,dpr_auto,w_${width}/${publicId}`;

const CLOUD_WIDTHS = [400, 640, 900, 1280];

const usd = (cents) =>
  typeof cents === 'number' ? `$${(cents / 100).toLocaleString('en-US')}` : null;

const isReal = (value) => value != null && !String(value).startsWith('TODO');

/** Capacity as one line: "up to 60 seated · 90 standing". */
const capacityLine = (capacity) => {
  if (!capacity) return null;
  const parts = [];
  if (capacity.seated) parts.push(`${capacity.seated} seated`);
  if (capacity.standing) parts.push(`${capacity.standing} standing`);
  return parts.length ? parts.join(' · ') : null;
};

/** A plate that degrades to a ruled blank rather than a broken image. */
const Plate = ({ src, alt, eager }) => {
  if (!src) {
    return (
      <div className="venue-hero__plate specimen-frame" role="img" aria-label={`${alt} — photograph pending`}>
        <span className="specimen-frame__folio">no plate</span>
      </div>
    );
  }
  return (
    <div className="venue-hero__plate">
      <img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" />
    </div>
  );
};

Plate.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string.isRequired,
  eager: PropTypes.bool,
};
Plate.defaultProps = { src: null, eager: false };

/**
 * One tile in the gallery grid.
 *
 * Rooms and food, same treatment, no captions and no folio. The plates used to
 * be mounted individually — a 34rem sheet here, another one aligned to the
 * opposite margin there, a separate captioned wall of food further down — and
 * the result was a column of photographs with unexplained space around each
 * one. A visitor is buying the room and the cooking together, so they are shown
 * together, in one grid that closes.
 *
 * `tile` is a span in a six-column grid, set as custom properties so the CSS
 * can reuse the same two numbers for the mobile aspect ratio.
 */
const GalleryTile = ({ item }) => {
  const cols = item.tile?.cols || 2;
  const rows = item.tile?.rows || 2;

  return (
    <div
      className="venue-gallery__tile"
      // Below six columns a tile is either half the row or all of it, and a
      // custom property cannot be selected on. Three columns or more is "wide".
      data-wide={cols >= 3 ? 'true' : 'false'}
      style={{ '--tile-cols': cols, '--tile-rows': rows }}
    >
      {item.publicId ? (
        <img
          className="venue-gallery__img"
          src={cloudinarySrc(item.publicId, 900)}
          srcSet={CLOUD_WIDTHS.map((w) => `${cloudinarySrc(item.publicId, w)} ${w}w`).join(', ')}
          sizes="(max-width: 40rem) 92vw, (max-width: 64rem) 46vw, 31vw"
          alt={item.alt}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <img
          className="venue-gallery__img"
          src={item.src}
          alt={item.alt}
          loading="lazy"
          decoding="async"
        />
      )}
    </div>
  );
};

GalleryTile.propTypes = {
  item: PropTypes.shape({
    src: PropTypes.string,
    publicId: PropTypes.string,
    alt: PropTypes.string.isRequired,
    tile: PropTypes.shape({ cols: PropTypes.number, rows: PropTypes.number }),
  }).isRequired,
};

/**
 * The date a visitor arrived with, if it is usable.
 *
 * buildVenueJsonLd advertises `/<slug>?date={date}` as the ReserveAction entry
 * point, so a Google surface, an ad or a shared link can land someone on a
 * specific night — and that promise is only real if the page reads the
 * parameter back. Validated rather than trusted: it lands in a form field and
 * in a request to the team, so a malformed or past date is dropped instead of
 * preselected.
 */
const usableDateParam = (raw) => {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const today = new Date().toISOString().slice(0, 10);
  if (raw < today) return null;
  // Reject a real-looking string that is not a real day (2026-02-31).
  const parsed = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== raw) return null;
  return raw;
};

export default function VenueSheet({ venue, headingLevel }) {
  const [searchParams] = useSearchParams();
  const [selectedDate, setSelectedDate] = useState(() =>
    usableDateParam(searchParams.get('date')),
  );
  // The calendar knows why a date is selectable; the booking panel needs that
  // too, because only an operator-opened night can be paid for.
  const [selectedState, setSelectedState] = useState(null);
  const ledger = useSpecimenReveal();
  const voidBand = useSpecimenReveal();
  const galleryBand = useSpecimenReveal();

  // Square sends the payer back here after the card step.
  const paidHold = searchParams.get('deposit') === 'success' ? searchParams.get('hold') : null;
  useEffect(() => {
    if (paidHold) setSelectedDate(null);
  }, [paidHold]);

  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  const capacity = capacityLine(venue.capacity);
  const roomFee = usd(venue.roomFeeCents);
  const gaps = missingFacts(venue);
  // Rooms first, then food. Order is the composition: see the note on
  // `tile` in venues.json — each band of spans sums to six.
  const gallery = [...(venue.photos?.plates || []), ...(SHARED_PHOTOS.food || [])];

  return (
    <div className={`venue-scope venue-scope--${venue.accent}`}>
      {/* Build-time nag, development only. These pages are Google-facing and a
          placeholder that ships is a placeholder that gets indexed. */}
      {import.meta.env?.DEV && gaps.length > 0 && (
        <p
          style={{
            border: '1px dashed var(--accent-poppy)',
            padding: '0.6rem 0.8rem',
            font: '0.8rem var(--font-office-code, monospace)',
            margin: '0 0 1rem',
          }}
        >
          {venue.nickname}: {gaps.length} unfilled field{gaps.length === 1 ? '' : 's'} in
          src/config/venues.json — {gaps.join(', ')}. Structured data stays suppressed
          until `verified` is true.
        </p>
      )}

      {paidHold && (
        <p className="venue-book__paid" role="status">
          Deposit received — {venue.nickname} is held in your name. A confirmation is on its way by
          email, and we’ll be in touch about the menu.
        </p>
      )}

      {/* ── 1. The room, on the sheet ── */}
      <section className="venue-hero">
        <Plate
          src={venue.photos?.hero}
          alt={`${venue.nickname} — event space by Local Effort Cooperative`}
          eager={headingLevel === 1}
        />
        <div className="venue-hero__caption">
          <p className="ht-kicker">{venue.kicker}</p>
          {capacity && <p className="ht-facts">{capacity}</p>}
        </div>
        <Heading className="venue-hero__name">
          {isReal(venue.headline) ? venue.headline : venue.nickname}
        </Heading>
        {isReal(venue.summary) && <p className="venue-hero__lede">{venue.summary}</p>}

        {/* The other customer: someone already staying in the building who
            wants a chef rather than the room. Kept to a footnote so it cannot
            compete with the page's one climax. Only rendered where we can name
            the address — an unnamed "already a guest here?" means nothing. */}
        {isReal(venue.address?.street) && (
          <GuestChefPrompt addressLabel={venue.address.street} />
        )}
      </section>

      {/* ── 2. The ledger ── */}
      <section className="venue-ledger specimen-reveal" ref={ledger.ref} data-finish={ledger.finish}>
        <p className="ht-kicker">the room —</p>
        <h2>What you get</h2>
        <dl className="venue-ledger__rows">
          {capacity && (
            <div className="venue-ledger__row">
              <dt className="venue-ledger__term">capacity</dt>
              <dd className="venue-ledger__value">{capacity}</dd>
            </div>
          )}
          {venue.areaSqFt && (
            <div className="venue-ledger__row">
              <dt className="venue-ledger__term">floor</dt>
              <dd className="venue-ledger__value">{venue.areaSqFt.toLocaleString('en-US')} sq ft</dd>
            </div>
          )}
          {isReal(venue.hours?.earliest) && isReal(venue.hours?.latest) && (
            <div className="venue-ledger__row">
              <dt className="venue-ledger__term">hours</dt>
              <dd className="venue-ledger__value">
                {venue.hours.earliest} – {venue.hours.latest}
              </dd>
            </div>
          )}
          {roomFee && (
            <div className="venue-ledger__row">
              <dt className="venue-ledger__term">venue fee</dt>
              <dd className="venue-ledger__value">
                {roomFee}
                {venue.venueFeeHours ? ` · est. ${venue.venueFeeHours} hours` : ''}
              </dd>
            </div>
          )}
          <div className="venue-ledger__row">
            <dt className="venue-ledger__term">food &amp; service</dt>
            <dd className="venue-ledger__value">
              quoted per guest · $45–$250 depending on how it’s served
            </dd>
          </div>
          {venue.amenities?.length > 0 && (
            <div className="venue-ledger__row">
              <dt className="venue-ledger__term">in the room</dt>
              <dd className="venue-ledger__value">{venue.amenities.join(' · ')}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* ── 3. The ask ── */}
      <section className="service-hero" aria-labelledby={`book-${venue.slug}`}>
        <div className="ht-slip">
          <p className="ht-kicker">the date —</p>
          <h2 id={`book-${venue.slug}`}>Pick a night at {venue.nickname}</h2>
          <span className="ht-rule-line" aria-hidden="true" />

          {/* Grid rather than stack, above 62rem. The brief for this page is
              "see the date, pay the deposit, few clicks", and stacking a
              twelve-row calendar on top of the price puts them in different
              screens — you cannot check what a Saturday costs without losing
              sight of the Saturday. Side by side, choosing a night and reading
              what it costs is one glance. */}
          <div className="venue-ask">
            <div className="venue-ask__calendar">
              <VenueCalendar
                venueSlug={venue.slug}
                venueNickname={venue.nickname}
                selectedDate={selectedDate}
                onSelectDate={(iso, state) => {
                  setSelectedDate(iso);
                  setSelectedState(state);
                }}
              />
            </div>

            {/* One panel, whatever the night's status. An unopened night
                still cannot be paid for, but it is the same selection and the
                same vocabulary — VenueBooking just sends an enquiry instead of
                minting a payment link. */}
            <div className="venue-ask__panel">
              <VenueBooking
                venue={venue}
                selectedDate={selectedDate}
                selectedState={selectedState}
                onClearDate={() => {
                  setSelectedDate(null);
                  setSelectedState(null);
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. The gallery ──
          Every photograph below the fold, rooms and food together, in one grid
          that closes. It replaces three separate things: a plate under the
          ledger, a plate aligned to the opposite margin after the void, and a
          titled wall of food at the bottom. Each of those sat alone inside its
          own vertical rhythm, which is where the gaps came from. */}
      {gallery.length > 0 && (
        <section
          className="venue-gallery specimen-reveal"
          ref={galleryBand.ref}
          data-finish={galleryBand.finish}
          aria-label={`${venue.nickname} and our food`}
        >
          <div className="venue-gallery__grid">
            {gallery.map((item) => (
              <GalleryTile key={item.publicId || item.src} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* ── 4. The void: the room at night ──
          One dark surface per page. .specimen is applied here and nowhere else
          on the page, so its paper inversion and ambient raking light apply to
          this band alone — and so it does not fight .ht-scope for focus and
          selection styling everywhere else (service-page.css:18-22). */}
      <section
        className="venue-void specimen specimen-void specimen-reveal"
        ref={voidBand.ref}
        data-finish={voidBand.finish}
        style={
          venue.photos?.void
            ? {
                backgroundImage: `linear-gradient(rgba(24,19,12,0.62), rgba(24,19,12,0.62)), url(${venue.photos.void})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      >
        <span className="specimen-void__light" aria-hidden="true" />
        <div className="venue-void__inner">
          <blockquote className="venue-void__quote">
            &ldquo;Local Effort is truly top tier.&rdquo;
          </blockquote>
          <p className="venue-void__attr">
            — Alyssa Andes, Soup Sisters MN
          </p>
        </div>
      </section>

      <section className="service-close">
        <p className="ht-footnote">
          Planning around other bookings?{' '}
          <a href={`/api/venues/${venue.slug}/calendar.ics`}>
            Subscribe to {venue.nickname}&rsquo;s calendar
          </a>{' '}
          in Google Calendar, Airbnb or Apple Calendar and it stays current on its own.
        </p>
      </section>
    </div>
  );
}

VenueSheet.propTypes = {
  venue: PropTypes.shape({
    slug: PropTypes.string.isRequired,
    nickname: PropTypes.string.isRequired,
    accent: PropTypes.string,
    kicker: PropTypes.string,
    headline: PropTypes.string,
    summary: PropTypes.string,
    address: PropTypes.object,
    capacity: PropTypes.object,
    areaSqFt: PropTypes.number,
    amenities: PropTypes.arrayOf(PropTypes.string),
    hours: PropTypes.object,
    roomFeeCents: PropTypes.number,
    photos: PropTypes.object,
  }).isRequired,
  headingLevel: PropTypes.oneOf([1, 2]),
};

VenueSheet.defaultProps = { headingLevel: 2 };
