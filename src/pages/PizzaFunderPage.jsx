import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { PortableText } from '@portabletext/react';
import { groqFetch } from '../sanityClient.js';
import { PizzaProgress } from '../components/pizzafunder/PizzaProgress';
import { PizzaPledgeForm } from '../components/pizzafunder/PizzaPledgeForm';
import { FeedbackForm } from '../components/pizzafunder/FeedbackForm';
import { FeedbackList } from '../components/pizzafunder/FeedbackList';
import { useToast } from '../components/common/ToastProvider';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { createPortableTextComponents } from '../utils/portableTextComponents';
import PrioritiesPie from '../components/crowdfunding/PrioritiesPie.jsx';
import Separator from '../components/ui/Separator';
import { cn } from '../lib/utils';
import { generateEventListSchema, generateFAQSchema } from '../utils/generateEventSchema';

/**
 * Campaign extension deadline (matches CrowdfundingPage)
 */
const CAMPAIGN_EXTENSION_DATE_STRING = '2025-12-10T23:59:59-06:00';
const CAMPAIGN_EXTENSION_DEADLINE = (() => {
  const parsed = new Date(CAMPAIGN_EXTENSION_DATE_STRING);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
})();

/**
 * Event status labels and styling
 */
const EVENT_STATUS_LABELS = {
  scheduled: 'Scheduled',
  soldOut: 'Sold out',
  postponed: 'Postponed',
  cancelled: 'Cancelled',
};

const EVENT_STATUS_STYLES = {
  scheduled: 'border-emerald-200 bg-emerald-100 text-emerald-700',
  soldOut: 'border-rose-200 bg-rose-100 text-rose-700',
  postponed: 'border-amber-200 bg-amber-100 text-amber-700',
  cancelled: 'border-slate-300 bg-slate-200 text-slate-600',
  default: 'border-slate-200 bg-slate-100 text-slate-600',
};

const EventBadge = ({ children, variant = 'default' }) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium uppercase tracking-wide',
      EVENT_STATUS_STYLES[variant] || EVENT_STATUS_STYLES.default
    )}
  >
    {children}
  </span>
);

/**
 * Event Details Dialog Modal
 */
