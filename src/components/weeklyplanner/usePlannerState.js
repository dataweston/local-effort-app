import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { generateCardsForRange } from './defaultSchedule';
import { getWeekDates, getWeekStart, getToday, getDayOfWeek, addWeeks, getMonthWeeks } from './dateUtils';
import { weekTotals, monthTotals as computeMonthTotals } from './financials';

let _nextCardId = 5000;

export function usePlannerState({ mode = 'demo', accessToken = null, weekStart, selectedMonth }) {
  const [cards, setCards] = useState([]);
  const [editingCard, setEditingCard] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [overheads, setOverheads] = useState([]);
  const [cogs, setCogs] = useState([]);
  const [pendingChange, setPendingChange] = useState(null);
  const saveTimer = useRef(null);
  const initRef = useRef(false);

  const effectiveWeekStart = weekStart || getWeekStart(getToday());
  const weekDates = useMemo(() => getWeekDates(effectiveWeekStart), [effectiveWeekStart]);

  // Wait for auth to resolve before doing anything — mode is null while loading
  // Demo mode: start with an empty calendar (public visitors see blank)
  useEffect(() => {
    if (mode === 'demo' && !initRef.current) {
      initRef.current = true;
      setCards([]);
      setLoaded(true);
    }
  }, [mode]);

  // Load ALL cards from API in persisted mode (no date filter — keep full set in memory)
  useEffect(() => {
    if (mode !== 'persisted' || !accessToken) return;
    let cancelled = false;

    fetch('/api/planner/cards', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.cards && data.cards.length > 0) {
          setCards(data.cards);
        } else {
          const today = getToday();
          const year = parseInt(today.split('-')[0], 10);
          const defaults = generateCardsForRange(today, `${year}-12-31`);
          setCards(defaults);
          persistCards(defaults);
        }
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => { cancelled = true; };
  }, [mode, accessToken]);

  // Load overheads in persisted mode
  useEffect(() => {
    if (mode !== 'persisted' || !accessToken) return;
    let cancelled = false;
    fetch('/api/planner/overhead', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.items) setOverheads(data.items);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [mode, accessToken]);

  // Load ALL COGS in persisted mode (full set in memory, filtered by view)
  useEffect(() => {
    if (mode !== 'persisted' || !accessToken) return;
    let cancelled = false;
    fetch('/api/planner/cogs', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.items) setCogs(data.items);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [mode, accessToken]);

  // Cards for the current week
  const weekCards = useMemo(() => {
    const dateSet = new Set(weekDates);
    return cards.filter((c) => dateSet.has(c.date));
  }, [cards, weekDates]);

  // Cards grouped by date
  const cardsByDate = useMemo(() => {
    const map = {};
    for (const date of weekDates) map[date] = [];
    for (const card of cards) {
      if (map[card.date]) map[card.date].push(card);
    }
    return map;
  }, [cards, weekDates]);

  // COGS filtered to current week
  const weekCogs = useMemo(() => {
    return cogs.filter((c) => c.weekStart === effectiveWeekStart);
  }, [cogs, effectiveWeekStart]);

  const totals = useMemo(() => weekTotals(weekCards), [weekCards]);

  // Month-level cards and totals (for monthly view top bar)
  const monthCards = useMemo(() => {
    if (!selectedMonth) return [];
    const [y, m] = selectedMonth.split('-').map(Number);
    const weekStarts = getMonthWeeks(y, m);
    const allDates = new Set();
    for (const ws of weekStarts) {
      for (const d of getWeekDates(ws)) allDates.add(d);
    }
    return cards.filter((c) => allDates.has(c.date));
  }, [cards, selectedMonth]);

  // COGS filtered to month's weeks
  const monthCogs = useMemo(() => {
    if (!selectedMonth) return [];
    const [y, m] = selectedMonth.split('-').map(Number);
    const weekStartsForMonth = getMonthWeeks(y, m);
    const wsSet = new Set(weekStartsForMonth);
    return cogs.filter((c) => wsSet.has(c.weekStart));
  }, [cogs, selectedMonth]);

  const monthlyTotals = useMemo(
    () => computeMonthTotals(monthCards, overheads, monthCogs),
    [monthCards, overheads, monthCogs]
  );

  // Track save state for flush-on-unload
  const latestCardsRef = useRef(cards);
  latestCardsRef.current = cards;
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);

  // Core save function (no debounce) — used by both debounced path and flush
  const doSaveNow = useCallback(
    (cardsToSave) => {
      if (mode !== 'persisted' || !accessToken) return Promise.resolve();
      dirtyRef.current = false;
      savingRef.current = true;
      return fetch('/api/planner/cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ action: 'save-all', cards: cardsToSave }),
      })
        .then((r) => {
          savingRef.current = false;
          if (!r.ok) console.error('Save failed:', r.status);
        })
        .catch((err) => {
          savingRef.current = false;
          console.error('Save error:', err);
        });
    },
    [mode, accessToken]
  );

  // Debounced save
  const persistCards = useCallback(
    (nextCards) => {
      if (mode !== 'persisted' || !accessToken) return;
      dirtyRef.current = true;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveTimer.current = null;
        doSaveNow(nextCards);
      }, 800);
    },
    [mode, accessToken, doSaveNow]
  );

  // Flush pending save on page unload — synchronous XHR as last resort
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!dirtyRef.current || mode !== 'persisted' || !accessToken) return;
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      // Use synchronous XMLHttpRequest — the only reliable way to save on unload
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/planner/cards', false); // synchronous
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
        xhr.send(JSON.stringify({ action: 'save-all', cards: latestCardsRef.current }));
      } catch (e) {
        // Best effort — page is unloading
      }
      dirtyRef.current = false;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [mode, accessToken]);

  const updateCards = useCallback(
    (updater) => {
      setCards((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        persistCards(next);
        return next;
      });
    },
    [persistCards]
  );

  const handleToggle = useCallback(
    (cardId) => {
      updateCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, enabled: !c.enabled } : c))
      );
    },
    [updateCards]
  );

  const handleCardClick = useCallback((card) => {
    setEditingCard(card);
  }, []);

  const handleSave = useCallback(
    (updatedCard) => {
      // If "repeat weekly" was toggled on a new card, generate weekly copies
      if (updatedCard._repeatWeekly && !updatedCard.templateId) {
        const { _repeatWeekly, ...cardData } = updatedCard;
        const templateKey = `custom-${cardData.id}`;
        const today = getToday();
        const year = parseInt(today.split('-')[0], 10);
        const endDate = `${year}-12-31`;

        // Assign a templateId to the original
        const baseCard = { ...cardData, templateId: templateKey };

        // Generate copies for future weeks on the same day of week
        const copies = [baseCard];
        let ws = addWeeks(getWeekStart(baseCard.date), 1);
        const lastWeek = getWeekStart(endDate);
        while (ws <= lastWeek) {
          const weekDts = getWeekDates(ws);
          const dayIndex = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].indexOf(baseCard.dayOfWeek);
          if (dayIndex >= 0 && weekDts[dayIndex]) {
            copies.push({
              ...baseCard,
              id: String(++_nextCardId),
              date: weekDts[dayIndex],
            });
          }
          ws = addWeeks(ws, 1);
        }

        updateCards((prev) => {
          // Replace original card with base + add copies
          const without = prev.filter((c) => c.id !== cardData.id);
          return [...without, ...copies];
        });
        setEditingCard(null);
        return;
      }

      if (updatedCard.templateId) {
        setPendingChange({ type: 'save', card: updatedCard });
      } else {
        const { _repeatWeekly, ...clean } = updatedCard;
        updateCards((prev) =>
          prev.map((c) => (c.id === clean.id ? clean : c))
        );
        setEditingCard(null);
      }
    },
    [updateCards]
  );

  const handleDelete = useCallback(
    (cardId) => {
      const card = cards.find((c) => c.id === cardId);
      if (card?.templateId) {
        setPendingChange({ type: 'delete', cardId, templateId: card.templateId, date: card.date });
      } else {
        updateCards((prev) => prev.filter((c) => c.id !== cardId));
        setEditingCard(null);
      }
    },
    [cards, updateCards]
  );

  const confirmChange = useCallback(
    (changeMode) => {
      if (!pendingChange) return;

      if (pendingChange.type === 'save') {
        const { card } = pendingChange;
        if (changeMode === 'single') {
          updateCards((prev) =>
            prev.map((c) => (c.id === card.id ? card : c))
          );
        } else {
          updateCards((prev) =>
            prev.map((c) => {
              if (c.id === card.id) return card;
              if (c.templateId === card.templateId && c.date >= card.date) {
                return {
                  ...c,
                  title: card.title,
                  zone: card.zone,
                  people: [...card.people],
                  startTime: card.startTime,
                  endTime: card.endTime,
                  revenue: card.revenue,
                  cost: card.cost,
                  costPerHour: card.costPerHour,
                  optional: card.optional,
                  enabled: card.enabled,
                  effectType: card.effectType,
                };
              }
              return c;
            })
          );

          if (mode === 'persisted' && accessToken) {
            fetch('/api/planner/cards', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({ action: 'update-recurring', card, mode: 'future' }),
            }).catch(() => {});
          }
        }
        setEditingCard(null);
      }

      if (pendingChange.type === 'delete') {
        const { cardId, templateId, date } = pendingChange;
        if (changeMode === 'single') {
          updateCards((prev) => prev.filter((c) => c.id !== cardId));
        } else {
          updateCards((prev) =>
            prev.filter((c) => !(c.templateId === templateId && c.date >= date))
          );

          if (mode === 'persisted' && accessToken) {
            fetch('/api/planner/cards', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({ action: 'delete-recurring', templateId, date, mode: 'future' }),
            }).catch(() => {});
          }
        }
        setEditingCard(null);
      }

      setPendingChange(null);
    },
    [pendingChange, updateCards, mode, accessToken]
  );

  const cancelChange = useCallback(() => {
    setPendingChange(null);
  }, []);

  const handleAddCard = useCallback(
    (date) => {
      const newCard = {
        id: String(++_nextCardId),
        templateId: null,
        title: 'New card',
        date,
        dayOfWeek: getDayOfWeek(date),
        zone: 'timed',
        people: [],
        startTime: null,
        endTime: null,
        revenue: 0,
        cost: 0,
        costPerHour: null,
        optional: false,
        enabled: true,
        effectTarget: null,
        effectType: null,
        order: 99,
      };
      updateCards((prev) => [...prev, newCard]);
      setEditingCard(newCard);
    },
    [updateCards]
  );

  const handleReset = useCallback(() => {
    if (mode === 'demo') {
      updateCards([]);
    } else {
      const today = getToday();
      const year = parseInt(today.split('-')[0], 10);
      const defaults = generateCardsForRange(today, `${year}-12-31`);
      updateCards(defaults);
    }
    setEditingCard(null);
  }, [mode, updateCards]);

  // Overhead handlers
  const handleAddOverhead = useCallback(
    (item) => {
      const newItem = { ...item, id: item.id || String(++_nextCardId) };
      setOverheads((prev) => [...prev, newItem]);
      if (mode === 'persisted' && accessToken) {
        fetch('/api/planner/overhead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ action: 'upsert', item: newItem }),
        }).catch(() => {});
      }
    },
    [mode, accessToken]
  );

  const handleDeleteOverhead = useCallback(
    (id) => {
      setOverheads((prev) => prev.filter((o) => o.id !== id));
      if (mode === 'persisted' && accessToken) {
        fetch('/api/planner/overhead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ action: 'delete', id }),
        }).catch(() => {});
      }
    },
    [mode, accessToken]
  );

  // COGS handlers
  const handleAddCOGS = useCallback(
    (item) => {
      const newItem = { ...item, id: item.id || String(++_nextCardId), weekStart: effectiveWeekStart };
      setCogs((prev) => [...prev, newItem]);
      if (mode === 'persisted' && accessToken) {
        fetch('/api/planner/cogs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ action: 'upsert', item: newItem }),
        }).catch(() => {});
      }
    },
    [mode, accessToken, effectiveWeekStart]
  );

  const handleDeleteCOGS = useCallback(
    (id) => {
      setCogs((prev) => prev.filter((c) => c.id !== id));
      if (mode === 'persisted' && accessToken) {
        fetch('/api/planner/cogs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ action: 'delete', id }),
        }).catch(() => {});
      }
    },
    [mode, accessToken]
  );

  // What-If handlers
  const handleAddWhatIf = useCallback(
    ({ title, dayOfWeek, costPerHour, startTime, endTime }) => {
      const today = getToday();
      const ws = getWeekStart(today);
      const weekDts = getWeekDates(ws);
      const dayIndex = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].indexOf(dayOfWeek);
      const baseDate = dayIndex >= 0 ? weekDts[dayIndex] : weekDts[0];
      const templateKey = `whatif-${++_nextCardId}`;

      const year = parseInt(today.split('-')[0], 10);
      const endDate = `${year}-12-31`;
      const copies = [];

      let currWs = ws;
      const lastWeek = getWeekStart(endDate);
      while (currWs <= lastWeek) {
        const dates = getWeekDates(currWs);
        if (dayIndex >= 0 && dates[dayIndex]) {
          copies.push({
            id: String(++_nextCardId),
            templateId: templateKey,
            title,
            date: dates[dayIndex],
            dayOfWeek,
            zone: 'timed',
            people: [],
            startTime: startTime || null,
            endTime: endTime || null,
            revenue: 0,
            cost: 0,
            costPerHour: Number(costPerHour) || 0,
            optional: true,
            enabled: false,
            effectTarget: null,
            effectType: null,
            order: 99,
          });
        }
        currWs = addWeeks(currWs, 1);
      }

      updateCards((prev) => [...prev, ...copies]);
    },
    [updateCards]
  );

  const handleRemoveWhatIf = useCallback(
    (cardId) => {
      const card = cards.find((c) => c.id === cardId);
      if (!card) return;
      if (card.templateId) {
        // Remove all instances of this recurring what-if
        updateCards((prev) => prev.filter((c) => c.templateId !== card.templateId));
      } else {
        updateCards((prev) => prev.filter((c) => c.id !== cardId));
      }
    },
    [cards, updateCards]
  );

  const handleApplyWhatIf = useCallback(
    (cardId) => {
      updateCards((prev) =>
        prev.map((c) =>
          c.id === cardId ? { ...c, optional: false, enabled: true } : c
        )
      );
    },
    [updateCards]
  );

  // Drag & Drop
  const parseDroppable = (id) => {
    if (!id) return null;
    const str = String(id);
    const sep = str.lastIndexOf(':');
    if (sep === -1) return null;
    return { date: str.slice(0, sep), zone: str.slice(sep + 1) };
  };

  const handleDragStart = useCallback((event) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragOver = useCallback(
    (event) => {
      const { active, over } = event;
      if (!over) return;

      const activeCard = cards.find((c) => c.id === active.id);
      if (!activeCard) return;

      let targetContainer = null;
      const parsed = parseDroppable(over.id);
      if (parsed) {
        targetContainer = parsed;
      } else {
        const overCard = cards.find((c) => c.id === over.id);
        if (overCard) {
          targetContainer = { date: overCard.date, zone: overCard.zone };
        }
      }

      if (!targetContainer) return;
      if (activeCard.date === targetContainer.date && activeCard.zone === targetContainer.zone) return;

      setCards((prev) =>
        prev.map((c) =>
          c.id === active.id
            ? { ...c, date: targetContainer.date, zone: targetContainer.zone, dayOfWeek: getDayOfWeek(targetContainer.date) }
            : c
        )
      );
    },
    [cards]
  );

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over || active.id === over.id) {
        // Persist the current state (drag-over may have changed date/zone)
        persistCards(latestCardsRef.current);
        return;
      }

      const currentCards = latestCardsRef.current;
      const activeCard = currentCards.find((c) => c.id === active.id);
      const overCard = currentCards.find((c) => c.id === over.id);

      if (
        activeCard &&
        overCard &&
        activeCard.date === overCard.date &&
        activeCard.zone === overCard.zone
      ) {
        updateCards((prev) => {
          const containerCards = prev
            .filter((c) => c.date === activeCard.date && c.zone === activeCard.zone)
            .sort((a, b) => (a.order || 0) - (b.order || 0));

          const oldIndex = containerCards.findIndex((c) => c.id === active.id);
          const newIndex = containerCards.findIndex((c) => c.id === over.id);

          if (oldIndex === -1 || newIndex === -1) return prev;

          const reordered = arrayMove(containerCards, oldIndex, newIndex);
          const orderMap = {};
          reordered.forEach((c, i) => {
            orderMap[c.id] = i;
          });

          return prev.map((c) =>
            orderMap[c.id] != null ? { ...c, order: orderMap[c.id] } : c
          );
        });
      } else {
        // Card was dragged to a different container — persist current state
        persistCards(latestCardsRef.current);
      }
    },
    [updateCards, persistCards]
  );

  const activeCard = activeId ? cards.find((c) => c.id === activeId) : null;

  return {
    cards,
    weekCards,
    monthCards,
    cardsByDate,
    totals,
    monthlyTotals,
    editingCard,
    activeId,
    activeCard,
    loaded,
    overheads,
    cogs,
    weekCogs,
    monthCogs,
    pendingChange,
    handlers: {
      handleToggle,
      handleCardClick,
      handleSave,
      handleDelete,
      handleAddCard,
      handleReset,
      handleDragStart,
      handleDragOver,
      handleDragEnd,
      setEditingCard,
      confirmChange,
      cancelChange,
      handleAddOverhead,
      handleDeleteOverhead,
      handleAddCOGS,
      handleDeleteCOGS,
      handleAddWhatIf,
      handleRemoveWhatIf,
      handleApplyWhatIf,
    },
  };
}
