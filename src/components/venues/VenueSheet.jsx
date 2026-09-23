// VenueSheet — the body shared by /firehouse, /foodist and the two panels of
// /private-events. One component, because the brief is three pages that should
// feel like the same instrument with a different room in it.
//
// The script (docs/design/VENUES.md):
//   1. the room, on the sheet      a plate with a cast shadow, name beneath
//   2. the ledger                  what the room is, ruled
//   3. the ask                     calendar + deposit, side by side
//   4. the void                    the room at night — one dark band, the climax
//   5. release                     the kitchen, photographs, and the feed
//
// This differs from the service pages, which open on the order slip. A dinner
// party needs no introduction; a room does. That is the one deliberate
// departure from the house script and it is argued in VENUES.md.
//
// Beat 3 changed in 2026-09: it used to collect an enquiry and wait for a human
// to reply. It now takes a 20% deposit through Square and holds the night on
// the spot, because the journey this page is built for — someone who came to
// book a chef, saw the room, and wants the date — dies in the gap between an
// enquiry and an answer. The enquiry form is still there, but only for the
// dates we have not opened, which are the only dates we cannot honestly sell.

import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useSearchParams } from 'react-router-dom';
import { QuickEventBookForm } from '../services/slipForms';
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
 * A secondary plate: a photograph mounted with a folio and a caption, the way
 * every sheet in the reference set is catalogued. Narrower than the hero on
 * purpose — the hero is the room, these are its particulars.
 */
const CaptionedPlate = ({ plate }) => (
  <figure className="venue-plate specimen-figure">
    <div className="venue-plate__frame specimen-frame">
      <img src={plate.src} alt={plate.alt} loading="lazy" decoding="async" />
      {plate.folio && <span className="specimen-frame__folio">{plate.folio}</span>}
    </div>
    {plate.caption && <figcaption className="venue-plate__caption">{plate.caption}</figcaption>}
  </figure>
);

CaptionedPlate.propTypes = {
  plate: PropTypes.shape({
    src: PropTypes.string.isRequired,
    alt: PropTypes.string.isRequired,
    folio: PropTypes.string,
    caption: PropTypes.string,
  }).isRequired,
};

/**
 * One food plate on the wall.
 *
 * Same mount as the venue plates — ruled frame, folio, caption on the board —
 * because these photographs are specimens whether or not anyone meant them to
 * be. The melon is Coorte's composition with a cantaloupe in it: dark ground,
 * one subject, raking light. The tomato is a botanical sheet. The set falls on
 * both sides of the paper/panel split the palette was measured against
 * (brand-tokens.css:60-72), so `pole` carries that through to the mount: a
 * paper plate sits on the sheet, a panel plate sits on the mount board.
 */
const FoodPlate = ({ plate }) => (
  <figure
    className="venue-food__plate specimen-figure"
    data-pole={plate.pole}
    // The wall is laid out by the shape the photograph already has. Derived
    // here into a token rather than matched in CSS off the inline style, which
    // would depend on exactly how React serialises a custom property.
    data-shape={String(plate.aspect || '').startsWith('3 / 2') ? 'landscape' : 'portrait'}
  >
    <div className="venue-plate__frame specimen-frame" style={{ '--plate-aspect': plate.aspect }}>
      <img
        src={cloudinarySrc(plate.publicId, 900)}
        srcSet={CLOUD_WIDTHS.map((w) => `${cloudinarySrc(plate.publicId, w)} ${w}w`).join(', ')}
        sizes="(max-width: 48rem) 92vw, (max-width: 64rem) 44vw, 30vw"
        alt={plate.alt}
        loading="lazy"
        decoding="async"
      />
      {plate.folio && <span className="specimen-frame__folio">{plate.folio}</span>}
    </div>
    {plate.caption && <figcaption className="venue-plate__caption">{plate.caption}</figcaption>}
  </figure>
);

FoodPlate.propTypes = {
  plate: PropTypes.shape({
    publicId: PropTypes.string.isRequired,
    alt: PropTypes.string.isRequired,
    aspect: PropTypes.string,
    folio: PropTypes.string,
    caption: PropTypes.string,
    pole: PropTypes.string,
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
  const foodWall = useSpecimenReveal();

  // Square sends the payer back here after the card step.
  const paidHold = searchParams.get('deposit') === 'success' ? searchParams.get('hold') : null;
  useEffect(() => {
    if (paidHold) setSelectedDate(null);
  }, [paidHold]);

  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  const capacity = capacityLine(venue.capacity);
  const roomFee = usd(venue.roomFeeCents);
  const gaps = missingFacts(venue);
  const plates = venue.photos?.plates || [];
  const food = SHARED_PHOTOS.food || [];

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
              <dt className="venue-ledger__term">room</dt>
              <dd className="venue-ledger__value">{roomFee} per event day</dd>
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

        {plates[0] && <CaptionedPlate plate={plates[0]} />}
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

            <div className="venue-ask__panel">
              {/* An unmanaged night has no row and promises nothing, so it
                  cannot be sold on the spot — it goes to the people who can
                  check it. */}
              {selectedDate && selectedState === 'unmanaged' ? (
                <>
                  <p className="venue-book__basis">
                    We haven’t opened {selectedDate} yet, so we won’t take your money for it. Send
                    it over and we’ll confirm by hand — usually the same day.
                  </p>
                  <QuickEventBookForm
                    source={`venue-${venue.slug}`}
                    venue={venue.nickname}
                    presetDate={selectedDate}
                    ctaLabel="Ask about this date"
                  />
                </>
              ) : (
                <VenueBooking
                  venue={venue}
                  selectedDate={selectedDate}
                  selectedState={selectedState}
                  onClearDate={() => {
                    setSelectedDate(null);
                    setSelectedState(null);
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </section>

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

      {/* ── 5. Release ── the kitchen, then what comes out of it.
          This used to be a PhotoGrid pulling nine images by Cloudinary tag. It
          is now a named set, because a page that has just asked for $420 should
          not close on whatever the tag happened to return that morning — and
          because these five photographs are specimens in the sense the whole
          site means it, which a masonry grid would have flattened. */}
      {plates[1] && (
        <section className="venue-release">
          <CaptionedPlate plate={plates[1]} />
        </section>
      )}

      {food.length > 0 && (
        <section
          id="the-food"
          className="venue-food specimen-reveal"
          ref={foodWall.ref}
          data-finish={foodWall.finish}
        >
          <p className="ht-kicker">the food —</p>
          <h2>What comes out of it</h2>
          <div className="venue-food__wall">
            {food.map((plate) => (
              <FoodPlate key={plate.publicId} plate={plate} />
            ))}
          </div>
        </section>
      )}

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
