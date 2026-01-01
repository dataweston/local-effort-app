/**
 * JanuaryMealsPage - 30-day meal planning calendar
 * 
 * Architecture:
 * - Recipes are stored in DB (meal_recipes table) and edited via RecipesPanel
 * - Calendar displays meals based on rotation schedule (DAILY_PLAN in baseMeals.ts)
 * - Users can customize meals with personal overrides (saved to meal_plan_user)
 * - Admins edit recipes directly in RecipesPanel (affects everyone)
 * 
 * Data Flow:
 * 1. useMealLibrary() loads recipes from DB → mealLibrary
 * 2. useMealPlanState() applies rotation + overrides → effectiveDays
 * 3. Calendar displays effectiveDays, modals edit individual meals
 */
import React, { useEffect, useMemo, useState } from 'react';
import { DayDetail } from '../components/january/DayDetail';
import { IngredientSearch } from '../components/january/IngredientSearch';
import { AuthButton } from '../components/january/AuthButton';
import { RecipesPanel } from '../components/january/RecipesPanel';
import {
  WeekNav,
  CalendarDay,
  SummaryStat,
  MethodologyPanel,
  InfoIcon,
  BookIcon,
  DownloadIcon,
  SheetsIcon,
  CalendarIcon,
  type DietGoal,
} from '../components/meals';
import { useMealPlanState } from '../mealPlan/useMealPlanState';
import { useMealLibrary } from '../mealPlan/useMealLibrary';
import { saveRecipe, deleteRecipe } from '../mealPlan/recipeStorage';
import type { Meal, EffectiveDay, MealType, Ingredient } from '../mealPlan/types';
import {
  buildDailyNutrition,
  buildExcelXml,
  buildNutritionCsv,
  type DailyNutritionEntry,
} from '../mealPlan/export';
import { scaleNutrients } from '../nutrition/calc';
import { createEmptyNutrients, NUTRIENT_KEYS } from '../nutrition/nutrients';
import { supabase } from '../lib/supabaseClient';

type EditScope = 'anon' | 'user';

const DEFAULT_DIET_GOALS: Record<string, DietGoal> = {
  calories: { min: 1500, max: 1800, label: 'Calories', unit: 'kcal' },
  protein: { min: 90, max: 120, label: 'Protein', unit: 'g' },
  carbs: { min: 120, max: 200, label: 'Carbs', unit: 'g' },
  fat: { min: 60, max: 70, label: 'Fat', unit: 'g' },
  fiber: { min: 35, max: 45, label: 'Fiber', unit: 'g' },
  epa_dha: { min: 2, max: 2, label: 'Omega-3 EPA + DHA', unit: 'g' },
};

const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks'];

const planKey = 'january';
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const GOALS_STORAGE_KEY = `${planKey}-meal-plan-goals`;

const loadDietGoals = (): Record<string, DietGoal> => {
  try {
    const raw = window.localStorage.getItem(GOALS_STORAGE_KEY);
    if (!raw) return DEFAULT_DIET_GOALS;
    const parsed = JSON.parse(raw) as Record<string, Partial<DietGoal>>;
    const merged: Record<string, DietGoal> = { ...DEFAULT_DIET_GOALS };

    Object.entries(parsed || {}).forEach(([key, value]) => {
      const base = merged[key];
      if (!base) return;
      merged[key] = {
        ...base,
        ...(value || {}),
        max: Number.isFinite(Number(value?.max)) ? Number(value?.max) : base.max,
        min:
          value?.min === undefined || value?.min === null
            ? base.min
            : Number(value?.min),
      };
    });

    // Back-compat: legacy stored an `omega3` goal; map it into EPA+DHA if present.
    const legacyOmega3 = (parsed as any)?.omega3;
    if (legacyOmega3 && !parsed?.epa_dha) {
      merged.epa_dha = {
        ...merged.epa_dha,
        max: Number.isFinite(Number(legacyOmega3.max))
          ? Number(legacyOmega3.max)
          : merged.epa_dha.max,
        min:
          legacyOmega3.min === undefined || legacyOmega3.min === null
            ? merged.epa_dha.min
            : Number(legacyOmega3.min),
      };
    }

    return merged;
  } catch {
    return DEFAULT_DIET_GOALS;
  }
};

const persistDietGoals = (goals: Record<string, DietGoal>) => {
  try {
    window.localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals));
  } catch {
    // Ignore storage failures (private mode / quota)
  }
};

