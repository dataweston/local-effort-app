/**
 * SmallEventsWizard
 *
 * Self-contained 7-step booking wizard for small events.
 * Uses le-checkout visual system.
 *
 * Steps:
 *   1. Event type
 *   2. Guest count + live estimate
 *   3. Date (availability calendar)
 *   4. Location & kitchen
 *   5. Dietary + preferences (skippable)
 *   6. Contact info
 *   7. Summary + deposit / save
 */

import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import '../../styles/le-checkout.css';

/* ─── Config (mirrors backend) ────────────────────────────────────────────── */

// Shared pricing fields MUST stay in sync with backend/api/routes/smallEvents.js
// (SMALL_EVENT_CONFIG). UI-only fields: description, maxGuests.
const SMALL_EVENT_CONFIG = {
  dinner: {
    label: 'Dinner party',
    description: 'Chef-led, multi-course dinner at your home.',
    baseRate: 95,
    baseRateFloor: 65,
    baseRateTaperPerGuest: 1.0,
    staffingGuestsPer: 8,
    staffingHourly: 45,
    staffingHours: 4,
    minimumTotal: 850,
    minGuests: 4,
    maxGuests: 16,
    rangeMin: 0.9,
    rangeMax: 1.2,
  },
  pizza: {
    label: 'Pizza party',
    description: 'Wood-fired pizza, full service at your location.',
    baseRate: 55,
    baseRateFloor: 38,
    baseRateTaperPerGuest: 0.6,
    staffingGuestsPer: 8,
    staffingHourly: 45,
    staffingHours: 4,
    minimumTotal: 850,
    minGuests: 4,
    maxGuests: 16,
    rangeMin: 0.9,
    rangeMax: 1.2,
  },
  holiday: {
    label: 'Small event / holiday',
    description: 'Corporate, milestone, or holiday hosting.',
    baseRate: 70,
    baseRateFloor: 48,
    baseRateTaperPerGuest: 0.4,
    staffingGuestsPer: 15,
    staffingHourly: 40,
    staffingHours: 4,
    minimumTotal: 1200,
    minGuests: 6,
    maxGuests: 75,
    rangeMin: 0.9,
    rangeMax: 1.18,
  },
};

const DEFAULT_DEPOSIT_PERCENT = 0.15;
const EVENT_TYPES = Object.keys(SMALL_EVENT_CONFIG);

// Meal style scales the per-guest food rate. Mirrors backend smallEvents.js.
const MEAL_STYLE_MULTIPLIER = { full: 1.0, between: 0.8, light: 0.6 };
const MEAL_STYLE_OPTIONS = [
  { value: 'full', label: 'Full meal', sub: 'Multi-course, sit-down' },
  { value: 'between', label: 'Somewhere in between', sub: 'Substantial spread' },
  { value: 'light', label: 'Light snacks', sub: 'Bites & grazing' },
];
const DEFAULT_MEAL_STYLE = 'full';

/* ─── Pricing helper ───────────────────────────────────────────────────────── */

// Per-guest food rate tapers down as guest count rises, floored at baseRateFloor.
// Mirrors effectiveBaseRate in backend/api/routes/smallEvents.js.
function effectiveBaseRate(cfg, guests) {
  const over = Math.max(0, guests - (cfg.minGuests || 1));
  const rate = cfg.baseRate - (cfg.baseRateTaperPerGuest || 0) * over;
  return Math.max(cfg.baseRateFloor ?? cfg.baseRate, rate);
}

function calcEstimate(type, guests, mealStyle = DEFAULT_MEAL_STYLE) {
  const cfg = SMALL_EVENT_CONFIG[type];
  if (!cfg || !guests || guests < 1) return null;
  const styleMult = MEAL_STYLE_MULTIPLIER[mealStyle] ?? 1;
  const staffCount = Math.ceil(guests / cfg.staffingGuestsPer);
  const base = effectiveBaseRate(cfg, guests) * guests * styleMult;
  const staffing = staffCount * cfg.staffingHourly * cfg.staffingHours;
  const raw = base + staffing;
  const mid = Math.max(raw, cfg.minimumTotal);
  return {
    min: Math.round(mid * cfg.rangeMin),
    max: Math.round(mid * cfg.rangeMax),
    deposit: Math.round(mid * DEFAULT_DEPOSIT_PERCENT),
  };
}

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

