import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { PEOPLE } from './defaultSchedule';
import { getDayOfWeek } from './dateUtils';

export function EditPanel({ card, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(card);

  useEffect(() => {
    setForm(card);
  }, [card]);

  if (!card) return null;

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleDateChange = (newDate) => {
    setForm((prev) => ({
      ...prev,
      date: newDate,
      dayOfWeek: getDayOfWeek(newDate),
    }));
  };

  const togglePerson = (person) => {
    setForm((prev) => ({
      ...prev,
      people: prev.people.includes(person)
        ? prev.people.filter((p) => p !== person)
        : [...prev.people, person],
    }));
  };

  const handleSave = () => {
    onSave(form);
  };

  const inputClass =
    'w-full rounded-lg px-3 py-2 text-[16px] outline-none transition-all';

  return (
    <div
      className="fixed inset-y-0 right-0 w-full md:max-w-sm shadow-xl z-50 flex flex-col"
      style={{
        backgroundColor: 'var(--color-bg-page)',
        borderLeft: '1px solid var(--color-border-default)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 safe-area-top"
        style={{
          borderBottom: '1px solid var(--color-border-default)',
          backgroundColor: 'var(--color-bg-card)',
        }}
      >
        <h2
          className="text-sm font-semibold font-display"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Edit Card
        </h2>
        <button
          onClick={onClose}
          className="p-2 rounded transition-colors touch-target-ios"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            Title
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            Date
          </label>
          <input
            type="date"
            value={form.date || ''}
            onChange={(e) => handleDateChange(e.target.value)}
            className={inputClass}
          />
          {form.dayOfWeek && (
            <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {form.dayOfWeek}
            </div>
          )}
        </div>

        {/* Zone */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            Zone
          </label>
          <div className="flex gap-2">
            {['timed', 'untimed'].map((z) => (
              <button
                key={z}
                onClick={() => set('zone', z)}
                className="flex-1 py-2 text-xs font-medium rounded-lg border transition-colors touch-target-ios"
                style={
                  form.zone === z
                    ? {
                        backgroundColor: 'color-mix(in srgb, var(--color-action-primary-bg) 20%, transparent)',
                        borderColor: 'var(--color-action-primary-border)',
                        color: 'var(--color-text-primary)',
                      }
                    : {
                        backgroundColor: 'var(--color-bg-card)',
                        borderColor: 'var(--color-border-default)',
                        color: 'var(--color-text-secondary)',
                      }
                }
              >
                {z.charAt(0).toUpperCase() + z.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* People */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            People
          </label>
          <div className="flex gap-2 flex-wrap">
            {PEOPLE.map((p) => (
              <button
                key={p}
                onClick={() => togglePerson(p)}
                className="px-3 py-1.5 text-xs font-medium rounded-full border transition-colors touch-target-ios"
                style={
                  form.people.includes(p)
                    ? {
                        backgroundColor: 'color-mix(in srgb, var(--brand-olive) 15%, transparent)',
                        borderColor: 'var(--brand-olive)',
                        color: 'var(--color-text-primary)',
                      }
                    : {
                        backgroundColor: 'var(--color-bg-card)',
                        borderColor: 'var(--color-border-default)',
                        color: 'var(--color-text-secondary)',
                      }
                }
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              Start time
            </label>
            <input
              type="time"
              value={form.startTime || ''}
              onChange={(e) => set('startTime', e.target.value || null)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              End time
            </label>
            <input
              type="time"
              value={form.endTime || ''}
              onChange={(e) => set('endTime', e.target.value || null)}
              className={inputClass}
            />
          </div>
        </div>

        {/* Revenue */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            Revenue ($)
          </label>
          <input
            type="number"
            min="0"
            value={form.revenue}
            onChange={(e) => set('revenue', Number(e.target.value))}
            className={inputClass}
          />
        </div>

        {/* Labor */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              Flat labor ($)
            </label>
            <input
              type="number"
              min="0"
              value={form.cost}
              onChange={(e) => set('cost', Number(e.target.value))}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              Labor/hr ($)
            </label>
            <input
              type="number"
              min="0"
              value={form.costPerHour || 0}
              onChange={(e) => set('costPerHour', Number(e.target.value))}
              className={inputClass}
            />
          </div>
        </div>

        {/* Optional toggle */}
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Optional (off by default)
          </label>
          <button
            onClick={() => set('optional', !form.optional)}
            className="w-11 h-6 rounded-full transition-colors relative"
            style={{
              backgroundColor: form.optional
                ? 'var(--color-action-primary-bg)'
                : 'var(--color-border-default)',
            }}
          >
            <span
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
              style={{ left: form.optional ? '22px' : '2px' }}
            />
          </button>
        </div>

        {/* Effect target */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            Revenue effect
          </label>
          <select
            value={form.effectType || ''}
            onChange={(e) => set('effectType', e.target.value || null)}
            className={inputClass}
          >
            <option value="">None</option>
            <option value="double_revenue">Double revenue</option>
          </select>
          {form.effectType && (
            <div className="mt-2">
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                Target card ID
              </label>
              <input
                type="text"
                value={form.effectTarget || ''}
                onChange={(e) => set('effectTarget', e.target.value || null)}
                placeholder="Card ID to affect"
                className={inputClass}
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between px-4 py-3 safe-area-bottom"
        style={{
          borderTop: '1px solid var(--color-border-default)',
          backgroundColor: 'var(--color-bg-card)',
        }}
      >
        <button
          onClick={() => onDelete(card.id)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-colors touch-target-ios"
          style={{ color: 'var(--color-state-danger)' }}
        >
          <Trash2 size={14} />
          Delete
        </button>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 text-xs font-medium rounded-md transition-colors touch-target-ios"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-xs font-medium rounded-md transition-colors touch-target-ios"
            style={{
              backgroundColor: 'var(--color-action-primary-bg)',
              color: 'var(--color-action-primary-text)',
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
