// src/pages/FullPageDemoPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FullPageContainer from '../components/fullpage/FullPageContainer';
import FullPageSection from '../components/fullpage/FullPageSection';
import CloudinaryImage from '../components/common/cloudinaryImage';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

const SMALL_EVENT_CONFIG = {
  dinner: {
    label: 'Dinner party',
    baseRate: 95,
    minimumTotal: 850,
    staffingGuestsPer: 8,
    staffingHourly: 45,
    staffingHours: 4,
    rangeMin: 0.9,
    rangeMax: 1.2,
  },
  weddings: {
    label: 'Weddings',
    baseRate: 140,
    minimumTotal: 3200,
    staffingGuestsPer: 12,
    staffingHourly: 55,
    staffingHours: 6,
    rangeMin: 0.92,
    rangeMax: 1.25,
  },
  holiday: {
    label: 'Small events',
    baseRate: 70,
    minimumTotal: 1200,
    staffingGuestsPer: 15,
    staffingHourly: 40,
    staffingHours: 4,
    rangeMin: 0.9,
    rangeMax: 1.18,
  },
};

const EVENT_TYPES = Object.keys(SMALL_EVENT_CONFIG);
const DEFAULT_DEPOSIT_PERCENT = 0.15;
const ESTIMATE_LIFESPAN_DAYS = 5;
const HOLD_WINDOW_HOURS = 24;

const formatCurrency = (value, options = {}) => {
  const {
    minimumFractionDigits = 0,
    maximumFractionDigits = 0,
  } = options;
  const safeValue = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(safeValue);
};

const centsToDollars = (value) => {
  const cents = Number(value);
  if (!Number.isFinite(cents)) return 0;
  return cents / 100;
};

const toDateInputValue = (date) => {
  if (!date) return '';
  return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 10);
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const createSmallEventDefaults = (type) => ({
  type,
  estimateId: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  eventDate: '',
  eventTime: '',
  alternateDates: '',
  guestCount: '',
  location: '',
  serviceStyle: '',
  menuNotes: '',
  dietary: '',
  rentals: '',
  budgetRange: '',
  notes: '',
  courses: '',
  plannerInfo: '',
  celebrationType: '',
  kitchenAccess: '',
  wantsAccount: false,
  accountEmail: '',
  accountPassword: '',
  expiresAt: '',
  holdId: '',
  holdSlotId: '',
  holdUntil: '',
  holdStatus: '',
  depositOverridePercent: '',
  depositOverrideAmount: '',
  depositStatus: 'unpaid',
  serverEstimate: null,
  lastEditedAt: new Date().toISOString(),
});

const buildInitialAvailability = () => {
  const today = new Date();
  const makeSlot = (daysOut, type, status, notes = '') => ({
    id: `slot-${type}-${daysOut}`,
    date: toDateInputValue(addDays(today, daysOut)),
    type,
    status,
    notes,
    source: 'manual',
  });

  return [
    makeSlot(4, 'dinner', 'open', 'Weeknight availability'),
    makeSlot(6, 'holiday', 'open', 'Weeknight availability'),
    makeSlot(8, 'dinner', 'blocked', 'Staffing hold'),
    makeSlot(10, 'weddings', 'open', 'Preferred Saturday'),
    makeSlot(12, 'holiday', 'open', 'Corporate-friendly'),
    makeSlot(15, 'weddings', 'blocked', 'Venue conflict'),
    makeSlot(18, 'dinner', 'open', 'Weekend window'),
    makeSlot(21, 'holiday', 'open', 'Holiday week'),
    makeSlot(24, 'weddings', 'open', 'Saturday or Sunday'),
  ];
};

const SEMANTIC_UI_PALETTE = {
  primary: '#FFC697',
  secondary: '#66D3E7',
  accent: '#21C8E7',
  deep: '#2E5E67',
  muted: '#7F9FA8',
};

