import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { usePlannerNav } from '../components/weeklyplanner/usePlannerNav';
import { usePlannerState } from '../components/weeklyplanner/usePlannerState';
import { formatDateShort, formatDateFull, isToday, getWeekStart, getToday } from '../components/weeklyplanner/dateUtils';
import { BlobColumn } from '../components/catherine/BlobColumn';

/**
 * Filter cards relevant to Catherine's schedule:
 * - Cards where Catherine is in the people array
 * - Cards titled about Catherine or Teddy (relevant to her day)
 * - Babysitter cards (childcare she needs to know about)
 */
function isCatherineRelevant(card) {
  if (card.people?.includes('Catherine')) return true;
  const t = (card.title || '').toLowerCase();
  if (t.includes('catherine')) return true;
  if (t.includes('babysitter')) return true;
  if (t.includes('teddy with weston') || t.includes('with weston')) return true;
  return false;
}

export default function CatherineSchedulePage() {
  // Prevent indexing
  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'robots');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', 'noindex, nofollow');
    return () => { meta.setAttribute('content', ''); };
  }, []);

  const auth = useSupabaseAuth();
  const nav = usePlannerNav();
  const {
    view, setView,
    weekStart, weekDates,
    selectedDate,
    goNextDay, goPrevDay,
    goNextWeek, goPrevWeek,
    selectDayFromWeek,
  } = nav;

  const [activeView, setActiveView] = useState('weekly');

  const mode = auth.loading ? null : (auth.user ? 'persisted' : 'demo');
  const planner = usePlannerState({ mode, accessToken: auth.accessToken, weekStart });

  // Debug — remove after confirming
  useEffect(() => {
    console.log('[catherine] mode:', mode, 'loaded:', planner.loaded, 'cards:', planner.cards.length);
  }, [mode, planner.loaded, planner.cards.length]);

  // Filter to Catherine-relevant cards
  const catherineCards = useMemo(
    () => planner.cards.filter(isCatherineRelevant),
    [planner.cards]
  );

  // Group cards by date
  const cardsByDate = useMemo(() => {
    const map = {};
    for (const date of weekDates) map[date] = [];
    for (const card of catherineCards) {
      if (map[card.date]) map[card.date].push(card);
    }
    return map;
  }, [catherineCards, weekDates]);

  // Week label
  const weekLabel = weekDates.length >= 7
    ? `${formatDateShort(weekDates[0])} \u2013 ${formatDateShort(weekDates[6])}`
    : '';

  // Auth guard
  if (auth.loading) {
    return (
      <div
        className="fullpage-demo-scope min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#F1E3D8' }}
      >
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-sm font-display"
          style={{ color: 'rgba(58,46,63,0.5)' }}
        >
          Loading...
        </motion.div>
      </div>
    );
  }

  if (!auth.user) {
    return (
      <div
        className="fullpage-demo-scope min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#F1E3D8' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1
            className="text-2xl font-bold font-display mb-6"
            style={{ color: '#3A2E3F' }}
          >
            Catherine's Schedule
          </h1>
          <button
            onClick={() => auth.signInWithGoogle(`${window.location.origin}/catherine-schedule`)}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-full transition-all"
            style={{
              backgroundColor: '#D28D93',
              color: '#3A2E3F',
            }}
          >
            <LogIn size={16} />
            Sign in with Google
          </button>
        </motion.div>
      </div>
    );
  }

  const handleToday = () => {
    const today = getToday();
    const ws = getWeekStart(today);
    nav.setWeekStart(ws);
    nav.setSelectedDate(today);
  };

  return (
    <div
      className="fullpage-demo-scope min-h-screen flex flex-col"
      style={{ backgroundColor: '#F1E3D8' }}
    >
      {/* Minimal navigation */}
      <div className="flex items-center justify-between px-4 py-3 safe-area-top">
        {/* Week nav */}
        <div className="flex items-center gap-2">
          <button
            onClick={activeView === 'weekly' ? goPrevWeek : goPrevDay}
            className="p-2 rounded-full transition-colors"
            style={{ color: 'rgba(58,46,63,0.6)' }}
          >
            <ChevronLeft size={18} />
          </button>
          <span
            className="text-sm font-display font-medium min-w-[140px] text-center"
            style={{ color: '#3A2E3F' }}
          >
            {activeView === 'weekly' ? weekLabel : formatDateFull(selectedDate)}
          </span>
          <button
            onClick={activeView === 'weekly' ? goNextWeek : goNextDay}
            className="p-2 rounded-full transition-colors"
            style={{ color: 'rgba(58,46,63,0.6)' }}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Today + view toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleToday}
            className="text-[11px] font-medium px-3 py-1 rounded-full transition-colors"
            style={{
              color: 'rgba(58,46,63,0.6)',
              backgroundColor: 'rgba(58,46,63,0.06)',
            }}
          >
            Today
          </button>
          <div
            className="flex rounded-full overflow-hidden"
            style={{ backgroundColor: 'rgba(58,46,63,0.08)' }}
          >
            {['weekly', 'daily'].map((v) => (
              <button
                key={v}
                onClick={() => setActiveView(v)}
                className="text-[11px] font-medium px-3 py-1 transition-colors capitalize"
                style={{
                  backgroundColor: activeView === v ? 'rgba(58,46,63,0.15)' : 'transparent',
                  color: activeView === v ? '#3A2E3F' : 'rgba(58,46,63,0.5)',
                }}
              >
                {v === 'weekly' ? 'Week' : 'Day'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 px-3 pb-4 safe-area-bottom overflow-auto min-h-0">
        <AnimatePresence mode="wait">
          {activeView === 'weekly' ? (
            <motion.div
              key="weekly"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex gap-1 h-full"
            >
              {weekDates.map((date) => (
                <BlobColumn
                  key={date}
                  date={date}
                  cards={cardsByDate[date] || []}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key={`daily-${selectedDate}`}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
              className="h-full max-w-lg mx-auto"
            >
              {/* Day pills */}
              <div className="flex justify-center gap-1 mb-4">
                {weekDates.map((date) => (
                  <button
                    key={date}
                    onClick={() => selectDayFromWeek(date)}
                    className="text-[10px] font-medium px-2 py-1 rounded-full transition-colors"
                    style={{
                      backgroundColor: date === selectedDate
                        ? 'rgba(58,46,63,0.15)'
                        : 'transparent',
                      color: date === selectedDate
                        ? '#3A2E3F'
                        : 'rgba(58,46,63,0.4)',
                    }}
                  >
                    {formatDateShort(date)}
                  </button>
                ))}
              </div>

              <BlobColumn
                date={selectedDate}
                cards={cardsByDate[selectedDate] || []}
                daily
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
