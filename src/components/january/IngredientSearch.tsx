import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Ingredient } from '../../mealPlan/types';
import { searchFoods, getFoodDetails } from '../../usda/usdaClient';
import { scaleNutrients } from '../../nutrition/calc';

type Props = {
  onSelect: (ingredient: Ingredient) => void;
  onClose: () => void;
};

type SearchResult = {
  fdcId: number;
  description: string;
  brandOwner?: string | null;
};

export const IngredientSearch = ({ onSelect, onClose }: Props) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [selectedFdcId, setSelectedFdcId] = useState<number | null>(null);
  const [selectedFood, setSelectedFood] = useState<
    Awaited<ReturnType<typeof getFoodDetails>> | null
  >(null);
  const [loadingFood, setLoadingFood] = useState(false);
  const [amount, setAmount] = useState(100);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoadingResults(true);
      const foods = await searchFoods(query);
      setResults(foods);
      setLoadingResults(false);
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSelectResult = async (result: SearchResult) => {
    setSelectedFdcId(result.fdcId);
    setLoadingFood(true);
    const details = await getFoodDetails(result.fdcId);
    setSelectedFood(details);
    setAmount(details?.portions?.[0]?.gramWeight || 100);
    setLoadingFood(false);
  };

  const previewNutrients = useMemo(() => {
    if (!selectedFood) return null;
    return scaleNutrients(selectedFood.nutrientsPer100g, amount);
  }, [selectedFood, amount]);

  const handleConfirm = () => {
    if (!selectedFood) return;
    const ingredient: Ingredient = {
      name: selectedFood.description,
      fdcId: selectedFood.fdcId,
      amount,
      unit: 'g',
      nutrientsPer100g: selectedFood.nutrientsPer100g,
    };
    onSelect(ingredient);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#D9EAFD] rounded-xl border border-[#9AA6B2] overflow-hidden">
        <div className="p-4 border-b border-[#9AA6B2]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-slate-900">Search Ingredient</h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-[#BCCCDC] text-slate-600"
            >
              <XIcon />
            </button>
          </div>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search USDA database..."
              className="w-full pl-9 pr-4 py-2.5 bg-[#BCCCDC] border border-[#9AA6B2] rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:border-[#9AA6B2]"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
              <SearchIcon />
            </div>
            {(loadingResults || loadingFood) && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9AA6B2]">
                <LoaderIcon />
              </div>
            )}
          </div>
          <p className="mt-2 text-[10px] text-slate-500">
            Data from USDA FoodData Central
          </p>
        </div>

        {selectedFood ? (
          <div className="p-4">
            <div className="p-3 bg-[#BCCCDC] rounded-lg mb-4">
              <p className="font-medium text-slate-900 text-sm">
                {selectedFood.description}
              </p>
              {previewNutrients && (
                <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
                  <PreviewCell label="kcal" value={previewNutrients.calories} />
                  <PreviewCell
                    label="protein"
                    value={previewNutrients.protein}
                    tone="text-blue-400"
                  />
                  <PreviewCell
                    label="carbs"
                    value={previewNutrients.carbs}
                    tone="text-green-400"
                  />
                  <PreviewCell
                    label="fat"
                    value={previewNutrients.fat}
                    tone="text-rose-400"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 mb-4">
              <label className="text-sm text-slate-600">Amount:</label>
              <input
                type="number"
                value={amount}
                min={1}
                onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 0))}
                className="w-24 px-3 py-2 bg-[#BCCCDC] border border-[#9AA6B2] rounded-lg text-slate-900 text-center focus:outline-none focus:border-[#9AA6B2]"
              />
              <span className="text-sm text-slate-500">grams</span>
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setSelectedFood(null);
                  setSelectedFdcId(null);
                }}
                className="text-sm text-slate-600 hover:text-slate-900"
              >
                Back to results
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-[#9AA6B2] rounded-lg"
              >
                Add Ingredient
              </button>
            </div>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {results.length === 0 && !loadingResults ? (
              <p className="p-4 text-center text-sm text-slate-500">
                {query.length < 2
                  ? 'Type at least 2 characters to search.'
                  : 'No USDA results yet.'}
              </p>
            ) : (
              results.map((result) => (
                <button
                  key={result.fdcId}
                  onClick={() => handleSelectResult(result)}
                  disabled={loadingFood && selectedFdcId === result.fdcId}
                  className="w-full text-left px-4 py-3 border-t border-[#9AA6B2]/40 hover:bg-[#BCCCDC]/40 disabled:opacity-50"
                >
                  <p className="text-sm font-medium text-slate-900">
                    {result.description}
                  </p>
                  {result.brandOwner && (
                    <p className="text-xs text-slate-500">
                      {result.brandOwner}
                    </p>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const PreviewCell = ({
  label,
  value,
  tone = 'text-[#9AA6B2]',
}: {
  label: string;
  value: number;
  tone?: string;
}) => (
  <div className="text-center p-2 bg-[#D9EAFD] rounded">
    <p className={`${tone} font-medium`}>{Math.round(value * 10) / 10}</p>
    <p className="text-slate-500">{label}</p>
  </div>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M11 11l4 4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <circle
      cx="7"
      cy="7"
      r="5"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
    />
  </svg>
);

const LoaderIcon = () => (
  <svg
    className="animate-spin"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8v4l3-3-3-3v4a12 12 0 00-12 12h4z"
    />
  </svg>
);

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M4 4l8 8M12 4L4 12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);
