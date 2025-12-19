import React, { useMemo } from 'react';
import type { EffectiveDay, MealLibrary, MealType } from '../../mealPlan/types';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  mealLibrary: MealLibrary;
  effectiveDays: EffectiveDay[];
};

const sections = [
  { key: 'breakfast', title: 'Breakfast' },
  { key: 'lunch', title: 'Lunch' },
  { key: 'snacks', title: 'Snacks' },
  { key: 'dinner', title: 'Dinner' },
] as const;

export const RecipesPanel = ({
  isOpen,
  onClose,
  mealLibrary,
  effectiveDays,
}: Props) => {
  if (!isOpen) return null;

  const formatAmount = (value?: number, unit?: string) => {
    if (!value) return unit || '';
    return `${value}${unit ? ` ${unit}` : ''}`;
  };

  const usedRecipesByType = useMemo(() => {
    const result: Record<MealType, Map<string, { name: string; color?: string; count: number }>> = {
      breakfast: new Map(),
      lunch: new Map(),
      dinner: new Map(),
      snacks: new Map(),
    };

    (effectiveDays || []).forEach((day) => {
      (['breakfast', 'lunch', 'dinner', 'snacks'] as MealType[]).forEach((type) => {
        const instance = day.meals[type];
        const meal = instance?.meal;
        const key = instance?.templateKey || meal?.name || 'unknown';
        const entry = result[type].get(key);
        if (entry) {
          entry.count += 1;
        } else {
          result[type].set(key, {
            name: meal?.name || 'Custom Meal',
            color: meal?.color,
            count: 1,
          });
        }
      });
    });

    return result;
  }, [effectiveDays]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden bg-slate-50 rounded-2xl border border-[#9AA6B2]">
          <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-slate-50 border-b border-[#9AA6B2]">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Recipes
              </h2>
              <p className="text-sm text-slate-500">
                Used recipes (after overrides) + base templates.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[#BCCCDC] text-slate-600 hover:text-slate-900"
            >
              <XIcon />
            </button>
          </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-88px)] space-y-8 text-sm text-slate-700 leading-relaxed">
          <section>
            <h3 className="text-[#9AA6B2] font-medium mb-3">
              Recipes used in this plan
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {sections.map((section) => {
                const used = Array.from(usedRecipesByType[section.key as MealType].entries())
                  .map(([key, value]) => ({ key, ...value }))
                  .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

                if (!used.length) return null;

                return (
                  <div
                    key={`used-${section.key}`}
                    className="p-4 rounded-xl bg-white border border-[#9AA6B2]/40"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-slate-900">
                        {section.title}
                      </p>
                      <span className="text-xs text-slate-500">
                        {used.length} recipes
                      </span>
                    </div>
                    <ul className="space-y-1.5 text-sm">
                      {used.map((item) => (
                        <li
                          key={`${section.key}-${item.key}`}
                          className="flex items-center justify-between gap-3"
                        >
                          <span className="flex items-center gap-2 text-slate-800">
                            {item.color ? (
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: item.color }}
                              />
                            ) : null}
                            <span className="truncate">{item.name}</span>
                          </span>
                          <span className="text-xs text-slate-500 whitespace-nowrap">
                            {item.count}×
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>

          {sections.map((section) => (
            <section key={section.key}>
              <h3 className="text-[#9AA6B2] font-medium mb-3">
                {section.title}
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                Base templates used before overrides are applied.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                {Object.entries(mealLibrary[section.key] || {}).map(
                  ([code, meal]) => (
                    <div
                      key={`${section.key}-${code}`}
                      className="p-4 rounded-xl bg-[#D9EAFD]/80 border border-[#9AA6B2]/60"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-slate-900">
                            {meal.name}
                          </p>
                          <p className="text-xs font-mono text-slate-500 mt-1">
                            Key: {code}
                          </p>
                        </div>
                        {meal.color && (
                          <span
                            className="text-xs font-semibold px-2 py-1 rounded-full"
                            style={{
                              backgroundColor: `${meal.color}20`,
                              color: meal.color,
                            }}
                          >
                            {section.title}
                          </span>
                        )}
                      </div>
                      <ul className="mt-3 space-y-1.5 text-xs text-slate-600">
                        {(meal.ingredients || []).map((ingredient, index) => (
                          <li
                            key={`${code}-${index}`}
                            className="flex justify-between gap-2"
                          >
                            <span className="text-slate-800">
                              {ingredient.name}
                            </span>
                            <span className="text-slate-500">
                              {formatAmount(
                                ingredient.displayAmount ?? ingredient.amount,
                                ingredient.displayUnit || ingredient.unit
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

const XIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path
      d="M4 4l10 10M14 4L4 14"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);
