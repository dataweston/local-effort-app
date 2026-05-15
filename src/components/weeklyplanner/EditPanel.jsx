import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { PEOPLE } from './defaultSchedule';
import { getDayOfWeek } from './dateUtils';

const STATUSES = [
  { key: 'todo',        label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'blocked',     label: 'Blocked' },
  { key: 'done',        label: 'Done' },
];

const PRIORITY_LABELS = ['Low', 'Medium', 'High', 'Critical'];

function useProjects(accessToken) {
  const [projects, setProjects] = useState([]);
  useEffect(() => {
    if (!accessToken) return;
    fetch('/api/planner/projects', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => { if (d.projects) setProjects(d.projects); })
      .catch(() => {});
  }, [accessToken]);
  return projects;
}

export function EditPanel({ card, onSave, onDelete, onClose, accessToken }) {
  const [form, setForm] = useState(card);
  const projects = useProjects(accessToken);

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
        {/* Card identifiers (read-only) */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            Card ID
          </label>
          <div
            className="w-full rounded-lg px-3 py-2 text-[13px] font-mono"
            style={{
              backgroundColor: 'var(--color-bg-card)',
              border: '1px solid var(--color-border-default)',
              color: 'var(--color-text-primary)',
              wordBreak: 'break-all',
            }}
          >
            {String(card.id)}
          </div>
          {card.templateId && (
            <div className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Template: {card.templateId}
            </div>
          )}
        </div>

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
            What-if toggle (optional)
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

        {/* Repeat weekly (only for new cards without a templateId) */}
        {!card.templateId && (
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              Repeat weekly
            </label>
            <button
              onClick={() => set('_repeatWeekly', !form._repeatWeekly)}
              className="w-11 h-6 rounded-full transition-colors relative"
              style={{
                backgroundColor: form._repeatWeekly
                  ? 'var(--color-action-primary-bg)'
                  : 'var(--color-border-default)',
              }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                style={{ left: form._repeatWeekly ? '22px' : '2px' }}
              />
            </button>
          </div>
        )}

        {/* Status */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            Status
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {STATUSES.map((s) => (
              <button
                key={s.key}
                onClick={() => set('status', s.key)}
                className="py-1.5 text-xs font-medium rounded-lg border transition-colors"
                style={
                  form.status === s.key
                    ? { backgroundColor: 'color-mix(in srgb, var(--color-action-primary-bg) 20%, transparent)', borderColor: 'var(--color-action-primary-border)', color: 'var(--color-text-primary)' }
                    : { backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border-default)', color: 'var(--color-text-secondary)' }
                }
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Project */}
        {projects.length > 0 && (
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              Project
            </label>
            <select
              value={form.projectId || ''}
              onChange={(e) => set('projectId', e.target.value || null)}
              className={inputClass}
              style={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border-default)', color: 'var(--color-text-primary)' }}
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
        )}

        {/* Priority */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            Priority
          </label>
          <div className="flex gap-1.5">
            {PRIORITY_LABELS.map((label, i) => (
              <button
                key={i}
                onClick={() => set('priority', i)}
                className="flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors"
                style={
                  form.priority === i
                    ? { backgroundColor: 'color-mix(in srgb, var(--color-action-primary-bg) 20%, transparent)', borderColor: 'var(--color-action-primary-border)', color: 'var(--color-text-primary)' }
                    : { backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border-default)', color: 'var(--color-text-secondary)' }
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Due date */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            Due date
          </label>
          <input
            type="date"
            value={form.dueDate || ''}
            onChange={(e) => set('dueDate', e.target.value || null)}
            className={inputClass}
          />
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
