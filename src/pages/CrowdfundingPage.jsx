// ...existing code...
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet-async';
import { PortableText } from '@portabletext/react';
import SectionHeader from '../components/ui/SectionHeader';
import sanityClient from '../sanityClient.js';
import { useSquarePayments } from '../lib/useSquarePayments';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import PrioritiesPie from '../components/crowdfunding/PrioritiesPie.jsx';
import { createPortableTextComponents } from '../utils/portableTextComponents';
import { cn } from '../lib/utils';
import { useToast } from '../components/common/ToastProvider';

// --- Sanity Image URL Builder Setup (kept for future use if dynamic hero image restored) ---
// const builder = imageUrlBuilder(sanityClient);
// function urlFor(source) { return builder.image(source); }

// --- Helper & Child Components (No changes needed here) ---
const StatBox = ({ value, label }) => (
  <div>
    <p className="text-3xl font-bold">{value}</p>
    <p className="text-gray-600">{label}</p>
  </div>
);

StatBox.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  label: PropTypes.string.isRequired,
};

const RewardTierCard = ({ tier, onSelect, busy, selected }) => {
  if (!tier) {
    return null;
  }

  const pieCountLabel = tier.pieCount ? `${tier.pieCount.toLocaleString()} pies` : null;
  const pizzaCountLabel = tier.pizzaCount ? `${tier.pizzaCount.toLocaleString()} pizzas` : null;
  const moneyLabel = tier.amount ? `$${tier.amount.toLocaleString()}` : null;
  const isAvailable = typeof tier.amount === 'number' && tier.amount > 0;

  const headline = pieCountLabel
    ? `${pieCountLabel} - ${tier.title}`
    : pizzaCountLabel
    ? `${pizzaCountLabel} - ${tier.title}`
    : `Pledge ${moneyLabel || '$0'} or more`;

  const handleSelect = () => {
    if (!isAvailable || busy) return;
    if (onSelect) onSelect(tier);
  };

  return (
    <Card
      role={isAvailable ? 'button' : undefined}
      tabIndex={isAvailable ? 0 : undefined}
      aria-pressed={selected ? 'true' : 'false'}
      aria-disabled={!isAvailable || busy ? 'true' : 'false'}
      onClick={handleSelect}
      onKeyDown={(event) => {
        if (!isAvailable || busy) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleSelect();
        }
      }}
      className={cn(
        'card transition-colors border-slate-200 hover:border-[var(--color-accent)] focus-within:border-[var(--color-accent)]',
        isAvailable
          ? 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]'
          : 'cursor-not-allowed opacity-60',
        selected && 'border-[var(--color-accent)] shadow-lg'
      )}
    >
      <CardHeader className="space-y-2 border-none px-5 pt-5 pb-0">
        <CardTitle className="text-xl font-semibold text-slate-900">{headline}</CardTitle>
        {!pizzaCountLabel && (
          <p className="text-base font-semibold text-[var(--color-accent)]">{tier.title}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3 px-5 pb-4 pt-4">
        <p className="text-sm text-slate-600 leading-relaxed">{tier.description}</p>
        {tier.limit && (
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Limited - {tier.limit} left
          </p>
        )}
      </CardContent>
      <CardFooter className="flex items-center gap-3 px-5 pb-5 pt-0 border-none">
        <Button
          type="button"
          variant={selected ? 'secondary' : 'default'}
          className="flex-1"
          disabled={!isAvailable || busy}
          onClick={(event) => {
            event.stopPropagation();
            handleSelect();
          }}
        >
          {selected ? 'Reward selected' : isAvailable ? 'Select this reward' : 'Unavailable online'}
        </Button>
        {!isAvailable && (
          <span className="text-xs text-slate-500">Contact us to claim.</span>
        )}
      </CardFooter>
    </Card>
  );
};

RewardTierCard.propTypes = {
  tier: PropTypes.shape({
    pizzaCount: PropTypes.number,
    pieCount: PropTypes.number,
    amount: PropTypes.number,
    title: PropTypes.string,
    description: PropTypes.string,
    limit: PropTypes.number,
  }),
  onSelect: PropTypes.func,
  busy: PropTypes.bool,
  selected: PropTypes.bool,
};
// ...existing code...

// --- Main Page Component ---
const tierIdentifier = (tier) => (tier?._id || tier?.id || tier?.title || '').toString();

const REWARD_PREFERENCE_OPTIONS = [
  { value: 'public pizza party', label: 'Public pizza party' },
  { value: 'deliver to my home', label: 'Deliver to my home' },
  { value: 'make live at my home', label: 'Make live at my home' },
  { value: "i'm open or im not sure", label: "I’m open or I’m not sure" },
];

