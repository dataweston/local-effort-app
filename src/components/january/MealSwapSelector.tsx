import React, { useState } from 'react';
import type { Meal, MealLibrary, MealType } from '../../mealPlan/types';
import { sumMeal } from '../../nutrition/calc';

type Props = {
  mealType: MealType;
  currentMealKey: string;
  mealLibrary: MealLibrary;
  onSelect: (mealKey: string, meal: Meal) => void;
  onClose: () => void;
};

/**
 * MealSwapSelector - Modal to select a different meal from the library
 * Allows users to swap breakfast/lunch/dinner to any available option
 */
export const MealSwapSelector = ({
  mealType,
  currentMealKey,
  mealLibrary,
  onSelect,
  onClose,
}: Props) => {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const availableMeals = Object.entries(mealLibrary[mealType] || {});

  const handleSelect = () => {
    if (selectedKey) {
      const meal = mealLibrary[mealType][selectedKey];
      if (meal) {
        onSelect(selectedKey, meal);
      }
    }
  };

  const mealTypeLabel = mealType.charAt(0).toUpperCase() + mealType.slice(1);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg max-h-[80vh] overflow-hidden bg-white rounded-2xl border-2 border-[#66D3E7] shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-white border-b border-[#66D3E7]/30">
          <div>
            <h3 className="text-lg font-semibold text-[#2E5E67]">
              Switch {mealTypeLabel}
            </h3>
            <p className="text-sm text-[#7F9FA8]">
              Choose from {availableMeals.length} available options
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#66D3E7]/10 transition-colors text-[#7F9FA8] hover:text-[#2E5E67]"
          >
            <XIcon />
          </button>
        </div>

        {/* Meal Options */}
        <div className="overflow-y-auto max-h-[calc(80vh-140px)] p-4 space-y-2">
          {availableMeals.length === 0 ? (
            <div className="text-center py-8 text-[#7F9FA8]">
              <p>No {mealType} options available in the library.</p>
              <p className="text-sm mt-2">Add recipes in the Recipes panel first.</p>
            </div>
          ) : (
            availableMeals.map(([key, meal]) => {
              const isSelected = selectedKey === key;
              const isCurrent = key === currentMealKey;
              const nutrition = sumMeal(meal);

              return (
                <button
                  key={key}
                  onClick={() => setSelectedKey(key)}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    isSelected
                      ? 'border-[#21C8E7] bg-[#21C8E7]/10'
                      : isCurrent
                      ? 'border-[#ffc697] bg-[#ffc697]/10'
                      : 'border-[#66D3E7]/30 hover:border-[#66D3E7] bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {/* Color indicator */}
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: meal.color || '#94a3b8' }}
                        />
                        <h4 className="font-medium text-[#2E5E67]">
                          {meal.name}
                        </h4>
                        {isCurrent && (
                          <span className="px-2 py-0.5 text-xs font-medium text-[#ffc697] bg-[#ffc697]/20 rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                      
                      {meal.notes && (
                        <p className="text-sm text-[#7F9FA8] mt-1 line-clamp-2">
                          {meal.notes}
                        </p>
                      )}

                      {/* Nutrition summary */}
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-[#7F9FA8]">
                        <span className="font-medium text-[#2E5E67]">
                          {Math.round(nutrition.calories)} kcal
                        </span>
                        <span>{Math.round(nutrition.protein)}g protein</span>
                        <span>{Math.round(nutrition.carbs)}g carbs</span>
                        <span>{Math.round(nutrition.fat)}g fat</span>
                      </div>

                      {/* Ingredient preview */}
                      <p className="text-xs text-[#7F9FA8] mt-2">
                        {meal.ingredients.length} ingredients: {' '}
                        {meal.ingredients.slice(0, 3).map(i => i.name).join(', ')}
                        {meal.ingredients.length > 3 && ` +${meal.ingredients.length - 3} more`}
                      </p>
                    </div>

                    {/* Selection indicator */}
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected
                        ? 'border-[#21C8E7] bg-[#21C8E7]'
                        : 'border-[#7F9FA8]/40'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M2 6l3 3 5-5" />
                        </svg>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-end gap-3 p-4 bg-white border-t border-[#66D3E7]/30">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#7F9FA8] hover:text-[#2E5E67] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSelect}
            disabled={!selectedKey || selectedKey === currentMealKey}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              selectedKey && selectedKey !== currentMealKey
                ? 'bg-[#21C8E7] text-white hover:bg-[#21C8E7]/90 shadow-md'
                : 'bg-[#7F9FA8]/20 text-[#7F9FA8] cursor-not-allowed'
            }`}
          >
            Switch to Selected
          </button>
        </div>
      </div>
    </div>
  );
};

const XIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4l10 10M14 4L4 14" />
  </svg>
);
