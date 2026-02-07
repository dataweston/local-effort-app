import React, { useState } from 'react';
import { ToggleLeft, ToggleRight, Plus, Trash2, Check } from 'lucide-react';
import { cardCost, hoursFromTimes } from './financials';

export function WhatIfPanel({ cards, onToggle, onAdd, onRemove, onApply }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDay, setNewDay] = useState('Monday');
  const [newCostPerHour, setNewCostPerHour] = useState(0);
  const [newStartTime, setNewStartTime] = useState('08:00');
  const [newEndTime, setNewEndTime] = useState('16:00');

  const optionalCards = cards.filter((c) => c.optional);

  // Deduplicate by templateId so recurring cards show once.
  const seen = new Map();
  const uniqueCards = [];
  for (const card of optionalCards) {
    const key = card.templateId || card.id;
    if (!seen.has(key)) {
      seen.set(key, []);
      uniqueCards.push(card);
    }
    seen.get(key).push(card.id);
  }

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    onAdd({
      title: newTitle.trim(),
      dayOfWeek: newDay,
      costPerHour: Number(newCostPerHour) || 0,
      startTime: newStartTime || null,
      endTime: newEndTime || null,
    });
    setNewTitle('');
    setNewCostPerHour(0);
    setShowAddForm(false);
  };

  const inputClass = 'w-full rounded-lg px-3 py-2 text-[16px] outline-none border';

  return (
    <div
      className="rounded-xl p-4 border"
      style={{
        backgroundColor: 'var(--color-bg-card)',
        borderColor: 'var(--color-border-default)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3
          className="text-sm font-semibold font-display"
          style={{ color: 'var(--color-text-primary)' }}
        >
          What-If Toggles
        </h3>
        {onAdd && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition-colors touch-target-ios"
            style={{ color: 'var(--color-action-primary-bg)' }}
          >
            <Plus size={14} />
            Add
          </button>
        )}
      </div>
      <p
        className="text-xs mb-4"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Toggle optional labor to preview impact. Apply to make permanent.
      </p>

      {/* Add form */}
      {showAddForm && (
        <div
          className="mb-4 p-3 rounded-lg border space-y-3"
          style={{
            borderColor: 'var(--color-border-default)',
            backgroundColor: 'var(--color-bg-page)',
          }}
        >
          <input
            type="text"
            placeholder="Title (e.g. Second cook)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className={inputClass}
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={newDay}
              onChange={(e) => setNewDay(e.target.value)}
              className={inputClass}
            >
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              placeholder="$/hr"
              value={newCostPerHour}
              onChange={(e) => setNewCostPerHour(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="time"
              value={newStartTime}
              onChange={(e) => setNewStartTime(e.target.value)}
              className={inputClass}
            />
            <input
              type="time"
              value={newEndTime}
              onChange={(e) => setNewEndTime(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              className="px-3 py-1.5 text-xs font-medium rounded-lg"
              style={{
                backgroundColor: 'var(--color-action-primary-bg)',
                color: 'var(--color-action-primary-text)',
              }}
            >
              Add What-If
            </button>
          </div>
        </div>
      )}

      {uniqueCards.length === 0 && !showAddForm && (
        <p className="text-xs text-center py-3" style={{ color: 'var(--color-text-muted)' }}>
          No what-if items yet. Add one or mark a card as optional in the editor.
        </p>
      )}

      <div className="space-y-3">
        {uniqueCards.map((card) => {
          const hours = hoursFromTimes(card.startTime, card.endTime);
          const weeklyLabor = card.enabled ? cardCost(card) : (card.costPerHour || 0) * hours;
          const instanceCount = seen.get(card.templateId || card.id).length;
          const monthlyLabor = weeklyLabor * instanceCount;
          const hasEffect = card.effectType === 'double_revenue' && card.effectTarget;
          const allIds = seen.get(card.templateId || card.id);

          return (
            <div
              key={card.templateId || card.id}
              className="flex items-center justify-between gap-2 rounded-lg p-3 border"
              style={{
                borderColor: 'var(--color-border-default)',
                backgroundColor: 'var(--color-bg-page)',
              }}
            >
              <div className="flex-1 min-w-0">
                <div
                  className="text-sm font-medium truncate"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {card.title}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {card.dayOfWeek || card.day}
                  {hours > 0 && ` · ${hours}h`}
                  {monthlyLabor > 0 && (
                    <span style={{ color: 'var(--color-state-danger)' }}>
                      {' '}· −${monthlyLabor}/mo labor
                    </span>
                  )}
                  {hasEffect && (
                    <span style={{ color: 'var(--brand-ink)' }}> · 2× revenue</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Apply to calendar (make permanent) */}
                {card.enabled && onApply && (
                  <button
                    onClick={() => {
                      for (const id of allIds) onApply(id);
                    }}
                    className="p-1.5 rounded transition-colors touch-target-ios"
                    style={{ color: 'var(--color-state-success)' }}
                    title="Apply to calendar (make permanent)"
                  >
                    <Check size={16} />
                  </button>
                )}

                {/* Remove */}
                {onRemove && (
                  <button
                    onClick={() => {
                      for (const id of allIds) onRemove(id);
                    }}
                    className="p-1.5 rounded transition-colors touch-target-ios"
                    style={{ color: 'var(--color-state-danger)' }}
                    title="Remove what-if"
                  >
                    <Trash2 size={14} />
                  </button>
                )}

                {/* Toggle */}
                <button
                  onClick={() => {
                    for (const id of allIds) onToggle(id);
                  }}
                  className="flex-shrink-0 touch-target-ios flex items-center justify-center"
                  aria-label={card.enabled ? 'Disable' : 'Enable'}
                >
                  {card.enabled ? (
                    <ToggleRight size={28} style={{ color: 'var(--color-action-primary-bg)' }} />
                  ) : (
                    <ToggleLeft size={28} style={{ color: 'var(--color-text-muted)' }} />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
