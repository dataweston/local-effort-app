import React, { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Plus, DollarSign, RotateCcw } from 'lucide-react';
import { DAYS, createDefaultCards } from '../components/weeklyplanner/defaultSchedule';
import { weekTotals } from '../components/weeklyplanner/financials';
import { DayLane } from '../components/weeklyplanner/DayLane';
import { EditPanel } from '../components/weeklyplanner/EditPanel';

let _nextCardId = 100;

export default function WeeklyDemoPage() {
  const [cards, setCards] = useState(() => createDefaultCards());
  const [editingCard, setEditingCard] = useState(null);
  const [activeId, setActiveId] = useState(null);

  // ── Sensors ────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  // ── Grouped cards by day ────────────────────────────────
  const cardsByDay = useMemo(() => {
    const map = {};
    for (const day of DAYS) map[day] = [];
    for (const card of cards) {
      if (map[card.day]) map[card.day].push(card);
    }
    return map;
  }, [cards]);

  // ── Week totals ─────────────────────────────────────────
  const totals = useMemo(() => weekTotals(cards), [cards]);

  // ── Toggle optional card ────────────────────────────────
  const handleToggle = useCallback((cardId) => {
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, enabled: !c.enabled } : c))
    );
  }, []);

  // ── Open edit panel ─────────────────────────────────────
  const handleCardClick = useCallback((card) => {
    setEditingCard(card);
  }, []);

  // ── Save edited card ────────────────────────────────────
  const handleSave = useCallback((updatedCard) => {
    setCards((prev) =>
      prev.map((c) => (c.id === updatedCard.id ? updatedCard : c))
    );
    setEditingCard(null);
  }, []);

  // ── Delete card ─────────────────────────────────────────
  const handleDelete = useCallback((cardId) => {
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    setEditingCard(null);
  }, []);

  // ── Add new card ────────────────────────────────────────
  const handleAddCard = useCallback((day) => {
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
    setCards((prev) => [...prev, newCard]);
    setEditingCard(newCard);
  }, []);

  // ── Reset to defaults ──────────────────────────────────
  const handleReset = useCallback(() => {
    setCards(createDefaultCards());
    setEditingCard(null);
  }, []);

  // ── Drag & Drop handlers ───────────────────────────────
  // Parse a droppable ID like "Monday:timed" → { day, zone }
  const parseDroppable = (id) => {
    if (!id) return null;
    const str = String(id);
    const sep = str.lastIndexOf(':');
    if (sep === -1) return null;
    return { day: str.slice(0, sep), zone: str.slice(sep + 1) };
  };

  // Find which droppable container a card belongs to
  const findContainer = (cardId) => {
    const card = cards.find((c) => c.id === cardId);
    if (card) return `${card.day}:${card.zone}`;
    return null;
  };

  const handleDragStart = useCallback((event) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragOver = useCallback((event) => {
    const { active, over } = event;
    if (!over) return;

    const activeCard = cards.find((c) => c.id === active.id);
    if (!activeCard) return;

    // Determine the target container
    let targetContainer = null;

    // Check if dropped over a droppable zone
    const parsed = parseDroppable(over.id);
    if (parsed && DAYS.includes(parsed.day)) {
      targetContainer = parsed;
    } else {
      // Dropped over another card — find that card's container
      const overCard = cards.find((c) => c.id === over.id);
      if (overCard) {
        targetContainer = { day: overCard.day, zone: overCard.zone };
      }
    }

    if (!targetContainer) return;
    if (activeCard.day === targetContainer.day && activeCard.zone === targetContainer.zone) return;

    // Move to new container
    setCards((prev) =>
      prev.map((c) =>
        c.id === active.id
          ? { ...c, day: targetContainer.day, zone: targetContainer.zone }
          : c
      )
    );
  }, [cards]);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    // If dropped on another card in the same container, reorder
    const activeCard = cards.find((c) => c.id === active.id);
    const overCard = cards.find((c) => c.id === over.id);

    if (activeCard && overCard && activeCard.day === overCard.day && activeCard.zone === overCard.zone) {
      setCards((prev) => {
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
    }
  }, [cards]);

  const activeCard = activeId ? cards.find((c) => c.id === activeId) : null;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1800px] mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Weekly Planner</h1>
            <p className="text-xs text-gray-500">Drag cards between days. Toggle optional labor to see financial impact.</p>
          </div>

          {/* Week totals */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 bg-gray-50 rounded-lg px-4 py-2 border border-gray-200">
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-wider text-gray-400">Revenue</div>
                <div className="text-sm font-bold text-emerald-700 flex items-center justify-center gap-0.5">
                  <DollarSign size={12} />{totals.revenue}
                </div>
              </div>
              <div className="w-px h-8 bg-gray-200" />
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-wider text-gray-400">Cost</div>
                <div className="text-sm font-bold text-red-600 flex items-center justify-center gap-0.5">
                  <DollarSign size={12} />{totals.cost}
                </div>
              </div>
              <div className="w-px h-8 bg-gray-200" />
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-wider text-gray-400">Net</div>
                <div className={`text-sm font-bold flex items-center justify-center gap-0.5 ${totals.net >= 0 ? 'text-emerald-800' : 'text-red-700'}`}>
                  <DollarSign size={12} />{totals.net}
                </div>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-md border border-gray-300 transition-colors"
              title="Reset to defaults"
            >
              <RotateCcw size={14} />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="max-w-[1800px] mx-auto p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-7 gap-3">
            {DAYS.map((day) => (
              <div key={day} className="flex flex-col gap-2">
                <DayLane
                  day={day}
                  cards={cardsByDay[day]}
                  allCards={cards}
                  onToggle={handleToggle}
                  onCardClick={handleCardClick}
                />
                <button
                  onClick={() => handleAddCard(day)}
                  className="flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg border border-dashed border-gray-300 hover:border-gray-400 transition-colors"
                >
                  <Plus size={14} />
                  Add card
                </button>
              </div>
            ))}
          </div>

          <DragOverlay>
            {activeCard && (
              <div className="bg-white border border-amber-300 rounded-lg px-3 py-2.5 shadow-lg opacity-90 max-w-[220px]">
                <div className="text-sm font-medium text-gray-900">{activeCard.title}</div>
                {activeCard.people.length > 0 && (
                  <div className="text-xs text-gray-500 mt-0.5">{activeCard.people.join(', ')}</div>
                )}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Edit side panel */}
      {editingCard && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setEditingCard(null)}
          />
          <EditPanel
            card={editingCard}
            onSave={handleSave}
            onDelete={handleDelete}
            onClose={() => setEditingCard(null)}
          />
        </>
      )}
    </div>
  );
}
