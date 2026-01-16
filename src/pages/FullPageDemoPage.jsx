// src/pages/FullPageDemoPage.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
import '../styles/fullpage-demo-theme.css';

const SMALL_EVENT_CONFIG = {
  dinner: {
    label: 'Dinner party',
    baseRate: 85,
    minimumTotal: 0,
    minGuests: 4,
    maxGuests: 16,
    staffingGuestsPer: 8,
    staffingHourly: 45,
    staffingHours: 4,
    rangeMin: 0.9,
    rangeMax: 1.2,
  },
  weddings: {
    label: 'Weddings',
    baseRate: 45,
    minimumTotal: 0,
    maxGuests: 50,
    staffingGuestsPer: 12,
    staffingHourly: 55,
    staffingHours: 6,
    rangeMin: 0.92,
    rangeMax: 1.25,
  },
  holiday: {
    label: 'Small events',
    baseRate: 45,
    minimumTotal: 0,
    maxGuests: 75,
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
const WHOLESALE_MENU_ITEMS = [
  { name: 'Market bread + cultured butter', price: '$4.50 / portion' },
  { name: 'Roasted vegetable lasagna', price: '$12.00 / portion' },
  { name: 'Herb chicken + lemon jus', price: '$13.50 / portion' },
  { name: 'Seasonal grain salad', price: '$9.00 / portion' },
  { name: 'House pickles + condiments', price: '$3.50 / portion' },
];

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

const BRAND_TOKENS = {
  bgPage: 'var(--color-bg-page)',
  bgSection: 'var(--color-bg-section)',
  bgSecondary: 'var(--color-bg-secondary)',
  bgStrong: 'var(--color-border-strong)',
  textPrimary: 'var(--color-text-primary)',
  textInverse: 'var(--color-text-inverse)',
  borderDefault: 'var(--color-border-default)',
  surfaceMuted: 'var(--color-surface-muted)',
  overlayStrong: 'var(--color-overlay-strong)',
};

const getImageId = (img) => img.asset_id || img.public_id;

const GalleryItem = ({
  id,
  img,
  index,
  pos,
  layoutReady,
  onSelect,
  onPrefetch,
  disableDrag,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: disableDrag });

  const dragOffset = transform || { x: 0, y: 0 };
  const style = {
    position: 'absolute',
    width: pos.width,
    height: pos.height,
    transform: CSS.Translate.toString({
      x: pos.x + dragOffset.x,
      y: pos.y + dragOffset.y,
    }),
    transition: isDragging ? 'none' : transition || 'transform 220ms ease',
    opacity: layoutReady ? 1 : 0,
    cursor: isDragging ? 'grabbing' : 'grab',
    zIndex: isDragging ? 50 : 1,
    willChange: 'transform',
    pointerEvents: layoutReady ? 'auto' : 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onMouseEnter={() => img?.large_url && onPrefetch(img.large_url)}
      onClick={() => onSelect(id)}
      {...attributes}
      {...listeners}
    >
      {img.thumbnail_url ? (
        <img
          src={img.thumbnail_url}
          alt={img.context?.alt || 'Gallery image'}
          className="w-full h-full block select-none pointer-events-none object-cover"
          draggable={false}
          loading="eager"
          decoding="async"
          fetchpriority={index < 20 ? 'high' : 'auto'}
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
          disableLazy={index < 20}
        />
      )}
    </div>
  );
};

const FullPageDemoPage = () => {
  const [activePage, setActivePage] = useState(0);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [activeDragId, setActiveDragId] = useState(null);
  const prefetched = useRef(new Set());
  const closeBtnRef = useRef(null);
  const lastDragEndRef = useRef(0);
  const [imageOrder, setImageOrder] = useState([]);
  const [positions, setPositions] = useState({});
  const containerRef = useRef(null);
  const [layoutReady, setLayoutReady] = useState(false);
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
  const [businessPanel, setBusinessPanel] = useState(null);
  const [wholesaleEmail, setWholesaleEmail] = useState('');
  const [wholesaleSubmitted, setWholesaleSubmitted] = useState(false);
  const [officeLunchesOpen, setOfficeLunchesOpen] = useState(false);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [quoteDialogType, setQuoteDialogType] = useState('');
  const [quoteName, setQuoteName] = useState('');
  const [quoteEmail, setQuoteEmail] = useState('');
  const [quoteMessage, setQuoteMessage] = useState('');
  const [quoteStatus, setQuoteStatus] = useState('idle');
  const [quoteError, setQuoteError] = useState('');

  const pages = [
    { id: 'home', label: 'Home' },
    { id: 'weekly-meals', label: 'Weekly Meals' },
    { id: 'small-events', label: 'Small Events' },
    { id: 'for-businesses', label: 'For Business' },
    { id: 'about', label: 'About' },
    { id: 'local-pizza', label: 'Local Pizza' },
  ];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

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

const clampGuestCount = (value, config) => {
  if (value === '' || value === null || value === undefined) return 0;
  let count = parseGuestCount(value);
  if (count <= 0) return 0;
  if (config?.minGuests && count < config.minGuests) count = config.minGuests;
  if (config?.maxGuests && count > config.maxGuests) count = config.maxGuests;
  return count;
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

  const handleBusinessSelect = (panel) => {
    setBusinessPanel(panel);
    if (panel === 'office') {
      setOfficeLunchesOpen(true);
    }
  };

  const handleWholesaleSubmit = (event) => {
    event.preventDefault();
    if (!wholesaleEmail) return;
    setWholesaleSubmitted(true);
  };

  const openQuoteDialog = (type) => {
    const form = getSmallEventForm(type);
    setQuoteDialogType(type);
    setQuoteName(form.contactName || '');
    setQuoteEmail(form.contactEmail || '');
    setQuoteMessage('');
    setQuoteStatus('idle');
    setQuoteError('');
    setQuoteDialogOpen(true);
  };

  const buildQuoteMessage = (type) => {
    const config = SMALL_EVENT_CONFIG[type];
    const form = getSmallEventForm(type);
    const estimate = getEstimateForType(type);
    const depositPercent = getDepositPercent(form);
    const depositLabel = form.depositOverrideAmount
      ? `${formatCurrency(Number(form.depositOverrideAmount), { minimumFractionDigits: 2, maximumFractionDigits: 2 })} flat`
      : `${Math.round(depositPercent * 100)}%`;
    const guestCount = clampGuestCount(form.guestCount, config);
    const fallbackHold = form.estimateId
      ? calendarHolds.find((hold) => hold.estimateId === form.estimateId)
      : null;
    const hold = getHoldForSlot(form.holdSlotId) || fallbackHold;

    const lines = [];
    const addLine = (label, value) => {
      if (value === undefined || value === null || value === '') return;
      lines.push(`${label}: ${value}`);
    };

    addLine('Event type', config?.label || type);
    addLine('Guest count', guestCount || form.guestCount);
    addLine('Contact name', form.contactName || quoteName);
    addLine('Contact email', form.contactEmail || quoteEmail);
    addLine('Contact phone', form.contactPhone);
    addLine('Event date', form.eventDate);
    addLine('Event time', form.eventTime);
    addLine('Location', form.location);
    addLine('Service style', form.serviceStyle);
    addLine('Menu notes', form.menuNotes);
    addLine('Dietary notes', form.dietary);
    addLine('Rentals or staffing', form.rentals);

    if (type === 'dinner') {
      addLine('Course count', form.courses);
      addLine('Kitchen access', form.kitchenAccess);
    }

    if (type === 'weddings') {
      addLine('Planner or contact', form.plannerInfo);
      addLine('Meal moments', form.celebrationType);
    }

    if (type === 'holiday') {
      addLine('Occasion', form.celebrationType);
      addLine('Setup needs', form.kitchenAccess);
    }

    if (estimate && (guestCount || form.guestCount)) {
      addLine('Estimate range', `${formatCurrency(estimate.estimateMin)} - ${formatCurrency(estimate.estimateMax)}`);
      if (type === 'weddings' && estimate.coordinationFee) {
        addLine('Event coordination (5%)', formatCurrency(estimate.coordinationFee));
      }
      addLine(
        'Deposit',
        `${depositLabel} (${formatCurrency(estimate.depositAmount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
      );
    }

    if (hold) {
      addLine('Hold status', hold.status || 'hold');
      if (hold.holdUntil) {
        addLine('Hold until', new Date(hold.holdUntil).toLocaleString());
      }
      if (hold.slotId) {
        addLine('Hold slot', hold.slotId);
      }
    }

    const note = quoteMessage.trim();
    if (note) {
      lines.push('');
      lines.push('Customer note:');
      lines.push(note);
    }

    return lines.join('\n');
  };

  const submitQuoteMessage = async (event) => {
    event.preventDefault();
    const type = quoteDialogType;
    if (!type) return;
    setQuoteStatus('sending');
    setQuoteError('');
    try {
      const config = SMALL_EVENT_CONFIG[type];
      const payload = {
        name: quoteName || undefined,
        email: quoteEmail || undefined,
        subject: `Small events quote request: ${config?.label || type}`,
        category: 'small-events',
        type,
        message: buildQuoteMessage(type),
      };

      const res = await fetch('/api/messages/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Unable to send message');
      setQuoteStatus('success');
    } catch (error) {
      setQuoteStatus('error');
      setQuoteError(error.message || 'Unable to send message');
    }
  };

  const getEstimateForType = (type) => {
    const config = SMALL_EVENT_CONFIG[type];
    const form = getSmallEventForm(type);
    if (!config) return null;
    if (form.serverEstimate) return form.serverEstimate;

    const guestCount = clampGuestCount(form.guestCount, config);
    const staffingCount = guestCount ? Math.max(1, Math.ceil(guestCount / config.staffingGuestsPer)) : 0;
    const staffingCost = staffingCount * config.staffingHourly * config.staffingHours;
    const foodCost = guestCount * config.baseRate;
    const baseSubtotal = Math.max(foodCost + staffingCost, config.minimumTotal);
    const coordinationFee = type === 'weddings' ? baseSubtotal * 0.05 : 0;
    const subtotal = baseSubtotal + coordinationFee;
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
      coordinationFee,
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
      coordinationFee: centsToDollars(estimate.coordinationFeeCents || 0),
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
      coordinationFee: centsToDollars(estimate.coordinationFeeCents || 0),
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
    const holdsBySlot = new Map(calendarHolds.map((hold) => [hold.slotId, hold]));
    const depositPercent = getDepositPercent(form);
    const depositLabel = form.depositOverrideAmount
      ? `${formatCurrency(Number(form.depositOverrideAmount), { minimumFractionDigits: 2, maximumFractionDigits: 2 })} flat`
      : `${Math.round(depositPercent * 100)}%`;
    const introCopy = {
      dinner: {
        title: 'Plan a cozy dinner party',
        subtitle: 'Share what you can, and we will fill in the details together.',
      },
      weddings: {
        title: 'Plan the celebration feast',
        subtitle: 'From welcome bites to late-night snacks, we help map the flow.',
      },
      holiday: {
        title: 'Plan your small event',
        subtitle: 'Tell us the vibe and we will craft the menu around it.',
      },
    };
    const intro = introCopy[type] || introCopy.holiday;
    const guestMin = config?.minGuests || 1;
    const guestMax = config?.maxGuests;
    const guestLimitLabel = [
      config?.minGuests ? `min ${config.minGuests}` : null,
      config?.maxGuests ? `max ${config.maxGuests}` : null,
    ].filter(Boolean).join(', ');
    const selectedSlot = form.holdSlotId
      ? slots.find((slot) => slot.id === form.holdSlotId)
      : null;
    const selectedSlotLabel = selectedSlot ? formatSlotDate(selectedSlot.date) : '';
    const selectAvailabilitySlot = (slot) => {
      updateSmallEventForm(type, 'eventDate', slot.date);
      updateSmallEventForm(type, 'holdSlotId', slot.id);
    };

    if (!config) return null;

    return (
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-6">
          <div className="form-fun-banner">
            <div className="form-fun-title">{intro.title}</div>
            <p className="form-fun-help">{intro.subtitle}</p>
          </div>

          <div className="form-fun-card">
            <div className="form-fun-header">
              <div className="form-fun-title">Say hello</div>
              <span className="form-fun-tag">2 min</span>
            </div>
            <p className="form-fun-help">Tell us who to follow up with.</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <label className="form-fun-label">Your name</label>
                <input
                  type="text"
                  className="mt-1"
                  value={form.contactName}
                  onChange={(e) => updateSmallEventForm(type, 'contactName', e.target.value)}
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="form-fun-label">Best email</label>
                <input
                  type="email"
                  className="mt-1"
                  value={form.contactEmail}
                  onChange={(e) => updateSmallEventForm(type, 'contactEmail', e.target.value)}
                  placeholder="name@example.com"
                />
              </div>
              <div>
                <label className="form-fun-label">Phone (optional)</label>
                <input
                  type="tel"
                  className="mt-1"
                  value={form.contactPhone}
                  onChange={(e) => updateSmallEventForm(type, 'contactPhone', e.target.value)}
                  placeholder="(555) 555-5555"
                />
              </div>
              <div>
                <label className="form-fun-label">
                  Guest count{guestLimitLabel ? ` (${guestLimitLabel})` : ''}
                </label>
                <input
                  type="number"
                  min={guestMin}
                  max={guestMax}
                  className="mt-1"
                  value={form.guestCount}
                  onChange={(e) => updateSmallEventForm(type, 'guestCount', e.target.value)}
                  placeholder="ex: 18"
                />
              </div>
            </div>
          </div>

          {type === 'dinner' && (
            <div className="form-fun-card">
              <div className="form-fun-header">
                <div className="form-fun-title">Dinner details</div>
                <span className="form-fun-tag">In-home</span>
              </div>
              <p className="form-fun-help">Share your kitchen setup and course count.</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="form-fun-label">Course count</label>
                  <select
                    className="mt-1"
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
                  <label className="form-fun-label">Kitchen setup</label>
                  <input
                    type="text"
                    className="mt-1"
                    value={form.kitchenAccess}
                    onChange={(e) => updateSmallEventForm(type, 'kitchenAccess', e.target.value)}
                    placeholder="Full kitchen, limited oven, etc."
                  />
                </div>
              </div>
            </div>
          )}

          {type === 'weddings' && (
            <div className="form-fun-card">
              <div className="form-fun-header">
                <div className="form-fun-title">Wedding details</div>
                <span className="form-fun-tag">Celebrate</span>
              </div>
              <p className="form-fun-help">Let us know who is coordinating and the flow.</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="form-fun-label">Planner or point of contact</label>
                  <input
                    type="text"
                    className="mt-1"
                    value={form.plannerInfo}
                    onChange={(e) => updateSmallEventForm(type, 'plannerInfo', e.target.value)}
                    placeholder="Planner name or role"
                  />
                </div>
                <div>
                  <label className="form-fun-label">Meal moments</label>
                  <input
                    type="text"
                    className="mt-1"
                    value={form.celebrationType}
                    onChange={(e) => updateSmallEventForm(type, 'celebrationType', e.target.value)}
                    placeholder="Rehearsal, reception, late-night bites"
                  />
                </div>
              </div>
            </div>
          )}

          {type === 'holiday' && (
            <div className="form-fun-card">
              <div className="form-fun-header">
                <div className="form-fun-title">Event details</div>
                <span className="form-fun-tag">Vibe</span>
              </div>
              <p className="form-fun-help">Tell us the occasion and setup.</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="form-fun-label">Occasion</label>
                  <input
                    type="text"
                    className="mt-1"
                    value={form.celebrationType}
                    onChange={(e) => updateSmallEventForm(type, 'celebrationType', e.target.value)}
                    placeholder="Holiday party, corporate event, birthday"
                  />
                </div>
                <div>
                  <label className="form-fun-label">Setup needs</label>
                  <input
                    type="text"
                    className="mt-1"
                    value={form.kitchenAccess}
                    onChange={(e) => updateSmallEventForm(type, 'kitchenAccess', e.target.value)}
                    placeholder="Buffet table, heating, power"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="form-fun-card">
            <div className="form-fun-header">
              <div className="form-fun-title">Menu vibes</div>
              <span className="form-fun-tag">Food</span>
            </div>
            <p className="form-fun-help">Pick a style and any must-haves.</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <label className="form-fun-label">Serving style</label>
                <select
                  className="mt-1"
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
                <label className="form-fun-label">Menu wishes</label>
                <textarea
                  className="mt-1"
                  rows={2}
                  value={form.menuNotes}
                  onChange={(e) => updateSmallEventForm(type, 'menuNotes', e.target.value)}
                  placeholder="Cuisine, courses, favorite ingredients"
                />
              </div>
              <div className="md:col-span-2">
                <label className="form-fun-label">Allergies or needs</label>
                <textarea
                  className="mt-1"
                  rows={2}
                  value={form.dietary}
                  onChange={(e) => updateSmallEventForm(type, 'dietary', e.target.value)}
                  placeholder="Allergies, restrictions, medical notes"
                />
              </div>
              <div className="md:col-span-2">
                <label className="form-fun-label">Extras to plan for</label>
                <textarea
                  className="mt-1"
                  rows={2}
                  value={form.rentals}
                  onChange={(e) => updateSmallEventForm(type, 'rentals', e.target.value)}
                  placeholder="Rentals, bar service, cleanup, extra staff"
                />
              </div>
            </div>
          </div>

          <div className="form-fun-card">
            <div className="form-fun-header">
              <div className="form-fun-title">Save your progress</div>
              <span className="form-fun-tag">Optional</span>
            </div>
            <p className="form-fun-help">We can email a save link so you can return later.</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="form-fun-label">Where should we send the link?</label>
                <input
                  type="email"
                  className="mt-1"
                  value={form.accountEmail}
                  onChange={(e) => updateSmallEventForm(type, 'accountEmail', e.target.value)}
                  placeholder="email for save link"
                />
              </div>
              <label className="form-fun-label md:col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.wantsAccount}
                  onChange={(e) => updateSmallEventForm(type, 'wantsAccount', e.target.checked)}
                />
                Create an account so you can edit anytime (we&apos;ll save your date for 24 hours)
              </label>
              {form.wantsAccount && (
                <>
                  <div>
                    <label className="form-fun-label">Account email</label>
                    <input
                      type="email"
                      className="mt-1"
                      value={form.accountEmail}
                      onChange={(e) => updateSmallEventForm(type, 'accountEmail', e.target.value)}
                      placeholder="name@example.com"
                    />
                  </div>
                  <div>
                    <label className="form-fun-label">Password</label>
                    <input
                      type="password"
                      className="mt-1"
                      value={form.accountPassword}
                      onChange={(e) => updateSmallEventForm(type, 'accountPassword', e.target.value)}
                      placeholder="Create a password"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="mt-4 form-fun-actions">
              <button
                type="button"
                className="form-fun-cta rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:bg-slate-300"
                onClick={() => saveEstimate(type)}
                disabled={smallEventsSaving}
              >
                {smallEventsSaving ? 'Saving...' : 'Save estimate'}
              </button>
              <button
                type="button"
                className="form-fun-chip-btn rounded-md border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:border-slate-400"
                onClick={() => extendEstimate(type)}
              >
                Extend 5 days
              </button>
              <button
                type="button"
                className="form-fun-chip-btn rounded-md border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:border-slate-400"
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
            <button
              type="button"
              className="form-fun-link mt-3"
              onClick={() => openQuoteDialog(type)}
            >
              contact us about your quote
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="form-fun-card">
            <div className="form-fun-header">
              <div className="form-fun-title">Estimate range</div>
              <span className="form-fun-tag">Live</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {estimate
                ? `${formatCurrency(estimate.estimateMin)} - ${formatCurrency(estimate.estimateMax)}`
                : formatCurrency(0)}
            </div>
            <div className="mt-2 text-xs text-slate-600">
              Based on {estimate?.guestCount || 0} guests, {estimate?.staffingCount || 0} staff.
            </div>
            {type === 'weddings' && estimate?.coordinationFee > 0 && (
              <div className="text-xs text-slate-600">
                Includes a 5% event coordination line item ({formatCurrency(estimate.coordinationFee)}).
              </div>
            )}
            <div className="text-xs text-slate-500">
              Rentals, tax, and bar packages are estimated separately.
            </div>
          </div>

          <div className="form-fun-card">
            <div className="form-fun-header">
              <div className="form-fun-title">Hold your date</div>
              <span className="form-fun-tag">24h</span>
            </div>
            <div className="mt-2 text-xs text-slate-600">
              {depositLabel} deposit holds your date.
            </div>
            <div className="mt-2 text-lg font-semibold text-slate-900">
              Deposit due:{' '}
              {estimate
                ? formatCurrency(estimate.depositAmount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : formatCurrency(0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <button
              type="button"
              className="form-fun-cta mt-3 w-full rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:bg-slate-300"
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
                : 'No date hold yet. We will confirm availability after we connect.'}
            </div>
          </div>

          <div className="form-fun-card">
            <div className="form-fun-header">
              <div className="form-fun-title">When and where</div>
              <span className="form-fun-tag">Dates</span>
            </div>
            <p className="form-fun-help">
              Choose from shared availability or tell us your ideal date, time, and location.
            </p>
            <div className="availability-calendar">
              <div className="availability-header">
                <div className="availability-title">Shared availability</div>
                <button
                  type="button"
                  className="availability-refresh"
                  onClick={() => loadSmallEventsAvailability()}
                >
                  Refresh
                </button>
              </div>
              {availabilityLoading ? (
                <div className="availability-empty">Loading shared dates...</div>
              ) : slots.length === 0 ? (
                <div className="availability-empty">No shared dates yet. Add your ideal date below.</div>
              ) : (
                <div className="availability-grid">
                  {slots.map((slot) => {
                    const hold = holdsBySlot.get(slot.id);
                    const isHeldByCurrent = hold?.estimateId && hold.estimateId === form.estimateId;
                    const isUnavailable = slot.status === 'blocked' || (!isHeldByCurrent && slot.status !== 'open');
                    const isSelected = selectedSlot?.id === slot.id;
                    const statusKey = slot.status === 'open'
                      ? 'open'
                      : slot.status === 'blocked'
                        ? 'blocked'
                        : isHeldByCurrent
                          ? 'held'
                          : slot.status;
                    const statusLabel = slot.status === 'open'
                      ? 'Open'
                      : slot.status === 'blocked'
                        ? 'Blocked'
                        : isHeldByCurrent
                          ? 'Your hold'
                          : slot.status === 'confirmed'
                            ? 'Confirmed'
                            : 'Held';
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        className={`availability-slot ${isSelected ? 'is-selected' : ''}`}
                        data-status={statusKey}
                        disabled={isUnavailable}
                        onClick={() => selectAvailabilitySlot(slot)}
                        title={slot.notes || undefined}
                      >
                        <span className="availability-date">{formatSlotDate(slot.date)}</span>
                        <span className="availability-status">{statusLabel}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="availability-footer">
                <div className="availability-selected">
                  {selectedSlotLabel ? `Selected: ${selectedSlotLabel}` : 'Select an open date above.'}
                </div>
                {selectedSlot?.notes && (
                  <div className="availability-notes">{selectedSlot.notes}</div>
                )}
                <div className="availability-actions">
                  {holdsOnSlot && selectedSlot?.id === holdsOnSlot.slotId ? (
                    <button
                      type="button"
                      className="form-fun-chip-btn rounded-md border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:border-slate-400"
                      onClick={() => releaseHold(holdsOnSlot.slotId, type)}
                    >
                      Release hold
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="form-fun-chip-btn rounded-md border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:border-slate-400"
                      onClick={() => selectedSlot && holdSlot(selectedSlot.id, type)}
                      disabled={!selectedSlot || selectedSlot.status !== 'open' || !form.estimateId}
                    >
                      {holdsOnSlot ? 'Move hold here' : 'Hold this date'}
                    </button>
                  )}
                </div>
                {!form.estimateId && selectedSlot && (
                  <div className="availability-note">
                    Save your estimate before placing a 24-hour hold.
                  </div>
                )}
              </div>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <label className="form-fun-label">Ideal date</label>
                <input
                  type="date"
                  className="mt-1"
                  value={form.eventDate}
                  onChange={(e) => updateSmallEventForm(type, 'eventDate', e.target.value)}
                />
              </div>
              <div>
                <label className="form-fun-label">Ideal time</label>
                <input
                  type="text"
                  className="mt-1"
                  value={form.eventTime}
                  onChange={(e) => updateSmallEventForm(type, 'eventTime', e.target.value)}
                  placeholder="ex: 6:30-9:30 PM"
                />
              </div>
              <div className="md:col-span-2">
                <label className="form-fun-label">Location or venue</label>
                <input
                  type="text"
                  className="mt-1"
                  value={form.location}
                  onChange={(e) => updateSmallEventForm(type, 'location', e.target.value)}
                  placeholder="Address or venue name"
                />
              </div>
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
        btn.style.color = BRAND_TOKENS.textPrimary;
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

  const imageById = useMemo(() => {
    const map = new Map();
    images.forEach((img) => {
      map.set(getImageId(img), img);
    });
    return map;
  }, [images]);

  const imageIndexById = useMemo(() => {
    const map = new Map();
    images.forEach((img, idx) => {
      map.set(getImageId(img), idx);
    });
    return map;
  }, [images]);

  const orderedImages = useMemo(() => (
    imageOrder.map((id) => imageById.get(id)).filter(Boolean)
  ), [imageOrder, imageById]);

  // Initialize image order when images are loaded
  useEffect(() => {
    if (images.length === 0) {
      setImageOrder([]);
      setLayoutReady(false);
      return;
    }

    setLayoutReady(false);
    const nextOrder = images.map(getImageId);
    setImageOrder((prev) => {
      if (prev.length === 0) return nextOrder;
      const nextSet = new Set(nextOrder);
      const filtered = prev.filter((id) => nextSet.has(id));
      const filteredSet = new Set(filtered);
      const appended = nextOrder.filter((id) => !filteredSet.has(id));
      return [...filtered, ...appended];
    });
  }, [images]);

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

      imageOrder.forEach((imgId) => {
        const img = imageById.get(imgId);
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
      setLayoutReady((prev) => prev || Object.keys(newPositions).length > 0);
    };

    calculatePositions();

    // Recalculate on window resize
    const handleResize = () => calculatePositions();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [imageOrder, images, imageById]);

  const handleDragStart = useCallback((event) => {
    setActiveDragId(event.active.id);
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveDragId(null);
  }, []);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    setActiveDragId(null);
    lastDragEndRef.current = Date.now();

    if (!over || active.id === over.id) return;
    setImageOrder((items) => {
      const oldIndex = items.indexOf(active.id);
      const newIndex = items.indexOf(over.id);
      if (oldIndex === -1 || newIndex === -1) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
  }, []);

  const handleSelectImage = useCallback((id) => {
    if (activeDragId) return;
    if (Date.now() - lastDragEndRef.current < 200) return;
    const img = imageById.get(id);
    const idx = imageIndexById.get(id);
    if (!img || idx === undefined) return;
    setSelected({ img, idx });
  }, [activeDragId, imageById, imageIndexById]);

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
    <div className="fullpage-demo">
      {/* Fixed Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 shadow-sm" style={{ backgroundColor: BRAND_TOKENS.bgPage, borderBottom: `1px solid ${BRAND_TOKENS.borderDefault}` }}>
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex flex-col items-start gap-2">
            <button
              onClick={() => navigateToPage(0)}
              className="flex items-center gap-3"
            >
              <motion.span
                className="text-2xl font-bold tracking-tight"
                style={{ 
                  color: BRAND_TOKENS.textPrimary, 
                  fontFamily: "'National Park', 'General Sans', sans-serif",
                  fontWeight: 700,
                  letterSpacing: '-0.02em'
                }}
                whileHover={{ scale: 1.03 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                Local Effort
              </motion.span>
              <span className="text-sm font-medium" style={{ color: BRAND_TOKENS.textPrimary, fontFamily: "'Office Code Pro', monospace" }}>
                always mostly local
              </span>
            </button>
          </div>

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
                    backgroundColor: isActive ? BRAND_TOKENS.bgStrong : 'transparent',
                    color: isActive ? BRAND_TOKENS.textInverse : BRAND_TOKENS.textPrimary,
                    fontFamily: "'Office Code Pro', monospace",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = BRAND_TOKENS.bgSecondary;
                      e.currentTarget.style.color = BRAND_TOKENS.textPrimary;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = BRAND_TOKENS.textPrimary;
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
          style={{ backgroundColor: BRAND_TOKENS.bgPage }}
          animation="fadeScale"
        >
          <div className="w-full h-full overflow-y-auto pt-20">
            {loading ? (
              <div className="text-center py-20" style={{ color: BRAND_TOKENS.textPrimary }}>
                Loading images...
              </div>
            ) : images.length === 0 ? (
              <div className="text-center py-20" style={{ color: BRAND_TOKENS.textPrimary }}>
                No images found.
              </div>
            ) : !layoutReady ? (
              <div className="text-center py-20" style={{ color: BRAND_TOKENS.textPrimary }}>
                Loading images...
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
                <SortableContext items={imageOrder}>
                  <div
                    ref={containerRef}
                    className="relative w-full"
                    style={{ minHeight: '2000px' }}
                  >
                    {orderedImages.map((img, idx) => {
                      const imgId = getImageId(img);
                      const pos = positions[imgId] || { x: 0, y: 0, width: 300, height: 400 };

                      return (
                        <GalleryItem
                          key={imgId}
                          id={imgId}
                          img={img}
                          index={idx}
                          pos={pos}
                          layoutReady={layoutReady}
                          onSelect={handleSelectImage}
                          onPrefetch={prefetchImage}
                          disableDrag={!layoutReady}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </FullPageSection>

        {/* Page 2: Weekly Meals */}
        <FullPageSection
          id="weekly-meals"
          style={{ backgroundColor: BRAND_TOKENS.bgSection }}
        >
          <div className="relative h-full pt-20">
            <div className="flex items-start">
              <div
                className="group"
                style={{
                  marginTop: '50px',
                  marginLeft: '50px',
                  padding: '12px 16px',
                  backgroundColor: BRAND_TOKENS.surfaceMuted,
                  borderRadius: '6px',
                }}
              >
                <div
                  className="line-through group-hover:italic"
                  style={{
                    color: BRAND_TOKENS.textPrimary,
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
                    color: BRAND_TOKENS.textPrimary,
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
                  color: BRAND_TOKENS.textPrimary,
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
                        color: BRAND_TOKENS.textPrimary,
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
          style={{ backgroundColor: BRAND_TOKENS.bgSection }}
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
          style={{ backgroundColor: BRAND_TOKENS.bgSection }}
        >
          <div className="business-tab">
            <div
              className="business-hero"
              style={{
                backgroundImage: "url('https://res.cloudinary.com/dokyhfvyd/image/upload/c_limit,f_auto,q_auto,w_1600/n4xtzathcmkkqdzq5im4?_a=BAMAK+eA0')",
              }}
              role="img"
              aria-label="Local Effort for businesses"
            >
              <div className="business-hero-scrim" aria-hidden="true" />
              <div className="business-hero-content">
                <div className="partner-login-card">
                  <a href="/partner-portal" target="_blank" rel="noreferrer">
                    partner log in
                  </a>
                </div>
                <div className="business-panel">
                  <div className="business-eyebrow">For businesses</div>
                  <div className="business-heading">Partner with Local Effort</div>
                  <div className="business-subtitle">
                    Choose a path below and we&apos;ll share the right next steps.
                  </div>
                  <div className="business-actions">
                    <button
                      type="button"
                      className={`business-link ${businessPanel === 'wholesale' ? 'is-active' : ''}`}
                      onClick={() => handleBusinessSelect('wholesale')}
                    >
                      cafes, bars, restaurants interested in wholesale
                    </button>
                    <button
                      type="button"
                      className={`business-link ${businessPanel === 'office' ? 'is-active' : ''}`}
                      onClick={() => handleBusinessSelect('office')}
                    >
                      office lunches (coming soon)
                    </button>
                    <button
                      type="button"
                      className={`business-link ${businessPanel === 'pizza' ? 'is-active' : ''}`}
                      onClick={() => handleBusinessSelect('pizza')}
                    >
                      open a pizza shop
                    </button>
                  </div>
                </div>
                {businessPanel && businessPanel !== 'office' && (
                  <div className="business-reveal">
                    {businessPanel === 'wholesale' && (
                      <div className="business-stack">
                        {!wholesaleSubmitted ? (
                          <form className="business-form" onSubmit={handleWholesaleSubmit}>
                            <label className="business-label" htmlFor="wholesale-email">
                              Email for menu access
                            </label>
                            <input
                              id="wholesale-email"
                              type="email"
                              className="business-input"
                              placeholder="you@company.com"
                              value={wholesaleEmail}
                              onChange={(e) => setWholesaleEmail(e.target.value)}
                              required
                            />
                            <button type="submit" className="business-btn">
                              Get menu + pricing
                            </button>
                            <div className="business-note">
                              We&apos;ll send a copy of the pricing sheet too.
                            </div>
                          </form>
                        ) : (
                          <div className="business-menu">
                            <div className="business-menu-title">Wholesale menu unlocked</div>
                            <div className="business-note">Here is a starter list with partner pricing.</div>
                            <div className="business-menu-list">
                              {WHOLESALE_MENU_ITEMS.map((item) => (
                                <div key={item.name} className="business-menu-row">
                                  <span>{item.name}</span>
                                  <span className="business-price">{item.price}</span>
                                </div>
                              ))}
                            </div>
                            <button
                              type="button"
                              className="business-btn business-btn-secondary"
                              onClick={() => setWholesaleSubmitted(false)}
                            >
                              Use a different email
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    {businessPanel === 'pizza' && (
                      <div className="business-stack">
                        <div className="business-menu-title">Open a pizza shop</div>
                        <div className="business-note">Reach Weston directly to start the conversation.</div>
                        <a className="business-email" href="mailto:weston@localeffortfood.com">
                          weston@localeffortfood.com
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <section className="case-study-section">
              <div className="case-study-header">
                <div className="case-study-title">case study: customer portal for happy monday</div>
                <div className="case-study-subtitle">
                  A lightweight portal that lets customers manage accounts, reorder favorites, and keep tabs on
                  delivery days.
                </div>
              </div>
              <div className="case-study-scroll" role="region" aria-label="Happy Monday case study">
                <div className="case-study-grid">
                  <div className="case-study-card case-study-text">
                    <div className="case-study-tag">Goal</div>
                    <div className="case-study-copy">
                      Give subscribers a single place to pause, swap meals, and update delivery notes without
                      emailing the team.
                    </div>
                  </div>
                  <div className="case-study-card case-study-image">
                    <img
                      src="/gallery/Screenshot%20(168).png"
                      alt="Happy Monday portal preview"
                      loading="lazy"
                    />
                  </div>
                  <div className="case-study-card case-study-text">
                    <div className="case-study-tag">Experience</div>
                    <div className="case-study-copy">
                      Customers see upcoming menus, swap meals in seconds, and get instant updates on pickup
                      windows.
                    </div>
                  </div>
                  <div className="case-study-card case-study-image">
                    <img
                      src="/gallery/IMG_9148.jpg"
                      alt="Happy Monday meals grid"
                      loading="lazy"
                    />
                  </div>
                  <div className="case-study-card case-study-text">
                    <div className="case-study-tag">Built with</div>
                    <div className="case-study-copy">
                      Role-based access, live pricing tables, and a concierge channel for quick question replies.
                    </div>
                  </div>
                  <div className="case-study-card case-study-image">
                    <img
                      src="/gallery/IMG_9305.jpg"
                      alt="Happy Monday meal prep detail"
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>
        </FullPageSection>

        {/* Page 5: About */}
        <FullPageSection
          id="about"
          style={{ backgroundColor: BRAND_TOKENS.bgSection }}
        >
          <div className="relative w-full h-full">
            <img
              src="https://res.cloudinary.com/dokyhfvyd/image/upload/c_limit,f_auto,q_auto,w_1600/jo9pxtjng8zpt4yo4rcz?_a=BAMAK+eA0"
              alt="About Local Effort"
              className="w-full h-full object-contain"
              style={{ objectPosition: 'center', backgroundColor: BRAND_TOKENS.bgSection }}
            />
          </div>
        </FullPageSection>

        {/* Page 6: Local Pizza */}
        <FullPageSection
          id="local-pizza"
          style={{ backgroundColor: BRAND_TOKENS.bgSection }}
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
            style={{ backgroundColor: BRAND_TOKENS.overlayStrong }}
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
        <DialogContent className="fullpage-demo-scope sm:max-w-[520px]">
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
        <DialogContent className="fullpage-demo-scope small-events-dialog max-h-[85vh] overflow-y-auto sm:max-w-[980px]">
          <DialogHeader>
            <DialogTitle className="small-events-title">Dinner party in my home</DialogTitle>
            <DialogDescription className="small-events-description">
              Chef-led, multi-course dinners with seasonal menus, staffing, and a 15% deposit to hold the date.
            </DialogDescription>
          </DialogHeader>
          {renderSmallEventDialogContent('dinner')}
        </DialogContent>
      </Dialog>

      <Dialog open={smallEventsDialog === 'weddings'} onOpenChange={(open) => setSmallEventsDialog(open ? 'weddings' : null)}>
        <DialogContent className="fullpage-demo-scope small-events-dialog max-h-[85vh] overflow-y-auto sm:max-w-[980px]">
          <DialogHeader>
            <DialogTitle className="small-events-title">Weddings</DialogTitle>
            <DialogDescription className="small-events-description">
              Flexible packages for rehearsal dinners, receptions, and late-night bites with deposit holds.
            </DialogDescription>
          </DialogHeader>
          {renderSmallEventDialogContent('weddings')}
        </DialogContent>
      </Dialog>

      <Dialog open={smallEventsDialog === 'holiday'} onOpenChange={(open) => setSmallEventsDialog(open ? 'holiday' : null)}>
        <DialogContent className="fullpage-demo-scope small-events-dialog max-h-[85vh] overflow-y-auto sm:max-w-[980px]">
          <DialogHeader>
            <DialogTitle className="small-events-title">Small events and holiday parties</DialogTitle>
            <DialogDescription className="small-events-description">
              Drop-off or staffed menus for work parties, milestones, and holiday hosting.
            </DialogDescription>
          </DialogHeader>
          {renderSmallEventDialogContent('holiday')}
        </DialogContent>
      </Dialog>

      <Dialog
        open={quoteDialogOpen}
        onOpenChange={(open) => {
          setQuoteDialogOpen(open);
          if (!open) {
            setQuoteStatus('idle');
            setQuoteError('');
          }
        }}
      >
        <DialogContent className="fullpage-demo-scope sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Contact us about your quote</DialogTitle>
            <DialogDescription>
              We&apos;ll send your note plus the current quote details to our team.
            </DialogDescription>
          </DialogHeader>
          {quoteStatus === 'success' ? (
            <div className="space-y-4">
              <div className="text-sm text-slate-700">
                Message sent. We&apos;ll reply soon.
              </div>
              <button
                type="button"
                className="form-fun-cta w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                onClick={() => setQuoteDialogOpen(false)}
              >
                Close
              </button>
            </div>
          ) : (
            <form className="form-fun-card space-y-4" onSubmit={submitQuoteMessage}>
              <div className="text-xs text-slate-600">
                Quote type: {SMALL_EVENT_CONFIG[quoteDialogType]?.label || 'Small events'}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="form-fun-label" htmlFor="quote-name">Name</label>
                  <input
                    id="quote-name"
                    type="text"
                    className="mt-1 w-full"
                    value={quoteName}
                    onChange={(e) => setQuoteName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="form-fun-label" htmlFor="quote-email">Email</label>
                  <input
                    id="quote-email"
                    type="email"
                    className="mt-1 w-full"
                    value={quoteEmail}
                    onChange={(e) => setQuoteEmail(e.target.value)}
                    placeholder="you@company.com"
                  />
                </div>
              </div>
              <div>
                <label className="form-fun-label" htmlFor="quote-message">Message</label>
                <textarea
                  id="quote-message"
                  className="mt-1 w-full"
                  rows={4}
                  value={quoteMessage}
                  onChange={(e) => setQuoteMessage(e.target.value)}
                  placeholder="What would you like to clarify or adjust?"
                />
              </div>
              {quoteStatus === 'error' && (
                <div className="text-sm text-red-700">{quoteError}</div>
              )}
              <button
                type="submit"
                className="form-fun-cta w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                disabled={quoteStatus === 'sending'}
              >
                {quoteStatus === 'sending' ? 'Sending...' : 'Send message'}
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={officeLunchesOpen} onOpenChange={setOfficeLunchesOpen}>
        <DialogContent className="fullpage-demo-scope sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle>Office lunches (coming soon)</DialogTitle>
          </DialogHeader>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <img
              src="/gallery/Screenshot%20(168).png"
              alt="Office lunches preview"
              className="h-auto w-full object-cover"
              loading="lazy"
            />
          </div>
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
    </div>
  );
};

export default FullPageDemoPage;
