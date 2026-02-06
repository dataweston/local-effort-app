import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { DAYS, createDefaultCards } from './defaultSchedule';
import { weekTotals } from './financials';

let _nextCardId = 100;

export function usePlannerState({ mode = 'demo', accessToken = null }) {
  const [cards, setCards] = useState(() => createDefaultCards());
  const [editingCard, setEditingCard] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [loaded, setLoaded] = useState(mode === 'demo');
  const saveTimer = useRef(null);

  // Load cards from API in persisted mode
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
        }
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => { cancelled = true; };
  }, [mode, accessToken]);

  // Debounced save for persisted mode
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

  // Grouped cards by day
  const cardsByDay = useMemo(() => {
    const map = {};
    for (const day of DAYS) map[day] = [];
    for (const card of cards) {
      if (map[card.day]) map[card.day].push(card);
    }
    return map;
  }, [cards]);

  // Week totals
  const totals = useMemo(() => weekTotals(cards), [cards]);

  // Helper: update cards and persist
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
      updateCards((prev) =>
        prev.map((c) => (c.id === updatedCard.id ? updatedCard : c))
      );
      setEditingCard(null);
    },
    [updateCards]
  );

  const handleDelete = useCallback(
    (cardId) => {
      updateCards((prev) => prev.filter((c) => c.id !== cardId));
      setEditingCard(null);
    },
    [updateCards]
  );

  const handleAddCard = useCallback(
    (day) => {
      const newCard = {
        id: String(++_nextCardId),
        title: 'New card',
        day,
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
    const defaults = createDefaultCards();
    updateCards(defaults);
    setEditingCard(null);
  }, [updateCards]);

  // Drag & Drop handlers
  const parseDroppable = (id) => {
    if (!id) return null;
    const str = String(id);
    const sep = str.lastIndexOf(':');
    if (sep === -1) return null;
    return { day: str.slice(0, sep), zone: str.slice(sep + 1) };
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
      if (parsed && DAYS.includes(parsed.day)) {
        targetContainer = parsed;
      } else {
        const overCard = cards.find((c) => c.id === over.id);
        if (overCard) {
          targetContainer = { day: overCard.day, zone: overCard.zone };
        }
      }

      if (!targetContainer) return;
      if (activeCard.day === targetContainer.day && activeCard.zone === targetContainer.zone) return;

      setCards((prev) =>
        prev.map((c) =>
          c.id === active.id
            ? { ...c, day: targetContainer.day, zone: targetContainer.zone }
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
        // Still persist any container changes from dragOver
        persistCards(cards);
        return;
      }

      const activeCard = cards.find((c) => c.id === active.id);
      const overCard = cards.find((c) => c.id === over.id);

      if (
        activeCard &&
        overCard &&
        activeCard.day === overCard.day &&
        activeCard.zone === overCard.zone
      ) {
        updateCards((prev) => {
          const containerCards = prev
            .filter((c) => c.day === activeCard.day && c.zone === activeCard.zone)
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
    cardsByDay,
    totals,
    editingCard,
    activeId,
    activeCard,
    loaded,
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
    },
  };
}
