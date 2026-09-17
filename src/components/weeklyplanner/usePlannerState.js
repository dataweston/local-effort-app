import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { generateCardsForRange } from './defaultSchedule';
import {
  getWeekDates,
  getWeekStart,
  getToday,
  getDayOfWeek,
  addWeeks,
  getMonthWeeks,
} from './dateUtils';
import { weekTotalsWithActual, monthTotals as computeMonthTotals } from './financials';

function createPlannerId(prefix) {
  const uniquePart =
    globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${uniquePart}`;
}

export function usePlannerState({ mode = 'demo', accessToken = null, weekStart, selectedMonth }) {
  const [cards, setCards] = useState([]);
  const [workBlocks, setWorkBlocks] = useState([]);
  const [editingCard, setEditingCard] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [overheads, setOverheads] = useState([]);
  const [cogs, setCogs] = useState([]);
  const [pendingChange, setPendingChange] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [integrationWarning, setIntegrationWarning] = useState(null);
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
      setWorkBlocks([]);
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
      .then(async (r) => {
        if (!r.ok) {
          let details = '';
          try {
            details = await r.text();
          } catch (_err) {
            details = '';
          }
          throw new Error(`Planner cards request failed (${r.status}) ${details.slice(0, 160)}`);
        }
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        setCards(data.cards || []);
        setWorkBlocks(data.workBlocks || []);
        setLoaded(true);
      })
      .catch((err) => {
        if (cancelled) return;
        // Keep the schedule usable without manufacturing a large speculative calendar.
        console.error('Failed to load planner cards.', err);
        setCards([]);
        setWorkBlocks([]);
        setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
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
    return () => {
      cancelled = true;
    };
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
    return () => {
      cancelled = true;
    };
  }, [mode, accessToken]);

  // Cards for the current week
  const weekCards = useMemo(() => {
    const dateSet = new Set(weekDates);
    return cards.filter((c) => dateSet.has(c.date) && c.objectType !== 'revenue');
  }, [cards, weekDates]);

  const actualsByDate = useMemo(() => {
    const result = {};
    for (const card of cards) {
      if (card.objectType === 'revenue' && card.date) result[card.date] = card;
    }
    return result;
  }, [cards]);

  // Cards grouped by date
  const cardsByDate = useMemo(() => {
    const map = {};
    for (const date of weekDates) map[date] = [];
    for (const card of cards) {
      if (map[card.date] && card.objectType !== 'revenue') map[card.date].push(card);
    }
    return map;
  }, [cards, weekDates]);

  // COGS filtered to current week
  const weekCogs = useMemo(() => {
    return cogs.filter((c) => c.weekStart === effectiveWeekStart);
  }, [cogs, effectiveWeekStart]);

  const totals = useMemo(
    () => weekTotalsWithActual(weekCards, actualsByDate),
    [weekCards, actualsByDate]
  );

  // Month-level cards and totals (for monthly view top bar)
  const monthCards = useMemo(() => {
    if (!selectedMonth) return [];
    const [y, m] = selectedMonth.split('-').map(Number);
    const weekStarts = getMonthWeeks(y, m);
    const allDates = new Set();
    for (const ws of weekStarts) {
      for (const d of getWeekDates(ws)) allDates.add(d);
    }
    return cards.filter((c) => allDates.has(c.date) && c.objectType !== 'revenue');
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
    () => computeMonthTotals(monthCards, overheads, monthCogs, undefined, actualsByDate),
    [monthCards, overheads, monthCogs, actualsByDate]
  );

  const latestCardsRef = useRef(cards);
  latestCardsRef.current = cards;
  const pendingUpsertsRef = useRef(new Map());
  const pendingDeleteIdsRef = useRef(new Set());
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const flushChangesRef = useRef(null);

  const scheduleSave = useCallback((delay = 800) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      flushChangesRef.current?.();
    }, delay);
  }, []);

  const flushChangesNow = useCallback(async () => {
    if (mode !== 'persisted' || !accessToken || savingRef.current) return;

    const upserts = [...pendingUpsertsRef.current.values()];
    const deleteIds = [...pendingDeleteIdsRef.current];
    if (upserts.length === 0 && deleteIds.length === 0) {
      dirtyRef.current = false;
      return;
    }

    pendingUpsertsRef.current.clear();
    pendingDeleteIdsRef.current.clear();
    dirtyRef.current = false;
    savingRef.current = true;
    let failed = false;

    try {
      const response = await fetch('/api/planner/cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ action: 'apply-changes', upserts, deleteIds }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const details = data.error || JSON.stringify(data);
        throw new Error(`Planner save failed (${response.status}) ${details.slice(0, 160)}`);
      }
      const changedIds = new Set([...upserts.map((card) => card.id), ...deleteIds]);
      const deletedIds = new Set(deleteIds);
      setWorkBlocks((current) => [
        ...current.filter((block) => !changedIds.has(block.plannerCardId)),
        ...(data.workBlocks || []).filter((block) => !deletedIds.has(block.plannerCardId)),
      ]);
      if (data.lifecycle?.ok === false) {
        const failures = Object.entries(data.lifecycle.integrations || {})
          .filter(([, result]) => result?.ok === false)
          .map(([name, result]) => `${name}: ${result.error || 'reconciliation failed'}`);
        setIntegrationWarning(failures.join(' · ') || 'A planner integration needs attention.');
      } else {
        setIntegrationWarning(null);
      }
      setSaveError(null);
    } catch (err) {
      failed = true;
      for (const card of upserts) {
        if (!pendingDeleteIdsRef.current.has(card.id) && !pendingUpsertsRef.current.has(card.id)) {
          pendingUpsertsRef.current.set(card.id, card);
        }
      }
      for (const id of deleteIds) {
        if (!pendingUpsertsRef.current.has(id)) pendingDeleteIdsRef.current.add(id);
      }
      setSaveError('Planner changes could not be saved. Your edits are queued locally.');
      console.error('Planner save error:', err);
    } finally {
      savingRef.current = false;
      dirtyRef.current = pendingUpsertsRef.current.size > 0 || pendingDeleteIdsRef.current.size > 0;
      if (!failed && dirtyRef.current) scheduleSave(100);
    }
  }, [mode, accessToken, scheduleSave]);

  flushChangesRef.current = flushChangesNow;

  const queueCardChanges = useCallback(
    (previousCards, nextCards) => {
      if (mode !== 'persisted' || !accessToken) return;

      const previousById = new Map(previousCards.map((card) => [card.id, card]));
      const nextIds = new Set(nextCards.map((card) => card.id));

      for (const previous of previousCards) {
        if (!nextIds.has(previous.id)) {
          pendingUpsertsRef.current.delete(previous.id);
          pendingDeleteIdsRef.current.add(previous.id);
        }
      }

      for (const card of nextCards) {
        if (previousById.get(card.id) !== card) {
          pendingDeleteIdsRef.current.delete(card.id);
          pendingUpsertsRef.current.set(card.id, card);
        }
      }

      dirtyRef.current = pendingUpsertsRef.current.size > 0 || pendingDeleteIdsRef.current.size > 0;
      if (dirtyRef.current) scheduleSave();
    },
    [mode, accessToken, scheduleSave]
  );

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!dirtyRef.current || mode !== 'persisted' || !accessToken) return;
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/planner/cards', false);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
        xhr.send(
          JSON.stringify({
            action: 'apply-changes',
            upserts: [...pendingUpsertsRef.current.values()],
            deleteIds: [...pendingDeleteIdsRef.current],
          })
        );
      } catch (_err) {
        // Best effort while the page is unloading.
      }
      dirtyRef.current = false;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [mode, accessToken]);

  const updateCards = useCallback(
    (updater) => {
      setCards((previous) => {
        const next = typeof updater === 'function' ? updater(previous) : updater;
        queueCardChanges(previous, next);
        return next;
      });
    },
    [queueCardChanges]
  );

  const handleToggle = useCallback(
    (cardId) => {
      updateCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, enabled: !c.enabled } : c)));
    },
    [updateCards]
  );

  const handleCardClick = useCallback((card) => {
    setEditingCard(card);
  }, []);
  const handleExternalCardApplied = useCallback((card) => {
    if (!card?.id) return;
    const normalized = { ...card, order: card.order ?? card.sortOrder ?? 0 };
    setCards((prev) => [...prev.filter((item) => item.id !== normalized.id), normalized]);
  }, []);

  const handleSave = useCallback(
    (updatedCard) => {
      // If "repeat weekly" was toggled on a new card, generate weekly copies
      if (updatedCard._repeatWeekly && !updatedCard.templateId) {
        const cardData = { ...updatedCard };
        delete cardData._repeatWeekly;
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
          const dayIndex = [
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
            'Sunday',
          ].indexOf(baseCard.dayOfWeek);
          if (dayIndex >= 0 && weekDts[dayIndex]) {
            copies.push({
              ...baseCard,
              id: createPlannerId('card'),
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
        const clean = { ...updatedCard };
        delete clean._repeatWeekly;
        updateCards((prev) => prev.map((c) => (c.id === clean.id ? clean : c)));
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
          updateCards((prev) => prev.map((c) => (c.id === card.id ? card : c)));
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
                  revenueCents: card.revenueCents,
                  cashReceivedCents: card.cashReceivedCents,
                  cost: card.cost,
                  costCents: card.costCents,
                  costPerHour: card.costPerHour,
                  costPerHourCents: card.costPerHourCents,
                  financialStatus: card.financialStatus,
                  financialSource: card.financialSource,
                  financialMetadata: card.financialMetadata,
                  notes: card.notes,
                  optional: card.optional,
                  enabled: card.enabled,
                  effectType: card.effectType,
                };
              }
              return c;
            })
          );
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
        }
        setEditingCard(null);
      }

      setPendingChange(null);
    },
    [pendingChange, updateCards]
  );

  const cancelChange = useCallback(() => {
    setPendingChange(null);
  }, []);

  const handleAddCard = useCallback(
    (date, objectType = 'shift') => {
      const isEvent = objectType === 'event';
      const newCard = {
        id: createPlannerId('card'),
        templateId: null,
        title: isEvent ? 'New event' : objectType === 'prep_task' ? 'New prep task' : 'New shift',
        date,
        dayOfWeek: getDayOfWeek(date),
        zone: objectType === 'prep_task' ? 'untimed' : 'timed',
        objectType,
        people: [],
        startTime: null,
        endTime: null,
        revenue: 0,
        revenueCents: null,
        cashReceivedCents: 0,
        cost: 0,
        costCents: null,
        costPerHour: null,
        costPerHourCents: null,
        financialStatus: 'planned',
        financialSource: 'planner_manual',
        financialMetadata: isEvent ? { prepSchedulingStatus: 'needs_schedule' } : null,
        notes: null,
        optional: false,
        enabled: true,
        effectTarget: null,
        effectType: null,
        order: 99,
        status: isEvent ? 'inquiry' : 'todo',
        projectId: null,
        assigneeId: null,
        priority: 0,
        dueDate: null,
      };
      updateCards((prev) => [...prev, newCard]);
      setEditingCard(newCard);
    },
    [updateCards]
  );

  const handleUpsertRevenueActual = useCallback(
    (date, value, note = '') => {
      const amountCents =
        value === '' || value == null ? null : Math.max(0, Math.round(Number(value) * 100));
      updateCards((prev) => {
        const without = prev.filter(
          (card) => !(card.objectType === 'revenue' && card.date === date)
        );
        if (amountCents == null || Number.isNaN(amountCents)) return without;
        return [
          ...without,
          {
            id: createPlannerId('revenue'),
            templateId: null,
            title: note.trim() || 'Actual revenue',
            date,
            dayOfWeek: getDayOfWeek(date),
            zone: 'untimed',
            objectType: 'revenue',
            people: [],
            startTime: null,
            endTime: null,
            revenue: Math.round(amountCents / 100),
            revenueCents: amountCents,
            cashReceivedCents: amountCents,
            cost: 0,
            costCents: 0,
            costPerHour: null,
            costPerHourCents: null,
            financialStatus: 'actual',
            financialSource: 'owner_entry',
            financialMetadata: null,
            notes: note.trim() || null,
            optional: false,
            enabled: true,
            effectTarget: null,
            effectType: null,
            order: 0,
          },
        ];
      });
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
      const newItem = { ...item, id: item.id || createPlannerId('overhead') };
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
      const newItem = {
        ...item,
        id: item.id || createPlannerId('cogs'),
        weekStart: effectiveWeekStart,
      };
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
      const dayIndex = [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ].indexOf(dayOfWeek);
      const templateKey = createPlannerId('whatif');

      const year = parseInt(today.split('-')[0], 10);
      const endDate = `${year}-12-31`;
      const copies = [];

      let currWs = ws;
      const lastWeek = getWeekStart(endDate);
      while (currWs <= lastWeek) {
        const dates = getWeekDates(currWs);
        if (dayIndex >= 0 && dates[dayIndex]) {
          copies.push({
            id: createPlannerId('card'),
            templateId: templateKey,
            title,
            date: dates[dayIndex],
            dayOfWeek,
            zone: 'timed',
            objectType: 'shift',
            people: [],
            startTime: startTime || null,
            endTime: endTime || null,
            revenue: 0,
            revenueCents: null,
            cashReceivedCents: 0,
            cost: 0,
            costCents: null,
            costPerHour: Number(costPerHour) || 0,
            costPerHourCents: costPerHour ? Math.round(Number(costPerHour) * 100) : null,
            financialStatus: 'planned',
            financialSource: 'weeklydemo',
            financialMetadata: null,
            notes: null,
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
        prev.map((c) => (c.id === cardId ? { ...c, optional: false, enabled: true } : c))
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
      if (activeCard.date === targetContainer.date && activeCard.zone === targetContainer.zone)
        return;

      updateCards((prev) =>
        prev.map((c) =>
          c.id === active.id
            ? {
                ...c,
                date: targetContainer.date,
                zone: targetContainer.zone,
                dayOfWeek: getDayOfWeek(targetContainer.date),
              }
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

      if (!over || active.id === over.id) return;

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

          return prev.map((c) => (orderMap[c.id] != null ? { ...c, order: orderMap[c.id] } : c));
        });
      }
    },
    [updateCards]
  );

  const handleCalendarSyncResult = useCallback((result) => {
    const updates = new Map((result?.results || []).map((entry) => [entry.blockId, entry]));
    const errors = new Map((result?.errors || []).map((entry) => [entry.blockId, entry]));
    setWorkBlocks((current) =>
      current.map((block) => {
        const failure = errors.get(block.id);
        if (failure) return { ...block, syncStatus: 'error', syncError: failure.error };
        const update = updates.get(block.id);
        if (!update) return block;
        return {
          ...block,
          syncStatus: update.syncStatus,
          syncError: null,
          googleEventId:
            update.googleEventId || (update.action === 'delete' ? null : block.googleEventId),
          lastSyncedAt: new Date().toISOString(),
        };
      })
    );
    setIntegrationWarning(
      result?.errors?.length ? `Google Calendar: ${result.errors[0].error}` : null
    );
  }, []);

  const activeCard = activeId ? cards.find((c) => c.id === activeId) : null;

  return {
    cards: cards.filter((c) => c.objectType !== 'revenue'),
    allCards: cards,
    weekCards,
    monthCards,
    cardsByDate,
    workBlocks,
    totals,
    monthlyTotals,
    actualsByDate,
    editingCard,
    activeId,
    activeCard,
    loaded,
    saveError,
    overheads,
    cogs,
    weekCogs,
    integrationWarning,
    monthCogs,
    pendingChange,
    handlers: {
      handleToggle,
      handleCardClick,
      handleExternalCardApplied,
      handleSave,
      handleDelete,
      handleAddCard,
      handleUpsertRevenueActual,
      handleReset,
      handleDragStart,
      handleDragOver,
      handleDragEnd,
      setEditingCard,
      confirmChange,
      handleCalendarSyncResult,
      cancelChange,
      retrySave: flushChangesNow,
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
