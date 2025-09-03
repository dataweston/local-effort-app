import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import CloudinaryImage from '../components/common/cloudinaryImage';

const GalleryPage = () => {
  const [images, setImages] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const fallbackLoadedRef = useRef(false);

  const tryLoadFallback = useCallback(async () => {
    if (fallbackLoadedRef.current) return null;
    return new Promise((resolve) => {
      const already = typeof window !== 'undefined' && window.photoData;
      const finish = () => {
        const list = (window && window.photoData) || [];
        if (Array.isArray(list) && list.length) {
          const mapped = list.map((p, i) => ({
            asset_id: p.src || String(i),
            public_id: p.src || String(i),
            context: { alt: p.title || 'Gallery image' },
            thumbnail_url: p.src,
            large_url: p.src,
          }));
          fallbackLoadedRef.current = true;
          resolve(mapped);
        } else {
          resolve(null);
        }
      };
      if (already) return finish();
      const s = document.createElement('script');
      s.src = '/gallery/photos.js';
      s.async = true;
      s.onload = finish;
      s.onerror = () => resolve(null);
      document.body.appendChild(s);
    });
  }, []);
  const closeBtnRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    const handler = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const apiUrl = `/api/search-images${query ? `?query=${encodeURIComponent(query)}` : ''}`;
        const response = await fetch(apiUrl, { signal: controller.signal });

        // Check if response is actually JSON
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          const text = await response.text().catch(() => '');
          const msg = text && text.includes('<!DOCTYPE')
            ? 'API endpoint not found - got HTML instead of JSON'
            : (text || 'Unexpected non-JSON response');
          throw new Error(msg);
        }

        // Parse JSON; if error status, surface server error details
        const data = await response.json();
        if (!response.ok) {
          const details = data && (data.error || data.details || JSON.stringify(data));
          throw new Error(`Search failed (${response.status}): ${details}`);
        }

        setImages(Array.isArray(data.images) ? data.images : []);
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error('Error fetching images:', err);
        // Attempt a static fallback so the gallery still shows something
        try {
          const fallback = await tryLoadFallback();
          if (fallback && fallback.length) {
            setImages(fallback);
            setError('Showing fallback images while the gallery API is unavailable.');
          } else {
            setError(err.message || String(err));
          }
        } catch (_) {
          setError(err.message || String(err));
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(handler);
      controller.abort();
    };
  }, [query]);

  // Client-side pagination to limit initial DOM nodes
  const PAGE_SIZE = 24;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  useEffect(() => setVisibleCount(PAGE_SIZE), [images]);

  // lightbox controls
  const openLightbox = useCallback(
    (img, idx) => {
      setSelected({ img, idx });
      // Prefetch the large image for the selected and the next image
      if (img && img.large_url) {
        const p = new Image();
        p.src = img.large_url;
      }
      const nextIdx = (idx + 1) % images.length;
      const next = images[nextIdx];
      if (next && next.large_url) {
        const pn = new Image();
        pn.src = next.large_url;
      }
    },
    [setSelected, images]
  );

  const closeLightbox = useCallback(() => setSelected(null), [setSelected]);

  // keyboard navigation for lightbox
  useEffect(() => {
    const onKey = (e) => {
      if (!selected) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') {
        const next = (selected.idx + 1) % images.length;
        setSelected({ img: images[next], idx: next });
      }
      if (e.key === 'ArrowLeft') {
        const prev = (selected.idx - 1 + images.length) % images.length;
        setSelected({ img: images[prev], idx: prev });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, images, closeLightbox]);

  // focus the close button when modal opens for accessibility
  useEffect(() => {
    if (selected && closeBtnRef.current) closeBtnRef.current.focus();
  }, [selected]);

  return (
    <>
      <Helmet>
          <title>pictures of food. | Local Effort</title>
          <meta name="description" content="A visual gallery of dinners, events, meal prep, and plates from Local Effort." />
          <script type="application/ld+json">{JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Restaurant',
            name: 'Local Effort',
            url: 'https://local-effort-app.vercel.app/gallery',
            image: images.slice(0,8).map(i => i.large_url || i.thumbnail_url).filter(Boolean),
            servesCuisine: ['American','Local','Seasonal'],
            sameAs: []
          })}</script>
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-4 text-center">pictures of food.</h1>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by tag (e.g., pizza, events, mealplan, plates, dinner, eggs)..."
          className="w-full max-w-md mx-auto block p-3 border rounded-md mb-8"
        />

  {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <div className="text-red-600 bg-red-50 p-4 rounded">
            <h3 className="font-bold">Error Details:</h3>
            <p>{error}</p>
            <p className="mt-2 text-sm">This usually means:</p>
            <ul className="list-disc ml-6 text-sm">
              <li>The /api/search-images.js file wasn't created properly</li>
              <li>Environment variables aren't set in Vercel</li>
              <li>The serverless function has an error</li>
            </ul>
            <p className="mt-2 text-sm">Check the browser Network tab and Vercel function logs.</p>
          </div>
        ) : images.length === 0 ? (
          <div className="text-center p-8">
            <p>No images found.</p>
            <p className="text-sm text-gray-600 mt-2">
              Try removing search terms or check that you have images in your Cloudinary account.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((img, idx) => (
              <motion.button
                type="button"
                key={img.asset_id}
                onClick={() => openLightbox(img, idx)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="border p-2 bg-white rounded-lg overflow-hidden"
                aria-label={img.context?.alt || `Gallery image ${idx + 1}`}
              >
                {img.thumbnail_url ? (
                  <img
                    src={img.thumbnail_url}
                    alt={img.context?.alt || 'Gallery image'}
                    className="rounded-lg object-cover w-full h-full aspect-square"
                    loading="lazy"
                  />
                ) : (
                  <CloudinaryImage
                    publicId={img.public_id}
                    alt={img.context?.alt || 'Gallery image'}
                    width={600}
                    height={600}
                    className="rounded-lg object-cover w-full h-full aspect-square"
                  />
                )}
              </motion.button>
            ))}
          </div>
        )}
      </div>
      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeLightbox}
          >
            <motion.div
              className="max-w-5xl w-full max-h-full"
              initial={{ y: 20, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 20, scale: 0.98 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative overflow-hidden">
                <button
                  ref={closeBtnRef}
                  className="absolute right-2 top-2 z-10 bg-black/60 text-white rounded-full p-2"
                  onClick={closeLightbox}
                  aria-label="Close image"
                >
                  ✕
                </button>

                <div className="flex items-center justify-center p-2">
                  {selected.img.large_url ? (
                    <img
                      src={selected.img.large_url}
                      alt={selected.img.context?.alt || 'Large gallery image'}
                      className="w-full h-auto max-h-[90vh] object-contain"
                    />
                  ) : (
                    <CloudinaryImage
                      publicId={selected.img.public_id}
                      alt={selected.img.context?.alt || 'Large gallery image'}
                      width={1400}
                      height={1000}
                      disableLazy
                      className="w-full h-auto max-h-[90vh] object-contain"
                    />
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default GalleryPage;
