import React, { useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import ServiceCard from '../components/common/ServiceCard';
import { motion } from 'framer-motion';
import { fadeInUp, fadeInLeft } from '../utils/animations';
import CloudinaryImage from '../components/common/cloudinaryImage'; // Import the Cloudinary image component
import { useEffect } from 'react';
import { cloudinaryConfig, heroPublicId, heroFallbackSrc, heroVersion } from '../data/cloudinaryContent';
import TestimonialsCarousel from '../components/common/TestimonialsCarousel';
import sanityClient from '../sanityClient';
import { PortableText } from '@portabletext/react';
import { TimeSlotPicker } from '../components/calendar/TimeSlotPicker';
import { portableTextComponents } from '../utils/portableTextComponents';
import SectionHeader from '../components/ui/SectionHeader';
import Separator from '../components/ui/Separator';
import GiftCardDialog from '../components/home/GiftCardDialog';
import { generateEventListSchema } from '../utils/generateEventSchema';
import lottie from 'lottie-web';
import animationData from '../assets/Social-handle.json';

const HomePage = () => {
  const navigate = useNavigate();
  // (removed pizza tracker) — fetch dynamic stats from backend or Sanity if desired

  const animationContainer = useRef(null);
  
  // Initialize Lottie animation
  useEffect(() => {
    if (animationContainer.current) {
      const anim = lottie.loadAnimation({
        container: animationContainer.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: animationData
      });
      
      return () => anim.destroy();
    }
  }, []);

  const [partners, setPartners] = useState([]);
  // Load partners from Cloudinary by tag "partner" via our serverless search endpoint
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

  // No hero carousel — use single hero image only

  const [reviews, setReviews] = useState([]);
  const [events, setEvents] = useState([]);
  const [eventModal, setEventModal] = useState(null);
  const [showBooking, setShowBooking] = useState(false);
  const [business, setBusiness] = useState(null);

  const parseEventDate = (value) => {
    if (!value) return null;
    const iso = value.includes("T") ? value : `${value}T00:00:00`;
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  // Load canonical business metadata
  useEffect(() => {
    let mounted = true;
    fetch('/business.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (mounted) setBusiness(data || null); })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  // Load external Thumbtack reviews JSON (public/reviews/thumbtack.json)
  useEffect(() => {
    let mounted = true;
    fetch('/reviews/thumbtack.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((ext) => {
        if (!mounted || !Array.isArray(ext) || !ext.length) return;
        setReviews((prev) => {
          const seen = new Set();
          const merged = [...ext, ...prev].filter((t) => {
            const k = `${(t.quote||'').trim()}|${(t.author||'').trim()}`;
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          });
          return merged;
        });
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  // Load upcoming public events from calendar API (Supabase)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/calendar/public-events');
        const data = await res.json();
        if (!mounted) return;
        // API returns array directly (not wrapped in object)
        const upcoming = (Array.isArray(data) ? data : []).filter(ev => {
          const eventDate = new Date(ev.start_date);
          const today = new Date(); today.setHours(0,0,0,0);
          return eventDate >= today;
        });
        setEvents(upcoming);
      } catch (_) { /* ignore events fetch error */ }
    })();
    return () => { mounted = false; };
  }, []);

  // Generate event schemas for SEO
  const eventSchemas = useMemo(() => 
    generateEventListSchema(events),
    [events]
  );

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

  // --- NEW: Define image data for both the component and structured data ---
  const heroImage = {
    publicId: heroPublicId,
    alt: 'Local Effort — hero',
    version: heroVersion,
  };
  const heroVersionSegment = heroImage.version ? `/v${heroImage.version}` : '';

  // --- NEW: Define the JSON-LD structured data object for SEO ---
  const imageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    contentUrl: `https://res.cloudinary.com/${cloudinaryConfig.cloudName}/image/upload/f_auto,q_auto${heroVersionSegment}/${heroImage.publicId}`,
    name: heroImage.alt,
    description: 'A sample of the professional in-home dining experience by Local Effort.',
    creator: {
      '@type': 'Organization',
      name: 'Local Effort',
    },
  };
  const homeFaqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Do you serve Minneapolis and St. Paul?',
        acceptedAnswer: { '@type': 'Answer', text: 'Yes. We regularly serve Minneapolis, St. Paul, Roseville, and the Twin Cities metro.' }
      },
      {
        '@type': 'Question',
        name: 'What types of services do you offer?',
        acceptedAnswer: { '@type': 'Answer', text: 'Personal chef dinners, weekly meal prep, and small event catering up to about 50 guests.' }
      },
      {
        '@type': 'Question',
        name: 'Do you handle dietary restrictions?',
        acceptedAnswer: { '@type': 'Answer', text: 'Absolutely. We can accommodate common restrictions and preferences with advance notice.' }
      }
    ]
  };
  // Build partner ItemList schema dynamically
  const partnersJsonLd = partners && partners.length ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Partners',
    itemListElement: partners.map((p, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: {
        '@type': 'ImageObject',
        name: p.name || `Partner ${idx + 1}`,
        contentUrl: `https://res.cloudinary.com/${cloudinaryConfig.cloudName}/image/upload/f_auto,q_auto/${p.publicId}`,
        url: p.url || undefined,
      },
    })),
  } : null;

  // --- Feedback Modal state & component ---
  const [showFeedback, setShowFeedback] = useState(false);
  const [fb, setFb] = useState({ name: '', email: '', sentiment: 'positive', message: '' });
  const [fbStatus, setFbStatus] = useState('idle'); // idle | sending | sent | error

  // --- Subscribe form component ---
  function SubscribeForm() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle'); // idle | sending | ok | error
    return (
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!email) return;
          setStatus('sending');
          try {
            const res = await fetch('/api/subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email }),
            });
            if (!res.ok) throw new Error(await res.text());
            setStatus('ok');
            setEmail('');
          } catch (_e) {
            setStatus('error');
          }
        }}
        className="mt-4 flex gap-3"
      >
        <input
          type="email"
          required
          placeholder="you@example.com"
          className="input flex-1"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Email address"
        />
        <button type="submit" className="btn btn-primary" disabled={status==='sending'}>
          {status==='sending' ? 'Subscribing…' : 'Subscribe'}
        </button>
        {status==='ok' && <span className="text-green-700 text-sm self-center">Thanks! You’re on the list.</span>}
        {status==='error' && <span className="text-red-700 text-sm self-center">Couldn’t subscribe.</span>}
      </form>
    );
  }

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
                const payload = {
                  name: fb.name,
                  email: fb.email,
                  subject: `Website feedback (${fb.sentiment})`,
                  message: fb.message,
                  type: 'feedback',
                };
                const res = await fetch('/api/messages/submit', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload),
                });
                if (!res.ok) throw new Error(await res.text());
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
                {['positive','neutral','negative'].map((s) => (
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
              <button type="submit" className="btn btn-primary" disabled={fbStatus==='sending'}>
                {fbStatus==='sending' ? 'Sending…' : 'Send feedback'}
              </button>
              {fbStatus==='sent' && <span className="text-green-700 text-sm">Thanks! Sent.</span>}
              {fbStatus==='error' && <span className="text-red-700 text-sm">Could not send. Try again.</span>}
            </div>
          </form>
        </div>
      </div>
    );
  }, [showFeedback, fb, fbStatus]);

  function EventsWidget({ asCard = false }) {
    if (!events || events.length === 0) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentYear = today.getFullYear();

    const formatListDate = (event) => {
      const start = new Date(event.start_date);
      if (!start || isNaN(start)) return '';
      const includeYear = start.getFullYear() > currentYear;
      const opts = { weekday: 'short', month: 'short', day: 'numeric' };
      if (includeYear) opts.year = 'numeric';
      return new Intl.DateTimeFormat('en-US', opts).format(start);
    };

    const formatModalDate = (event) => {
      const start = new Date(event.start_date);
      const end = event.end_date ? new Date(event.end_date) : null;
      if (!start || isNaN(start)) return '';
      const includeYearStart = start.getFullYear() > currentYear || (end && end.getFullYear() !== start.getFullYear());
      const baseOptions = { weekday: 'short', month: 'short', day: 'numeric' };
      const startLabel = new Intl.DateTimeFormat('en-US', includeYearStart ? { ...baseOptions, year: 'numeric' } : baseOptions).format(start);
      if (end && !isNaN(end) && end.getTime() !== start.getTime()) {
        const includeYearEnd = end.getFullYear() > currentYear || end.getFullYear() !== start.getFullYear();
        const endLabel = new Intl.DateTimeFormat('en-US', includeYearEnd ? { ...baseOptions, year: 'numeric' } : baseOptions).format(end);
        return `${startLabel} - ${endLabel}`;
      }
      return startLabel;
    };

    const content = (
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <h3 className="text-lg font-semibold mb-2">upcoming public events.</h3>
          <ul className="divide-y">
            {events.map((ev) => {
              const dateLabel = formatListDate(ev);
              const detailLabel = [dateLabel, ev.event_type || 'Event'].filter(Boolean).join(' - ');
              return (
                <li key={ev.id} className="py-2">
                  <button
                    className="text-left hover:underline"
                    onClick={() => setEventModal(ev)}
                  >
                    <span className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
                      <span className="font-semibold text-slate-800">{ev.title}</span>
                      <span className="text-sm text-slate-600">{detailLabel}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
    );
    if (asCard) return content;
    return (
      <div className="max-w-6xl mx-auto px-4 mt-8">
        {content}
        {eventModal && !showBooking && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-5 relative">
              <button 
                className="absolute right-3 top-3 text-sm underline" 
                onClick={() => setEventModal(null)}
              >
                Close
              </button>
              <h4 className="text-xl font-bold mb-1">{eventModal.title}</h4>
              <p className="text-sm text-gray-600 mb-3">{formatModalDate(eventModal)}</p>
              
              {/* Show location if available */}
              {eventModal.location && (
                <p className="text-sm text-gray-600 mb-2">
                  📍 {eventModal.location}
                </p>
              )}
              
              {/* Prefer Sanity rich description, fallback to plain notes or description */}
              {eventModal.sanity_data?.description && (
                <div className="prose max-w-none mb-4">
                  <PortableText value={eventModal.sanity_data.description} components={portableTextComponents} />
                </div>
              )}
              {!eventModal.sanity_data?.description && (eventModal.notes || eventModal.description) && (
                <p className="text-sm text-gray-700 mb-4 whitespace-pre-wrap">
                  {eventModal.notes || eventModal.description}
                </p>
              )}
              
              <div className="mt-4 space-y-3">
                {eventModal.sanity_data?.ticketsUrl && (
                  <a 
                    className="btn btn-primary inline-block w-full text-center" 
                    href={eventModal.sanity_data.ticketsUrl} 
                    target="_blank" 
                    rel="noreferrer"
                  >
                    Get tickets
                  </a>
                )}
                {eventModal.is_bookable && (
                  <button
                    className="btn btn-secondary w-full"
                    onClick={() => setShowBooking(true)}
                  >
                    Book a Spot
                    {eventModal.capacity && eventModal.available_slots !== null && 
                      ` (${eventModal.available_slots} left)`
                    }
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        {eventModal && showBooking && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-5 relative max-h-[90vh] overflow-y-auto">
              <button 
                className="absolute right-3 top-3 text-sm underline" 
                onClick={() => {
                  setShowBooking(false);
                  setEventModal(null);
                }}
              >
                Close
              </button>
              <TimeSlotPicker
                pizzaCount={1}
                customerName=""
                customerEmail=""
                onBook={(booking) => {
                  console.log('Booking created:', booking);
                  setShowBooking(false);
                  setEventModal(null);
                  alert('Booking confirmed! Check your email for details.');
                }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Insert the events widget near the top of the page under the hero/intro
  // Render starts below
  
  // Existing JSX continues...

  return (
    <>
      <Helmet>
        <title>Personal Chef Minneapolis & St. Paul | Local Effort</title>
        <meta
          name="description"
          content="Personal chef and event catering in Minneapolis–St. Paul. In-home dinners, weekly meal prep, and seasonal menus. Book your chef-prepared experience today."
        />
        <link rel="canonical" href="https://localeffortfood.com/" />
        {/* --- NEW: Inject the structured data into the page head --- */}
        <script type="application/ld+json">{JSON.stringify(imageJsonLd)}</script>
        {partnersJsonLd && <script type="application/ld+json">{JSON.stringify(partnersJsonLd)}</script>}
        {/* Consolidated ProfessionalService schema with reviews and services (pulls base details from /business.json) */}
        <script type="application/ld+json">{JSON.stringify((() => {
          const src = business || {};
          const address = {
            '@type': 'PostalAddress',
            addressLocality: (src.address && src.address.addressLocality) || 'Roseville',
            addressRegion: (src.address && src.address.addressRegion) || 'MN',
            addressCountry: (src.address && src.address.addressCountry) || 'US',
            streetAddress: src.address && src.address.streetAddress ? src.address.streetAddress : undefined,
            postalCode: src.address && src.address.postalCode ? src.address.postalCode : undefined,
          };
          const biz = {
            '@context': 'https://schema.org',
            '@type': ['Organization', 'LocalBusiness', 'Caterer'],
            name: src.name || 'Local Effort',
            url: src.url || 'https://localeffortfood.com/',
            description: src.description || 'Personal chef & event catering serving Minneapolis, St. Paul, and the Twin Cities.',
            logo: src.logo || `${src.url || 'https://localeffortfood.com'}/gallery/logo.png`,
            image: imageJsonLd.contentUrl,
            areaServed: Array.isArray(src.serviceArea) && src.serviceArea.length ? src.serviceArea.map(area => ({ '@type': 'Place', name: area })) : [
              { '@type': 'Place', name: 'Minneapolis' },
              { '@type': 'Place', name: 'St. Paul' },
              { '@type': 'Place', name: 'Twin Cities' },
              { '@type': 'Place', name: 'Minnesota' },
              { '@type': 'Place', name: 'Wisconsin' }
            ],
            address,
            sameAs: Array.isArray(src.sameAs) ? src.sameAs : [
              'https://www.tiktok.com/@localeffort',
              'https://instagram.com/localeffort',
              'https://facebook.com/localeffort'
            ],
            telephone: src.telephone || undefined,
            email: src.email || 'yum@localeffortfood.com',
            priceRange: '$$',
            servesCuisine: ['American', 'Farm to Table', 'Local', 'Seasonal'],
            service: {
              '@type': 'Service',
              name: 'Personal Chef (In-home)',
              description: 'Private chef dinners, meal prep, and event catering in the Twin Cities metro.'
            }
          };
          if (src.geo && typeof src.geo === 'object' && Number.isFinite(src.geo.latitude) && Number.isFinite(src.geo.longitude)) {
            biz.geo = { '@type': 'GeoCoordinates', latitude: src.geo.latitude, longitude: src.geo.longitude };
          }
          const reviewList = (Array.isArray(reviews) ? reviews.slice(0, 12) : []).map(r => ({
            '@type': 'Review',
            reviewBody: r.quote,
            author: { '@type': 'Person', name: r.author || 'Customer' },
            reviewRating: r.context && /5★/.test(r.context) ? { '@type': 'Rating', ratingValue: 5, bestRating: 5 } : undefined,
            publisher: r.context ? { '@type': 'Organization', name: r.context.split('·')[0].trim() } : undefined,
          }));
          const ratings = reviewList.map(r => (r.reviewRating && r.reviewRating.ratingValue) || 0).filter(Boolean);
          if (ratings.length) {
            biz.aggregateRating = {
              '@type': 'AggregateRating',
              ratingValue: (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1),
              reviewCount: ratings.length
            };
          }
          biz.review = reviewList;
          biz.hasOfferCatalog = {
            '@type': 'OfferCatalog',
            name: 'Services',
            itemListElement: [
              { '@type': 'Service', name: 'Personal Chef', areaServed: ['Twin Cities'] },
              { '@type': 'Service', name: 'Weekly Meal Prep', areaServed: ['Twin Cities'] },
              { '@type': 'Service', name: 'Event Catering', areaServed: ['Twin Cities'] }
            ]
          };
          return biz;
        })())}</script>
        <script type="application/ld+json">{JSON.stringify(homeFaqJsonLd)}</script>
        {eventSchemas && eventSchemas.length > 0 && (
          <script type="application/ld+json">{JSON.stringify(eventSchemas)}</script>
        )}
      </Helmet>

      <div className="space-y-24">
        {!cloudinaryConfig.cloudName && (
          <div className="card bg-yellow-100 border-yellow-400 text-body">
            Cloudinary not configured. Set VITE_CLOUDINARY_CLOUD_NAME in your environment.
          </div>
        )}
        {/* Hero */}
  <section className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8 grid md:grid-cols-2 gap-8 items-center min-h-[60vh]">
          <div>
            <motion.h1
              variants={fadeInLeft}
              initial="initial"
              animate="animate"
              className="heading-display"
            >
              Minnesotan food <span className="heading-accent">for your functions.</span>
            </motion.h1>
            <motion.h2
              variants={fadeInLeft}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.05 }}
              className="heading-subtitle text-neutral-600"
            >
              Personal chef services in Minneapolis–St. Paul
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              initial="initial"
              animate="animate"
              className="mt-6 md:mt-8 text-body max-w-md"
            >
            Event hospitality and personal chef services, with an obsessive focus on local ingredients.<br /><br />

            Think of us for special occasions and special events. Count on us for weekly home cooked meals. We're comfortable in homes, offices, bars and cafes, parks, vineyards, and uh.. anywhere, really.
            </motion.p>
            <div className="mt-8 flex flex-wrap gap-3">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/services#event-request')}
                className="btn btn-primary text-lg"
              >
                Book an event
              </motion.button>
              <GiftCardDialog className="text-lg px-5 py-3" />
              <span className="sr-only">
                <a href="/personal-chef-minneapolis" className="btn">Personal Chef Minneapolis</a>
                <a href="/personal-chef-st-paul" className="btn">Personal Chef St. Paul</a>
                <a href="/personal-chef-twin-cities" className="btn">Twin Cities Personal Chef</a>
              </span>
            </div>
          </div>

          <motion.div
            className="w-full min-h-[400px] h-full rounded-xl overflow-hidden"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <CloudinaryImage
              publicId={heroImage.publicId}
              version={heroImage.version}
              alt={heroImage.alt}
              containerClassName="w-full h-full"
              imgClassName="w-full h-full object-cover object-center"
              fallbackSrc={heroFallbackSrc}
              sizes="(min-width: 1536px) 768px, (min-width: 1280px) 688px, (min-width: 1024px) 50vw, 100vw"
              responsiveSteps={[600, 900, 1200, 1600, 2000, 2600, 3200]}
              eager
            />
          </motion.div>
        </section>
        {eventModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-5 relative">
              <button className="absolute right-3 top-3 text-sm underline" onClick={() => setEventModal(null)}>Close</button>
              <h4 className="text-xl font-bold mb-1">{eventModal.location}</h4>
              <p className="text-sm text-gray-600 mb-3">{eventModal.startDate}{eventModal.endDate && eventModal.endDate!==eventModal.startDate ? ` – ${eventModal.endDate}` : ''}</p>
              {eventModal.description && (
                <div className="prose max-w-none">
                  <PortableText value={eventModal.description} components={portableTextComponents} />
                </div>
              )}
              {eventModal.ticketsUrl && (
                <a className="btn btn-primary mt-4 inline-block" href={eventModal.ticketsUrl} target="_blank" rel="noreferrer">Get tickets</a>
              )}
            </div>
          </div>
        )}

        {/* Events + Subscribe side-by-side on desktop, stack on mobile */}
        <section className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-6 items-start">
            <div>
              <EventsWidget asCard />
            </div>
            <div>
              <div className="form-card h-full">
                <h3 className="text-xl font-bold">Subscribe to our email list</h3>
                <p className="text-sm text-gray-600 mt-1">Occasional updates about seasonal menus, events, and meal prep openings.</p>
                <SubscribeForm />
              </div>
            </div>
          </div>
        </section>

        {/* Paikka Holiday Bazaar Pre-Order */}
        <section className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold">
              <a href="/paikka" className="hover:underline text-primary">
                pre-order for the paikka holiday bazaar here.
              </a>
            </h3>
          </div>
        </section>

        {/* Animated Logo */}
        <section className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
          <div className="flex justify-center items-center">
            <a 
              href="https://instagram.com/localeffort" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block w-full max-w-md hover:opacity-80 transition-opacity"
              aria-label="Follow us on Instagram @localeffort"
            >
              <div ref={animationContainer} className="w-full" />
            </a>
          </div>
        </section>

        {/* Partner / Logo Wall */}
  <section className="py-12">
          <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
            <SectionHeader overline="Community" title="Our Partners" />
          </div>
          

          <PartnerGrid />
        </section>

        {/* Offerings */}
  <section className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
          <SectionHeader overline="Capabilities" title="What We Do" />
          <div className="grid md:grid-cols-3 gap-6">
            <ServiceCard
              to="/events"
              title="Dinners & Events"
              description="in-home dinner parties and small events up to 50"
            />
            <ServiceCard
              to="/meal-prep"
              title="Weekly Meal Plans"
              description="Nutritious, locally-sourced weekly menus and plans."
            />
            <ServiceCard
              to="/pizza-party"
              title="Pizza Parties"
              description="Local Pizza at your party (or bar). We'll bring the oven."
            />
          </div>
        </section>
        <Separator />
  {/* Feedback (formerly Testimonials) */}
  <TestimonialsCarousel
    items={reviews}
    title="Feedback"
    headingExtra={
      <span className="text-sm text-neutral-600">
        Want to <button className="underline" onClick={() => setShowFeedback(true)}>provide feedback</button>?
      </span>
    }
  />
  {FeedbackModal}
      </div>
    </>
  );
};

export default HomePage;


