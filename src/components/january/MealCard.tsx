import React, { useEffect, useMemo, useState } from 'react';
import type { Meal } from '../../mealPlan/types';
import { sumMeal, scaleNutrients } from '../../nutrition/calc';
import { IngredientSearch } from './IngredientSearch';

type Props = {
  title: string;
  meal: Meal;
  canEdit: boolean;
  onUpdate: (meal: Meal) => void;
  onDelete: () => void;
};

export const MealCard = ({
  title,
  meal,
  onUpdate,
  onDelete,
  canEdit,
}: Props) => {
  const [localMeal, setLocalMeal] = useState<Meal>(meal);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    setLocalMeal(meal);
  }, [meal]);

  const totals = useMemo(() => sumMeal(localMeal), [localMeal]);

  const handleAmountChange = (index: number, nextAmount: number) => {
    setLocalMeal((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((ingredient, idx) =>
        idx === index ? { ...ingredient, amount: nextAmount } : ingredient
      ),
    }));
  };

  const handleRemoveIngredient = (index: number) => {
    setLocalMeal((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, idx) => idx !== index),
    }));
  };

  const handleAddIngredient = (ingredient: Meal['ingredients'][number]) => {
    setLocalMeal((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, ingredient],
    }));
    setShowSearch(false);
  };

  const handleSave = () => {
    onUpdate(localMeal);
    setEditing(false);
  };

  const handleCancel = () => {
    setLocalMeal(meal);
    setEditing(false);
  };

  return (
    <>
      <div className="bg-[#D9EAFD] rounded-xl border border-[#9AA6B2]/50 overflow-hidden">
        <button
          type="button"
          className="flex items-center justify-between w-full p-4 text-left hover:bg-[#BCCCDC]/60 transition-colors"
          onClick={() => setExpanded((prev) => !prev)}
        >
          <div>
            <h4 className="font-medium text-slate-800">{title}</h4>
            <p className="text-sm text-slate-600">{localMeal.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-800">
                {Math.round(totals.calories)} kcal
              </p>
              <p className="text-xs text-slate-500">
                {Math.round(totals.protein)}g protein
              </p>
            </div>
            <ChevronIcon expanded={expanded} />
          </div>
        </button>

        {expanded && (
          <div className="px-4 pb-4 border-t border-[#9AA6B2]/50">
            <div className="flex flex-wrap justify-between items-center py-3 gap-2">
              <div className="flex flex-wrap gap-2 text-xs">
                <MacroPill label="kcal" value={totals.calories} tone="text-slate-800" />
                <MacroPill label="P" value={totals.protein} tone="text-blue-500" />
                <MacroPill label="C" value={totals.carbs} tone="text-green-500" />
                <MacroPill label="F" value={totals.fat} tone="text-rose-500" />
                <MacroPill label="Fiber" value={totals.fiber} tone="text-purple-500" />
              </div>

              {canEdit && (
                <div className="flex gap-2">
                  {editing ? (
                    <>
                      <button
                        onClick={handleCancel}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-900 bg-[#BCCCDC] rounded-lg"
                      >
                        <SaveIcon /> Save
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-[#BCCCDC] rounded-lg"
                      >
                        <EditIcon /> Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete();
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 rounded-lg"
                      >
                        <TrashIcon /> Delete
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="divide-y divide-[#9AA6B2]/30">
              {localMeal.ingredients.map((ingredient, idx) => (
                <IngredientRow
                  key={`${ingredient.name}-${idx}`}
                  ingredient={ingredient}
                  isEditing={editing}
                  onAmountChange={(next) => handleAmountChange(idx, next)}
                  onRemove={() => handleRemoveIngredient(idx)}
                />
              ))}
            </div>

            {editing && (
              <button
                onClick={() => setShowSearch(true)}
                className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-[#9AA6B2] border border-dashed border-[#9AA6B2]/30 rounded-lg hover:bg-[#BCCCDC]/5"
              >
                <PlusIcon /> Add from USDA
              </button>
            )}
          </div>
        )}
      </div>

      {showSearch && (
        <IngredientSearch
          onSelect={handleAddIngredient}
          onClose={() => setShowSearch(false)}
        />
      )}
    </>
  );
};

const IngredientRow = ({
  ingredient,
  onAmountChange,
  onRemove,
  isEditing,
}: {
  ingredient: Meal['ingredients'][number];
  onAmountChange: (amount: number) => void;
  onRemove: () => void;
  isEditing: boolean;
}) => {
  const nutrients = scaleNutrients(ingredient.nutrientsPer100g, ingredient.amount);

  return (
    <div className="flex items-center justify-between py-2.5 text-sm">
      <div className="flex-1 min-w-0">
        <p className="text-slate-800 truncate">{ingredient.name}</p>
        <div className="flex gap-3 mt-0.5 text-[10px] text-slate-500">
          <span>{Math.round(nutrients.calories)} kcal</span>
          <span>{Math.round(nutrients.protein)}g P</span>
          <span>{Math.round(nutrients.carbs)}g C</span>
          <span>{Math.round(nutrients.fat)}g F</span>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-3">
        {isEditing ? (
          <>
            <input
              type="number"
              value={ingredient.amount}
              onChange={(e) => onAmountChange(Number(e.target.value) || 0)}
              className="w-16 px-2 py-1 text-sm text-right bg-[#BCCCDC] border border-[#9AA6B2] rounded text-slate-800"
            />
            <span className="text-xs text-slate-500 w-6 text-center">g</span>
            <button
              onClick={onRemove}
              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded"
            >
              <TrashIcon />
            </button>
          </>
        ) : (
          <>
            <span className="text-sm text-slate-700 font-medium">{ingredient.amount}</span>
            <span className="text-xs text-slate-500 w-6 text-center">
              {ingredient.displayUnit || ingredient.unit}
            </span>
          </>
        )}
      </div>
    </div>
  );
};

const MacroPill = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) => (
  <span className={`px-2 py-1 rounded bg-white/30 ${tone}`}>
    {Math.round(value)} {label}
  </span>
);

const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
  <svg
    className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M8 4l6 6-6 6" />
  </svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const SaveIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M13 5v8a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1h6l3 3z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path d="M10 2v3h3M6 9h4M6 12h4" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path
      d="M3 4h8M5 4V3h4v1m-.5 0v7H5.5V4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M8 3v10M3 8h10"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);
