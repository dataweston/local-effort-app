import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { usePlannerNav } from '../components/weeklyplanner/usePlannerNav';
import { usePlannerState } from '../components/weeklyplanner/usePlannerState';
import { formatDateShort, formatDateFull, isToday, getWeekStart, getToday } from '../components/weeklyplanner/dateUtils';
import { BlobColumn } from '../components/catherine/BlobColumn';

function normalizeDateKey(value) {
  if (!value || typeof value !== 'string') return '';
  const trimmed = value.trim();
  const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return trimmed;
}

function normalizePeople(people) {
  if (Array.isArray(people)) {
    return people.map((p) => String(p).trim().toLowerCase()).filter(Boolean);
  }
  if (typeof people === 'string') {
    return people
      .split(/[,;|]/)
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean);
  }
  return [];
}

/**
 * Filter cards relevant to Catherine's schedule:
 * - Cards where Catherine is in the people array
 * - Cards titled about Catherine or Teddy (relevant to her day)
 * - Babysitter cards (childcare she needs to know about)
 */
function isCatherineRelevant(card) {
  const people = normalizePeople(card?.people);
  if (people.some((p) => p === 'catherine' || p.includes('catherine'))) return true;
  if (people.some((p) => p === 'teddy' || p.includes('teddy'))) return true;
  const t = (card.title || '').toLowerCase();
  if (t.includes('catherine')) return true;
  if (t.includes('teddy')) return true;
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
  const hasAutoAlignedWeekRef = useRef(false);

  const mode = auth.loading ? null : (auth.user ? 'persisted' : 'demo');
  const planner = usePlannerState({ mode, accessToken: auth.accessToken, weekStart });

  // Filter to Catherine-relevant cards
  const catherineCards = useMemo(
    () => planner.cards.filter(isCatherineRelevant),
    [planner.cards]
  );

  const weekCards = useMemo(() => {
    const weekSet = new Set(weekDates);
    return planner.cards.filter((card) => weekSet.has(normalizeDateKey(card.date)));
  }, [planner.cards, weekDates]);

  // If strict Catherine tagging yields nothing, show week cards rather than a blank page.
  const visibleCards = catherineCards.length > 0 ? catherineCards : weekCards;

  // Group cards by date
  const cardsByDate = useMemo(() => {
    const map = {};
    for (const date of weekDates) map[date] = [];
    for (const card of visibleCards) {
      const key = normalizeDateKey(card.date);
      if (map[key]) map[key].push(card);
    }
    return map;
  }, [visibleCards, weekDates]);

  const hasAnyCards = useMemo(
    () => weekDates.some((date) => (cardsByDate[date] || []).length > 0),
    [weekDates, cardsByDate]
  );

  useEffect(() => {
    if (!planner.loaded) return;
    if (hasAnyCards) return;
    if (hasAutoAlignedWeekRef.current) return;

    // Respect explicit week query if user intentionally navigated to a specific week.
    const hasExplicitWeek = typeof window !== 'undefined'
      && new URLSearchParams(window.location.search).has('week');
    if (hasExplicitWeek) {
      hasAutoAlignedWeekRef.current = true;
      return;
    }

    const sourceCards = catherineCards.length > 0 ? catherineCards : planner.cards;
    const candidateDates = sourceCards
      .map((card) => normalizeDateKey(card.date))
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
    if (candidateDates.length === 0) {
      hasAutoAlignedWeekRef.current = true;
      return;
    }

    const today = getToday();
    const future = candidateDates.filter((d) => d >= today).sort();
    const past = candidateDates.filter((d) => d < today).sort();
    const targetDate = future[0] || past[past.length - 1];
    if (!targetDate) {
      hasAutoAlignedWeekRef.current = true;
      return;
    }

    hasAutoAlignedWeekRef.current = true;
    nav.setWeekStart(getWeekStart(targetDate));
    nav.setSelectedDate(targetDate);
  }, [planner.loaded, planner.cards, catherineCards, hasAnyCards, nav]);

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

  if (!planner.loaded) {
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
          Loading schedule...
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
      <div className="flex-1 px-3 pb-4 safe-area-bottom overflow-auto" style={{ minHeight: 0 }}>
        {!hasAnyCards && (
          <div className="max-w-md mx-auto mt-10 text-center">
            <p className="text-sm font-display" style={{ color: 'rgba(58,46,63,0.6)' }}>
              No schedule cards found for this week.
            </p>
          </div>
        )}
        <AnimatePresence mode="wait">
          {activeView === 'weekly' ? (
            <motion.div
              key="weekly"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex gap-1"
              style={{ minHeight: 'calc(100vh - 80px)' }}
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
              className="max-w-lg mx-auto"
              style={{ minHeight: 'calc(100vh - 80px)' }}
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
