/**
 * Week navigation component for meal plan calendar
 */
import React from 'react';
import { ChevronLeft, ChevronRight } from './MealIcons';

interface WeekNavProps {
  currentWeek: number;
  onWeekChange: (week: number) => void;
}

export const WeekNav = ({ currentWeek, onWeekChange }: WeekNavProps) => (
  <div className="flex items-center gap-3">
    <button
      onClick={() => onWeekChange(Math.max(1, currentWeek - 1))}
      disabled={currentWeek === 1}
      className="p-2 rounded-lg bg-white border-2 border-[#66D3E7] text-[#21C8E7] disabled:opacity-30 disabled:bg-[#7F9FA8]/10 disabled:border-[#7F9FA8]/30 hover:bg-[#21C8E7]/10 transition-colors shadow-md"
    >
      <ChevronLeft />
    </button>
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((week) => (
        <button
          key={week}
          onClick={() => onWeekChange(week)}
          className={`w-8 h-8 rounded-lg text-sm font-semibold shadow-md transition-all ${
            currentWeek === week ? 'bg-[#21C8E7] text-white scale-110' : 'bg-white border-2 border-[#66D3E7] text-[#2E5E67] hover:bg-[#66D3E7]/20'
          }`}
        >
          {week}
        </button>
      ))}
    </div>
    <button
      onClick={() => onWeekChange(Math.min(5, currentWeek + 1))}
      disabled={currentWeek === 5}
      className="p-2 rounded-lg bg-white border-2 border-[#66D3E7] text-[#21C8E7] disabled:opacity-30 disabled:bg-[#7F9FA8]/10 disabled:border-[#7F9FA8]/30 hover:bg-[#21C8E7]/10 transition-colors shadow-md"
    >
      <ChevronRight />
    </button>
  </div>
);
