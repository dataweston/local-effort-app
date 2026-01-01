/**
 * useMealPlanState - Core state management for meal plan calendar
 * 
 * Architecture:
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    Data Flow                                 │
 * ├─────────────────────────────────────────────────────────────┤
 * │ 1. meal_recipes (DB) → useMealLibrary → mealLibrary         │
 * │    Source of truth for all recipes                          │
 * │                                                              │
 * │ 2. DAILY_PLAN (rotation) + mealLibrary → base days          │
 * │    Defines which recipe appears on which day                 │
 * │                                                              │
 * │ 3. globalOverrides + userOverrides + anonDraft → merged     │
 * │    Layered overrides applied on top of base meals            │
 * │                                                              │
 * │ 4. merged overrides → effectiveDays (final view)            │
 * │    What the user sees in the calendar                        │
 * └─────────────────────────────────────────────────────────────┘
 * 
 * Override Layers (priority: anon > user > global):
 * - globalOverrides: Admin defaults (meal_plan_global table)
 * - userOverrides: Per-user customizations (meal_plan_user table)
 * - anonDraft: Ephemeral local edits (in-memory, lost on refresh)
 * 
 * Admin Note:
 * Admins should edit recipes directly in RecipesPanel (updates meal_recipes).
 * Global overrides are for per-day customizations only, not recipe edits.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import {
  DAILY_PLAN,
  cloneMeal,
  getDayKey,
  mergeOverrideMaps,
  resolveBaseMealForDay,
} from './baseMeals';
import { fetchGlobalOverrides, saveGlobalOverrides } from './storage/globalPlan';
import { fetchUserOverrides, saveUserOverrides } from './storage/userPlan';
import type {
  MealOverrideMap,
  EffectiveDay,
  Meal,
  MealType,
  MealLibrary,
} from './types';

type SaveState = 'idle' | 'saving' | 'success' | 'error';

const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks'];

const emptyOverrides: MealOverrideMap = {};

export const useMealPlanState = (planKey: string, mealLibrary: MealLibrary) => {
  const [user, setUser] = useState<User | null>(null);
  const [profileRole, setProfileRole] = useState<string | null>(null);
  const [globalOverrides, setGlobalOverrides] =
    useState<MealOverrideMap>(emptyOverrides);
  const [userOverrides, setUserOverrides] =
    useState<MealOverrideMap>(emptyOverrides);
  const [anonDraft, setAnonDraft] =
    useState<MealOverrideMap>(emptyOverrides);
  const [loading, setLoading] = useState(true);
  const [savingGlobal, setSavingGlobal] = useState<SaveState>('idle');
  const [savingUser, setSavingUser] = useState<SaveState>('idle');

  const isSignedIn = Boolean(user);
  const isAdmin = (profileRole || '').toLowerCase() === 'admin';

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      setLoading(true);
      const global = await fetchGlobalOverrides(planKey);
      if (active) {
        setGlobalOverrides(global || {});
      }

      if (supabase) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!active) return;
        const nextUser = session?.user || null;
        setUser(nextUser);
        if (nextUser) {
          await Promise.all([
            hydrateProfile(nextUser.id, setProfileRole),
            hydrateUserOverrides(planKey, nextUser.id, setUserOverrides),
          ]);
        } else {
          setProfileRole(null);
          setUserOverrides({});
        }
      }

      if (active) {
        setLoading(false);
      }
    };

    bootstrap();

    return () => {
      active = false;
    };
  }, [planKey]);

  useEffect(() => {
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_, session) => {
      const nextUser = session?.user || null;
      setUser(nextUser);
      if (nextUser) {
        await Promise.all([
          hydrateProfile(nextUser.id, setProfileRole),
          hydrateUserOverrides(planKey, nextUser.id, setUserOverrides),
        ]);
      } else {
        setProfileRole(null);
        setUserOverrides({});
      }
    });

    return () => subscription.unsubscribe();
  }, [planKey]);

  const updateMap = useCallback(
    (
      updater: Dispatch<SetStateAction<MealOverrideMap>>,
      dayKey: string,
      mealKey: string,
      meal: Meal
    ) => {
      updater((prev) => ({
        ...prev,
        [dayKey]: {
          ...(prev[dayKey] || {}),
          [mealKey]: cloneMeal(meal),
        },
      }));
    },
    []
  );

  const removeFromMap = useCallback(
    (
      updater: Dispatch<SetStateAction<MealOverrideMap>>,
      dayKey: string,
      mealKey: string
    ) => {
      updater((prev) => {
        if (!prev[dayKey]?.[mealKey]) return prev;
        const next = { ...prev };
        const dayEntries = { ...(next[dayKey] || {}) };
        delete dayEntries[mealKey];
        if (Object.keys(dayEntries).length === 0) {
          delete next[dayKey];
        } else {
          next[dayKey] = dayEntries;
        }
        return next;
      });
    },
    []
  );

  const updateAnon = useCallback(
    (dayKey: string, mealKey: string, meal: Meal) =>
      updateMap(setAnonDraft, dayKey, mealKey, meal),
    [updateMap]
  );

  const updateUserDraft = useCallback(
    (dayKey: string, mealKey: string, meal: Meal) =>
      updateMap(setUserOverrides, dayKey, mealKey, meal),
    [updateMap]
  );

  const updateGlobalDraft = useCallback(
    (dayKey: string, mealKey: string, meal: Meal) =>
      updateMap(setGlobalOverrides, dayKey, mealKey, meal),
    [updateMap]
  );

  const deleteAnon = useCallback(
    (dayKey: string, mealKey: string) =>
      removeFromMap(setAnonDraft, dayKey, mealKey),
    [removeFromMap]
  );

  const deleteUserDraft = useCallback(
    (dayKey: string, mealKey: string) =>
      removeFromMap(setUserOverrides, dayKey, mealKey),
    [removeFromMap]
  );

  const deleteGlobalDraft = useCallback(
    (dayKey: string, mealKey: string) =>
      removeFromMap(setGlobalOverrides, dayKey, mealKey),
    [removeFromMap]
  );

  const saveUser = useCallback(async () => {
    if (!user) return false;
    try {
      setSavingUser('saving');
      await saveUserOverrides(planKey, user.id, userOverrides);
      setSavingUser('success');
      return true;
    } catch (error) {
      console.error('Failed to save user overrides', error);
      setSavingUser('error');
      return false;
    }
  }, [planKey, user, userOverrides]);

  const saveGlobal = useCallback(async () => {
    if (!isAdmin) return false;
    try {
      setSavingGlobal('saving');
      await saveGlobalOverrides(planKey, globalOverrides, user?.id);
      setSavingGlobal('success');
      return true;
    } catch (error) {
      console.error('Failed to save global plan', error);
      setSavingGlobal('error');
      return false;
    }
  }, [planKey, globalOverrides, isAdmin, user]);

  const resetAnon = useCallback(() => setAnonDraft({}), []);
  const resetUserToGlobal = useCallback(() => setUserOverrides({}), []);

  const mergedOverrides = useMemo(
    () => mergeOverrideMaps(globalOverrides, userOverrides, anonDraft),
    [globalOverrides, userOverrides, anonDraft]
  );

  const effectiveDays: EffectiveDay[] = useMemo(() => {
    return DAILY_PLAN.map((plan) => {
      const dayKey = getDayKey(plan.day);
      const meals = {} as Record<MealType, any>;

      mealTypes.forEach((mealType) => {
        const base = resolveBaseMealForDay(
          mealLibrary,
          mealType,
          plan.day,
          plan.dinnerType
        );
        const override =
          anonDraft[dayKey]?.[base.instanceKey] ||
          userOverrides[dayKey]?.[base.instanceKey] ||
          globalOverrides[dayKey]?.[base.instanceKey];

        meals[mealType] = {
          mealType,
          instanceKey: base.instanceKey,
          templateKey: base.templateKey,
          meal: override ? cloneMeal(override) : base.meal,
        };
      });

      return {
        dayKey,
        plan,
        meals,
      };
    });
  }, [globalOverrides, userOverrides, anonDraft, mealLibrary]);

  return {
    user,
    isSignedIn,
    isAdmin,
    loading,
    effectiveDays,
    globalOverrides,
    userOverrides,
    anonDraft,
    mergedOverrides,
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
    savingUser,
    savingGlobal,
  };
};

const hydrateProfile = async (
  userId: string,
  setRole: (role: string | null) => void
) => {
  if (!supabase) {
    setRole(null);
    return;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.warn('Profile lookup failed', error);
      setRole(null);
      return;
    }
    setRole(data?.role || 'user');
  } catch (error) {
    console.warn('Profile lookup failed', error);
    setRole(null);
  }
};

const hydrateUserOverrides = async (
  planKey: string,
  userId: string,
  setOverrides: (value: MealOverrideMap) => void
) => {
  const overrides = await fetchUserOverrides(planKey, userId);
  setOverrides(overrides || {});
};