export default function JanuaryMealsPage() {
  const { library: mealLibrary, loading: libraryLoading, refresh: refreshLibrary } = useMealLibrary();

  const {
    user,
    effectiveDays,
    mergedOverrides,
    isSignedIn,
    isAdmin,
    updateAnon,
    updateUserDraft,
    deleteAnon,
    deleteUserDraft,
    saveUser,
    resetAnon,
    resetUserToGlobal,
    savingUser,
  } = useMealPlanState(planKey, mealLibrary);

  const [currentWeek, setCurrentWeek] = useState(1);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showMethodology, setShowMethodology] = useState(false);
  const [showRecipes, setShowRecipes] = useState(false);
  const [showIngredientLookup, setShowIngredientLookup] = useState(false);
  const [lookupIngredient, setLookupIngredient] = useState<Ingredient | null>(null);
  const [editScope, setEditScope] = useState<EditScope>('anon');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error' | null>(null);
  const [authStatus, setAuthStatus] = useState<string | null>(null);
  const [dietGoals, setDietGoals] = useState<Record<string, DietGoal>>(() =>
    typeof window === 'undefined' ? DEFAULT_DIET_GOALS : loadDietGoals()
  );

  // Refs for smooth scrolling to sections
  const overviewRef = React.useRef<HTMLElement>(null);
  const weeklyStatsRef = React.useRef<HTMLElement>(null);
  const calendarRef = React.useRef<HTMLElement>(null);
  const recipesRef = React.useRef<HTMLElement>(null);

  const scrollToSection = (ref: React.RefObject<HTMLElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    persistDietGoals(dietGoals);
  }, [dietGoals]);

  // Simplified: admins edit recipes in RecipesPanel, users have personal overrides
  useEffect(() => {
    if (isSignedIn) {
      setEditScope('user');
    } else {
      setEditScope('anon');
    }
  }, [isSignedIn]);

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
    const totals = createEmptyNutrients();
    if (!weekNutrition.length) {
      return totals;
    }

    weekNutrition.forEach((entry) => {
      NUTRIENT_KEYS.forEach((key) => {
        totals[key] += (entry[key] || 0) as number;
      });
    });

    const averages = createEmptyNutrients();
    NUTRIENT_KEYS.forEach((key) => {
      averages[key] = totals[key] / weekNutrition.length;
    });
    return averages;
  }, [weekNutrition]);

  const editHandlers = {
    anon: { update: updateAnon, remove: deleteAnon },
    user: { update: updateUserDraft, remove: deleteUserDraft },
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
    setAuthStatus(null);
    if (!supabase) {
      setAuthStatus('Sign-in is unavailable: Supabase is not configured.');
      return;
    }
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Return to the same page after OAuth.
          redirectTo: `${window.location.origin}${window.location.pathname}`,
        },
      });
    } catch (error) {
      console.error('Sign in failed:', error);
      setAuthStatus('Sign-in failed. Check OAuth redirect URLs and try again.');
    }
  };

  const handleSignOut = async () => {
    setAuthStatus(null);
    if (!supabase) {
      setAuthStatus('Sign-out is unavailable: Supabase is not configured.');
      return;
    }
    try {
      await supabase.auth.signOut({ scope: 'global' });
      window.location.reload();
    } catch (error) {
      console.error('Sign out failed:', error);
      setAuthStatus('Sign-out failed.');
    }
  };

  const handleEditRecipe = async (mealType: MealType, code: string, recipe: Meal) => {
    try {
      // Convert Meal to the format expected by saveRecipe
      const recipeData = {
        name: recipe.name,
        color: recipe.color,
        notes: recipe.notes,
        ingredients: recipe.ingredients.map(ing => ({
          name: ing.name,
          fdcId: ing.fdcId || 0,
          amount: ing.amount,
          unit: ing.unit,
          displayAmount: ing.displayAmount,
          displayUnit: ing.displayUnit,
          nutrientsPer100g: ing.nutrientsPer100g || createEmptyNutrients()
        }))
      };
      await saveRecipe(mealType, code, recipeData);
      await refreshLibrary();
      alert('Recipe saved successfully!');
    } catch (error) {
      console.error('Error saving recipe:', error);
      alert('Failed to save recipe');
    }
  };

  const handleDeleteRecipe = async (mealType: MealType, code: string) => {
    try {
      await deleteRecipe(mealType, code);
      await refreshLibrary();
      alert('Recipe deleted successfully!');
    } catch (error) {
      console.error('Error deleting recipe:', error);
      alert('Failed to delete recipe');
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

  const handleAddToGoogleCalendar = () => {
    // Generate ICS file for all 30 days with meal plan
    const startDate = new Date(new Date().getFullYear(), 0, 1); // January 1st
    const events = effectiveDays.map((day) => {
      const dayDate = new Date(startDate);
      dayDate.setDate(startDate.getDate() + day.plan.day - 1);
      
      const dateStr = dayDate.toISOString().split('T')[0].replace(/-/g, '');
      const dinnerMeal = day.meals.dinner.meal;
      
      return `BEGIN:VEVENT
DTSTART:${dateStr}T180000Z
DTEND:${dateStr}T190000Z
SUMMARY:Day ${day.plan.day}: ${dinnerMeal.name}
DESCRIPTION:January Meal Plan - ${dinnerMeal.name}\\n\\nBreakfast: ${day.meals.breakfast.meal.name}\\nLunch: ${day.meals.lunch.meal.name}\\nDinner: ${dinnerMeal.name}\\nSnacks: ${day.meals.snacks.meal.name}
LOCATION:
STATUS:CONFIRMED
END:VEVENT`;
    }).join('\\n');

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Local Effort//January Meal Plan//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:January Meal Plan
X-WR-TIMEZONE:UTC
${events}
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'january-meal-plan.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const saveLabel = savingUser === 'saving' ? 'Saving Plan...' : 'Save My Plan';

  const canSave = isSignedIn && editScope === 'user';

  const handleSavePlan = async () => {
    if (!canSave) return;
    setSaveStatus('saving');
    const success = await saveUser();
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
      label: 'View recipes',
      icon: <BookIcon />,
      action: () => setShowRecipes(true),
    },
    { label: 'Open in Sheets', icon: <SheetsIcon />, action: handleExportExcel },
    { label: 'Export CSV', icon: <DownloadIcon />, action: handleExportCsv },
  ];

  if (libraryLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0f172a] via-[#0f172a] to-[#111827] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
          <p className="text-slate-300">Loading meal library...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-fixed" 
      style={{ backgroundImage: 'url(/images/2275660955_06cff8cbb4_o.jpg)' }}
    >
      <div className="min-h-screen bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
        {/* Hero Section with Video and Navigation */}
        <header
          className="space-y-6 bg-white rounded-3xl border-2 border-[#66D3E7] p-6 scroll-mt-20 shadow-xl"
          ref={overviewRef}
        >
          <div className="grid lg:grid-cols-[400px_1fr] gap-6 items-start">
            {/* Left: Founder Video */}
            <div className="relative aspect-video lg:aspect-[9/12] rounded-2xl overflow-hidden bg-[#7F9FA8]/10 border-2 border-[#66D3E7]/30 shadow-lg">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-[#21C8E7]/20 border-2 border-[#21C8E7] flex items-center justify-center mb-3 mx-auto">
                    <svg className="w-8 h-8 text-[#2E5E67]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                  <p className="text-sm text-[#2E5E67] font-medium">Founder Message</p>
                  <p className="text-xs text-[#7F9FA8] mt-1">Coming Soon</p>
                </div>
              </div>
              {/* Placeholder for actual video */}
              {/* <video className="w-full h-full object-cover" controls>
                <source src="/path-to-founder-video.mp4" type="video/mp4" />
              </video> */}
            </div>

            {/* Right: Title and Navigation */}
            <div className="space-y-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[#7F9FA8] mb-2">
                  January Meal Blueprint
                </p>
                <h1 className="text-3xl sm:text-4xl font-bold text-[#2E5E67]">
                  The <span className="text-[#ffc697]">Local Effort</span> January reset
                </h1>
                <p className="text-sm text-[#7F9FA8] font-medium mt-2 max-w-2xl">
                  Let's reset. Weston shares his diet plan for January, focusing on high fiber and fermented foods to build a strong metabolic base.
                </p>
                <p className="text-sm text-[#7F9FA8] font-medium mt-2 max-w-2xl">
                  Sign in and you can make changes and edits to the diet to suit your needs. The ingredients pull data from the USDA Food Database.
                </p>
              </div>

              {/* Animated Navigation Buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowRecipes(true)}
                  className="group relative px-4 py-2 text-sm font-medium text-[#2E5E67] bg-white rounded-lg border-2 border-[#66D3E7] hover:border-[#21C8E7] hover:bg-[#21C8E7]/5 transition-all duration-300 hover:scale-105 shadow-md hover:shadow-xl"
                >
                  <BookIcon />
                  <span className="relative z-10 ml-2">Recipes</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-[#ffc697]/0 via-[#ffc697]/10 to-[#ffc697]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
                </button>
                <button
                  onClick={() => setShowMethodology(true)}
                  className="group relative px-4 py-2 text-sm font-medium text-[#2E5E67] bg-white rounded-lg border-2 border-[#66D3E7] hover:border-[#21C8E7] hover:bg-[#21C8E7]/5 transition-all duration-300 hover:scale-105 shadow-md hover:shadow-xl"
                >
                  <InfoIcon />
                  <span className="relative z-10 ml-2">Methodology</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-[#66D3E7]/0 via-[#66D3E7]/15 to-[#66D3E7]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
                </button>
              </div>

              {/* Export and Auth Actions */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#7F9FA8] bg-white rounded-lg border border-[#7F9FA8]/30 hover:border-[#66D3E7] hover:bg-[#66D3E7]/5 hover:text-[#2E5E67] transition-colors shadow-sm"
                >
                  <SheetsIcon /> Export to Sheets
                </button>
                <button
                  onClick={handleExportCsv}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#7F9FA8] bg-white rounded-lg border border-[#7F9FA8]/30 hover:border-[#66D3E7] hover:bg-[#66D3E7]/5 hover:text-[#2E5E67] transition-colors shadow-sm"
                >
                  <DownloadIcon /> Export CSV
                </button>
                <button
                  onClick={handleAddToGoogleCalendar}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#7F9FA8] bg-white rounded-lg border border-[#7F9FA8]/30 hover:border-[#66D3E7] hover:bg-[#66D3E7]/5 hover:text-[#2E5E67] transition-colors shadow-sm"
                >
                  <CalendarIcon /> Add to Google Calendar
                </button>
                {saveStatus && (
                  <span
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full shadow-sm ${
                      saveStatus === 'saving'
                        ? 'text-[#7F9FA8] bg-[#7F9FA8]/10 border border-[#7F9FA8]/30'
                        : saveStatus === 'success'
                        ? 'text-[#21C8E7] bg-[#21C8E7]/10 border border-[#21C8E7]/30'
                        : 'text-[#ffc697] bg-[#ffc697]/10 border border-[#ffc697]/30'
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
          </div>

          {authStatus && (
            <div className="rounded-xl border-2 border-[#66D3E7]/50 bg-[#66D3E7]/10 px-4 py-3 text-sm text-[#2E5E67] shadow-md">
              {authStatus}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 text-sm">
            {isAdmin && (
              <span className="px-3 py-1 rounded-full bg-[#21C8E7]/20 border border-[#21C8E7]/50 text-[#2E5E67] text-xs font-medium shadow-sm">
                Admin: Edit recipes in Recipes panel
              </span>
            )}

            {!isSignedIn && (
              <span className="px-3 py-1 rounded-full bg-[#ffc697]/20 border border-[#ffc697]/50 text-[#2E5E67] text-xs font-medium shadow-sm">
                Anonymous edits reset on refresh
              </span>
            )}

            {canSave && (
              <button
                onClick={handleSavePlan}
                className="ml-auto px-4 py-2 rounded-lg bg-[#21C8E7] text-white font-medium hover:bg-[#21C8E7]/90 shadow-md hover:shadow-lg transition-all"
              >
                {saveLabel}
              </button>
            )}

            {!isSignedIn && (
              <button
                onClick={resetAnon}
                className="px-3 py-1 rounded-full border-2 border-[#7F9FA8] text-[#2E5E67] text-xs font-medium hover:bg-[#7F9FA8]/10 transition-colors shadow-sm"
              >
                Reset Draft
              </button>
            )}

            {isSignedIn && editScope === 'user' && (
              <button
                onClick={resetUserToGlobal}
                className="px-3 py-1 rounded-full border-2 border-[#7F9FA8] text-[#2E5E67] text-xs font-medium hover:bg-[#7F9FA8]/10 transition-colors shadow-sm"
              >
                Reset to Global
              </button>
            )}
          </div>
        </header>

        <section ref={weeklyStatsRef} className="bg-white rounded-3xl border-2 border-[#66D3E7] p-6 space-y-6 scroll-mt-20 shadow-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#7F9FA8] font-semibold">
                Week {currentWeek} averages
              </p>
              <div className="flex items-center gap-6 mt-3 text-sm">
                    <SummaryStat label="Calories" value={`${Math.round(weekAverages.calories)} kcal`} tone="text-[#2E5E67]" />
                    <SummaryStat label="Protein" value={`${Math.round(weekAverages.protein)} g`} tone="text-[#21C8E7]" />
                    <SummaryStat label="Fiber" value={`${Math.round(weekAverages.fiber)} g`} tone="text-[#ffc697]" />
              </div>
            </div>
            <WeekNav currentWeek={currentWeek} onWeekChange={setCurrentWeek} />
          </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {['calories', 'protein', 'carbs', 'fat', 'fiber'].map((key) => {
                  const goal = dietGoals[key] || DEFAULT_DIET_GOALS[key];
                  const value = weekAverages[key as keyof typeof weekAverages] as number;
                  const max = goal?.max || 1;
                  const percent = Math.min((value / max) * 100, 100);
              return (
                <div key={key} className="p-3 rounded-xl border-2 border-[#66D3E7]/30 bg-gradient-to-br from-white to-[#66D3E7]/5 shadow-md">
                  <p className="text-xs uppercase text-[#2E5E67] flex items-center justify-between font-medium">
                    <span>{goal?.label || key}</span>
                        <span className="text-[#21C8E7] font-semibold">{Math.round(value)} {goal?.unit || ''}</span>
                  </p>
                  <div className="h-2 mt-2 bg-[#7F9FA8]/20 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#21C8E7] to-[#66D3E7]"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {lookupIngredient && lastLookupStats && (
            <div className="p-4 rounded-xl border-2 border-[#66D3E7] bg-gradient-to-br from-white to-[#66D3E7]/5 text-sm shadow-md">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-[#7F9FA8] font-semibold">
                    Last USDA lookup
                  </p>
                  <p className="text-base font-semibold text-[#2E5E67]">
                    {lookupIngredient.name}
                  </p>
                </div>
                <button
                  className="text-xs text-[#7F9FA8] hover:text-[#21C8E7] font-medium transition-colors"
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

        <section ref={calendarRef} className="bg-white rounded-3xl border-2 border-[#66D3E7] p-6 space-y-6 scroll-mt-20 shadow-xl">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-lg font-semibold text-[#2E5E67]">
              January calendar
            </h2>
            <p className="text-xs text-[#7F9FA8] font-medium">
              Click any day to edit meals and view detailed nutrition.
            </p>
          </div>

          <div className="hidden lg:grid grid-cols-7 gap-3 text-xs text-[#7F9FA8]">
            {DAY_NAMES.map((name) => (
              <div key={name} className="text-center uppercase tracking-wide font-semibold">
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

          <div className="mt-2 p-4 rounded-xl bg-gradient-to-br from-white to-[#66D3E7]/5 border-2 border-[#66D3E7]/30 shadow-md">
            <p className="text-xs uppercase tracking-wider text-[#7F9FA8] mb-3 font-semibold">
              Dinner Rotation
            </p>
            <div className="flex flex-wrap gap-2">
              {mealLibrary && Object.entries(mealLibrary.dinner || {}).map(([code, meal]) => (
                <span
                  key={code}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{
                    backgroundColor: `${meal.color || '#94a3b8'}20`,
                    color: meal.color || '#e2e8f0',
                  }}
                >
                  {meal.name}
                </span>
              ))}
            </div>
          </div>
        </section>

      </div>

      {showMethodology && (
        <MethodologyPanel
          goals={dietGoals}
          onChange={setDietGoals}
          onReset={() => setDietGoals(DEFAULT_DIET_GOALS)}
          onClose={() => setShowMethodology(false)}
        />
      )}

      {selectedDayData && (
        <DayDetail
          day={selectedDayData}
          goals={dietGoals}
          canEdit={editScope !== 'anon' || !isSignedIn}
          onUpdateMeal={handleMealUpdate}
          onDeleteMeal={handleMealDelete}
          onClose={() => setSelectedDay(null)}
        />
      )}

      <RecipesPanel
        isOpen={showRecipes}
        onClose={() => setShowRecipes(false)}
        mealLibrary={mealLibrary}
        effectiveDays={effectiveDays}
        canEdit={true}
        onEditRecipe={handleEditRecipe}
        onDeleteRecipe={handleDeleteRecipe}
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
    </div>
  );
}