const fmt = (cents) => `$${(cents / 100).toFixed(0)}`;
const fmtDollars = (dollars) => `$${Math.round(dollars).toLocaleString()}`;
const isValidEmail = (v) => /.+@.+\..+/.test((v || '').trim());
const normalizePhone = (v) => (v || '').replace(/\D/g, '').slice(0, 10);
const formatPhone = (v) => {
  const d = normalizePhone(v);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_LABELS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function buildCalendarMonth(year, month) {
  const first = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

function toDateString(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/* ─── State ────────────────────────────────────────────────────────────────── */

const INITIAL_STATE = {
  step: 1,
  type: null,         // 'dinner' | 'pizza' | 'holiday'
  guests: '',
  mealStyle: DEFAULT_MEAL_STYLE, // 'full' | 'between' | 'light'
  date: '',           // 'YYYY-MM-DD'
  location: '',
  kitchenAccess: true,
  dietary: '',
  notes: '',
  name: '',
  email: '',
  phone: '',
  // Result
  estimateId: '',
  sessionToken: '',
  depositUrl: '',
  submitting: false,
  submitStatus: 'idle', // 'idle' | 'saving' | 'success' | 'error'
  submitError: '',
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET': return { ...state, ...action.payload };
    case 'NEXT_STEP': return { ...state, step: state.step + 1 };
    case 'PREV_STEP': return { ...state, step: Math.max(1, state.step - 1) };
    case 'GO_STEP': return { ...state, step: action.step };
    case 'RESET': return { ...INITIAL_STATE, type: action.keepType || null };
    default: return state;
  }
}

/* ─── Component ────────────────────────────────────────────────────────────── */

export default function SmallEventsWizard({ initialType, onClose }) {
  const [state, dispatch] = useReducer(reducer, {
    ...INITIAL_STATE,
    type: initialType || null,
    step: initialType ? 2 : 1,
  });
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const set = useCallback((payload) => dispatch({ type: 'SET', payload }), []);
  const next = useCallback(() => dispatch({ type: 'NEXT_STEP' }), []);
  const prev = useCallback(() => dispatch({ type: 'PREV_STEP' }), []);

  // Load availability when step 3 is reached
  useEffect(() => {
    if (state.step !== 3 || !state.type) return;
    let alive = true;
    setSlotsLoading(true);
    fetch(`/api/small-events/availability?type=${state.type}`)
      .then((r) => r.ok ? r.json() : { slots: [] })
      .then((data) => { if (alive) setSlots(Array.isArray(data.slots) ? data.slots : []); })
      .catch(() => { if (alive) setSlots([]); })
      .finally(() => { if (alive) setSlotsLoading(false); });
    return () => { alive = false; };
  }, [state.step, state.type]);

  const estimate = useMemo(() => {
    const g = parseInt(state.guests, 10);
    return g > 0 ? calcEstimate(state.type, g, state.mealStyle) : null;
  }, [state.type, state.guests, state.mealStyle]);

  const openSlotDates = useMemo(() => new Set(slots.filter((s) => s.status === 'open').map((s) => s.date)), [slots]);

  const sessionToken = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem('smallEventsSessionToken') || '';
  }, []);

  /* ── Submit: save estimate + optionally get deposit link ── */
  const handleSave = useCallback(async ({ withDeposit }) => {
    set({ submitStatus: 'saving', submitError: '' });
    try {
      const g = parseInt(state.guests, 10);
      const body = {
        type: state.type,
        contactName: state.name,
        contactEmail: state.email,
        contactPhone: state.phone,
        guestCount: g,
        mealStyle: state.mealStyle,
        eventDate: state.date || undefined,
        location: state.location,
        kitchenAccess: state.kitchenAccess,
        dietary: state.dietary,
        notes: state.notes,
      };
      const headers = { 'Content-Type': 'application/json' };
      if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`;

      const res = await fetch('/api/small-events/estimates', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Unable to save estimate.');

      const estimateId = data.estimateId || data.id || '';
      const newToken = data.sessionToken || sessionToken;
      if (newToken && typeof window !== 'undefined') {
        window.localStorage.setItem('smallEventsSessionToken', newToken);
      }

      let depositUrl = '';
      if (withDeposit && estimateId) {
        const checkRes = await fetch('/api/small-events/checkout', {
          method: 'POST',
          headers: { ...headers, ...(newToken ? { Authorization: `Bearer ${newToken}` } : {}) },
          body: JSON.stringify({ estimateId }),
        });
        const checkData = await checkRes.json().catch(() => ({}));
        depositUrl = checkData?.paymentLinkUrl || checkData?.url || '';
      }

      set({ estimateId, sessionToken: newToken, depositUrl, submitStatus: 'success' });

      if (depositUrl) {
        window.location.href = depositUrl;
      }
    } catch (err) {
      set({ submitStatus: 'error', submitError: err?.message || 'Something went wrong.' });
    }
  }, [state, sessionToken, set]);

  /* ── Step validation ── */
  const canAdvance = useMemo(() => {
    switch (state.step) {
      case 1: return !!state.type;
      case 2: {
        const g = parseInt(state.guests, 10);
        const cfg = SMALL_EVENT_CONFIG[state.type];
        return g >= (cfg?.minGuests || 1) && (!cfg?.maxGuests || g <= cfg.maxGuests);
      }
      case 3: return !!state.date;
      case 4: return !!state.location.trim();
      case 5: return true; // optional
      case 6: return !!state.name.trim() && isValidEmail(state.email) && normalizePhone(state.phone).length === 10;
      default: return true;
    }
  }, [state]);

  const cfg = SMALL_EVENT_CONFIG[state.type] || {};
  const totalSteps = 7;

  /* ─── Render helpers ─────────────────────────────────────────────────────── */

  const ProgressDots = () => (
    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '1.5rem' }}>
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: i + 1 === state.step ? '#111' : i + 1 < state.step ? '#aaa' : '#e0dbd4',
            transition: 'background 0.2s',
          }}
          aria-hidden="true"
        />
      ))}
    </div>
  );

  const Nav = ({ onNext, nextLabel = 'Continue', nextDisabled, showBack = true, onBack }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginTop: '1.5rem' }}>
      <button
        type="button"
        className="le-checkout-submit"
        style={{ marginTop: 0 }}
        disabled={nextDisabled}
        onClick={onNext || next}
      >
        {nextLabel}
      </button>
      {showBack && state.step > 1 && (
        <button
          type="button"
          onClick={onBack || prev}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.7rem',
            fontFamily: 'ui-monospace, SF Mono, monospace',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#6b655d',
            padding: '0.25rem 0',
            textAlign: 'center',
          }}
        >
          ← Back
        </button>
      )}
    </div>
  );

  const WizardCard = ({ title, subtitle, children }) => (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '0.5rem 0 1rem' }}>
      <ProgressDots />
      {title && (
        <div style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ margin: 0, fontSize: 'clamp(1.2rem, 4vw, 1.6rem)', lineHeight: 1.15, letterSpacing: '-0.025em', color: '#111' }}>
            {title}
          </h2>
          {subtitle && (
            <p style={{ margin: '0.4rem 0 0', fontSize: '0.9rem', color: '#6b655d', lineHeight: 1.5 }}>
              {subtitle}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );

  /* ─── Live estimate bar ──────────────────────────────────────────────────── */
  const EstimateBar = () => {
    if (!estimate) return null;
    return (
      <div className="le-checkout-summary" style={{ marginBottom: '1rem' }}>
        <span className="le-checkout-summary-label">Estimate</span>
        <div style={{ textAlign: 'right' }}>
          <div className="le-checkout-summary-value">
            {fmtDollars(estimate.min)}–{fmtDollars(estimate.max)}
          </div>
          <div className="le-checkout-summary-breakdown">
            ~{fmtDollars(estimate.deposit)} deposit ({Math.round(DEFAULT_DEPOSIT_PERCENT * 100)}%)
          </div>
        </div>
      </div>
    );
  };

  /* ─── Step 1: Event type ─────────────────────────────────────────────────── */
  if (state.step === 1) {
    return (
      <WizardCard title="What are you planning?">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: '#d9d0c6' }}>
          {EVENT_TYPES.map((key) => {
            const c = SMALL_EVENT_CONFIG[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => { set({ type: key }); next(); }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.2rem',
                  padding: '1rem 1.25rem',
                  background: state.type === key ? '#111' : '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => { if (state.type !== key) e.currentTarget.style.background = '#f5f1eb'; }}
                onMouseLeave={(e) => { if (state.type !== key) e.currentTarget.style.background = '#fff'; }}
                aria-pressed={state.type === key}
              >
                <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: state.type === key ? '#fff' : '#111', fontFamily: "ui-monospace, 'SF Mono', monospace" }}>
                  {c.label}
                </span>
                <span style={{ fontSize: '0.8125rem', color: state.type === key ? 'rgba(255,255,255,0.7)' : '#6b655d' }}>
                  {c.description}
                </span>
              </button>
            );
          })}
        </div>
      </WizardCard>
    );
  }

  /* ─── Step 2: Guest count ────────────────────────────────────────────────── */
  if (state.step === 2) {
    const guestVal = parseInt(state.guests, 10);
    const tooFew = guestVal > 0 && cfg.minGuests && guestVal < cfg.minGuests;
    const tooMany = guestVal > 0 && cfg.maxGuests && guestVal > cfg.maxGuests;
    return (
      <WizardCard
        title="How many guests?"
        subtitle={[cfg.minGuests && `Minimum ${cfg.minGuests}`, cfg.maxGuests && `maximum ${cfg.maxGuests}`].filter(Boolean).join(', ')}
      >
        <EstimateBar />
        <div className="le-checkout-field" style={{ marginBottom: '0.25rem' }}>
          <label className="le-checkout-label" htmlFor="wizard-guests">Guest count</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => set({ guests: String(Math.max(cfg.minGuests || 1, guestVal - 1 || 0)) })}
              style={{ width: 40, height: 40, border: '1px solid #d9d0c6', background: '#fff', fontSize: '1.2rem', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              aria-label="Decrease"
            >−</button>
            <input
              id="wizard-guests"
              type="number"
              className="le-checkout-input"
              value={state.guests}
              min={cfg.minGuests || 1}
              max={cfg.maxGuests}
              onChange={(e) => set({ guests: e.target.value })}
              style={{ textAlign: 'center', width: 80, flexShrink: 0 }}
            />
            <button
              type="button"
              onClick={() => set({ guests: String(Math.min(cfg.maxGuests || 999, (guestVal || 0) + 1)) })}
              style={{ width: 40, height: 40, border: '1px solid #d9d0c6', background: '#fff', fontSize: '1.2rem', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              aria-label="Increase"
            >+</button>
          </div>
          {tooFew && <div style={{ fontSize: '0.75rem', color: '#c0392b', marginTop: '0.35rem' }}>Minimum {cfg.minGuests} guests for this event type.</div>}
          {tooMany && <div style={{ fontSize: '0.75rem', color: '#c0392b', marginTop: '0.35rem' }}>Maximum {cfg.maxGuests} guests for this event type.</div>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '1rem' }}>
          <span className="le-checkout-label">How much food?</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: '#d9d0c6', border: '1px solid #d9d0c6' }}>
            {MEAL_STYLE_OPTIONS.map((opt) => {
              const selected = state.mealStyle === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set({ mealStyle: opt.value })}
                  aria-pressed={selected}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem',
                    padding: '0.7rem 0.9rem', background: selected ? '#111' : '#fff', border: 'none',
                    cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s',
                  }}
                >
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: selected ? '#fff' : '#111' }}>{opt.label}</span>
                    <span style={{ fontSize: '0.75rem', color: selected ? 'rgba(255,255,255,0.7)' : '#6b655d' }}>{opt.sub}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <Nav nextDisabled={!canAdvance} />
      </WizardCard>
    );
  }

  /* ─── Step 3: Date ───────────────────────────────────────────────────────── */
  if (state.step === 3) {
    const { year, month } = calMonth;
    const cells = buildCalendarMonth(year, month);
    const today = toDateString(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

    const prevMonth = () => {
      setCalMonth(({ year: y, month: m }) => m === 0 ? { year: y - 1, month: 11 } : { year: y, month: m - 1 });
    };
    const nextMonth = () => {
      setCalMonth(({ year: y, month: m }) => m === 11 ? { year: y + 1, month: 0 } : { year: y, month: m + 1 });
    };

    return (
      <WizardCard title="When?" subtitle="Select from available dates below.">
        <EstimateBar />
        <div style={{ border: '1px solid #e8e8e8', background: '#fff' }}>
          {/* Calendar header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderBottom: '1px solid #e8e8e8' }}>
            <button type="button" onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', padding: '0.25rem 0.5rem', color: '#6b655d' }} aria-label="Previous month">‹</button>
            <span style={{ fontSize: '0.8125rem', fontFamily: 'ui-monospace, SF Mono, monospace', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {MONTH_NAMES[month]} {year}
            </span>
            <button type="button" onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', padding: '0.25rem 0.5rem', color: '#6b655d' }} aria-label="Next month">›</button>
          </div>
          {/* Day labels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: '#f5f1eb', padding: '0.5rem 0.75rem 0.25rem' }}>
            {DAY_LABELS.map((d) => (
              <div key={d} style={{ textAlign: 'center', fontSize: '0.65rem', fontFamily: 'ui-monospace, SF Mono, monospace', fontWeight: 600, letterSpacing: '0.1em', color: '#aaa', textTransform: 'uppercase' }}>{d}</div>
            ))}
          </div>
          {/* Calendar cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: '#e8e8e8', padding: '0 0 0.5rem' }}>
            {cells.map((day, i) => {
              if (!day) return <div key={`blank-${i}`} style={{ background: '#faf8f5', minHeight: 40 }} />;
              const dateStr = toDateString(year, month, day);
              const isPast = dateStr < today;
              const isOpen = openSlotDates.has(dateStr);
              const isSelected = state.date === dateStr;
              const isDisabled = isPast || (!isOpen && !slotsLoading);
              return (
                <button
                  key={dateStr}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => { if (!isDisabled) set({ date: dateStr }); }}
                  aria-label={`${MONTH_NAMES[month]} ${day}${isOpen ? ', available' : ', unavailable'}`}
                  aria-pressed={isSelected}
                  style={{
                    minHeight: 40,
                    border: 'none',
                    cursor: isDisabled ? 'default' : 'pointer',
                    background: isSelected ? '#111' : isOpen ? '#f7faf4' : '#fff',
                    color: isSelected ? '#fff' : isDisabled ? '#ccc' : isOpen ? '#2d5a1b' : '#111',
                    fontSize: '0.8125rem',
                    fontWeight: isOpen ? 600 : 400,
                    fontFamily: isOpen ? 'ui-monospace, SF Mono, monospace' : 'inherit',
                    transition: 'background 0.1s',
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
          {slotsLoading && (
            <div style={{ padding: '0.5rem 1rem', fontSize: '0.7rem', fontFamily: 'ui-monospace, SF Mono, monospace', color: '#6b655d' }}>
              Loading availability…
            </div>
          )}
          {!slotsLoading && slots.length === 0 && (
            <div style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', color: '#6b655d' }}>
              No dates listed yet — <a href="mailto:yum@localeffortfood.com" style={{ color: 'inherit' }}>contact us</a> for availability.
            </div>
          )}
        </div>
        {state.date && (
          <div style={{ marginTop: '0.625rem', fontSize: '0.8125rem', fontFamily: 'ui-monospace, SF Mono, monospace', color: '#2d5a1b' }}>
            ✓ {new Date(state.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        )}
        <Nav nextDisabled={!canAdvance} />
      </WizardCard>
    );
  }

  /* ─── Step 4: Location ───────────────────────────────────────────────────── */
  if (state.step === 4) {
    return (
      <WizardCard title="Where is the event?" subtitle="Approximate address or neighborhood is fine.">
        <EstimateBar />
        <div className="le-checkout-field" style={{ marginBottom: '0.875rem' }}>
          <label className="le-checkout-label" htmlFor="wizard-location">Location / address</label>
          <input
            id="wizard-location"
            className="le-checkout-input"
            value={state.location}
            onChange={(e) => set({ location: e.target.value })}
            placeholder="e.g. 55113, Saint Paul, my home in Roseville"
            autoComplete="street-address"
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <span className="le-checkout-label">Kitchen access</span>
          <div className="le-checkout-pills" role="group" aria-label="Kitchen access">
            <button
              type="button"
              className={`le-checkout-pill${state.kitchenAccess ? ' is-selected' : ''}`}
              onClick={() => set({ kitchenAccess: true })}
              aria-pressed={state.kitchenAccess}
            >
              Full kitchen
              <span className="le-checkout-pill-sub">stove, oven, sink</span>
            </button>
            <button
              type="button"
              className={`le-checkout-pill${!state.kitchenAccess ? ' is-selected' : ''}`}
              onClick={() => set({ kitchenAccess: false })}
              aria-pressed={!state.kitchenAccess}
            >
              Limited / none
              <span className="le-checkout-pill-sub">tent, outdoor, etc.</span>
            </button>
          </div>
        </div>
        <Nav nextDisabled={!canAdvance} />
      </WizardCard>
    );
  }

  /* ─── Step 5: Dietary / preferences (skippable) ─────────────────────────── */
  if (state.step === 5) {
    const COMMON = ['Gluten-free', 'Dairy-free', 'Nut allergy', 'Vegetarian', 'Vegan', 'Kosher', 'Halal'];
    const selectedTags = state.dietary
      ? state.dietary.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    const toggleTag = (tag) => {
      const next = selectedTags.includes(tag)
        ? selectedTags.filter((t) => t !== tag)
        : [...selectedTags, tag];
      set({ dietary: next.join(', ') });
    };
    return (
      <WizardCard title="Any dietary needs?" subtitle="Optional — skip if nothing applies.">
        <EstimateBar />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.875rem' }}>
          {COMMON.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              aria-pressed={selectedTags.includes(tag)}
              style={{
                padding: '0.375rem 0.75rem',
                border: `1px solid ${selectedTags.includes(tag) ? '#111' : '#d9d0c6'}`,
                background: selectedTags.includes(tag) ? '#111' : '#fff',
                color: selectedTags.includes(tag) ? '#fff' : '#4a453f',
                fontSize: '0.8125rem',
                cursor: 'pointer',
                borderRadius: 0,
                fontFamily: 'inherit',
                transition: 'background 0.1s, border-color 0.1s',
              }}
            >
              {tag}
            </button>
          ))}
        </div>
        <div className="le-checkout-field">
          <label className="le-checkout-label" htmlFor="wizard-notes">Additional notes or preferences</label>
          <textarea
            id="wizard-notes"
            className="le-checkout-textarea"
            rows={3}
            value={state.notes}
            onChange={(e) => set({ notes: e.target.value })}
            placeholder="Allergies, menu ideas, vibe, anything else we should know"
          />
        </div>
        <Nav nextLabel="Continue" nextDisabled={false} />
      </WizardCard>
    );
  }

  /* ─── Step 6: Contact ────────────────────────────────────────────────────── */
  if (state.step === 6) {
    return (
      <WizardCard title="How do we reach you?">
        <EstimateBar />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '0.25rem' }}>
          <div className="le-checkout-field">
            <label className="le-checkout-label" htmlFor="wizard-name">Name</label>
            <input id="wizard-name" className="le-checkout-input" value={state.name} onChange={(e) => set({ name: e.target.value })} autoComplete="name" required />
          </div>
          <div className="le-checkout-field">
            <label className="le-checkout-label" htmlFor="wizard-email">Email</label>
            <input id="wizard-email" type="email" className="le-checkout-input" value={state.email} onChange={(e) => set({ email: e.target.value })} autoComplete="email" required />
          </div>
          <div className="le-checkout-field">
            <label className="le-checkout-label" htmlFor="wizard-phone">Phone</label>
            <input id="wizard-phone" type="tel" className="le-checkout-input" value={state.phone} onChange={(e) => set({ phone: formatPhone(e.target.value) })} autoComplete="tel" required />
          </div>
        </div>
        <Nav nextDisabled={!canAdvance} nextLabel="Review summary →" />
      </WizardCard>
    );
  }

  /* ─── Step 7: Summary + deposit ─────────────────────────────────────────── */
  const dateLabel = state.date
    ? new Date(state.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : 'No date selected';

  if (state.submitStatus === 'success' && !state.depositUrl) {
    return (
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '1rem 0' }}>
        <div className="le-checkout-success">
          <div className="le-checkout-success-title">Estimate saved</div>
          <p className="le-checkout-success-copy">
            We've saved your details. We'll follow up at {state.email} to confirm availability and next steps.
          </p>
          <div className="le-checkout-success-meta">{state.estimateId && `Estimate ID: ${state.estimateId}`}</div>
        </div>
        {onClose && (
          <button type="button" className="le-checkout-submit" style={{ marginTop: '1rem' }} onClick={onClose}>
            Close
          </button>
        )}
      </div>
    );
  }

  return (
    <WizardCard title="Here's your estimate">
      {/* Summary card */}
      <div style={{ border: '1px solid #e8e8e8', marginBottom: '1.25rem' }}>
        {[
          ['Event', SMALL_EVENT_CONFIG[state.type]?.label],
          ['Date', dateLabel],
          ['Guests', state.guests],
          ['Food', MEAL_STYLE_OPTIONS.find((o) => o.value === state.mealStyle)?.label],
          ['Location', state.location || '—'],
          ['Kitchen', state.kitchenAccess ? 'Full access' : 'Limited'],
          state.dietary ? ['Dietary', state.dietary] : null,
        ].filter(Boolean).map(([label, value]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.625rem 1rem', borderBottom: '1px solid #f0ece5', gap: '1rem' }}>
            <span style={{ fontSize: '0.7rem', fontFamily: 'ui-monospace, SF Mono, monospace', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#756c61' }}>{label}</span>
            <span style={{ fontSize: '0.8125rem', color: '#111', textAlign: 'right' }}>{value}</span>
          </div>
        ))}
      </div>

      {estimate && (
        <div className="le-checkout-summary" style={{ marginBottom: '1.25rem' }}>
          <div>
            <div className="le-checkout-summary-label">Estimated total</div>
            <div style={{ fontSize: '0.7rem', color: '#6b655d', marginTop: '0.2rem' }}>Finalized after consultation</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="le-checkout-summary-value">{fmtDollars(estimate.min)}–{fmtDollars(estimate.max)}</div>
            <div className="le-checkout-summary-breakdown">Deposit: ~{fmtDollars(estimate.deposit)}</div>
          </div>
        </div>
      )}

      {state.submitError && <div className="le-checkout-error" style={{ marginBottom: '0.75rem' }}>{state.submitError}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        <button
          type="button"
          className="le-checkout-submit"
          style={{ marginTop: 0 }}
          disabled={state.submitStatus === 'saving'}
          onClick={() => handleSave({ withDeposit: true })}
        >
          {state.submitStatus === 'saving' ? 'Working…' : `Pay deposit — ~${fmtDollars(estimate?.deposit ?? 0)}`}
        </button>
        <button
          type="button"
          onClick={() => handleSave({ withDeposit: false })}
          disabled={state.submitStatus === 'saving'}
          style={{
            background: 'none', border: '1px solid #d9d0c6', cursor: 'pointer',
            padding: '0.75rem 1rem', fontSize: '0.75rem', fontFamily: 'ui-monospace, SF Mono, monospace',
            letterSpacing: '0.14em', textTransform: 'uppercase', color: '#4a453f',
            transition: 'border-color 0.12s',
          }}
        >
          Save and finish later
        </button>
      </div>
      <p className="le-checkout-footnote" style={{ marginTop: '0.75rem' }}>
        Deposit holds your date for 24 hours. We'll confirm the quote by email before any charge.
      </p>
      <button
        type="button"
        onClick={prev}
        style={{ display: 'block', margin: '0.5rem auto 0', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem', fontFamily: 'ui-monospace, SF Mono, monospace', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b655d' }}
      >
        ← Edit
      </button>
    </WizardCard>
  );
}
