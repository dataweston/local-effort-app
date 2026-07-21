import React from 'react';

// Bespoke spot illustrations for Hub empty states: simple stroke line art in
// the page's own ink, sitting on an olive wash. Kitchen objects, not clip art —
// keep new ones in this voice (2px round strokes, 64×64 viewBox, no fills
// besides small currentColor dots).

function WhiskArt() {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 8l13 17" />
      <path d="M27 25c11 1 22 13 17 24-3 7-11 4-14-5-3-9-3-16-3-19z" />
      <path d="M27 25c7 3 15 13 11 22" />
      <path d="M27 25c3 5 7 15 5 23" />
      <circle cx="27" cy="25" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function PotArt() {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 34h28v9a9 9 0 0 1-9 9H27a9 9 0 0 1-9-9v-9z" />
      <path d="M46 38h8" />
      <path d="M20 32c2-6 22-6 24 0" />
      <circle cx="32" cy="25" r="2" />
      <path d="M26 18c0-4 4-4 4-8" />
      <path d="M38 18c0-4-4-4-4-8" />
    </svg>
  );
}

function PlaneArt() {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 31L55 13 36 53l-7-15-20-7z" />
      <path d="M55 13L29 38" />
      <path d="M12 44c4-1 7-1 10 1" />
      <path d="M16 51c3-1 5-1 8 0" />
    </svg>
  );
}

function BasketArt() {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 30h34l-4 20a5 5 0 0 1-5 4H24a5 5 0 0 1-5-4l-4-20z" />
      <path d="M17 39h30" />
      <path d="M26 30l2 24" />
      <path d="M38 30l-2 24" />
      <path d="M23 30a9 9 0 0 1 18 0" />
    </svg>
  );
}

const ART = {
  whisk: WhiskArt,
  pot: PotArt,
  plane: PlaneArt,
  basket: BasketArt,
};

export function EmptyState({ art, title, hint }) {
  const Art = ART[art] || PotArt;
  return (
    <div className="hub-empty-state">
      <span className="hub-empty-art"><Art /></span>
      <strong>{title}</strong>
      {hint && <span className="hub-empty-hint">{hint}</span>}
    </div>
  );
}
