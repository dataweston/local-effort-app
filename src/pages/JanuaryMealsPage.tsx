import { useEffect, useMemo, useState } from 'react';
import { DayDetail } from '../components/january/DayDetail';
import { useMealPlanState } from '../mealPlan/useMealPlanState';
import type { Meal, EffectiveDay, MealType } from '../mealPlan/types';
import {
  buildDailyNutrition,
  buildExcelXml,
  buildNutritionCsv,
} from '../mealPlan/export';

type EditScope = 'anon' | 'user' | 'global';

type DietGoal = {
  min?: number;
  max: number;
  label: string;
  unit: string;
};

const DEFAULT_DIET_GOALS: Record<string, DietGoal> = {
  calories: { min: 1500, max: 1800, label: 'Calories', unit: 'kcal' },
  protein: { min: 90, max: 120, label: 'Protein', unit: 'g' },
  carbs: { min: 120, max: 200, label: 'Carbs', unit: 'g' },
  fat: { min: 60, max: 70, label: 'Fat', unit: 'g' },
  fiber: { min: 35, max: 45, label: 'Fiber', unit: 'g' },
  omega3: { min: 2, max: 4, label: 'Omega-3', unit: 'g' },
};

const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks'];

const planKey = 'january';

export default function JanuaryMealsPage() {
  const {
    effectiveDays,
    mergedOverrides,
    isSignedIn,
    isAdmin,
    updateAnon,
    updateUserDraft,
    updateGlobalDraft,
    deleteAnon,
    deleteUserDraft,
    deleteGlobalDraft,
    saveUser,
    saveGlobal,
    resetAnon,
    resetUserToGlobal,
    savingGlobal,
    savingUser,
  } = useMealPlanState(planKey);

  const [currentWeek, setCurrentWeek] = useState(1);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showMethodology, setShowMethodology] = useState(false);
  const [editScope, setEditScope] = useState<EditScope>('anon');

  useEffect(() => {
    if (isAdmin) {
      setEditScope('global');
    } else if (isSignedIn) {
      setEditScope('user');
    } else {
      setEditScope('anon');
    }
  }, [isAdmin, isSignedIn]);

  const dailyNutrition = useMemo(
    () => buildDailyNutrition(effectiveDays),
    [effectiveDays]
  );

  const selectedDayData = useMemo(
    () =>
      selectedDay
        ? effectiveDays.find((entry) => entry.plan.day === selectedDay) || null
        : null,
    [selectedDay, effectiveDays]
  );

  const weekDays = useMemo(() => {
    const start = (currentWeek - 1) * 7;
    return effectiveDays.slice(start, start + 7);
  }, [currentWeek, effectiveDays]);

  const editHandlers = {
    anon: { update: updateAnon, remove: deleteAnon },
    user: { update: updateUserDraft, remove: deleteUserDraft },
    global: { update: updateGlobalDraft, remove: deleteGlobalDraft },
  } as const;

  const handleMealUpdate = (dayKey: string, mealKey: string, meal: Meal) => {
    const handler = editHandlers[editScope];
    handler?.update(dayKey, mealKey, meal);
  };

  const handleMealDelete = (dayKey: string, mealKey: string) => {
    const handler = editHandlers[editScope];
    handler?.remove(dayKey, mealKey);
  };

  const handleExportCsv = () => {
    const csv = buildNutritionCsv(dailyNutrition);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'january-meal-plan.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    const xml = buildExcelXml(dailyNutrition, effectiveDays);
    const blob = new Blob([xml], {
      type: 'application/vnd.ms-excel',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'january-meal-plan.xls');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const saveLabel =
    editScope === 'global'
      ? savingGlobal === 'saving'
        ? 'Saving Global...'
        : 'Save Global Plan'
      : savingUser === 'saving'
      ? 'Saving Plan...'
      : 'Save My Plan';

  const canSave =
    (isAdmin && editScope === 'global') ||
    (isSignedIn && editScope === 'user');

  const overrideDays = useMemo(() => Object.keys(mergedOverrides || {}), [mergedOverrides]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f172a] via-[#0f172a] to-[#111827] text-white">
      <div className="max-w-6xl mx-auto px-4 py-12 space-y-10">
        <header className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#9AA6B2] mb-2">
                January Meal Blueprint
              </p>
              <h1 className="text-3xl sm:text-4xl font-semibold">
                The Local Effort January reset
              </h1>
              <p className="text-slate-300 mt-2 max-w-2xl">
                Built around wild-caught fish, fermented foods, and structured
                micronutrient targets to restore metabolic flexibility in 30
                days.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 hover:border-white/40"
              >
                <DownloadIcon /> CSV
              </button>
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 hover:border-white/40"
              >
                <SheetsIcon /> Sheets
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-200">
            {isAdmin && (
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1">
                <span>Edit Scope:</span>
                <span className="inline-flex overflow-hidden rounded-full border border-white/20">
                  <button
                    onClick={() => setEditScope('global')}
                    className={`px-3 py-1 ${
                      editScope === 'global' ? 'bg-white/30' : ''
                    }`}
                  >
                    Global
                  </button>
                  <button
                    onClick={() => setEditScope('user')}
                    className={`px-3 py-1 ${
                      editScope === 'user' ? 'bg-white/30' : ''
                    }`}
                  >
                    My Plan
                  </button>
                </span>
              </div>
            )}

            {!isSignedIn && (
              <span className="px-3 py-1 rounded-full bg-white/10 text-xs">
                Anonymous edits reset on refresh
              </span>
            )}

            {canSave && (
              <button
                onClick={editScope === 'global' ? saveGlobal : saveUser}
                className="ml-auto px-4 py-2 rounded-lg bg-[#BCCCDC] text-slate-900 font-medium"
              >
                {saveLabel}
              </button>
            )}

            {!isSignedIn && (
              <button
                onClick={resetAnon}
                className="px-3 py-1 rounded-full border border-white/20 text-xs"
              >
                Reset Draft
              </button>
            )}

            {isSignedIn && editScope === 'user' && (
              <button
                onClick={resetUserToGlobal}
                className="px-3 py-1 rounded-full border border-white/20 text-xs"
              >
                Reset to Global
              </button>
            )}
          </div>
        </header>

        <section className="bg-[#0B1120] rounded-3xl border border-white/10 p-6 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-lg font-semibold text-white/90">
              January calendar
            </h2>
            <WeekNav currentWeek={currentWeek} onWeekChange={setCurrentWeek} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {weekDays.map((day) => (
              <CalendarDay
                key={day.plan.day}
                day={day}
                nutrition={
                  dailyNutrition.find((entry) => entry.day === day.plan.day) ||
                  null
                }
                hasCustomization={overrideDays.includes(day.dayKey)}
                onClick={() => setSelectedDay(day.plan.day)}
              />
            ))}
          </div>
        </section>

        <section className="bg-[#0B1120] rounded-3xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white/90">
              Why this works
            </h2>
            <button
              onClick={() => setShowMethodology(true)}
              className="flex items-center gap-2 text-sm text-[#9AA6B2] hover:text-white"
            >
              Learn more <ChevronRight />
            </button>
          </div>
          <p className="text-slate-300 text-sm">
            Layered omega-3s, fermented foods, and weekly cycling built to
            detoxify, rebuild, and stabilize mood. Click to see the underlying
            research and nutritional scaffolding.
          </p>
        </section>
      </div>

      {showMethodology && (
        <MethodologyPanel
          goals={DEFAULT_DIET_GOALS}
          onClose={() => setShowMethodology(false)}
        />
      )}

      {selectedDayData && (
        <DayDetail
          day={selectedDayData}
          goals={DEFAULT_DIET_GOALS}
          canEdit={editScope !== 'anon' || !isSignedIn}
          onUpdateMeal={handleMealUpdate}
          onDeleteMeal={handleMealDelete}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  );
}

const WeekNav = ({
  currentWeek,
  onWeekChange,
}: {
  currentWeek: number;
  onWeekChange: (week: number) => void;
}) => (
  <div className="flex items-center gap-3">
    <button
      onClick={() => onWeekChange(Math.max(1, currentWeek - 1))}
      disabled={currentWeek === 1}
      className="p-2 rounded-lg bg-white/10 disabled:opacity-30"
    >
      <ChevronLeft />
    </button>
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((week) => (
        <button
          key={week}
          onClick={() => onWeekChange(week)}
          className={`w-8 h-8 rounded-lg text-sm font-medium ${
            currentWeek === week ? 'bg-white/70 text-slate-900' : 'bg-white/10'
          }`}
        >
          {week}
        </button>
      ))}
    </div>
    <button
      onClick={() => onWeekChange(Math.min(5, currentWeek + 1))}
      disabled={currentWeek === 5}
      className="p-2 rounded-lg bg-white/10 disabled:opacity-30"
    >
      <ChevronRight />
    </button>
  </div>
);

const CalendarDay = ({
  day,
  nutrition,
  hasCustomization,
  onClick,
}: {
  day: EffectiveDay;
  nutrition: { calories: number; protein: number } | null;
  hasCustomization: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="group relative aspect-square p-3 rounded-2xl border border-white/10 bg-white/5 hover:border-white/40 transition-all"
  >
    {hasCustomization && (
      <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#BCCCDC]" />
    )}
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2 text-xs text-slate-300">
        <span>Day</span>
        <span className="text-lg font-semibold text-white">
          {day.plan.day}
        </span>
      </div>
      <div
        className="flex-1 flex items-center justify-center rounded-xl bg-white/10"
        style={{ borderColor: day.meals.dinner.meal.color || '#94a3b8' }}
      >
        <span className="text-xs font-medium text-white/90 px-2 text-center">
          {day.meals.dinner.meal.name}
        </span>
      </div>
      {nutrition && (
        <div className="mt-2 text-left text-xs text-slate-300">
          <p>{Math.round(nutrition.calories)} kcal</p>
          <p>{Math.round(nutrition.protein)}g Protein</p>
        </div>
      )}
    </div>
  </button>
);

const MethodologyPanel = ({
  goals,
  onClose,
}: {
  goals: Record<string, DietGoal>;
  onClose: () => void;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
    <div className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden bg-slate-50 rounded-2xl border border-[#9AA6B2] text-slate-900">
      <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-slate-50 border-b border-[#9AA6B2]">
        <h2 className="text-xl font-semibold text-slate-900">Methodology</h2>
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
              <CheckIcon /> Rebuild and restore gut health
            </li>
            <li className="flex items-start gap-2">
              <CheckIcon /> Reset baseline nutritional needs
            </li>
            <li className="flex items-start gap-2">
              <CheckIcon /> Elevate mitochondria with weekly seafood rotation
            </li>
          </ul>
        </section>
        <section>
          <h3 className="text-[#9AA6B2] font-medium mb-2">Targets</h3>
          <div className="grid grid-cols-2 gap-3">
            {Object.values(goals).map((goal) => (
              <div
                key={goal.label}
                className="rounded-xl border border-[#9AA6B2]/40 p-3 bg-white"
              >
                <p className="text-xs uppercase text-slate-500">
                  {goal.label}
                </p>
                <p className="text-lg font-semibold text-slate-900">
                  {goal.min ?? ''}-{goal.max} {goal.unit}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  </div>
);

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M8 3v7m0 0l3-3M8 10L5 7M3 13h10"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SheetsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M3 4.5A1.5 1.5 0 014.5 3H13v10H4.5A1.5 1.5 0 013 11.5V4.5z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M8 3v10" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const ChevronLeft = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 4l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronRight = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8 4l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[#9AA6B2]">
    <path
      d="M3 8l3 3 7-7"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const XIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4l10 10M14 4L4 14" strokeLinecap="round" />
  </svg>
);
