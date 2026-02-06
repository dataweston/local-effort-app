import { useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';
import { DAYS } from './defaultSchedule';

export function usePlannerNav() {
  const [searchParams, setSearchParams] = useSearchParams();

  const view = searchParams.get('view') || 'weekly';
  const selectedDay = searchParams.get('day') || 'Monday';

  const setView = useCallback(
    (v) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('view', v);
        return next;
      }, { replace: true });
    },
    [setSearchParams]
  );

  const setSelectedDay = useCallback(
    (d) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('day', d);
        return next;
      }, { replace: true });
    },
    [setSearchParams]
  );

  const goNextDay = useCallback(() => {
    const idx = DAYS.indexOf(selectedDay);
    const next = DAYS[(idx + 1) % DAYS.length];
    setSelectedDay(next);
  }, [selectedDay, setSelectedDay]);

  const goPrevDay = useCallback(() => {
    const idx = DAYS.indexOf(selectedDay);
    const prev = DAYS[(idx - 1 + DAYS.length) % DAYS.length];
    setSelectedDay(prev);
  }, [selectedDay, setSelectedDay]);

  return { view, selectedDay, setView, setSelectedDay, goNextDay, goPrevDay };
}
