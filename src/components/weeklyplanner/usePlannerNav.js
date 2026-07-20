import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';
import { getToday, getWeekStart, getWeekDates, addDays, addWeeks } from './dateUtils';

export function usePlannerNav() {
  const [searchParams, setSearchParams] = useSearchParams();

  const today = getToday();
  const calendarWeekStart = getWeekStart(today);
  const isSunday = getWeekDates(calendarWeekStart)[6] === today;
  const defaultPlanningDate = isSunday ? addDays(today, 1) : today;

  const view = searchParams.get('view') || 'agenda';
  const weekStart = searchParams.get('week') || getWeekStart(defaultPlanningDate);
  const selectedDate = searchParams.get('date') || defaultPlanningDate;
  const selectedMonth = searchParams.get('month') || today.slice(0, 7);

  const selectedYear = useMemo(() => parseInt(selectedMonth.split('-')[0], 10), [selectedMonth]);
  const selectedMonthNum = useMemo(() => parseInt(selectedMonth.split('-')[1], 10), [selectedMonth]);

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);

  const updateParams = useCallback(
    (updates) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(updates)) {
          if (value != null) {
            next.set(key, value);
          } else {
            next.delete(key);
          }
        }
        return next;
      }, { replace: true });
    },
    [setSearchParams]
  );

  const setView = useCallback((v) => updateParams({ view: v }), [updateParams]);

  const setSelectedDate = useCallback(
    (d) => updateParams({ date: d }),
    [updateParams]
  );

  const setWeekStart = useCallback(
    (w) => updateParams({ week: w }),
    [updateParams]
  );

  const goNextDay = useCallback(() => {
    const next = addDays(selectedDate, 1);
    updateParams({ date: next, week: getWeekStart(next) });
  }, [selectedDate, updateParams]);

  const goPrevDay = useCallback(() => {
    const prev = addDays(selectedDate, -1);
    updateParams({ date: prev, week: getWeekStart(prev) });
  }, [selectedDate, updateParams]);

  const goNextWeek = useCallback(() => {
    const next = addWeeks(weekStart, 1);
    updateParams({ week: next });
  }, [weekStart, updateParams]);

  const goPrevWeek = useCallback(() => {
    const prev = addWeeks(weekStart, -1);
    updateParams({ week: prev });
  }, [weekStart, updateParams]);

  const goNextMonth = useCallback(() => {
    let y = selectedYear;
    let m = selectedMonthNum + 1;
    if (m > 12) { m = 1; y++; }
    updateParams({ month: `${y}-${String(m).padStart(2, '0')}` });
  }, [selectedYear, selectedMonthNum, updateParams]);

  const goPrevMonth = useCallback(() => {
    let y = selectedYear;
    let m = selectedMonthNum - 1;
    if (m < 1) { m = 12; y--; }
    updateParams({ month: `${y}-${String(m).padStart(2, '0')}` });
  }, [selectedYear, selectedMonthNum, updateParams]);

  const selectWeekFromMonth = useCallback(
    (ws) => updateParams({ view: 'weekly', week: ws }),
    [updateParams]
  );

  const selectDayFromWeek = useCallback(
    (date) => updateParams({ view: 'daily', date, week: getWeekStart(date) }),
    [updateParams]
  );

  return {
    view,
    weekStart,
    weekDates,
    selectedDate,
    selectedMonth,
    selectedYear,
    selectedMonthNum,
    today,
    setView,
    setSelectedDate,
    setWeekStart,
    goNextDay,
    goPrevDay,
    goNextWeek,
    goPrevWeek,
    goNextMonth,
    goPrevMonth,
    selectWeekFromMonth,
    selectDayFromWeek,
  };
}
