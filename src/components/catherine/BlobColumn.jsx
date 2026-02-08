import React, { useMemo } from 'react';
import { formatDateShort, isToday } from '../weeklyplanner/dateUtils';
import { ColorBlob } from './ColorBlob';

const DAY_START = '06:00';
const DAY_END = '21:00';
const PX_PER_HOUR = 56;

function timeToMinutes(t) {
  if (!t) return null;
  const raw = String(t).trim();
  if (!raw) return null;

  // Supports "07:00", "07:00:00", and "7:00 AM"/"7:00PM" legacy formats.
  const ampm = raw.match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*([AaPp][Mm])$/);
  if (ampm) {
    let h = Number(ampm[1]);
    const m = Number(ampm[2] || '0');
    if (!Number.isFinite(h) || !Number.isFinite(m) || m < 0 || m > 59) return null;
    const isPM = ampm[3].toLowerCase() === 'pm';
    if (h === 12) h = isPM ? 12 : 0;
    else if (isPM) h += 12;
    return h * 60 + m;
  }

  const parts = raw.split(':');
  if (parts.length < 2) return null;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    return null;
  }
  return h * 60 + m;
}

function buildTimeBlocks(cards) {
  const dayStart = timeToMinutes(DAY_START) ?? 360;
  const dayEnd = timeToMinutes(DAY_END) ?? 1260;
  const timed = [];
  const untimed = [];
  for (const c of cards) {
    if (!c) continue;
    if (String(c.zone || '').toLowerCase() === 'untimed') {
      untimed.push(c);
      continue;
    }
    const start = timeToMinutes(c.startTime);
    const end = timeToMinutes(c.endTime);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      untimed.push(c);
      continue;
    }
    // Keep cards visible when their times are outside the displayed day window.
    if (end <= dayStart || start >= dayEnd) {
      untimed.push(c);
      continue;
    }
    if (Number.isFinite(start) && Number.isFinite(end)) {
      timed.push({ card: c, start, end });
    } else {
      untimed.push(c);
    }
  }
  timed.sort((a, b) => a.start - b.start);

  const blocks = [];
  let cursor = dayStart;

  for (const row of timed) {
    const { card, start, end } = row;
    // Fully overlapped cards should still be visible in fallback untimed rendering.
    if (start <= cursor && end <= cursor) {
      untimed.push(card);
      continue;
    }

    const effectiveStart = Math.max(start, cursor);
    if (effectiveStart > cursor) {
      const gapHours = (effectiveStart - cursor) / 60;
      if (gapHours >= 0.25) {
        const filler = untimed.shift();
        blocks.push({
          card: filler || null,
          startTime: minutesToTime(cursor),
          endTime: minutesToTime(effectiveStart),
          hours: gapHours,
        });
      }
    }

    const cardEnd = Math.min(end, dayEnd);
    const hours = Math.max(0, (cardEnd - effectiveStart) / 60);
    if (hours > 0) {
      blocks.push({
        card,
        startTime: minutesToTime(effectiveStart),
        endTime: minutesToTime(cardEnd),
        hours,
      });
    } else {
      untimed.push(card);
    }
    cursor = Math.max(cursor, cardEnd);
  }

  if (cursor < dayEnd) {
    const gapHours = (dayEnd - cursor) / 60;
    const filler = untimed.shift();
    blocks.push({
      card: filler || null,
      startTime: minutesToTime(cursor),
      endTime: DAY_END,
      hours: gapHours,
    });
  }

  for (const uc of untimed) {
    blocks.push({
      card: uc,
      startTime: null,
      endTime: null,
      hours: 1,
    });
  }

  return blocks;
}

function minutesToTime(m) {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function BlobColumn({ date, cards, daily = false }) {
  const today = isToday(date);
  const label = formatDateShort(date);
  const blocks = useMemo(() => buildTimeBlocks(cards), [cards]);
  const hasRenderableBlocks = useMemo(() => blocks.some((b) => Boolean(b?.card)), [blocks]);
  const fallbackCards = useMemo(() => (Array.isArray(cards) ? cards.filter(Boolean) : []), [cards]);

  const pxPerHour = daily ? 72 : PX_PER_HOUR;

  return (
    <div
      className={`${daily ? 'w-full max-w-xl' : 'flex-none w-[88px] sm:flex-1 sm:w-auto'} min-w-0 flex flex-col items-center snap-start`}
    >
      {/* Day label */}
      <div className="text-center py-2">
        <span
          className="text-[11px] font-display font-medium tracking-wide"
          style={{ color: today ? '#7A846E' : 'rgba(58,46,63,0.35)' }}
        >
          {label}
        </span>
      </div>

      {/* Blobs float freely — no container, no clipping */}
      <div className="flex-1 relative w-full flex flex-col items-center">
        {hasRenderableBlocks ? (
          blocks.map((block, i) => (
            <ColorBlob
              key={`${date}-${i}`}
              card={block.card}
              heightPx={Math.max(block.hours * pxPerHour, 24)}
              index={i}
              total={blocks.length}
              daily={daily}
            />
          ))
        ) : (
          fallbackCards.map((card, i) => (
            <ColorBlob
              key={`${date}-fallback-${card.id || i}`}
              card={card}
              heightPx={Math.max(pxPerHour * 0.85, 28)}
              index={i}
              total={fallbackCards.length}
              daily={daily}
            />
          ))
        )}
      </div>
    </div>
  );
}
