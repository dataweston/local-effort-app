// src/pages/FullPageDemoPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FullPageContainer from '../components/fullpage/FullPageContainer';
import FullPageSection from '../components/fullpage/FullPageSection';
import CloudinaryImage from '../components/common/cloudinaryImage';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

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
  const [orderOpen, setOrderOpen] = useState(false);
  const [smallEventsDialog, setSmallEventsDialog] = useState(null);
  const [showWaitlistForm, setShowWaitlistForm] = useState(false);
  const [waitlistStatus, setWaitlistStatus] = useState('idle');
  const [waitlist, setWaitlist] = useState({
    name: '',
    email: '',
    phone: '',
    familySize: '',
    children: '',
    daysPerWeek: '',
    mealsPerDay: '',
    allergies: '',
    questions: '',
  });
  const [mealPlanImages, setMealPlanImages] = useState([]);
  const [mealPlanLoading, setMealPlanLoading] = useState(false);
  const [mealPlanError, setMealPlanError] = useState(null);

  const pages = [
    { id: 'home', label: 'Home' },
    { id: 'weekly-meals', label: 'Weekly Meals' },
    { id: 'small-events', label: 'Small Events' },
    { id: 'for-businesses', label: 'For Business' },
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

  useEffect(() => {
    let abort = false;
    const controller = new AbortController();

    (async () => {
      setMealPlanLoading(true);
      setMealPlanError(null);
      try {
        const res = await fetch('/api/search-images?query=mealplan&per_page=24', { signal: controller.signal });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed loading meal plan photos');
        const imgs = Array.isArray(data.images) ? data.images : [];
        if (!abort) setMealPlanImages(imgs);
      } catch (e) {
        if (!abort) setMealPlanError(e.message || String(e));
      } finally {
        if (!abort) setMealPlanLoading(false);
      }
    })();

    return () => {
      abort = true;
      controller.abort();
    };
  }, []);

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

    // If it was a quick click (not a drag), open lightbox - very sensitive thresholds
    if (dragDuration < 800 && dragDistance < 30) {
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

  const resetWaitlist = () =>
    setWaitlist({
      name: '',
      email: '',
      phone: '',
      familySize: '',
      children: '',
      daysPerWeek: '',
      mealsPerDay: '',
      allergies: '',
      questions: '',
    });

  const handleWaitlistChange = (field, value) => {
    setWaitlist((prev) => ({ ...prev, [field]: value }));
    if (waitlistStatus !== 'idle') setWaitlistStatus('idle');
  };

  const handleWaitlistSubmit = async (event) => {
    event.preventDefault();
    setWaitlistStatus('sending');
    try {
      const lines = [
        'Weekly Meal Prep Waitlist signup',
        `Name: ${waitlist.name}`,
        `Email: ${waitlist.email}`,
        `Phone: ${waitlist.phone || '(not provided)'}`,
        `Family size: ${waitlist.familySize || '(not provided)'}`,
        `Children & ages: ${waitlist.children || '(not provided)'}`,
        `Days per week: ${waitlist.daysPerWeek || '(not provided)'}`,
        `Meals per day: ${waitlist.mealsPerDay || '(not provided)'}`,
        `Allergies or medical comments: ${waitlist.allergies || '(none noted)'}`,
        '',
        'Questions or notes:',
        waitlist.questions || '(none provided)',
      ];
      const payload = {
        name: waitlist.name,
        email: waitlist.email,
        phone: waitlist.phone,
        subject: 'Meal Prep Waitlist signup',
        type: 'meal-prep-waitlist',
        message: lines.join('\n'),
      };
      const res = await fetch('/api/messages/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      setWaitlistStatus('success');
      resetWaitlist();
    } catch (_error) {
      setWaitlistStatus('error');
    }
  };

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
            <motion.span
              className="text-2xl font-bold tracking-tight"
              style={{ 
                color: '#2F2722', 
                fontFamily: "'National Park', 'General Sans', sans-serif",
                fontWeight: 700,
                letterSpacing: '-0.02em'
              }}
              whileHover={{ scale: 1.03 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              Local Effort
            </motion.span>
            <span className="text-sm font-medium" style={{ color: '#2F2722', fontFamily: "'Office Code Pro', monospace" }}>
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
                    backgroundColor: isActive ? '#1a1a1a' : 'transparent',
                    color: isActive ? '#ffffff' : '#1a1a1a',
                    fontFamily: "'Office Code Pro', monospace",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '#2F2722';
                      e.currentTarget.style.color = '#ffffff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#1a1a1a';
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
          <div className="relative h-full pt-20">
            <div className="flex items-start">
              <div
                className="group"
                style={{
                  marginTop: '50px',
                  marginLeft: '50px',
                  padding: '12px 16px',
                  backgroundColor: 'rgba(128, 128, 128, 0.2)',
                  borderRadius: '6px',
                }}
              >
                <div
                  className="line-through group-hover:italic"
                  style={{
                    color: '#2F2722',
                    fontFamily: "'Office Code Pro', monospace",
                    fontSize: '18px',
                    fontWeight: 600,
                  }}
                >
                  Pickup on Sundays
                </div>
                <button
                  type="button"
                  className="inline-block line-through group-hover:italic"
                  disabled
                  aria-disabled="true"
                  style={{
                    marginTop: '12px',
                    color: '#1a1a1a',
                    fontFamily: "'Office Code Pro', monospace",
                    fontSize: '16px',
                    fontWeight: 600,
                    textDecoration: 'underline',
                    cursor: 'not-allowed',
                    opacity: 0.6,
                  }}
                >
                  order here
                </button>
              </div>
              <motion.span
                aria-hidden="true"
                style={{
                  marginTop: '72px',
                  marginLeft: '24px',
                  marginRight: '24px',
                  color: '#2F2722',
                  fontSize: '24px',
                }}
                animate={{ x: [0, 10, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              >
                →
              </motion.span>
              <div
                style={{
                  marginTop: '50px',
                  marginLeft: '50px',
                }}
              >
                <div
                  className="rounded-md border border-slate-300 bg-white/80 px-4 py-3"
                  style={{ fontFamily: "'Office Code Pro', monospace" }}
                >
                  <div className="text-sm font-semibold text-slate-900">Waiting list</div>
                  <div className="mt-1 text-xs text-slate-600">We&apos;ll let you know when space opens up.</div>
                  <button
                    type="button"
                    className="mt-3 w-full rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                    onClick={() => {
                      resetWaitlist();
                      setWaitlistStatus('idle');
                      setShowWaitlistForm(true);
                    }}
                  >
                    Join the waitlist
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-12 px-[50px]">
              {mealPlanLoading ? (
                <div className="text-sm text-gray-600">Loading photos...</div>
              ) : mealPlanError ? (
                <div className="text-sm text-red-700">{mealPlanError}</div>
              ) : (
                <div className="columns-2 md:columns-3 lg:columns-4 gap-4 [column-fill:_balance]">
                  <div className="mb-4 break-inside-avoid border p-4 bg-white/70 rounded-lg">
                    <div
                      style={{
                        fontFamily: "'Yomogi', cursive",
                        color: '#2F2722',
                        fontSize: '22px',
                        lineHeight: 1.5,
                      }}
                    >
                      From a few meals a week to complete meal replacement. We make wholesome home cooked meals from high integrity local ingredients. We ensure that you eat real food all week.
                    </div>
                  </div>
                  {mealPlanImages.map((img, idx) => (
                    <div
                      key={(img.asset_id || img.public_id || idx) + ':' + idx}
                      className="mb-4 break-inside-avoid border p-2 bg-white rounded-lg overflow-hidden"
                    >
                      {img.thumbnail_url ? (
                        <img
                          src={img.thumbnail_url}
                          alt={img.context?.alt || 'Meal prep image'}
                          className="rounded-lg w-full h-auto"
                          loading="lazy"
                        />
                      ) : (
                        <CloudinaryImage
                          publicId={img.public_id || img.publicId}
                          alt={img.context?.alt || 'Meal prep image'}
                          width={800}
                          className="rounded-lg w-full h-auto"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </FullPageSection>

        {/* Page 3: Small Events */}
        <FullPageSection
          id="small-events"
          style={{ backgroundColor: '#D1D8E0' }}
        >
          <div className="relative w-full h-full">
            <img
              src="https://res.cloudinary.com/dokyhfvyd/image/upload/c_limit,f_auto,q_auto,w_1600/vjuesai2mxfavpq9d2df"
              alt="Small Events"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: 'center' }}
            />
            <div className="relative z-10 flex items-start justify-center h-full pt-24">
              <div
                style={{
                  display: 'table',
                  borderCollapse: 'separate',
                  borderSpacing: '16px',
                }}
              >
                <div style={{ display: 'table-row' }}>
                  <div style={{ display: 'table-cell' }}>
                    <button
                      type="button"
                      onClick={() => setSmallEventsDialog('dinner')}
                      className="px-6 py-5 rounded-md border border-white/70 bg-white/80 text-left text-base font-semibold text-slate-900 hover:bg-white"
                      style={{ fontFamily: "'Office Code Pro', monospace" }}
                    >
                      dinner party in my home
                    </button>
                  </div>
                  <div style={{ display: 'table-cell' }}>
                    <button
                      type="button"
                      onClick={() => setSmallEventsDialog('weddings')}
                      className="px-6 py-5 rounded-md border border-white/70 bg-white/80 text-left text-base font-semibold text-slate-900 hover:bg-white"
                      style={{ fontFamily: "'Office Code Pro', monospace" }}
                    >
                      weddings
                    </button>
                  </div>
                  <div style={{ display: 'table-cell' }}>
                    <button
                      type="button"
                      onClick={() => setSmallEventsDialog('holiday')}
                      className="px-6 py-5 rounded-md border border-white/70 bg-white/80 text-left text-base font-semibold text-slate-900 hover:bg-white"
                      style={{ fontFamily: "'Office Code Pro', monospace" }}
                    >
                      small events and holiday parties
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FullPageSection>

        {/* Page 4: For Businesses */}
        <FullPageSection
          id="for-businesses"
          style={{ backgroundColor: '#E6EBF2' }}
        >
          <div className="h-full pt-20" />
        </FullPageSection>

        {/* Page 5: About */}
        <FullPageSection
          id="about"
          style={{ backgroundColor: '#D1D8E0' }}
        >
          <div className="relative w-full h-full">
            <img
              src="https://res.cloudinary.com/dokyhfvyd/image/upload/c_limit,f_auto,q_auto,w_1600/jo9pxtjng8zpt4yo4rcz?_a=BAMAK+eA0"
              alt="About Local Effort"
              className="w-full h-full object-contain"
              style={{ objectPosition: 'center', backgroundColor: '#D1D8E0' }}
            />
          </div>
        </FullPageSection>

        {/* Page 6: Local Pizza */}
        <FullPageSection
          id="local-pizza"
          style={{ backgroundColor: '#E6EBF2' }}
        >
          <div className="h-full pt-20" />
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

      <Dialog open={orderOpen} onOpenChange={setOrderOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Weekly Meals Ordering</DialogTitle>
            <DialogDescription>
              Demo menu and ordering flow. We will replace this with the real system.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-slate-900">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="text-sm font-semibold">Small Menu</div>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Roasted lemon chicken</span>
                  <span>$14</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Herb tofu bowl</span>
                  <span>$12</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Seasonal veggie lasagna</span>
                  <span>$13</span>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="font-semibold">Pickup window</div>
              <div className="mt-1 text-slate-700">Sundays, 4:00-6:00 PM</div>
            </div>
            <button
              type="button"
              className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              onClick={() => setOrderOpen(false)}
            >
              Place demo order
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={smallEventsDialog === 'dinner'} onOpenChange={(open) => setSmallEventsDialog(open ? 'dinner' : null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
          <DialogTitle>Dinner party in my home</DialogTitle>
            <DialogDescription>
              Demo info for a private in-home dinner. We&apos;ll customize this later.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-slate-700">
            Chef-led, multi-course dinner for small groups with seasonal menus and on-site service.
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={smallEventsDialog === 'weddings'} onOpenChange={(open) => setSmallEventsDialog(open ? 'weddings' : null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Weddings</DialogTitle>
            <DialogDescription>
              Demo info for wedding catering. We&apos;ll refine details later.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-slate-700">
            Flexible packages for rehearsal dinners, plated service, and late-night bites.
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={smallEventsDialog === 'holiday'} onOpenChange={(open) => setSmallEventsDialog(open ? 'holiday' : null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Small events and holiday parties</DialogTitle>
            <DialogDescription>
              Demo info for seasonal gatherings. We&apos;ll personalize later.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-slate-700">
            Drop-off or staffed menus for work parties, milestones, and holiday hosting.
          </div>
        </DialogContent>
      </Dialog>

      {showWaitlistForm && (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center bg-black/60 px-4 py-8 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="form-card w-full max-w-xl max-h-[90vh] overflow-y-auto relative">
            <button
              type="button"
              className="absolute right-4 top-4 text-sm underline z-10"
              onClick={() => {
                setShowWaitlistForm(false);
                setWaitlistStatus('idle');
                resetWaitlist();
              }}
            >
              Close
            </button>
            <h2 className="text-2xl font-bold mb-2">Join the waiting list</h2>
            <p className="text-sm text-gray-600 mb-4">
              We&apos;ll reach out when weekly meal pickup slots reopen.
            </p>
            <form onSubmit={handleWaitlistSubmit} className="space-y-4">
              <div>
                <label className="label" htmlFor="weekly-waitlist-name">Name</label>
                <input
                  id="weekly-waitlist-name"
                  className="input"
                  value={waitlist.name}
                  onChange={(e) => handleWaitlistChange('name', e.target.value)}
                  required
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="weekly-waitlist-email">Email</label>
                  <input
                    id="weekly-waitlist-email"
                    type="email"
                    className="input"
                    value={waitlist.email}
                    onChange={(e) => handleWaitlistChange('email', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label" htmlFor="weekly-waitlist-phone">Phone number</label>
                  <input
                    id="weekly-waitlist-phone"
                    className="input"
                    value={waitlist.phone}
                    onChange={(e) => handleWaitlistChange('phone', e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="weekly-waitlist-family">Family size</label>
                <input
                  id="weekly-waitlist-family"
                  className="input"
                  placeholder="e.g. 2 adults, 2 kids"
                  value={waitlist.familySize}
                  onChange={(e) => handleWaitlistChange('familySize', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="weekly-waitlist-children">Children &amp; ages</label>
                <textarea
                  id="weekly-waitlist-children"
                  className="textarea"
                  rows={2}
                  value={waitlist.children}
                  onChange={(e) => handleWaitlistChange('children', e.target.value)}
                  placeholder="Tell us about school schedules, toddlers, or teens."
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label" htmlFor="weekly-waitlist-days">Days per week</label>
                  <input
                    id="weekly-waitlist-days"
                    className="input"
                    placeholder="How many days should we cover?"
                    value={waitlist.daysPerWeek}
                    onChange={(e) => handleWaitlistChange('daysPerWeek', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label" htmlFor="weekly-waitlist-meals">Meals per day</label>
                  <input
                    id="weekly-waitlist-meals"
                    className="input"
                    placeholder="Breakfast, lunch, dinner?"
                    value={waitlist.mealsPerDay}
                    onChange={(e) => handleWaitlistChange('mealsPerDay', e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="weekly-waitlist-allergies">Allergies or medical comments</label>
                <textarea
                  id="weekly-waitlist-allergies"
                  className="textarea"
                  rows={3}
                  value={waitlist.allergies}
                  onChange={(e) => handleWaitlistChange('allergies', e.target.value)}
                  placeholder="Include any dietary restrictions, allergies, or doctor notes."
                />
              </div>
              <div>
                <label className="label" htmlFor="weekly-waitlist-questions">Questions for the team</label>
                <textarea
                  id="weekly-waitlist-questions"
                  className="textarea"
                  rows={3}
                  value={waitlist.questions}
                  onChange={(e) => handleWaitlistChange('questions', e.target.value)}
                  placeholder="Anything else we should know?"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button type="submit" className="btn btn-primary" disabled={waitlistStatus === 'sending'}>
                  {waitlistStatus === 'sending' ? 'Submitting...' : 'Join waitlist'}
                </button>
                {waitlistStatus === 'success' && (
                  <span className="text-green-700 text-sm">Thanks! We&apos;ll be in touch.</span>
                )}
                {waitlistStatus === 'error' && (
                  <span className="text-red-700 text-sm">We couldn&apos;t submit your request. Please try again.</span>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default FullPageDemoPage;
