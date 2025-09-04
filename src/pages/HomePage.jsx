import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import ServiceCard from '../components/common/ServiceCard';
import { motion } from 'framer-motion';
import { fadeInUp, fadeInLeft } from '../utils/animations';
import CloudinaryImage from '../components/common/cloudinaryImage'; // Import the Cloudinary image component
import sanityClient from '../sanityClient.js';
import { useEffect } from 'react';
import { cloudinaryConfig, heroPublicId, heroFallbackSrc, partnerLogos } from '../data/cloudinaryContent';
import TestimonialsCarousel from '../components/common/TestimonialsCarousel';
import { testimonials as localTestimonials } from '../data/testimonials';

const HomePage = () => {
  const navigate = useNavigate();
  // (removed pizza tracker) — fetch dynamic stats from backend or Sanity if desired

  const [partners, setPartners] = useState([]);

  useEffect(() => {
    let mounted = true;
    const q = `*[_type == "partner" && published == true] | order(order asc){ name, "publicId": logo.publicId, "image": logo.asset, url }`;
    sanityClient
      .fetch(q)
      .then((res) => {
        if (mounted && res && res.length) setPartners(res);
      })
      .catch((err) => {
        console.warn('Failed to fetch partners from Sanity, falling back to static list:', err.message);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // No hero carousel — use single hero image only

  const [reviews, setReviews] = useState(localTestimonials);

  // Try to fetch testimonials from Sanity and merge with local
  useEffect(() => {
    let mounted = true;
    const q = `*[_type == "testimonial" && published == true] | order(order asc){ author, context, quote }`;
    sanityClient
      .fetch(q)
      .then((res) => {
        if (!mounted) return;
        if (Array.isArray(res) && res.length) {
          // de-dup by quote+author
          const seen = new Set();
          const merged = [...res, ...localTestimonials].filter((t) => {
            const k = `${(t.quote||'').trim()}|${(t.author||'').trim()}`;
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          });
          setReviews(merged);
        }
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  // Optionally fetch external reviews JSON (e.g., Thumbtack export placed under public/reviews)
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

  const PartnerGrid = () => {
  const sanitized = (partners || []).filter((p) => p && p.publicId);
  const items = sanitized.length ? sanitized : partnerLogos;

    return (
      <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 items-center px-4">
        {items.map((p, i) => (
          <a
            key={(p.publicId || (p.image && p.image._ref) || i) + i}
            href={p.url || '#'}
            onClick={(e) => {
              if (!p.url) e.preventDefault();
              if (window && window.gtag) {
                window.gtag('event', 'partner_click', { partner: p.name || p.publicId });
              }
            }}
            className="flex items-center justify-center p-4 bg-white rounded-lg shadow-sm"
            aria-label={p.name || `Partner ${i + 1}`}
            rel="noopener noreferrer"
            target={p.url ? '_blank' : undefined}
          >
            <CloudinaryImage
              publicId={p.publicId}
              alt={p.name || `Partner ${i + 1}`}
              width={300}
              height={80}
              className="max-h-16 object-contain grayscale hover:grayscale-0 transition-all"
              fallbackSrc={p.fallbackSrc || '/gallery/logo.png'}
              resizeMode="fit"
            />
          </a>
        ))}
      </div>
    );
  };

  // --- NEW: Define image data for both the component and structured data ---
  const heroImage = { publicId: heroPublicId, alt: 'Local Effort — hero' };

  // --- NEW: Define the JSON-LD structured data object for SEO ---
  const imageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
  contentUrl: `https://res.cloudinary.com/${cloudinaryConfig.cloudName}/image/upload/f_auto,q_auto/${heroImage.publicId}`,
    name: heroImage.alt,
    description: 'A sample of the professional in-home dining experience by Local Effort.',
    creator: {
      '@type': 'Organization',
      name: 'Local Effort',
    },
  };

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

  return (
    <>
      <Helmet>
        <title>Local Effort | Personal Chef & Event Catering in Roseville, MN</title>
        <meta
          name="description"
          content="Local Effort offers personal chef services, event catering, and weekly meal prep in Roseville, MN."
        />
        {/* --- NEW: Inject the structured data into the page head --- */}
        <script type="application/ld+json">{JSON.stringify(imageJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': ['Restaurant','Caterer'],
          name: 'Local Effort',
          url: 'https://local-effort-app.vercel.app/',
          address: { '@type': 'PostalAddress', addressLocality: 'Roseville', addressRegion: 'MN', addressCountry: 'US' },
          servesCuisine: ['American','Local','Farm to Table','Seasonal'],
          priceRange: '$$'
        })}</script>
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
            <motion.h2
              variants={fadeInLeft}
              initial="initial"
              animate="animate"
              className="text-4xl md:text-6xl font-bold uppercase tracking-[-0.02em] leading-[1.02]"
            >
              Minnesotan Food
            </motion.h2>
            <motion.h3
              variants={fadeInLeft}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.05 }}
              className="text-4xl md:text-6xl font-bold uppercase text-neutral-400 tracking-[-0.02em] leading-[1.0] -mt-3 md:-mt-5 lg:-mt-6"
            >
              For Your Functions.
            </motion.h3>
            <motion.p
              variants={fadeInUp}
              initial="initial"
              animate="animate"
              className="mt-6 md:mt-8 text-body max-w-md"
            >
            Event hospitality and personal chef services, with an obsessive focus on local ingredients.<br /><br />

            Think of us for special occasions and special events. Count on us for weekly home cooked meals. We're comfortable in homes, offices, bars and cafes, parks, vineyards, and uh.. anywhere, really.
            </motion.p>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/services#event-request')}
              className="btn btn-primary mt-8 text-lg"
            >
              Book an event
            </motion.button>
          </div>

          <motion.div
            className="w-full min-h-[400px] h-full rounded-xl overflow-hidden"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <CloudinaryImage
              publicId={heroImage.publicId}
              alt={heroImage.alt}
              width={600}
              height={600}
              className="w-full h-full object-cover"
              fallbackSrc={heroFallbackSrc}
              sizes="(min-width: 1024px) 50vw, 100vw"
              eager
            />
          </motion.div>
        </section>

        {/* Subscribe callout */}
        <section className="mx-auto max-w-3xl px-4 md:px-6 lg:px-8">
          <div className="form-card">
            <h3 className="text-xl font-bold">Subscribe to our email list</h3>
            <p className="text-sm text-gray-600 mt-1">Occasional updates about seasonal menus, events, and meal prep openings.</p>
            <SubscribeForm />
          </div>
        </section>

        {/* Partner / Logo Wall */}
        <section className="py-12">
          <h3 className="text-heading uppercase text-center mb-4">Our Partners</h3>
          <p className="text-center text-sm text-gray-600 max-w-2xl mx-auto mb-6">
            Proud partners who help make this project possible. Support local — shop and
            collaborate with them.
          </p>

          <PartnerGrid />
        </section>

        {/* Offerings */}
        <section className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8">
          <h3 className="text-heading uppercase mb-6 border-b border-neutral-300 pb-3">What We Do</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <ServiceCard
              to="/events"
              title="Dinners & Events"
              description="in-home dinner parties and small events up to 50"
            />
            <ServiceCard
              to="/meal-prep"
              title="Weekly Meal Prep"
              description="Nutritious, locally-sourced meals delivered weekly."
            />
            <ServiceCard
              to="/pizza-party"
              title="Pizza Parties"
              description="Local Pizza at your party (or bar). We'll bring the oven."
            />
          </div>
        </section>
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
