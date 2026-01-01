/**
 * Methodology panel - explains diet goals and targets
 */
import React from 'react';
import { CheckIcon, XIcon } from './MealIcons';

export type DietGoal = {
  min?: number;
  max: number;
  label: string;
  unit: string;
};

interface MethodologyPanelProps {
  goals: Record<string, DietGoal>;
  onChange?: (next: Record<string, DietGoal>) => void;
  onReset?: () => void;
  onClose: () => void;
}

export const MethodologyPanel = ({
  goals,
  onChange,
  onReset,
  onClose,
}: MethodologyPanelProps) => {
  const entries = Object.entries(goals);

  const updateGoal = (key: string, field: 'min' | 'max', value: string) => {
    if (!onChange) return;
    const nextValue = value === '' ? undefined : Number(value);
    if (nextValue !== undefined && Number.isNaN(nextValue)) return;
    const current = goals[key];
    if (!current) return;
    onChange({
      ...goals,
      [key]: {
        ...current,
        [field]: nextValue,
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 bg-[#2E5E67]/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden bg-white rounded-2xl border-2 border-[#66D3E7] shadow-2xl my-4">
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-gradient-to-r from-white to-[#66D3E7]/10 border-b-2 border-[#66D3E7]">
          <h2 className="text-xl font-bold text-[#2E5E67]">Methodology</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#21C8E7]/10 text-[#7F9FA8] hover:text-[#21C8E7] transition-colors"
          >
            <XIcon />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-88px)] space-y-6 text-sm text-[#2E5E67] leading-relaxed">
          <section>
            <h3 className="text-[#21C8E7] font-bold mb-2 text-base">Core Goals</h3>
            <ul className="space-y-1.5">
              <li className="flex items-start gap-2">
                <CheckIcon /> Increasing fiber and fermenteds, and reducing sugar, to improve digestion and appetite, and systematically reduce inflammation
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon /> Increasing food sources of omegas and seaweed to improve mineral profile and enhance winter mood
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon /> Measuring protein and calorie intake for calibration
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon /> Leaving caloric room for additional meals and snacks that are more vibe based
              </li>
            </ul>
          </section>
          <section>
            <h3 className="text-[#21C8E7] font-bold mb-2 text-base">Targets</h3>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-[#7F9FA8]">
                Update targets to match your personal goals.
              </p>
              {onReset && (
                <button
                  onClick={onReset}
                  className="text-xs px-3 py-1.5 rounded-lg border-2 border-[#66D3E7] text-[#2E5E67] font-medium hover:bg-[#66D3E7]/10 transition-colors shadow-sm"
                >
                  Reset to defaults
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {entries.map(([key, goal]) => (
                <div
                  key={key}
                  className="rounded-xl border-2 border-[#66D3E7]/50 p-3 bg-gradient-to-br from-white to-[#66D3E7]/5 shadow-md"
                >
                  <p className="text-xs uppercase text-[#7F9FA8] font-semibold">
                    {goal.label}
                  </p>
                  {onChange ? (
                    <div className="mt-2 flex items-end gap-2">
                      <label className="flex-1">
                        <span className="block text-[11px] text-[#7F9FA8] mb-1">Min</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={goal.min ?? ''}
                          onChange={(e) => updateGoal(key, 'min', e.target.value)}
                          className="w-full rounded-lg border-2 border-[#66D3E7]/50 px-2 py-1 text-sm text-[#2E5E67] focus:border-[#21C8E7] focus:outline-none"
                        />
                      </label>
                      <label className="flex-1">
                        <span className="block text-[11px] text-[#7F9FA8] mb-1">Max</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={goal.max}
                          onChange={(e) => updateGoal(key, 'max', e.target.value)}
                          className="w-full rounded-lg border-2 border-[#66D3E7]/50 px-2 py-1 text-sm text-[#2E5E67] focus:border-[#21C8E7] focus:outline-none"
                        />
                      </label>
                      <span className="pb-1 text-sm text-[#2E5E67] font-medium whitespace-nowrap">
                        {goal.unit}
                      </span>
                    </div>
                  ) : (
                    <p className="text-lg font-bold text-[#2E5E67] mt-2">
                      {goal.min ?? ''}-{goal.max} {goal.unit}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
          <section>
            <h3 className="text-[#21C8E7] font-bold mb-2 text-base">Underlying Science</h3>
            <ul className="list-disc pl-5 space-y-1 text-[#2E5E67]">
              <li>
                <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC9040132" className="text-[#21C8E7] hover:text-[#66D3E7] font-medium hover:underline" target="_blank" rel="noreferrer">
                  Gut microbiota modulation in metabolic health (PMC9040132)
                </a>
              </li>
              <li>
                <a href="https://onlinelibrary.wiley.com/doi/10.1111/jgh.16619" className="text-[#21C8E7] hover:text-[#66D3E7] font-medium hover:underline" target="_blank" rel="noreferrer">
                  Nutritional interventions for liver-gut axis (JGH.16619)
                </a>
              </li>
              <li>
                <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC9268559" className="text-[#21C8E7] hover:text-[#66D3E7] font-medium hover:underline" target="_blank" rel="noreferrer">
                  Dietary fiber's role in inflammation control (PMC9268559)
                </a>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};
