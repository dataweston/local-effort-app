import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';

const STATUS_OPTIONS = ['all', 'draft', 'held', 'confirmed', 'expired'];
const TYPE_OPTIONS = ['all', 'dinner', 'pizza', 'weddings', 'holiday'];

const formatCurrency = (value) => {
  const num = Number(value || 0) / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

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

const SmallEventsAdminRequestsPage = () => {
  const [adminToken, setAdminToken] = useState('');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = getStoredAdminToken();
    if (stored) setAdminToken(stored);
  }, []);

  const loadRequests = async () => {
    if (!adminToken) {
      setError('Enter the admin token to load requests.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/small-events/estimates?admin=1', {
        headers: { 'x-admin-token': adminToken },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load requests');
      setRequests(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      setError(err.message || 'Failed to load requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminToken) loadRequests();
  }, [adminToken]);

  const filtered = useMemo(() => {
    return requests.filter((item) => {
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesType = typeFilter === 'all' || item.type === typeFilter;
      return matchesStatus && matchesType;
    });
  }, [requests, statusFilter, typeFilter]);

  return (
    <>
      <Helmet>
        <title>Small Events Requests | Local Effort</title>
      </Helmet>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Small Events Requests</h1>
            <p className="text-sm text-slate-600">Review open estimates, holds, and deposits.</p>
          </div>
          <button
            type="button"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            onClick={loadRequests}
          >
            Refresh
          </button>
        </div>

        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
          <div className="grid gap-4 md:grid-cols-[1fr_200px_200px_auto] md:items-end">
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
              <label className="text-xs font-semibold text-slate-600">Status</label>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Type</label>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                {TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                onClick={() => {
                  setStoredAdminToken(adminToken);
                  loadRequests();
                }}
              >
                Save token
              </button>
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                onClick={() => {
                  setAdminToken('');
                  setStoredAdminToken('');
                  setRequests([]);
                }}
              >
                Clear
              </button>
            </div>
          </div>
          {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
        </div>

        <div className="mt-6 rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3 text-sm text-slate-600">
            {loading ? 'Loading requests...' : `${filtered.length} requests`}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Event date</th>
                  <th className="px-4 py-3">Guest count</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Estimate</th>
                  <th className="px-4 py-3">Deposit</th>
                  <th className="px-4 py-3">Hold</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-semibold text-slate-700">{item.status}</td>
                    <td className="px-4 py-3">{item.type}</td>
                    <td className="px-4 py-3">{formatDate(item.eventDate)}</td>
                    <td className="px-4 py-3">{item.guestCount || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{item.contactName || 'Unnamed'}</div>
                      <div className="text-xs text-slate-500">{item.contactEmail || 'No email'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">
                        {formatCurrency(item.estimateMinCents)} - {formatCurrency(item.estimateMaxCents)}
                      </div>
                      <div className="text-xs text-slate-500">Subtotal {formatCurrency(item.subtotalCents)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{formatCurrency(item.depositAmountCents)}</div>
                      <div className="text-xs text-slate-500">{item.depositStatus}</div>
                    </td>
                    <td className="px-4 py-3">
                      {item.hold ? (
                        <div>
                          <div className="font-semibold text-slate-900">{item.hold.status}</div>
                          <div className="text-xs text-slate-500">
                            {formatDate(item.hold.slot?.date)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">No hold</span>
                      )}
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-500">
                      No requests match the current filters.
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

export default SmallEventsAdminRequestsPage;
