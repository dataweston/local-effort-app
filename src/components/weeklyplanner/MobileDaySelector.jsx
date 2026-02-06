import React from 'react';

export function MobileDaySelector({ days, selectedIndex, onChange }) {
  return (
    <div className="flex overflow-x-auto gap-1.5 py-2 safe-area-x scrollbar-hide">
      {days.map((day, i) => (
        <button
          key={day}
          onClick={() => onChange(i)}
          className="touch-target-ios flex-shrink-0 px-3.5 py-2 rounded-full text-sm font-medium transition-colors"
          style={
            i === selectedIndex
              ? {
                  backgroundColor: 'var(--color-action-primary-bg)',
                  color: 'var(--color-action-primary-text)',
                }
              : {
                  backgroundColor: 'var(--color-bg-card)',
                  color: 'var(--color-text-secondary)',
                }
          }
        >
          {day.slice(0, 3)}
        </button>
      ))}
    </div>
  );
}
