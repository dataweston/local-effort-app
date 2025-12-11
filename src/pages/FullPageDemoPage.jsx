// src/pages/FullPageDemoPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FullPageContainer from '../components/fullpage/FullPageContainer';
import FullPageSection from '../components/fullpage/FullPageSection';
import CloudinaryImage from '../components/common/cloudinaryImage';

const logo = '/gallery/logo.png?text=Local+Effort&font=mono';

const FullPageDemoPage = () => {
  const [activePage, setActivePage] = useState(0);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const prefetched = useRef(new Set());
  const closeBtnRef = useRef(null);

  const pages = [
    { id: 'home', label: 'Home' },
    { id: 'weekly-meals', label: 'Weekly Meals' },
    { id: 'small-events', label: 'Small Events' },
    { id: 'for-businesses', label: 'For Businesses' },
    { id: 'about', label: 'About' },
    { id: 'local-pizza', label: 'Local Pizza' },
  ];

  const handlePageChange = (index) => {
    setActivePage(index);
  };

  const navigateToPage = (index) => {
    if (window.scrollToPage) {
      window.scrollToPage(index);
    }
  };

  // Fetch images from Cloudinary API
  const shuffle = useCallback((arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }, []);

  const fetchImages = useCallback(async () => {
    setLoading(true);
    const apiUrl = '/api/search-images?per_page=100';
    try {
      const response = await fetch(apiUrl);
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('API endpoint not found');
      }
      const data = await response.json();
      if (!response.ok) {
        throw new Error(`Search failed (${response.status})`);
      }
      const imgs = Array.isArray(data.images) ? data.images : [];
      setImages(shuffle(imgs));
    } catch (err) {
      console.error('Error fetching images:', err);
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, [shuffle]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // Lightbox controls
  const openLightbox = useCallback((img, idx) => {
    setSelected({ img, idx });
  }, []);

  const closeLightbox = useCallback(() => setSelected(null), []);

  const prefetchImage = useCallback((url) => {
    if (!url || typeof document === 'undefined') return;
    if (prefetched.current.has(url)) return;
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    prefetched.current.add(url);
  }, []);

  // Keyboard navigation for lightbox
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

  useEffect(() => {
    if (selected && closeBtnRef.current) closeBtnRef.current.focus();
  }, [selected]);

  return (
    <>
      {/* Fixed Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 shadow-sm" style={{ backgroundColor: '#D1D8E0', borderBottom: '1px solid #C1C7CF' }}>
        <div className="flex items-center justify-between px-6 py-4">
          <button
            onClick={() => navigateToPage(0)}
            className="flex items-center gap-2"
          >
            <motion.img
              src={logo}
              alt="Local Effort Logo"
              className="h-7 w-auto rounded-md"
              style={{ border: '1px solid #2F2722' }}
              whileHover={{ scale: 1.03 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            />
          </button>

          <div className="flex gap-1">
            {pages.slice(1).map((page, index) => (
              <button
                key={page.id}
                onClick={() => navigateToPage(index + 1)}
                className="px-4 py-2 rounded-md text-sm font-medium transition-all"
                style={{
                  backgroundColor: activePage === index + 1 ? '#82CCDD' : 'transparent',
                  color: activePage === index + 1 ? '#2F2722' : '#2F2722',
                }}
                onMouseEnter={(e) => {
                  if (activePage !== index + 1) {
                    e.currentTarget.style.backgroundColor = '#D47433';
                    e.currentTarget.style.color = '#D1D8E0';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activePage !== index + 1) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#2F2722';
                  }
                }}
              >
                {page.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Full Page Container */}
      <FullPageContainer
        pages={pages}
        enableKeyboard={true}
        onPageChange={handlePageChange}
      >
        {/* Page 1: Home - Gallery */}
        <FullPageSection
          id="home"
          style={{ backgroundColor: '#D1D8E0' }}
          animation="fadeScale"
        >
          <div className="w-full h-full overflow-y-auto pt-20">
            <div className="columns-4 md:columns-8 lg:columns-12 gap-0 p-0 m-0">
              {loading ? (
                <div className="col-span-full text-center py-20" style={{ color: '#2F2722' }}>
                  Loading images...
                </div>
              ) : images.length === 0 ? (
                <div className="col-span-full text-center py-20" style={{ color: '#2F2722' }}>
                  No images found.
                </div>
              ) : (
                images.map((img, idx) => (
                  <button
                    key={img.asset_id || idx}
                    type="button"
                    onClick={() => openLightbox(img, idx)}
                    onMouseEnter={() => img?.large_url && prefetchImage(img.large_url)}
                    className="block w-full break-inside-avoid mb-0 p-0 transition-transform hover:scale-105 hover:z-10"
                    style={{ cursor: 'pointer' }}
                  >
                    {img.thumbnail_url ? (
                      <img
                        src={img.thumbnail_url}
                        alt={img.context?.alt || 'Gallery image'}
                        className="w-full h-auto block"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <CloudinaryImage
                        publicId={img.public_id}
                        alt={img.context?.alt || 'Gallery image'}
                        width={400}
                        className="w-full h-auto block"
                      />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </FullPageSection>

        {/* Page 2: Weekly Meals */}
        <FullPageSection
          id="weekly-meals"
          style={{ backgroundColor: '#E6EBF2' }}
        >
          <div className="flex items-center justify-center h-full pt-20" style={{ color: '#2F2722' }}>
            <h2 className="text-4xl font-bold">Weekly Meals</h2>
          </div>
        </FullPageSection>

        {/* Page 3: Small Events */}
        <FullPageSection
          id="small-events"
          style={{ backgroundColor: '#D1D8E0' }}
        >
          <div className="flex items-center justify-center h-full pt-20" style={{ color: '#2F2722' }}>
            <h2 className="text-4xl font-bold">Small Events</h2>
          </div>
        </FullPageSection>

        {/* Page 4: For Businesses */}
        <FullPageSection
          id="for-businesses"
          style={{ backgroundColor: '#E6EBF2' }}
        >
          <div className="flex items-center justify-center h-full pt-20" style={{ color: '#2F2722' }}>
            <h2 className="text-4xl font-bold">For Businesses</h2>
          </div>
        </FullPageSection>

        {/* Page 5: About */}
        <FullPageSection
          id="about"
          style={{ backgroundColor: '#D1D8E0' }}
        >
          <div className="flex items-center justify-center h-full pt-20" style={{ color: '#2F2722' }}>
            <h2 className="text-4xl font-bold">About</h2>
          </div>
        </FullPageSection>

        {/* Page 6: Local Pizza */}
        <FullPageSection
          id="local-pizza"
          style={{ backgroundColor: '#E6EBF2' }}
        >
          <div className="flex items-center justify-center h-full pt-20" style={{ color: '#2F2722' }}>
            <h2 className="text-4xl font-bold">Local Pizza</h2>
          </div>
        </FullPageSection>
      </FullPageContainer>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-0 m-0"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.95)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeLightbox}
          >
            <button
              ref={closeBtnRef}
              className="absolute right-4 top-4 z-10 text-white text-4xl font-bold hover:scale-110 transition-transform"
              onClick={closeLightbox}
              aria-label="Close image"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              ×
            </button>

            <div className="w-full h-full flex items-center justify-center p-0 m-0" onClick={(e) => e.stopPropagation()}>
              {selected.img.large_url ? (
                <img
                  src={selected.img.large_url}
                  alt={selected.img.context?.alt || 'Large gallery image'}
                  decoding="async"
                  fetchPriority="high"
                  className="max-w-full max-h-full object-contain"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <CloudinaryImage
                  publicId={selected.img.public_id}
                  alt={selected.img.context?.alt || 'Large gallery image'}
                  width={2000}
                  height={2000}
                  disableLazy
                  eager
                  className="max-w-full max-h-full object-contain"
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FullPageDemoPage;
