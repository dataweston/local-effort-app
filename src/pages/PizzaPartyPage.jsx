import React, { useEffect, useState } from 'react';
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

function useBooking() {
  const [bookingState, setBookingState] = useState({}); // date => {loading, error}
  const createLink = async ({ date, email, addOnGuests }) => {
    setBookingState((s) => ({ ...s, [date]: { loading: true } }));
    try {
      const params = new URLSearchParams({ date });
      if (email) params.set('email', email);
      if (addOnGuests && addOnGuests > 0) params.set('addOnGuests', String(addOnGuests));
      const res = await fetch(`/api/store/pizza-party-link?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'Failed to create link');
      window.location.href = data.url;
    } catch (e) {
      setBookingState((s) => ({ ...s, [date]: { loading: false, error: e.message || 'Error' } }));
    }
  };
  return { bookingState, createLink };
}

const PizzaPartyPage = () => {
  const [images, setImages] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const { bookingState, createLink } = useBooking();
  const [bookedDate, setBookedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [email, setEmail] = useState('');
  const [addOnEnabled, setAddOnEnabled] = useState(false);
  const [guestCount, setGuestCount] = useState(10);

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
  const submitBooking = () => {
    if (!selectedDate) return;
    createLink({ date: selectedDate, email: email.trim(), addOnGuests: addOnEnabled ? guestCount : 0 });
  };

  return (
    <>
      <Helmet>
        <title>Mobile Pizza Parties | Local Effort</title>
        <meta name="description" content="Book a mobile wood-fired pizza party with Local Effort." />
      </Helmet>
      <div className="space-y-16">
        {bookedDate && (
          <div className="p-4 rounded-lg border border-green-300 bg-green-50 text-green-800 text-sm shadow-sm flex items-start gap-3">
            <span className="font-semibold">Booked!</span>
            <span>Your reservation request for <strong>{bookedDate}</strong> was received. We\'ll follow up shortly to confirm details.</span>
          </div>
        )}
        <h2 className="text-5xl md:text-7xl font-bold uppercase">Pizza Parties</h2>
        <p className="font-mono text-lg max-w-3xl">
          Our mobile wood-fired pizza oven is the perfect addition to any event.
        </p>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 space-y-14">
        {/* Intro */}
        <div className="text-center space-y-4">
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">Pizza Party Special</h1>
          <p className="mt-2 text-lg text-neutral-600 max-w-2xl mx-auto">Host an unforgettable artisan pizza experience right in your home. We bring the dough, toppings, equipment & energy.</p>
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
                  <li>Hand-stretched artisan dough & seasonal toppings</li>
                  <li>We handle setup, firing & service</li>
                  <li>Includes 2 hours of active pizza making/eating time</li>
                </ul>
                <p className="text-sm text-neutral-500">Travel outside core Twin Cities metro may include a small surcharge.</p>
              </div>
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="text-center">
                  <div className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-orange-500 to-rose-500 bg-clip-text text-transparent">$300</div>
                  <div className="mt-1 text-xs uppercase tracking-wider text-neutral-500">Flat event rate</div>
                </div>
                <a href="/services#event-request" className="inline-flex items-center rounded-md bg-orange-600 hover:bg-orange-700 text-white font-semibold px-6 py-3 shadow-sm transition-colors">Request Date</a>
              </div>
            </div>
          </div>
        </section>

        {/* Available Dates */}
        <section>
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">Available October Dates <span className="text-xs font-mono bg-neutral-200 rounded px-2 py-0.5">2025</span></h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {DATES.map((d) => {
              const st = bookingState[d] || {};
              return (
                <div key={d} className="p-4 rounded-xl border bg-white shadow-sm flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-neutral-800">{d}</span>
                    {st.loading && <span className="text-xs text-orange-600 animate-pulse">Preparing...</span>}
                  </div>
                  <button
                    type="button"
                    disabled={st.loading}
                    onClick={() => openModal(d)}
                    className={`inline-flex justify-center items-center rounded-md px-3 py-2 text-sm font-semibold shadow-sm transition-colors border ${st.loading ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700 text-white border-orange-600'}`}
                  >
                    {st.loading ? 'Loading…' : 'Book Now'}
                  </button>
                  {st.error && <p className="text-xs text-rose-600">{st.error}</p>}
                </div>
              );
            })}
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
            {images.map((img) => (
              <motion.figure key={img.asset_id || img.public_id} className="mb-3 break-inside-avoid rounded-lg overflow-hidden shadow-sm bg-neutral-100" whileHover={{ scale: 1.02 }}>
                <img
                  src={img.thumbnail_url}
                  alt={img.public_id?.split('/')?.pop()?.replace(/[-_]/g,' ') || 'pizza'}
                  loading="lazy"
                  className="w-full h-auto block"
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
                  <h3 className="text-lg font-semibold">Book {selectedDate}</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">Confirm your details below.</p>
                </div>
                <button onClick={closeModal} className="text-neutral-400 hover:text-neutral-600" aria-label="Close">✕</button>
              </div>
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
              <div className="flex gap-3 pt-2">
                <button onClick={closeModal} type="button" className="flex-1 rounded-md border px-4 py-2 text-sm font-medium hover:bg-neutral-50">Cancel</button>
                <button onClick={submitBooking} type="button" className="flex-1 rounded-md bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold px-4 py-2 shadow disabled:opacity-60 disabled:cursor-not-allowed" disabled={bookingState[selectedDate]?.loading}>
                  {bookingState[selectedDate]?.loading ? 'Redirecting…' : 'Proceed to Payment'}
                </button>
              </div>
              {bookingState[selectedDate]?.error && (
                <p className="text-xs text-rose-600 pt-2">{bookingState[selectedDate].error}</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PizzaPartyPage;
