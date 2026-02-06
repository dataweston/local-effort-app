import React from 'react';

export const HOUR_HEIGHT = 56;
export const START_HOUR = 6;
export const END_HOUR = 20;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR);

export function timeToOffset(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return Math.max(0, (h - START_HOUR) * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT);
}

export function timeToHeight(start, end) {
  if (!start || !end) return HOUR_HEIGHT;
  return Math.max(HOUR_HEIGHT * 0.5, timeToOffset(end) - timeToOffset(start));
}

export const GUTTER_TOTAL_HEIGHT = HOURS.length * HOUR_HEIGHT;

export function TimeGutter() {
  return (
    <div className="w-12 flex-shrink-0 hidden lg:block" style={{ height: GUTTER_TOTAL_HEIGHT }}>
      {HOURS.map((h) => (
        <div
          key={h}
          className="text-[10px] pr-2 text-right border-t border-[var(--color-border-default)]"
          style={{
            height: HOUR_HEIGHT,
            color: 'var(--color-text-muted)',
            lineHeight: '1',
            paddingTop: '2px',
          }}
        >
          {h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`}
        </div>
      ))}
    </div>
  );
}