const CrowdfundingPage = () => {
  const [campaignData, setCampaignData] = useState(null);
  const [activeTab, setActiveTab] = useState('story');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const [funderName, setFunderName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const notify = 'none';
  const [showForm, setShowForm] = useState(false);
  const [pizzaQty, setPizzaQty] = useState(1);
  const [confirmMsg, setConfirmMsg] = useState('');
  const [formNotice, setFormNotice] = useState('');
  const [referralInput, setReferralInput] = useState('');
  const [referralState, setReferralState] = useState({ status: 'idle', valid: false, participant: null, code: '' });
  const [selectedTierId, setSelectedTierId] = useState('');
  const [subscribeEmail, setSubscribeEmail] = useState('');
  const [subscribeStatus, setSubscribeStatus] = useState('idle'); // idle | loading | success | error
  const [subscribeMessage, setSubscribeMessage] = useState('');
  const [rewardPreference, setRewardPreference] = useState(REWARD_PREFERENCE_OPTIONS[0].value);
  // Gallery state (lazy-loaded when tab activated)
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryError, setGalleryError] = useState('');
  const galleryLoadedRef = React.useRef(false);
  const [eventModal, setEventModal] = useState(null);

  useEffect(() => {
    if (activeTab === 'gallery' && !galleryLoadedRef.current) {
      galleryLoadedRef.current = true;
      setGalleryLoading(true);
      // Fetch pizza and pie separately then merge unique results to ensure OR semantics across Cloudinary search API
      const endpoints = ['/api/search-images?query=pizza&per_page=50', '/api/search-images?query=pie&per_page=50'];
      Promise.all(endpoints.map((u) => fetch(u).then(r => r.json().catch(()=>({})).then(data => ({ ok: r.ok, data })))))
        .then((results) => {
          const all = [];
          results.forEach(({ ok, data }) => {
            if (ok && data && Array.isArray(data.images)) all.push(...data.images);
          });
          // De-duplicate by asset_id or public_id
          const seen = new Set();
          const merged = [];
          for (const img of all) {
            const id = img.asset_id || img.public_id;
            if (!id || seen.has(id)) continue;
            seen.add(id);
            merged.push(img);
          }
          if (merged.length === 0) {
            setGalleryError('No images found yet.');
          }
          setGalleryImages(merged);
        })
        .catch((e) => setGalleryError(e.message || 'Error loading gallery'))
        .finally(() => setGalleryLoading(false));
    }
  }, [activeTab]);
  // Simple client-side validators
  const emailValid = useMemo(() => !email || /.+@.+\..+/.test(email), [email]);
  const phoneDigits = useMemo(() => phone.replace(/\D/g, ''), [phone]);
  const phoneValid = useMemo(() => !phone || phoneDigits.length >= 10, [phone, phoneDigits]);

  useEffect(() => {
    // 💡 IMPROVEMENT: Fetch a specific campaign by its slug for a more robust component.
    // For this example, we'll hardcode a slug. In a real app, you'd get this from the URL.
    const slug = 'local-pizza-by-local-effort-let-s-make-1000-pizzas'; // Replace with a real slug from your Sanity data
    const query = `*[_type == "crowdfundingCampaign" && slug.current == $slug][0]{
      title,
      // Short description: prefer new field name, fallback to legacy if present
      "description": coalesce(description, shortDescription),
      // pizza-specific fields (keep legacy fields for backwards compatibility)
      pizzaGoal,
      pizzasSold,
      piesSold,
      goal,
      raisedAmount,
      backers,
      endDate,
      heroImage,
      story,
      goals,
      events[]{ _key, location, startDate, endDate, foodType, ticketsUrl, description },
      faq,
      "rewardTiers": rewardTiers[]->{ amount, pizzaCount, pieCount, title, description, limit, referralOnly, referralCode } | order(amount asc),
      "updates": updates[]->{ title, publishedAt, body } | order(publishedAt desc)
    }`;

    const params = { slug };

    const doFetch = async () => {
      try {
        const data = await sanityClient.fetch(query, params);
        setCampaignData(data);
      } catch (err) {
        // Provide richer logging so we can see the real failure in browser consoles
        try {
          const msg = err && err.message ? err.message : String(err);
          console.error('Sanity fetch error message:', msg);
          if (err && err.response && typeof err.response.text === 'function') {
            const body = await err.response.text();
            console.error('Sanity fetch response body:', body);
          }
        } catch (logErr) {
          console.error('Error while logging Sanity error:', logErr);
        }

        // Attempt a safe fallback: fetch the first crowdfundingCampaign available
        try {
          const fallback = `*[_type == "crowdfundingCampaign"][0]{
            title,
            "description": coalesce(description, shortDescription),
            pizzaGoal,
            pizzasSold,
            piesSold,
            goal,
            raisedAmount,
            backers,
            endDate,
            heroImage,
            story,
            goals,
            events[]{ _key, location, startDate, endDate, foodType, ticketsUrl, description },
            faq,
            "rewardTiers": rewardTiers[]->{ amount, pizzaCount, pieCount, title, description, limit, referralOnly, referralCode } | order(amount asc),
            "updates": updates[]->{ title, publishedAt, body } | order(publishedAt desc)
          }`;
          const fbData = await sanityClient.fetch(fallback);
          if (fbData) {
            console.warn('Loaded fallback campaign (first in dataset)');
            setCampaignData(fbData);
            // previously cleared error state (removed unused state)
            return;
          }
        } catch (fbErr) {
          console.error('Fallback fetch also failed:', fbErr && (fbErr.message || fbErr));
        }

        console.warn('Failed to load campaign data.');
      } finally {
        // loading state removed; no-op
      }
    };

    doFetch();
  }, []);

  // Derive reward tiers safely for hooks below
  const rewardTiers = (campaignData?.rewardTiers) || [];
  const visibleTiers = useMemo(() => {
    const hasValid = referralState.valid && referralState.code;
    return rewardTiers.filter((t) => {
      if (!t?.referralOnly) return true;
      if (!hasValid) return false;
      if (t.referralCode && typeof t.referralCode === 'string') {
        return t.referralCode.trim().toLowerCase() === referralState.code.trim().toLowerCase();
      }
      return true;
    });
  }, [rewardTiers, referralState]);
  const hasPayableTier = useMemo(
    () => visibleTiers.some((t) => typeof t?.amount === 'number' && t.amount > 0),
    [visibleTiers]
  );
  const firstPayTier = useMemo(
    () => visibleTiers.find(t => typeof t?.amount === 'number' && t.amount > 0) || null,
    [visibleTiers]
  );

  useEffect(() => {
    if (!selectedTierId) return;
    const exists = visibleTiers.some((tier) => tierIdentifier(tier) === selectedTierId);
    if (!exists) setSelectedTierId('');
  }, [selectedTierId, visibleTiers]);

  const activeTier = useMemo(() => {
    if (selectedTierId) {
      const matched = visibleTiers.find((tier) => tierIdentifier(tier) === selectedTierId);
      if (matched) return matched;
    }
    return firstPayTier;
  }, [selectedTierId, visibleTiers, firstPayTier]);

  const activeTierId = useMemo(() => tierIdentifier(activeTier), [activeTier]);
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }),
    []
  );

  const activeTierAmountLabel = useMemo(() => {
    if (!activeTier || typeof activeTier.amount !== 'number') return '';
    return currencyFormatter.format(activeTier.amount);
  }, [activeTier, currencyFormatter]);

  const activeTierTotalLabel = useMemo(() => {
    if (!activeTier || typeof activeTier.amount !== 'number') return '';
    const total = activeTier.amount * pizzaQty;
    return currencyFormatter.format(total);
  }, [activeTier, pizzaQty, currencyFormatter]);

  useEffect(() => {
    if (showForm && !activeTier) {
      setShowForm(false);
      setFormNotice(
        hasPayableTier
          ? 'That reward is no longer available. Please pick another tier to continue.'
          : 'Online checkout is temporarily unavailable. Email hello@localeffortfood.com to pledge.'
      );
    }
  }, [showForm, activeTier, hasPayableTier]);

  useEffect(() => {
    if (!showForm && hasPayableTier && activeTier) {
      setFormNotice('');
    }
  }, [showForm, hasPayableTier, activeTier]);

  const handleTierSelect = (tier) => {
    if (!tier || typeof tier.amount !== 'number' || tier.amount <= 0) {
      setFormNotice('Online checkout is only available for paid rewards. Please choose another tier.');
      return;
    }
    setSelectedTierId(tierIdentifier(tier));
    setFormNotice('');
    setShowForm(true);
  };

  const handleSubscribe = async (event) => {
    event.preventDefault();
    const emailValue = subscribeEmail.trim();
    if (!emailValue) {
      setSubscribeStatus('error');
      setSubscribeMessage('Please enter an email address.');
      return;
    }
    setSubscribeStatus('loading');
    setSubscribeMessage('');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: emailValue }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || 'Subscription failed');
      }
      setSubscribeStatus('success');
      setSubscribeMessage('Thanks! Check your inbox soon.');
      setSubscribeEmail('');
    } catch (err) {
      setSubscribeStatus('error');
      setSubscribeMessage(err.message || 'Something went wrong. Please try again.');
    }
  };

  // Destructure frequently used fields from campaign data (safe even if null)
  // Destructure raw values (null-safe post processing below)
  const {
    title: campaignTitle,
    description,
    faq: faqRaw,
    story: storyRaw,
    backers: backersRaw,
    endDate,
    piesSold: piesSoldRaw,
  } = campaignData || {};
  // Normalize numbers (treat null as 0)
  const backers = typeof backersRaw === 'number' ? backersRaw : 0;
  const piesSold = typeof piesSoldRaw === 'number' ? piesSoldRaw : 0;
  // Normalize block arrays
  const faq = Array.isArray(faqRaw) ? faqRaw : [];
  const story = Array.isArray(storyRaw) ? storyRaw : [];
  const title = campaignTitle || 'Crowdfunding';

  // Initialize shared Square card (enabled only when a payable tier exists)
  const {
    payments,
    loading: paymentsLoading,
    error: paymentsError,
    environment: squareEnvironment,
    sdkUrl: squareSdkUrl,
    appId: squareAppId,
    locationId: squareLocationId,
    isSandbox: squareIsSandbox,
  } = useSquarePayments();
  const cardContainerRef = useRef(null);
  const cardInstanceRef = useRef(null);
  const cardInitRef = useRef(false);
  const [cardReady, setCardReady] = useState(false);
  const [cardError, setCardError] = useState('');
  const { notify: notifyToast } = useToast();

  const destroyCard = useCallback(() => {
    const card = cardInstanceRef.current;
    if (card) {
      console.log('[square] [crowdfunding] destroying card instance');
      cardInstanceRef.current = null;
      try {
        const maybe = card.destroy?.();
        if (maybe && typeof maybe.then === 'function') {
          maybe.catch((err) => console.warn('[square] [crowdfunding] card destroy warning', err));
        }
      } catch (err) {
        console.warn('[square] [crowdfunding] card destroy error', err);
      }
    }
    if (cardContainerRef.current) {
      cardContainerRef.current.innerHTML = '';
    }
    cardInitRef.current = false;
    setCardReady(false);
  }, []);

  useEffect(() => {
    if (!showForm) {
      destroyCard();
    }
  }, [showForm, destroyCard]);

  useEffect(() => {
    if (paymentsError) {
      notifyToast(paymentsError, { type: 'error' });
    }
  }, [paymentsError, notifyToast]);

  useEffect(() => {
    if (!payments || !showForm || !activeTier) {
      return;
    }
    const container = cardContainerRef.current;
    if (!container) {
      return;
    }
    if (cardInitRef.current) {
      return;
    }

    let cancelled = false;
    cardInitRef.current = true;
    setCardError('');
    setCardReady(false);
    console.log('[square] [crowdfunding] initializing card', {
      tier: activeTier?.title || null,
      amount: activeTier?.amount || null,
    });

    payments
      .card()
      .then((card) => {
        if (!card) {
          throw new Error('Square card component unavailable.');
        }
        if (cancelled) {
          try {
            card.destroy?.();
          } catch (_) {
            // ignore
          }
          return null;
        }
        cardInstanceRef.current = card;
        return card.attach(container);
      })
      .then((result) => {
        if (cancelled || result === null) {
          return;
        }
        setCardReady(true);
        console.log('[square] [crowdfunding] card attached');
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }
        console.error('[square] [crowdfunding] card init failed', err);
        const message = err?.message || 'Unable to load the payment form.';
        setCardError(message);
        notifyToast(message, { type: 'error' });
        destroyCard();
      });

    return () => {
      cancelled = true;
    };
  }, [payments, showForm, activeTier, notifyToast, destroyCard]);

  useEffect(() => {
    return () => {
      console.log('[square] [crowdfunding] page unmount cleanup');
      destroyCard();
    };
  }, [destroyCard]);

  // On return from Square (?payment=success), confirm and update counters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      (async () => {
        try {
          const raw = localStorage.getItem('cf_items');
          const items = raw ? JSON.parse(raw) : [];
          const name = localStorage.getItem('cf_name') || undefined;
          if (Array.isArray(items) && items.length > 0) {
            const res = await fetch('/api/crowdfund/confirm-payment', {
              method: 'POST', headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ items, funderName: name })
            });
            if (res.ok) {
              setConfirmMsg('Thanks! Your contribution has been recorded.');
            }
          }
        } catch (_) {
          // ignore
        } finally {
          try { localStorage.removeItem('cf_items'); localStorage.removeItem('cf_name'); } catch (e) { /* ignore */ }
        }
      })();
    }
  }, []);

  const tokenizeCard = useCallback(async () => {
    const card = cardInstanceRef.current;
    if (!card) {
      const message = 'Payment form is not ready yet.';
      notifyToast(message, { type: 'error' });
      throw new Error(message);
    }
    const result = await card.tokenize();
    console.log('[square] [crowdfunding] tokenize result', result);
    if (result.status !== 'OK' || !result.token) {
      const message =
        (Array.isArray(result.errors) && result.errors[0]?.message) ||
        'Unable to verify card details.';
      notifyToast(message, { type: 'error' });
      throw new Error(message);
    }
    return result.token;
  }, [notifyToast]);

  const contribute = async (items) => {
    setPayError('');
    setPaying(true);
    try {
      let token;
      try {
        token = await tokenizeCard();
      } catch (tokErr) {
        throw new Error(tokErr?.message || 'Card not ready');
      }
      const payload = {
        items: items.map(i => ({
          name: i.name,
          price: i.price,
          quantity: i.quantity || 1,
          type: i.type,
          pizzaCount: i.pizzaCount,
        })),
        funderName,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        notes: notes || undefined,
        rewardPreference,
        notify,
        token,
        pizzaQty,
      };
      const res = await fetch('/api/crowdfund/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        let msg = data.error || 'Checkout failed';
        // Attempt to surface Square API JSON array string
        if (typeof msg === 'string' && msg.startsWith('[')) {
          try {
            const parsed = JSON.parse(msg);
            if (Array.isArray(parsed) && parsed[0]?.code) {
              msg = `Square error: ${parsed[0].code}${parsed[0].detail ? ' - ' + parsed[0].detail : ''}`;
            }
          } catch (_) { /* ignore parse */ }
        }
        throw new Error(msg);
      }
      setConfirmMsg('Thanks! Your contribution has been processed.');
    } catch (e) {
      setPayError(e?.message || 'Payment failed');
      notifyToast(e?.message || 'Payment failed', { type: 'error' });
    } finally {
      setPaying(false);
    }
  };

  const updates = Array.isArray(campaignData?.updates) ? campaignData.updates : [];

  const parseEventDate = useCallback((value) => {
    if (!value) return null;
    const iso = value.includes('T') ? value : `${value}T00:00:00`;
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? null : date;
  }, []);

  const upcomingEvents = useMemo(() => {
    const rawEvents = Array.isArray(campaignData?.events) ? campaignData.events : [];
    if (!rawEvents.length) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return rawEvents
      .filter(Boolean)
      .map((ev, index) => ({
        ...ev,
        _key: ev?._key || ev?._id || String(index),
      }))
      .filter((ev) => {
        const start = parseEventDate(ev.startDate);
        if (!start) return false;
        const end = parseEventDate(ev.endDate) || start;
        const boundary = new Date(end);
        boundary.setHours(23, 59, 59, 999);
        return boundary >= today;
      })
      .sort((a, b) => {
        const aStart = parseEventDate(a.startDate);
        const bStart = parseEventDate(b.startDate);
        if (!aStart && !bStart) return 0;
        if (!aStart) return 1;
        if (!bStart) return -1;
        return aStart - bStart;
      });
  }, [campaignData, parseEventDate]);

  useEffect(() => {
    if (!eventModal) return;
    const stillExists = upcomingEvents.some((ev) => (ev._key || ev._id) === (eventModal._key || eventModal._id));
    if (!stillExists) {
      setEventModal(null);
    }
  }, [eventModal, upcomingEvents]);

  const formatListDate = useCallback((event) => {
    const start = parseEventDate(event?.startDate);
    const end = parseEventDate(event?.endDate);
    if (!start) return '';
    const currentYear = new Date().getFullYear();
    const includeYear = start.getFullYear() > currentYear;
    if (end && end.getTime() !== start.getTime()) {
      const opts = { month: 'short', day: 'numeric' };
      if (includeYear) opts.year = 'numeric';
      return `starts ${new Intl.DateTimeFormat('en-US', opts).format(start)}`;
    }
    const opts = { weekday: 'short', month: 'short', day: 'numeric' };
    if (includeYear) opts.year = 'numeric';
    return new Intl.DateTimeFormat('en-US', opts).format(start);
  }, [parseEventDate]);

  const formatModalDate = useCallback((event) => {
    const start = parseEventDate(event?.startDate);
    const end = parseEventDate(event?.endDate);
    if (!start) return '';
    const currentYear = new Date().getFullYear();
    const baseOptions = { weekday: 'short', month: 'short', day: 'numeric' };
    const includeYearStart = start.getFullYear() > currentYear || (end && end.getFullYear() !== start.getFullYear());
    const startLabel = new Intl.DateTimeFormat('en-US', includeYearStart ? { ...baseOptions, year: 'numeric' } : baseOptions).format(start);
    if (end && end.getTime() !== start.getTime()) {
      const includeYearEnd = end.getFullYear() > currentYear || end.getFullYear() !== start.getFullYear();
      const endLabel = new Intl.DateTimeFormat('en-US', includeYearEnd ? { ...baseOptions, year: 'numeric' } : baseOptions).format(end);
      return `${startLabel} - ${endLabel}`;
    }
    return startLabel;
  }, [parseEventDate]);

  const hasEvents = upcomingEvents.length > 0;

  // --- Pizza-specific values (prefer pizza fields, fallback to legacy money values) ---
  const pizzasSold = (campaignData?.pizzasSold ?? campaignData?.raisedAmount ?? 0) || 0;
  const pizzaGoal = (campaignData?.pizzaGoal ?? campaignData?.goal ?? 1000) || 1000; // default goal to 1000 pizzas
  const daysLeft = endDate
    ? Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24))
    : 0;
  const progressPercentage = pizzaGoal > 0 ? Math.min((pizzasSold / pizzaGoal) * 100, 100) : 0;

  const TabButton = ({ tabName, label }) => (
    <button
      type="button"
      onClick={() => setActiveTab(tabName)}
      aria-pressed={activeTab === tabName}
      className="tab"
    >
      {label}
    </button>
  );

  TabButton.propTypes = {
    tabName: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
  };

  // Helper to extract a plain-text excerpt from Portable Text arrays for meta description
  const plainTextFromPortable = (blocks) => {
    if (!blocks) return '';
    if (typeof blocks === 'string') return blocks;
    return (blocks || [])
      .filter(Boolean)
      .map((blk) => {
        if (typeof blk === 'string') return blk;
        if (blk.children && Array.isArray(blk.children)) {
          return blk.children.map((c) => c.text || '').join('');
        }
        return '';
      })
      .join('\n')
      .trim();
  };

  // Ensure PortableText always receives an array of blocks
  const toPortableBlocks = (val) => {
    if (Array.isArray(val)) return val;
    if (!val) return [];
    const text = typeof val === 'string' ? val : String(val);
    return [
      {
        _type: 'block',
        style: 'normal',
        children: [{ _type: 'span', text }],
      },
    ];
  };

  // --- Utility: extract plain text from a single portable block (for optional tagline upgrade) ---
  const blockText = (blk) => {
    if (!blk) return '';
    if (typeof blk === 'string') return blk;
    if (Array.isArray(blk.children)) return blk.children.map(c => c.text || '').join('');
    return '';
  };

  // Optional: promote first paragraph to h2 if it matches tagline phrase
  let taglineBlock = null;
  let remainingDescriptionBlocks = description;
  if (Array.isArray(description) && description.length) {
    const first = description[0];
    const text = blockText(first).trim().toLowerCase();
    if (text.startsWith('local effort is making local pizza')) {
      taglineBlock = first;
      remainingDescriptionBlocks = description.slice(1);
    }
  }

  const portableComponents = useMemo(() => createPortableTextComponents(), []);

  return (
    <>
      <Helmet>
    <title>{`${title} | Crowdfunding Campaign`}</title>
  <meta name="description" content={plainTextFromPortable(description).slice(0,160)} />
      </Helmet>

  <div className="space-y-16 mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
        {/* --- Page Header --- */}
        <div>
                <h1 className="heading-display heading-balance">{title}</h1>
                {/* Short description rendered with Portable Text (supports paragraphs and formatting) */}
                <div className="mt-6 md:mt-8 text-body max-w-2xl">
                  {taglineBlock && (
                    <h2 className="heading-lg text-neutral-600">
                      {blockText(taglineBlock)}
                    </h2>
                  )}
                  {description && (Array.isArray(description) ? (
                    <PortableText value={remainingDescriptionBlocks} components={portableComponents} />
                  ) : (
                    <PortableText value={toPortableBlocks(description)} components={portableComponents} />
                  ))}
                </div>
              </div>

        {hasEvents && (
          <div className="max-w-4xl">
            <div className="border rounded-lg p-4 bg-white shadow-sm">
              <h3 className="text-lg font-semibold mb-2">upcoming campaign events.</h3>
              <ul className="divide-y">
                {upcomingEvents.map((ev) => {
                  const dateLabel = formatListDate(ev);
                  const detailLabel = [dateLabel, ev.foodType || 'Food'].filter(Boolean).join(' - ');
                  return (
                    <li key={ev._key} className="py-2">
                      <button
                        type="button"
                        className="text-left hover:underline"
                        onClick={() => setEventModal(ev)}
                      >
                        <span className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
                          <span className="font-semibold text-slate-800">{ev.location}</span>
                          <span className="text-sm text-slate-600">{detailLabel}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}

        {/* --- Main Content Grid --- */}
  <div className="grid grid-cols-1 lg:grid-cols-5 lg:gap-16">
          {/* --- Left Column (Media & Content Tabs) --- */}
    <div className="lg:col-span-3 space-y-8 order-2 lg:order-1">
            {/* Override hero image per request */}
            <img
              src={"/gallery/5Z0A5718-Edit.jpg"}
              alt={title}
              className="w-full object-cover rounded-lg aspect-video bg-gray-100"
              loading="lazy"
            />

            <div className="border-b border-neutral-200">
              <nav className="tablist">
                <TabButton tabName="story" label="Our Story" />
                {updates.length > 0 && (
                  <TabButton tabName="updates" label={`Updates (${updates.length})`} />
                )}
                <TabButton tabName="goals" label="Goals" />
                {faq.length > 0 && <TabButton tabName="faq" label="FAQ" />}
                <TabButton tabName="gallery" label="Gallery" />
              </nav>
            </div>
            <div className="prose max-w-none text-body">
              {activeTab === 'story' && story.length > 0 && <PortableText value={story} components={portableComponents} />}
              {activeTab === 'updates' && (
                <div className="space-y-8">
                  {updates.map((update, index) => (
                    <div key={index} className="p-4 border-l-4 border-gray-200">
                      <div className="mt-0">
                        <SectionHeader overline="Update" title={update.title} />
                      </div>
                      <p className="text-sm text-gray-500 mb-2">
                        {new Date(update.publishedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                      <PortableText value={update.body} components={portableComponents} />
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 'goals' && (
                <div className="space-y-6">
                  <PrioritiesPie />
                  {campaignData?.goals
                    ? (
                        Array.isArray(campaignData.goals)
                          ? <PortableText value={campaignData.goals} components={portableComponents} />
                          : <PortableText value={toPortableBlocks(campaignData.goals)} components={portableComponents} />
                      )
                    : (
                      <p className="text-gray-500">No goals content yet. Add content in the Goals field in Sanity Studio.</p>
                    )}
                </div>
              )}
              {activeTab === 'faq' && (
                <div className="space-y-6">
                  {faq.map((item, index) => (
                    <div key={index}>
                      <h4 className="font-bold text-lg mb-1">{item.question}</h4>
                      <p className="mt-0">{item.answer}</p>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 'gallery' && (
                <div className="mt-4">
                  {galleryLoading && (
                    <p className="text-sm text-gray-500 animate-pulse">Loading images...</p>
                  )}
                  {galleryError && (
                    <p className="text-sm text-red-600">{galleryError}</p>
                  )}
                  {!galleryLoading && !galleryError && galleryImages.length === 0 && (
                    <p className="text-sm text-gray-500">No images found yet. Tag Cloudinary images with 'pizza' or 'pie'.</p>
                  )}
                  <div className="mt-4 columns-2 md:columns-3 lg:columns-4 gap-3 [column-fill:_balance]">
                    {galleryImages.map((img) => (
                      <figure key={img.asset_id || img.public_id} className="mb-3 break-inside-avoid rounded-lg overflow-hidden shadow-sm bg-neutral-100">
                        <img
                          src={img.thumbnail_url}
                          alt={img.public_id}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-auto block transition-transform duration-300 hover:scale-[1.03]"
                        />
                      </figure>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* --- Right Column (Stats & Rewards) --- */}
          <div className="lg:col-span-2 space-y-8 mt-12 lg:mt-0 order-1 lg:order-2">
            <div className="card p-6 space-y-4 ring-1 ring-neutral-200">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-[var(--color-accent)] h-2.5 rounded-full"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              <div>
                <p className="text-4xl font-bold text-[var(--color-accent)]">
                  {pizzasSold.toLocaleString()} pizzas
                </p>
                <p className="text-body text-gray-600">
                  sold of {pizzaGoal.toLocaleString()} pizzas goal
                </p>
                {/* Pies sold (no goal) */}
                <p className="mt-2 text-2xl font-semibold">{piesSold.toLocaleString()} pies</p>
                <p className="text-body text-gray-600">sold</p>
              </div>
              <div className="flex justify-between text-body text-center border-y py-3">
                <StatBox value={backers.toLocaleString()} label="backers" />
                <StatBox
                  value={daysLeft > 0 ? daysLeft : 'Ended'}
                  label={daysLeft > 0 ? 'days to go' : ''}
                />
              </div>
              {confirmMsg && <p className="text-sm text-emerald-700">{confirmMsg}</p>}
              {payError && <p className="text-sm text-red-600">{payError}</p>}
              {/* CTA button when form hidden */}
              {!showForm && (
                <Button
                  type="button"
                  onClick={() => {
                    if (!activeTier) {
                      setFormNotice('Reward tiers are loading. Please try again in a moment.');
                      return;
                    }
                    setSelectedTierId(tierIdentifier(activeTier));
                    setFormNotice('');
                    setShowForm(true);
                  }}
                  className="w-full text-lg h-12"
                  disabled={!hasPayableTier}
                >
                  I want pizza
                </Button>
              )}
              {(formNotice || (!hasPayableTier && !showForm)) && (
                <p className="text-sm text-slate-600">
                  {formNotice || 'Online checkout is temporarily unavailable. Email hello@localeffortfood.com to pledge.'}
                </p>
              )}
              {showForm && activeTier && (
                <form
                  className="space-y-6"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!activeTier || typeof activeTier.amount !== 'number') return;
                    contribute([
                      {
                        name: activeTier.title || 'Pizza',
                        price: Math.round(activeTier.amount * 100),
                        type: 'pizza',
                        pizzaCount: pizzaQty,
                        quantity: pizzaQty,
                      },
                    ]);
                  }}
                >
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cf-name">Name</Label>
                      <Input
                        id="cf-name"
                        placeholder="Name"
                        autoComplete="name"
                        value={funderName}
                        onChange={(e) => setFunderName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cf-email">Email</Label>
                      <Input
                        id="cf-email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cf-phone">Phone</Label>
                      <Input
                        id="cf-phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="(555) 555-1234"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cf-referral">Referral code (optional)</Label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        id="cf-referral"
                        placeholder="Referral code"
                        value={referralInput}
                        onChange={(e) => setReferralInput(e.target.value)}
                        className="sm:flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="sm:w-32"
                        disabled={!referralInput || referralState.status === 'checking'}
                        onClick={async () => {
                          const code = (referralInput || '').trim();
                          if (!code) return;
                          setReferralState({ status: 'checking', valid: false, participant: null, code });
                          try {
                            const resp = await fetch('/api/referrals/validate', {
                              method: 'POST',
                              headers: { 'content-type': 'application/json' },
                              body: JSON.stringify({ code }),
                            });
                            const data = await resp.json().catch(() => ({}));
                            if (resp.ok && data && data.valid) {
                              setReferralState({ status: 'ok', valid: true, participant: data.participant || null, code });
                            } else {
                              setReferralState({ status: 'ok', valid: false, participant: null, code });
                            }
                          } catch (_) {
                            setReferralState({ status: 'error', valid: false, participant: null, code });
                          }
                        }}
                      >
                        {referralState.status === 'checking' ? 'Checking...' : 'Apply'}
                      </Button>
                    </div>
                  </div>
                  {referralState.status === 'ok' && referralState.valid && (
                    <p className="text-sm text-emerald-700">
                      Code applied
                      {referralState.participant?.name ? ` for ${referralState.participant.name}` : ''}.
                    </p>
                  )}
                  {referralState.status === 'ok' && !referralState.valid && (
                    <p className="text-sm text-red-600">That code is not valid.</p>
                  )}
                  {referralState.status === 'error' && (
                    <p className="text-sm text-red-600">Unable to validate that code right now.</p>
                  )}
                  {activeTier && (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      <div className="space-y-2">
                        <Label htmlFor="pizza-qty">Quantity</Label>
                        <Input
                          id="pizza-qty"
                          type="number"
                          min={1}
                          max={50}
                          value={pizzaQty}
                          onChange={(e) =>
                            setPizzaQty(Math.max(1, Math.min(50, Number(e.target.value) || 1)))
                          }
                          className="w-28"
                        />
                      </div>
                      {activeTierAmountLabel && (
                        <p className="text-sm text-slate-600 sm:pb-2">
                          Each pledge: {activeTierAmountLabel}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="cf-notes">Notes (optional)</Label>
                    <Textarea
                      id="cf-notes"
                      placeholder="Any notes for us"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm font-semibold text-slate-700">Preferred reward setting</span>
                    <fieldset className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Preferred reward setting">
                      {REWARD_PREFERENCE_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className={cn(
                            'flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors',
                            rewardPreference === option.value
                              ? 'border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]'
                              : 'hover:border-[var(--color-accent)]'
                          )}
                        >
                          <input
                            type="radio"
                            name="rewardPreference"
                            value={option.value}
                            checked={rewardPreference === option.value}
                            onChange={(event) => setRewardPreference(event.target.value)}
                            className="h-4 w-4 border-slate-300 text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                          />
                          <span className="text-slate-700">{option.label}</span>
                        </label>
                      ))}
                    </fieldset>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cf-card-container">Payment details</Label>
                    <div
                      id="cf-card-container"
                      ref={cardContainerRef}
                      className="border rounded-md p-4 bg-white min-h-[88px]"
                      aria-label="Card payment form"
                    >
                      {!cardReady && !cardError && !paymentsError && (
                        <p className="text-sm text-gray-500">
                          {paymentsLoading ? 'Loading secure payment form…' : 'Preparing secure payment form…'}
                        </p>
                      )}
                      {(cardError || paymentsError) && (
                        <p className="text-sm text-red-600">{cardError || paymentsError}</p>
                      )}
                    </div>
                  </div>
                  {email && !emailValid && (
                    <p className="text-xs text-red-600">Please enter a valid email.</p>
                  )}
                  {phone && !phoneValid && (
                    <p className="text-xs text-red-600">Phone should have at least 10 digits.</p>
                  )}
                  <Button
                    type="submit"
                    disabled={
                      !activeTier ||
                      !cardReady ||
                      paying ||
                      !!cardError ||
                      !!paymentsError ||
                      !emailValid ||
                      !phoneValid
                    }
                    className="w-full text-lg h-12"
                  >
                    {paying
                      ? 'Processing...'
                      : activeTierTotalLabel
                      ? `Buy ${activeTierTotalLabel}`
                      : 'Buy now'}
                  </Button>
                </form>
              )}
            </div>

            <div className="space-y-4">
              <Card className="border-0 bg-slate-900 text-white shadow-xl">
                <CardHeader className="px-5 py-4 space-y-1 border-none">
                  <CardTitle className="text-lg font-semibold tracking-wide uppercase text-amber-300">
                    Follow along as we raise
                  </CardTitle>
                  <CardDescription className="text-sm text-slate-200">
                    Get pizza updates, milestones, and openings first.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-5 py-4">
                  <form className="space-y-4" onSubmit={handleSubscribe}>
                    <div className="space-y-2">
                      <Label htmlFor="cf-subscribe-email" className="text-sm font-medium text-white">
                        Email address
                      </Label>
                      <Input
                        id="cf-subscribe-email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={subscribeEmail}
                        onChange={(event) => setSubscribeEmail(event.target.value)}
                        disabled={subscribeStatus === 'loading'}
                        className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-400"
                      />
                    </div>
                    {subscribeMessage && (
                      <p
                        className={
                          subscribeStatus === 'success'
                            ? 'text-sm text-emerald-300'
                            : 'text-sm text-red-300'
                        }
                      >
                        {subscribeMessage}
                      </p>
                    )}
                    <Button
                      type="submit"
                      className="w-full bg-amber-400 text-slate-900 hover:bg-amber-300"
                      disabled={subscribeStatus === 'loading'}
                    >
                      {subscribeStatus === 'loading' ? 'Subscribing…' : 'Subscribe'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {(import.meta?.env?.MODE || process.env.NODE_ENV) !== 'production' && (
                <div className="mt-4 p-4 border rounded text-xs space-y-1 bg-gray-50">
                  <p className="font-semibold">Square Diagnostics</p>
                  <p>SDK URL: {squareSdkUrl}</p>
                  <p>Environment: {squareEnvironment || 'unknown'}</p>
                  <p>App ID present: {squareAppId ? 'yes' : 'no'}</p>
                  <p>Location ID present: {squareLocationId ? 'yes' : 'no'}</p>
                  <p>Sandbox mode: {squareIsSandbox ? 'true' : 'false'}</p>
                  <p>Payments ready: {payments ? 'true' : 'false'} | Loading: {paymentsLoading ? 'true' : 'false'}</p>
                  <p>Card ready: {cardReady ? 'true' : 'false'}</p>
                  {cardError && <p className="text-red-600">Card error: {cardError}</p>}
                  {paymentsError && <p className="text-red-600">Payments error: {paymentsError}</p>}
                </div>
              )}

              {rewardTiers.map((tier) => {
                const tierId = tierIdentifier(tier);
                return (
                  <RewardTierCard
                    key={tierId || tier?.title || tier?.amount || Math.random()}
                    tier={tier}
                    busy={paying}
                    onSelect={handleTierSelect}
                    selected={tierId === activeTierId}
                  />
                );
              })}

              {/* Dev diagnostics */}
              {process.env.NODE_ENV !== 'production' && (
                <div className="mt-8 p-4 border rounded text-xs space-y-1 bg-gray-50">
                  <p className="font-semibold">Payment Diagnostics</p>
                  <p>SDK URL: {envInfo?.sdkUrl}</p>
                  <p>Environment: {envInfo?.environment || 'unknown'}</p>
                  <p>App ID present: {envInfo?.appId ? 'yes' : 'no'}</p>
                  <p>Location ID present: {envInfo?.locationId ? 'yes' : 'no'}</p>
                  <p>Sandbox mode: {envInfo?.sandbox ? 'true' : 'false'}</p>
                  <p>Loaded: {cardLoaded ? 'true' : 'false'} | Attempts: {envInfo?.attempts ?? 'n/a'}</p>
                  {squareConfigError && <p className="text-red-600">Error: {squareConfigError}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {eventModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-5 relative">
            <button
              type="button"
              className="absolute right-3 top-3 text-sm underline"
              onClick={() => setEventModal(null)}
            >
              Close
            </button>
            <h4 className="text-xl font-bold mb-1">{eventModal.location}</h4>
            <p className="text-sm text-gray-600 mb-3">{formatModalDate(eventModal)}</p>
            {eventModal.description && (
              <div className="prose max-w-none">
                <PortableText value={eventModal.description} components={portableComponents} />
              </div>
            )}
            {eventModal.ticketsUrl && (
              <a
                className="btn btn-primary mt-4 inline-block"
                href={eventModal.ticketsUrl}
                target="_blank"
                rel="noreferrer"
              >
                Get tickets
              </a>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default CrowdfundingPage;
