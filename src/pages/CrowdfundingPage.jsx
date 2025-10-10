import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import PropTypes from 'prop-types';
import { Helmet } from 'react-helmet-async';
import { PortableText } from '@portabletext/react';
import SectionHeader from '../components/ui/SectionHeader';
import sanityClient from '../sanityClient.js';
import { useSquarePayments } from '../lib/useSquarePayments';
import { Button } from '../components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import PrioritiesPie from '../components/crowdfunding/PrioritiesPie.jsx';
import { createPortableTextComponents } from '../utils/portableTextComponents';
import { cn } from '../lib/utils';
import { useToast } from '../components/common/ToastProvider';

import devConsole from '../lib/devConsole.js';
import { watchCrowdfundingTotals, watchPizzaFeedback, getFirebaseAppInstance } from '../lib/firebaseCrowdfunding';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

function isPortableTextBlocks(value) {
  return (
    Array.isArray(value) &&
    value.some(
      (item) =>
        item && typeof item === 'object' && item._type === 'block' && Array.isArray(item.children)
    )
  );
}

function replaceFirebaseDatabaseInPortableBlocks(blocks) {
  if (!isPortableTextBlocks(blocks)) {
    return blocks;
  }

  let changed = false;
  // ...existing code...

  const processed = blocks.map((block) => {
    if (!block || typeof block !== 'object' || !Array.isArray(block.children)) {
      return block;
    }

  // ...existing code...
    const newChildren = [];
    // ...existing code...

    block.children.forEach((child) => {
      if (!child || child._type !== 'span' || typeof child.text !== 'string') {
        newChildren.push(child);
        return;
      }

      newChildren.push(child);
    });

    return {
      ...block,
      children: newChildren,
    };
  });

  return changed ? processed : blocks;
}

function replaceFirebaseDatabaseInValue(value) {
  if (typeof value === 'string') {
  return value;
  }
  if (isPortableTextBlocks(value)) {
    return replaceFirebaseDatabaseInPortableBlocks(value);
  }
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
    const replaced = value.map((item) =>
  item
    );
    const changed = replaced.some((item, index) => item !== value[index]);
    return changed ? replaced : value;
  }
  return value;
}

function replaceFirebaseDatabaseMentions(campaign) {
  if (!campaign || typeof campaign !== 'object') {
    return campaign;
  }

  const next = { ...campaign };

  next.description = replaceFirebaseDatabaseInValue(next.description);
  next.story = replaceFirebaseDatabaseInValue(next.story);
  next.goals = replaceFirebaseDatabaseInValue(next.goals);

  if (Array.isArray(next.faq)) {
    next.faq = next.faq.map((item) => ({
      ...item,
      question: replaceFirebaseDatabaseInValue(item?.question),
      answer: replaceFirebaseDatabaseInValue(item?.answer),
    }));
  }

  if (Array.isArray(next.updates)) {
    next.updates = next.updates.map((update) => ({
      ...update,
      body: replaceFirebaseDatabaseInValue(update?.body),
    }));
  }

  if (Array.isArray(next.events)) {
    next.events = next.events.map((event) => ({
      ...event,
      description: replaceFirebaseDatabaseInValue(event?.description),
    }));
  }

  if (Array.isArray(next.rewardTiers)) {
    next.rewardTiers = next.rewardTiers.map((tier) => ({
      ...tier,
      description: replaceFirebaseDatabaseInValue(tier?.description),
    }));
  }

  return next;
}

const DEFAULT_DISCOUNT_LABEL = 'Complimentary contribution';

function applyDiscountToCents(amountCents, discount) {
  const baseAmount = Math.max(0, Math.round(Number(amountCents) || 0));
  if (!discount || typeof discount !== 'object') {
    return baseAmount;
  }
  if (discount.type === 'full') {
    return 0;
  }
  const reduction = discount.reduction;
  if (!reduction || typeof reduction !== 'object') {
    return baseAmount;
  }
  const reductionType = reduction.type;
  if (reductionType === 'percent') {
    const percent = Number(reduction.value);
    if (!Number.isFinite(percent) || percent <= 0) {
      return baseAmount;
    }
    if (percent >= 100) {
      return 0;
    }
    const multiplier = 1 - percent / 100;
    return Math.max(0, Math.round(baseAmount * multiplier));
  }
  if (reductionType === 'fixed') {
    const deduction = Math.max(0, Math.round(Number(reduction.value) || 0));
    if (!deduction) {
      return baseAmount;
    }
    return Math.max(0, baseAmount - deduction);
  }
  return baseAmount;
}

const SUMMARY_ENDPOINTS = ['/api/crowdfund/summary', '/api/crowdfunding/summary'];

const summaryFetcher = async () => {
  const errors = [];
  for (const endpoint of SUMMARY_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
      if (!response.ok) {
        errors.push(`${endpoint} responded with status ${response.status}`);
        continue;
      }
      return await response.json();
    } catch (error) {
      errors.push(`${endpoint} failed: ${error?.message ?? 'unknown error'}`);
    }
  }

  const message = errors.length
    ? `Unable to load crowdfunding summary (${errors.join('; ')})`
    : 'Unable to load crowdfunding summary';
  throw new Error(message);
};

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
        {!isAvailable && <span className="text-xs text-slate-500">Contact us to claim.</span>}
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
// --- Main Page Component ---
const tierIdentifier = (tier) => (tier?._id || tier?.id || tier?.title || '').toString();

const REWARD_PREFERENCE_OPTIONS = [
  { value: 'public pizza party', label: 'Public pizza party' },
  { value: 'deliver to my home', label: 'Deliver to my home' },
  { value: 'make live at my home', label: 'Make live at my home' },
  { value: 'frozen pizza', label: 'Frozen pizza' },
  { value: "i'm open or im not sure", label: "I'm open or I'm not sure" },
];

const CAMPAIGN_EXTENSION_DATE_STRING = '2025-12-10T23:59:59-06:00';
const CAMPAIGN_EXTENSION_DEADLINE = (() => {
  const parsed = new Date(CAMPAIGN_EXTENSION_DATE_STRING);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
})();

