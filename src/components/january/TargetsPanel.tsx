import React from 'react';

type Goal = {
  min?: number;
  max: number;
  label: string;
  unit: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  goals: Record<string, Goal>;
  onChange?: (next: Record<string, Goal>) => void;
  onReset?: () => void;
};

export const TargetsPanel = ({
  isOpen,
  onClose,
  goals,
  onChange,
  onReset,
}: Props) => {
  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden bg-slate-50 rounded-2xl border border-[#9AA6B2]">
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-slate-50 border-b border-[#9AA6B2]">
          <h2 className="text-xl font-semibold text-slate-900">
            Nutrition Targets
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#BCCCDC] text-slate-600 hover:text-slate-900"
          >
            <XIcon />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-88px)] space-y-6 text-sm text-slate-700 leading-relaxed">
          <section>
            <h3 className="text-[#9AA6B2] font-medium mb-2">Core Goals</h3>
            <ul className="space-y-1.5">
              <li className="flex items-start gap-2">
                <CheckIcon /> Balance blood sugar with protein-forward meals.
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon /> Hit fiber and omega-3 benchmarks daily.
              </li>
              <li className="flex items-start gap-2">
                <CheckIcon /> Layer fermented foods + mineral diversity.
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-[#9AA6B2] font-medium mb-2">Daily Targets</h3>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-500">
                Update targets to match your personal goals.
              </p>
              {onReset && (
                <button
                  onClick={onReset}
                  className="text-xs px-3 py-1 rounded-lg border border-[#9AA6B2]/50 text-slate-700 hover:bg-[#BCCCDC]/50"
                >
                  Reset to defaults
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {entries.map(([key, goal]) => (
                <div
                  key={key}
                  className="rounded-xl border border-[#9AA6B2]/40 p-3 bg-white"
                >
                  <p className="text-xs uppercase text-slate-500">
                    {goal.label}
                  </p>
                  <div className="mt-2 flex items-end gap-2">
                    <label className="flex-1">
                      <span className="block text-[11px] text-slate-500">Min</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={goal.min ?? ''}
                        onChange={(e) => updateGoal(key, 'min', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-[#9AA6B2]/40 px-2 py-1 text-sm"
                        disabled={!onChange}
                      />
                    </label>
                    <label className="flex-1">
                      <span className="block text-[11px] text-slate-500">Max</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={goal.max}
                        onChange={(e) => updateGoal(key, 'max', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-[#9AA6B2]/40 px-2 py-1 text-sm"
                        disabled={!onChange}
                      />
                    </label>
                    <span className="pb-1 text-sm text-slate-600 whitespace-nowrap">
                      {goal.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M3 8l3 3 7-7"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

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
