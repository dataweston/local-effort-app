import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { useSquareCard } from '../hooks/useSquareCard';
import { getOrCreateCheckoutAttemptId, clearCheckoutAttemptId } from '../lib/checkoutAttemptId';
import '../styles/fullpage-demo-theme.css';
import '../styles/weekly-order.css';

const DEFAULT_RULES = {
  requiredEntrees: 5,
  addOnMax: 3,
  maxTotalItems: 12,
  allowDuplicates: true,
};

const formatCurrency = (cents) => {
  const safe = Number.isFinite(cents) ? cents : 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(safe / 100);
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const formatDateRange = (startDateStr) => {
  if (!startDateStr) return '';
  const start = new Date(startDateStr);
  if (Number.isNaN(start.getTime())) return '';
  const end = addDays(start, 6);
  const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endLabel = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${startLabel} - ${endLabel}`;
};

const formatCutoff = (cutoffAt) => {
  if (!cutoffAt) return '';
  const cutoff = new Date(cutoffAt);
  if (Number.isNaN(cutoff.getTime())) return '';
  return cutoff.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const parsePlanRules = (raw) => {
  let parsed = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch (_err) {
      parsed = null;
    }
  }
  const pickNumber = (value, fallback) => {
    const n = typeof value === 'string' ? Number(value) : value;
    return Number.isFinite(n) ? n : fallback;
  };
  const sectionRules = {};
  const rawSectionRules = parsed?.sectionRules || parsed?.sections;
  if (Array.isArray(rawSectionRules)) {
    rawSectionRules.forEach((entry) => {
      if (!entry?.slug) return;
      sectionRules[entry.slug] = {
        min: pickNumber(entry.min, 0),
        max: pickNumber(entry.max, 0),
        label: entry.label || entry.slug,
      };
    });
  } else if (rawSectionRules && typeof rawSectionRules === 'object') {
    Object.entries(rawSectionRules).forEach(([slug, entry]) => {
      sectionRules[slug] = {
        min: pickNumber(entry?.min, 0),
        max: pickNumber(entry?.max, 0),
        label: entry?.label || slug,
      };
    });
  }
  return {
    requiredEntrees: pickNumber(parsed?.requiredEntrees, DEFAULT_RULES.requiredEntrees),
    addOnMax: pickNumber(parsed?.addOnMax, DEFAULT_RULES.addOnMax),
    maxTotalItems: pickNumber(parsed?.maxTotalItems, DEFAULT_RULES.maxTotalItems),
    allowDuplicates: parsed?.allowDuplicates !== false,
    sectionRules,
  };
};

const coerceRole = (value, isAdmin) => {
  if (isAdmin) return 'admin';
  const role = (value || '').toString().toLowerCase();
  if (role === 'subscriber' || role === 'member') return role;
  return 'member';
};

const getNextMonday = (anchor = new Date()) => {
  const day = anchor.getDay();
  const daysUntilMonday = (8 - day) % 7 || 7;
  return addDays(anchor, daysUntilMonday);
};

const buildFallbackData = (slug) => {
  const weekStart = getNextMonday();
  const cutoffAt = new Date(weekStart);
  cutoffAt.setDate(cutoffAt.getDate() - 2);
  cutoffAt.setHours(20, 0, 0, 0);
  const weekStartIso = weekStart.toISOString().slice(0, 10);
  return {
    menuWeek: {
      id: `menu-${weekStartIso}`,
      weekStart: weekStartIso,
      cutoffAt: cutoffAt.toISOString(),
      status: 'published',
    },
    customer: {
      id: 'customer-sample',
      slug: slug || 'sample-member',
      name: 'Local Effort Weekly',
      priceTierDefault: 'subscriber',
      planRulesJson: {
        requiredEntrees: 5,
        addOnMax: 4,
        maxTotalItems: 12,
        allowDuplicates: true,
      },
      priceOverrides: {
        'dish-4': 1100,
      },
    },
    menuItems: [
      {
        id: 'mwi-1',
        dishId: 'dish-1',
        isVisible: true,
        isAddon: false,
        sortOrder: 1,
        capacityLimit: 24,
        remaining: 8,
        canView: true,
        dish: {
          title: 'Miso-roasted salmon',
          description: 'Ginger glaze, broccolini, sesame brown rice.',
          tags: ['high protein', 'gluten-free'],
          allergens: ['fish', 'soy', 'sesame'],
          status: 'approved',
        },
        prices: { subscriber: 1600, member: 1850 },
        reviews: [
          { id: 'r1', author: 'Jana', rating: 5, comment: 'Perfect reheated, still flaky.' },
          { id: 'r2', author: 'Sam', rating: 4, comment: 'Sauce is addictive.' },
        ],
      },
      {
        id: 'mwi-2',
        dishId: 'dish-2',
        isVisible: true,
        isAddon: false,
        sortOrder: 2,
        capacityLimit: 30,
        remaining: 12,
        canView: true,
        dish: {
          title: 'Harissa chicken bowl',
          description: 'Roasted chicken thighs, lemon couscous, charred carrots.',
          tags: ['medium spice'],
          allergens: ['wheat'],
          status: 'approved',
        },
        prices: { subscriber: 1450, member: 1700 },
        reviews: [
          { id: 'r3', author: 'Priya', rating: 5, comment: 'Bold and balanced.' },
        ],
      },
      {
        id: 'mwi-3',
        dishId: 'dish-3',
        isVisible: true,
        isAddon: false,
        sortOrder: 3,
        capacityLimit: 20,
        remaining: 2,
        canView: true,
        dish: {
          title: 'Mushroom ragu rigatoni',
          description: 'Wild mushrooms, parmesan, fresh herbs.',
          tags: ['vegetarian'],
          allergens: ['dairy', 'wheat'],
          status: 'approved',
        },
        prices: { subscriber: 1350, member: 1600 },
        reviews: [
          { id: 'r4', author: 'Elena', rating: 4, comment: 'Comforting and creamy.' },
        ],
      },
      {
        id: 'mwi-4',
        dishId: 'dish-4',
        isVisible: true,
        isAddon: false,
        sortOrder: 4,
        capacityLimit: 16,
        remaining: 0,
        canView: true,
        dish: {
          title: 'Tamarind short rib',
          description: 'Sticky glazed short rib, jasmine rice, bok choy.',
          tags: ['chef favorite'],
          allergens: ['soy'],
          status: 'approved',
        },
        prices: { subscriber: 1750, member: 2100 },
        reviews: [
          { id: 'r5', author: 'Mark', rating: 5, comment: 'Worth every penny.' },
        ],
      },
      {
        id: 'mwi-5',
        dishId: 'dish-5',
        isVisible: true,
        isAddon: true,
        sortOrder: 6,
        capacityLimit: 40,
        remaining: 26,
        canView: true,
        dish: {
          title: 'Citrus kale crunch',
          description: 'Kale, mandarins, pumpkin seeds, lemon vinaigrette.',
          tags: ['vegan', 'gluten-free'],
          allergens: ['seed'],
          status: 'approved',
        },
        prices: { subscriber: 700, member: 850 },
        reviews: [
          { id: 'r6', author: 'Casey', rating: 5, comment: 'Bright and fresh.' },
        ],
      },
      {
        id: 'mwi-6',
        dishId: 'dish-6',
        isVisible: true,
        isAddon: true,
        sortOrder: 7,
        capacityLimit: 32,
        remaining: 18,
        canView: true,
        dish: {
          title: 'Coconut chia pudding',
          description: 'Overnight chia, maple, toasted coconut.',
          tags: ['breakfast', 'gluten-free'],
          allergens: ['coconut'],
          status: 'approved',
        },
        prices: { subscriber: 550, member: 700 },
        reviews: [
          { id: 'r7', author: 'Liam', rating: 4, comment: 'Great grab-and-go.' },
        ],
      },
    ],
    orderHistory: [
      {
        id: 'ord-previous',
        weekStart: addDays(weekStart, -7).toISOString().slice(0, 10),
        status: 'paid',
        totalCents: 9200,
        submittedAt: addDays(weekStart, -9).toISOString(),
        items: [
          { dish: 'Miso-roasted salmon', quantity: 2 },
          { dish: 'Harissa chicken bowl', quantity: 2 },
          { dish: 'Citrus kale crunch', quantity: 1 },
        ],
      },
    ],
    currentOrder: null,
  };
};

const WeeklyOrderPage = () => {
  const { customerSlug } = useParams();
  const {
    user,
    accessToken,
    loading: authLoading,
    isAdmin,
    signInWithGoogle,
    signOut,
  } = useSupabaseAuth();
  const [data, setData] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState('');
  const [quantities, setQuantities] = useState({});
  const [selectedDish, setSelectedDish] = useState(null);
  const [showAddOns, setShowAddOns] = useState(true);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState('idle');
  const [checkoutError, setCheckoutError] = useState('');
  const [tierOverride, setTierOverride] = useState('');

  const userMeta = user?.user_metadata || {};
  const userRole = coerceRole(userMeta.role || userMeta.tier, isAdmin);
  const tier = tierOverride || (userRole === 'subscriber' ? 'subscriber' : 'member');
  const userSlug = userMeta.customerSlug || userMeta.customer_slug || '';
  const effectiveSlug = customerSlug || userSlug || 'weekly-order';
  const hasSlugAccess = isAdmin || !customerSlug || customerSlug === userSlug;

  const loadData = useCallback(async () => {
    if (!user || !hasSlugAccess) return;
    setLoadingData(true);
    setError('');
    try {
      const query = new URLSearchParams({
        customerSlug: effectiveSlug,
        tier,
      }).toString();
      const response = await fetch(`/api/weekly-order/active?${query}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (!response.ok) {
        throw new Error('Unable to load weekly menu.');
      }
      const payload = await response.json();
      setData(payload);
    } catch (err) {
      console.warn('[weekly-order] fallback to sample data', err);
      setData(buildFallbackData(effectiveSlug));
      setError('Live menu data is unavailable. Showing sample weekly menu.');
    } finally {
      setLoadingData(false);
    }
  }, [accessToken, effectiveSlug, hasSlugAccess, tier, user]);

  useEffect(() => {
    if (!user || !hasSlugAccess) return;
    loadData();
  }, [loadData, hasSlugAccess, user]);

  useEffect(() => {
    if (!data?.menuWeek?.id) return;
    if (data?.currentOrder?.status === 'draft') {
      const next = {};
      data.currentOrder.items?.forEach((item) => {
        if (item?.dishId) {
          next[item.dishId] = item.quantity;
        }
      });
      setQuantities(next);
    } else {
      setQuantities({});
    }
  }, [data?.menuWeek?.id]);

  const planRules = useMemo(
    () => parsePlanRules(data?.customer?.planRulesJson),
    [data?.customer?.planRulesJson]
  );

  const pricedMenuItems = useMemo(() => {
    const items = Array.isArray(data?.menuItems) ? data.menuItems : [];
    return items
      .filter((item) => item.isVisible && item.canView !== false)
      .map((item) => {
        const basePrice = item.prices?.[tier];
        const priceCents = Number.isFinite(item.priceCents) ? item.priceCents : basePrice ?? null;
        return {
          ...item,
          priceCents,
          isSoldOut: Number.isFinite(item.remaining) ? item.remaining <= 0 : false,
        };
      })
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [data?.menuItems, tier]);

  const sections = useMemo(() => {
    const items = pricedMenuItems;
    const byDish = new Map(items.map((item) => [item.dishId, item]));
    if (Array.isArray(data?.sections) && data.sections.length) {
      return data.sections
        .map((section) => ({
          ...section,
          items: (section.items || [])
            .map((item) => byDish.get(item.dishId) || item)
            .filter(Boolean),
        }))
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    }
    const map = new Map();
    items.forEach((item) => {
      const slug = item.section?.slug || (item.isAddon ? 'add-ons' : 'entrees');
      const title = item.section?.title || (item.isAddon ? 'Add-ons' : 'Entrees');
      if (!map.has(slug)) {
        map.set(slug, { id: slug, slug, title, sortOrder: 0, items: [] });
      }
      map.get(slug).items.push(item);
    });
    return Array.from(map.values());
  }, [data?.sections, pricedMenuItems]);

  const lineItems = useMemo(() => {
    return pricedMenuItems
      .map((item) => ({
        ...item,
        quantity: quantities[item.dishId] || 0,
      }))
      .filter((item) => item.quantity > 0);
  }, [pricedMenuItems, quantities]);

  const counts = useMemo(() => {
    return lineItems.reduce(
      (acc, item) => {
        if (item.isAddon) {
          acc.addOns += item.quantity;
        } else {
          acc.entrees += item.quantity;
        }
        acc.total += item.quantity;
        const slug = item.section?.slug || (item.isAddon ? 'add-ons' : 'entrees');
        acc.bySection[slug] = (acc.bySection[slug] || 0) + item.quantity;
        return acc;
      },
      { entrees: 0, addOns: 0, total: 0, bySection: {} }
    );
  }, [lineItems]);

  const basePriceCents = Number(data?.plan?.basePriceCents) || 0;
  const deliveryFeeCents = Number(data?.plan?.deliveryFeeCents) || 0;
  const itemsSubtotalCents = lineItems.reduce(
    (sum, item) => sum + (item.priceCents || 0) * item.quantity,
    0
  );
  const subtotalCents = basePriceCents + deliveryFeeCents + itemsSubtotalCents;

  const cutoffPassed = data?.menuWeek?.cutoffAt
    ? new Date(data.menuWeek.cutoffAt) < new Date()
    : false;
  const hasOrderLocked = !!data?.currentOrder && data.currentOrder.status !== 'draft';
  const sectionEntries = Object.entries(planRules.sectionRules || {});
  const sectionChecks = sectionEntries.map(([slug, rule]) => {
    const count = counts.bySection[slug] || 0;
    const min = Number(rule.min) || 0;
    const max = Number(rule.max) || 0;
    const meetsMin = !min || count >= min;
    const meetsMax = !max || count <= max;
    return {
      slug,
      label: rule.label || slug,
      count,
      min,
      max,
      isValid: meetsMin && meetsMax,
    };
  });
  const sectionsValid = sectionChecks.length ? sectionChecks.every((check) => check.isValid) : true;
  const minEntreesMet = counts.entrees >= planRules.requiredEntrees;
  const addOnWithinLimit = counts.addOns <= planRules.addOnMax;
  const totalWithinLimit = counts.total <= planRules.maxTotalItems;
  const hasSelections = counts.total > 0;
  const meetsEntreeRules = sectionChecks.length ? sectionsValid : minEntreesMet;
  const canCheckout =
    hasSelections &&
    meetsEntreeRules &&
    addOnWithinLimit &&
    totalWithinLimit &&
    !cutoffPassed &&
    !hasOrderLocked &&
    checkoutStatus !== 'processing';

  const updateQuantity = (dishId, next) => {
    setQuantities((prev) => ({ ...prev, [dishId]: Math.max(0, next) }));
  };

  const handleIncrement = (item) => {
    if (hasOrderLocked || cutoffPassed) return;
    if (!planRules.allowDuplicates && (quantities[item.dishId] || 0) >= 1) return;
    if (item.isSoldOut) return;
    const nextTotal = counts.total + 1;
    if (nextTotal > planRules.maxTotalItems) return;
    if (item.isAddon && counts.addOns + 1 > planRules.addOnMax) return;
    const sectionSlug = item.section?.slug || (item.isAddon ? 'add-ons' : 'entrees');
    const sectionRule = planRules.sectionRules?.[sectionSlug];
    if (sectionRule?.max) {
      const nextSectionCount = (counts.bySection?.[sectionSlug] || 0) + 1;
      if (nextSectionCount > sectionRule.max) return;
    }
    updateQuantity(item.dishId, (quantities[item.dishId] || 0) + 1);
  };

  const handleDecrement = (item) => {
    updateQuantity(item.dishId, (quantities[item.dishId] || 0) - 1);
  };

  const resetCheckoutState = () => {
    setCheckoutStatus('idle');
    setCheckoutError('');
  };

  const { cardLoaded, error: cardError, loadingScript, tokenize, verifyBuyer, reset } = useSquareCard(
    '#weekly-order-card-container',
    checkoutOpen,
    [checkoutOpen]
  );
  const checkoutAttemptRef = useRef('');
  const [fallbackLink, setFallbackLink] = useState('');
  const [fallbackStatus, setFallbackStatus] = useState({ loading: false, error: '' });
  const attemptStorageKey = 'le:checkoutAttempt:weekly-order';

  const resolveCheckoutAttemptId = useCallback(() => {
    if (checkoutAttemptRef.current) return checkoutAttemptRef.current;
    const next = getOrCreateCheckoutAttemptId(attemptStorageKey);
    checkoutAttemptRef.current = next;
    return next;
  }, []);

  const clearCheckoutAttempt = useCallback(() => {
    checkoutAttemptRef.current = '';
    clearCheckoutAttemptId(attemptStorageKey);
  }, []);

  const buildHostedCheckout = useCallback(async () => {
    if (fallbackStatus.loading) return;
    setFallbackStatus({ loading: true, error: '' });
    try {
      const response = await fetch('/api/weekly-order/checkout-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          menuWeekId: data?.menuWeek?.id,
          customerId: data?.customer?.id,
          customerSlug: data?.customer?.slug,
          tier,
          rules: planRules,
          items: lineItems.map((item) => ({
            dishId: item.dishId,
            title: item.dish?.title,
            quantity: item.quantity,
            unitPriceCents: item.priceCents,
            isAddon: item.isAddon,
            includedInPlan: item.includedInPlan,
            sectionSlug: item.section?.slug || (item.isAddon ? 'add-ons' : 'entrees'),
          })),
          totalsCents: subtotalCents,
          basePriceCents,
          deliveryFeeCents,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.error || 'Unable to create hosted checkout.');
      }
      setFallbackLink(result?.url || '');
      setFallbackStatus({ loading: false, error: '' });
    } catch (err) {
      setFallbackStatus({ loading: false, error: err?.message || 'Unable to create hosted checkout.' });
    }
  }, [accessToken, fallbackStatus.loading, data, tier, planRules, lineItems, subtotalCents, basePriceCents, deliveryFeeCents]);

  const handleCheckout = async () => {
    if (!canCheckout) return;
    setCheckoutStatus('processing');
    setCheckoutError('');
    try {
      const token = await tokenize();
      const verificationDetails = {
        amount: (subtotalCents / 100).toFixed(2),
        currencyCode: 'USD',
        intent: 'CHARGE',
        billingContact: {
          givenName: user?.displayName?.split(' ')?.[0] || undefined,
          familyName: user?.displayName?.split(' ')?.slice(1).join(' ') || undefined,
          email: user?.email || undefined,
          phone: user?.phoneNumber || undefined,
          countryCode: 'US',
        },
      };
      const verificationToken = await verifyBuyer(token, verificationDetails);
      const checkoutAttemptId = resolveCheckoutAttemptId();
      const response = await fetch('/api/weekly-order/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          menuWeekId: data?.menuWeek?.id,
          customerId: data?.customer?.id,
          customerSlug: data?.customer?.slug,
          tier,
          rules: planRules,
          items: lineItems.map((item) => ({
            dishId: item.dishId,
            title: item.dish?.title,
            quantity: item.quantity,
            unitPriceCents: item.priceCents,
            isAddon: item.isAddon,
            includedInPlan: item.includedInPlan,
            sectionSlug: item.section?.slug || (item.isAddon ? 'add-ons' : 'entrees'),
          })),
          totalsCents: subtotalCents,
          basePriceCents,
          deliveryFeeCents,
          paymentToken: token,
          verificationToken,
          checkoutAttemptId,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || 'Checkout failed.');
      }
      setCheckoutStatus('success');
      clearCheckoutAttempt();
      reset();
      loadData();
    } catch (err) {
      console.error('[weekly-order] checkout error', err);
      setCheckoutStatus('error');
      setCheckoutError(err?.message || 'Checkout failed. Please try again.');
    }
  };

  if (authLoading) {
    return (
      <div className="weekly-order fullpage-demo-scope">
        <div className="weekly-order-shell">
          <div className="weekly-order-loading">Loading weekly menu...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="weekly-order fullpage-demo-scope">
        <div className="weekly-order-shell">
          <Card className="weekly-order-auth-card">
            <CardHeader>
              <CardTitle>Sign in to build your weekly order</CardTitle>
              <CardDescription>
                Weekly ordering is available to members and subscribers. Sign in to see your menu.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={signInWithGoogle}>Sign in with Google</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loadingData) {
    return (
      <div className="weekly-order fullpage-demo-scope">
        <div className="weekly-order-shell">
          <div className="weekly-order-loading">Loading weekly menu...</div>
        </div>
      </div>
    );
  }

  if (!hasSlugAccess) {
    return (
      <div className="weekly-order fullpage-demo-scope">
        <div className="weekly-order-shell">
          <Card className="weekly-order-auth-card">
            <CardHeader>
              <CardTitle>Access restricted</CardTitle>
              <CardDescription>
                This weekly order page is assigned to another customer. Switch accounts or ask an admin for access.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" onClick={signOut}>Sign out</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="weekly-order fullpage-demo-scope">
      <div className="weekly-order-shell container-page">
        <header className="weekly-order-hero">
          <div>
            <span className="weekly-order-eyebrow">Weekly order</span>
            <h1 className="weekly-order-title">{formatDateRange(data?.menuWeek?.weekStart)}</h1>
            <p className="weekly-order-subtitle">
              Cutoff: {formatCutoff(data?.menuWeek?.cutoffAt) || 'TBD'}
            </p>
            {error && <p className="weekly-order-alert">{error}</p>}
          </div>
          <div className="weekly-order-meta">
            <div className="weekly-order-meta-row">
              <span className="weekly-order-chip">{tier === 'subscriber' ? 'Subscriber pricing' : 'Member pricing'}</span>
              {isAdmin && (
                <div className="weekly-order-tier-toggle">
                  <button
                    type="button"
                    className={tier === 'subscriber' ? 'is-active' : ''}
                    onClick={() => setTierOverride('subscriber')}
                  >
                    Subscriber view
                  </button>
                  <button
                    type="button"
                    className={tier === 'member' ? 'is-active' : ''}
                    onClick={() => setTierOverride('member')}
                  >
                    Member view
                  </button>
                </div>
              )}
            </div>
            <div className="weekly-order-meta-row">
              <span className="weekly-order-customer">{data?.customer?.name || 'Weekly Menu'}</span>
              <Button variant="outline" size="sm" onClick={signOut}>Sign out</Button>
            </div>
          </div>
        </header>

        <section className="weekly-order-layout">
          <div className="weekly-order-main">
            {sections.map((section) => {
              const sectionRule = planRules.sectionRules?.[section.slug];
              const count = counts.bySection?.[section.slug] || 0;
              const isAddonSection = section.items?.every((item) => item.isAddon);
              const rangeLabel = sectionRule
                ? sectionRule.min && sectionRule.max && sectionRule.min !== sectionRule.max
                  ? `${sectionRule.min}-${sectionRule.max}`
                  : `${sectionRule.min || sectionRule.max || 0}`
                : null;
              const showSection = !isAddonSection || showAddOns;
              return (
                <section key={section.id || section.slug} className="weekly-order-section">
                  <div className="weekly-order-section-header">
                    <div>
                      <h2>{section.title}</h2>
                      {sectionRule ? (
                        <p>Select {rangeLabel} from this section.</p>
                      ) : (
                        <p>{isAddonSection ? `Optional add-ons. Add up to ${planRules.addOnMax}.` : 'Choose your favorites for the week.'}</p>
                      )}
                    </div>
                    <div className="weekly-order-rule-pill">
                      {sectionRule ? `${count}/${rangeLabel}` : `${count}`}
                    </div>
                    {isAddonSection && (
                      <button
                        type="button"
                        className="weekly-order-toggle"
                        onClick={() => setShowAddOns((prev) => !prev)}
                      >
                        {showAddOns ? 'Hide add-ons' : 'Show add-ons'}
                      </button>
                    )}
                  </div>
                  {showSection && (
                    <div className="weekly-order-grid">
                      {(section.items || []).map((item) => (
                        <MenuCard
                          key={item.id}
                          item={item}
                          quantity={quantities[item.dishId] || 0}
                          onIncrement={() => handleIncrement(item)}
                          onDecrement={() => handleDecrement(item)}
                          onDetails={() => setSelectedDish(item)}
                          planRules={planRules}
                          counts={counts}
                          disabled={hasOrderLocked || cutoffPassed}
                        />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}

            {data?.orderHistory?.length ? (
              <section className="weekly-order-section">
                <div className="weekly-order-section-header">
                  <div>
                    <h2>Recent orders</h2>
                    <p>Quick look at your last deliveries.</p>
                  </div>
                </div>
                <div className="weekly-order-history">
                  {data.orderHistory.map((order) => (
                    <div key={order.id} className="weekly-order-history-card">
                      <div>
                        <div className="weekly-order-history-title">
                          Week of {formatDateRange(order.weekStart)}
                        </div>
                        <div className="weekly-order-history-subtitle">
                          {order.status} - {formatCurrency(order.totalCents)}
                        </div>
                      </div>
                      <div className="weekly-order-history-items">
                        {order.items?.map((item) => (
                          <span key={`${order.id}-${item.dish}`} className="weekly-order-history-chip">
                            {item.quantity}x {item.dish}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="weekly-order-sidebar">
            <SummaryPanel
              counts={counts}
              planRules={planRules}
              sectionChecks={sectionChecks}
              lineItems={lineItems}
              subtotalCents={subtotalCents}
              basePriceCents={basePriceCents}
              deliveryFeeCents={deliveryFeeCents}
              planNotes={data?.plan?.notes}
              cutoffPassed={cutoffPassed}
              hasOrderLocked={hasOrderLocked}
              canCheckout={canCheckout}
              onCheckout={() => {
                resetCheckoutState();
                setCheckoutOpen(true);
              }}
            />
          </aside>
        </section>

        <div className="weekly-order-summary-bar">
          <SummaryPanel
            counts={counts}
            planRules={planRules}
            sectionChecks={sectionChecks}
            lineItems={lineItems}
            subtotalCents={subtotalCents}
            basePriceCents={basePriceCents}
            deliveryFeeCents={deliveryFeeCents}
            planNotes={data?.plan?.notes}
            cutoffPassed={cutoffPassed}
            hasOrderLocked={hasOrderLocked}
            canCheckout={canCheckout}
            compact
            onCheckout={() => {
              resetCheckoutState();
              setCheckoutOpen(true);
            }}
          />
        </div>
      </div>

      <Dialog open={Boolean(selectedDish)} onOpenChange={(open) => !open && setSelectedDish(null)}>
        <DialogContent className="fullpage-demo-scope weekly-order-dialog sm:max-w-[640px]">
          {selectedDish && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedDish.dish?.title}</DialogTitle>
                <DialogDescription>
                  {selectedDish.dish?.description}
                </DialogDescription>
              </DialogHeader>
              <div className="weekly-order-dialog-body">
                <div className="weekly-order-dialog-meta">
                  <span className="weekly-order-chip">
                    {selectedDish.isAddon ? 'Add-on' : 'Entree'}
                  </span>
                  <span className="weekly-order-chip">
                    {selectedDish.includedInPlan
                      ? 'Included'
                      : Number.isFinite(selectedDish.priceCents)
                        ? formatCurrency(selectedDish.priceCents)
                        : 'Price TBD'}
                  </span>
                  {selectedDish.isSoldOut && <span className="weekly-order-chip">Sold out</span>}
                </div>
                <div className="weekly-order-tag-row">
                  {selectedDish.dish?.tags?.map((tag) => (
                    <span key={tag} className="weekly-order-tag">{tag}</span>
                  ))}
                </div>
                {selectedDish.dish?.allergens?.length ? (
                  <p className="weekly-order-allergen">
                    Allergens: {selectedDish.dish.allergens.join(', ')}
                  </p>
                ) : null}
                {selectedDish.reviews?.length ? (
                  <div className="weekly-order-reviews">
                    {selectedDish.reviews.map((review) => (
                      <div key={review.id} className="weekly-order-review">
                        <div className="weekly-order-review-header">
                          <span>{review.author}</span>
                          <span>{'*'.repeat(review.rating)}</span>
                        </div>
                        <p>{review.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="weekly-order-dialog-actions">
                  <QuantityControl
                    quantity={quantities[selectedDish.dishId] || 0}
                    onIncrement={() => handleIncrement(selectedDish)}
                    onDecrement={() => handleDecrement(selectedDish)}
                    disabled={hasOrderLocked || cutoffPassed}
                    disableIncrement={
                      selectedDish.isSoldOut ||
                      (!planRules.allowDuplicates && (quantities[selectedDish.dishId] || 0) >= 1) ||
                      counts.total + 1 > planRules.maxTotalItems ||
                      (selectedDish.isAddon && counts.addOns + 1 > planRules.addOnMax) ||
                      (() => {
                        const sectionSlug = selectedDish.section?.slug || (selectedDish.isAddon ? 'add-ons' : 'entrees');
                        const sectionRule = planRules.sectionRules?.[sectionSlug];
                        if (!sectionRule?.max) return false;
                        const next = (counts.bySection?.[sectionSlug] || 0) + 1;
                        return next > sectionRule.max;
                      })()
                    }
                  />
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={checkoutOpen} onOpenChange={(open) => {
        setCheckoutOpen(open);
        if (!open) {
          resetCheckoutState();
          clearCheckoutAttempt();
        }
      }}>
        <DialogContent className="fullpage-demo-scope weekly-order-dialog sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle>Checkout</DialogTitle>
            <DialogDescription>Confirm your weekly order and submit payment.</DialogDescription>
          </DialogHeader>
          {checkoutStatus === 'success' ? (
            <div className="weekly-order-checkout-success">
              <h3>Order submitted</h3>
              <p>Your payment was processed. We will prep your meals for the week.</p>
              <Button onClick={() => setCheckoutOpen(false)}>Close</Button>
            </div>
          ) : (
            <div className="weekly-order-checkout-body">
              <div className="weekly-order-checkout-summary">
                {basePriceCents ? (
                  <div className="weekly-order-checkout-row">
                    <span>Plan base</span>
                    <span>{formatCurrency(basePriceCents)}</span>
                  </div>
                ) : null}
                {data?.plan?.notes && (
                  <p className="weekly-order-summary-note">{data.plan.notes}</p>
                )}
                {deliveryFeeCents ? (
                  <div className="weekly-order-checkout-row">
                    <span>Delivery</span>
                    <span>{formatCurrency(deliveryFeeCents)}</span>
                  </div>
                ) : null}
                {lineItems.map((item) => (
                  <div key={item.dishId} className="weekly-order-checkout-row">
                    <span>{item.quantity}x {item.dish?.title}</span>
                    <span>{item.includedInPlan ? 'Included' : formatCurrency((item.priceCents || 0) * item.quantity)}</span>
                  </div>
                ))}
                <div className="weekly-order-checkout-total">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotalCents)}</span>
                </div>
              </div>
              <div className="weekly-order-payment">
                <p className="weekly-order-payment-label">Card details</p>
                <div id="weekly-order-card-container" className="weekly-order-card-container" />
                {loadingScript && <p className="weekly-order-helper">Loading payment form...</p>}
                {cardError && <p className="weekly-order-error">{cardError}</p>}
                {(cardError || checkoutStatus === 'error') && (
                  <div className="weekly-order-helper">
                    <button
                      type="button"
                      className="weekly-order-link-button"
                      onClick={buildHostedCheckout}
                      disabled={fallbackStatus.loading}
                    >
                      {fallbackStatus.loading ? 'Building hosted checkout...' : 'Use hosted Square checkout'}
                    </button>
                    {fallbackStatus.error && <p className="weekly-order-error">{fallbackStatus.error}</p>}
                    {fallbackLink && (
                      <p>
                        <a href={fallbackLink} target="_blank" rel="noopener noreferrer">Open hosted checkout</a>
                      </p>
                    )}
                  </div>
                )}
              </div>
              {checkoutError && <p className="weekly-order-error">{checkoutError}</p>}
              <Button
                className="w-full"
                onClick={handleCheckout}
                disabled={!cardLoaded || checkoutStatus === 'processing'}
              >
                {checkoutStatus === 'processing' ? 'Processing...' : `Pay ${formatCurrency(subtotalCents)}`}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const MenuCard = ({
  item,
  quantity,
  onIncrement,
  onDecrement,
  onDetails,
  planRules,
  counts,
  disabled,
}) => {
  const priceLabel = item.includedInPlan
    ? 'Included'
    : Number.isFinite(item.priceCents)
      ? formatCurrency(item.priceCents)
      : 'Price TBD';
  const sectionSlug = item.section?.slug || (item.isAddon ? 'add-ons' : 'entrees');
  const sectionRule = planRules.sectionRules?.[sectionSlug];
  const sectionLimitReached = sectionRule?.max ? (counts.bySection?.[sectionSlug] || 0) >= sectionRule.max : false;
  const limitReached =
    counts.total >= planRules.maxTotalItems ||
    (item.isAddon && counts.addOns >= planRules.addOnMax);
  const disableIncrement =
    disabled ||
    item.isSoldOut ||
    limitReached ||
    sectionLimitReached ||
    (!planRules.allowDuplicates && quantity >= 1) ||
    item.priceCents === null;

  return (
    <motion.div
      whileHover={!disabled && !item.isSoldOut ? { y: -4 } : {}}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
    >
      <Card className={`weekly-order-card ${quantity > 0 ? 'is-selected' : ''} ${item.isSoldOut ? 'is-disabled' : ''}`}>
        <CardHeader>
          <div className="weekly-order-card-header">
            <div>
              <CardTitle>{item.dish?.title}</CardTitle>
              <CardDescription>{item.dish?.description}</CardDescription>
            </div>
            <span className="weekly-order-price">{priceLabel}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="weekly-order-tag-row">
            {item.dish?.tags?.map((tag) => (
              <span key={tag} className="weekly-order-tag">{tag}</span>
            ))}
            {item.isAddon && <span className="weekly-order-tag is-addon">Add-on</span>}
            {item.includedInPlan && <span className="weekly-order-tag">Included</span>}
          </div>
          {item.dish?.allergens?.length ? (
            <p className="weekly-order-allergen">Allergens: {item.dish.allergens.join(', ')}</p>
          ) : null}
          <div className="weekly-order-card-footer">
            <button type="button" className="weekly-order-details" onClick={onDetails}>
              View details
            </button>
            <QuantityControl
              quantity={quantity}
              onIncrement={onIncrement}
              onDecrement={onDecrement}
              disabled={disabled}
              disableIncrement={disableIncrement}
            />
          </div>
          {item.isSoldOut && <p className="weekly-order-soldout">Sold out</p>}
        </CardContent>
      </Card>
    </motion.div>
  );
};

const QuantityControl = ({
  quantity,
  onIncrement,
  onDecrement,
  disabled,
  disableIncrement,
}) => (
  <div className="weekly-order-stepper">
    <button
      type="button"
      className="weekly-order-stepper-btn"
      onClick={onDecrement}
      disabled={disabled || quantity <= 0}
      aria-label="Decrease quantity"
    >
      -
    </button>
    <AnimatePresence mode="wait">
      <motion.span
        key={quantity}
        className="weekly-order-stepper-count"
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.18 }}
      >
        {quantity}
      </motion.span>
    </AnimatePresence>
    <button
      type="button"
      className="weekly-order-stepper-btn"
      onClick={onIncrement}
      disabled={disabled || disableIncrement}
      aria-label="Increase quantity"
    >
      +
    </button>
  </div>
);

const SummaryPanel = ({
  counts,
  planRules,
  sectionChecks,
  lineItems,
  subtotalCents,
  basePriceCents,
  deliveryFeeCents,
  planNotes,
  cutoffPassed,
  hasOrderLocked,
  canCheckout,
  compact = false,
  onCheckout,
}) => {
  const missingEntrees = Math.max(0, planRules.requiredEntrees - counts.entrees);
  const hasSectionRules = Array.isArray(sectionChecks) && sectionChecks.length > 0;
  const missingSection = hasSectionRules
    ? sectionChecks.find((check) => !check.isValid && check.min && check.count < check.min)
    : null;
  return (
    <div className={`weekly-order-summary ${compact ? 'is-compact' : ''}`}>
      <div className="weekly-order-summary-header">
        <h3>Selection summary</h3>
        <span>{formatCurrency(subtotalCents)}</span>
      </div>
      <div className="weekly-order-summary-rules">
        {hasSectionRules ? (
          sectionChecks.map((check) => (
            <div key={check.slug} className={check.isValid ? '' : 'is-warning'}>
              {check.label}: {check.count}/{check.min && check.max && check.min !== check.max ? `${check.min}-${check.max}` : check.min || check.max || 0}
            </div>
          ))
        ) : (
          <div className={missingEntrees ? 'is-warning' : ''}>
            Entrees: {counts.entrees}/{planRules.requiredEntrees}
          </div>
        )}
        <div className={counts.addOns > planRules.addOnMax ? 'is-warning' : ''}>
          Add-ons: {counts.addOns}/{planRules.addOnMax}
        </div>
        <div className={counts.total > planRules.maxTotalItems ? 'is-warning' : ''}>
          Total: {counts.total}/{planRules.maxTotalItems}
        </div>
      </div>
      {!compact && (lineItems.length || basePriceCents || deliveryFeeCents) ? (
        <div className="weekly-order-summary-items">
          {basePriceCents ? (
            <div className="weekly-order-summary-row">
              <span>Plan base</span>
              <span>{formatCurrency(basePriceCents)}</span>
            </div>
          ) : null}
          {planNotes && (
            <p className="weekly-order-summary-note">{planNotes}</p>
          )}
          {deliveryFeeCents ? (
            <div className="weekly-order-summary-row">
              <span>Delivery</span>
              <span>{formatCurrency(deliveryFeeCents)}</span>
            </div>
          ) : null}
          {lineItems.map((item) => (
            <div key={item.dishId} className="weekly-order-summary-row">
              <span>{item.quantity}x {item.dish?.title}</span>
              <span>{item.includedInPlan ? 'Included' : formatCurrency((item.priceCents || 0) * item.quantity)}</span>
            </div>
          ))}
        </div>
      ) : null}
      {cutoffPassed && <p className="weekly-order-warning">Ordering is closed for this week.</p>}
      {hasOrderLocked && <p className="weekly-order-warning">You already submitted this week.</p>}
      <Button
        className="weekly-order-checkout-btn"
        onClick={onCheckout}
        disabled={!canCheckout}
      >
        Checkout
      </Button>
      {!canCheckout && !cutoffPassed && !hasOrderLocked && (
        <p className="weekly-order-helper">
          {missingSection
            ? `Select ${missingSection.min - missingSection.count} more from ${missingSection.label}.`
            : missingEntrees
              ? `Select ${missingEntrees} more entree${missingEntrees === 1 ? '' : 's'} to continue.`
              : 'Add items to reach your weekly plan.'}
        </p>
      )}
    </div>
  );
};

export default WeeklyOrderPage;