const EventDialog = ({
  event,
  open,
  onOpenChange,
  formatModalDate,
  deriveSummary,
  portableComponents,
}) => {
  if (!open || !event) {
    return null;
  }

  const heroImage =
    typeof event?.heroImage === 'string'
      ? event.heroImage
      : event?.heroImage?.url || event?.heroImageUrl;
  const heroAlt = event?.heroImageAlt || event?.heroImage?.alt || event?.location || 'Event image';
  const hasHeroImage = Boolean(heroImage);
  const dateLabel = typeof formatModalDate === 'function' ? formatModalDate(event) : '';
  const summary = typeof deriveSummary === 'function' ? deriveSummary(event) : '';
  const hasPortableDescription = Array.isArray(event?.description) && event.description.length > 0;
  const plainDescription = !hasPortableDescription && typeof event?.description === 'string'
    ? event.description
    : '';
  const statusVariant = event?.status && EVENT_STATUS_LABELS[event.status] ? event.status : 'default';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-w-3xl p-0',
          'max-h-[90vh] sm:max-h-[85vh]',
          'overflow-y-auto',
          '[&_[data-radix-dialog-close]]:z-20'
        )}
      >
        <div
          className={cn(
            'flex w-full flex-col',
            hasHeroImage ? 'md:flex-row' : ''
          )}
        >
          {hasHeroImage && (
            <div className="relative h-56 w-full flex-shrink-0 overflow-hidden bg-slate-100 md:h-auto md:w-64 md:min-h-[400px]">
              <img
                src={heroImage}
                alt={heroAlt}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          )}
          <div className="flex-1 p-6">
            <div className="space-y-6 pb-6">
              <div className="sticky top-0 z-10 -mx-6 mb-4 border-b border-slate-200 bg-white/95 px-6 pb-4 pt-4 backdrop-blur supports-[backdrop-filter]:backdrop-blur">
                <DialogHeader className="space-y-2 text-left pr-10">
                  <div className="space-y-1">
                    <DialogTitle className="text-2xl font-semibold text-slate-900">
                      {event?.location}
                    </DialogTitle>
                    {dateLabel && (
                      <DialogDescription className="text-sm font-medium text-slate-700">
                        {dateLabel}
                      </DialogDescription>
                    )}
                  </div>
                  {event?.timingNote && <p className="text-sm text-slate-600">{event.timingNote}</p>}
                  {event?.locationDetails && (
                    <p className="text-sm text-slate-600">{event.locationDetails}</p>
                  )}
                </DialogHeader>
              </div>

              {(event?.foodType || (event?.status && event.status !== 'scheduled')) && (
                <div className="flex flex-wrap gap-2">
                  {event?.foodType && <EventBadge>{event.foodType}</EventBadge>}
                  {event?.status && event.status !== 'scheduled' && (
                    <EventBadge variant={statusVariant}>
                      {EVENT_STATUS_LABELS[event.status] || event.status}
                    </EventBadge>
                  )}
                </div>
              )}

              {event?.tagline && (
                <p className="text-lg font-medium text-slate-800">{event.tagline}</p>
              )}
              {summary && !event?.tagline && (
                <p className="text-base text-slate-700">{summary}</p>
              )}

              <Separator className="bg-slate-200" />

              {hasPortableDescription ? (
                <div className="prose prose-slate max-w-none text-sm leading-relaxed">
                  <PortableText value={event.description} components={portableComponents} />
                </div>
              ) : (
                plainDescription && (
                  <p className="text-sm leading-relaxed text-slate-600">{plainDescription}</p>
                )
              )}

              {event?.ticketsUrl && (
                <div className="pt-2">
                  <a
                    href={event.ticketsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-md bg-orange-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-600 focus:ring-offset-2"
                  >
                    {event?.ctaLabel || 'Get tickets'}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * PizzaFunderPage - Modern, Sanity-powered pizza crowdfunding page
 * Enhanced with Sanity CMS integration and modern design
 * Pattern: Similar to CrowdfundingPage but simplified for single campaign focus
 */
const PizzaFunderPage = () => {
  // State - simple and minimal
  const [campaignData, setCampaignData] = useState(null);
  const [status, setStatus] = useState({ pizzas: 0, backers: 0, goal: 1000, source: 'loading' });
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState({ campaign: true, status: true, feedback: true });
  const [submitting, setSubmitting] = useState({ pledge: false, feedback: false });
  const [showPledgeForm, setShowPledgeForm] = useState(false);
  const [pledgeSuccess, setPledgeSuccess] = useState(false);
  const [lastPledgeData, setLastPledgeData] = useState(null);
  const [activeTab, setActiveTab] = useState('story');
  const [selectedTier, setSelectedTier] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // Gallery state
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryError, setGalleryError] = useState('');
  const galleryLoadedRef = useRef(false);
  
  // Email subscription state
  const [subscribeEmail, setSubscribeEmail] = useState('');
  const [subscribeStatus, setSubscribeStatus] = useState('idle');
  const [subscribeMessage, setSubscribeMessage] = useState('');

  const { toast } = useToast();

  // Safe toast wrapper to prevent "is not a function" errors
  const showToast = (title, description, variant = undefined) => {
    try {
      if (toast && typeof toast === 'function') {
        toast({ title, description, variant });
      }
    } catch (err) {
      console.error('Toast error:', err);
    }
  };

  // Portable Text components
  const portableComponents = useMemo(() => createPortableTextComponents(), []);

  // Parse and filter upcoming events
  const parseEventDate = useCallback((value) => {
    if (!value) return null;
    const iso = value.includes('T') ? value : `${value}T00:00:00`;
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? null : date;
  }, []);

  const upcomingEvents = useMemo(() => {
    const rawEvents = Array.isArray(campaignData?.events) ? campaignData.events : [];
    const importedEvents = Array.isArray(campaignData?.featuredPublicEvents)
      ? campaignData.featuredPublicEvents.map((ev) => ({ ...ev, _imported: true }))
      : [];
    const merged = [...rawEvents, ...importedEvents].filter(Boolean);
    
    if (!merged.length) return [];
    
    const seen = new Set();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return merged
      .map((ev, index) => {
        const identity = ev?._id || ev?._key || `${ev?.location || 'event'}-${ev?.startDate || index}`;
        if (seen.has(identity)) return null;
        seen.add(identity);
        return {
          ...ev,
          _key: ev?._key || ev?._id || `event-${index}`,
        };
      })
      .filter(Boolean)
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

  // Generate structured data for SEO
  const eventSchemas = useMemo(() => 
    generateEventListSchema(upcomingEvents, campaignData),
    [upcomingEvents, campaignData]
  );

  const faqSchema = useMemo(() => 
    campaignData?.faq ? generateFAQSchema(campaignData.faq) : null,
    [campaignData]
  );

  const description = useMemo(() => {
    if (campaignData?.description?.[0]?.children?.[0]?.text) {
      return campaignData.description[0].children[0].text;
    }
    return "Help us bring delicious pizza to the community! Back our pizza crowdfunding campaign.";
  }, [campaignData]);

  // Calculate effective end date (respects campaign extension)
  const effectiveEndDate = useMemo(() => {
    const fallback = CAMPAIGN_EXTENSION_DEADLINE;
    if (!campaignData?.endDate) return fallback;

    const parsed = new Date(campaignData.endDate);
    if (Number.isNaN(parsed.getTime())) {
      return fallback;
    }

    if (fallback && parsed < fallback) {
      return fallback;
    }

    return parsed;
  }, [campaignData?.endDate]);

  // Calculate days left until campaign end
  const daysLeft = useMemo(() => {
    if (!effectiveEndDate) return 0;
    
    const diffMs = effectiveEndDate.getTime() - Date.now();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(days, 0);
  }, [effectiveEndDate]);

  const formatEventDate = useCallback((event) => {
    const start = parseEventDate(event?.startDate);
    if (!start) return event?.timingNote || '';
    
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return start.toLocaleDateString('en-US', options);
  }, [parseEventDate]);

  const formatModalDate = useCallback((event) => {
    const start = parseEventDate(event?.startDate);
    const end = parseEventDate(event?.endDate);
    if (!start) return '';
    
    const currentYear = new Date().getFullYear();
    const baseOptions = { weekday: 'short', month: 'short', day: 'numeric' };
    const includeYearStart = start.getFullYear() > currentYear || (end && end.getFullYear() !== start.getFullYear());
    const startLabel = new Intl.DateTimeFormat(
      'en-US',
      includeYearStart ? { ...baseOptions, year: 'numeric' } : baseOptions
    ).format(start);
    
    if (end && end.getTime() !== start.getTime()) {
      const includeYearEnd = end.getFullYear() > currentYear || end.getFullYear() !== start.getFullYear();
      const endLabel = new Intl.DateTimeFormat(
        'en-US',
        includeYearEnd ? { ...baseOptions, year: 'numeric' } : baseOptions
      ).format(end);
      return `${startLabel} - ${endLabel}`;
    }
    return startLabel;
  }, [parseEventDate]);

  const deriveEventSummary = useCallback((event) => {
    if (!event || typeof event !== 'object') {
      return '';
    }
    if (typeof event.summary === 'string' && event.summary.trim()) {
      return event.summary.trim();
    }
    if (Array.isArray(event.description)) {
      const firstBlock = event.description.find(
        (block) => block && block._type === 'block' && Array.isArray(block.children)
      );
      if (firstBlock) {
        const text = firstBlock.children
          .map((child) => (child && typeof child.text === 'string' ? child.text : ''))
          .join('')
          .trim();
        if (text) {
          return text;
        }
      }
    }
    if (typeof event.description === 'string' && event.description.trim()) {
      return event.description.trim();
    }
    return '';
  }, []);

  // Fetch campaign data from Sanity
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // Query Sanity for pizzafunder campaign data
        const query = `*[_type == "crowdfundingCampaign" && slug.current == $slug][0]{
          title,
          description,
          pizzaGoal,
          pizzasSold,
          piesSold,
          goal,
          raisedAmount,
          backers,
          endDate,
          heroImage{
            asset->{
              _id,
              url
            },
            alt
          },
          story,
          goals,
          events[]{
            _key,
            location,
            tagline,
            summary,
            startDate,
            endDate,
            timingNote,
            foodType,
            status,
            ticketsUrl,
            ctaLabel,
            locationDetails,
            "heroImage": heroImage.asset->url,
            "heroImageAlt": coalesce(heroImage.alt, location),
            description
          },
          "featuredPublicEvents": featuredPublicEvents[]->{ 
            _id, 
            location,
            tagline,
            summary,
            startDate, 
            endDate, 
            timingNote,
            foodType,
            status,
            ticketsUrl,
            ctaLabel,
            locationDetails,
            "heroImage": heroImage.asset->url,
            "heroImageAlt": coalesce(heroImage.alt, location),
            description
          },
          faq,
          "rewardTiers": rewardTiers[]->{ amount, pizzaCount, pieCount, title, description, limit, referralOnly, referralCode } | order(amount asc),
          "updates": updates[]->{ title, publishedAt, body } | order(publishedAt desc)[0...3]
        }`;

        const data = await groqFetch(query, { slug: 'local-pizza-by-local-effort-let-s-make-1000-pizzas' });
        
        if (mounted) {
          setCampaignData(data || null);
          setLoading((prev) => ({ ...prev, campaign: false }));
        }
      } catch (err) {
        console.error('Failed to load campaign data:', err);
        if (mounted) {
          setLoading((prev) => ({ ...prev, campaign: false }));
        }
      }
    })();

    return () => { mounted = false; };
  }, []);

  // Fetch funding status on mount
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await fetch('/api/pizzafunder/status');
        const data = res.ok ? await res.json() : { pizzas: 0, backers: 0, goal: 1000, source: 'error' };
        if (mounted) {
          setStatus(data);
          setLoading((prev) => ({ ...prev, status: false }));
        }
      } catch {
        if (mounted) {
          setStatus({ pizzas: 0, backers: 0, goal: 1000, source: 'error' });
          setLoading((prev) => ({ ...prev, status: false }));
        }
      }
    })();

    return () => { mounted = false; };
  }, []);

  // Fetch feedback on mount
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await fetch('/api/pizzafunder/feedback?limit=8');
        const data = res.ok ? await res.json() : { feedback: [] };
        if (mounted) {
          setFeedback(data.feedback || []);
          setLoading((prev) => ({ ...prev, feedback: false }));
        }
      } catch {
        if (mounted) {
          setFeedback([]);
          setLoading((prev) => ({ ...prev, feedback: false }));
        }
      }
    })();

    return () => { mounted = false; };
  }, []);

  // Handle pledge form submission (collects data, shows payment)
  // Handle pledge form submission (now receives tokenized payment data)
  const handlePledgeSubmit = async (data) => {
    setSubmitting((prev) => ({ ...prev, pledge: true }));

    try {
      // Call backend to process payment via Square API
      const res = await fetch('/api/pizzafunder/pledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data), // data already includes sourceId from Square tokenization
      });

      if (!res.ok) {
        const result = await res.json().catch(() => ({ error: 'Failed to process pledge' }));
        throw new Error(result.error || `Server error: ${res.status}`);
      }

      const result = await res.json();

      if (result.success) {
        // Store pledge data for success display
        setLastPledgeData({
          pizzaCount: data.pizzaCount,
          funderName: data.funderName,
          email: data.email,
          discountCode: data.discountCode,
          total: data.totalCents / 100,
        });

        // Show success message with details
        const pizzaText = data.pizzaCount === 1 ? 'pizza' : 'pizzas';
        const discountMsg = data.discountCode 
          ? ` Your discount code "${data.discountCode}" has been applied.`
          : '';
        
        showToast(
          '🍕 Thank You for Your Support!', 
          `Your pledge for ${data.pizzaCount} ${pizzaText} was successful!${discountMsg} You'll receive a confirmation email shortly at ${data.email}.`
        );

        // Refresh status
        try {
          const statusRes = await fetch('/api/pizzafunder/status');
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            setStatus(statusData);
          }
        } catch (statusErr) {
          console.error('[handlePledgeSubmit] Failed to refresh status:', statusErr);
        }

        // Show success state
        setPledgeSuccess(true);
        setShowPledgeForm(false);
        setSelectedTier(null);
      } else {
        throw new Error(result.error || 'Payment failed');
      }
    } catch (error) {
      console.error('[handlePledgeSubmit] Error:', error);
      // Re-throw so PizzaPledgeForm can handle showing the toast
      throw error;
    } finally {
      setSubmitting((prev) => ({ ...prev, pledge: false }));
    }
  };

  // Handle feedback submission
  const handleFeedbackSubmit = async (data) => {
    setSubmitting((prev) => ({ ...prev, feedback: true }));

    try {
      const res = await fetch('/api/pizzafunder/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        showToast('Thank you!', 'Your feedback has been shared!');

        // Add to local list
        setFeedback((prev) => [result.feedback, ...prev].slice(0, 8));
      } else {
        throw new Error(result.error || 'Failed to submit feedback');
      }
    } catch (error) {
      showToast('Failed to submit', error.message || 'Please try again', 'destructive');
    } finally {
      setSubmitting((prev) => ({ ...prev, feedback: false }));
    }
  };

  // Handle email subscription
  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!subscribeEmail || subscribeStatus === 'loading') return;

    setSubscribeStatus('loading');
    setSubscribeMessage('');

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: subscribeEmail }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        setSubscribeStatus('success');
        setSubscribeMessage('Thanks for subscribing!');
        setSubscribeEmail('');
      } else {
        throw new Error(result.error || 'Subscription failed');
      }
    } catch (error) {
      setSubscribeStatus('error');
      setSubscribeMessage(error.message || 'Failed to subscribe. Please try again.');
    }
  };

  // Lazy load gallery images when tab is activated
  useEffect(() => {
    if (activeTab !== 'gallery' || galleryLoadedRef.current) {
      return undefined;
    }

    galleryLoadedRef.current = true;
    setGalleryLoading(true);
    setGalleryError('');

    const endpoints = [
      '/api/search-images?query=pizza&per_page=50',
      '/api/search-images?query=pie&per_page=50',
    ];

    let cancelled = false;

    const loadGallery = async () => {
      try {
        const responses = await Promise.all(
          endpoints.map(async (url) => {
            try {
              const res = await fetch(url, { headers: { Accept: 'application/json' } });
              let data = null;
              try {
                data = await res.json();
              } catch (parseError) {
                data = null;
              }
              return { ok: res.ok, data };
            } catch (networkError) {
              return { ok: false, data: null, error: networkError };
            }
          })
        );

        if (cancelled) {
          return;
        }

        const merged = [];
        const seen = new Set();
        let hadNetworkError = false;

        responses.forEach(({ ok, data, error }) => {
          if (error) {
            hadNetworkError = true;
          }
          if (!ok || !data || !Array.isArray(data.images)) {
            return;
          }

          data.images.forEach((img) => {
            const id = img?.asset_id || img?.public_id;
            if (!id || seen.has(id)) {
              return;
            }
            seen.add(id);
            merged.push(img);
          });
        });

        if (merged.length === 0) {
          setGalleryError(hadNetworkError ? 'Unable to load gallery images right now.' : 'No images found yet.');
        }

        setGalleryImages(merged);
      } catch (error) {
        if (!cancelled) {
          setGalleryError(error?.message || 'Failed to load images');
        }
      } finally {
        if (!cancelled) {
          setGalleryLoading(false);
        }
      }
    };

    loadGallery();

    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  return (
    <div className="space-y-12 mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-12">
      <Helmet>
        <title>{campaignData?.title || 'Pizza Funder'} | Local Effort</title>
        <meta 
          name="description" 
          content={description} 
        />
        <link rel="canonical" href="https://localeffortfood.com/pizzafunder" />
        
        {/* Open Graph */}
        <meta property="og:title" content={campaignData?.title || 'Pizza Funder'} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={campaignData?.heroImage?.asset?.url || 'https://localeffortfood.com/images/pizza-default.jpg'} />
        <meta property="og:url" content="https://localeffortfood.com/pizzafunder" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Local Effort" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={campaignData?.title || 'Pizza Funder'} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={campaignData?.heroImage?.asset?.url || 'https://localeffortfood.com/images/pizza-default.jpg'} />
        
        {/* Event Structured Data */}
        {eventSchemas && eventSchemas.length > 0 && (
          <script type="application/ld+json">
            {JSON.stringify(eventSchemas)}
          </script>
        )}
        
        {/* FAQ Structured Data */}
        {faqSchema && (
          <script type="application/ld+json">
            {JSON.stringify(faqSchema)}
          </script>
        )}
      </Helmet>

      {/* Title Section */}
      {!loading.campaign && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-4">
            {campaignData?.title || '🍕 Pizza Funder'}
          </h1>
          {campaignData?.description && (
            <div className="text-lg text-neutral-700 max-w-3xl mx-auto prose">
              <PortableText value={campaignData.description} components={portableComponents} />
            </div>
          )}
        </motion.div>
      )}

      {/* Compact Progress Section */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="p-6 shadow-lg border-2 border-orange-100 bg-gradient-to-br from-white to-orange-50/30">
          <PizzaProgress
            pizzas={status.pizzas}
            backers={status.backers}
            goal={campaignData?.pizzaGoal || status.goal}
            daysLeft={daysLeft}
          />
        </Card>
      </motion.div>

      {/* Reward Tiers Section */}
      {campaignData?.rewardTiers && campaignData.rewardTiers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-4"
        >
          <h2 className="text-3xl font-bold text-neutral-900">Choose Your Reward</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaignData.rewardTiers.map((tier, index) => {
              const isSelected = selectedTier?.amount === tier.amount;
              const pizzaLabel = tier.pizzaCount ? `${tier.pizzaCount} Pizza${tier.pizzaCount > 1 ? 's' : ''}` : null;
              const pieLabel = tier.pieCount ? `${tier.pieCount} Pie${tier.pieCount > 1 ? 's' : ''}` : null;
              const displayLabel = pizzaLabel || pieLabel || `$${tier.amount}`;

              return (
                <Card
                  key={index}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    isSelected ? 'ring-2 ring-orange-500 shadow-lg' : ''
                  }`}
                  onClick={() => {
                    setSelectedTier(tier);
                    setShowPledgeForm(true);
                  }}
                >
                  <div className="p-6 space-y-3">
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-xl font-bold text-neutral-900">{displayLabel}</h3>
                      <span className="text-2xl font-bold text-orange-600">${tier.amount}</span>
                    </div>
                    <p className="text-lg font-semibold text-neutral-700">{tier.title}</p>
                    <p className="text-sm text-neutral-600">{tier.description}</p>
                    {tier.limit && (
                      <p className="text-xs font-semibold uppercase text-orange-600">
                        Limited - {tier.limit} available
                      </p>
                    )}
                    <Button
                      className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTier(tier);
                        setShowPledgeForm(true);
                      }}
                    >
                      {isSelected ? 'Selected' : 'Select This Reward'}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Content Tabs (2/3 width) */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 space-y-8"
        >
          {/* Hero Image - matching /crowdfunding style */}
          {campaignData?.heroImage?.asset?.url ? (
            <img
              src={campaignData.heroImage.asset.url}
              alt={campaignData.heroImage.alt || campaignData.title}
              className="w-full object-cover rounded-lg aspect-video bg-gray-100"
              loading="lazy"
            />
          ) : (
            <div className="w-full aspect-video bg-gradient-to-br from-orange-100 to-red-100 rounded-lg flex items-center justify-center">
              <div className="text-6xl">🍕</div>
            </div>
          )}

          {/* Featured Events Section - BEFORE tabs for SEO */}
          {upcomingEvents && upcomingEvents.length > 0 && (
            <section className="space-y-6" aria-labelledby="events-heading">
              <header className="text-center">
                <h2 id="events-heading" className="text-3xl font-bold text-neutral-900">
                  Upcoming Pizza Events
                </h2>
                <p className="text-lg text-neutral-600 mt-2">
                  Join us for pizza! Pick up your pizzas at these events.
                </p>
              </header>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingEvents.slice(0, 6).map((event) => {
                  const dateLabel = formatEventDate(event);
                  const startDate = parseEventDate(event.startDate);
                  return (
                    <Card
                      key={event._key}
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => setSelectedEvent(event)}
                      itemScope
                      itemType="https://schema.org/Event"
                    >
                      <CardContent className="p-4">
                        <h3 className="font-bold text-lg mb-2" itemProp="name">
                          {event.location}
                        </h3>
                        
                        {startDate && (
                          <time 
                            dateTime={event.startDate}
                            itemProp="startDate"
                            className="text-sm text-orange-600 font-semibold block mb-2"
                          >
                            {dateLabel}
                          </time>
                        )}
                        
                        {event.tagline && (
                          <p className="text-sm font-medium text-neutral-700 mb-2 italic">
                            {event.tagline}
                          </p>
                        )}
                        
                        {event.summary && (
                          <p className="text-sm text-neutral-600 line-clamp-2" itemProp="description">
                            {event.summary}
                          </p>
                        )}
                        
                        <div className="flex flex-wrap gap-2 mt-3">
                          {event.foodType && (
                            <span className="inline-block px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full font-medium">
                              {event.foodType}
                            </span>
                          )}
                          {event.status && event.status !== 'scheduled' && (
                            <EventBadge variant={event.status}>
                              {EVENT_STATUS_LABELS[event.status] || event.status}
                            </EventBadge>
                          )}
                        </div>
                        
                        {/* Hidden metadata for SEO */}
                        {event.locationDetails && (
                          <meta itemProp="location" content={event.locationDetails} />
                        )}
                        {event.endDate && (
                          <time itemProp="endDate" dateTime={event.endDate} className="sr-only">
                            {event.endDate}
                          </time>
                        )}
                        <meta itemProp="eventStatus" content={
                          event.status === 'cancelled' 
                            ? 'https://schema.org/EventCancelled' 
                            : event.status === 'postponed'
                            ? 'https://schema.org/EventPostponed'
                            : 'https://schema.org/EventScheduled'
                        } />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              {upcomingEvents.length > 6 && (
                <div className="text-center">
                  <Button 
                    variant="outline"
                    onClick={() => setActiveTab('events')}
                  >
                    View All {upcomingEvents.length} Events
                  </Button>
                </div>
              )}
            </section>
          )}

          <Card className="p-6 shadow-lg">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-6 mb-6">
                <TabsTrigger value="story">Story</TabsTrigger>
                <TabsTrigger value="goals">Goals</TabsTrigger>
                <TabsTrigger value="events">Events</TabsTrigger>
                <TabsTrigger value="faq">FAQ</TabsTrigger>
                <TabsTrigger value="updates">Updates</TabsTrigger>
                <TabsTrigger value="gallery">Gallery</TabsTrigger>
              </TabsList>

              {/* Story Tab */}
              <TabsContent value="story" className="mt-0 prose prose-neutral max-w-none">
                {campaignData?.story ? (
                  <PortableText value={campaignData.story} components={portableComponents} />
                ) : (
                  <>
                    <h2>Our Pizza Mission</h2>
                    <p>
                      We're on a mission to bring authentic, wood-fired pizza to our community.
                      Your support helps us purchase ingredients, equipment, and make this dream a reality.
                    </p>
                    <h3>What We're Making</h3>
                    <ul>
                      <li>Authentic Neapolitan-style pizza</li>
                      <li>Fresh, locally-sourced ingredients</li>
                      <li>Wood-fired perfection</li>
                      <li>Community gathering experiences</li>
                    </ul>
                  </>
                )}
              </TabsContent>

              {/* Goals Tab */}
              <TabsContent value="goals" className="mt-0 prose prose-neutral max-w-none">
                <div className="mb-8 not-prose">
                  <PrioritiesPie />
                </div>
                {campaignData?.goals ? (
                  <PortableText value={campaignData.goals} components={portableComponents} />
                ) : (
                  <>
                    <h2>Campaign Goals</h2>
                    <p>
                      Our goal is to make {campaignData?.pizzaGoal || status.goal} pizzas for the community.
                      Every pledge brings us closer to this goal!
                    </p>
                    <h3>How Your Support Helps</h3>
                    <ul>
                      <li>Purchase high-quality ingredients</li>
                      <li>Cover equipment and materials</li>
                      <li>Support local farmers and suppliers</li>
                      <li>Create jobs in the community</li>
                    </ul>
                  </>
                )}
              </TabsContent>

              {/* Events Tab */}
              <TabsContent value="events" className="mt-0 space-y-4">
                {upcomingEvents && upcomingEvents.length > 0 ? (
                  <>
                    <p className="text-neutral-700 mb-4">
                      Join us at these pizza parties! These are great opportunities to pick up your pizzas and meet fellow pizza lovers.
                    </p>
                    <div className="space-y-3">
                      {upcomingEvents.map((event) => {
                        const dateLabel = formatEventDate(event);
                        return (
                          <Card
                            key={event._key}
                            className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => setSelectedEvent(event)}
                          >
                            <div className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  {dateLabel && (
                                    <p className="text-sm font-semibold uppercase tracking-wide text-orange-600 mb-1">
                                      {dateLabel}
                                    </p>
                                  )}
                                  <h4 className="font-bold text-lg text-neutral-900 mb-1">{event.location}</h4>
                                  {event.tagline && (
                                    <p className="text-sm text-neutral-600 italic mb-2">{event.tagline}</p>
                                  )}
                                  {event.timingNote && (
                                    <p className="text-sm text-neutral-700">{event.timingNote}</p>
                                  )}
                                  {event.locationDetails && (
                                    <p className="text-sm text-neutral-600 mt-1">📍 {event.locationDetails}</p>
                                  )}
                                </div>
                                {event.foodType && (
                                  <span className="inline-block bg-orange-100 text-orange-800 text-xs font-semibold px-3 py-1 rounded-full ml-4">
                                    {event.foodType}
                                  </span>
                                )}
                              </div>
                              {event.summary && (
                                <p className="text-sm text-neutral-600 mt-3 line-clamp-2">{event.summary}</p>
                              )}
                              {event.ticketsUrl && (
                                <a
                                  href={event.ticketsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-block mt-3 text-sm font-medium text-orange-600 hover:text-orange-700 underline"
                                >
                                  {event.ctaLabel || 'Get Tickets'}
                                </a>
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📅</div>
                    <h3 className="text-xl font-semibold text-neutral-800 mb-2">Events Coming Soon!</h3>
                    <p className="text-neutral-600">
                      We'll announce pizza party dates and locations as we get closer to our goal. Stay tuned!
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* FAQ Tab */}
              <TabsContent value="faq" className="mt-0 space-y-6">
                {campaignData?.faq && campaignData.faq.length > 0 ? (
                  campaignData.faq.map((item, index) => (
                    <div key={index} className="pb-4 border-b border-neutral-200 last:border-0">
                      <h4 className="font-bold text-lg mb-2 text-neutral-900">{item.question}</h4>
                      <p className="text-neutral-700 leading-relaxed">{item.answer}</p>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="pb-4 border-b border-neutral-200">
                      <h4 className="font-semibold text-lg mb-2">When will pizzas be ready?</h4>
                      <p className="text-neutral-700">We're planning pizza events throughout the campaign and after we reach our goal!</p>
                    </div>
                    <div className="pb-4 border-b border-neutral-200">
                      <h4 className="font-semibold text-lg mb-2">Can I get my pizza delivered?</h4>
                      <p className="text-neutral-700">Yes! You can choose delivery, pickup, or attend a public pizza party.</p>
                    </div>
                    <div className="pb-4">
                      <h4 className="font-semibold text-lg mb-2">What if you don't reach the goal?</h4>
                      <p className="text-neutral-700">We're committed to making pizza happen! Your pledge supports the mission regardless.</p>
                    </div>
                  </>
                )}
              </TabsContent>

              {/* Updates Tab */}
              <TabsContent value="updates" className="mt-0 space-y-6">
                {campaignData?.updates && campaignData.updates.length > 0 ? (
                  campaignData.updates.map((update, index) => {
                    const publishDate = update.publishedAt ? new Date(update.publishedAt) : null;
                    return (
                      <div key={index} className="pb-6 border-b border-neutral-200 last:border-0">
                        <h3 className="font-bold text-xl mb-2 text-neutral-900">{update.title}</h3>
                        {publishDate && (
                          <p className="text-sm text-neutral-500 mb-3">
                            {publishDate.toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                        )}
                        <div className="prose prose-neutral max-w-none">
                          <PortableText value={update.body} components={portableComponents} />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-neutral-600">Campaign updates will appear here. Stay tuned!</p>
                )}
              </TabsContent>

              {/* Gallery Tab */}
              <TabsContent value="gallery" className="mt-0">
                {galleryLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <p className="text-neutral-600">Loading gallery...</p>
                  </div>
                ) : galleryError ? (
                  <div className="flex items-center justify-center h-64">
                    <p className="text-red-600">{galleryError}</p>
                  </div>
                ) : galleryImages.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {galleryImages.map((img) => (
                      <motion.div
                        key={img.public_id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="relative aspect-square overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-shadow"
                      >
                        <img
                          src={img.thumbnail_url}
                          alt={img.public_id}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <p className="text-neutral-600">No images to display yet.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </Card>
        </motion.div>

        {/* Right Column: Pledge Form (1/3 width) */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-1"
        >
          <div className="sticky top-6 space-y-6">
            {pledgeSuccess ? (
              // Success Thank You Card
              <Card className="p-8 shadow-xl bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300">
                <div className="text-center space-y-4">
                  <div className="text-6xl mb-4">✅</div>
                  <h3 className="text-2xl font-bold text-green-900">Thank You!</h3>
                  <p className="text-green-800 font-medium">
                    Your pledge for {lastPledgeData?.pizzaCount || 1} {lastPledgeData?.pizzaCount === 1 ? 'pizza' : 'pizzas'} was successful!
                  </p>
                  {lastPledgeData?.discountCode && (
                    <p className="text-sm text-green-700">
                      Discount code "{lastPledgeData.discountCode}" applied
                    </p>
                  )}
                  <div className="pt-4 border-t border-green-200">
                    <p className="text-sm text-green-800 mb-2">
                      <strong>Next Steps:</strong>
                    </p>
                    <ul className="text-sm text-green-700 space-y-1 text-left">
                      <li>✉️ Check {lastPledgeData?.email} for confirmation</li>
                      <li>📧 Watch for updates about pickup details</li>
                      <li>🍕 Get ready for authentic Local Pizza!</li>
                    </ul>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPledgeSuccess(false);
                      setLastPledgeData(null);
                    }}
                    className="w-full mt-4 border-green-300 text-green-800 hover:bg-green-100"
                  >
                    Make Another Pledge
                  </Button>
                </div>
              </Card>
            ) : !showPledgeForm ? (
              <Card className="p-8 shadow-xl bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-200">
                <div className="text-center space-y-4">
                  <div className="text-6xl mb-4">🍕</div>
                  <h3 className="text-2xl font-bold text-neutral-900">Back This Project</h3>
                  <p className="text-neutral-700">
                    Thank you for bringing authentic Local Pizza to the Midwest!
                  </p>
                  <Button
                    size="lg"
                    onClick={() => {
                      // Auto-select first reward tier if not already selected
                      if (!selectedTier && campaignData?.rewardTiers?.[0]) {
                        setSelectedTier(campaignData.rewardTiers[0]);
                      }
                      setShowPledgeForm(true);
                    }}
                    className="w-full text-lg py-6 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg"
                  >
                    I Want Pizza
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="p-6 shadow-xl">
                <PizzaPledgeForm
                  onPledge={handlePledgeSubmit}
                  loading={submitting.pledge}
                  selectedTier={selectedTier}
                />
                <Button
                  variant="ghost"
                  onClick={() => setShowPledgeForm(false)}
                  className="w-full mt-4"
                >
                  Cancel
                </Button>
              </Card>
            )}

            {/* How it Works */}
            <Card className="card space-y-4 p-6 ring-1 ring-neutral-200">
              <CardHeader className="space-y-1 px-0 pt-0">
                <CardTitle className="text-lg font-semibold text-slate-900">How it Works</CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-700">
                  <li>Order a pizza, or 2, or 5, or 10, or 15.</li>
                  <li>Select your preferred pizzas setting.</li>
                  <li>
                    You&apos;ll be able to pick up your pizzas at public events for the next 2-3 months.
                    We&apos;ll send you updates on all the pizza party fun, including private/ticketed events only for supporters.
                  </li>
                  <li>
                    For delivery, we ask for a minimum of 5 pizzas. We will reach out to schedule a delivery time.
                  </li>
                  <li>
                    We will cook the pizzas at your home with a minimum order of 15 pizzas. We&apos;ll reach out to schedule a time.
                  </li>
                </ol>
              </CardContent>
            </Card>

            {/* Email Subscription */}
            <Card className="p-6 shadow-lg bg-slate-900 text-white">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">Follow Along</CardTitle>
                <CardDescription className="text-slate-300">
                  Get updates on our pizza-making progress!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubscribe} className="space-y-4">
                  <div>
                    <Label htmlFor="subscribe-email" className="text-white">Email</Label>
                    <Input
                      id="subscribe-email"
                      type="email"
                      placeholder="your@email.com"
                      value={subscribeEmail}
                      onChange={(e) => setSubscribeEmail(e.target.value)}
                      required
                      disabled={subscribeStatus === 'loading'}
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={subscribeStatus === 'loading'}
                    className="w-full bg-orange-500 hover:bg-orange-600"
                  >
                    {subscribeStatus === 'loading' ? 'Subscribing...' : 'Subscribe'}
                  </Button>
                  {subscribeMessage && (
                    <p className={`text-sm ${subscribeStatus === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                      {subscribeMessage}
                    </p>
                  )}
                </form>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>

      {/* Feedback Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-16"
      >
        <h2 className="text-4xl font-bold text-neutral-900 mb-2 text-center">
          Pizza Love 🍕❤️
        </h2>
        <p className="text-xl text-neutral-600 mb-8 text-center">
          Share your excitement and see what others are saying!
        </p>

        <Card className="p-8 shadow-lg">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Feedback Form */}
            <div>
              <h3 className="text-2xl font-semibold text-neutral-800 mb-4">
                Share Your Thoughts
              </h3>
              <FeedbackForm
                onSubmit={handleFeedbackSubmit}
                loading={submitting.feedback}
              />
            </div>

            {/* Feedback List */}
            <div>
              <h3 className="text-2xl font-semibold text-neutral-800 mb-4">
                What People Are Saying
              </h3>
              <FeedbackList
                entries={feedback}
                loading={loading.feedback}
              />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Event Details Dialog */}
      <EventDialog
        event={selectedEvent}
        open={Boolean(selectedEvent)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedEvent(null);
          }
        }}
        formatModalDate={formatModalDate}
        deriveSummary={deriveEventSummary}
        portableComponents={portableComponents}
      />
    </div>
  );
};

export default PizzaFunderPage;
