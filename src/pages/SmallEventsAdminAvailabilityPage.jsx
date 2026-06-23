import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';

const EVENT_TYPES = ['dinner', 'pizza', 'holiday'];

const formatDate = (value) => {
  if (!value) return 'TBD';
  const [year, month, day] = String(value).split('-').map(Number);
  if (!year || !month || !day) return value;
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const getStoredAdminToken = () => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem('smallEventsAdminToken') || '';
};

const setStoredAdminToken = (value) => {
  if (typeof window === 'undefined') return;
  if (value) {
    window.localStorage.setItem('smallEventsAdminToken', value);
  } else {
    window.localStorage.removeItem('smallEventsAdminToken');
  }
};

const SmallEventsAdminAvailabilityPage = () => {
  const [adminToken, setAdminToken] = useState('');
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    date: '',
    type: 'dinner',
    status: 'open',
    notes: '',
    applyToAllTypes: false,
  });

  useEffect(() => {
    const stored = getStoredAdminToken();
    if (stored) setAdminToken(stored);
  }, []);

  const loadSlots = async () => {
    if (!adminToken) {
      setError('Enter the admin token to load availability.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/small-events/availability?admin=1', {
        headers: { 'x-admin-token': adminToken },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load availability');
      setSlots(Array.isArray(data?.slots) ? data.slots : []);
    } catch (err) {
      setError(err.message || 'Failed to load availability.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminToken) loadSlots();
  }, [adminToken]);

  const saveAvailability = async () => {
    if (!adminToken) {
      setError('Enter the admin token to update availability.');
      return;
    }
    if (!form.date) {
      setError('Select a date.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/small-events/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to update availability');
      await loadSlots();
    } catch (err) {
      setError(err.message || 'Failed to update availability.');
    } finally {
      setLoading(false);
    }
  };

  const cleanupHolds = async () => {
    if (!adminToken) {
      setError('Enter the admin token to clear holds.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/small-events/holds/cleanup', {
        method: 'POST',
        headers: { 'x-admin-token': adminToken },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to clear holds');
      await loadSlots();
    } catch (err) {
      setError(err.message || 'Failed to clear holds.');
    } finally {
      setLoading(false);
    }
  };

  const orderedSlots = useMemo(() => {
    return slots.slice().sort((a, b) => a.date.localeCompare(b.date));
  }, [slots]);

  return (
    <>
      <Helmet>
        <title>Small Events Availability | Local Effort</title>
      </Helmet>
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Small Events Availability</h1>
            <p className="text-sm text-slate-600">Block or open dates by event type.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              onClick={loadSlots}
            >
              Refresh
            </button>
            <button
              type="button"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              onClick={cleanupHolds}
            >
              Clear expired holds
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
          <div className="grid gap-4 md:grid-cols-[1fr_160px_160px_1fr_auto] md:items-end">
            <div>
              <label className="text-xs font-semibold text-slate-600">Admin token</label>
              <input
                type="password"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value)}
                placeholder="Paste admin token"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Date</label>
              <input
                type="date"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={form.date}
                onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Type</label>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                value={form.type}
                onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
              >
                {EVENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Notes</label>
              <input
                type="text"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Reason or label"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                onClick={() => {
                  setStoredAdminToken(adminToken);
                  saveAvailability();
                }}
              >
                Save
              </button>
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                onClick={() => {
                  setAdminToken('');
                  setStoredAdminToken('');
                  setSlots([]);
                }}
              >
                Clear
              </button>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs text-slate-600">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.applyToAllTypes}
                onChange={(e) => setForm((prev) => ({ ...prev, applyToAllTypes: e.target.checked }))}
              />
              Apply to all event types
            </label>
            <select
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
            >
              <option value="open">Open</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
          {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
        </div>

        <div className="mt-6 rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3 text-sm text-slate-600">
            {loading ? 'Loading availability...' : `${orderedSlots.length} slots`}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Notes</th>
                  <th className="px-4 py-3">Hold</th>
                </tr>
              </thead>
              <tbody>
                {orderedSlots.map((slot) => (
                  <tr key={slot.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-semibold text-slate-900">{formatDate(slot.date)}</td>
                    <td className="px-4 py-3">{slot.type}</td>
                    <td className="px-4 py-3">{slot.status}</td>
                    <td className="px-4 py-3 text-slate-600">{slot.notes || '-'}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {slot.holdUntil ? `Held until ${new Date(slot.holdUntil).toLocaleString()}` : 'No hold'}
                    </td>
                  </tr>
                ))}
                {!loading && orderedSlots.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                      No availability slots found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

export default SmallEventsAdminAvailabilityPage;
