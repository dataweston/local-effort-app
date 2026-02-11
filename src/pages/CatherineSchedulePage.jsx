import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Copy, ExternalLink, LogIn, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { usePlannerNav } from '../components/weeklyplanner/usePlannerNav';
import { usePlannerState } from '../components/weeklyplanner/usePlannerState';
import { formatDateShort, formatDateFull, getWeekStart, getToday } from '../components/weeklyplanner/dateUtils';
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
    weekStart, weekDates,
    selectedDate,
    goNextDay, goPrevDay,
    goNextWeek, goPrevWeek,
    selectDayFromWeek,
  } = nav;

  const [activeView, setActiveView] = useState('weekly');
  const [errorDialog, setErrorDialog] = useState(null);
  const [feedLinks, setFeedLinks] = useState(null);
  const [feedStatus, setFeedStatus] = useState('idle');
  const [feedMessage, setFeedMessage] = useState('');
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

  const openErrorDialog = (message) => setErrorDialog(message);
  const closeErrorDialog = () => setErrorDialog(null);

  const fetchFeedLinks = async () => {
    if (!auth.accessToken) {
      throw new Error('Sign in required to generate calendar feed.');
    }
    const res = await fetch('/api/planner/catherine-feed-token', {
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to generate calendar feed link.');
    }
    setFeedLinks(data);
    return data;
  };

  const handleCopyFeedLink = async () => {
    setFeedStatus('loading');
    setFeedMessage('');
    try {
      const links = feedLinks || (await fetchFeedLinks());
      if (!links?.httpsUrl) throw new Error('Calendar feed URL is missing.');
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(links.httpsUrl);
        setFeedMessage('Feed link copied. In iPhone Calendar: Add Account > Other > Add Subscribed Calendar.');
      } else {
        setFeedMessage(links.httpsUrl);
      }
      setFeedStatus('success');
    } catch (err) {
      setFeedStatus('error');
      setFeedMessage(err.message || 'Failed to copy feed link.');
    }
  };

  const handleOpenWebcal = async () => {
    setFeedStatus('loading');
    setFeedMessage('');
    try {
      const links = feedLinks || (await fetchFeedLinks());
      if (!links?.webcalUrl) throw new Error('Calendar subscription URL is missing.');
      setFeedStatus('success');
      window.location.href = links.webcalUrl;
    } catch (err) {
      setFeedStatus('error');
      setFeedMessage(err.message || 'Failed to open subscription URL.');
    }
  };

  return (
    <div
      className="fullpage-demo-scope min-h-screen flex flex-col"
      style={{ backgroundColor: '#F1E3D8' }}
    >
      {/* Minimal navigation */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-3 safe-area-top gap-2">
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
            className="text-xs sm:text-sm font-display font-medium min-w-[112px] sm:min-w-[140px] text-center"
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
        <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
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
          <div className="flex items-center gap-3 text-[11px] sm:text-[12px]">
            <button
              type="button"
              onClick={() => openErrorDialog('ask your husband')}
              className="underline underline-offset-2"
              style={{ color: '#9a4f5b' }}
            >
              make changes
            </button>
            <button
              type="button"
              onClick={() => openErrorDialog("don't worry about it honey")}
              className="underline underline-offset-2"
              style={{ color: '#9a4f5b' }}
            >
              financials
            </button>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 px-3 pb-4 safe-area-bottom overflow-auto" style={{ minHeight: 0 }}>
        <div className="max-w-2xl mx-auto mb-4">
          <div
            className="rounded-2xl p-3 sm:p-4"
            style={{
              backgroundColor: 'rgba(248,233,232,0.9)',
              border: '1px solid rgba(58,46,63,0.14)',
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p
                  className="text-xs font-medium uppercase tracking-wide mb-1"
                  style={{ color: 'rgba(58,46,63,0.62)' }}
                >
                  iPhone Lock Screen
                </p>
                <p className="text-xs sm:text-sm font-display" style={{ color: '#3A2E3F' }}>
                  Subscribe to this schedule in Apple Calendar, then add the Calendar widget to your lock screen.
                </p>
              </div>
              <Smartphone size={18} style={{ color: '#7A846E', flex: '0 0 auto' }} />
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                type="button"
                onClick={handleCopyFeedLink}
                disabled={feedStatus === 'loading'}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full transition-colors disabled:opacity-60"
                style={{
                  backgroundColor: 'rgba(58,46,63,0.1)',
                  color: '#3A2E3F',
                }}
              >
                <Copy size={13} />
                Copy feed link
              </button>
              <button
                type="button"
                onClick={handleOpenWebcal}
                disabled={feedStatus === 'loading'}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full transition-colors disabled:opacity-60"
                style={{
                  backgroundColor: '#D28D93',
                  color: '#3A2E3F',
                }}
              >
                <ExternalLink size={13} />
                Open in Calendar
              </button>
            </div>
            {feedMessage ? (
              <p
                className="text-[11px] mt-2 break-all"
                style={{
                  color: feedStatus === 'error' ? '#A7384C' : 'rgba(58,46,63,0.72)',
                }}
              >
                {feedMessage}
              </p>
            ) : null}
          </div>
        </div>
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
              className="flex gap-2 min-w-max pr-1 pb-2 sm:min-w-0"
              style={{ minHeight: 'calc(100dvh - 84px)' }}
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
              className="max-w-lg mx-auto w-full"
              style={{ minHeight: 'calc(100dvh - 84px)' }}
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

      <AnimatePresence>
        {errorDialog ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(41,31,35,0.55)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-sm rounded-2xl p-4 sm:p-5 text-center"
              style={{
                backgroundColor: '#F8E9E8',
                border: '1px solid rgba(167,56,76,0.38)',
                boxShadow: '0 14px 28px rgba(58,46,63,0.22)',
              }}
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.16 }}
            >
              <div className="flex justify-center mb-2">
                <AlertTriangle size={18} style={{ color: '#A7384C' }} />
              </div>
              <p className="text-sm font-display mb-4" style={{ color: '#6b2733' }}>
                {errorDialog}
              </p>
              <button
                type="button"
                onClick={closeErrorDialog}
                className="px-5 py-1.5 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: '#A7384C',
                  color: '#F8E9E8',
                }}
              >
                OK
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