const toNonNegativeNumber = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    return null;
  }
  return num;
};

const CrowdfundingPage = () => {
  const [campaignData, setCampaignData] = useState(null);
  const [activeTab, setActiveTab] = useState('story');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const [funderName, setFunderName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [squareDiscountCode, setSquareDiscountCode] = useState('');
  const [discountState, setDiscountState] = useState({
    status: 'idle',
    code: '',
    discount: null,
    message: '',
  });
  const notify = 'none';
  const [showForm, setShowForm] = useState(false);
  const [pizzaQty, setPizzaQty] = useState(1);
  const [confirmMsg, setConfirmMsg] = useState('');
  const [formNotice, setFormNotice] = useState('');
  const [referralInput, setReferralInput] = useState('');
  const [referralState, setReferralState] = useState({
    status: 'idle',
    valid: false,
    participant: null,
    code: '',
  });
  const [selectedTierId, setSelectedTierId] = useState('');
  const [subscribeEmail, setSubscribeEmail] = useState('');
  const [subscribeStatus, setSubscribeStatus] = useState('idle'); // idle | loading | success | error
  const [subscribeMessage, setSubscribeMessage] = useState('');
  const [rewardPreference, setRewardPreference] = useState(REWARD_PREFERENCE_OPTIONS[0].value);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackNotice, setFeedbackNotice] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState('idle'); // idle | error | success
  const [feedbackEntries, setFeedbackEntries] = useState([]);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackFetchError, setFeedbackFetchError] = useState('');
  const [realtimeTotals, setRealtimeTotals] = useState(null);
  const [feedbackRealtimeStatus, setFeedbackRealtimeStatus] = useState('idle'); // idle | connecting | ready | error | disabled
  // Gallery state (lazy-loaded when tab activated)
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryError, setGalleryError] = useState('');
  const feedbackFallbackStatusRef = useRef(null);
  const galleryLoadedRef = useRef(false);
  const [eventModal, setEventModal] = useState(null);

  const { data: summaryData, error: summaryError } = useSWR(
    'crowdfund-summary',
    summaryFetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
    }
  );
  const summaryPizzas = Number(summaryData?.pizzas);
  const summaryBackers = Number(summaryData?.backers);
  const summaryGoal = Number(summaryData?.goal);
  const summaryTotalsAvailable =
    !summaryError && Number.isFinite(summaryPizzas) && summaryPizzas >= 0;
  const summaryBackersAvailable =
    !summaryError && Number.isFinite(summaryBackers) && summaryBackers >= 0;
  const livePizzas = Number.isFinite(Number(realtimeTotals?.pizzas))
    ? Number(realtimeTotals.pizzas)
    : null;
  const liveBackers = Number.isFinite(Number(realtimeTotals?.backers))
    ? Number(realtimeTotals.backers)
    : null;
  const liveGoal = Number.isFinite(Number(realtimeTotals?.goal))
    ? Number(realtimeTotals.goal)
    : null;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    let unsubscribe = null;
    let active = true;

    try {
      const maybeUnsubscribe = watchCrowdfundingTotals({
        onUpdate: (data) => {
          if (!active) return;
          setRealtimeTotals(data);
        },
        onError: (error) => {
          if (!active) return;
          if (error) {
            devConsole.warn('[crowdfunding] realtime totals listener error', error);
          }
        },
      });

      if (typeof maybeUnsubscribe === 'function') {
        unsubscribe = maybeUnsubscribe;
      } else if (active) {
        devConsole.warn('[crowdfunding] realtime totals disabled - missing client configuration?');
      }
    } catch (error) {
      if (active) {
        devConsole.warn('[crowdfunding] failed to start realtime totals listener', error);
      }
    }

    return () => {
      active = false;
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    if (activeTab !== 'gallery' || galleryLoadedRef.current) {
      return undefined;
    }
    if (activeTab === 'gallery' && !galleryLoadedRef.current) {
      galleryLoadedRef.current = true;
      setGalleryLoading(true);
      // Fetch pizza and pie separately then merge unique results to ensure OR semantics across Cloudinary search API
      const endpoints = [
        '/api/search-images?query=pizza&per_page=50',
        '/api/search-images?query=pie&per_page=50',
      ];
      Promise.all(
        endpoints.map(async (url) => {
          try {
            const response = await fetch(url, { headers: { Accept: 'application/json' } });
            const payload = await response.json().catch(() => ({}));
            const images = Array.isArray(payload?.images) ? payload.images : [];
            return { ok: response.ok, images };
          } catch (error) {
            devConsole.warn('[crowdfunding] gallery fetch failed', error);
            return { ok: false, images: [] };
          }
        })
      )
        .then((results) => {
          const merged = [];
          const seen = new Set();
          results.forEach(({ ok, images }) => {
            if (!ok || !images.length) {
              return;
            }
            images.forEach((img) => {
              const id = img?.asset_id || img?.public_id;
              if (!id || seen.has(id)) {
                return;
              }
              seen.add(id);
              merged.push(img);
            });
          });
          if (merged.length === 0) {
            setGalleryError('No images found yet.');
          }
          setGalleryImages(merged);
        })
        .catch((error) => {
          setGalleryError(error?.message || 'Error loading gallery');
        })
        .finally(() => setGalleryLoading(false));
    }

    galleryLoadedRef.current = true;
    setGalleryLoading(true);
    setGalleryError('');
    // Fetch pizza and pie separately then merge unique results to ensure OR semantics across Cloudinary search API
    const endpoints = ['/api/search-images?query=pizza&per_page=50', '/api/search-images?query=pie&per_page=50'];
    let cancelled = false;

    const fetchGalleryImages = async () => {
      try {
        const results = await Promise.all(
          endpoints.map(async (endpoint) => {
            try {
              const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
              let data = null;
              try {
                data = await response.json();
              } catch (jsonError) {
                data = null;
              }
              return { ok: response.ok, data };
            } catch (networkError) {
              return { ok: false, data: null, error: networkError };
            }
          })
        );

        if (cancelled) {
          return;
        }

        const all = [];
        let hadNetworkError = false;
        results.forEach(({ ok, data, error }) => {
          if (error) {
            hadNetworkError = true;
          }
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
          setGalleryError(hadNetworkError ? 'Unable to load gallery images right now.' : 'No images found yet.');
        }
        setGalleryImages(merged);
      } catch (error) {
        if (!cancelled) {
          setGalleryError(error?.message || 'Error loading gallery');
        }
      } finally {
        if (!cancelled) {
          setGalleryLoading(false);
        }
      }
    };

    fetchGalleryImages();

    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    let unsubscribe = null;
    let active = true;

    setFeedbackRealtimeStatus('connecting');
    setFeedbackLoading(true);

    try {
      const maybeUnsubscribe = watchPizzaFeedback({
        limit: 8,
        onUpdate: (entries) => {
          if (!active) return;
          setFeedbackEntries(entries);
          setFeedbackLoading(false);
          setFeedbackFetchError('');
          setFeedbackRealtimeStatus('ready');
        },
        onError: (error) => {
          if (!active) return;
          setFeedbackLoading(false);
          setFeedbackRealtimeStatus('error');
          if (error) {
            devConsole.warn('[crowdfunding] realtime pizza feedback listener error', error);
          }
        },
      });

      if (typeof maybeUnsubscribe === 'function') {
        unsubscribe = maybeUnsubscribe;
      } else if (active) {
        setFeedbackRealtimeStatus('disabled');
        setFeedbackLoading(false);
        devConsole.warn('[crowdfunding] realtime pizza feedback disabled - missing client configuration?');
      }
    } catch (error) {
      if (active) {
        setFeedbackRealtimeStatus('error');
        setFeedbackLoading(false);
        devConsole.warn('[crowdfunding] failed to start realtime pizza feedback listener', error);
      }
    }

    return () => {
      active = false;
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    if (feedbackRealtimeStatus === 'ready') {
      feedbackFallbackStatusRef.current = null;
      return undefined;
    }

    if (!['disabled', 'error'].includes(feedbackRealtimeStatus)) {
      return undefined;
    }

    if (feedbackFallbackStatusRef.current === feedbackRealtimeStatus) {
      return undefined;
    }

    feedbackFallbackStatusRef.current = feedbackRealtimeStatus;

    let cancelled = false;
    setFeedbackLoading(true);
    setFeedbackFetchError('');

    const loadFeedback = async () => {
      try {
        const res = await fetch('/api/crowdfund/pizza-feedback?limit=8', {
          headers: { Accept: 'application/json' },
        });
        let data = null;
        try {
          data = await res.json();
        } catch (_) {
          data = null;
        }
        if (!res.ok) {
          const message =
            (data && data.error) || 'Unable to reach the pizza feedback service right now.';
          throw new Error(message);
        }
        const entries = Array.isArray(data?.entries)
          ? data.entries
              .map((entry) => {
                const rawRating = Number(entry.rating);
                const normalizedRating =
                  Number.isFinite(rawRating) && rawRating > 0 ? rawRating : null;
                const comment =
                  typeof entry.comment === 'string' && entry.comment.trim()
                    ? entry.comment.trim()
                    : typeof entry.message === 'string'
                      ? entry.message.trim()
                      : '';
                return {
                  id: entry.id || `feedback-${entry.createdAt || Date.now()}`,
                  rating: normalizedRating,
                  comment,
                };
              })
              .filter((entry) => entry.comment)
          : [];
        if (!cancelled) {
          setFeedbackEntries(entries);
        }
      } catch (err) {
        if (!cancelled) {
          setFeedbackFetchError(
            err?.message || 'Unable to reach the pizza feedback service right now.'
          );
        }
      } finally {
        if (!cancelled) {
          setFeedbackLoading(false);
        }
      }
    };

    loadFeedback();

    return () => {
      cancelled = true;
    };
  }, [feedbackRealtimeStatus]);
  // Simple client-side validators
  const emailValid = useMemo(() => !email || /.+@.+\..+/.test(email), [email]);
  const phoneDigits = useMemo(() => phone.replace(/\D/g, ''), [phone]);
  const phoneValid = useMemo(() => !phone || phoneDigits.length >= 10, [phone, phoneDigits]);

  useEffect(() => {
    // =��� IMPROVEMENT: Fetch a specific campaign by its slug for a more robust component.
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
      "featuredPublicEvents": featuredPublicEvents[]->{ 
        _id, 
        location, 
        description, 
        startDate, 
        endDate, 
        foodType,
        ticketsUrl,
        heroImage
      },
      faq,
      "rewardTiers": rewardTiers[]->{ amount, pizzaCount, pieCount, title, description, limit, referralOnly, referralCode } | order(amount asc),
      "updates": updates[]->{ title, publishedAt, body } | order(publishedAt desc)
    }`;

    const params = { slug };

    const doFetch = async () => {
      try {
        const data = await sanityClient.fetch(query, params);
        setCampaignData(replaceFirebaseDatabaseMentions(data));
      } catch (err) {
        // Provide richer logging so we can see the real failure in browser consoles
        try {
          const msg = err && err.message ? err.message : String(err);
          devConsole.error('Sanity fetch error message:', msg);
          if (err && err.response && typeof err.response.text === 'function') {
            const body = await err.response.text();
            devConsole.error('Sanity fetch response body:', body);
          }
        } catch (logErr) {
          devConsole.error('Error while logging Sanity error:', logErr);
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
            "featuredPublicEvents": featuredPublicEvents[]->{ 
              _id, 
              location, 
              description, 
              startDate, 
              endDate, 
              foodType,
              ticketsUrl,
              heroImage
            },
            faq,
            "rewardTiers": rewardTiers[]->{ amount, pizzaCount, pieCount, title, description, limit, referralOnly, referralCode } | order(amount asc),
            "updates": updates[]->{ title, publishedAt, body } | order(publishedAt desc)
          }`;
          const fbData = await sanityClient.fetch(fallback);
          if (fbData) {
            devConsole.warn('Loaded fallback campaign (first in dataset)');
            setCampaignData(replaceFirebaseDatabaseMentions(fbData));
            // previously cleared error state (removed unused state)
            return;
          }
        } catch (fbErr) {
          devConsole.error('Fallback fetch also failed:', fbErr && (fbErr.message || fbErr));
        }

        devConsole.warn('Failed to load campaign data.');
      } finally {
        // loading state removed; no-op
      }
    };

    doFetch();
  }, []);

  // Derive reward tiers safely for hooks below
  const rewardTiers = campaignData?.rewardTiers || [];
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
    () => visibleTiers.find((t) => typeof t?.amount === 'number' && t.amount > 0) || null,
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

  const trimmedDiscountCode = useMemo(() => squareDiscountCode.trim(), [squareDiscountCode]);

  const appliedDiscount = useMemo(() => {
    if (!trimmedDiscountCode) return null;
    if (discountState.status !== 'applied') return null;
    if (!discountState.code || !discountState.discount) return null;
    if (discountState.code.toLowerCase() !== trimmedDiscountCode.toLowerCase()) return null;
    return discountState.discount;
  }, [trimmedDiscountCode, discountState]);

  const baseCartTotalCents = useMemo(() => {
    if (!activeTier || typeof activeTier.amount !== 'number') return 0;
    const totalDollars = activeTier.amount * Math.max(1, pizzaQty);
    return Math.max(0, Math.round(totalDollars * 100));
  }, [activeTier, pizzaQty]);

  const discountedTotalCents = useMemo(
    () => applyDiscountToCents(baseCartTotalCents, appliedDiscount),
    [baseCartTotalCents, appliedDiscount]
  );

  const requiresPayment = discountedTotalCents > 0;

  const discountedTotalLabel = useMemo(() => {
    if (discountedTotalCents <= 0) {
      return 'Free';
    }
    return currencyFormatter.format(discountedTotalCents / 100);
  }, [discountedTotalCents, currencyFormatter]);

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
      setFormNotice(
        'Online checkout is only available for paid rewards. Please choose another tier.'
      );
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

  const handleFeedbackSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (feedbackSubmitting) return;

      const message = feedbackMessage.trim();
      const ratingValue = Number(feedbackRating);

      if (!message) {
        setFeedbackStatus('error');
        setFeedbackNotice('Please share a quick note about the pizza.');
        return;
      }

      if (!Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 5) {
        setFeedbackStatus('error');
        setFeedbackNotice('Please choose how much you loved the pizza.');
        return;
      }

      setFeedbackStatus('idle');
      setFeedbackNotice('');
      setFeedbackSubmitting(true);

      try {
        const app = getFirebaseAppInstance();
        if (!app) throw new Error('Firebase not initialized');
        const db = getFirestore(app);
        const feedbackRef = collection(db, 'crowdfund_feedback');
        const docRef = await addDoc(feedbackRef, {
          rating: ratingValue,
          comment: message,
          createdAt: serverTimestamp(),
          createdAtMs: Date.now(),
        });
        const nextEntry = {
          id: docRef.id,
          rating: ratingValue,
          comment: message,
        };
        setFeedbackEntries((prev) => {
          const safePrev = Array.isArray(prev)
            ? prev.filter((item) => item && item.id !== nextEntry.id)
            : [];
          return [nextEntry, ...safePrev].slice(0, 8);
        });
        setFeedbackFetchError('');
        setFeedbackMessage('');
        setFeedbackRating(5);
        setFeedbackStatus('success');
        setFeedbackNotice('Thanks for spreading the pizza love!');
      } catch (err) {
        setFeedbackStatus('error');
        setFeedbackNotice(
          err?.message || 'We had trouble saving your pizza note. Please try again.'
        );
      } finally {
        setFeedbackSubmitting(false);
      }
    },
    [feedbackMessage, feedbackRating, feedbackSubmitting]
  );

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
  const baseBackers = toNonNegativeNumber(backersRaw) ?? 0;
  const piesSold = toNonNegativeNumber(piesSoldRaw) ?? 0;
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

  useEffect(() => {
    setDiscountState((prev) => {
      if (!trimmedDiscountCode) {
        if (prev.status === 'idle' && !prev.code && !prev.discount && !prev.message) {
          return prev;
        }
        return { status: 'idle', code: '', discount: null, message: '' };
      }
      if (!prev.code) {
        return prev;
      }
      if (prev.code.toLowerCase() === trimmedDiscountCode.toLowerCase()) {
        return prev;
      }
      return { status: 'idle', code: '', discount: null, message: '' };
    });
  }, [trimmedDiscountCode]);

  const handleDiscountApply = useCallback(async () => {
    if (!trimmedDiscountCode) {
      setDiscountState({ status: 'idle', code: '', discount: null, message: '' });
      return;
    }
    setDiscountState({
      status: 'checking',
      code: trimmedDiscountCode,
      discount: null,
      message: '',
    });
    try {
      const res = await fetch('/api/crowdfund/discount-code', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: trimmedDiscountCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Unable to validate that discount code.');
      }
      if (!data?.valid) {
        setDiscountState({
          status: 'invalid',
          code: trimmedDiscountCode,
          discount: null,
          message: 'That code is not valid for this crowdfunding campaign.',
        });
        return;
      }
      const discount = data.discount || null;
      setDiscountState({
        status: 'applied',
        code: trimmedDiscountCode,
        discount,
        message: data.message || '',
      });
      notifyToast('Discount applied.', { type: 'success' });
    } catch (err) {
      setDiscountState({
        status: 'error',
        code: trimmedDiscountCode,
        discount: null,
        message: err?.message || 'Unable to validate that discount code.',
      });
    }
  }, [trimmedDiscountCode, notifyToast]);

  const rememberPendingContribution = useCallback((cartItems, name, discountCode) => {
    if (!Array.isArray(cartItems) || cartItems.length === 0) return;
    try {
      localStorage.setItem('cf_items', JSON.stringify(cartItems));
      if (name) {
        localStorage.setItem('cf_name', name);
      } else {
        localStorage.removeItem('cf_name');
      }
      const trimmedDiscount = typeof discountCode === 'string' ? discountCode.trim() : '';
      if (trimmedDiscount) {
        localStorage.setItem('cf_discount', trimmedDiscount);
      } else {
        localStorage.removeItem('cf_discount');
      }
    } catch (err) {
      devConsole.warn('[square] [crowdfunding] failed to persist pending contribution', err);
    }
  }, []);
  const clearPendingContribution = useCallback(() => {
    try {
      localStorage.removeItem('cf_items');
      localStorage.removeItem('cf_name');
      localStorage.removeItem('cf_discount');
    } catch (err) {
      devConsole.warn('[square] [crowdfunding] failed to clear pending contribution', err);
    }
  }, []);

  const destroyCard = useCallback(() => {
    const card = cardInstanceRef.current;
    if (card) {
      devConsole.log('[square] [crowdfunding] destroying card instance');
      cardInstanceRef.current = null;
      try {
        const maybe = card.destroy?.();
        if (maybe && typeof maybe.then === 'function') {
          maybe.catch((err) =>
            devConsole.warn('[square] [crowdfunding] card destroy warning', err)
          );
          maybe.catch((err) => devConsole.warn('[square] [crowdfunding] card destroy warning', err));
        }
      } catch (err) {
        devConsole.warn('[square] [crowdfunding] card destroy error', err);
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
    if (!requiresPayment) {
      destroyCard();
      return;
    }
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
    devConsole.log('[square] [crowdfunding] initializing card', {
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
        devConsole.log('[square] [crowdfunding] card attached');
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }
        devConsole.error('[square] [crowdfunding] card init failed', err);
        const message = err?.message || 'Unable to load the payment form.';
        setCardError(message);
        notifyToast(message, { type: 'error' });
        destroyCard();
      });

    return () => {
      cancelled = true;
    };
  }, [payments, showForm, activeTier, requiresPayment, notifyToast, destroyCard]);

  useEffect(() => {
    return () => {
      devConsole.log('[square] [crowdfunding] page unmount cleanup');
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
          const discountCode = localStorage.getItem('cf_discount') || undefined;
          if (Array.isArray(items) && items.length > 0) {
            const res = await fetch('/api/crowdfund/confirm-payment', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ items, funderName: name, discountCode }),
            });
            if (res.ok) {
              setConfirmMsg('Thanks! Your contribution has been recorded.');
            }
          }
        } catch (_) {
          // ignore
        } finally {
          clearPendingContribution();
        }
      })();
    }
  }, [clearPendingContribution]);

  const tokenizeCard = useCallback(async () => {
    const card = cardInstanceRef.current;
    if (!card) {
      const message = 'Payment form is not ready yet.';
      notifyToast(message, { type: 'error' });
      throw new Error(message);
    }
    const result = await card.tokenize();
    devConsole.log('[square] [crowdfunding] tokenize result', result);
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
      const normalizedItems = items.map((raw) => {
        const priceCents = Math.max(0, Math.round(Number(raw.price) || 0));
        const quantity = Math.max(1, Math.round(Number(raw.quantity) || 1));
        return {
          name: raw.name || 'Contribution',
          priceCents,
          quantity,
          type: raw.type,
          pizzaCount: raw.pizzaCount,
        };
      });

      const checkoutItemsPayload = normalizedItems.map((item) => ({
        name: item.name,
        price: item.priceCents,
        quantity: item.quantity,
        type: item.type,
        pizzaCount: item.pizzaCount,
      }));

      const totalCents = normalizedItems.reduce(
        (sum, item) => sum + item.priceCents * item.quantity,
        0
      );
      const trimmedDiscount = trimmedDiscountCode;
      const discountFromState = appliedDiscount;
      const totalAfterLocalDiscount = applyDiscountToCents(totalCents, discountFromState);
      const discountEliminatesPayment = totalAfterLocalDiscount <= 0;

      const finalizeWithoutPayment = async (discountInfo) => {
        const recordRes = await fetch('/api/crowdfund/confirm-payment', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            items: checkoutItemsPayload,
            funderName,
            email: email.trim() || undefined,
            phone: phone.trim() || undefined,
            notes: notes || undefined,
            notify,
            discountCode: trimmedDiscount || undefined,
          }),
        });
        const recordData = await recordRes.json().catch(() => ({}));
        if (!recordRes.ok) {
          throw new Error(recordData?.error || 'Failed to record contribution.');
        }
        const successMessage = discountInfo
          ? `${discountInfo.label || DEFAULT_DISCOUNT_LABEL}. We've recorded your contribution.`
          : 'Thanks! Your contribution has been recorded.';
        setConfirmMsg(successMessage);
        notifyToast(successMessage, { type: 'success' });
        setSquareDiscountCode('');
        setDiscountState({ status: 'idle', code: '', discount: null, message: '' });
        clearPendingContribution();
      };

      if (discountEliminatesPayment) {
        await finalizeWithoutPayment(discountFromState);
        return;
      }

      try {
        const linkItems = normalizedItems.map((item) => ({
          name: item.name,
          price: Number((item.priceCents / 100).toFixed(2)),
          quantity: item.quantity,
          type: item.type,
          pizzaCount: item.pizzaCount,
        }));
        const linkRes = await fetch('/api/crowdfund/contribute', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            items: linkItems,
            funderName: funderName || undefined,
            discountCode: trimmedDiscount || undefined,
          }),
        });
        if (linkRes.ok) {
          const linkData = await linkRes.json().catch(() => ({}));
          if (linkData?.comped) {
            await finalizeWithoutPayment(linkData.discount || discountFromState);
            return;
          }
          if (linkData?.url) {
            const itemsForStorage = normalizedItems.map((item) => ({
              name: item.name,
              type: item.type,
              pizzaCount: item.pizzaCount,
              quantity: item.quantity,
            }));
            rememberPendingContribution(
              itemsForStorage,
              funderName?.trim() || '',
              trimmedDiscount || ''
            );
            notifyToast('Redirecting to secure checkout...', { type: 'success' });
            window.location.assign(linkData.url);
            return;
          }
        }
      } catch (linkErr) {
        devConsole.warn('[square] [crowdfunding] payment link attempt failed', linkErr);
      }

      let token;
      try {
        token = await tokenizeCard();
      } catch (tokErr) {
        throw new Error(tokErr?.message || 'Card not ready');
      }

      const payload = {
        items: checkoutItemsPayload,
        funderName,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        notes: notes || undefined,
        rewardPreference,
        notify,
        token,
        pizzaQty,
        discountCode: trimmedDiscount || undefined,
      };
      const res = await fetch('/api/crowdfund/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        let msg = data.error || 'Checkout failed';
        if (typeof msg === 'string' && msg.startsWith('[')) {
          try {
            const parsed = JSON.parse(msg);
            if (Array.isArray(parsed) && parsed[0]?.code) {
              msg = `Square error: ${parsed[0].code}${parsed[0].detail ? ' - ' + parsed[0].detail : ''}`;
            }
          } catch (_) {
            /* ignore parse */
          }
        }
        throw new Error(msg);
      }
      if (data?.comped) {
        await finalizeWithoutPayment(data.discount || discountFromState);
        return;
      }
      setConfirmMsg('Thanks! Your contribution has been processed.');
      setSquareDiscountCode('');
      setDiscountState({ status: 'idle', code: '', discount: null, message: '' });
      notifyToast('Payment complete. Thanks for fueling pizza!', { type: 'success' });
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

  // Featured public events (separate from campaign reward pickup events)
  const featuredPublicEvents = useMemo(() => {
    const rawFeatured = Array.isArray(campaignData?.featuredPublicEvents) ? campaignData.featuredPublicEvents : [];
    if (!rawFeatured.length) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return rawFeatured
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
    const stillExists = upcomingEvents.some(
      (ev) => (ev._key || ev._id) === (eventModal._key || eventModal._id)
    );
    if (!stillExists) {
      setEventModal(null);
    }
  }, [eventModal, upcomingEvents]);

  const formatListDate = useCallback(
    (event) => {
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
    },
    [parseEventDate]
  );

  const formatModalDate = useCallback(
    (event) => {
      const start = parseEventDate(event?.startDate);
      const end = parseEventDate(event?.endDate);
      if (!start) return '';
      const currentYear = new Date().getFullYear();
      const baseOptions = { weekday: 'short', month: 'short', day: 'numeric' };
      const includeYearStart =
        start.getFullYear() > currentYear || (end && end.getFullYear() !== start.getFullYear());
      const startLabel = new Intl.DateTimeFormat(
        'en-US',
        includeYearStart ? { ...baseOptions, year: 'numeric' } : baseOptions
      ).format(start);
      if (end && end.getTime() !== start.getTime()) {
        const includeYearEnd =
          end.getFullYear() > currentYear || end.getFullYear() !== start.getFullYear();
        const endLabel = new Intl.DateTimeFormat(
          'en-US',
          includeYearEnd ? { ...baseOptions, year: 'numeric' } : baseOptions
        ).format(end);
        return `${startLabel} - ${endLabel}`;
      }
      return startLabel;
    },
    [parseEventDate]
  );

  const hasEvents = upcomingEvents.length > 0;

  // --- Pizza-specific values (prefer pizza fields, fallback to legacy money values) ---
  const publishedPizzasSold = (() => {
    const candidates = [campaignData?.pizzasSold, campaignData?.piesSold];
    for (const candidate of candidates) {
      if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate >= 0) {
        return candidate;
      }
    }
    return null;
  })();
  const basePizzaGoal = (() => {
    if (
      typeof campaignData?.pizzaGoal === 'number' &&
      Number.isFinite(campaignData.pizzaGoal) &&
      campaignData.pizzaGoal > 0
    ) {
      return campaignData.pizzaGoal;
    }
    if (
      typeof campaignData?.goal === 'number' &&
      Number.isFinite(campaignData.goal) &&
      campaignData.goal > 0
    ) {
      return campaignData.goal;
    }
    return 1000;
  })();
  const fallbackPizzasBase = toNonNegativeNumber(campaignData?.raisedAmount) ?? 0;

  let pizzasSold = publishedPizzasSold ?? fallbackPizzasBase;
  if (summaryTotalsAvailable) {
    pizzasSold = summaryPizzas;
  }
  if (Number.isFinite(livePizzas)) {
    pizzasSold = livePizzas;
  }

  const usingPublishedFallback =
    !Number.isFinite(livePizzas) && !summaryTotalsAvailable && Number.isFinite(publishedPizzasSold);

  const showLiveTotalsFallbackNotice = usingPublishedFallback;

  const pizzaGoal = Number.isFinite(liveGoal) && liveGoal > 0
    ? liveGoal
    : Number.isFinite(summaryGoal) && summaryGoal > 0
      ? summaryGoal
      : basePizzaGoal; // default goal to 1000 pizzas

  let backers = baseBackers;
  if (summaryBackersAvailable) {
    backers = Math.max(summaryBackers, baseBackers);
  }
  if (Number.isFinite(liveBackers)) {
    backers = Math.max(liveBackers, baseBackers);
  }
  const effectiveEndDate = useMemo(() => {
    const fallback = CAMPAIGN_EXTENSION_DEADLINE;
    if (!endDate) return fallback;

    const parsed = new Date(endDate);
    if (Number.isNaN(parsed.getTime())) {
      return fallback;
    }

    if (fallback && parsed < fallback) {
      return fallback;
    }

    return parsed;
  }, [endDate]);

  const daysLeft = (() => {
    if (!effectiveEndDate) return 0;
    const diffMs = effectiveEndDate.getTime() - Date.now();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(days, 0);
  })();
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
    if (Array.isArray(blk.children)) return blk.children.map((c) => c.text || '').join('');
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
        <meta name="description" content={plainTextFromPortable(description).slice(0, 160)} />
      </Helmet>

      <div className="space-y-16 mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
        {/* --- Page Header --- */}
        <div>
          <h1 className="heading-display heading-balance">{title}</h1>
          {/* Short description rendered with Portable Text (supports paragraphs and formatting) */}
          <div className="mt-6 md:mt-8 text-body max-w-2xl">
            {taglineBlock && (
              <h2 className="heading-lg text-neutral-600">{blockText(taglineBlock)}</h2>
            )}
            {description &&
              (Array.isArray(description) ? (
                <PortableText value={remainingDescriptionBlocks} components={portableComponents} />
              ) : (
                <PortableText
                  value={toPortableBlocks(description)}
                  components={portableComponents}
                />
              ))}
          </div>
        </div>

        {/* --- Main Content Grid --- */}
        <div className="grid grid-cols-1 lg:grid-cols-5 lg:gap-16">
          {/* --- Left Column (Media & Content Tabs) --- */}
          <div className="lg:col-span-3 space-y-8 order-2 lg:order-1">
            {/* Override hero image per request */}
            <img
              src={'/gallery/5Z0A5718-Edit.jpg'}
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
              {activeTab === 'story' && story.length > 0 && (
                <PortableText value={story} components={portableComponents} />
              )}
              {activeTab === 'updates' && (
                <div className="space-y-8">
                  {updates.map((update, index) => {
                    // Fix: Handle publishedAt which might be a string, ISO date, or timestamp
                    let publishDate;
                    try {
                      const rawDate = update.publishedAt;
                      if (typeof rawDate === 'string') {
                        // ISO string or date string
                        publishDate = new Date(rawDate);
                      } else if (typeof rawDate === 'number') {
                        // Unix timestamp - could be in seconds or milliseconds
                        // If it's a small number (less than year 2000 in ms), it's likely in seconds
                        publishDate = rawDate < 946684800000 
                          ? new Date(rawDate * 1000) 
                          : new Date(rawDate);
                      } else {
                        publishDate = new Date();
                      }
                      
                      // Sanity check: if date is before 2000, it's probably wrong
                      if (publishDate.getFullYear() < 2000) {
                        publishDate = new Date();
                      }
                    } catch (e) {
                      publishDate = new Date();
                    }

                    return (
                      <div key={index} className="p-4 border-l-4 border-gray-200">
                        <div className="mt-0">
                          <SectionHeader overline="Update" title={update.title} />
                        </div>
                        <p className="text-sm text-gray-500 mb-2">
                          {publishDate.toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                        <PortableText value={update.body} components={portableComponents} />
                      </div>
                    );
                  })}
                </div>
              )}
              {activeTab === 'goals' && (
                <div className="space-y-6">
                  <PrioritiesPie />
                  {campaignData?.goals ? (
                    Array.isArray(campaignData.goals) ? (
                      <PortableText value={campaignData.goals} components={portableComponents} />
                    ) : (
                      <PortableText
                        value={toPortableBlocks(campaignData.goals)}
                        components={portableComponents}
                      />
                    )
                  ) : (
                    <p className="text-gray-500">
                      No goals content yet. Add content in the Goals field in Sanity Studio.
                    </p>
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
                  {galleryError && <p className="text-sm text-red-600">{galleryError}</p>}
                  {!galleryLoading && !galleryError && galleryImages.length === 0 && (
                    <p className="text-sm text-gray-500">
                      No images found yet. Tag Cloudinary images with 'pizza' or 'pie'.
                    </p>
                  )}
                  <div className="mt-4 columns-2 md:columns-3 lg:columns-4 gap-3 [column-fill:_balance]">
                    {galleryImages.map((img) => (
                      <figure
                        key={img.asset_id || img.public_id}
                        className="mb-3 break-inside-avoid rounded-lg overflow-hidden shadow-sm bg-neutral-100"
                      >
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

            {hasEvents && (
              <div className="border rounded-lg p-4 bg-white shadow-sm">
                <h3 className="text-lg font-semibold mb-2">upcoming campaign events.</h3>
                <ul className="divide-y">
                  {upcomingEvents.map((ev) => {
                    const dateLabel = formatListDate(ev);
                    const detailLabel = [dateLabel, ev.foodType || 'Food']
                      .filter(Boolean)
                      .join(' - ');
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
            )}

            {featuredPublicEvents.length > 0 && (
              <div className="border rounded-lg p-4 bg-white shadow-sm">
                <h3 className="text-lg font-semibold mb-2">featured public events.</h3>
                <ul className="divide-y">
                  {featuredPublicEvents.map((ev) => {
                    const dateLabel = formatListDate(ev);
                    const detailLabel = [dateLabel, ev.foodType || 'Event']
                      .filter(Boolean)
                      .join(' - ');
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
            )}
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
              {showLiveTotalsFallbackNotice && (
                <p className="text-xs text-amber-600">
                  Live totals temporarily unavailable; showing published numbers for now.
                </p>
              )}
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
                  {formNotice ||
                    'Online checkout is temporarily unavailable. Email hello@localeffortfood.com to pledge.'}
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
                          setReferralState({
                            status: 'checking',
                            valid: false,
                            participant: null,
                            code,
                          });
                          try {
                            const resp = await fetch('/api/referrals/validate', {
                              method: 'POST',
                              headers: { 'content-type': 'application/json' },
                              body: JSON.stringify({ code }),
                            });
                            const data = await resp.json().catch(() => ({}));
                            if (resp.ok && data && data.valid) {
                              setReferralState({
                                status: 'ok',
                                valid: true,
                                participant: data.participant || null,
                                code,
                              });
                            } else {
                              setReferralState({
                                status: 'ok',
                                valid: false,
                                participant: null,
                                code,
                              });
                            }
                          } catch (_) {
                            setReferralState({
                              status: 'error',
                              valid: false,
                              participant: null,
                              code,
                            });
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
                      {referralState.participant?.name
                        ? ` for ${referralState.participant.name}`
                        : ''}
                      .
                    </p>
                  )}
                  {referralState.status === 'ok' && !referralState.valid && (
                    <p className="text-sm text-red-600">That code is not valid.</p>
                  )}
                  {referralState.status === 'error' && (
                    <p className="text-sm text-red-600">Unable to validate that code right now.</p>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="cf-square-discount">Square discount code (optional)</Label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        id="cf-square-discount"
                        placeholder="Discount code"
                        autoComplete="off"
                        value={squareDiscountCode}
                        onChange={(e) => setSquareDiscountCode(e.target.value)}
                        className="sm:flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="sm:w-32"
                        disabled={!trimmedDiscountCode || discountState.status === 'checking'}
                        onClick={handleDiscountApply}
                      >
                        {discountState.status === 'checking' ? 'Checking...' : 'Apply'}
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500">
                      Apply a complimentary or promo code before checking out.
                    </p>
                    {discountState.status === 'applied' && (
                      <p className="text-sm text-emerald-700">
                        {discountState.discount?.label || DEFAULT_DISCOUNT_LABEL}
                        {discountedTotalCents <= 0 ? ' — no payment required.' : ' applied.'}
                      </p>
                    )}
                    {discountState.status === 'invalid' && (
                      <p className="text-sm text-red-600">
                        {discountState.message ||
                          'That code is not valid for this crowdfunding campaign.'}
                      </p>
                    )}
                    {discountState.status === 'error' && (
                      <p className="text-sm text-red-600">
                        {discountState.message ||
                          'Unable to validate that discount code right now.'}
                      </p>
                    )}
                    <Input
                      id="cf-square-discount"
                      placeholder="Discount code"
                      autoComplete="off"
                      value={squareDiscountCode}
                      onChange={(e) => setSquareDiscountCode(e.target.value)}
                    />
                    <p className="text-xs text-slate-500">
                      We'll include this code with your secure Square checkout.
                    </p>
                  </div>
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
                    <span className="text-sm font-semibold text-slate-700">
                      Preferred reward setting
                    </span>
                    <fieldset
                      className="grid gap-2 sm:grid-cols-2"
                      role="group"
                      aria-label="Preferred reward setting"
                    >
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
                      className={cn(
                        'border rounded-md p-4 min-h-[88px]',
                        requiresPayment ? 'bg-white' : 'border-dashed bg-slate-50 flex items-center'
                      )}
                      aria-label="Card payment form"
                    >
                      {requiresPayment ? (
                        <>
                          {!cardReady && !cardError && !paymentsError && (
                            <p className="text-sm text-gray-500">
                              {paymentsLoading
                                ? 'Loading secure payment form...'
                                : 'Preparing secure payment form...'}
                            </p>
                          )}
                          {(cardError || paymentsError) && (
                            <p className="text-sm text-red-600">{cardError || paymentsError}</p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-slate-600">
                          No payment required for this contribution.
                        </p>
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
                      paying ||
                      (requiresPayment && (!cardReady || !!cardError || !!paymentsError)) ||
                      !emailValid ||
                      !phoneValid
                    }
                    className="w-full text-lg h-12"
                  >
                    {paying
                      ? 'Processing...'
                      : requiresPayment
                        ? `Buy ${discountedTotalLabel}`
                        : 'Complete contribution'}
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
                      <Label
                        htmlFor="cf-subscribe-email"
                        className="text-sm font-medium text-white"
                      >
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
                        className="border-slate-300 bg-white text-slate-900 placeholder:text-slate-500"
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
                      {subscribeStatus === 'loading' ? 'Subscribing...' : 'Subscribe'}
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
                  <p>
                    Payments ready: {payments ? 'true' : 'false'} | Loading:{' '}
                    {paymentsLoading ? 'true' : 'false'}
                  </p>
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

            </div>
          </div>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 md:p-10 shadow-sm">
          <div className="mx-auto flex max-w-4xl flex-col gap-10 md:flex-row">
            <div className="md:w-1/2 space-y-6">
              <SectionHeader overline="Share the pizza love" title="Pizza feedback" />
              <p className="text-base text-slate-600">
                Leave a quick note about what you enjoy most. Your kind words help us keep the pizza
                party going for our neighbors.
              </p>
              <form className="space-y-4" onSubmit={handleFeedbackSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="pizza-feedback-rating">How was your pizza?</Label>
                  <select
                    id="pizza-feedback-rating"
                    value={feedbackRating}
                    onChange={(event) => {
                      setFeedbackRating(Number(event.target.value));
                      if (feedbackStatus !== 'idle') {
                        setFeedbackStatus('idle');
                        setFeedbackNotice('');
                      }
                    }}
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    {[5, 4, 3, 2, 1].map((value) => (
                      <option key={value} value={value}>{`${value} / 5`}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500">
                    5 = legendary pizza party, 1 = needs another try.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pizza-feedback-message">What made your pizza special?</Label>
                  <Textarea
                    id="pizza-feedback-message"
                    value={feedbackMessage}
                    onChange={(event) => {
                      setFeedbackMessage(event.target.value);
                      if (feedbackStatus !== 'idle') {
                        setFeedbackStatus('idle');
                        setFeedbackNotice('');
                      }
                    }}
                    placeholder="The wood-fired char and fresh basil blew me away!"
                    className="min-h-[120px]"
                  />
                </div>
                {feedbackNotice && (
                  <p
                    className={
                      feedbackStatus === 'error'
                        ? 'text-sm text-red-600'
                        : 'text-sm text-emerald-600'
                    }
                    aria-live="polite"
                  >
                    {feedbackNotice}
                  </p>
                )}
                <Button type="submit" className="w-full sm:w-auto" disabled={feedbackSubmitting}>
                      {feedbackSubmitting ? 'Sharing pizza love...' : 'Share feedback'}
                </Button>
              </form>
            </div>
            <div className="md:w-1/2 space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Recent happy pizza thoughts</h3>
              {feedbackLoading ? (
                <p className="text-sm text-slate-500">Loading pizza love...</p>
              ) : feedbackEntries.length > 0 ? (
                <ul className="space-y-4">
                  {feedbackEntries.map((entry) => (
                    <li
                      key={entry.id}
                      className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4 shadow-sm"
                    >
                      <p className="text-sm text-amber-900">“{entry.comment}”</p>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
                        {Number.isFinite(entry.rating)
                          ? `Rating: ${'⭐'.repeat(Math.max(1, Math.min(5, entry.rating)))} (${entry.rating}/5)`
                          : 'Rating: shared anonymously'}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">
                  {feedbackFetchError
                    ? "We couldn't load recent pizza notes. Share yours to kick things off!"
                    : 'No pizza notes yet—be the first to share your experience!'}
                </p>
              )}
              {feedbackFetchError && <p className="text-xs text-red-600">{feedbackFetchError}</p>}
            </div>
          </div>
        </section>
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
