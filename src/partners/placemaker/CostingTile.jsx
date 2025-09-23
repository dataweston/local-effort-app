import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calculator, ClipboardList, Loader2 } from 'lucide-react';
import { doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

const COLLECTION_KEY = 'placemakerCosting';
const DEFAULT_DOC_ID = 'default';

const DEFAULT_SHEET = {
  title: '$4k wedding at Tiny Diner',
  guestCount: 50,
  costToClient: 4000,
  taxRate: 0.085,
  gratuityRate: 0.18,
  coordinatorRate: 0.08,
  foodPerGuest: 45,
  foodTotal: 2250,
  bevPerGuest: 18,
  bevTotal: 900,
  floralTotal: 300,
  notes: '',
};

function round2(value) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number.isFinite(amount) ? amount : 0);
}

function formatPercent(value) {
  const base = Number.isFinite(value) ? value : 0;
  return `${(base * 100).toFixed(1)}%`;
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sanitizeSheet(input) {
  const base = { ...DEFAULT_SHEET };
  return Object.keys(base).reduce((acc, key) => {
    const source = Object.prototype.hasOwnProperty.call(input, key) ? input[key] : base[key];
    acc[key] = typeof base[key] === 'string' ? String(source ?? '') : toNumber(source, base[key]);
    return acc;
  }, {});
}

export default function CostingTile({ onSnapshot }) {
  const [sheet, setSheet] = useState({ ...DEFAULT_SHEET });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const saveTimer = useRef(null);

  const docRef = useMemo(() => {
    if (!db) return null;
    return doc(db, COLLECTION_KEY, DEFAULT_DOC_ID);
  }, []);

  useEffect(() => {
    if (!db) {
      setError('Firebase is not configured; enable VITE_FIREBASE_* vars for real-time updates.');
      setLoading(false);
      return () => {};
    }
    const unsubscribe = onSnapshot(
      docRef,
      async (snap) => {
        if (snap.exists()) {
          const data = sanitizeSheet(snap.data());
          setSheet(data);
        } else {
          try {
            await setDoc(docRef, { ...DEFAULT_SHEET, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
            setSheet({ ...DEFAULT_SHEET });
          } catch (e) {
            setError(e?.message || 'Unable to seed default costing state.');
          }
        }
        setLoading(false);
      },
      (err) => {
        setError(err?.message || 'Failed to load costing data.');
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [docRef]);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  const scheduleSave = (next) => {
    if (!db || !docRef) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const payload = sanitizeSheet(next);
    saveTimer.current = setTimeout(async () => {
      try {
        setSaving(true);
        await updateDoc(docRef, { ...payload, updatedAt: serverTimestamp() });
        setError('');
      } catch (e) {
        setError(e?.message || 'Failed to save changes.');
      } finally {
        setSaving(false);
      }
    }, 350);
  };

  const updateSheet = (updater) => {
    setSheet((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      scheduleSave(next);
      return next;
    });
  };

  const handleNumberChange = (key, raw) => {
    const numeric = toNumber(raw, 0);
    updateSheet((prev) => {
      const next = { ...prev, [key]: numeric };
      if (key === 'guestCount' && numeric > 0) {
        next.foodTotal = round2(next.foodPerGuest * numeric);
        next.bevTotal = round2(next.bevPerGuest * numeric);
      }
      if (key === 'foodPerGuest') {
        next.foodTotal = round2(numeric * (prev.guestCount || 0));
      }
      if (key === 'foodTotal' && prev.guestCount) {
        next.foodPerGuest = round2(numeric / prev.guestCount || 0);
      }
      if (key === 'bevPerGuest') {
        next.bevTotal = round2(numeric * (prev.guestCount || 0));
      }
      if (key === 'bevTotal' && prev.guestCount) {
        next.bevPerGuest = round2(numeric / prev.guestCount || 0);
      }
      return next;
    });
  };

  const handlePercentChange = (key, raw) => {
    const numeric = toNumber(raw, 0) / 100;
    updateSheet({ [key]: round2(numeric) });
  };

  const handleNotesChange = (next) => {
    updateSheet({ notes: next });
  };

  const preGratuityTotal = sheet.costToClient > 0 ? sheet.costToClient / (1 + sheet.gratuityRate) : 0;
  const gratuityAmount = sheet.costToClient > 0 ? sheet.costToClient - preGratuityTotal : 0;
  const taxAmount = round2(preGratuityTotal * sheet.taxRate);
  const coordinatorAmount = round2(preGratuityTotal * sheet.coordinatorRate);
  const allocated = taxAmount + sheet.foodTotal + sheet.bevTotal + sheet.floralTotal + coordinatorAmount;
  const remainingBudget = round2(preGratuityTotal - allocated);
  const perGuestRemainder = sheet.guestCount ? round2(remainingBudget / sheet.guestCount) : 0;

  const handleSnapshot = async () => {
    if (typeof onSnapshot !== 'function') return;
    const stamp = new Date().toLocaleString();
    const lines = [
      `Snapshot — ${stamp}`,
      `Guests: ${sheet.guestCount || 0}`,
      `Client total: ${formatCurrency(sheet.costToClient)}`,
      `Pre-gratuity: ${formatCurrency(round2(preGratuityTotal))}`,
      `Tax (${formatPercent(sheet.taxRate)}): ${formatCurrency(taxAmount)}`,
      `Gratuity (${formatPercent(sheet.gratuityRate)}): ${formatCurrency(gratuityAmount)}`,
      `Coordinator (${formatPercent(sheet.coordinatorRate)}): ${formatCurrency(coordinatorAmount)}`,
      `Food: ${formatCurrency(sheet.foodTotal)} (${formatCurrency(sheet.foodPerGuest)} per guest)`,
      `Beverage: ${formatCurrency(sheet.bevTotal)} (${formatCurrency(sheet.bevPerGuest)} per guest)`,
      `Floral: ${formatCurrency(sheet.floralTotal)}`,
      `Remaining venue/staff budget: ${formatCurrency(remainingBudget)}${sheet.guestCount ? ` (${formatCurrency(perGuestRemainder)} per guest)` : ''}`,
    ];
    onSnapshot(lines.join('\n'));
  };

  if (!db) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 text-slate-600">
          <Calculator className="h-5 w-5" />
          <h2 className="text-lg font-semibold">$4k wedding at Tiny Diner</h2>
        </div>
        <p className="mt-4 text-sm text-slate-600">
          Firebase is disabled in this build, so the costing tile will not sync in real time.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Costing tool</p>
          <h2 className="text-xl font-semibold text-slate-900">{sheet.title}</h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {saving && <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Saving</span>}
          {loading && <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Loading</span>}
        </div>
      </header>
      {error && <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Guest count</span>
          <input
            type="number"
            min="0"
            value={sheet.guestCount}
            onChange={(e) => handleNumberChange('guestCount', e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900/20"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Cost to client</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={sheet.costToClient}
            onChange={(e) => handleNumberChange('costToClient', e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900/20"
          />
        </label>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Pre-gratuity total</p>
          <p className="text-lg font-semibold text-slate-900">{formatCurrency(round2(preGratuityTotal))}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Gratuity</p>
          <p className="text-lg font-semibold text-slate-900">{formatCurrency(round2(gratuityAmount))}</p>
          <p className="text-xs text-slate-500">{formatPercent(sheet.gratuityRate)} of client total.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-slate-500">Food</span>
            <span className="text-xs text-slate-500">{formatCurrency(sheet.foodTotal)}</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">Per guest</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={sheet.foodPerGuest}
                onChange={(e) => handleNumberChange('foodPerGuest', e.target.value)}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900/20"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">Total</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={sheet.foodTotal}
                onChange={(e) => handleNumberChange('foodTotal', e.target.value)}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900/20"
              />
            </label>
          </div>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-slate-500">Beverage</span>
            <span className="text-xs text-slate-500">{formatCurrency(sheet.bevTotal)}</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">Per guest</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={sheet.bevPerGuest}
                onChange={(e) => handleNumberChange('bevPerGuest', e.target.value)}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900/20"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">Total</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={sheet.bevTotal}
                onChange={(e) => handleNumberChange('bevTotal', e.target.value)}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900/20"
              />
            </label>
          </div>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Floral</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={sheet.floralTotal}
            onChange={(e) => handleNumberChange('floralTotal', e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900/20"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Coordinator %</span>
          <input
            type="number"
            min="0"
            step="0.1"
            value={(sheet.coordinatorRate * 100).toFixed(1)}
            onChange={(e) => handlePercentChange('coordinatorRate', e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900/20"
          />
          <span className="text-xs text-slate-500">{formatCurrency(coordinatorAmount)}</span>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Tax %</span>
          <input
            type="number"
            min="0"
            step="0.1"
            value={(sheet.taxRate * 100).toFixed(2)}
            onChange={(e) => handlePercentChange('taxRate', e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900/20"
          />
          <span className="text-xs text-slate-500">{formatCurrency(taxAmount)}</span>
        </label>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
          <p className="text-xs uppercase tracking-wide">Remaining venue / staff budget</p>
          <p className="text-lg font-semibold">{formatCurrency(remainingBudget)}</p>
          {sheet.guestCount > 0 && <p className="text-xs">{formatCurrency(perGuestRemainder)} per guest</p>}
        </div>
      </div>

      <label className="mt-6 flex flex-col gap-1 text-sm">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Notes</span>
        <textarea
          value={sheet.notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          rows={3}
          className="min-h-[96px] rounded-md border border-slate-200 bg-white px-3 py-2 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900/20"
          placeholder="Share kitchen notes, vendor details, next steps"
        />
      </label>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleSnapshot}
          className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
        >
          <ClipboardList className="h-4 w-4" />
          Save snapshot to notepad
        </button>
        <span className="text-xs text-slate-500">Snapshots append as plain text in the shared notepad.</span>
      </div>
    </div>
  );
}


