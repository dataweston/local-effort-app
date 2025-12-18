import React, { useMemo } from 'react';
import type { EffectiveDay, Meal, MealType } from '../../mealPlan/types';
import { sumMeal } from '../../nutrition/calc';
import { NUTRIENT_KEYS, type Nutrients } from '../../nutrition/nutrients';
import { MealCard } from './MealCard';

type Goal = {
  min?: number;
  max: number;
  label: string;
  unit: string;
};

type GoalMap = Record<string, Goal>;

type Props = {
  day: EffectiveDay;
  goals: GoalMap;
  canEdit: boolean;
  onUpdateMeal: (dayKey: string, mealKey: string, meal: Meal) => void;
  onDeleteMeal: (dayKey: string, mealKey: string) => void;
  onClose: () => void;
};

const macroGoalKeys = ['calories', 'protein', 'carbs', 'fat', 'fiber'];

export const DayDetail = ({
  day,
  goals,
  canEdit,
  onUpdateMeal,
  onDeleteMeal,
  onClose,
}: Props) => {
  const nutrition = useMemo(() => {
    const totals = NUTRIENT_KEYS.reduce((acc, key) => {
      acc[key] = 0;
      return acc;
    }, {} as Nutrients);

    (['breakfast', 'lunch', 'dinner', 'snacks'] as const).forEach((type) => {
      const mealTotals = sumMeal(day.meals[type].meal);
      NUTRIENT_KEYS.forEach((key) => {
        totals[key] += mealTotals[key] || 0;
      });
    });

    return totals;
  }, [day]);

  const dinnerInfo = day.meals.dinner.meal;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden bg-slate-50 rounded-2xl border border-[#9AA6B2]">
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-slate-50/95 backdrop-blur border-b border-[#9AA6B2]">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${dinnerInfo.color || '#64748b'}30` }}
            >
              <span
                className="text-lg font-bold"
                style={{ color: dinnerInfo.color || '#0f172a' }}
              >
                {day.plan.day}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Day {day.plan.day}
              </h2>
              <p className="text-sm text-slate-600">{dinnerInfo.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#BCCCDC] transition-colors text-slate-600 hover:text-slate-900"
          >
            <XIcon />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-88px)]">
          <div className="p-6 border-b border-[#9AA6B2] bg-gradient-to-b from-[#BCCCDC]/60 to-transparent">
            <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-4">
              Daily Nutrition
            </h3>

            <div className="grid grid-cols-5 gap-4 mb-6">
              {macroGoalKeys.map((key) => (
                <CircularProgress
                  key={key}
                  value={nutrition[key as keyof Nutrients]}
                  max={goals[key]?.max || 1}
                  color={macroColors[key]}
                  label={goals[key]?.label || key}
                  unit={goals[key]?.unit || ''}
                />
              ))}
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {microGoals.map((goal) => (
                <MicroBar
                  key={goal.key}
                  label={goal.label}
                  value={nutrition[goal.key as keyof Nutrients]}
                  max={goal.max}
                  unit={goal.unit}
                  color={goal.color}
                />
              ))}
            </div>
          </div>

          <div className="p-6 space-y-4">
            <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-4">
              Meals & Ingredients
            </h3>

            {mealTypes.map((type) => {
              const instance = day.meals[type];
              return (
                <MealCard
                  key={type}
                  title={type.charAt(0).toUpperCase() + type.slice(1)}
                  meal={instance.meal}
                  canEdit={canEdit}
                  onUpdate={(next) =>
                    onUpdateMeal(day.dayKey, instance.instanceKey, next)
                  }
                  onDelete={() =>
                    onDeleteMeal(day.dayKey, instance.instanceKey)
                  }
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks'];

const macroColors: Record<string, string> = {
  calories: '#f59e0b',
  protein: '#3b82f6',
  carbs: '#22c55e',
  fat: '#f43f5e',
  fiber: '#8b5cf6',
};

const microGoals = [
  { key: 'ala', label: 'Omega-3 ALA', max: 2, unit: ' g', color: '#06b6d4' },
  {
    key: 'epa_dha',
    label: 'Omega-3 EPA + DHA',
    max: 2,
    unit: ' g',
    color: '#0ea5e9',
  },
  { key: 'vitA', label: 'Vitamin A', max: 900, unit: ' mcg', color: '#f97316' },
  { key: 'b12', label: 'Vitamin B12', max: 2.4, unit: ' mcg', color: '#ec4899' },
  { key: 'folate', label: 'Folate', max: 400, unit: ' mcg', color: '#14b8a6' },
  { key: 'vitC', label: 'Vitamin C', max: 90, unit: ' mg', color: '#eab308' },
  { key: 'vitD', label: 'Vitamin D', max: 20, unit: ' mcg', color: '#a855f7' },
  { key: 'vitK', label: 'Vitamin K', max: 120, unit: ' mcg', color: '#84cc16' },
  { key: 'calcium', label: 'Calcium', max: 1000, unit: ' mg', color: '#64748b' },
  { key: 'magnesium', label: 'Magnesium', max: 400, unit: ' mg', color: '#6366f1' },
  { key: 'potassium', label: 'Potassium', max: 4700, unit: ' mg', color: '#0ea5e9' },
  { key: 'zinc', label: 'Zinc', max: 11, unit: ' mg', color: '#d946ef' },
  { key: 'iron', label: 'Iron', max: 18, unit: ' mg', color: '#ef4444' },
];

const CircularProgress = ({
  value,
  max,
  color,
  label,
  unit,
}: {
  value: number;
  max: number;
  color: string;
  label: string;
  unit: string;
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  return (
    <div className="flex flex-col items-center bg-white/60 rounded-xl py-4">
      <svg width="80" height="80" viewBox="0 0 36 36" className="mb-2">
        <path
          className="text-[#e2e8f0]"
          strokeWidth="2.5"
          stroke="currentColor"
          fill="none"
          strokeLinecap="round"
          d="M18 2.0845
            a 15.9155 15.9155 0 0 1 0 31.831
            a 15.9155 15.9155 0 0 1 0 -31.831"
        />
        <path
          strokeWidth="2.5"
          strokeLinecap="round"
          stroke={color}
          fill="none"
          d="M18 2.0845
            a 15.9155 15.9155 0 0 1 0 31.831"
          strokeDasharray={`${percentage}, 100`}
        />
      </svg>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-900">
        {Math.round(value)} {unit}
      </p>
    </div>
  );
};

const MicroBar = ({
  label,
  value,
  max,
  unit,
  color,
}: {
  label: string;
  value: number;
  max: number;
  unit: string;
  color: string;
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-600">{label}</span>
        <span className="text-slate-700 font-medium">
          {Math.round(value)} {unit}
        </span>
      </div>
      <div className="h-1.5 bg-[#BCCCDC] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};

const XIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4l10 10M14 4L4 14" />
  </svg>
);