const FullPageDemoPage = () => {
  const [activePage, setActivePage] = useState(0);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [imageLoadCount, setImageLoadCount] = useState(0);
  const [isDragging, setIsDragging] = useState(null);
  const dragStartTime = useRef(0);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const prefetched = useRef(new Set());
  const closeBtnRef = useRef(null);
  const [imageOrder, setImageOrder] = useState([]);
  const [positions, setPositions] = useState({});
  const containerRef = useRef(null);
  const [orderOpen, setOrderOpen] = useState(false);
  const [smallEventsDialog, setSmallEventsDialog] = useState(null);
  const [smallEventForms, setSmallEventForms] = useState(() => ({
    dinner: createSmallEventDefaults('dinner'),
    weddings: createSmallEventDefaults('weddings'),
    holiday: createSmallEventDefaults('holiday'),
  }));
  const [availabilitySlots, setAvailabilitySlots] = useState(() => buildInitialAvailability());
  const [calendarHolds, setCalendarHolds] = useState([]);
  const [isCalendarAdmin, setIsCalendarAdmin] = useState(false);
  const [adminSlotDraft, setAdminSlotDraft] = useState({
    date: '',
    type: 'dinner',
    status: 'open',
    notes: '',
    applyToAllTypes: false,
  });
  const [smallEventsSessionToken, setSmallEventsSessionToken] = useState('');
  const [smallEventsSaving, setSmallEventsSaving] = useState(false);
  const [smallEventsNotice, setSmallEventsNotice] = useState('');
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [showWaitlistForm, setShowWaitlistForm] = useState(false);
  const [waitlistStatus, setWaitlistStatus] = useState('idle');
  const [waitlist, setWaitlist] = useState({
    name: '',
    email: '',
    phone: '',
    familySize: '',
    children: '',
    daysPerWeek: '',
    mealsPerDay: '',
    allergies: '',
    questions: '',
  });
  const [mealPlanImages, setMealPlanImages] = useState([]);
  const [mealPlanLoading, setMealPlanLoading] = useState(false);
  const [mealPlanError, setMealPlanError] = useState(null);

  const pages = [
    { id: 'home', label: 'Home' },
    { id: 'weekly-meals', label: 'Weekly Meals' },
    { id: 'small-events', label: 'Small Events' },
    { id: 'for-businesses', label: 'For Business' },
    { id: 'about', label: 'About' },
    { id: 'local-pizza', label: 'Local Pizza' },
  ];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('smallEventsSessionToken') || '';
    if (stored) setSmallEventsSessionToken(stored);
  }, []);

  const getStoredAdminToken = () => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem('smallEventsAdminToken') || '';
  };

  const buildSmallEventsHeaders = (overrides = {}) => {
    const headers = { 'Content-Type': 'application/json', ...overrides };
    if (smallEventsSessionToken) {
      headers.Authorization = `Bearer ${smallEventsSessionToken}`;
    }
    const adminToken = getStoredAdminToken();
    if (adminToken) {
      headers['x-admin-token'] = adminToken;
    }
    return headers;
  };

  const loadSmallEventsAvailability = async (type) => {
    setAvailabilityLoading(true);
    try {
      const query = type ? `?type=${encodeURIComponent(type)}` : '';
      const res = await fetch(`/api/small-events/availability${query}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed loading availability');
      setAvailabilitySlots(Array.isArray(data?.slots) ? data.slots : []);
      setCalendarHolds(Array.isArray(data?.holds) ? data.holds : []);
    } catch (error) {
      console.error('Small events availability load error:', error);
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const updateSmallEventForm = (type, field, value) => {
    setSmallEventForms((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value,
        lastEditedAt: new Date().toISOString(),
      },
    }));
  };

  const getSmallEventForm = (type) => smallEventForms[type] || createSmallEventDefaults(type);

  const parseGuestCount = (value) => {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const getDepositPercent = (form) => {
    const override = parseFloat(form.depositOverridePercent);
    if (!Number.isNaN(override) && override > 0) return override / 100;
    return DEFAULT_DEPOSIT_PERCENT;
  };

  const getEstimateExpiry = (form) => {
    if (form?.expiresAt) {
      const parsed = new Date(form.expiresAt);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    const base = form?.lastEditedAt ? new Date(form.lastEditedAt) : new Date();
    return addDays(base, ESTIMATE_LIFESPAN_DAYS);
  };

  const getEstimateForType = (type) => {
    const config = SMALL_EVENT_CONFIG[type];
    const form = getSmallEventForm(type);
    if (!config) return null;
    if (form.serverEstimate) return form.serverEstimate;

    const guestCount = parseGuestCount(form.guestCount);
    const staffingCount = guestCount ? Math.max(1, Math.ceil(guestCount / config.staffingGuestsPer)) : 0;
    const staffingCost = staffingCount * config.staffingHourly * config.staffingHours;
    const foodCost = guestCount * config.baseRate;
    const subtotal = Math.max(foodCost + staffingCost, config.minimumTotal);
    const estimateMin = subtotal * config.rangeMin;
    const estimateMax = subtotal * config.rangeMax;
    const depositPercent = getDepositPercent(form);
    const depositAmount = form.depositOverrideAmount
      ? Number(form.depositOverrideAmount)
      : subtotal * depositPercent;

    return {
      guestCount,
      staffingCount,
      staffingCost,
      subtotal,
      estimateMin,
      estimateMax,
      depositPercent,
      depositAmount,
    };
  };

  const applyEstimateResponse = (type, estimate, hold) => {
    if (!estimate) return;
    const serverEstimate = {
      guestCount: estimate.guestCount || 0,
      staffingCount: estimate.staffingCount || 0,
      staffingCost: centsToDollars(estimate.staffingCostCents || 0),
      subtotal: centsToDollars(estimate.subtotalCents || 0),
      estimateMin: centsToDollars(estimate.estimateMinCents || 0),
      estimateMax: centsToDollars(estimate.estimateMaxCents || 0),
      depositPercent: estimate.depositPercent ? estimate.depositPercent / 100 : DEFAULT_DEPOSIT_PERCENT,
      depositAmount: centsToDollars(estimate.depositAmountCents || 0),
    };
    setSmallEventForms((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        estimateId: estimate.id,
        depositStatus: estimate.depositStatus || prev[type].depositStatus,
        lastEditedAt: estimate.lastEditedAt || prev[type].lastEditedAt,
        expiresAt: estimate.expiresAt || prev[type].expiresAt,
        holdSlotId: hold?.slotId || prev[type].holdSlotId,
        holdUntil: hold?.holdUntil || prev[type].holdUntil,
        holdStatus: hold?.status || prev[type].holdStatus,
        serverEstimate,
      },
    }));
  };

  const applyEstimateToForm = (type, estimate) => {
    if (!estimate) return;
    const serverEstimate = {
      guestCount: estimate.guestCount || 0,
      staffingCount: estimate.staffingCount || 0,
      staffingCost: centsToDollars(estimate.staffingCostCents || 0),
      subtotal: centsToDollars(estimate.subtotalCents || 0),
      estimateMin: centsToDollars(estimate.estimateMinCents || 0),
      estimateMax: centsToDollars(estimate.estimateMaxCents || 0),
      depositPercent: estimate.depositPercent ? estimate.depositPercent / 100 : DEFAULT_DEPOSIT_PERCENT,
      depositAmount: centsToDollars(estimate.depositAmountCents || 0),
    };
    setSmallEventForms((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        estimateId: estimate.id,
        contactName: estimate.contactName || '',
        contactEmail: estimate.contactEmail || '',
        contactPhone: estimate.contactPhone || '',
        guestCount: estimate.guestCount || '',
        eventDate: estimate.eventDate || '',
        eventTime: estimate.eventTime || '',
        alternateDates: estimate.alternateDates || '',
        location: estimate.location || '',
        serviceStyle: estimate.serviceStyle || '',
        budgetRange: estimate.budgetRange || '',
        menuNotes: estimate.menuNotes || '',
        dietary: estimate.dietary || '',
        rentals: estimate.rentals || '',
        notes: estimate.notes || '',
        courses: estimate.courses || '',
        plannerInfo: estimate.plannerInfo || '',
        celebrationType: estimate.celebrationType || '',
        kitchenAccess: estimate.kitchenAccess || '',
        depositStatus: estimate.depositStatus || prev[type].depositStatus,
        lastEditedAt: estimate.lastEditedAt || prev[type].lastEditedAt,
        expiresAt: estimate.expiresAt || prev[type].expiresAt,
        holdSlotId: estimate.hold?.slotId || prev[type].holdSlotId,
        holdUntil: estimate.hold?.holdUntil || prev[type].holdUntil,
        holdStatus: estimate.hold?.status || prev[type].holdStatus,
        serverEstimate,
      },
    }));
  };

  const saveEstimate = async (type, options = {}) => {
    const form = getSmallEventForm(type);
    setSmallEventsSaving(true);
    setSmallEventsNotice('');
    try {
      const payload = {
        estimateId: form.estimateId || undefined,
        type,
        contactName: form.contactName,
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
        guestCount: form.guestCount,
        eventDate: form.eventDate,
        eventTime: form.eventTime,
        alternateDates: form.alternateDates,
        location: form.location,
        serviceStyle: form.serviceStyle,
        budgetRange: form.budgetRange,
        menuNotes: form.menuNotes,
        dietary: form.dietary,
        rentals: form.rentals,
        notes: form.notes,
        courses: form.courses,
        plannerInfo: form.plannerInfo,
        celebrationType: form.celebrationType,
        kitchenAccess: form.kitchenAccess,
        depositOverridePercent: form.depositOverridePercent,
        depositOverrideAmount: form.depositOverrideAmount,
        accountEmail: form.accountEmail,
        accountPassword: form.accountPassword,
        wantsAccount: form.wantsAccount,
        extend: options.extend || false,
      };

      const res = await fetch('/api/small-events/estimates', {
        method: 'POST',
        headers: buildSmallEventsHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to save estimate');

      if (data?.sessionToken && typeof window !== 'undefined') {
        window.localStorage.setItem('smallEventsSessionToken', data.sessionToken);
        setSmallEventsSessionToken(data.sessionToken);
      }

      applyEstimateResponse(type, data?.estimate, data?.hold);
      setSmallEventsNotice('Estimate saved.');
      return data?.estimate || null;
    } catch (error) {
      console.error('Small events save error:', error);
      setSmallEventsNotice(error.message || 'Unable to save estimate.');
      return null;
    } finally {
      setSmallEventsSaving(false);
    }
  };

  const loadLatestEstimate = async (type) => {
    setSmallEventsNotice('');
    try {
      const res = await fetch('/api/small-events/estimates', {
        headers: buildSmallEventsHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load saved estimates');
      const items = Array.isArray(data?.items) ? data.items : [];
      const match = items.find((item) => item.type === type);
      if (!match) {
        setSmallEventsNotice('No saved estimate found for this event type.');
        return;
      }
      applyEstimateToForm(type, match);
      setSmallEventsNotice('Loaded your saved estimate.');
    } catch (error) {
      console.error('Load estimate error:', error);
      setSmallEventsNotice(error.message || 'Unable to load estimate.');
    }
  };

  const getHoldForSlot = (slotId) => {
    if (!slotId) return null;
    const hold = calendarHolds.find((item) => item.slotId === slotId);
    if (!hold) return null;
    const holdTime = new Date(hold.holdUntil).getTime();
    if (hold.status !== 'confirmed' && holdTime < Date.now()) return null;
    return hold;
  };

  const holdSlot = async (slotId, type) => {
    if (!slotId) return;
    const form = getSmallEventForm(type);
    let estimateId = form.estimateId;
    if (!estimateId) {
      const saved = await saveEstimate(type);
      estimateId = saved?.id || '';
    }
    if (!estimateId) {
      setSmallEventsNotice('Save the estimate before holding a date.');
      return;
    }

    try {
      const res = await fetch('/api/small-events/holds', {
        method: 'POST',
        headers: buildSmallEventsHeaders(),
        body: JSON.stringify({ estimateId, slotId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Unable to hold slot');
      applyEstimateResponse(type, data?.estimate, data?.hold);
      await loadSmallEventsAvailability();
    } catch (error) {
      console.error('Hold slot error:', error);
      setSmallEventsNotice(error.message || 'Unable to hold slot.');
    }
  };

  const releaseHold = async (_slotId, type) => {
    const form = getSmallEventForm(type);
    if (!form.estimateId) return;
    try {
      const res = await fetch(`/api/small-events/holds?estimateId=${encodeURIComponent(form.estimateId)}`, {
        method: 'DELETE',
        headers: buildSmallEventsHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Unable to release hold');
      applyEstimateResponse(type, data?.estimate, null);
      await loadSmallEventsAvailability();
    } catch (error) {
      console.error('Release hold error:', error);
      setSmallEventsNotice(error.message || 'Unable to release hold.');
    }
  };

  const startDepositCheckout = async (type) => {
    const form = getSmallEventForm(type);
    if (!form.estimateId) {
      setSmallEventsNotice('Save the estimate before paying a deposit.');
      return;
    }
    try {
      const res = await fetch('/api/small-events/checkout', {
        method: 'POST',
        headers: buildSmallEventsHeaders(),
        body: JSON.stringify({ estimateId: form.estimateId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to start checkout');
      if (data?.url) {
        window.open(data.url, '_blank', 'noopener');
      }
      setSmallEventForms((prev) => ({
        ...prev,
        [type]: {
          ...prev[type],
          depositStatus: 'pending',
        },
      }));
    } catch (error) {
      console.error('Deposit checkout error:', error);
      setSmallEventsNotice(error.message || 'Unable to start deposit checkout.');
    }
  };

  const extendEstimate = async (type) => {
    await saveEstimate(type, { extend: true });
  };

  const updateAdminDraft = (field, value) => {
    setAdminSlotDraft((prev) => ({ ...prev, [field]: value }));
  };

  const applyAdminAvailability = async () => {
    if (!adminSlotDraft.date) return;
    try {
      const res = await fetch('/api/small-events/availability', {
        method: 'POST',
        headers: buildSmallEventsHeaders(),
        body: JSON.stringify(adminSlotDraft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to update availability');
      await loadSmallEventsAvailability();
    } catch (error) {
      console.error('Admin availability update error:', error);
      setSmallEventsNotice(error.message || 'Unable to update availability.');
    }
  };

  const clearExpiredHolds = async () => {
    try {
      const res = await fetch('/api/small-events/holds/cleanup', {
        method: 'POST',
        headers: buildSmallEventsHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to clear holds');
      await loadSmallEventsAvailability();
    } catch (error) {
      console.error('Hold cleanup error:', error);
      setSmallEventsNotice(error.message || 'Unable to clear holds.');
    }
  };

  const formatSlotDate = (value) => {
    if (!value) return 'TBD';
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return value;
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderSmallEventDialogContent = (type) => {
    const config = SMALL_EVENT_CONFIG[type];
    const form = getSmallEventForm(type);
    const estimate = getEstimateForType(type);
    const expiresAt = getEstimateExpiry(form);
    const fallbackHold = form.estimateId
      ? calendarHolds.find((hold) => hold.estimateId === form.estimateId)
      : null;
    const holdsOnSlot = getHoldForSlot(form.holdSlotId) || fallbackHold;
    const slots = availabilitySlots
      .filter((slot) => slot.type === type)
      .sort((a, b) => a.date.localeCompare(b.date));
    const depositPercent = getDepositPercent(form);
    const depositLabel = form.depositOverrideAmount
      ? `${formatCurrency(Number(form.depositOverrideAmount), { minimumFractionDigits: 2, maximumFractionDigits: 2 })} flat`
      : `${Math.round(depositPercent * 100)}%`;

    if (!config) return null;

    return (
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contact</div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-600">Name</label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.contactName}
                  onChange={(e) => updateSmallEventForm(type, 'contactName', e.target.value)}
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Email</label>
                <input
                  type="email"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.contactEmail}
                  onChange={(e) => updateSmallEventForm(type, 'contactEmail', e.target.value)}
                  placeholder="name@example.com"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Phone</label>
                <input
                  type="tel"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.contactPhone}
                  onChange={(e) => updateSmallEventForm(type, 'contactPhone', e.target.value)}
                  placeholder="(555) 555-5555"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Guest count</label>
                <input
                  type="number"
                  min="1"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.guestCount}
                  onChange={(e) => updateSmallEventForm(type, 'guestCount', e.target.value)}
                  placeholder="ex: 18"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Event basics</div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-600">Preferred date</label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.eventDate}
                  onChange={(e) => updateSmallEventForm(type, 'eventDate', e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Preferred time window</label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.eventTime}
                  onChange={(e) => updateSmallEventForm(type, 'eventTime', e.target.value)}
                  placeholder="ex: 6:30-9:30 PM"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-600">Alternate dates</label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.alternateDates}
                  onChange={(e) => updateSmallEventForm(type, 'alternateDates', e.target.value)}
                  placeholder="Add 2-3 backups"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-600">Location</label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.location}
                  onChange={(e) => updateSmallEventForm(type, 'location', e.target.value)}
                  placeholder="Address or venue name"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Menu and service</div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-600">Service style</label>
                <select
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={form.serviceStyle}
                  onChange={(e) => updateSmallEventForm(type, 'serviceStyle', e.target.value)}
                >
                  <option value="">Select style</option>
                  <option value="plated">Plated</option>
                  <option value="family">Family-style</option>
                  <option value="buffet">Buffet</option>
                  <option value="dropoff">Drop-off</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Budget range</label>
                <select
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  value={form.budgetRange}
                  onChange={(e) => updateSmallEventForm(type, 'budgetRange', e.target.value)}
                >
                  <option value="">Select range</option>
                  <option value="low">$ - value-focused</option>
                  <option value="mid">$$ - mid-range</option>
                  <option value="high">$$$ - premium</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-600">Menu notes</label>
                <textarea
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  rows={2}
                  value={form.menuNotes}
                  onChange={(e) => updateSmallEventForm(type, 'menuNotes', e.target.value)}
                  placeholder="Cuisine, courses, favorite ingredients"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-600">Dietary notes</label>
                <textarea
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  rows={2}
                  value={form.dietary}
                  onChange={(e) => updateSmallEventForm(type, 'dietary', e.target.value)}
                  placeholder="Allergies, restrictions, medical notes"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-600">Rentals or staffing needs</label>
                <textarea
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  rows={2}
                  value={form.rentals}
                  onChange={(e) => updateSmallEventForm(type, 'rentals', e.target.value)}
                  placeholder="Rentals, bar service, cleanup, extra staff"
                />
              </div>
            </div>
          </div>

          {type === 'dinner' && (
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dinner specifics</div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Course count</label>
                  <select
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={form.courses}
                    onChange={(e) => updateSmallEventForm(type, 'courses', e.target.value)}
                  >
                    <option value="">Select</option>
                    <option value="3">3 courses</option>
                    <option value="4">4 courses</option>
                    <option value="5">5+ courses</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Kitchen access</label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={form.kitchenAccess}
                    onChange={(e) => updateSmallEventForm(type, 'kitchenAccess', e.target.value)}
                    placeholder="Full kitchen, limited oven, etc."
                  />
                </div>
              </div>
            </div>
          )}

          {type === 'weddings' && (
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Wedding details</div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Planner or point of contact</label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={form.plannerInfo}
                    onChange={(e) => updateSmallEventForm(type, 'plannerInfo', e.target.value)}
                    placeholder="Planner name or role"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Celebration type</label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={form.celebrationType}
                    onChange={(e) => updateSmallEventForm(type, 'celebrationType', e.target.value)}
                    placeholder="Rehearsal, reception, late-night bites"
                  />
                </div>
              </div>
            </div>
          )}

          {type === 'holiday' && (
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Event details</div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Event type</label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={form.celebrationType}
                    onChange={(e) => updateSmallEventForm(type, 'celebrationType', e.target.value)}
                    placeholder="Holiday party, corporate event, birthday"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Setup needs</label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={form.kitchenAccess}
                    onChange={(e) => updateSmallEventForm(type, 'kitchenAccess', e.target.value)}
                    placeholder="Buffet table, heating, power"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Save estimate</div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-600">Send me a save link</label>
                <input
                  type="email"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={form.accountEmail}
                  onChange={(e) => updateSmallEventForm(type, 'accountEmail', e.target.value)}
                  placeholder="email for save link"
                />
              </div>
              <label className="md:col-span-2 flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={form.wantsAccount}
                  onChange={(e) => updateSmallEventForm(type, 'wantsAccount', e.target.checked)}
                />
                Create an account now to edit anytime
              </label>
              {form.wantsAccount && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Account email</label>
                    <input
                      type="email"
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={form.accountEmail}
                      onChange={(e) => updateSmallEventForm(type, 'accountEmail', e.target.value)}
                      placeholder="name@example.com"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Password</label>
                    <input
                      type="password"
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={form.accountPassword}
                      onChange={(e) => updateSmallEventForm(type, 'accountPassword', e.target.value)}
                      placeholder="Create a password"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:bg-slate-300"
                onClick={() => saveEstimate(type)}
                disabled={smallEventsSaving}
              >
                {smallEventsSaving ? 'Saving...' : 'Save estimate'}
              </button>
              <button
                type="button"
                className="rounded-md border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:border-slate-400"
                onClick={() => extendEstimate(type)}
              >
                Extend 5 days
              </button>
              <button
                type="button"
                className="rounded-md border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:border-slate-400"
                onClick={() => loadLatestEstimate(type)}
              >
                Load saved estimate
              </button>
            </div>
            {smallEventsNotice && (
              <div className="mt-2 text-xs text-slate-600">{smallEventsNotice}</div>
            )}
            <div className="mt-2 text-xs text-slate-500">
              Estimate expires on {expiresAt.toLocaleDateString()} (5 days from last update).
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estimate range</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {estimate
                ? `${formatCurrency(estimate.estimateMin)} - ${formatCurrency(estimate.estimateMax)}`
                : formatCurrency(0)}
            </div>
            <div className="mt-2 text-xs text-slate-600">
              Based on {estimate?.guestCount || 0} guests, {estimate?.staffingCount || 0} staff.
            </div>
            <div className="text-xs text-slate-500">
              Rentals, tax, and bar packages are estimated separately.
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-sm font-semibold text-slate-900">Deposit and booking</div>
            <div className="mt-2 text-xs text-slate-600">
              {depositLabel} deposit holds your date for {HOLD_WINDOW_HOURS} hours.
            </div>
            <div className="mt-2 text-lg font-semibold text-slate-900">
              Deposit due:{' '}
              {estimate
                ? formatCurrency(estimate.depositAmount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : formatCurrency(0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <button
              type="button"
              className="mt-3 w-full rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:bg-slate-300"
              onClick={() => startDepositCheckout(type)}
              disabled={!holdsOnSlot || form.depositStatus === 'paid'}
            >
              {form.depositStatus === 'paid'
                ? 'Deposit received'
                : form.depositStatus === 'pending'
                  ? 'Deposit started'
                  : 'Pay deposit via Square'}
            </button>
            <div className="mt-2 text-xs text-slate-500">
              {holdsOnSlot
                ? holdsOnSlot.status === 'confirmed'
                  ? 'Date confirmed. Final balance due before service.'
                  : `Hold active until ${new Date(holdsOnSlot.holdUntil).toLocaleString()}.`
                : 'No date hold yet. Select an available slot below.'}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-sm font-semibold text-slate-900">Availability</div>
            <div className="mt-3 space-y-2 text-xs text-slate-700">
              {availabilityLoading && <div>Loading availability...</div>}
              {!availabilityLoading && slots.length === 0 && <div>No slots listed yet.</div>}
              {!availabilityLoading && slots.map((slot) => {
                const hold = getHoldForSlot(slot.id);
                const status = hold ? hold.status : slot.status;
                const holdIsMine = hold && form.estimateId && hold.estimateId === form.estimateId;
                return (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">{formatSlotDate(slot.date)}</div>
                      <div className="text-xs text-slate-500">
                        {status === 'open' && 'Open'}
                        {status === 'blocked' && 'Blocked'}
                        {status === 'held' && (holdIsMine ? 'Hold pending (your request)' : 'Hold pending')}
                        {status === 'confirmed' && 'Confirmed'}
                        {slot.notes ? ` · ${slot.notes}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {status === 'open' && (
                        <button
                          type="button"
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:border-slate-400"
                          onClick={() => holdSlot(slot.id, type)}
                        >
                          Hold 24h
                        </button>
                      )}
                      {holdIsMine && status !== 'confirmed' && (
                        <button
                          type="button"
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:border-slate-400"
                          onClick={() => releaseHold(slot.id, type)}
                        >
                          Release
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Manual availability (future sync to Google or other calendars).
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-900">Admin controls</div>
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={isCalendarAdmin}
                  onChange={(e) => setIsCalendarAdmin(e.target.checked)}
                />
                Admin mode
              </label>
            </div>
            {isCalendarAdmin && (
              <div className="mt-3 space-y-3 text-xs text-slate-700">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold text-slate-600">Date</label>
                    <input
                      type="date"
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                      value={adminSlotDraft.date}
                      onChange={(e) => updateAdminDraft('date', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600">Type</label>
                    <select
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                      value={adminSlotDraft.type}
                      onChange={(e) => updateAdminDraft('type', e.target.value)}
                    >
                      {EVENT_TYPES.map((eventType) => (
                        <option key={eventType} value={eventType}>
                          {SMALL_EVENT_CONFIG[eventType].label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold text-slate-600">Status</label>
                    <select
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                      value={adminSlotDraft.status}
                      onChange={(e) => updateAdminDraft('status', e.target.value)}
                    >
                      <option value="open">Open</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600">Notes</label>
                    <input
                      type="text"
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                      value={adminSlotDraft.notes}
                      onChange={(e) => updateAdminDraft('notes', e.target.value)}
                      placeholder="Reason or label"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={adminSlotDraft.applyToAllTypes}
                    onChange={(e) => updateAdminDraft('applyToAllTypes', e.target.checked)}
                  />
                  Apply to all event types
                </label>
                <button
                  type="button"
                  className="w-full rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                  onClick={applyAdminAvailability}
                >
                  Save availability update
                </button>
                <button
                  type="button"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-400"
                  onClick={clearExpiredHolds}
                >
                  Clear expired holds
                </button>
                <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                  <div className="text-xs font-semibold text-slate-600">Deposit override</div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-slate-500">Percent</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                        value={form.depositOverridePercent}
                        onChange={(e) => updateSmallEventForm(type, 'depositOverridePercent', e.target.value)}
                        placeholder="15"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500">Flat amount</label>
                      <input
                        type="number"
                        min="0"
                        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                        value={form.depositOverrideAmount}
                        onChange={(e) => updateSmallEventForm(type, 'depositOverrideAmount', e.target.value)}
                        placeholder="1500"
                      />
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500">
                  Manual slots now. Ready for Google calendar sync later.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const handlePageChange = (index) => {
    setActivePage(index);
    // Reset all button styles when page changes
    document.querySelectorAll('nav button[data-menu-btn]').forEach(btn => {
      const pageIndex = parseInt(btn.getAttribute('data-page-index'));
      if (pageIndex !== index) {
        btn.style.backgroundColor = 'transparent';
        btn.style.color = SEMANTIC_UI_PALETTE.deep;
      }
    });
  };

  const navigateToPage = (index) => {
    if (window.scrollToPage) {
      window.scrollToPage(index);
    }
  };

  // Fetch images from Cloudinary API
  const shuffle = useCallback((arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }, []);

  const fetchImages = useCallback(async () => {
    setLoading(true);
    const apiUrl = '/api/search-images?per_page=100';
    try {
      const response = await fetch(apiUrl);
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('API endpoint not found');
      }
      const data = await response.json();
      if (!response.ok) {
        throw new Error(`Search failed (${response.status})`);
      }
      const imgs = Array.isArray(data.images) ? data.images : [];
      setImages(shuffle(imgs));
    } catch (err) {
      console.error('Error fetching images:', err);
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, [shuffle]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  useEffect(() => {
    if (smallEventsDialog) {
      loadSmallEventsAvailability();
      setSmallEventsNotice('');
    }
  }, [smallEventsDialog]);

  useEffect(() => {
    let abort = false;
    const controller = new AbortController();

    (async () => {
      setMealPlanLoading(true);
      setMealPlanError(null);
      try {
        const res = await fetch('/api/search-images?query=mealplan&per_page=24', { signal: controller.signal });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed loading meal plan photos');
        const imgs = Array.isArray(data.images) ? data.images : [];
        if (!abort) setMealPlanImages(imgs);
      } catch (e) {
        if (!abort) setMealPlanError(e.message || String(e));
      } finally {
        if (!abort) setMealPlanLoading(false);
      }
    })();

    return () => {
      abort = true;
      controller.abort();
    };
  }, []);

  // Initialize image order when images are loaded
  useEffect(() => {
    if (images.length > 0 && imageOrder.length === 0) {
      setImageOrder(images.map(img => img.asset_id || img.public_id));
    }
  }, [images, imageOrder.length]);

  // Calculate positions based on order
  useEffect(() => {
    if (imageOrder.length === 0 || images.length === 0) return;

    const calculatePositions = () => {
      const newPositions = {};
      const isMobile = window.innerWidth < 768;
      const isDesktop = window.innerWidth >= 1024;
      const columns = isMobile ? 3 : isDesktop ? 6 : 5;
      const columnHeights = new Array(columns).fill(0);
      const baseGap = 2;
      const baseColumnWidth = isMobile ? window.innerWidth / 3 : isDesktop ? window.innerWidth / 6 : window.innerWidth / 5;

      imageOrder.forEach((imgId, idx) => {
        const img = images.find(i => (i.asset_id || i.public_id) === imgId);
        if (!img) return;

        // Get actual image dimensions or use defaults
        const imgWidth = img.width || 400;
        const imgHeight = img.height || 500;
        const aspectRatio = imgWidth / imgHeight;

        // Determine if image should span multiple columns
        let spanColumns = 1;
        let imageWidth = baseColumnWidth;

        // Horizontal images (wider than tall) span 2 columns
        if (aspectRatio > 1.3) {
          spanColumns = Math.min(2, columns);
          imageWidth = baseColumnWidth * spanColumns;
        }
        // Very horizontal images span even more on desktop
        else if (aspectRatio > 1.8 && !isMobile) {
          spanColumns = Math.min(3, columns);
          imageWidth = baseColumnWidth * spanColumns;
        }

        // Calculate height based on actual aspect ratio
        const imageHeight = imageWidth / aspectRatio;

        // Find the best position (column with shortest height that can fit span)
        let bestCol = 0;
        let minHeight = Infinity;

        for (let col = 0; col <= columns - spanColumns; col++) {
          // Check max height of columns this image would span
          let maxHeightInSpan = 0;
          for (let i = 0; i < spanColumns; i++) {
            maxHeightInSpan = Math.max(maxHeightInSpan, columnHeights[col + i]);
          }

          if (maxHeightInSpan < minHeight) {
            minHeight = maxHeightInSpan;
            bestCol = col;
          }
        }

        const x = bestCol * baseColumnWidth;
        const y = minHeight;

        newPositions[imgId] = {
          x,
          y,
          column: bestCol,
          width: imageWidth,
          height: imageHeight,
          spanColumns
        };

        // Update all spanned columns
        for (let i = 0; i < spanColumns; i++) {
          columnHeights[bestCol + i] = y + imageHeight + baseGap;
        }
      });

      setPositions(newPositions);
    };

    calculatePositions();

    // Recalculate on window resize
    const handleResize = () => calculatePositions();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [imageOrder, images]);

  // Drag handlers
  const handleDragStart = useCallback((id) => {
    setIsDragging(id);
    dragStartTime.current = Date.now();
  }, []);

  const handleDragEnd = useCallback((id, event, info) => {
    const dragDuration = Date.now() - dragStartTime.current;
    const dragDistance = Math.sqrt(info.offset.x ** 2 + info.offset.y ** 2);

    setIsDragging(null);

    // If it was a quick click (not a drag), open lightbox - very sensitive thresholds
    if (dragDuration < 800 && dragDistance < 30) {
      const img = images.find(i => (i.asset_id || i.public_id) === id);
      if (img) {
        const idx = images.findIndex(i => (i.asset_id || i.public_id) === id);
        setSelected({ img, idx });
        return;
      }
    }

    // Otherwise, handle reordering
    const currentPos = positions[id];
    if (!currentPos) return;

    const isMobile = window.innerWidth < 768;
    const isDesktop = window.innerWidth >= 1024;
    const columns = isMobile ? 3 : isDesktop ? 6 : 5;
    const baseColumnWidth = isMobile ? window.innerWidth / 3 : isDesktop ? window.innerWidth / 6 : window.innerWidth / 5;

    // Calculate new position after drag
    const newX = currentPos.x + info.offset.x;
    const newY = currentPos.y + info.offset.y;

    // Determine which column we're closest to (considering span)
    const targetColumn = Math.max(0, Math.min(columns - (currentPos.spanColumns || 1), Math.round(newX / baseColumnWidth)));

    // Find all images in each column (excluding the dragged one)
    const columnImages = Array(columns).fill(null).map(() => []);
    imageOrder.forEach(imgId => {
      if (imgId === id) return;
      const pos = positions[imgId];
      if (pos && pos.column !== undefined) {
        columnImages[pos.column].push({
          id: imgId,
          y: pos.y,
          height: pos.height || baseColumnWidth * 1.2
        });
      }
    });

    // Sort each column by Y position
    columnImages.forEach(col => col.sort((a, b) => a.y - b.y));

    // Find where in the target column this image should be inserted
    const targetColumnImages = columnImages[targetColumn];
    let insertIndex = targetColumnImages.length;

    for (let i = 0; i < targetColumnImages.length; i++) {
      if (newY < targetColumnImages[i].y) {
        insertIndex = i;
        break;
      }
    }

    // Rebuild the order array with the moved image in its new position
    const newOrder = [];
    const columnsToProcess = Array(columns).fill(null).map(() => []);

    // Distribute images back into columns
    imageOrder.forEach(imgId => {
      if (imgId === id) return;
      const pos = positions[imgId];
      if (pos && pos.column !== undefined) {
        columnsToProcess[pos.column].push(imgId);
      }
    });

    // Insert dragged image into target column at correct position
    columnsToProcess[targetColumn].splice(insertIndex, 0, id);

    // Interleave columns to rebuild order (for more natural flow)
    const maxLength = Math.max(...columnsToProcess.map(col => col.length));
    for (let i = 0; i < maxLength; i++) {
      columnsToProcess.forEach(col => {
        if (col[i]) newOrder.push(col[i]);
      });
    }

    setImageOrder(newOrder);
  }, [images, positions, imageOrder]);

  const closeLightbox = useCallback(() => setSelected(null), []);

  const prefetchImage = useCallback((url) => {
    if (!url || typeof document === 'undefined') return;
    if (prefetched.current.has(url)) return;
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    prefetched.current.add(url);
  }, []);

  const resetWaitlist = () =>
    setWaitlist({
      name: '',
      email: '',
      phone: '',
      familySize: '',
      children: '',
      daysPerWeek: '',
      mealsPerDay: '',
      allergies: '',
      questions: '',
    });

  const handleWaitlistChange = (field, value) => {
    setWaitlist((prev) => ({ ...prev, [field]: value }));
    if (waitlistStatus !== 'idle') setWaitlistStatus('idle');
  };

  const handleWaitlistSubmit = async (event) => {
    event.preventDefault();
    setWaitlistStatus('sending');
    try {
      const lines = [
        'Weekly Meal Prep Waitlist signup',
        `Name: ${waitlist.name}`,
        `Email: ${waitlist.email}`,
        `Phone: ${waitlist.phone || '(not provided)'}`,
        `Family size: ${waitlist.familySize || '(not provided)'}`,
        `Children & ages: ${waitlist.children || '(not provided)'}`,
        `Days per week: ${waitlist.daysPerWeek || '(not provided)'}`,
        `Meals per day: ${waitlist.mealsPerDay || '(not provided)'}`,
        `Allergies or medical comments: ${waitlist.allergies || '(none noted)'}`,
        '',
        'Questions or notes:',
        waitlist.questions || '(none provided)',
      ];
      const payload = {
        name: waitlist.name,
        email: waitlist.email,
        phone: waitlist.phone,
        subject: 'Meal Prep Waitlist signup',
        type: 'meal-prep-waitlist',
        message: lines.join('\n'),
      };
      const res = await fetch('/api/messages/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      setWaitlistStatus('success');
      resetWaitlist();
    } catch (_error) {
      setWaitlistStatus('error');
    }
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    const onKey = (e) => {
      if (!selected) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') {
        const next = (selected.idx + 1) % images.length;
        setSelected({ img: images[next], idx: next });
      }
      if (e.key === 'ArrowLeft') {
        const prev = (selected.idx - 1 + images.length) % images.length;
        setSelected({ img: images[prev], idx: prev });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, images, closeLightbox]);

  useEffect(() => {
    if (selected && closeBtnRef.current) closeBtnRef.current.focus();
  }, [selected]);

  return (
    <>
      {/* Fixed Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 shadow-sm" style={{ backgroundColor: SEMANTIC_UI_PALETTE.primary, borderBottom: `1px solid ${SEMANTIC_UI_PALETTE.muted}` }}>
        <div className="flex items-center justify-between px-6 py-4">
          <button
            onClick={() => navigateToPage(0)}
            className="flex items-center gap-3"
          >
            <motion.span
              className="text-2xl font-bold tracking-tight"
              style={{ 
                color: SEMANTIC_UI_PALETTE.deep, 
                fontFamily: "'National Park', 'General Sans', sans-serif",
                fontWeight: 700,
                letterSpacing: '-0.02em'
              }}
              whileHover={{ scale: 1.03 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              Local Effort
            </motion.span>
            <span className="text-sm font-medium" style={{ color: SEMANTIC_UI_PALETTE.deep, fontFamily: "'Office Code Pro', monospace" }}>
              always mostly local
            </span>
          </button>

          <div className="flex gap-1">
            {pages.slice(1).map((page, index) => {
              const isActive = activePage === index + 1;
              return (
                <button
                  key={page.id}
                  data-menu-btn
                  data-page-index={index + 1}
                  onClick={() => navigateToPage(index + 1)}
                  className="px-4 py-2 rounded-md text-sm font-medium transition-all group"
                  style={{
                    backgroundColor: isActive ? SEMANTIC_UI_PALETTE.deep : 'transparent',
                    color: isActive ? SEMANTIC_UI_PALETTE.primary : SEMANTIC_UI_PALETTE.deep,
                    fontFamily: "'Office Code Pro', monospace",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = SEMANTIC_UI_PALETTE.accent;
                      e.currentTarget.style.color = SEMANTIC_UI_PALETTE.deep;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = SEMANTIC_UI_PALETTE.deep;
                    }
                  }}
                >
                  {page.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Full Page Container */}
      <FullPageContainer
        pages={pages}
        enableKeyboard={true}
        onPageChange={handlePageChange}
      >
        {/* Page 1: Home - Gallery */}
        <FullPageSection
          id="home"
          style={{ backgroundColor: SEMANTIC_UI_PALETTE.primary }}
          animation="fadeScale"
        >
          <div className="w-full h-full overflow-y-auto pt-20">
            {loading ? (
              <div className="text-center py-20" style={{ color: SEMANTIC_UI_PALETTE.deep }}>
                Loading images...
              </div>
            ) : images.length === 0 ? (
              <div className="text-center py-20" style={{ color: SEMANTIC_UI_PALETTE.deep }}>
                No images found.
              </div>
            ) : (
              <div
                ref={containerRef}
                className="relative w-full"
                style={{ minHeight: '2000px' }}
              >
                {images.map((img, idx) => {
                  const imgId = img.asset_id || img.public_id;
                  const pos = positions[imgId] || { x: 0, y: 0, width: 300, height: 400 };
                  const isBeingDragged = isDragging === imgId;

                  return (
                    <motion.div
                      key={imgId}
                      drag
                      dragMomentum={false}
                      dragElastic={0.05}
                      onDragStart={() => handleDragStart(imgId)}
                      onDragEnd={(e, info) => handleDragEnd(imgId, e, info)}
                      onMouseEnter={() => img?.large_url && prefetchImage(img.large_url)}
                      style={{
                        position: 'absolute',
                        width: pos.width,
                        height: pos.height,
                        cursor: isBeingDragged ? 'grabbing' : 'grab',
                        zIndex: isBeingDragged ? 50 : 1,
                      }}
                      animate={{
                        x: pos.x,
                        y: pos.y,
                        opacity: 1,
                        scale: 1,
                      }}
                      whileHover={{
                        scale: 1.03,
                        zIndex: 10,
                        transition: { type: "spring", stiffness: 400, damping: 25 }
                      }}
                      whileDrag={{
                        scale: 1.05,
                        zIndex: 50,
                        transition: { type: "spring", stiffness: 400, damping: 25 }
                      }}
                      initial={{
                        opacity: 0,
                        scale: 0.8,
                        x: pos.x,
                        y: pos.y,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 26,
                        delay: idx * 0.01,
                      }}
                    >
                      {img.thumbnail_url ? (
                        <img
                          src={img.thumbnail_url}
                          alt={img.context?.alt || 'Gallery image'}
                          className="w-full h-full block select-none pointer-events-none object-cover"
                          draggable={false}
                          loading="eager"
                          decoding="async"
                          fetchpriority={idx < 20 ? "high" : "auto"}
                          style={{
                            transition: 'none',
                            display: 'block',
                          }}
                        />
                      ) : (
                        <CloudinaryImage
                          publicId={img.public_id}
                          alt={img.context?.alt || 'Gallery image'}
                          width={Math.floor(pos.width)}
                          className="w-full h-full block select-none pointer-events-none object-cover"
                          disableLazy={idx < 20}
                        />
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </FullPageSection>

        {/* Page 2: Weekly Meals */}
        <FullPageSection
          id="weekly-meals"
          style={{ backgroundColor: SEMANTIC_UI_PALETTE.secondary }}
        >
          <div className="relative h-full pt-20">
            <div className="flex items-start">
              <div
                className="group"
                style={{
                  marginTop: '50px',
                  marginLeft: '50px',
                  padding: '12px 16px',
                  backgroundColor: 'rgba(128, 128, 128, 0.2)',
                  borderRadius: '6px',
                }}
              >
                <div
                  className="line-through group-hover:italic"
                  style={{
                    color: SEMANTIC_UI_PALETTE.deep,
                    fontFamily: "'Office Code Pro', monospace",
                    fontSize: '18px',
                    fontWeight: 600,
                  }}
                >
                  Pickup on Sundays
                </div>
                <button
                  type="button"
                  className="inline-block line-through group-hover:italic"
                  disabled
                  aria-disabled="true"
                  style={{
                    marginTop: '12px',
                    color: SEMANTIC_UI_PALETTE.deep,
                    fontFamily: "'Office Code Pro', monospace",
                    fontSize: '16px',
                    fontWeight: 600,
                    textDecoration: 'underline',
                    cursor: 'not-allowed',
                    opacity: 0.6,
                  }}
                >
                  order here
                </button>
              </div>
              <motion.span
                aria-hidden="true"
                style={{
                  marginTop: '72px',
                  marginLeft: '24px',
                  marginRight: '24px',
                  color: SEMANTIC_UI_PALETTE.deep,
                  fontSize: '24px',
                }}
                animate={{ x: [0, 10, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              >
                →
              </motion.span>
              <div
                style={{
                  marginTop: '50px',
                  marginLeft: '50px',
                }}
              >
                <div
                  className="rounded-md border border-slate-300 bg-white/80 px-4 py-3"
                  style={{ fontFamily: "'Office Code Pro', monospace" }}
                >
                  <div className="text-sm font-semibold text-slate-900">Waiting list</div>
                  <div className="mt-1 text-xs text-slate-600">We&apos;ll let you know when space opens up.</div>
                  <button
                    type="button"
                    className="mt-3 w-full rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                    onClick={() => {
                      resetWaitlist();
                      setWaitlistStatus('idle');
                      setShowWaitlistForm(true);
                    }}
                  >
                    Join the waitlist
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-12 px-[50px]">
              {mealPlanLoading ? (
                <div className="text-sm text-gray-600">Loading photos...</div>
              ) : mealPlanError ? (
                <div className="text-sm text-red-700">{mealPlanError}</div>
              ) : (
                <div className="columns-2 md:columns-3 lg:columns-4 gap-4 [column-fill:_balance]">
                  <div className="mb-4 break-inside-avoid border p-4 bg-white/70 rounded-lg">
                    <div
                      style={{
                        fontFamily: "'Yomogi', cursive",
                        color: SEMANTIC_UI_PALETTE.deep,
                        fontSize: '22px',
                        lineHeight: 1.5,
                      }}
                    >
                      From a few meals a week to complete meal replacement. We make wholesome home cooked meals from high integrity local ingredients. We ensure that you eat real food all week.
                    </div>
                  </div>
                  {mealPlanImages.map((img, idx) => (
                    <div
                      key={(img.asset_id || img.public_id || idx) + ':' + idx}
                      className="mb-4 break-inside-avoid border p-2 bg-white rounded-lg overflow-hidden"
                    >
                      {img.thumbnail_url ? (
                        <img
                          src={img.thumbnail_url}
                          alt={img.context?.alt || 'Meal prep image'}
                          className="rounded-lg w-full h-auto"
                          loading="lazy"
                        />
                      ) : (
                        <CloudinaryImage
                          publicId={img.public_id || img.publicId}
                          alt={img.context?.alt || 'Meal prep image'}
                          width={800}
                          className="rounded-lg w-full h-auto"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </FullPageSection>

        {/* Page 3: Small Events */}
        <FullPageSection
          id="small-events"
          style={{ backgroundColor: SEMANTIC_UI_PALETTE.accent }}
        >
          <div className="relative w-full h-full">
            <img
              src="https://res.cloudinary.com/dokyhfvyd/image/upload/c_limit,f_auto,q_auto,w_1600/vjuesai2mxfavpq9d2df"
              alt="Small Events"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: 'center' }}
            />
            <div className="relative z-10 flex items-start justify-center h-full pt-24">
              <div
                style={{
                  display: 'table',
                  borderCollapse: 'separate',
                  borderSpacing: '16px',
                }}
              >
                <div style={{ display: 'table-row' }}>
                  <div style={{ display: 'table-cell' }}>
                    <button
                      type="button"
                      onClick={() => setSmallEventsDialog('dinner')}
                      className="px-6 py-5 rounded-md border border-white/70 bg-white/80 text-left text-base font-semibold text-slate-900 hover:bg-white"
                      style={{ fontFamily: "'Office Code Pro', monospace" }}
                    >
                      dinner party in my home
                    </button>
                  </div>
                  <div style={{ display: 'table-cell' }}>
                    <button
                      type="button"
                      onClick={() => setSmallEventsDialog('weddings')}
                      className="px-6 py-5 rounded-md border border-white/70 bg-white/80 text-left text-base font-semibold text-slate-900 hover:bg-white"
                      style={{ fontFamily: "'Office Code Pro', monospace" }}
                    >
                      weddings
                    </button>
                  </div>
                  <div style={{ display: 'table-cell' }}>
                    <button
                      type="button"
                      onClick={() => setSmallEventsDialog('holiday')}
                      className="px-6 py-5 rounded-md border border-white/70 bg-white/80 text-left text-base font-semibold text-slate-900 hover:bg-white"
                      style={{ fontFamily: "'Office Code Pro', monospace" }}
                    >
                      small events and holiday parties
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FullPageSection>

        {/* Page 4: For Businesses */}
        <FullPageSection
          id="for-businesses"
          style={{ backgroundColor: SEMANTIC_UI_PALETTE.deep }}
        >
          <div className="h-full pt-20" />
        </FullPageSection>

        {/* Page 5: About */}
        <FullPageSection
          id="about"
          style={{ backgroundColor: SEMANTIC_UI_PALETTE.muted }}
        >
          <div className="relative w-full h-full">
            <img
              src="https://res.cloudinary.com/dokyhfvyd/image/upload/c_limit,f_auto,q_auto,w_1600/jo9pxtjng8zpt4yo4rcz?_a=BAMAK+eA0"
              alt="About Local Effort"
              className="w-full h-full object-contain"
              style={{ objectPosition: 'center', backgroundColor: SEMANTIC_UI_PALETTE.muted }}
            />
          </div>
        </FullPageSection>

        {/* Page 6: Local Pizza */}
        <FullPageSection
          id="local-pizza"
          style={{ backgroundColor: SEMANTIC_UI_PALETTE.primary }}
        >
          <div className="relative w-full h-full pt-20">
            <img
              src="/gallery/5Z0A5737-Edit.jpg"
              alt="Local pizza"
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: 'center' }}
            />
            <div className="relative z-10 flex h-full items-end px-8 pb-16">
              <div
                className="max-w-lg rounded-lg border border-white/60 bg-white/85 p-5 text-slate-900 shadow-lg"
                style={{ fontFamily: "'Office Code Pro', monospace" }}
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Local pizza</div>
                <div className="mt-2 text-lg font-semibold">Wood-fired pizza for parties and pop-ups.</div>
                <div className="mt-2 text-sm text-slate-700">
                  We bring the oven, the local ingredients, and the crew. Perfect for birthdays, patios, and
                  neighborhood gatherings.
                </div>
              </div>
            </div>
          </div>
        </FullPageSection>
      </FullPageContainer>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 cursor-pointer"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeLightbox}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-6xl max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {selected.img.large_url ? (
                <img
                  src={selected.img.large_url}
                  alt={selected.img.context?.alt || 'Large gallery image'}
                  decoding="async"
                  fetchPriority="high"
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                />
              ) : (
                <CloudinaryImage
                  publicId={selected.img.public_id}
                  alt={selected.img.context?.alt || 'Large gallery image'}
                  width={2000}
                  height={2000}
                  disableLazy
                  eager
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                />
              )}

              <button
                ref={closeBtnRef}
                onClick={closeLightbox}
                className="absolute -top-4 -right-4 w-12 h-12 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-800 text-3xl font-light transition-colors shadow-lg"
                aria-label="Close"
              >
                ×
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={orderOpen} onOpenChange={setOrderOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Weekly Meals Ordering</DialogTitle>
            <DialogDescription>
              Demo menu and ordering flow. We will replace this with the real system.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-slate-900">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="text-sm font-semibold">Small Menu</div>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Roasted lemon chicken</span>
                  <span>$14</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Herb tofu bowl</span>
                  <span>$12</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Seasonal veggie lasagna</span>
                  <span>$13</span>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="font-semibold">Pickup window</div>
              <div className="mt-1 text-slate-700">Sundays, 4:00-6:00 PM</div>
            </div>
            <button
              type="button"
              className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              onClick={() => setOrderOpen(false)}
            >
              Place demo order
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={smallEventsDialog === 'dinner'} onOpenChange={(open) => setSmallEventsDialog(open ? 'dinner' : null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[980px]">
          <DialogHeader>
          <DialogTitle>Dinner party in my home</DialogTitle>
            <DialogDescription>
              Chef-led, multi-course dinners with seasonal menus, staffing, and a 15% deposit to hold the date.
            </DialogDescription>
          </DialogHeader>
          {renderSmallEventDialogContent('dinner')}
        </DialogContent>
      </Dialog>

      <Dialog open={smallEventsDialog === 'weddings'} onOpenChange={(open) => setSmallEventsDialog(open ? 'weddings' : null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[980px]">
          <DialogHeader>
            <DialogTitle>Weddings</DialogTitle>
            <DialogDescription>
              Flexible packages for rehearsal dinners, receptions, and late-night bites with deposit holds.
            </DialogDescription>
          </DialogHeader>
          {renderSmallEventDialogContent('weddings')}
        </DialogContent>
      </Dialog>

      <Dialog open={smallEventsDialog === 'holiday'} onOpenChange={(open) => setSmallEventsDialog(open ? 'holiday' : null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[980px]">
          <DialogHeader>
            <DialogTitle>Small events and holiday parties</DialogTitle>
            <DialogDescription>
              Drop-off or staffed menus for work parties, milestones, and holiday hosting.
            </DialogDescription>
          </DialogHeader>
          {renderSmallEventDialogContent('holiday')}
        </DialogContent>
      </Dialog>

      {showWaitlistForm && (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center bg-black/60 px-4 py-8 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="form-card w-full max-w-xl max-h-[90vh] overflow-y-auto relative">
            <button
              type="button"
              className="absolute right-4 top-4 text-sm underline z-10"
              onClick={() => {
                setShowWaitlistForm(false);
                setWaitlistStatus('idle');
                resetWaitlist();
              }}
            >
              Close
            </button>
            <h2 className="text-2xl font-bold mb-2">Join the waiting list</h2>
            <p className="text-sm text-gray-600 mb-4">
              We&apos;ll reach out when weekly meal pickup slots reopen.
            </p>
            <form onSubmit={handleWaitlistSubmit} className="space-y-4">
              <div>
                <label className="label" htmlFor="weekly-waitlist-name">Name</label>
                <input
                  id="weekly-waitlist-name"
                  className="input"
                  value={waitlist.name}
                  onChange={(e) => handleWaitlistChange('name', e.target.value)}
                  required
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="weekly-waitlist-email">Email</label>
                  <input
                    id="weekly-waitlist-email"
                    type="email"
                    className="input"
                    value={waitlist.email}
                    onChange={(e) => handleWaitlistChange('email', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label" htmlFor="weekly-waitlist-phone">Phone number</label>
                  <input
                    id="weekly-waitlist-phone"
                    className="input"
                    value={waitlist.phone}
                    onChange={(e) => handleWaitlistChange('phone', e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="weekly-waitlist-family">Family size</label>
                <input
                  id="weekly-waitlist-family"
                  className="input"
                  placeholder="e.g. 2 adults, 2 kids"
                  value={waitlist.familySize}
                  onChange={(e) => handleWaitlistChange('familySize', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="weekly-waitlist-children">Children &amp; ages</label>
                <textarea
                  id="weekly-waitlist-children"
                  className="textarea"
                  rows={2}
                  value={waitlist.children}
                  onChange={(e) => handleWaitlistChange('children', e.target.value)}
                  placeholder="Tell us about school schedules, toddlers, or teens."
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="weekly-waitlist-days">Days per week</label>
                  <input
                    id="weekly-waitlist-days"
                    className="input"
                    placeholder="How many days should we cover?"
                    value={waitlist.daysPerWeek}
                    onChange={(e) => handleWaitlistChange('daysPerWeek', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label" htmlFor="weekly-waitlist-meals">Meals per day</label>
                  <input
                    id="weekly-waitlist-meals"
                    className="input"
                    placeholder="Breakfast, lunch, dinner?"
                    value={waitlist.mealsPerDay}
                    onChange={(e) => handleWaitlistChange('mealsPerDay', e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="weekly-waitlist-allergies">Allergies or medical comments</label>
                <textarea
                  id="weekly-waitlist-allergies"
                  className="textarea"
                  rows={3}
                  value={waitlist.allergies}
                  onChange={(e) => handleWaitlistChange('allergies', e.target.value)}
                  placeholder="Include any dietary restrictions, allergies, or doctor notes."
                />
              </div>
              <div>
                <label className="label" htmlFor="weekly-waitlist-questions">Questions for the team</label>
                <textarea
                  id="weekly-waitlist-questions"
                  className="textarea"
                  rows={3}
                  value={waitlist.questions}
                  onChange={(e) => handleWaitlistChange('questions', e.target.value)}
                  placeholder="Anything else we should know?"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button type="submit" className="btn btn-primary" disabled={waitlistStatus === 'sending'}>
                  {waitlistStatus === 'sending' ? 'Submitting...' : 'Join waitlist'}
                </button>
                {waitlistStatus === 'success' && (
                  <span className="text-green-700 text-sm">Thanks! We&apos;ll be in touch.</span>
                )}
                {waitlistStatus === 'error' && (
                  <span className="text-red-700 text-sm">We couldn&apos;t submit your request. Please try again.</span>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default FullPageDemoPage;
