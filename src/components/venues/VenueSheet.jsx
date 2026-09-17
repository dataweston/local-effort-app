// VenueSheet — the body shared by /firehouse, /foodist and the two panels of
// /private-events. One component, because the brief is three pages that should
// feel like the same instrument with a different room in it.
//
// The script (docs/design/VENUES.md):
//   1. the room, on the sheet      a plate with a cast shadow, name beneath
//   2. the ledger                  what the room is, ruled
//   3. the ask                     calendar + slip, side by side
//   4. the void                    the room at night — one dark band, the climax
//   5. release                     photographs, and the calendar feed
//
// This differs from the service pages, which open on the order slip. A dinner
// party needs no introduction; a room does. That is the one deliberate
// departure from the house script and it is argued in VENUES.md.

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import PhotoGrid from '../common/PhotoGrid';
import { QuickEventBookForm } from '../services/slipForms';
import { useSpecimenReveal } from '../../hooks/useSpecimenReveal';
import VenueCalendar from './VenueCalendar';
import { missingFacts } from '../../config/venues';

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

export default function VenueSheet({ venue, headingLevel }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const ledger = useSpecimenReveal();
  const voidBand = useSpecimenReveal();

  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  const capacity = capacityLine(venue.capacity);
  const roomFee = usd(venue.roomFeeCents);
  const gaps = missingFacts(venue);

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
              <dd className="venue-ledger__value">{roomFee}</dd>
            </div>
          )}
          <div className="venue-ledger__row">
            <dt className="venue-ledger__term">food &amp; service</dt>
            <dd className="venue-ledger__value">
              quoted per guest · dinner &amp; pizza from $850 · larger events from $1,200
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
          <VenueCalendar
            venueSlug={venue.slug}
            venueNickname={venue.nickname}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
          <QuickEventBookForm
            source={`venue-${venue.slug}`}
            venue={venue.nickname}
            presetDate={selectedDate || ''}
            ctaLabel="Request this date"
          />
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

      {/* ── 5. Release ── */}
      <section className="service-gallery">
        <PhotoGrid
          tags={venue.photos?.galleryTags || ['event', 'dinner']}
          perPage={9}
          layout="masonry"
          className="venue-gallery"
        />
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
