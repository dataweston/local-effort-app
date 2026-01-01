/**
 * Single day cell in the meal plan calendar
 */
import React from 'react';
import type { EffectiveDay } from '../../mealPlan/types';
import type { DailyNutritionEntry } from '../../mealPlan/export';

interface CalendarDayProps {
  day: EffectiveDay;
  weekdayLabel?: string;
  nutrition: DailyNutritionEntry | null;
  hasCustomization: boolean;
  onClick: () => void;
}

export const CalendarDay = ({
  day,
  weekdayLabel,
  nutrition,
  hasCustomization,
  onClick,
}: CalendarDayProps) => (
  <button
    onClick={onClick}
    className="group relative aspect-square p-3 rounded-2xl border-2 border-[#66D3E7]/50 bg-white hover:border-[#21C8E7] hover:bg-[#21C8E7]/5 hover:scale-105 transition-all shadow-md hover:shadow-xl"
  >
    {hasCustomization && (
      <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#ffc697] border-2 border-white shadow-md" />
    )}
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2 text-xs text-[#7F9FA8] font-medium">
        <span>{weekdayLabel || 'Day'}</span>
        <span className="text-lg font-bold text-[#2E5E67]">
          {day.plan.day}
        </span>
      </div>
      <div
        className="flex-1 flex items-center justify-center rounded-xl bg-gradient-to-br from-[#66D3E7]/10 to-[#21C8E7]/5 border border-[#66D3E7]/30"
        style={{ borderColor: day.meals.dinner.meal.color || '#7F9FA8' }}
      >
        <span className="text-xs font-semibold text-[#2E5E67] px-2 text-center">
          {day.meals.dinner.meal.name}
        </span>
      </div>
      {nutrition && (
        <div className="mt-2 text-left text-xs text-[#2E5E67] space-y-0.5 font-medium">
          <p className="text-[#21C8E7]">{Math.round(nutrition.calories)} kcal</p>
          <p>{Math.round(nutrition.protein)}g protein</p>
          <p className="text-[#ffc697]">{Math.round(nutrition.fiber)}g fiber</p>
        </div>
      )}
    </div>
  </button>
);
