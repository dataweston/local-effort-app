import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import CloudinaryImage from '../components/common/cloudinaryImage';

const GalleryPage = () => {
  const [images, setImages] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handler = setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const searchQuery = query ? `tags:${query}` : '';
        const apiUrl = `/api/search-images?query=${encodeURIComponent(searchQuery)}`;

        console.log('Making API call to:', apiUrl);
        console.log('Current location:', window.location.href);

        const response = await fetch(apiUrl);
        console.log('Response status:', response.status);
        console.log('Response content-type:', response.headers.get('content-type'));

        // Check if response is actually JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const textResponse = await response.text();
          console.error('Non-JSON response:', textResponse.substring(0, 200));
          throw new Error('API endpoint not found - got HTML instead of JSON');
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('API Response data:', data);

        setImages(data.images || []);
      } catch (err) {
        console.error('Error fetching images:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [query]);

  // lightbox controls
  const openLightbox = useCallback((img, idx) => {
    setSelected({ img, idx });
  }, []);

  const closeLightbox = useCallback(() => setSelected(null), []);

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

  return (
    <>
      <Helmet>
        <title>Pictures of Food | Local Effort</title>
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-4 text-center">Image Gallery</h1>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by tag (e.g., pizza, events)..."
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
                key={img.asset_id}
                onClick={() => openLightbox(img, idx)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="border p-2 bg-white rounded-lg overflow-hidden"
                aria-label={img.context?.alt || `Gallery image ${idx + 1}`}
              >
                <CloudinaryImage
                  publicId={img.public_id}
                  alt={img.context?.alt || 'Gallery image'}
                  width={600}
                  height={600}
                  className="rounded-lg object-cover w-full h-full aspect-square"
                />
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
              className="max-w-4xl w-full max-h-full"
              initial={{ y: 20, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 20, scale: 0.98 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative bg-white rounded-lg overflow-hidden">
                <button
                  className="absolute right-2 top-2 z-10 bg-white/80 rounded-full p-2"
                  onClick={closeLightbox}
                  aria-label="Close image"
                >
                  ✕
                </button>

                <div className="flex items-center justify-center p-4">
                  <CloudinaryImage
                    publicId={selected.img.public_id}
                    alt={selected.img.context?.alt || 'Large gallery image'}
                    width={1200}
                    height={800}
                    className="w-full h-auto max-h-[80vh] object-contain"
                  />
                </div>

                <div className="flex justify-between items-center p-3 border-t">
                  <button
                    onClick={() => {
                      const prev = (selected.idx - 1 + images.length) % images.length;
                      setSelected({ img: images[prev], idx: prev });
                    }}
                    className="btn btn-ghost"
                    aria-label="Previous image"
                  >
                    ‹ Prev
                  </button>

                  <button
                    onClick={() => {
                      const next = (selected.idx + 1) % images.length;
                      setSelected({ img: images[next], idx: next });
                    }}
                    className="btn btn-ghost"
                    aria-label="Next image"
                  >
                    Next ›
                  </button>
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
