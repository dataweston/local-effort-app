import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { PEOPLE } from './defaultSchedule';
import { getDayOfWeek } from './dateUtils';

const TASK_STATUSES = [
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'done', label: 'Done' },
];

const EVENT_STATUSES = [
  { key: 'inquiry', label: 'Inquiry' },
  { key: 'tentative', label: 'Tentative' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const EVENT_STATUS_KEYS = new Set(EVENT_STATUSES.map((status) => status.key));

const PRIORITY_LABELS = ['Low', 'Medium', 'High', 'Critical'];
const OBJECT_TYPES = [
  { key: 'shift', label: 'Shift' },
  { key: 'event', label: 'Event' },
  { key: 'prep_task', label: 'Prep task' },
];

function useProjects(accessToken) {
  const [projects, setProjects] = useState([]);
  useEffect(() => {
    if (!accessToken) return;
    fetch('/api/planner/projects', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.projects) setProjects(d.projects);
      })
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
  const setEventMetadata = (changes) =>
    setForm((prev) => {
      const current = prev.financialMetadata;
      const metadata =
        current && typeof current === 'object' && !Array.isArray(current) ? current : {};
      return { ...prev, financialMetadata: { ...metadata, ...changes } };
    });
  const setObjectType = (objectType) =>
    setForm((prev) => ({
      ...prev,
      objectType,
      status:
        objectType === 'event'
          ? EVENT_STATUS_KEYS.has(prev.status)
            ? prev.status
            : 'inquiry'
          : EVENT_STATUS_KEYS.has(prev.status)
            ? 'todo'
            : prev.status,
    }));
  const statusOptions = form.objectType === 'event' ? EVENT_STATUSES : TASK_STATUSES;

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

  const inputClass = 'w-full rounded-lg px-3 py-2 text-[16px] outline-none transition-all';

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
          {form.objectType === 'event' ? 'Edit Event' : 'Edit Card'}
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
          <span
            className="block text-xs font-medium mb-1"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Card ID
          </span>
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
          <label
            htmlFor="planner-card-title"
            className="block text-xs font-medium mb-1"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Title
          </label>
          <input
            id="planner-card-title"
            type="text"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Date */}
        <div>
          <label
            htmlFor="planner-card-date"
            className="block text-xs font-medium mb-1"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Date
          </label>
          <input
            id="planner-card-date"
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
          <span
            id="planner-zone-label"
            className="block text-xs font-medium mb-1"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Zone
          </span>
          <div className="flex gap-2" role="group" aria-labelledby="planner-zone-label">
            {['timed', 'untimed'].map((z) => (
              <button
                key={z}
                onClick={() => set('zone', z)}
                className="flex-1 py-2 text-xs font-medium rounded-lg border transition-colors touch-target-ios"
                style={
                  form.zone === z
                    ? {
                        backgroundColor:
                          'color-mix(in srgb, var(--color-action-primary-bg) 20%, transparent)',
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

        {/* Operational type */}
        <div>
          <label
            htmlFor="planner-card-object-type"
            className="block text-xs font-medium mb-1"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Operational type
          </label>
          <select
            id="planner-card-object-type"
            value={form.objectType || (form.zone === 'timed' ? 'shift' : 'prep_task')}
            onChange={(e) => setObjectType(e.target.value)}
            className={inputClass}
            style={{
              backgroundColor: 'var(--color-bg-card)',
              border: '1px solid var(--color-border-default)',
              color: 'var(--color-text-primary)',
            }}
          >
            {OBJECT_TYPES.map((type) => (
              <option key={type.key} value={type.key}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* People */}
        <div>
          <span
            id="planner-people-label"
            className="block text-xs font-medium mb-1"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            People
          </span>
          <div className="flex gap-2 flex-wrap" role="group" aria-labelledby="planner-people-label">
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
            <label
              htmlFor="planner-card-start-time"
              className="block text-xs font-medium mb-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Start time
            </label>
            <input
              id="planner-card-start-time"
              type="time"
              value={form.startTime || ''}
              onChange={(e) => set('startTime', e.target.value || null)}
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="planner-card-end-time"
              className="block text-xs font-medium mb-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              End time
            </label>
            <input
              id="planner-card-end-time"
              type="time"
              value={form.endTime || ''}
              onChange={(e) => set('endTime', e.target.value || null)}
              className={inputClass}
            />
          </div>
        </div>
        {form.objectType === 'event' && (
          <div
            className="space-y-3 rounded-xl border p-3"
            style={{ borderColor: 'var(--color-border-default)' }}
          >
            <div>
              <label
                htmlFor="planner-event-client"
                className="block text-xs font-medium mb-1"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Client
              </label>
              <input
                id="planner-event-client"
                type="text"
                value={form.financialMetadata?.clientName || ''}
                onChange={(e) => setEventMetadata({ clientName: e.target.value || null })}
                placeholder="Customer or organization"
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="planner-event-location"
                  className="block text-xs font-medium mb-1"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Location
                </label>
                <input
                  id="planner-event-location"
                  type="text"
                  value={form.financialMetadata?.location || ''}
                  onChange={(e) => setEventMetadata({ location: e.target.value || null })}
                  placeholder="Venue or city"
                  className={inputClass}
                />
              </div>
              <div>
                <label
                  htmlFor="planner-event-guests"
                  className="block text-xs font-medium mb-1"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Guests
                </label>
                <input
                  id="planner-event-guests"
                  type="number"
                  min="0"
                  value={form.financialMetadata?.guestEstimate ?? ''}
                  onChange={(e) =>
                    setEventMetadata({
                      guestEstimate:
                        e.target.value === '' ? null : Math.max(0, Number(e.target.value)),
                    })
                  }
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="planner-event-menu-summary"
                className="block text-xs font-medium mb-1"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Menu summary
              </label>
              <input
                id="planner-event-menu-summary"
                type="text"
                value={form.financialMetadata?.menuSummary || ''}
                onChange={(e) => setEventMetadata({ menuSummary: e.target.value || null })}
                placeholder="Service style and key dishes"
                className={inputClass}
              />
            </div>

            <div>
              <p className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Prep schedule
              </p>
              <p className="mb-2 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                Prep is tracked separately from the service window.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label
                    htmlFor="planner-event-prep-date"
                    className="block text-xs font-medium mb-1"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Prep date
                  </label>
                  <input
                    id="planner-event-prep-date"
                    type="date"
                    value={form.financialMetadata?.prepDate || ''}
                    onChange={(e) =>
                      setEventMetadata({
                        prepDate: e.target.value || null,
                        prepSchedulingStatus: e.target.value ? 'scheduled' : 'needs_schedule',
                      })
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label
                    htmlFor="planner-event-prep-start"
                    className="block text-xs font-medium mb-1"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Prep start
                  </label>
                  <input
                    id="planner-event-prep-start"
                    type="time"
                    value={form.financialMetadata?.prepStartTime || ''}
                    onChange={(e) => setEventMetadata({ prepStartTime: e.target.value || null })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label
                    htmlFor="planner-event-prep-end"
                    className="block text-xs font-medium mb-1"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    Prep end
                  </label>
                  <input
                    id="planner-event-prep-end"
                    type="time"
                    value={form.financialMetadata?.prepEndTime || ''}
                    onChange={(e) => setEventMetadata({ prepEndTime: e.target.value || null })}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="planner-event-evidence"
                className="block text-xs font-medium mb-1"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Evidence references
              </label>
              <textarea
                id="planner-event-evidence"
                value={
                  Array.isArray(form.financialMetadata?.evidenceRefs)
                    ? form.financialMetadata.evidenceRefs.join('\n')
                    : ''
                }
                onChange={(e) =>
                  setEventMetadata({
                    evidenceRefs: e.target.value
                      .split('\n')
                      .map((reference) => reference.trim())
                      .filter(Boolean),
                  })
                }
                placeholder={
                  'One per line, for example:\ngmail:THREAD_ID\nsquare-invoice:INVOICE_ID'
                }
                rows={3}
                className={inputClass}
                style={{ resize: 'vertical' }}
              />
              <p className="mt-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                References link the event to its source without changing the source record.
              </p>
            </div>
          </div>
        )}

        {/* Revenue */}
        <div>
          <label
            htmlFor="planner-card-revenue"
            className="block text-xs font-medium mb-1"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Revenue ($)
          </label>
          <input
            id="planner-card-revenue"
            type="number"
            min="0"
            value={form.revenueCents != null ? form.revenueCents / 100 : form.revenue}
            step="0.01"
            onChange={(e) => {
              const cents = Math.round(Number(e.target.value) * 100);
              setForm((prev) => ({
                ...prev,
                revenue: Math.round(cents / 100),
                revenueCents: cents,
              }));
            }}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="planner-card-financial-status"
              className="block text-xs font-medium mb-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Revenue status
            </label>
            <select
              id="planner-card-financial-status"
              value={form.financialStatus || 'planned'}
              onChange={(e) => set('financialStatus', e.target.value)}
              className={inputClass}
            >
              <option value="planned">Planned</option>
              <option value="forecast">Forecast</option>
              <option value="committed">Committed</option>
              <option value="scheduled">Scheduled</option>
              <option value="scheduled_unpaid">Scheduled — unpaid</option>
              <option value="unresolved">Unresolved</option>
              <option value="modeled_low_case">Modeled low case</option>
              <option value="modeled_low_case_deposits_received">
                Modeled low case — deposits received
              </option>
              <option value="owner_estimate_deposits_received">
                Owner estimate — deposits received
              </option>
              <option value="booked_deposit_received_estimate">Booked — deposit received</option>
              <option value="provisional_max_rate">Provisional max rate</option>
              <option value="founder_time_not_cash_wage">Founder time — not cash wage</option>
              <option value="paid">Paid</option>
              <option value="actual">Actual</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="planner-card-cash-received"
              className="block text-xs font-medium mb-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Cash received ($)
            </label>
            <input
              id="planner-card-cash-received"
              type="number"
              min="0"
              step="0.01"
              value={(form.cashReceivedCents || 0) / 100}
              onChange={(e) => set('cashReceivedCents', Math.round(Number(e.target.value) * 100))}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="planner-card-financial-source"
            className="block text-xs font-medium mb-1"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Financial source
          </label>
          <input
            id="planner-card-financial-source"
            type="text"
            value={form.financialSource || ''}
            onChange={(e) => set('financialSource', e.target.value || null)}
            placeholder="Square invoice, owner schedule, contract…"
            className={inputClass}
          />
        </div>

        <div>
          <label
            htmlFor="planner-card-notes"
            className="block text-xs font-medium mb-1"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Event / operational details
          </label>
          <textarea
            id="planner-card-notes"
            value={form.notes || ''}
            onChange={(e) => set('notes', e.target.value || null)}
            placeholder="Menu, shopping list, arrival instructions, allergies, invoice timing…"
            rows={8}
            className={inputClass}
            style={{ resize: 'vertical' }}
          />
        </div>

        {/* Labor */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="planner-card-flat-labor"
              className="block text-xs font-medium mb-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Flat labor ($)
            </label>
            <input
              id="planner-card-flat-labor"
              type="number"
              min="0"
              value={form.costCents != null ? form.costCents / 100 : form.cost}
              step="0.01"
              onChange={(e) => {
                const cents = Math.round(Number(e.target.value) * 100);
                setForm((prev) => ({ ...prev, cost: Math.round(cents / 100), costCents: cents }));
              }}
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="planner-card-hourly-labor"
              className="block text-xs font-medium mb-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Labor/hr ($)
            </label>
            <input
              id="planner-card-hourly-labor"
              type="number"
              min="0"
              value={
                form.costPerHourCents != null ? form.costPerHourCents / 100 : form.costPerHour || 0
              }
              step="0.01"
              onChange={(e) => {
                const cents = Math.round(Number(e.target.value) * 100);
                setForm((prev) => ({
                  ...prev,
                  costPerHour: Math.round(cents / 100),
                  costPerHourCents: cents,
                }));
              }}
              className={inputClass}
            />
          </div>
        </div>

        {/* Optional toggle */}
        <div className="flex items-center justify-between">
          <span
            id="planner-card-optional-label"
            className="text-xs font-medium"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            What-if toggle (optional)
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={form.optional}
            aria-labelledby="planner-card-optional-label"
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
            <span
              id="planner-card-repeat-label"
              className="text-xs font-medium"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Repeat weekly
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(form._repeatWeekly)}
              aria-labelledby="planner-card-repeat-label"
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
          <span
            id="planner-card-status-label"
            className="block text-xs font-medium mb-1"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Status
          </span>
          <div
            className="grid grid-cols-2 gap-1.5"
            role="group"
            aria-labelledby="planner-card-status-label"
          >
            {statusOptions.map((s) => (
              <button
                key={s.key}
                onClick={() => set('status', s.key)}
                className="py-1.5 text-xs font-medium rounded-lg border transition-colors"
                style={
                  form.status === s.key
                    ? {
                        backgroundColor:
                          'color-mix(in srgb, var(--color-action-primary-bg) 20%, transparent)',
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
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Project */}
        {projects.length > 0 && (
          <div>
            <label
              htmlFor="planner-card-project"
              className="block text-xs font-medium mb-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Project
            </label>
            <select
              id="planner-card-project"
              value={form.projectId || ''}
              onChange={(e) => set('projectId', e.target.value || null)}
              className={inputClass}
              style={{
                backgroundColor: 'var(--color-bg-card)',
                border: '1px solid var(--color-border-default)',
                color: 'var(--color-text-primary)',
              }}
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Priority */}
        <div>
          <span
            id="planner-card-priority-label"
            className="block text-xs font-medium mb-1"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Priority
          </span>
          <div className="flex gap-1.5" role="group" aria-labelledby="planner-card-priority-label">
            {PRIORITY_LABELS.map((label, i) => (
              <button
                key={i}
                onClick={() => set('priority', i)}
                className="flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors"
                style={
                  form.priority === i
                    ? {
                        backgroundColor:
                          'color-mix(in srgb, var(--color-action-primary-bg) 20%, transparent)',
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
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Due date */}
        <div>
          <label
            htmlFor="planner-card-due-date"
            className="block text-xs font-medium mb-1"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Due date
          </label>
          <input
            id="planner-card-due-date"
            type="date"
            value={form.dueDate || ''}
            onChange={(e) => set('dueDate', e.target.value || null)}
            className={inputClass}
          />
        </div>

        {/* Effect target */}
        <div>
          <label
            htmlFor="planner-card-effect-type"
            className="block text-xs font-medium mb-1"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Revenue effect
          </label>
          <select
            id="planner-card-effect-type"
            value={form.effectType || ''}
            onChange={(e) => set('effectType', e.target.value || null)}
            className={inputClass}
          >
            <option value="">None</option>
            <option value="double_revenue">Double revenue</option>
          </select>
          {form.effectType && (
            <div className="mt-2">
              <label
                htmlFor="planner-card-effect-target"
                className="block text-xs font-medium mb-1"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Target card ID
              </label>
              <input
                id="planner-card-effect-target"
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
