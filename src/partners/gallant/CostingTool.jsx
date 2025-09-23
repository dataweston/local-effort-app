import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';

const COLLECTION_KEY = 'costingSheets';

const DEFAULT_SHEET = {
  name: '',
  guestCount: 0,
  costToClient: 0,
  taxRate: 0.085,
  gratuityRate: 0.18,
  coordinatorRate: 0.08,
  foodPerGuest: 0,
  foodTotal: 0,
  bevPerGuest: 0,
  bevTotal: 0,
  floralTotal: 0,
  notes: '',
};

const FALLBACK_ALLOWED = ['dataweston@gmail.com', 'colsen03@gmail.com'];

function formatCurrency(amount) {
  const value = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function formatPercent(decimal) {
  const value = Number.isFinite(decimal) ? decimal : 0;
  return `${(value * 100).toFixed(1)}%`;
}

function round2(value) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sanitizeSheet(input) {
  return {
    name: String(input.name || ''),
    guestCount: toNumber(input.guestCount),
    costToClient: toNumber(input.costToClient),
    taxRate: toNumber(input.taxRate, DEFAULT_SHEET.taxRate),
    gratuityRate: toNumber(input.gratuityRate, DEFAULT_SHEET.gratuityRate),
    coordinatorRate: toNumber(input.coordinatorRate, DEFAULT_SHEET.coordinatorRate),
    foodPerGuest: toNumber(input.foodPerGuest),
    foodTotal: toNumber(input.foodTotal),
    bevPerGuest: toNumber(input.bevPerGuest),
    bevTotal: toNumber(input.bevTotal),
    floralTotal: toNumber(input.floralTotal),
    notes: String(input.notes || ''),
  };
}

function coerceFromDoc(data) {
  if (!data) return { ...DEFAULT_SHEET };
  const next = { ...DEFAULT_SHEET };
  Object.keys(DEFAULT_SHEET).forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      next[key] = typeof DEFAULT_SHEET[key] === 'string' ? String(data[key] || '') : Number(data[key] || 0);
    }
  });
  return next;
}

function formatTimestamp(ts) {
  if (!ts) return '';
  if (typeof ts.toDate === 'function') {
    return ts.toDate().toLocaleString();
  }
  if (ts instanceof Date) {
    return ts.toLocaleString();
  }
  return '';
}

