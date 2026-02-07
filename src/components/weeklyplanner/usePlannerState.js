import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { generateCardsForRange } from './defaultSchedule';
import { getWeekDates, getWeekStart, getToday, getDayOfWeek } from './dateUtils';
import { weekTotals } from './financials';

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

  // Demo mode: start with an empty calendar (public visitors see blank)
  useEffect(() => {
    if (mode === 'demo' && !initRef.current) {
      initRef.current = true;
      setCards([]);
      setLoaded(true);
    }
  }, [mode]);

  // Load cards from API in persisted mode
  useEffect(() => {
    if (mode !== 'persisted' || !accessToken) return;
    let cancelled = false;

    const params = new URLSearchParams();
    if (selectedMonth) params.set('month', selectedMonth);
    else if (weekStart) params.set('weekStart', weekStart);

    fetch(`/api/planner/cards?${params}`, {
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

  // Load COGS for current week in persisted mode
  useEffect(() => {
    if (mode !== 'persisted' || !accessToken || !weekStart) return;
    let cancelled = false;
    fetch(`/api/planner/cogs?weekStart=${weekStart}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.items) setCogs(data.items);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [mode, accessToken, weekStart]);

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

  const totals = useMemo(() => weekTotals(weekCards), [weekCards]);

  // Debounced save
  const persistCards = useCallback(
    (nextCards) => {
      if (mode !== 'persisted' || !accessToken) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        fetch('/api/planner/cards', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ action: 'save-all', cards: nextCards }),
        }).catch(() => {});
      }, 800);
    },
    [mode, accessToken]
  );

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
      if (updatedCard.templateId) {
        setPendingChange({ type: 'save', card: updatedCard });
      } else {
        updateCards((prev) =>
          prev.map((c) => (c.id === updatedCard.id ? updatedCard : c))
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
        persistCards(cards);
        return;
      }

      const activeCard = cards.find((c) => c.id === active.id);
      const overCard = cards.find((c) => c.id === over.id);

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
        persistCards(cards);
      }
    },
    [cards, updateCards, persistCards]
  );

  const activeCard = activeId ? cards.find((c) => c.id === activeId) : null;

  return {
    cards,
    weekCards,
    cardsByDate,
    totals,
    editingCard,
    activeId,
    activeCard,
    loaded,
    overheads,
    cogs,
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
    },
  };
}
