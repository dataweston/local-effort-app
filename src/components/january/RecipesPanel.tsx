import React from 'react';
import type { MealLibrary } from '../../mealPlan/types';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  mealLibrary: MealLibrary;
};

const sections = [
  { key: 'breakfast', title: 'Breakfast' },
  { key: 'lunch', title: 'Lunch' },
  { key: 'snacks', title: 'Snacks' },
  { key: 'dinner', title: 'Dinner' },
] as const;

export const RecipesPanel = ({ isOpen, onClose, mealLibrary }: Props) => {
  if (!isOpen) return null;

  const formatAmount = (value?: number, unit?: string) => {
    if (!value) return unit || '';
    return `${value}${unit ? ` ${unit}` : ''}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden bg-slate-50 rounded-2xl border border-[#9AA6B2]">
          <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-slate-50 border-b border-[#9AA6B2]">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                All Recipes
              </h2>
              <p className="text-sm text-slate-500">
                Base templates used before overrides are applied.
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
          {sections.map((section) => (
            <section key={section.key}>
              <h3 className="text-[#9AA6B2] font-medium mb-3">
                {section.title}
              </h3>
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
