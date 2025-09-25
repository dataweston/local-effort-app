import React, { useEffect, useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';

// Fetch up to 8 images tagged 'pizza' using existing API (uses tag expansion logic)
async function fetchPizzaImages(setter, setError, setLoading) {
  try {
    const res = await fetch('/api/search-images?query=pizza&per_page=8');
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    const data = await res.json();
    setter(Array.isArray(data.images) ? data.images : []);
  } catch (e) {
    console.error('Failed to load pizza images', e);
    setError(e.message || 'Error loading images');
  } finally {
    setLoading(false);
  }
}

const DATES = [
  'Oct 2', 'Oct 3', 'Oct 4',
  'Oct 9', 'Oct 10', 'Oct 11',
  'Oct 16', 'Oct 17'
];

// Embedded payment (Square) state hook for Pizza Party checkout
function useEmbeddedPayment() {
  const [state, setState] = useState({}); // date => {loading, error, success, paymentId}
  const paymentsRef = useRef(null);
  const cardRef = useRef(null);
  const [cardLoaded, setCardLoaded] = useState(false);
  const [initAttempts, setInitAttempts] = useState(0);
  const [configError, setConfigError] = useState('');

  // Inject Square script once
  useEffect(() => {
    const existing = document.querySelector('script[data-square-sdk]');
    if (existing) return;
    const mode = (import.meta?.env?.VITE_SQUARE_ENV || '').toLowerCase();
    const isProd = mode === 'production' || mode === 'prod';
    const src = isProd ? 'https://web.squarecdn.com/v1/square.js' : 'https://sandbox.web.squarecdn.com/v1/square.js';
    const sc = document.createElement('script');
    sc.src = src;
    sc.async = true;
    sc.dataset.squareSdk = 'true';
    sc.onerror = () => setConfigError('Failed to load payment script');
    document.head.appendChild(sc);
  }, []);

  // Initialize card form
  useEffect(() => {
    let cancelled = false;
    const appId = (window?.__SQUARE_APP_ID__) || (import.meta?.env?.VITE_SQUARE_APP_ID) || window?.SQUARE_APPLICATION_ID;
    const locationId = (window?.__SQUARE_LOCATION_ID__) || (import.meta?.env?.VITE_SQUARE_LOCATION_ID) || window?.SQUARE_LOCATION_ID;
    if (!appId || !locationId) {
      setConfigError('Missing payment configuration');
      return;
    }
    const init = async () => {
      if (cancelled) return;
      if (!window.Square) {
        if (initAttempts > 10) {
          setConfigError('Payment form failed to load');
          return;
        }
        setInitAttempts(a => a + 1);
        setTimeout(init, 300);
        return;
      }
      try {
        const payments = window.Square.payments(appId, locationId);
        paymentsRef.current = payments;
        const card = await payments.card();
        await card.attach('#pp-card-container');
        if (!cancelled) {
          cardRef.current = card;
          setCardLoaded(true);
        }
      } catch (err) {
        setConfigError(err?.message || 'Payment init failed');
      }
    };
    init();
    return () => { cancelled = true; };
  }, [initAttempts]);

  const checkout = async ({ date, email, addOnGuests }) => {
    setState(s => ({ ...s, [date]: { loading: true } }));
    try {
      if (!cardRef.current) throw new Error('Card not ready');
      const result = await cardRef.current.tokenize();
      if (result.status !== 'OK') throw new Error(result?.errors?.[0]?.message || 'Card details invalid');
      const token = result.token;
      const res = await fetch('/api/store/pizza-party-checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ date, email, addOnGuests, token, basePriceCents: 30000, addOnPricePerGuestCents: 900 })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Payment failed');
      setState(s => ({ ...s, [date]: { loading: false, success: true, paymentId: data.paymentId } }));
    } catch (e) {
      setState(s => ({ ...s, [date]: { loading: false, error: e.message || 'Error' } }));
    }
  };

  return { state, checkout, cardLoaded, configError };
}

const PizzaPartyPage = () => {
  // SEO canonical (update if production domain differs)
  const canonical = 'https://localeffort.app/pizza-party';
  const siteName = 'Local Effort';
  const pageTitle = 'Mobile Wood-Fired Pizza Party | Local Effort';
  const pageDescription = 'Book a mobile wood-fired pizza party (up to 15 guests) with Local Effort. We bring the oven, premium midwest ingredients, and sourdough crust to your home.';

  // Build Event JSON-LD from date tokens (assuming 2025 & Central time). Adjust times as needed.
  const monthMap = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
  const eventStartHour = '17:00:00'; // 5pm placeholder
  const timezoneOffset = '-05:00'; // CDT (adjust for DST if needed)
  const eventsSchema = DATES.map(d => {
    const [mon, day] = d.split(' ');
    const date = `2025-${monthMap[mon]}-${String(day).padStart(2,'0')}`;
    return {
      '@type': 'Event',
      name: 'Private Mobile Pizza Party',
      description: 'On-site artisanal wood-fired pizza experience (up to 15 guests).',
      startDate: `${date}T${eventStartHour}${timezoneOffset}`,
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      eventStatus: 'https://schema.org/EventScheduled',
      location: {
        '@type': 'Place',
        name: 'Client Provided Location',
        address: { '@type': 'PostalAddress', addressRegion: 'MN', addressCountry: 'US' }
      },
      organizer: { '@type': 'Organization', name: siteName, url: canonical.replace('/pizza-party','/') },
      offers: {
        '@type': 'Offer',
        price: '300',
        priceCurrency: 'USD',
        availability: 'https://schema.org/LimitedAvailability',
        url: canonical,
        validFrom: '2025-01-01T00:00:00Z'
      }
    };
  });

  const serviceSchema = {
    '@type': 'Service',
    name: 'Mobile Wood-Fired Pizza Party',
    description: pageDescription,
    provider: {
      '@type': 'LocalBusiness',
      name: siteName,
      areaServed: { '@type': 'Place', name: 'Minnesota' }
    },
    offers: {
      '@type': 'Offer',
      price: '300',
      priceCurrency: 'USD',
      description: 'Flat event rate for up to 15 guests.'
    },
    category: 'Catering',
    additionalType: 'https://schema.org/FoodEstablishment'
  };

  const breadcrumbSchema = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: canonical.replace('/pizza-party','/') },
      { '@type': 'ListItem', position: 2, name: 'Pizza Party', item: canonical }
    ]
  };

  const jsonLd = [serviceSchema, ...eventsSchema, breadcrumbSchema];

  const [images, setImages] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const { state: bookingState, checkout, cardLoaded, configError } = useEmbeddedPayment();
  const [bookedDate, setBookedDate] = useState(null);
  const [justBooked, setJustBooked] = useState(false); // differentiate newly booked success for banner animation
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [email, setEmail] = useState('');
  const [addOnEnabled, setAddOnEnabled] = useState(false);
  const [guestCount, setGuestCount] = useState(10);
  const [submitting, setSubmitting] = useState(false); // prevent rapid double submit
  const isValidEmail = (val) => /.+@.+\..+/.test(val.trim());

  const basePrice = 300;
  const addOnTotal = addOnEnabled ? guestCount * 9 : 0;
  const grandTotal = basePrice + addOnTotal;

  useEffect(() => {
    let active = true;
    fetchPizzaImages((imgs) => { if (active) setImages(imgs); }, (err) => active && setError(err), (val) => active && setLoading(val));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const b = params.get('booked');
    if (b) {
      setBookedDate(b);
      // remove query param without reload
      params.delete('booked');
      const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  const openModal = (date) => {
    setSelectedDate(date);
    setShowModal(true);
  };
  const closeModal = () => {
    setShowModal(false);
    setSelectedDate(null);
    setEmail('');
    setAddOnEnabled(false);
    setGuestCount(10);
  };
  const submitBooking = async () => {
    if (!selectedDate) return;
    if (submitting) return; // guard
    setSubmitting(true);
    const date = selectedDate;
    await checkout({ date, email: email.trim(), addOnGuests: addOnEnabled ? guestCount : 0, totalCents: grandTotal * 100 });
    // After checkout completes, if success mark banner and close modal
  // bookingState is updated asynchronously; we add a short microtask to read the updated state
    setTimeout(() => {
      const latest = bookingState[date];
      if (latest && latest.success) {
        setBookedDate(date);
        setJustBooked(true);
        closeModal();
        // Fire-and-forget receipt email (no UI dependency)
        try {
          fetch('/api/store/pizza-party-receipt', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ paymentId: latest.paymentId, date, email: email.trim(), addOnGuests: addOnEnabled ? guestCount : 0 })
          }).catch(() => {});
        } catch (_) { /* ignore */ }
        // remove highlight after a delay
        setTimeout(() => setJustBooked(false), 6000);
      }
      setSubmitting(false);
    }, 50);
  };

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonical} />
        <meta property="og:site_name" content={siteName} />
        <meta property="og:locale" content="en_US" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        {/* Optional: supply a representative image if available */}
        {/* <meta property="og:image" content="https://localeffort.app/og/pizza-party.jpg" /> */}
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <div className="space-y-16">
        {bookedDate && (
          <div className={`p-4 rounded-lg border bg-green-50 text-green-800 text-sm shadow-sm flex items-start gap-3 transition-all ${justBooked ? 'border-green-400 ring-2 ring-green-300' : 'border-green-300'}`}>
            <span className="font-semibold">Booked!</span>
            <span>Your reservation for <strong>{bookedDate}</strong> was received. We\'ll follow up to confirm details.</span>
          </div>
        )}
        {/* Removed original h2 and paragraph per request */}
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 space-y-14">
        {/* Intro */}
        <div className="text-center space-y-4">
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">Pizza Party Special</h1>
          <p className="mt-2 text-xl md:text-2xl text-neutral-800 max-w-3xl mx-auto leading-relaxed">Host an unforgettable pizza experience right in your home. We bring the oven, the dough, and the vibes. We call it <strong>Local Pizza</strong>.</p>
        </div>

        {/* Offer Card */}
        <section>
          <div className="relative rounded-2xl border bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-6 md:p-10 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-[0.15]" style={{backgroundImage:'radial-gradient(circle at 30% 30%, #fb923c, transparent 60%)'}} />
            <div className="relative grid md:grid-cols-3 gap-8 items-center">
              <div className="md:col-span-2 space-y-4">
                <h2 className="text-2xl md:text-3xl font-bold">Pizza Party in Your Home</h2>
                <ul className="list-disc list-inside text-neutral-700 text-sm md:text-base space-y-1">
                  <li>Up to 15 guests</li>
                  <li>100% local midwest ingredients, slow-fermented sourdough crust</li>
                  <li>We handle setup, firing & service</li>
                  <li>Includes 2 hours of active pizza making/eating time</li>
                </ul>
              </div>
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="text-center">
                  <div className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-orange-500 to-rose-500 bg-clip-text text-transparent">$300</div>
                  <div className="mt-1 text-xs uppercase tracking-wider text-neutral-500">Flat event rate</div>
                </div>
                <button type="button" onClick={() => openModal(null)} className="inline-flex items-center rounded-md bg-orange-600 hover:bg-orange-700 text-white font-semibold px-6 py-3 shadow-sm transition-colors">Book / Pay</button>
              </div>
            </div>
          </div>
        </section>

        {/* Available Dates */}
        <section id="dates">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">Available October Dates <span className="text-[10px] font-mono bg-neutral-200 rounded px-1.5 py-0.5">2025</span></h3>
          <div className="mx-auto max-w-4xl">
            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {DATES.map((d) => {
                const st = bookingState[d] || {};
                return (
                  <li key={d} className="relative group rounded-xl border bg-white/80 backdrop-blur-sm shadow-sm px-3 py-3 flex flex-col items-start justify-between h-28 overflow-hidden">
                    <div className="w-full flex items-center justify-between">
                      <span className="font-semibold text-neutral-800 text-sm tracking-tight">{d}</span>
                      {st.loading && <span className="text-[10px] text-orange-600 animate-pulse">...</span>}
                    </div>
                    <button
                      type="button"
                      disabled={st.loading}
                      onClick={() => openModal(d)}
                      className={`mt-auto inline-flex justify-center items-center rounded-md px-2.5 py-1.5 text-xs font-semibold shadow-sm transition-colors border ${st.loading ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700 text-white border-orange-600'}`}
                      aria-label={`Book pizza party on ${d}`}
                    >
                      {st.loading ? 'Processing' : 'Book'}
                    </button>
                    <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-orange-50/40 to-rose-50/40" />
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* Image Grid */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xl font-semibold">Pizza Inspiration</h3>
            {loading && <span className="text-sm text-neutral-500 animate-pulse">Loading...</span>}
          </div>
          {error && (
            <div className="p-4 mb-6 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              Could not load images: {error}
            </div>
          )}
          <div className="columns-2 md:columns-3 lg:columns-4 gap-3 [column-fill:_balance]">
            {/* Masonry using CSS multi-columns */}
            {images.map((img, idx) => (
              <motion.figure key={img.asset_id || img.public_id} className="mb-3 break-inside-avoid rounded-lg overflow-hidden shadow-sm bg-neutral-100" whileHover={{ scale: 1.02 }}>
                <img
                  src={img.thumbnail_url}
                  alt={`Wood-fired pizza ${idx + 1}`}
                  loading="lazy"
                  className="w-full h-auto block"
                  decoding="async"
                  fetchPriority={idx < 2 ? 'high' : 'auto'}
                />
              </motion.figure>
            ))}
            {!loading && images.length === 0 && !error && (
              <p className="text-sm text-neutral-500">No images found yet. Tag some photos in Cloudinary with 'pizza'.</p>
            )}
          </div>
        </section>

        {/* FAQ Section */}
        <section>
          <h3 className="text-xl font-semibold mt-24 mb-6">FAQ</h3>
          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-neutral-900">What pizzas does this include?</h4>
              <p className="text-sm text-neutral-700 mt-1">We have some signature favorites, or we're happy to take requests.</p>
            </div>
            <div>
              <h4 className="font-medium text-neutral-900">Does it include anything besides pizza?</h4>
              <p className="text-sm text-neutral-700 mt-1">This offer is just for pizza, but we can build a bigger package if you like. It's easy to add additional sides like salads and dessert.</p>
            </div>
            <div>
              <h4 className="font-medium text-neutral-900">What kind of pizza do you make?</h4>
              <p className="text-sm text-neutral-700 mt-1">Minnesotan-style. It's sort of neapolitan, sort of New York. Puffy, crispy, chewy crusts. It's our own thing.</p>
            </div>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 20 }}
              className="relative w-full max-w-md rounded-xl bg-white shadow-lg border p-6 space-y-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">{selectedDate ? `Book ${selectedDate}` : 'Select a Date'}</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">{selectedDate ? 'Confirm your details below.' : 'Choose a date to continue.'}</p>
                </div>
                <button onClick={closeModal} className="text-neutral-400 hover:text-neutral-600" aria-label="Close">✕</button>
              </div>
              {!selectedDate && (
                <div className="space-y-2">
                  <ul className="max-h-48 overflow-auto border rounded-md divide-y">
                    {DATES.map((d) => (
                      <li key={d} className="flex items-center justify-between px-3 py-2 text-sm">
                        <span>{d}</span>
                        <button type="button" onClick={() => setSelectedDate(d)} className="text-xs font-semibold px-2 py-1 rounded-md bg-orange-600 hover:bg-orange-700 text-white">Select</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {selectedDate && (
                <div className="space-y-4">
                  <label className="block text-sm font-medium">Email
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </label>
                  <div className="space-y-2 border rounded-md p-3">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input type="checkbox" checked={addOnEnabled} onChange={(e) => setAddOnEnabled(e.target.checked)} />
                      <span>Add salads & dessert ($9 / guest)</span>
                    </label>
                    {addOnEnabled && (
                      <div className="flex items-center gap-3 pl-6">
                        <label className="text-xs font-medium uppercase tracking-wide">Guests
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={guestCount}
                            onChange={(e) => setGuestCount(Math.max(1, Math.min(50, Number(e.target.value))))}
                            className="mt-1 ml-2 w-20 rounded-md border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </label>
                        <span className="text-xs text-neutral-500">Add-on total: ${addOnTotal}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm font-medium pt-2 border-t">
                    <span>Total</span>
                    <span>${grandTotal}</span>
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={closeModal} type="button" className="flex-1 rounded-md border px-4 py-2 text-sm font-medium hover:bg-neutral-50">Cancel</button>
                <button
                  onClick={selectedDate ? submitBooking : undefined}
                  type="button"
                  disabled={selectedDate ? (bookingState[selectedDate]?.loading || submitting || !cardLoaded || !!configError || !isValidEmail(email)) : false}
                  className={`flex-1 rounded-md text-sm font-semibold px-4 py-2 shadow disabled:opacity-60 disabled:cursor-not-allowed ${selectedDate ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-neutral-200 text-neutral-500 cursor-not-allowed'}`}
                >
                  {selectedDate ? (bookingState[selectedDate]?.loading || submitting ? 'Charging…' : (isValidEmail(email) ? 'Pay Now' : 'Enter Email')) : 'Select a Date'}
                </button>
              </div>
              {selectedDate && bookingState[selectedDate]?.error && (
                <p className="text-xs text-rose-600 pt-2">{bookingState[selectedDate].error}</p>
              )}
              {selectedDate && bookingState[selectedDate]?.success && (
                <p className="text-xs text-emerald-600 pt-2">Payment successful! We will confirm shortly.</p>
              )}
              {configError && (
                <p className="text-xs text-rose-600 pt-2">{configError}</p>
              )}
              <div id="pp-card-container" className="mt-4 border rounded-md p-4 bg-white min-h-[88px]" aria-label="Pizza party card form">
                {!cardLoaded && !configError && <p className="text-xs text-neutral-500">Loading secure payment form…</p>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PizzaPartyPage;
