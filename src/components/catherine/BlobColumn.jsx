import React, { useMemo } from 'react';
import { formatDateShort, isToday } from '../weeklyplanner/dateUtils';
import { hoursFromTimes } from '../weeklyplanner/financials';
import { ColorBlob } from './ColorBlob';

const DAY_START = '06:00';
const DAY_END = '21:00';
const PX_PER_HOUR = 60; // height per hour in weekly view

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Build ordered time blocks for a day, filling gaps with "unscheduled" blocks.
 * Returns array of { card, startTime, endTime, hours }.
 * card is null for unscheduled gaps.
 */
function buildTimeBlocks(cards) {
  // Separate timed vs untimed cards
  const timed = cards
    .filter((c) => c.startTime && c.endTime)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  const untimed = cards.filter((c) => !c.startTime || !c.endTime);

  const blocks = [];
  let cursor = timeToMinutes(DAY_START);
  const dayEnd = timeToMinutes(DAY_END);

  for (const card of timed) {
    const start = timeToMinutes(card.startTime);
    const end = timeToMinutes(card.endTime);
    if (start <= cursor && end <= cursor) continue; // completely overlapped

    // Fill gap before this card
    const effectiveStart = Math.max(start, cursor);
    if (effectiveStart > cursor) {
      const gapHours = (effectiveStart - cursor) / 60;
      if (gapHours >= 0.25) {
        // Check if any untimed card fills this gap
        const filler = untimed.shift();
        blocks.push({
          card: filler || null,
          startTime: minutesToTime(cursor),
          endTime: minutesToTime(effectiveStart),
          hours: gapHours,
        });
      }
    }

    // Add the timed card
    const cardEnd = Math.min(end, dayEnd);
    const hours = Math.max(0, (cardEnd - effectiveStart) / 60);
    if (hours > 0) {
      blocks.push({
        card,
        startTime: card.startTime,
        endTime: card.endTime,
        hours,
      });
    }
    cursor = Math.max(cursor, cardEnd);
  }

  // Fill remaining time to end of day
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

  // If we still have untimed cards that weren't placed, add them as small blocks
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

  const pxPerHour = daily ? 80 : PX_PER_HOUR;

  return (
    <div
      className="flex-1 min-w-0 flex flex-col"
      style={{
        background: today
          ? 'radial-gradient(ellipse at 50% 30%, rgba(122,132,110,0.12) 0%, transparent 70%)'
          : 'transparent',
      }}
    >
      {/* Day label */}
      <div className="text-center py-2">
        <span
          className="text-[11px] font-display font-medium tracking-wide"
          style={{ color: today ? '#7A846E' : 'rgba(58,46,63,0.5)' }}
        >
          {label}
        </span>
      </div>

      {/* Blob stack */}
      <div className="flex-1 relative overflow-hidden" style={{ borderRadius: '20px' }}>
        {blocks.map((block, i) => (
          <ColorBlob
            key={`${date}-${i}`}
            card={block.card}
            heightPx={Math.max(block.hours * pxPerHour, 20)}
            index={i}
            daily={daily}
          />
        ))}
      </div>
    </div>
  );
}
