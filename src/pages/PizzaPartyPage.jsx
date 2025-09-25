import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';

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

export const PizzaPartyPage = () => {
  const [images, setImages] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchPizzaImages((imgs) => { if (active) setImages(imgs); }, (err) => active && setError(err), (val) => active && setLoading(val));
    return () => { active = false; };
  }, []);

  return (
    <>
      <Helmet>
        <title>Mobile Pizza Parties | Local Effort</title>
        <meta name="description" content="Book a mobile wood-fired pizza party with Local Effort." />
      </Helmet>
      <div className="space-y-16">
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
          <div className="flex flex-wrap gap-3">
            {DATES.map((d) => (
              <motion.span
                key={d}
                initial={{ scale: 0.9, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                className="px-4 py-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-sm font-medium text-neutral-800 shadow-sm"
              >
                {d}
              </motion.span>
            ))}
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
      </div>
    </>
  );
};
