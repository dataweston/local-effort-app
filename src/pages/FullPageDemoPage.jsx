// src/pages/FullPageDemoPage.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import FullPageContainer from '../components/fullpage/FullPageContainer';
import FullPageSection from '../components/fullpage/FullPageSection';
import CloudinaryImage from '../components/common/cloudinaryImage';
import PhotoGrid from '../components/common/PhotoGrid';
import SectionHeader from '../components/ui/SectionHeader';
import { AskChefForm } from '../components/forms/AskChefForm';
import { thumbtackReviews } from '../data/staticContent';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { FULLPAGE_PAGES } from '../config/fullPageNav';
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
  pizza: {
    label: 'Pizza Party',
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
const ANNOUNCEMENT_HEIGHT = 56; // Increased for mobile two-line support
const WHOLESALE_MENU_ITEMS = [
  { name: 'Market bread + cultured butter', price: '$4.50 / portion' },
  { name: 'Roasted vegetable lasagna', price: '$12.00 / portion' },
  { name: 'Herb chicken + lemon jus', price: '$13.50 / portion' },
  { name: 'Seasonal grain salad', price: '$9.00 / portion' },
  { name: 'House pickles + condiments', price: '$3.50 / portion' },
];
const BUSINESS_CONTACT_OPTIONS = {
  wholesale: 'Wholesale',
  consulting: 'Restaurant consulting',
  collaborations: 'Collaborations',
};
const SMALL_EVENTS_CONTACT_OPTIONS = {
  dinner: 'Dinner at your home',
  weddings: 'Weddings and showers',
  holiday: 'Small events and holiday parties',
};
const ABOUT_INFO_BLOCKS = [
  {
    title: 'At a glance',
    items: [
      'Founded in 2022',
      'Based in Minneapolis, MN',
      '100% locally sourced focus',
    ],
  },
  {
    title: 'Foods we specialize in',
    items: [
      'sourdough breads from local grain',
      'fresh pasta',
      'pies, cakes, pastry and patisserie',
      'braised meat, smoked meat, cured meat',
      "kid's food",
      'bean-to-bar chocolate',
      '100% local pizza',
    ],
  },
  {
    title: 'Services we offer',
    items: [
      'Meal planning and nutrition support for families',
      'Catering and events built around local ingredients',
      'Completely local pizzas - our specialty',
    ],
  },
  {
    title: 'Principles',
    items: [
      'Celebrating home cooks',
      'Supporting family nutrition',
      'Spending with local producers',
      'Collaborating with Minnesota organizations',
      'Sharing and shaping Minnesota food culture',
    ],
  },
  {
    title: 'How we stay local',
    items: [
      'Minnesota-first sourcing; regional when sensible',
      'Seasonal menus; preserve when possible',
      'Direct relationships with farms and mills',
      'Reasonable exceptions for essentials (like olive oil)',
      'Transparency: ask us about any ingredient',
    ],
  },
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
    makeSlot(5, 'pizza', 'open', 'Oven ready'),
    makeSlot(6, 'holiday', 'open', 'Weeknight availability'),
    makeSlot(8, 'dinner', 'blocked', 'Staffing hold'),
    makeSlot(9, 'pizza', 'open', 'Friday night'),
    makeSlot(10, 'weddings', 'open', 'Preferred Saturday'),
    makeSlot(12, 'holiday', 'open', 'Corporate-friendly'),
    makeSlot(15, 'weddings', 'blocked', 'Venue conflict'),
    makeSlot(18, 'dinner', 'open', 'Weekend window'),
    makeSlot(19, 'pizza', 'blocked', 'Private event'),
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

const getImageScale = (id) => {
  if (!id) return 1;
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) % 1000;
  }
  const normalized = hash / 1000;
  return 0.85 + normalized * 0.45;
};

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

  const dragOffset = isDragging && transform ? transform : { x: 0, y: 0 };
  const style = {
    position: 'absolute',
    width: pos.width,
    height: pos.height,
    transform: CSS.Translate.toString({
      x: pos.x + dragOffset.x,
      y: pos.y + dragOffset.y,
    }),
    transition: isDragging ? 'none' : transition || 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)',
    opacity: layoutReady ? 1 : 0,
    cursor: isDragging ? 'grabbing' : 'grab',
    zIndex: isDragging ? 50 : 1,
    willChange: 'transform',
    pointerEvents: layoutReady ? 'auto' : 'none',
    touchAction: 'none',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`gallery-tile ${isDragging ? 'is-dragging' : ''}`}
      onMouseEnter={() => img?.large_url && onPrefetch(img.large_url)}
      onClick={() => onSelect(id)}
      {...attributes}
      {...listeners}
    >
      {img.thumbnail_url ? (
        <img
          src={img.thumbnail_url}
          alt={img.context?.alt || 'Gallery image'}
          className="gallery-image w-full h-full block select-none pointer-events-none object-cover"
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
          className="gallery-image w-full h-full block select-none pointer-events-none object-cover"
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
  const [columnOrder, setColumnOrder] = useState([]);
  const [positions, setPositions] = useState({});
  const [galleryHeight, setGalleryHeight] = useState(2000);
  const [layoutConfig, setLayoutConfig] = useState({ columns: 0, columnWidth: 0, gap: 10 });
  const containerRef = useRef(null);
  const [layoutReady, setLayoutReady] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [smallEventsDialog, setSmallEventsDialog] = useState(null);
  const [smallEventForms, setSmallEventForms] = useState(() => ({
    dinner: createSmallEventDefaults('dinner'),
    pizza: createSmallEventDefaults('pizza'),
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
  const [aboutGalleryImages, setAboutGalleryImages] = useState([]);
  const [aboutGalleryLoading, setAboutGalleryLoading] = useState(false);
  const [aboutGalleryError, setAboutGalleryError] = useState(null);
  const [pizzaImages, setPizzaImages] = useState([]);
  const [pizzaLoading, setPizzaLoading] = useState(false);
  const [pizzaError, setPizzaError] = useState(null);
  const [partners, setPartners] = useState([]);
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
  const [announcementVisible, setAnnouncementVisible] = useState(false);
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [caseStudyImage, setCaseStudyImage] = useState(null);
  const [aboutFaqOpen, setAboutFaqOpen] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [fb, setFb] = useState({ name: '', email: '', sentiment: 'positive', message: '' });
  const [fbStatus, setFbStatus] = useState('idle');
  const [liveFeedback, setLiveFeedback] = useState([]);
  const [businessContactOpen, setBusinessContactOpen] = useState(false);
  const [businessContactType, setBusinessContactType] = useState('wholesale');
  const [businessContactName, setBusinessContactName] = useState('');
  const [businessContactEmail, setBusinessContactEmail] = useState('');
  const [businessContactPhone, setBusinessContactPhone] = useState('');
  const [businessContactOrg, setBusinessContactOrg] = useState('');
  const [businessContactMessage, setBusinessContactMessage] = useState('');
  const [businessContactStatus, setBusinessContactStatus] = useState('idle');
  const [businessContactError, setBusinessContactError] = useState('');
  const [smallEventsContactOpen, setSmallEventsContactOpen] = useState(false);
  const [smallEventsContactType, setSmallEventsContactType] = useState('dinner');
  const [smallEventsContactName, setSmallEventsContactName] = useState('');
  const [smallEventsContactEmail, setSmallEventsContactEmail] = useState('');
  const [smallEventsContactPhone, setSmallEventsContactPhone] = useState('');
  const [smallEventsContactMessage, setSmallEventsContactMessage] = useState('');
  const [smallEventsContactStatus, setSmallEventsContactStatus] = useState('idle');
  const [smallEventsContactError, setSmallEventsContactError] = useState('');
  const [askChefOpen, setAskChefOpen] = useState(false);

  const pages = FULLPAGE_PAGES;

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

    if (type === 'dinner' || type === 'pizza') {
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
      pizza: {
        title: 'Plan a Pizza Party',
        subtitle: 'Tell us the basics and we will bring the pizza party plan.',
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
    const slotsByDate = new Map(slots.map((slot) => [slot.date, slot]));
    const getSlotStatusMeta = (slot) => {
      const hold = holdsBySlot.get(slot.id);
      const isHeldByCurrent = hold?.estimateId && hold.estimateId === form.estimateId;
      const isUnavailable = slot.status === 'blocked' || (!isHeldByCurrent && slot.status !== 'open');
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
      return { hold, isHeldByCurrent, isUnavailable, statusKey, statusLabel };
    };
    const buildCalendarMonths = (count = 2) => {
      const today = new Date();
      const firstSlotDate = slots.length ? new Date(slots[0].date) : today;
      const base = firstSlotDate > today ? firstSlotDate : today;
      const cursor = new Date(base.getFullYear(), base.getMonth(), 1);
      const months = [];

      for (let i = 0; i < count; i += 1) {
        const year = cursor.getFullYear();
        const month = cursor.getMonth();
        const monthStart = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const startDay = monthStart.getDay();
        const totalCells = Math.ceil((startDay + daysInMonth) / 7) * 7;
        const cells = [];

        for (let cell = 0; cell < totalCells; cell += 1) {
          const dayNumber = cell - startDay + 1;
          if (dayNumber < 1 || dayNumber > daysInMonth) {
            cells.push({ key: `empty-${year}-${month}-${cell}`, isOutside: true });
            continue;
          }
          const dateValue = new Date(year, month, dayNumber);
          const dateString = toDateInputValue(dateValue);
          cells.push({
            key: dateString,
            date: dateString,
            day: dayNumber,
            slot: slotsByDate.get(dateString) || null,
          });
        }

        months.push({
          key: `${year}-${month}`,
          label: monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          cells,
        });
        cursor.setMonth(month + 1);
      }

      return months;
    };
    const calendarSpan = (() => {
      if (slots.length === 0) return 2;
      const today = new Date();
      const firstSlotDate = new Date(slots[0].date);
      const base = firstSlotDate > today ? firstSlotDate : today;
      const lastSlotDate = new Date(slots[slots.length - 1].date);
      const monthDiff = (lastSlotDate.getFullYear() - base.getFullYear()) * 12
        + (lastSlotDate.getMonth() - base.getMonth());
      return Math.min(4, Math.max(2, monthDiff + 1));
    })();
    const calendarMonths = buildCalendarMonths(calendarSpan);

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

          {(type === 'dinner' || type === 'pizza') && (
            <div className="form-fun-card">
              <div className="form-fun-header">
                <div className="form-fun-title">{type === 'pizza' ? 'Pizza party details' : 'Dinner details'}</div>
                <span className="form-fun-tag">{type === 'pizza' ? 'Pizza' : 'In-home'}</span>
              </div>
              <p className="form-fun-help">
                Share your kitchen setup and service flow.
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="form-fun-label">
                    {type === 'pizza' ? 'Rounds or courses' : 'Course count'}
                  </label>
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
              Select an open date on the calendar. Admins set open and blocked dates by event type.
            </p>
            <div className="availability-calendar">
              <div className="availability-header">
                <div className="availability-title">Available dates</div>
                <button
                  type="button"
                  className="availability-refresh"
                  onClick={() => loadSmallEventsAvailability()}
                >
                  Refresh
                </button>
              </div>
              {availabilityLoading ? (
                <div className="availability-empty">Loading available dates...</div>
              ) : slots.length === 0 ? (
                <div className="availability-empty">No open dates yet. Add your ideal date below.</div>
              ) : (
                <div className="availability-calendar-grid">
                  {calendarMonths.map((month) => (
                    <div key={month.key} className="availability-month">
                      <div className="availability-month-title">{month.label}</div>
                      <div className="availability-weekdays">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
                          <span key={label}>{label}</span>
                        ))}
                      </div>
                      <div className="availability-days">
                        {month.cells.map((cell) => {
                          if (cell.isOutside) {
                            return <div key={cell.key} className="availability-day is-outside" />;
                          }
                          const slot = cell.slot;
                          if (!slot) {
                            return (
                              <div
                                key={cell.key}
                                className="availability-day is-unlisted"
                                title="No availability set"
                              >
                                <span>{cell.day}</span>
                              </div>
                            );
                          }
                          const meta = getSlotStatusMeta(slot);
                          const isSelected = selectedSlot?.id === slot.id;
                          return (
                            <button
                              key={cell.key}
                              type="button"
                              className={`availability-day ${isSelected ? 'is-selected' : ''}`}
                              data-status={meta.statusKey}
                              disabled={meta.isUnavailable}
                              onClick={() => selectAvailabilitySlot(slot)}
                              title={slot.notes || meta.statusLabel}
                            >
                              <span>{cell.day}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="availability-legend">
                <span data-status="open">Open</span>
                <span data-status="held">Held</span>
                <span data-status="blocked">Blocked</span>
              </div>
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
                    <label className="font-semibold text-slate-600">Event type</label>
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
    // Sync active styling on the universal header buttons
    document.querySelectorAll('nav button[data-menu-btn]').forEach((btn) => {
      const pageIndex = parseInt(btn.getAttribute('data-page-index'), 10);
      const isActive = Number.isFinite(pageIndex) && pageIndex === index;
      btn.dataset.active = isActive ? 'true' : 'false';
      btn.style.backgroundColor = isActive ? BRAND_TOKENS.bgStrong : 'transparent';
      btn.style.color = isActive ? BRAND_TOKENS.textInverse : BRAND_TOKENS.textPrimary;
    });
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
    const timer = setTimeout(() => setAnnouncementVisible(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const offset = announcementVisible && activePage === 0
      ? `${ANNOUNCEMENT_HEIGHT}px`
      : '0px';
    document.documentElement.style.setProperty('--announcement-offset', offset);
    return () => {
      document.documentElement.style.removeProperty('--announcement-offset');
    };
  }, [announcementVisible, activePage]);

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

  useEffect(() => {
    let abort = false;
    const controller = new AbortController();

    (async () => {
      setAboutGalleryLoading(true);
      setAboutGalleryError(null);
      try {
        const res = await fetch('/api/search-images?query=aboutus&per_page=12', { signal: controller.signal });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed loading about photos');
        const imgs = Array.isArray(data.images) ? data.images : [];
        if (!abort) setAboutGalleryImages(imgs);
      } catch (e) {
        if (!abort) setAboutGalleryError(e.message || String(e));
      } finally {
        if (!abort) setAboutGalleryLoading(false);
      }
    })();

    return () => {
      abort = true;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    let abort = false;
    const controller = new AbortController();

    (async () => {
      setPizzaLoading(true);
      setPizzaError(null);
      try {
        const res = await fetch('/api/search-images?query=pizza&per_page=24', { signal: controller.signal });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed loading pizza photos');
        const imgs = Array.isArray(data.images) ? data.images : [];
        if (!abort) setPizzaImages(imgs);
      } catch (e) {
        if (!abort) setPizzaError(e.message || String(e));
      } finally {
        if (!abort) setPizzaLoading(false);
      }
    })();

    return () => {
      abort = true;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    fetch('/api/search-images?query=partner&per_page=48')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!mounted || !data || !Array.isArray(data.images)) return;
        const items = data.images.map((img) => {
          const ctx = img.context && (img.context.custom || img.context);
          return {
            publicId: img.public_id || img.publicId,
            name: (ctx && (ctx.name || ctx.title || ctx.alt)) || img.public_id || 'Partner',
            url: ctx && (ctx.url || ctx.link || ctx.href),
          };
        }).filter((p) => p.publicId);
        setPartners(items);
      })
      .catch(() => {});
    return () => { mounted = false; };
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

  const aboutMasonryItems = useMemo(() => {
    const mixed = [];
    const blocks = ABOUT_INFO_BLOCKS;
    const gallery = aboutGalleryImages;
    const total = Math.max(blocks.length, gallery.length);
    for (let i = 0; i < total; i += 1) {
      if (blocks[i]) mixed.push({ type: 'info', block: blocks[i], key: `info-${blocks[i].title}` });
      if (gallery[i]) mixed.push({ type: 'image', img: gallery[i], key: `img-${gallery[i].asset_id || gallery[i].public_id || i}` });
    }
    return mixed;
  }, [aboutGalleryImages]);

  const flatOrder = useMemo(() => columnOrder.flat(), [columnOrder]);

  const orderedImages = useMemo(() => (
    flatOrder.map((id) => imageById.get(id)).filter(Boolean)
  ), [flatOrder, imageById]);

  const getColumnCount = useCallback((width) => {
    if (width < 768) return 3;
    if (width >= 1024) return 6;
    return 5;
  }, []);

  const buildColumnOrder = useCallback((ids, config) => {
    const { columns, columnWidth, gap } = config;
    const nextColumns = Array.from({ length: columns }, () => []);
    const columnHeights = new Array(columns).fill(0);

    ids.forEach((imgId) => {
      const img = imageById.get(imgId);
      if (!img) return;
      const imgWidth = img.width || 400;
      const imgHeight = img.height || 500;
      const aspectRatio = imgWidth / imgHeight;
      const height = (columnWidth / aspectRatio) * getImageScale(imgId);

      const targetColumn = columnHeights.indexOf(Math.min(...columnHeights));
      nextColumns[targetColumn].push(imgId);
      columnHeights[targetColumn] += height + gap;
    });

    return nextColumns;
  }, [imageById]);

  useEffect(() => {
    const updateLayoutConfig = () => {
      const containerWidth = containerRef.current?.clientWidth || window.innerWidth;
      const columns = getColumnCount(containerWidth);
      const gap = 10;
      const columnWidth = Math.floor((containerWidth - gap * (columns - 1)) / columns);
      setLayoutConfig((prev) => {
        if (
          prev.columns === columns
          && prev.columnWidth === columnWidth
          && prev.gap === gap
        ) {
          return prev;
        }
        return { columns, columnWidth, gap };
      });
    };

    updateLayoutConfig();
    window.addEventListener('resize', updateLayoutConfig);
    return () => window.removeEventListener('resize', updateLayoutConfig);
  }, [getColumnCount]);

  useEffect(() => {
    if (images.length === 0) {
      setColumnOrder([]);
      setLayoutReady(false);
      return;
    }
    if (!layoutConfig.columns) return;

    const nextOrder = images.map(getImageId);
    setColumnOrder((prev) => {
      const prevFlat = prev.flat();
      const nextSet = new Set(nextOrder);
      const filtered = prevFlat.filter((id) => nextSet.has(id));
      const filteredSet = new Set(filtered);
      const appended = nextOrder.filter((id) => !filteredSet.has(id));
      const merged = [...filtered, ...appended];

      if (
        prev.length === layoutConfig.columns
        && appended.length === 0
        && filtered.length === prevFlat.length
      ) {
        return prev;
      }

      return buildColumnOrder(merged, layoutConfig);
    });
  }, [images, layoutConfig, buildColumnOrder]);

  useEffect(() => {
    if (columnOrder.length === 0 || !layoutConfig.columns) return;

    const { columns, columnWidth, gap } = layoutConfig;
    const newPositions = {};
    const columnHeights = new Array(columns).fill(0);

    columnOrder.forEach((column, columnIndex) => {
      let y = 0;
      column.forEach((imgId) => {
        const img = imageById.get(imgId);
        if (!img) return;
        const imgWidth = img.width || 400;
        const imgHeight = img.height || 500;
        const aspectRatio = imgWidth / imgHeight;
        const height = (columnWidth / aspectRatio) * getImageScale(imgId);
        const x = columnIndex * (columnWidth + gap);

        newPositions[imgId] = {
          x,
          y,
          column: columnIndex,
          width: columnWidth,
          height,
        };
        y += height + gap;
      });
      columnHeights[columnIndex] = y;
    });

    setPositions(newPositions);
    const nextHeight = columnHeights.length ? Math.max(...columnHeights) : 0;
    setGalleryHeight(Math.max(nextHeight, 400));
    setLayoutReady(Object.keys(newPositions).length > 0);
  }, [columnOrder, layoutConfig, imageById]);

  const handleDragStart = useCallback((event) => {
    setActiveDragId(event.active.id);
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveDragId(null);
  }, []);

  const handleDragEnd = useCallback((event) => {
    const { active, delta } = event;
    setActiveDragId(null);
    lastDragEndRef.current = Date.now();
    if (!active?.id) return;
    if (!layoutConfig.columns) return;
    if (layoutConfig.columnWidth <= 0) return;
    if (!positions[active.id]) return;

    const startPos = positions[active.id];
    const nextX = startPos.x + (delta?.x || 0);
    const nextY = startPos.y + (delta?.y || 0);
    const columnWidth = layoutConfig.columnWidth;
    const columnGap = layoutConfig.gap;
    const columnStride = columnWidth + columnGap;
    let targetColumn = Math.round(nextX / columnStride);
    targetColumn = Math.max(0, Math.min(layoutConfig.columns - 1, targetColumn));

    setColumnOrder((prev) => {
      if (prev.length === 0) return prev;
      let sourceColumn = -1;
      let sourceIndex = -1;
      prev.forEach((column, colIndex) => {
        const idx = column.indexOf(active.id);
        if (idx !== -1) {
          sourceColumn = colIndex;
          sourceIndex = idx;
        }
      });
      if (sourceColumn === -1) return prev;

      const nextColumns = prev.map((column) => column.slice());
      nextColumns[sourceColumn].splice(sourceIndex, 1);
      const targetItems = nextColumns[targetColumn] || [];

      let insertIndex = targetItems.length;
      for (let i = 0; i < targetItems.length; i += 1) {
        const itemId = targetItems[i];
        const itemPos = positions[itemId];
        if (!itemPos) continue;
        if (nextY < itemPos.y + itemPos.height * 0.5) {
          insertIndex = i;
          break;
        }
      }
      targetItems.splice(insertIndex, 0, active.id);
      nextColumns[targetColumn] = targetItems;

      return nextColumns;
    });
  }, [layoutConfig, positions]);

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

  const aboutFaqItems = [
    {
      question: 'What is Local Effort?',
      answer:
        'Local Effort is a Minnesota-based team of chefs focused on seasonal high-integrity cooking for homes, events, and partner businesses.',
    },
    {
      question: 'Where do you serve?',
      answer:
        'Most of our services are available all across the Twin Cities metro. Our pizzas can be enjoyed at Happy Monday Coffee in Roseville.',
    },
    {
      question: 'What kinds of services do you offer?',
      answer:
        "Fancy home dinners, food for small events and weddings, weekly prepared meal plans (when openings exist), and pizza parties using our mobile setup. Those are the main products. More abstractly, we're private chefs open to most situations where seriously good food is needed.",
    },
    {
      question: "What's included in a pizza party?",
      answer:
        "We bring the high-temperature oven, dough, ingredients, and crew. We can also use your in-home oven. We tailor service to your guest count, timing, and space so it runs smooth and feels hosted, not chaotic. We'll bring some extra food like salads or desserts, if you'd like.",
    },
    {
      question: 'How many guests can you serve?',
      answer:
        "We specialize in smaller events, like home-dinners for 2-16 people, or platters and apps for parties 50-100. We're open to larger events in some situations.",
    },
    {
      question: 'Do you accommodate allergies and dietary preferences?',
      answer:
        "Of course. Full accomodation. As custom as possible. We don't have a gluten free crust yet.",
    },
    {
      question: 'How do menus get set?',
      answer:
        "We build menus around seasonal ingredients and your preferences. You can share must-haves, dislikes, dietary needs, and the vibe in the request form, then we finalize details together.",
    },
    {
      question: 'How does event pricing work?',
      answer:
        'Pricing depends on guest count, staffing, service style, and final ingredients. The event page generates a ballpark range and sets a cost for a deposit, to hold the date. We confirm the final quote with you after details are verified. Email us directly if you prefer.',
    },
    {
      question: 'What is the deposit and hold policy?',
      answer:
        'A 15% deposit holds your date. Deposits are handled through Square.',
    },
    {
      question: 'Can you help with rentals or staffing?',
      answer:
        'Yes, usually. We will utilize a coordinator if your event needs rentals (tables/chairs/linens/kitchen equipment) or additional service staff.',
    },
  ];

  const renderInlineMarkup = (text) => {
    if (!text) return null;
    const raw = String(text);
    if (!/\[(?:\/)?[bi]\]/.test(raw)) return raw;
    const tokens = raw.split(/(\[\/?b\]|\[\/?i\])/);
    const root = { type: null, children: [] };
    const stack = [root];
    tokens.forEach((token) => {
      if (!token) return;
      if (token === '[b]') {
        const node = { type: 'b', children: [] };
        stack[stack.length - 1].children.push(node);
        stack.push(node);
        return;
      }
      if (token === '[/b]') {
        if (stack.length > 1) stack.pop();
        return;
      }
      if (token === '[i]') {
        const node = { type: 'i', children: [] };
        stack[stack.length - 1].children.push(node);
        stack.push(node);
        return;
      }
      if (token === '[/i]') {
        if (stack.length > 1) stack.pop();
        return;
      }
      stack[stack.length - 1].children.push(token);
    });

    let key = 0;
    const renderNodes = (node) => node.children.map((child) => {
      if (typeof child === 'string') return child;
      const Tag = child.type === 'b' ? 'strong' : 'em';
      return (
        <Tag key={`inline-${key++}`}>
          {renderNodes(child)}
        </Tag>
      );
    });

    return renderNodes(root);
  };

  const formatFeedbackDate = useCallback((value) => {
    if (!value) return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    if (typeof value === 'object') {
      if (typeof value.toDate === 'function') {
        const parsed = value.toDate();
        if (!Number.isNaN(parsed.getTime())) return parsed;
      }
      const seconds = value.seconds ?? value._seconds;
      if (typeof seconds === 'number') {
        const parsed = new Date(seconds * 1000);
        if (!Number.isNaN(parsed.getTime())) return parsed;
      }
    }
    return null;
  }, []);

  const formatFeedbackContext = useCallback((entry) => {
    const date = formatFeedbackDate(entry?.createdAt);
    if (!date) return 'Feedback';
    const label = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `Feedback · ${label}`;
  }, [formatFeedbackDate]);

  const normalizeFeedbackEntry = useCallback((entry) => {
    if (!entry) return null;
    const quote = entry.comment || entry.quote || '';
    if (!quote) return null;
    return {
      id: entry.id || `feedback-${Date.now()}`,
      quote,
      author: entry.customerId || entry.author || 'Guest',
      context: entry.context || formatFeedbackContext(entry),
    };
  }, [formatFeedbackContext]);

  const resetBusinessContact = useCallback(() => {
    setBusinessContactName('');
    setBusinessContactEmail('');
    setBusinessContactPhone('');
    setBusinessContactOrg('');
    setBusinessContactMessage('');
    setBusinessContactStatus('idle');
    setBusinessContactError('');
  }, []);

  const openBusinessContact = useCallback((type) => {
    setBusinessContactType(type);
    setBusinessContactOpen(true);
    setBusinessContactStatus('idle');
    setBusinessContactError('');
  }, []);

  const resetSmallEventsContact = useCallback(() => {
    setSmallEventsContactName('');
    setSmallEventsContactEmail('');
    setSmallEventsContactPhone('');
    setSmallEventsContactMessage('');
    setSmallEventsContactStatus('idle');
    setSmallEventsContactError('');
  }, []);

  const openSmallEventsContact = useCallback((type) => {
    setSmallEventsContactType(type);
    setSmallEventsContactOpen(true);
    setSmallEventsContactStatus('idle');
    setSmallEventsContactError('');
  }, []);

  const reviews = thumbtackReviews;
  const feedbackItems = useMemo(() => {
    const dynamic = Array.isArray(liveFeedback) ? liveFeedback : [];
    const staticReviews = Array.isArray(reviews) ? reviews : [];
    return [...dynamic, ...staticReviews];
  }, [liveFeedback, reviews]);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch('/api/feedback?limit=50', { signal: controller.signal });
        const data = await res.json().catch(() => ({}));
        if (!mounted || !res.ok) return;
        const items = Array.isArray(data.items) ? data.items : [];
        const normalized = items.map(normalizeFeedbackEntry).filter(Boolean);
        if (mounted) setLiveFeedback(normalized);
      } catch (_err) {
        // Swallow fetch errors; static reviews still render.
      }
    })();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [normalizeFeedbackEntry]);

  const faqStructuredData = useMemo(
    () => JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: aboutFaqItems.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    }),
    [aboutFaqItems],
  );

  const FeedbackModal = useMemo(() => {
    if (!showFeedback) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" role="dialog" aria-modal="true">
        <div className="form-card w-full max-w-lg relative">
          <button
            className="absolute right-4 top-4 text-sm underline"
            onClick={() => setShowFeedback(false)}
            aria-label="Close feedback"
          >
            Close
          </button>
          <h4 className="text-xl font-bold mb-2">Send Feedback</h4>
          <p className="text-sm text-gray-600 mb-4">We read every note. Thanks for helping us improve.</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setFbStatus('sending');
              try {
                const rating = fb.sentiment === 'positive' ? 5 : fb.sentiment === 'neutral' ? 3 : 1;
                const feedbackPayload = {
                  rating,
                  comment: fb.message,
                  customerId: fb.name || 'Guest',
                  orderId: fb.email || null,
                };
                const messagePayload = {
                  name: fb.name,
                  email: fb.email,
                  subject: `Website feedback (${fb.sentiment})`,
                  message: fb.message,
                  type: 'feedback',
                };

                const [feedbackResult, messageResult] = await Promise.allSettled([
                  fetch('/api/feedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(feedbackPayload),
                  }),
                  fetch('/api/messages/submit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(messagePayload),
                  }),
                ]);

                if (feedbackResult.status !== 'fulfilled') {
                  throw new Error('Failed to save feedback');
                }

                const feedbackRes = feedbackResult.value;
                const feedbackData = await feedbackRes.json().catch(() => ({}));
                if (!feedbackRes.ok) throw new Error(feedbackData.error || 'Failed to save feedback');

                if (messageResult.status === 'fulfilled' && !messageResult.value.ok) {
                  const messageText = await messageResult.value.text().catch(() => '');
                  console.warn('Feedback email failed:', messageText || messageResult.value.status);
                }

                const newEntry = normalizeFeedbackEntry({
                  id: feedbackData.id,
                  comment: fb.message,
                  customerId: fb.name || 'Guest',
                  createdAt: new Date(),
                });
                if (newEntry) {
                  setLiveFeedback((prev) => [newEntry, ...prev.filter((item) => item?.id !== newEntry.id)]);
                }
                setFbStatus('sent');
                setFb({ name: '', email: '', sentiment: 'positive', message: '' });
                setTimeout(() => setShowFeedback(false), 900);
              } catch (_e) {
                setFbStatus('error');
              }
            }}
            className="space-y-3"
          >
            <div>
              <label className="label" htmlFor="fb-name">Name</label>
              <input id="fb-name" className="input" value={fb.name} onChange={(e) => setFb({ ...fb, name: e.target.value })} required />
            </div>
            <div>
              <label className="label" htmlFor="fb-email">Email</label>
              <input id="fb-email" type="email" className="input" value={fb.email} onChange={(e) => setFb({ ...fb, email: e.target.value })} required />
            </div>
            <div>
              <label className="label" htmlFor="fb-sentiment">Type</label>
              <div className="flex gap-4" id="fb-sentiment">
                {['positive', 'neutral', 'negative'].map((s) => (
                  <label key={s} className="inline-flex items-center gap-2">
                    <input type="radio" name="sentiment" value={s} checked={fb.sentiment === s} onChange={() => setFb({ ...fb, sentiment: s })} />
                    <span className="capitalize">{s}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="label" htmlFor="fb-message">Message</label>
              <textarea id="fb-message" className="textarea" value={fb.message} onChange={(e) => setFb({ ...fb, message: e.target.value })} rows={5} required />
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" className="btn btn-primary" disabled={fbStatus === 'sending'}>
                {fbStatus === 'sending' ? 'Sending...' : 'Send feedback'}
              </button>
              {fbStatus === 'sent' && <span className="text-green-700 text-sm">Thanks! Sent.</span>}
              {fbStatus === 'error' && <span className="text-red-700 text-sm">Could not send. Try again.</span>}
            </div>
          </form>
        </div>
      </div>
    );
  }, [showFeedback, fb, fbStatus, normalizeFeedbackEntry]);

  const PartnerGrid = () => {
    const items = (partners || []).filter((p) => p && p.publicId);
    if (!items.length) return null;
    return (
      <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5 items-center px-4">
        {items.map((p, i) => (
          <motion.a
            key={(p.publicId || i) + i}
            href={p.url || '#'}
            onClick={(e) => {
              if (!p.url) e.preventDefault();
              if (typeof window !== 'undefined' && window.gtag) {
                window.gtag('event', 'partner_click', { partner: p.name || p.publicId });
              }
            }}
            className="flex items-center justify-center p-3 bg-white rounded-lg shadow-sm"
            aria-label={p.name || `Partner ${i + 1}`}
            rel="noopener noreferrer"
            target={p.url ? '_blank' : undefined}
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.25, ease: 'easeOut', delay: i * 0.03 }}
          >
            <div className="w-full">
              <div className="relative w-full" style={{ paddingTop: '18.2%' }}>
                <CloudinaryImage
                  publicId={p.publicId}
                  alt={p.name || `Partner ${i + 1}`}
                  width={1000}
                  height={250}
                  containerClassName="absolute inset-0"
                  imgClassName="w-full h-full grayscale hover:grayscale-0 transition-all"
                  resizeMode="fit"
                  placeholderMode="solid"
                  containerStyle={{ backgroundImage: 'none', backgroundColor: 'transparent' }}
                  sizes="(max-width: 640px) 32vw, (max-width: 1024px) 20vw, 16vw"
                  responsiveSteps={[320, 560, 820, 1000]}
                />
              </div>
            </div>
          </motion.a>
        ))}
      </div>
    );
  };

  return (
    <div className="fullpage-demo">
      {/* Announcement Bar */}
      <AnimatePresence>
        {announcementVisible && activePage === 0 && (
          <motion.button
            type="button"
            className="announcement-bar"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            onClick={() => setAnnouncementOpen(true)}
          >
            try <span className="announcement-highlight">local pizza</span> and more at Happy Monday Coffee in Roseville
          </motion.button>
        )}
      </AnimatePresence>

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
          <div
            className="w-full h-full overflow-y-auto"
            style={{
              paddingTop: announcementVisible && activePage === 0
                ? `calc(5rem + ${ANNOUNCEMENT_HEIGHT}px)`
                : '5rem',
            }}
          >
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
                <SortableContext items={flatOrder}>
                  <div
                    ref={containerRef}
                    className="relative w-full"
                    style={{ minHeight: `${galleryHeight}px` }}
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
                className="group mt-6 ml-4 md:mt-8 md:ml-8 lg:mt-[50px] lg:ml-[50px]"
                style={{
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
              <div className="mt-6 ml-4 md:mt-8 md:ml-8 lg:mt-[50px] lg:ml-[50px]">
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
            <div className="mt-12 px-4 md:px-8 lg:px-[50px]">
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
          <div className="relative w-full h-full pt-20 overflow-y-auto">
            <div className="relative min-h-[520px] h-[70vh]">
              <img
                src="https://res.cloudinary.com/dokyhfvyd/image/upload/c_limit,f_auto,q_auto,w_1600/vjuesai2mxfavpq9d2df"
                alt="Small Events"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ objectPosition: 'center' }}
              />
              <div className="relative z-10 flex items-start justify-center h-full pt-24">
                <div className="small-events-cta">
                  <div className="small-events-guide" aria-hidden="true">
                    <div className="small-events-guide-text">BOOK TODAY</div>
                    <span className="small-events-guide-arrow" />
                  </div>
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
              <div className="absolute bottom-8 left-0 right-0 z-10 flex justify-center">
                <a
                  href="/february"
                  className="px-8 py-5 rounded-md border-2 border-rose-400 bg-rose-500/90 text-white text-lg font-semibold hover:bg-rose-600 transition-colors shadow-lg"
                  style={{ fontFamily: "'Office Code Pro', monospace" }}
                >
                  home dinners in february
                </a>
              </div>
            </div>
            <div className="px-8 pb-16 pt-10">
              <div className="small-events-testimonial">
                "Local Effort is truly top tier."
                <div className="small-events-testimonial-author">
                  <a
                    href="https://soupsistersmn.com"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Alyssa Andes
                  </a>
                </div>
              </div>
              <div className="mt-10">
                <div className="partnerships-grid columns-2 md:columns-3 lg:columns-4 [column-fill:_balance]">
                  <div className="partnerships-card break-inside-avoid">
                    <button
                      type="button"
                      className="partnerships-title partnerships-title-link"
                      onClick={() => openSmallEventsContact('dinner')}
                    >
                      dinner at your home
                    </button>
                    <div className="partnerships-copy" />
                  </div>
                  <div className="partnerships-card break-inside-avoid">
                    <button
                      type="button"
                      className="partnerships-title partnerships-title-link"
                      onClick={() => openSmallEventsContact('weddings')}
                    >
                      weddings and showers
                    </button>
                    <div className="partnerships-copy" />
                  </div>
                  <div className="partnerships-card break-inside-avoid">
                    <button
                      type="button"
                      className="partnerships-title partnerships-title-link"
                      onClick={() => openSmallEventsContact('holiday')}
                    >
                      small events and holiday parties
                    </button>
                    <div className="partnerships-copy" />
                  </div>
                </div>
              </div>
              <div className="mt-12">
                <PhotoGrid
                  tags={['event', 'dinner']}
                  perPage={8}
                  layout="masonry"
                  className="small-events-gallery"
                />
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
                <div className="business-panel">
                  <div className="business-eyebrow">For businesses</div>
                  <div className="business-heading">Partner with Local Effort</div>
                  <div className="business-subtitle">
                    You&apos;re working directly with the chefs. We&apos;re here to support your local food needs.
                  </div>
                  <div className="business-actions">
                    <button
                      type="button"
                      className={`business-link ${businessPanel === 'wholesale' ? 'is-active' : ''}`}
                      onClick={() => handleBusinessSelect('wholesale')}
                    >
                      cafes, bars, grocery stores and other retail settings interested in wholesale
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
                            <div className="business-note">
                              fridge and freezer-friendly foods for display cases, grab and go fridges, and menus,
                              delivered fresh. available within approx. 15 miles of 55449, or anywhere in metro along
                              Highway 35w.
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
                  a lightweight portal where customers can get more information, like ingredients and nutrition, as
                  well as provide feedback and make custom requests.
                </div>
              </div>
              <div className="case-study-scroll" role="region" aria-label="Happy Monday case study">
                <div className="case-study-grid">
                  <div className="case-study-card case-study-text">
                    <div className="case-study-tag">Goal</div>
                    <div className="case-study-copy">
                      create a way for a cafe food vendor to have a direct relationship with end customers.{' '}
                      <a
                        href="https://www.localeffortfood.com/happymonday"
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-4"
                      >
                        see it in action
                      </a>
                      .
                    </div>
                  </div>
                  <button
                    type="button"
                    className="case-study-card case-study-image case-study-expand"
                    onClick={() => setCaseStudyImage({
                      src: '/gallery/hmw%20(1).png',
                      alt: 'Happy Monday portal preview',
                    })}
                  >
                    <img
                      src="/gallery/hmw%20(1).png"
                      alt="Happy Monday portal preview"
                      loading="lazy"
                    />
                  </button>
                  <div className="case-study-card case-study-text">
                    <div className="case-study-tag">Experience</div>
                    <div className="case-study-copy">
                      customers are empowered to chat directly with the chef about their dietary needs and
                      preferences, and have the opportunity to customize their experience at their favorite place.
                    </div>
                  </div>
                  <button
                    type="button"
                    className="case-study-card case-study-image case-study-expand"
                    onClick={() => setCaseStudyImage({
                      src: '/gallery/hmw%20(2).png',
                      alt: 'Happy Monday meals grid',
                    })}
                  >
                    <img
                      src="/gallery/hmw%20(2).png"
                      alt="Happy Monday meals grid"
                      loading="lazy"
                    />
                  </button>
                  <div className="case-study-card case-study-text">
                    <div className="case-study-tag">What&apos;s next</div>
                    <div className="case-study-copy">
                      b2c pre-ordering, subscriptions and notifications for &apos;DROPS&apos; or new products,
                      discounts and loyalty features, and more ideas about improving vendor-customer relationships in
                      cafe settings.
                    </div>
                  </div>
                  <button
                    type="button"
                    className="case-study-card case-study-image case-study-expand"
                    onClick={() => setCaseStudyImage({
                      src: '/gallery/hmw%20(3).png',
                      alt: 'Happy Monday meal prep detail',
                    })}
                  >
                    <img
                      src="/gallery/hmw%20(3).png"
                      alt="Happy Monday meal prep detail"
                      loading="lazy"
                    />
                  </button>
                </div>
              </div>
            </section>

            <section className="partnerships-section">
              <div className="partnerships-grid">
                <div className="partnerships-card">
                  <button
                    type="button"
                    className="partnerships-title partnerships-title-link"
                    onClick={() => openBusinessContact('wholesale')}
                  >
                    wholesale
                  </button>
                  <div className="partnerships-copy">
                    pizza, sandwiches, salads, and other standbys, with the same commitments to local and high-integrity
                    ingredients. always minnesotan made, always midwest ingredients, always delicious and nutritionally
                    sound.
                  </div>
                </div>
                <div className="partnerships-card">
                  <button
                    type="button"
                    className="partnerships-title partnerships-title-link"
                    onClick={() => openBusinessContact('consulting')}
                  >
                    restaurant consulting
                  </button>
                  <div className="partnerships-copy">
                    front-of-house and back-of-house solutions. improve your restaurant group&apos;s tech stack,
                    ingredient sourcing, menu design, service feel, and more. we are restaurant veterans with
                    substantial experience in every dimension of this weird business. we&apos;re here to help you make
                    your vision sharper, crisper, cooler, higher impact.
                  </div>
                </div>
                <div className="partnerships-card">
                  <button
                    type="button"
                    className="partnerships-title partnerships-title-link"
                    onClick={() => openBusinessContact('collaborations')}
                  >
                    collaborations
                  </button>
                  <div className="partnerships-copy">
                    always very open and interested in working with other creatives and businesses from all domains:
                    political organizers, artists, bakers, farmers and ag workers, event coordinators, small and large
                    businesses - we want to bring <span className="partnerships-highlight">local food</span> to your
                    audience.
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
          <div className="about-tab relative w-full h-full pt-20 overflow-y-auto">
            <div className="relative w-full h-[70vh] min-h-[420px]">
              <img
                src="https://res.cloudinary.com/dokyhfvyd/image/upload/c_limit,f_auto,q_auto,w_1600/jo9pxtjng8zpt4yo4rcz?_a=BAMAK+eA0"
                alt="About Local Effort"
                className="w-full h-full object-contain"
                style={{ objectPosition: 'center', backgroundColor: BRAND_TOKENS.bgSection }}
              />
            </div>
            <div className="px-8 py-12">
              <div className="about-bio">
                <div className="about-bio-eyebrow">Who we are</div>
                <div className="about-bio-copy">
                  <p>
                    <strong>We&apos;re a knockout team of experienced kitchen professionals</strong> offering our
                    services as personal chefs and value-added producers. We bring Minnesotan and Midwest ingredients
                    to everyday meals and special events with a farm-to-table ethic.
                  </p>
                  <p>
                    We love platters and cassoulets and juleps and celery and croque monsieur and white rice, we love
                    vegetables and meats and grain and nuts and grapes and HAZELNUTS and ducks and lamb and the weird
                    great awesome people who make them and keep making them. We love meeting our growers. We love
                    living in an city where shopping locally is valued and not hard to do.
                  </p>
                  <p>
                    We feel strongly about choosing food grown and produced closer to home. It&apos;s a duty, and a
                    gift, and it&apos;s at the center of our practice and culture. We care about flavor and nutrition
                    in equal measure. We&apos;re the realest people make the localest food.
                  </p>
                </div>
              </div>
              <div className="about-info-masonry">
                {aboutGalleryLoading && (
                  <div className="about-info-status">Loading photos...</div>
                )}
                {aboutGalleryError && (
                  <div className="about-info-status about-info-status-error">{aboutGalleryError}</div>
                )}
                <div className="columns-2 md:columns-3 lg:columns-4 gap-4 [column-fill:_balance]">
                  {aboutMasonryItems.map((item, idx) => {
                    if (item.type === 'image') {
                      const img = item.img;
                      return (
                        <div
                          key={item.key || `about-image-${idx}`}
                          className="mb-4 break-inside-avoid border p-2 bg-white rounded-lg overflow-hidden"
                        >
                          {img.thumbnail_url ? (
                            <img
                              src={img.thumbnail_url}
                              alt={img.context?.alt || 'About gallery image'}
                              className="rounded-lg w-full h-auto"
                              loading="lazy"
                            />
                          ) : (
                            <CloudinaryImage
                              publicId={img.public_id || img.publicId}
                              alt={img.context?.alt || 'About gallery image'}
                              width={800}
                              className="rounded-lg w-full h-auto"
                            />
                          )}
                        </div>
                      );
                    }

                    const block = item.block;
                    const isHtml = block.type === 'html' && block.content;
                    return (
                      <div key={item.key || `about-info-${idx}`} className="about-info-card mb-4 break-inside-avoid">
                        <div className="about-info-title">{block.title}</div>
                        {isHtml ? (
                          <div
                            className="about-info-lines"
                            dangerouslySetInnerHTML={{ __html: block.content }}
                          />
                        ) : (
                          <ul className="about-info-list">
                            {(block.items || []).map((text) => (
                              <li key={text}>{text}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <section className="py-12">
                <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
                  <SectionHeader overline="Community" title="Our Partners" />
                </div>
                <PartnerGrid />
              </section>
              <section className="about-feedback">
                <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
                  <div className="about-feedback-header">
                    <div className="about-feedback-title">Feedback</div>
                    <div className="about-feedback-extra">
                      Want to{' '}
                      <button type="button" className="about-feedback-link" onClick={() => setShowFeedback(true)}>
                        provide feedback
                      </button>
                      ?
                    </div>
                  </div>
                  <div className="feedback-grid columns-2 md:columns-3 lg:columns-4 [column-fill:_balance]">
                    {feedbackItems.map((review, idx) => (
                      <figure key={review.id || `${review.author || 'review'}-${idx}`} className="feedback-quote break-inside-avoid">
                        <blockquote className="feedback-quote-text">
                          "{renderInlineMarkup(String(review.quote || '').trim())}"
                        </blockquote>
                        <figcaption className="feedback-quote-footer">
                          <div className="feedback-quote-author">{review.author || 'Customer'}</div>
                          {review.context && (
                            <div className="feedback-quote-context">{review.context}</div>
                          )}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                </div>
              </section>
              <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: faqStructuredData }}
              />
              <div className="about-faq">
                <div className="about-faq-title">FAQ</div>
                <div className="about-faq-list">
                  {aboutFaqItems.map((item, idx) => {
                    const isOpen = aboutFaqOpen === idx;
                    const questionId = `about-faq-question-${idx}`;
                    const answerId = `about-faq-answer-${idx}`;
                    return (
                      <div key={item.question} className={`about-faq-item ${isOpen ? 'is-open' : ''}`}>
                        <button
                          type="button"
                          className="about-faq-question"
                          onClick={() => setAboutFaqOpen(isOpen ? null : idx)}
                          id={questionId}
                          aria-expanded={isOpen}
                          aria-controls={answerId}
                        >
                          <span>{item.question}</span>
                          <span className="about-faq-icon">{isOpen ? '-' : '+'}</span>
                        </button>
                        <div
                          id={answerId}
                          className="about-faq-answer"
                          role="region"
                          aria-labelledby={questionId}
                          aria-hidden={!isOpen}
                        >
                          {item.answer}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </FullPageSection>

        {/* Page 6: Local Pizza */}
        <FullPageSection
          id="local-pizza"
          style={{ backgroundColor: BRAND_TOKENS.bgSection }}
        >
          <div className="relative w-full h-full pt-20 overflow-y-auto">
            <div className="relative min-h-[520px] h-[70vh]">
              <img
                src="/gallery/5Z0A5737-Edit.jpg"
                alt="Local pizza"
                className="absolute inset-0 h-full w-full object-cover"
                style={{ objectPosition: 'center' }}
              />
              <div className="relative z-10 flex h-full flex-col items-start justify-end gap-6 px-8 pb-16 md:flex-row md:items-end md:justify-between">
                <div
                  className="max-w-lg rounded-lg border border-white/60 bg-white/85 p-5 text-slate-900 shadow-lg"
                  style={{ fontFamily: "'Office Code Pro', monospace" }}
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Local pizza</div>
                  <div className="mt-2 text-lg font-semibold">Local Pizza in your freezer</div>
                  <div className="mt-2 text-sm text-slate-700">
                    Local Pizza is 100% midwest ingredients. Find us at Happy Monday in Roseville, and soon on{' '}
                    <a
                      href="https://mnfood.club/?afmc=1y"
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-4"
                    >
                      MN Food Club
                    </a>
                    . Host a pizza party at your home, office, or business today.
                  </div>
                </div>
                <button
                  type="button"
                  className="pizza-cta"
                  onClick={() => setSmallEventsDialog('pizza')}
                >
                  book a pizza party
                </button>
              </div>
            </div>
            <div className="relative z-10 px-8 pb-16 pt-10">
              {pizzaLoading ? (
                <div className="text-sm text-gray-600">Loading photos...</div>
              ) : pizzaError ? (
                <div className="text-sm text-red-700">{pizzaError}</div>
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
                      cheese:{' '}
                      <a
                        href="https://grandecheese.com/cheeses/mozzarella/"
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-4"
                      >
                        grande mozzarella
                      </a>
                      . grain:{' '}
                      <a
                        href="https://www.bakersfieldflourandbread.com/"
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-4"
                      >
                        bakers field
                      </a>
                      . tomato:{' '}
                      <a
                        href="https://deifratelli.com/"
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-4"
                      >
                        dei fratelli
                      </a>
                      . pepperoni: many.
                    </div>
                  </div>
                  {pizzaImages.map((img, idx) => (
                    <div
                      key={(img.asset_id || img.public_id || idx) + ':' + idx}
                      className="mb-4 break-inside-avoid border p-2 bg-white rounded-lg overflow-hidden"
                    >
                      {img.thumbnail_url ? (
                        <img
                          src={img.thumbnail_url}
                          alt={img.context?.alt || 'Pizza image'}
                          className="rounded-lg w-full h-auto"
                          loading="lazy"
                        />
                      ) : (
                        <CloudinaryImage
                          publicId={img.public_id || img.publicId}
                          alt={img.context?.alt || 'Pizza image'}
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
      </FullPageContainer>

      <footer className="fullpage-demo-footer">
        <div className="fullpage-demo-footer-inner">
          <div className="fullpage-demo-footer-brand">
            <div className="fullpage-demo-footer-name">Local Effort Inc.</div>
            <div className="fullpage-demo-footer-location">Roseville, MN</div>
          </div>
          <nav className="fullpage-demo-footer-links" aria-label="Footer">
            <a href="#about" className="fullpage-demo-footer-link">About</a>
            <a href="/releases" className="fullpage-demo-footer-link">Press</a>
            <a href="/happymonday" className="fullpage-demo-footer-link">For Happy Monday</a>
          </nav>
          <div className="fullpage-demo-footer-actions">
            <button
              type="button"
              className="fullpage-demo-footer-button"
              onClick={() => setAskChefOpen(true)}
            >
              Ask a chef
            </button>
          </div>
        </div>
      </footer>

      <AskChefForm
        open={askChefOpen}
        onOpenChange={setAskChefOpen}
        dialogClassName="fullpage-demo-scope"
      />

      {FeedbackModal}

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
              className="relative w-full max-w-[92vw] max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="lightbox-scroll">
                {selected.img.large_url ? (
                  <img
                    src={selected.img.large_url}
                    alt={selected.img.context?.alt || 'Large gallery image'}
                    decoding="async"
                    fetchPriority="high"
                    className="lightbox-image object-contain rounded-lg shadow-2xl"
                  />
                ) : (
                  <CloudinaryImage
                    publicId={selected.img.public_id}
                    alt={selected.img.context?.alt || 'Large gallery image'}
                    width={2000}
                    height={2000}
                    disableLazy
                    eager
                    className="lightbox-image object-contain rounded-lg shadow-2xl"
                  />
                )}
              </div>

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

      <Dialog open={announcementOpen} onOpenChange={setAnnouncementOpen}>
        <DialogContent className="fullpage-demo-scope sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Happy Monday Coffee</DialogTitle>
            <img
              src="/gallery/hmw%20(1).png"
              alt="Happy Monday Coffee"
              className="announcement-map-image"
              loading="lazy"
            />
            <DialogDescription>
              Our favorite coffee shop,{' '}
              <a
                href="https://www.happymonday.company"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4"
              >
                Happy Monday Coffee
              </a>
              , has our sandwiches and salads in their grab-and-go fridge, and our frozen pizzas in their freezer.
              Drop in and try one out.
            </DialogDescription>
          </DialogHeader>
          <div className="announcement-map">
            <div className="announcement-map-title">Google Maps</div>
            <div className="announcement-map-media">
              <div className="announcement-map-embed">
                <iframe
                  title="Happy Monday Coffee on Google Maps"
                  src="https://www.google.com/maps?q=Happy%20Monday%20Coffee%2C%202420%20Cleveland%20Ave%20N%2C%20Roseville%2C%20MN%2055113&output=embed"
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  className="announcement-map-iframe"
                />
              </div>
            </div>
            <a
              href="https://www.google.com/maps/search/?api=1&query=Happy%20Monday%20Coffee%2C%202420%20Cleveland%20Ave%20N%2C%20Roseville%2C%20MN%2055113"
              target="_blank"
              rel="noreferrer"
              className="announcement-map-link"
            >
              2420 Cleveland Ave N, Roseville, MN 55113
            </a>
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

      <Dialog open={smallEventsDialog === 'pizza'} onOpenChange={(open) => setSmallEventsDialog(open ? 'pizza' : null)}>
        <DialogContent className="fullpage-demo-scope small-events-dialog max-h-[85vh] overflow-y-auto sm:max-w-[980px]">
          <DialogHeader>
            <DialogTitle className="small-events-title">Pizza Party</DialogTitle>
            <DialogDescription className="small-events-description">
              Wood-fired pizza parties with full service, staffing, and a 15% deposit to hold the date.
            </DialogDescription>
          </DialogHeader>
          {renderSmallEventDialogContent('pizza')}
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

      <Dialog
        open={businessContactOpen}
        onOpenChange={(open) => {
          setBusinessContactOpen(open);
          if (!open) resetBusinessContact();
        }}
      >
        <DialogContent className="fullpage-demo-scope sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>
              Contact us about {BUSINESS_CONTACT_OPTIONS[businessContactType] || 'partnerships'}
            </DialogTitle>
            <DialogDescription>
              Share a few details and we&apos;ll follow up with next steps.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (businessContactStatus === 'sending') return;
              setBusinessContactStatus('sending');
              setBusinessContactError('');
              try {
                const typeLabel = BUSINESS_CONTACT_OPTIONS[businessContactType] || 'Partnerships';
                const lines = [
                  `Partnership type: ${typeLabel}`,
                  businessContactOrg ? `Organization: ${businessContactOrg}` : null,
                  businessContactPhone ? `Phone: ${businessContactPhone}` : null,
                  businessContactMessage ? `Message: ${businessContactMessage}` : null,
                ].filter(Boolean);
                const payload = {
                  name: businessContactName,
                  email: businessContactEmail,
                  subject: `Business inquiry: ${typeLabel}`,
                  message: lines.join('\n'),
                  type: 'business-partnership',
                };
                const res = await fetch('/api/messages/submit', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload),
                });
                if (!res.ok) throw new Error(await res.text());
                setBusinessContactStatus('sent');
                resetBusinessContact();
                setTimeout(() => setBusinessContactOpen(false), 800);
              } catch (error) {
                setBusinessContactError(error?.message || 'Unable to send message.');
                setBusinessContactStatus('error');
              }
            }}
          >
            <div>
              <label className="label" htmlFor="business-contact-type">Partnership type</label>
              <select
                id="business-contact-type"
                className="input"
                value={businessContactType}
                onChange={(e) => setBusinessContactType(e.target.value)}
              >
                {Object.entries(BUSINESS_CONTACT_OPTIONS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="business-contact-name">Name</label>
              <input
                id="business-contact-name"
                className="input"
                value={businessContactName}
                onChange={(e) => setBusinessContactName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="business-contact-email">Email</label>
              <input
                id="business-contact-email"
                type="email"
                className="input"
                value={businessContactEmail}
                onChange={(e) => setBusinessContactEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="business-contact-org">Organization</label>
              <input
                id="business-contact-org"
                className="input"
                value={businessContactOrg}
                onChange={(e) => setBusinessContactOrg(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="label" htmlFor="business-contact-phone">Phone (optional)</label>
              <input
                id="business-contact-phone"
                type="tel"
                className="input"
                value={businessContactPhone}
                onChange={(e) => setBusinessContactPhone(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="label" htmlFor="business-contact-message">Message</label>
              <textarea
                id="business-contact-message"
                className="textarea"
                rows={5}
                value={businessContactMessage}
                onChange={(e) => setBusinessContactMessage(e.target.value)}
                required
              />
            </div>
            {businessContactError && (
              <div className="text-sm text-red-700">{businessContactError}</div>
            )}
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={businessContactStatus === 'sending'}
            >
              {businessContactStatus === 'sending' ? 'Sending...' : 'Send request'}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={smallEventsContactOpen}
        onOpenChange={(open) => {
          setSmallEventsContactOpen(open);
          if (!open) resetSmallEventsContact();
        }}
      >
        <DialogContent className="fullpage-demo-scope sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>
              Contact us about {SMALL_EVENTS_CONTACT_OPTIONS[smallEventsContactType] || 'small events'}
            </DialogTitle>
            <DialogDescription>
              Share a few details and we&apos;ll follow up with next steps.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (smallEventsContactStatus === 'sending') return;
              setSmallEventsContactStatus('sending');
              setSmallEventsContactError('');
              try {
                const typeLabel = SMALL_EVENTS_CONTACT_OPTIONS[smallEventsContactType] || 'Small events';
                const lines = [
                  `Event type: ${typeLabel}`,
                  smallEventsContactPhone ? `Phone: ${smallEventsContactPhone}` : null,
                  smallEventsContactMessage ? `Message: ${smallEventsContactMessage}` : null,
                ].filter(Boolean);
                const payload = {
                  name: smallEventsContactName,
                  email: smallEventsContactEmail,
                  subject: `Small events inquiry: ${typeLabel}`,
                  message: lines.join('\n'),
                  type: 'small-events-inquiry',
                };
                const res = await fetch('/api/messages/submit', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload),
                });
                if (!res.ok) throw new Error(await res.text());
                setSmallEventsContactStatus('sent');
                resetSmallEventsContact();
                setTimeout(() => setSmallEventsContactOpen(false), 800);
              } catch (error) {
                setSmallEventsContactError(error?.message || 'Unable to send message.');
                setSmallEventsContactStatus('error');
              }
            }}
          >
            <div>
              <label className="label" htmlFor="small-events-contact-type">Event type</label>
              <select
                id="small-events-contact-type"
                className="input"
                value={smallEventsContactType}
                onChange={(e) => setSmallEventsContactType(e.target.value)}
              >
                {Object.entries(SMALL_EVENTS_CONTACT_OPTIONS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="small-events-contact-name">Name</label>
              <input
                id="small-events-contact-name"
                className="input"
                value={smallEventsContactName}
                onChange={(e) => setSmallEventsContactName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="small-events-contact-email">Email</label>
              <input
                id="small-events-contact-email"
                type="email"
                className="input"
                value={smallEventsContactEmail}
                onChange={(e) => setSmallEventsContactEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="small-events-contact-phone">Phone (optional)</label>
              <input
                id="small-events-contact-phone"
                type="tel"
                className="input"
                value={smallEventsContactPhone}
                onChange={(e) => setSmallEventsContactPhone(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="label" htmlFor="small-events-contact-message">Message</label>
              <textarea
                id="small-events-contact-message"
                className="textarea"
                rows={5}
                value={smallEventsContactMessage}
                onChange={(e) => setSmallEventsContactMessage(e.target.value)}
                required
              />
            </div>
            {smallEventsContactError && (
              <div className="text-sm text-red-700">{smallEventsContactError}</div>
            )}
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={smallEventsContactStatus === 'sending'}
            >
              {smallEventsContactStatus === 'sending' ? 'Sending...' : 'Send request'}
            </button>
          </form>
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

      <Dialog
        open={Boolean(caseStudyImage)}
        onOpenChange={(open) => {
          if (!open) setCaseStudyImage(null);
        }}
      >
        <DialogContent className="fullpage-demo-scope case-study-lightbox sm:max-w-[900px]">
          {caseStudyImage && (
            <img
              src={caseStudyImage.src}
              alt={caseStudyImage.alt}
              className="w-full h-auto"
              loading="eager"
            />
          )}
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