export default function CostingTool({ user, allowedEmails = [] }) {
  const allowedSet = useMemo(() => {
    const list = Array.isArray(allowedEmails) && allowedEmails.length ? allowedEmails : FALLBACK_ALLOWED;
    return new Set(list.map((email) => String(email || '').toLowerCase()));
  }, [allowedEmails]);

  const email = (user?.email || '').toLowerCase();
  const isAuthorized = !!email && allowedSet.has(email);

  const [sessions, setSessions] = useState([]); // { id, name, updatedAt }
  const [activeId, setActiveId] = useState(null);
  const [sheet, setSheet] = useState({ ...DEFAULT_SHEET });
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const saveTimer = useRef(null);

  useEffect(() => {
    if (!db || !isAuthorized) {
      setSessions([]);
      setActiveId(null);
      setSheet({ ...DEFAULT_SHEET });
      setLoadingSessions(false);
      setLoadingSheet(false);
      return () => {};
    }

    setLoadingSessions(true);
    const colRef = collection(db, COLLECTION_KEY);
    const unsub = onSnapshot(
      colRef,
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() || {};
          return {
            id: docSnap.id,
            name: data.name || 'Untitled Session',
            updatedAt: data.updatedAt || null,
          };
        });
        list.sort((a, b) => {
          const aTime = a.updatedAt?.seconds || a.updatedAt?.toMillis?.() || 0;
          const bTime = b.updatedAt?.seconds || b.updatedAt?.toMillis?.() || 0;
          return bTime - aTime;
        });
        setSessions(list);
        setLoadingSessions(false);
        if (!list.length) {
          setActiveId(null);
          setSheet({ ...DEFAULT_SHEET });
        } else if (!activeId || !list.some((item) => item.id === activeId)) {
          setActiveId(list[0].id);
        }
      },
      (err) => {
        setError(err?.message || 'Failed to load sessions');
        setLoadingSessions(false);
      }
    );

    return () => {
      unsub();
    };
  }, [db, isAuthorized, activeId]);

  useEffect(() => {
    if (!db || !isAuthorized || !activeId) {
      setSheet({ ...DEFAULT_SHEET });
      setLoadingSheet(false);
      return () => {};
    }
    setLoadingSheet(true);
    const docRef = doc(db, COLLECTION_KEY, activeId);
    const unsub = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = coerceFromDoc(docSnap.data());
          setSheet(data);
        } else {
          setSheet({ ...DEFAULT_SHEET });
        }
        setLoadingSheet(false);
      },
      (err) => {
        setError(err?.message || 'Failed to load session');
        setLoadingSheet(false);
      }
    );
    return () => {
      unsub();
    };
  }, [db, activeId, isAuthorized]);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  const scheduleSave = (nextSheet) => {
    if (!db || !isAuthorized || !activeId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        setSaving(true);
        await updateDoc(doc(db, COLLECTION_KEY, activeId), {
          ...sanitizeSheet(nextSheet),
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        setError(e?.message || 'Failed to save changes');
      } finally {
        setSaving(false);
      }
    }, 350);
  };

  const updateSheet = (updates) => {
    setSheet((prev) => {
      const base = typeof updates === 'function' ? updates(prev) : { ...prev, ...updates };
      scheduleSave(base);
      return base;
    });
  };

  const ensureAuthorized = () => {
    if (!db) {
      setError('Firebase is not configured for this environment.');
      return false;
    }
    if (!isAuthorized) {
      setError('You do not have access to edit this tool.');
      return false;
    }
    return true;
  };

  const createSession = async () => {
    if (!ensureAuthorized()) return;
    try {
      const now = new Date();
      const name = `Costing ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      const payload = {
        ...sanitizeSheet({ ...DEFAULT_SHEET, name }),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: email || '',
      };
      const docRef = await addDoc(collection(db, COLLECTION_KEY), payload);
      setActiveId(docRef.id);
      setSheet({ ...DEFAULT_SHEET, name });
      setError('');
    } catch (e) {
      setError(e?.message || 'Failed to create session');
    }
  };

  const deleteSession = async (id) => {
    if (!ensureAuthorized()) return;
    if (!id) return;
    const allowDelete = typeof window === 'undefined' ? true : window.confirm('Delete this costing session? This cannot be undone.');
    if (!allowDelete) return;
    try {
      await deleteDoc(doc(db, COLLECTION_KEY, id));
      if (id === activeId) {
        setActiveId(null);
        setSheet({ ...DEFAULT_SHEET });
      }
      setError('');
    } catch (e) {
      setError(e?.message || 'Failed to delete session');
    }
  };

  const handleNumberInput = (field, value) => {
    const numeric = Number.parseFloat(value);
    updateSheet((prev) => {
      const next = { ...prev };
      if (!Number.isFinite(numeric)) {
        next[field] = 0;
      } else {
        next[field] = numeric;
      }
      if (field === 'guestCount') {
        const count = Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
        if (count > 0) {
          next.foodTotal = round2(next.foodPerGuest * count);
          next.bevTotal = round2(next.bevPerGuest * count);
        }
      }
      if (field === 'foodPerGuest') {
        const count = Number.isFinite(next.guestCount) && next.guestCount > 0 ? next.guestCount : 0;
        if (count > 0) next.foodTotal = round2((Number.isFinite(numeric) ? numeric : 0) * count);
      }
      if (field === 'bevPerGuest') {
        const count = Number.isFinite(next.guestCount) && next.guestCount > 0 ? next.guestCount : 0;
        if (count > 0) next.bevTotal = round2((Number.isFinite(numeric) ? numeric : 0) * count);
      }
      if (field === 'foodTotal') {
        const count = Number.isFinite(next.guestCount) && next.guestCount > 0 ? next.guestCount : 0;
        if (count > 0) next.foodPerGuest = round2(((Number.isFinite(numeric) ? numeric : 0) / count) || 0);
      }
      if (field === 'bevTotal') {
        const count = Number.isFinite(next.guestCount) && next.guestCount > 0 ? next.guestCount : 0;
        if (count > 0) next.bevPerGuest = round2(((Number.isFinite(numeric) ? numeric : 0) / count) || 0);
      }
      if (field === 'taxRate' || field === 'gratuityRate' || field === 'coordinatorRate') {
        const divisor = 100;
        const raw = Number.isFinite(numeric) ? numeric : 0;
        next[field] = raw > 1 ? round2(raw / divisor) : raw;
      }
      return next;
    });
  };

  const handlePercentInput = (field, value) => {
    const numeric = Number.parseFloat(value);
    updateSheet((prev) => ({
      ...prev,
      [field]: Number.isFinite(numeric) ? round2(numeric / 100) : prev[field],
    }));
  };

  const handleNameChange = (value) => {
    updateSheet({ name: value });
  };

  const handleNotesChange = (value) => {
    updateSheet({ notes: value });
  };

  const preGratuityTotal = sheet.costToClient > 0 ? sheet.costToClient / (1 + sheet.gratuityRate) : 0;
  const gratuityAmount = sheet.costToClient > 0 ? sheet.costToClient - preGratuityTotal : 0;
  const taxAmount = round2(preGratuityTotal * sheet.taxRate);
  const coordinatorAmount = round2(preGratuityTotal * sheet.coordinatorRate);
  const allocated = taxAmount + sheet.foodTotal + sheet.bevTotal + sheet.floralTotal + coordinatorAmount;
  const remainingBudget = round2(preGratuityTotal - allocated);
  const perGuestBudget = sheet.guestCount > 0 ? round2(remainingBudget / sheet.guestCount) : 0;

  if (!db) {
    return (
      <div className="bg-white border rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-2">Costing Tool</h3>
        <p className="text-sm text-gray-600">Firebase is not configured. Add VITE_FIREBASE_* env vars to enable live collaboration.</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="bg-white border rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-2">Costing Tool</h3>
        <p className="text-sm text-gray-600">Sign in with an authorized account to access the costing tool.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg shadow-sm">
      <header className="flex items-center justify-between px-4 py-3 border-b">
        <div>
          <h3 className="text-lg font-semibold">Costing Tool</h3>
          <p className="text-xs text-gray-500">Shared, real-time budgeting workspace.</p>
        </div>
        <div className="flex items-center gap-2">
          {saving && <span className="text-xs text-gray-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Saving</span>}
          <button onClick={createSession} className="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            New session
          </button>
        </div>
      </header>
      <div className="grid md:grid-cols-[240px_1fr]">
        <aside className="border-r bg-gray-50 p-3 space-y-3">
          <div className="flex items-center justify-between text-xs uppercase tracking-wide text-gray-500">
            <span>Sessions</span>
            {loadingSessions && <Loader2 className="w-3 h-3 animate-spin text-gray-400" />}
          </div>
          <div className="space-y-1">
            {sessions.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveId(item.id)}
                className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${item.id === activeId ? 'border-blue-200 bg-white shadow-sm' : 'border-transparent bg-white hover:border-blue-200'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate">{item.name || 'Untitled'}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(item.id);
                    }}
                    className="text-gray-400 hover:text-red-500"
                    title="Delete session"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-xs text-gray-500 truncate">{formatTimestamp(item.updatedAt) || '???'}</div>
              </button>
            ))}
            {!loadingSessions && !sessions.length && (
              <p className="text-sm text-gray-500">No sessions yet. Create one to get started.</p>
            )}
          </div>
        </aside>
        <section className="p-5 space-y-6">
          {error && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          {loadingSheet ? (
            <div className="flex h-48 items-center justify-center text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading session???
            </div>
          ) : !activeId ? (
            <div className="flex h-48 items-center justify-center text-gray-500 text-sm">
              Select or create a session to begin.
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Session name</span>
                  <input
                    type="text"
                    value={sheet.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="rounded border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Costing session"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Guest count</span>
                  <input
                    type="number"
                    min="0"
                    value={sheet.guestCount}
                    onChange={(e) => handleNumberInput('guestCount', e.target.value)}
                    className="rounded border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Cost to client</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={sheet.costToClient}
                    onChange={(e) => handleNumberInput('costToClient', e.target.value)}
                    className="rounded border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </label>
                <div className="rounded-md border bg-slate-50 px-3 py-2 text-sm flex flex-col justify-center">
                  <span className="text-xs uppercase text-gray-500">Pre-gratuity total</span>
                  <span className="text-base font-semibold">{formatCurrency(round2(preGratuityTotal))}</span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded border p-3 space-y-3">
                  <div className="flex items-center justify-between text-xs uppercase text-gray-500">
                    <span>Food</span>
                    <span>{sheet.guestCount ? `${formatCurrency(sheet.foodTotal)} total` : ''}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500">Per guest</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={sheet.foodPerGuest}
                        onChange={(e) => handleNumberInput('foodPerGuest', e.target.value)}
                        className="rounded border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500">Total</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={sheet.foodTotal}
                        onChange={(e) => handleNumberInput('foodTotal', e.target.value)}
                        className="rounded border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </label>
                  </div>
                </div>
                <div className="rounded border p-3 space-y-3">
                  <div className="flex items-center justify-between text-xs uppercase text-gray-500">
                    <span>Beverage</span>
                    <span>{sheet.guestCount ? `${formatCurrency(sheet.bevTotal)} total` : ''}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500">Per guest</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={sheet.bevPerGuest}
                        onChange={(e) => handleNumberInput('bevPerGuest', e.target.value)}
                        className="rounded border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500">Total</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={sheet.bevTotal}
                        onChange={(e) => handleNumberInput('bevTotal', e.target.value)}
                        className="rounded border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </label>
                  </div>
                </div>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Floral</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={sheet.floralTotal}
                    onChange={(e) => handleNumberInput('floralTotal', e.target.value)}
                    className="rounded border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </label>
                <div className="rounded border p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs uppercase text-gray-500">
                    <span>Gratuity</span>
                    <span>{formatPercent(sheet.gratuityRate)}</span>
                  </div>
                  <div className="text-xl font-semibold">{formatCurrency(round2(gratuityAmount))}</div>
                  <p className="text-xs text-gray-500">Calculated from cost to client.</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded border p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs uppercase text-gray-500">
                    <span>Tax</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={(sheet.taxRate * 100).toFixed(2)}
                      onChange={(e) => handlePercentInput('taxRate', e.target.value)}
                      className="w-20 rounded border px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="text-lg font-semibold">{formatCurrency(taxAmount)}</div>
                  <p className="text-xs text-gray-500">Applied to the pre-gratuity total.</p>
                </div>
                <div className="rounded border p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs uppercase text-gray-500">
                    <span>Coordinator</span>
                    <span>{formatPercent(sheet.coordinatorRate)}</span>
                  </div>
                  <div className="text-lg font-semibold">{formatCurrency(coordinatorAmount)}</div>
                  <p className="text-xs text-gray-500">Percent of the pre-gratuity total.</p>
                </div>
                <div className="rounded border p-3 space-y-2 bg-emerald-50 border-emerald-200">
                  <div className="flex items-center justify-between text-xs uppercase text-emerald-700">
                    <span>Remaining budget</span>
                    <span>{sheet.guestCount ? `${formatCurrency(perGuestBudget)} / guest` : ''}</span>
                  </div>
                  <div className="text-xl font-semibold text-emerald-700">{formatCurrency(remainingBudget)}</div>
                  <p className="text-xs text-emerald-700">Available for venue & staffing.</p>
                </div>
              </div>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Notes</span>
                <textarea
                  value={sheet.notes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  rows={3}
                  className="rounded border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Observations, vendor details, next steps???"
                />
              </label>
            </>
          )}
        </section>
      </div>
    </div>
  );
}









