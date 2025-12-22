import React, { useMemo, useState } from 'react';
import type { EffectiveDay, MealLibrary, MealType, Meal } from '../../mealPlan/types';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  mealLibrary: MealLibrary;
  effectiveDays: EffectiveDay[];
  canEdit?: boolean;
  onEditRecipe?: (mealType: MealType, code: string, recipe: Meal) => void;
  onDeleteRecipe?: (mealType: MealType, code: string) => void;
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
  canEdit = false,
  onEditRecipe,
  onDeleteRecipe,
}: Props) => {
  const [editingRecipe, setEditingRecipe] = useState<{ mealType: MealType; code: string } | null>(null);
  const [editedMeal, setEditedMeal] = useState<Meal | null>(null);

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
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 bg-[#2E5E67]/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden bg-white rounded-2xl border-2 border-[#66D3E7] shadow-2xl my-4">
          <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-gradient-to-r from-white to-[#66D3E7]/10 border-b-2 border-[#66D3E7]">
            <div>
              <h2 className="text-xl font-bold text-[#2E5E67]">
                Recipes
              </h2>
              <p className="text-sm text-[#7F9FA8]">
                Used recipes (after overrides) + base templates.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[#21C8E7]/10 text-[#7F9FA8] hover:text-[#21C8E7] transition-colors"
            >
              <XIcon />
            </button>
          </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-88px)] space-y-8 text-sm text-[#2E5E67] leading-relaxed">
          <section>
            <h3 className="text-[#21C8E7] font-bold mb-3">
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
                    className="p-4 rounded-xl bg-white border-2 border-[#66D3E7]/50 shadow-md hover:border-[#21C8E7]/70 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-bold text-[#2E5E67]">
                        {section.title}
                      </p>
                      <span className="text-xs text-[#7F9FA8] font-medium">
                        {used.length} recipes
                      </span>
                    </div>
                    <ul className="space-y-1.5 text-sm">
                      {used.map((item) => (
                        <li
                          key={`${section.key}-${item.key}`}
                          className="flex items-center justify-between gap-3"
                        >
                          <span className="flex items-center gap-2 text-[#2E5E67] font-medium">
                            {item.color ? (
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-white shadow-sm"
                                style={{ backgroundColor: item.color }}
                              />
                            ) : null}
                            <span className="truncate">{item.name}</span>
                          </span>
                          <span className="text-xs text-[#7F9FA8] font-semibold whitespace-nowrap">
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
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[#21C8E7] font-bold">
                  {section.title}
                </h3>
                {canEdit && onEditRecipe && (
                  <button
                    onClick={() => {
                      const newCode = prompt('Enter recipe code (e.g., "custom-1"):', '');
                      if (newCode) {
                        const newRecipe = {
                          name: 'New Recipe',
                          ingredients: [],
                          color: '#94a3b8'
                        };
                        onEditRecipe(section.key as MealType, newCode, newRecipe);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#21C8E7] border-2 border-[#21C8E7] rounded-lg hover:bg-[#1e9bc8] hover:border-[#1e9bc8] transition-all shadow-md hover:shadow-lg"
                  >
                    <PlusIcon /> Add Recipe
                  </button>
                )}
              </div>
              <p className="text-xs text-[#7F9FA8] mb-3">
                Base templates used before overrides are applied.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                {Object.entries(mealLibrary[section.key] || {}).map(
                  ([code, meal]) => {
                    const isEditing = editingRecipe?.mealType === section.key && editingRecipe?.code === code;
                    const currentMeal = isEditing && editedMeal ? editedMeal : meal;

                    return (
                      <div
                        key={`${section.key}-${code}`}
                        className="p-4 rounded-xl bg-gradient-to-br from-white to-[#66D3E7]/5 border-2 border-[#66D3E7]/50 shadow-md hover:border-[#21C8E7]/70 transition-all hover:shadow-lg"
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1">
                            {isEditing ? (
                              <input
                                type="text"
                                value={currentMeal.name}
                                onChange={(e) => setEditedMeal({ ...currentMeal, name: e.target.value })}
                                className="text-base font-bold text-[#2E5E67] bg-white border border-[#66D3E7] rounded px-2 py-1 w-full"
                              />
                            ) : (
                              <p className="text-base font-bold text-[#2E5E67]">
                                {meal.name}
                              </p>
                            )}
                            <p className="text-xs font-mono text-[#7F9FA8] mt-1">
                              Key: {code}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
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
                        </div>

                        {isEditing ? (
                          <div className="space-y-2">
                            <div className="text-xs font-semibold text-[#2E5E67] mb-2">Ingredients:</div>
                            {currentMeal.ingredients.map((ingredient, index) => (
                              <div key={index} className="flex items-center gap-2 text-xs">
                                <span className="flex-1 text-[#2E5E67] font-medium">{ingredient.name}</span>
                                <input
                                  type="number"
                                  value={ingredient.amount}
                                  onChange={(e) => {
                                    const newIngredients = [...currentMeal.ingredients];
                                    newIngredients[index] = { ...ingredient, amount: parseFloat(e.target.value) || 0 };
                                    setEditedMeal({ ...currentMeal, ingredients: newIngredients });
                                  }}
                                  className="w-16 px-1 py-0.5 text-xs border border-[#66D3E7] rounded"
                                />
                                <span className="text-[#7F9FA8]">{ingredient.unit}</span>
                                <button
                                  onClick={() => {
                                    const newIngredients = currentMeal.ingredients.filter((_, i) => i !== index);
                                    setEditedMeal({ ...currentMeal, ingredients: newIngredients });
                                  }}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <XIcon />
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => {
                                // For now, just add a placeholder ingredient. In a real app, you'd open an ingredient search.
                                const newIngredient = {
                                  name: 'New Ingredient',
                                  amount: 100,
                                  unit: 'g',
                                  fdcId: 0,
                                  nutrientsPer100g: {}
                                };
                                setEditedMeal({
                                  ...currentMeal,
                                  ingredients: [...currentMeal.ingredients, newIngredient]
                                });
                              }}
                              className="text-xs text-[#21C8E7] hover:text-[#1e9bc8] font-medium"
                            >
                              + Add Ingredient
                            </button>
                          </div>
                        ) : (
                          <ul className="space-y-1.5 text-xs text-[#2E5E67]">
                            {(meal.ingredients || []).map((ingredient, index) => (
                              <li
                                key={`${code}-${index}`}
                                className="flex justify-between gap-2"
                              >
                                <span className="text-[#2E5E67] font-medium">
                                  {ingredient.name}
                                </span>
                                <span className="text-[#7F9FA8]">
                                  {formatAmount(
                                    ingredient.displayAmount ?? ingredient.amount,
                                    ingredient.displayUnit || ingredient.unit
                                  )}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}

                        {canEdit && onEditRecipe && onDeleteRecipe && (
                          <div className="flex gap-2 mt-3 pt-3 border-t border-[#66D3E7]/30">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingRecipe(null);
                                    setEditedMeal(null);
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#7F9FA8] bg-white border-2 border-[#7F9FA8] rounded-lg hover:bg-[#7F9FA8]/10 transition-all"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => {
                                    if (editedMeal) {
                                      onEditRecipe(section.key as MealType, code, editedMeal);
                                    }
                                    setEditingRecipe(null);
                                    setEditedMeal(null);
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#21C8E7] border-2 border-[#21C8E7] rounded-lg hover:bg-[#1e9bc8] hover:border-[#1e9bc8] transition-all shadow-md hover:shadow-lg"
                                >
                                  <SaveIcon /> Save
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingRecipe({ mealType: section.key as MealType, code });
                                    setEditedMeal({ ...meal });
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#21C8E7] bg-white border-2 border-[#21C8E7] rounded-lg hover:bg-[#21C8E7] hover:text-white transition-all shadow-md hover:shadow-lg"
                                >
                                  <EditIcon /> Edit
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Delete "${meal.name}"?`)) {
                                      onDeleteRecipe(section.key as MealType, code);
                                    }
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#ffc697] border-2 border-[#ffc697] rounded-lg hover:bg-[#ffb577] hover:border-[#ffb577] transition-all shadow-md hover:shadow-lg"
                                >
                                  <TrashIcon /> Delete
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

const SaveIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M2 8l4 4 8-8"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M8 4v8M4 8h8"/>
  </svg>
);

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M2 4h10M5 4V2h4v2M6 6v5M8 6v5M3 4l1 8h6l1-8"/>
  </svg>
);
