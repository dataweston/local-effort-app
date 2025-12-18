import React, { useEffect, useMemo, useState } from 'react';
import { DayDetail } from '../components/january/DayDetail';
import { IngredientSearch } from '../components/january/IngredientSearch';
import { AuthButton } from '../components/january/AuthButton';
import { RecipesPanel } from '../components/january/RecipesPanel';
import { TargetsPanel } from '../components/january/TargetsPanel';
import { useMealPlanState } from '../mealPlan/useMealPlanState';
import type { Meal, EffectiveDay, MealType, Ingredient } from '../mealPlan/types';
import {
  buildDailyNutrition,
  buildExcelXml,
  buildNutritionCsv,
  type DailyNutritionEntry,
} from '../mealPlan/export';
import { BASE_MEALS } from '../mealPlan/baseMeals';
import { scaleNutrients } from '../nutrition/calc';
import { supabase } from '../lib/supabaseClient';

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
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function JanuaryMealsPage() {
  const {
    user,
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
  const [showTargets, setShowTargets] = useState(false);
  const [showRecipes, setShowRecipes] = useState(false);
  const [showIngredientLookup, setShowIngredientLookup] = useState(false);
  const [lookupIngredient, setLookupIngredient] = useState<Ingredient | null>(null);
  const [editScope, setEditScope] = useState<EditScope>('anon');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error' | null>(null);

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

  const nutritionByDay = useMemo(() => {
    const map = new Map<number, DailyNutritionEntry>();
    dailyNutrition.forEach((entry) => map.set(entry.day, entry));
    return map;
  }, [dailyNutrition]);

  const weekDays = useMemo(() => {
    const start = (currentWeek - 1) * 7;
    return effectiveDays.slice(start, start + 7);
  }, [currentWeek, effectiveDays]);

  const selectedDayData = useMemo(
    () =>
      selectedDay
        ? effectiveDays.find((entry) => entry.plan.day === selectedDay) || null
        : null,
    [selectedDay, effectiveDays]
  );

  const weekNutrition = useMemo(
    () =>
      weekDays
        .map((day) => nutritionByDay.get(day.plan.day))
        .filter((entry): entry is DailyNutritionEntry => Boolean(entry)),
    [weekDays, nutritionByDay]
  );

  const weekAverages = useMemo(() => {
    if (!weekNutrition.length) {
      return { calories: 0, protein: 0, fiber: 0, fat: 0, carbs: 0 };
    }
    const totals = weekNutrition.reduce(
      (acc, entry) => {
        acc.calories += entry.calories;
        acc.protein += entry.protein;
        acc.fiber += entry.fiber;
        acc.fat += entry.fat;
        acc.carbs += entry.carbs;
        return acc;
      },
      { calories: 0, protein: 0, fiber: 0, fat: 0, carbs: 0 }
    );
    return {
      calories: Math.round(totals.calories / weekNutrition.length),
      protein: Math.round(totals.protein / weekNutrition.length),
      fiber: Math.round(totals.fiber / weekNutrition.length),
      fat: Math.round(totals.fat / weekNutrition.length),
      carbs: Math.round(totals.carbs / weekNutrition.length),
    };
  }, [weekNutrition]);

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

  const handleSignIn = async () => {
    if (!supabase) return;
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    try {
      await supabase.auth.signOut({ scope: 'global' });
      window.location.reload();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
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

  const handleSavePlan = async () => {
    if (!canSave) return;
    setSaveStatus('saving');
    const success =
      editScope === 'global' ? await saveGlobal() : await saveUser();
    setSaveStatus(success ? 'success' : 'error');
    setTimeout(() => setSaveStatus(null), 2500);
  };

  const overrideDays = useMemo(() => Object.keys(mergedOverrides || {}), [mergedOverrides]);
  const lastLookupStats = useMemo(() => {
    if (!lookupIngredient) return null;
    return scaleNutrients(
      lookupIngredient.nutrientsPer100g,
      lookupIngredient.amount
    );
  }, [lookupIngredient]);
  const quickActions = [
    {
      label: 'Methodology',
      icon: <InfoIcon />,
      action: () => setShowMethodology(true),
    },
    {
      label: 'Targets',
      icon: <TargetIcon />,
      action: () => setShowTargets(true),
    },
    {
      label: 'View recipes',
      icon: <BookIcon />,
      action: () => setShowRecipes(true),
    },
    {
      label: 'USDA lookup',
      icon: <SearchIcon />,
      action: () => setShowIngredientLookup(true),
    },
    { label: 'Open in Sheets', icon: <SheetsIcon />, action: handleExportExcel },
    { label: 'Export CSV', icon: <DownloadIcon />, action: handleExportCsv },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f172a] via-[#0f172a] to-[#111827] text-white">
      <div className="max-w-6xl mx-auto px-4 py-12 space-y-10">
        <header className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
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
            <div className="flex flex-wrap items-center gap-3">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={action.action}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-200 rounded-lg border border-white/10 hover:border-white/30 hover:bg-white/5 transition-colors"
                >
                  {action.icon} {action.label}
                </button>
              ))}
              {saveStatus && (
                <span
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full ${
                    saveStatus === 'saving'
                      ? 'text-[#9AA6B2] bg-[#BCCCDC]/30'
                      : saveStatus === 'success'
                      ? 'text-green-300 bg-green-500/10'
                      : 'text-red-300 bg-red-500/10'
                  }`}
                >
                  {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'success' ? 'Saved' : 'Error'}
                </span>
              )}
              <AuthButton
                user={user}
                onSignIn={handleSignIn}
                onSignOut={handleSignOut}
              />
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
                onClick={handleSavePlan}
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
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#9AA6B2]">
                Week {currentWeek} averages
              </p>
              <div className="flex items-center gap-6 mt-3 text-sm">
                <SummaryStat label="Calories" value={`${weekAverages.calories} kcal`} tone="text-[#9AA6B2]" />
                <SummaryStat label="Protein" value={`${weekAverages.protein} g`} tone="text-blue-300" />
                <SummaryStat label="Fiber" value={`${weekAverages.fiber} g`} tone="text-purple-300" />
              </div>
            </div>
            <WeekNav currentWeek={currentWeek} onWeekChange={setCurrentWeek} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {['calories', 'protein', 'carbs', 'fat', 'fiber'].map((key) => {
              const goal = DEFAULT_DIET_GOALS[key];
              const value = weekAverages[key as keyof typeof weekAverages];
              const percent = goal ? Math.min((value / goal.max) * 100, 100) : 0;
              return (
                <div key={key} className="p-3 rounded-xl border border-white/10 bg-white/5">
                  <p className="text-xs uppercase text-slate-300 flex items-center justify-between">
                    <span>{goal?.label || key}</span>
                    <span>{value} {goal?.unit || ''}</span>
                  </p>
                  <div className="h-2 mt-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#9AA6B2] to-white"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {lookupIngredient && lastLookupStats && (
            <div className="p-4 rounded-xl border border-white/10 bg-white/5 text-sm text-slate-200">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Last USDA lookup
                  </p>
                  <p className="text-base font-semibold text-white">
                    {lookupIngredient.name}
                  </p>
                </div>
                <button
                  className="text-xs text-slate-400 hover:text-white"
                  onClick={() => setShowIngredientLookup(true)}
                >
                  Search again
                </button>
              </div>
              <div className="flex flex-wrap gap-4 text-xs">
                <span>{Math.round(lastLookupStats.calories)} kcal</span>
                <span>{Math.round(lastLookupStats.protein)}g protein</span>
                <span>{Math.round(lastLookupStats.fat)}g fat</span>
                <span>{Math.round(lastLookupStats.carbs)}g carbs</span>
              </div>
            </div>
          )}
        </section>

        <section className="bg-[#0B1120] rounded-3xl border border-white/10 p-6 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-lg font-semibold text-white/90">
              January calendar
            </h2>
            <p className="text-xs text-slate-400">
              Click any day to edit meals and view detailed nutrition.
            </p>
          </div>

          <div className="hidden lg:grid grid-cols-7 gap-3 text-xs text-slate-400">
            {DAY_NAMES.map((name) => (
              <div key={name} className="text-center uppercase tracking-wide">
                {name}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {weekDays.map((day) => (
              <CalendarDay
                key={day.plan.day}
                day={day}
                weekdayLabel={DAY_NAMES[(day.plan.day - 1) % DAY_NAMES.length]}
                nutrition={nutritionByDay.get(day.plan.day) || null}
                hasCustomization={overrideDays.includes(day.dayKey)}
                onClick={() => setSelectedDay(day.plan.day)}
              />
            ))}
          </div>

          <div className="mt-2 p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-xs uppercase tracking-wider text-slate-400 mb-3">
              Dinner Rotation
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(BASE_MEALS.dinner || {}).map(([code, info]) => (
                <span
                  key={code}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{
                    backgroundColor: `${info.color || '#94a3b8'}20`,
                    color: info.color || '#e2e8f0',
                  }}
                >
                  {info.name}
                </span>
              ))}
            </div>
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

      <RecipesPanel
        isOpen={showRecipes}
        onClose={() => setShowRecipes(false)}
        mealLibrary={BASE_MEALS}
      />

      <TargetsPanel
        isOpen={showTargets}
        onClose={() => setShowTargets(false)}
        goals={DEFAULT_DIET_GOALS}
      />

      {showIngredientLookup && (
        <IngredientSearch
          onSelect={(ingredient) => {
            setLookupIngredient(ingredient);
            setShowIngredientLookup(false);
          }}
          onClose={() => setShowIngredientLookup(false)}
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
  weekdayLabel,
  nutrition,
  hasCustomization,
  onClick,
}: {
  day: EffectiveDay;
  weekdayLabel?: string;
  nutrition: DailyNutritionEntry | null;
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
        <span>{weekdayLabel || 'Day'}</span>
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
        <div className="mt-2 text-left text-xs text-slate-300 space-y-0.5">
          <p>{Math.round(nutrition.calories)} kcal</p>
          <p>{Math.round(nutrition.protein)}g protein</p>
          <p>{Math.round(nutrition.fiber)}g fiber</p>
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

const SummaryStat = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) => (
  <div>
    <p className="text-[10px] uppercase tracking-wider text-slate-500">
      {label}
    </p>
    <p className={`text-lg font-semibold ${tone}`}>{value}</p>
  </div>
);

const InfoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
    <path d="M8 11V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M8 5h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const TargetIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
    <path d="M8 2v2M8 12v2M2 8h2M12 8h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const BookIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M3 4.5A1.5 1.5 0 014.5 3H13v10H4.5A1.5 1.5 0 013 11.5V4.5z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M8 3v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M11 11l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
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
