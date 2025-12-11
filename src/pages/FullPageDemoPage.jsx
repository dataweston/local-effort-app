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
  const [imageLoadCount, setImageLoadCount] = useState(0);
  const [isDragging, setIsDragging] = useState(null);
  const dragStartTime = useRef(0);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const prefetched = useRef(new Set());
  const closeBtnRef = useRef(null);
  const [imageOrder, setImageOrder] = useState([]);
  const [positions, setPositions] = useState({});
  const containerRef = useRef(null);

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
    // Reset all button styles when page changes
    document.querySelectorAll('nav button[data-menu-btn]').forEach(btn => {
      const pageIndex = parseInt(btn.getAttribute('data-page-index'));
      if (pageIndex !== index) {
        btn.style.backgroundColor = 'transparent';
        btn.style.color = '#2F2722';
      }
    });
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

  // Initialize image order when images are loaded
  useEffect(() => {
    if (images.length > 0 && imageOrder.length === 0) {
      setImageOrder(images.map(img => img.asset_id || img.public_id));
    }
  }, [images, imageOrder.length]);

  // Calculate positions based on order
  useEffect(() => {
    if (imageOrder.length === 0 || images.length === 0) return;

    const calculatePositions = () => {
      const newPositions = {};
      const isMobile = window.innerWidth < 768;
      const isDesktop = window.innerWidth >= 1024;
      const columns = isMobile ? 3 : isDesktop ? 6 : 5;
      const columnHeights = new Array(columns).fill(0);
      const baseGap = 2;
      const baseColumnWidth = isMobile ? window.innerWidth / 3 : isDesktop ? window.innerWidth / 6 : window.innerWidth / 5;

      imageOrder.forEach((imgId, idx) => {
        const img = images.find(i => (i.asset_id || i.public_id) === imgId);
        if (!img) return;

        // Get actual image dimensions or use defaults
        const imgWidth = img.width || 400;
        const imgHeight = img.height || 500;
        const aspectRatio = imgWidth / imgHeight;

        // Determine if image should span multiple columns
        let spanColumns = 1;
        let imageWidth = baseColumnWidth;

        // Horizontal images (wider than tall) span 2 columns
        if (aspectRatio > 1.3) {
          spanColumns = Math.min(2, columns);
          imageWidth = baseColumnWidth * spanColumns;
        }
        // Very horizontal images span even more on desktop
        else if (aspectRatio > 1.8 && !isMobile) {
          spanColumns = Math.min(3, columns);
          imageWidth = baseColumnWidth * spanColumns;
        }

        // Calculate height based on actual aspect ratio
        const imageHeight = imageWidth / aspectRatio;

        // Find the best position (column with shortest height that can fit span)
        let bestCol = 0;
        let minHeight = Infinity;

        for (let col = 0; col <= columns - spanColumns; col++) {
          // Check max height of columns this image would span
          let maxHeightInSpan = 0;
          for (let i = 0; i < spanColumns; i++) {
            maxHeightInSpan = Math.max(maxHeightInSpan, columnHeights[col + i]);
          }

          if (maxHeightInSpan < minHeight) {
            minHeight = maxHeightInSpan;
            bestCol = col;
          }
        }

        const x = bestCol * baseColumnWidth;
        const y = minHeight;

        newPositions[imgId] = {
          x,
          y,
          column: bestCol,
          width: imageWidth,
          height: imageHeight,
          spanColumns
        };

        // Update all spanned columns
        for (let i = 0; i < spanColumns; i++) {
          columnHeights[bestCol + i] = y + imageHeight + baseGap;
        }
      });

      setPositions(newPositions);
    };

    calculatePositions();

    // Recalculate on window resize
    const handleResize = () => calculatePositions();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [imageOrder, images]);

  // Drag handlers
  const handleDragStart = useCallback((id) => {
    setIsDragging(id);
    dragStartTime.current = Date.now();
  }, []);

  const handleDragEnd = useCallback((id, event, info) => {
    const dragDuration = Date.now() - dragStartTime.current;
    const dragDistance = Math.sqrt(info.offset.x ** 2 + info.offset.y ** 2);

    setIsDragging(null);

    // If it was a quick click (not a drag), open lightbox
    if (dragDuration < 500 && dragDistance < 20) {
      const img = images.find(i => (i.asset_id || i.public_id) === id);
      if (img) {
        const idx = images.findIndex(i => (i.asset_id || i.public_id) === id);
        setSelected({ img, idx });
        return;
      }
    }

    // Otherwise, handle reordering
    const currentPos = positions[id];
    if (!currentPos) return;

    const isMobile = window.innerWidth < 768;
    const isDesktop = window.innerWidth >= 1024;
    const columns = isMobile ? 3 : isDesktop ? 6 : 5;
    const baseColumnWidth = isMobile ? window.innerWidth / 3 : isDesktop ? window.innerWidth / 6 : window.innerWidth / 5;

    // Calculate new position after drag
    const newX = currentPos.x + info.offset.x;
    const newY = currentPos.y + info.offset.y;

    // Determine which column we're closest to (considering span)
    const targetColumn = Math.max(0, Math.min(columns - (currentPos.spanColumns || 1), Math.round(newX / baseColumnWidth)));

    // Find all images in each column (excluding the dragged one)
    const columnImages = Array(columns).fill(null).map(() => []);
    imageOrder.forEach(imgId => {
      if (imgId === id) return;
      const pos = positions[imgId];
      if (pos && pos.column !== undefined) {
        columnImages[pos.column].push({
          id: imgId,
          y: pos.y,
          height: pos.height || baseColumnWidth * 1.2
        });
      }
    });

    // Sort each column by Y position
    columnImages.forEach(col => col.sort((a, b) => a.y - b.y));

    // Find where in the target column this image should be inserted
    const targetColumnImages = columnImages[targetColumn];
    let insertIndex = targetColumnImages.length;

    for (let i = 0; i < targetColumnImages.length; i++) {
      if (newY < targetColumnImages[i].y) {
        insertIndex = i;
        break;
      }
    }

    // Rebuild the order array with the moved image in its new position
    const newOrder = [];
    const columnsToProcess = Array(columns).fill(null).map(() => []);

    // Distribute images back into columns
    imageOrder.forEach(imgId => {
      if (imgId === id) return;
      const pos = positions[imgId];
      if (pos && pos.column !== undefined) {
        columnsToProcess[pos.column].push(imgId);
      }
    });

    // Insert dragged image into target column at correct position
    columnsToProcess[targetColumn].splice(insertIndex, 0, id);

    // Interleave columns to rebuild order (for more natural flow)
    const maxLength = Math.max(...columnsToProcess.map(col => col.length));
    for (let i = 0; i < maxLength; i++) {
      columnsToProcess.forEach(col => {
        if (col[i]) newOrder.push(col[i]);
      });
    }

    setImageOrder(newOrder);
  }, [images, positions, imageOrder]);

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
            className="flex items-center gap-3"
          >
            <motion.img
              src={logo}
              alt="Local Effort Logo"
              className="h-7 w-auto rounded-md"
              style={{ border: '1px solid #2F2722' }}
              whileHover={{ scale: 1.03 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            />
            <span className="text-sm font-medium" style={{ color: '#2F2722', fontFamily: 'Fraunces, serif' }}>
              always mostly local
            </span>
          </button>

          <div className="flex gap-1">
            {pages.slice(1).map((page, index) => {
              const isActive = activePage === index + 1;
              return (
                <button
                  key={page.id}
                  data-menu-btn
                  data-page-index={index + 1}
                  onClick={() => navigateToPage(index + 1)}
                  className="px-4 py-2 rounded-md text-sm font-medium transition-all group"
                  style={{
                    backgroundColor: isActive ? '#82CCDD' : 'transparent',
                    color: isActive ? '#2F2722' : '#2F2722',
                    fontFamily: 'Work Sans, sans-serif',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '#D47433';
                      e.currentTarget.style.color = '#D1D8E0';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#2F2722';
                    }
                  }}
                >
                  {page.label}
                </button>
              );
            })}
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
            {loading ? (
              <div className="text-center py-20" style={{ color: '#2F2722' }}>
                Loading images...
              </div>
            ) : images.length === 0 ? (
              <div className="text-center py-20" style={{ color: '#2F2722' }}>
                No images found.
              </div>
            ) : (
              <div
                ref={containerRef}
                className="relative w-full"
                style={{ minHeight: '2000px' }}
              >
                {images.map((img, idx) => {
                  const imgId = img.asset_id || img.public_id;
                  const pos = positions[imgId] || { x: 0, y: 0, width: 300, height: 400 };
                  const isBeingDragged = isDragging === imgId;

                  return (
                    <motion.div
                      key={imgId}
                      drag
                      dragMomentum={false}
                      dragElastic={0.05}
                      onDragStart={() => handleDragStart(imgId)}
                      onDragEnd={(e, info) => handleDragEnd(imgId, e, info)}
                      onMouseEnter={() => img?.large_url && prefetchImage(img.large_url)}
                      style={{
                        position: 'absolute',
                        width: pos.width,
                        height: pos.height,
                        cursor: isBeingDragged ? 'grabbing' : 'grab',
                        zIndex: isBeingDragged ? 50 : 1,
                      }}
                      animate={{
                        x: pos.x,
                        y: pos.y,
                        opacity: 1,
                        scale: 1,
                      }}
                      whileHover={{
                        scale: 1.03,
                        zIndex: 10,
                        transition: { type: "spring", stiffness: 400, damping: 25 }
                      }}
                      whileDrag={{
                        scale: 1.05,
                        zIndex: 50,
                        transition: { type: "spring", stiffness: 400, damping: 25 }
                      }}
                      initial={{
                        opacity: 0,
                        scale: 0.8,
                        x: pos.x,
                        y: pos.y,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 26,
                        delay: idx * 0.01,
                      }}
                    >
                      {img.thumbnail_url ? (
                        <img
                          src={img.thumbnail_url}
                          alt={img.context?.alt || 'Gallery image'}
                          className="w-full h-full block select-none pointer-events-none object-cover"
                          draggable={false}
                          loading="eager"
                          decoding="async"
                          fetchpriority={idx < 20 ? "high" : "auto"}
                          style={{
                            transition: 'none',
                            display: 'block',
                          }}
                        />
                      ) : (
                        <CloudinaryImage
                          publicId={img.public_id}
                          alt={img.context?.alt || 'Gallery image'}
                          width={Math.floor(pos.width)}
                          className="w-full h-full block select-none pointer-events-none object-cover"
                          disableLazy={idx < 20}
                        />
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </FullPageSection>

        {/* Page 2: Weekly Meals */}
        <FullPageSection
          id="weekly-meals"
          style={{ backgroundColor: '#E6EBF2' }}
        >
          <div className="flex items-center justify-center h-full pt-20" style={{ color: '#2F2722' }}>
            <h2 className="text-4xl font-bold" style={{ fontFamily: 'Work Sans, sans-serif' }}>Weekly Meals</h2>
          </div>
        </FullPageSection>

        {/* Page 3: Small Events */}
        <FullPageSection
          id="small-events"
          style={{ backgroundColor: '#D1D8E0' }}
        >
          <div className="flex items-center justify-center h-full pt-20" style={{ color: '#2F2722' }}>
            <h2 className="text-4xl font-bold" style={{ fontFamily: 'Work Sans, sans-serif' }}>Small Events</h2>
          </div>
        </FullPageSection>

        {/* Page 4: For Businesses */}
        <FullPageSection
          id="for-businesses"
          style={{ backgroundColor: '#E6EBF2' }}
        >
          <div className="flex items-center justify-center h-full pt-20" style={{ color: '#2F2722' }}>
            <h2 className="text-4xl font-bold" style={{ fontFamily: 'Work Sans, sans-serif' }}>For Businesses</h2>
          </div>
        </FullPageSection>

        {/* Page 5: About */}
        <FullPageSection
          id="about"
          style={{ backgroundColor: '#D1D8E0' }}
        >
          <div className="flex items-center justify-center h-full pt-20" style={{ color: '#2F2722' }}>
            <h2 className="text-4xl font-bold" style={{ fontFamily: 'Work Sans, sans-serif' }}>About</h2>
          </div>
        </FullPageSection>

        {/* Page 6: Local Pizza */}
        <FullPageSection
          id="local-pizza"
          style={{ backgroundColor: '#E6EBF2' }}
        >
          <div className="flex items-center justify-center h-full pt-20" style={{ color: '#2F2722' }}>
            <h2 className="text-4xl font-bold" style={{ fontFamily: 'Work Sans, sans-serif' }}>Local Pizza</h2>
          </div>
        </FullPageSection>
      </FullPageContainer>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 cursor-pointer"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeLightbox}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-6xl max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {selected.img.large_url ? (
                <img
                  src={selected.img.large_url}
                  alt={selected.img.context?.alt || 'Large gallery image'}
                  decoding="async"
                  fetchPriority="high"
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                />
              ) : (
                <CloudinaryImage
                  publicId={selected.img.public_id}
                  alt={selected.img.context?.alt || 'Large gallery image'}
                  width={2000}
                  height={2000}
                  disableLazy
                  eager
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                />
              )}

              <button
                ref={closeBtnRef}
                onClick={closeLightbox}
                className="absolute -top-4 -right-4 w-12 h-12 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-800 text-3xl font-light transition-colors shadow-lg"
                aria-label="Close"
              >
                ×
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FullPageDemoPage;
