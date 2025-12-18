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
};

export const TargetsPanel = ({ isOpen, onClose, goals }: Props) => {
  if (!isOpen) return null;

  const entries = Object.values(goals);

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
            <div className="grid grid-cols-2 gap-3">
              {entries.map((goal) => (
                <div
                  key={goal.label}
                  className="rounded-xl border border-[#9AA6B2]/40 p-3 bg-white"
                >
                  <p className="text-xs uppercase text-slate-500">
                    {goal.label}
                  </p>
                  <p className="text-lg font-semibold text-slate-900">
                    {goal.min ?? ''}–{goal.max} {goal.unit}
                  </p>
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
