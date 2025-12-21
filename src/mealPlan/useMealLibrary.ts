import { useEffect, useState } from 'react';
import { loadMealLibrary } from './recipeStorage';
import type { MealLibrary } from './types';

const emptyLibrary: MealLibrary = {
  breakfast: {},
  lunch: {},
  dinner: {},
  snacks: {}
};

/**
 * Hook to load and manage the meal recipe library from the database
 */
export function useMealLibrary() {
  const [library, setLibrary] = useState<MealLibrary>(emptyLibrary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await loadMealLibrary();
        if (mounted) {
          setLibrary(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to load recipes'));
          setLibrary(emptyLibrary);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const refresh = async () => {
    try {
      setLoading(true);
      const data = await loadMealLibrary();
      setLibrary(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load recipes'));
    } finally {
      setLoading(false);
    }
  };

  return {
    library,
    loading,
    error,
    refresh
  };
}
