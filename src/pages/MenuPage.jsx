// src/pages/MenuPage.js
import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { sampleMenus } from '../data/sampleMenus';
import { motion, AnimatePresence } from 'framer-motion';
import CloudinaryImage from '../components/common/cloudinaryImage'; // Make sure you have this component

// This is the card component for each menu. Adds a compact mode when collapsed.
const ServiceCard = ({ title, description, children, isOpen = false }) => (
  <motion.div
    className={
      `group rounded-xl bg-neutral-50 shadow-sm ring-1 ring-neutral-200 transition-all hover:shadow-md ` +
      (isOpen ? 'p-8' : 'p-4 md:p-5')
    }
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <h4 className={isOpen ? 'text-2xl font-bold uppercase tracking-tight' : 'text-xl font-bold uppercase tracking-tight'}>
      {title}
    </h4>
    <p className={isOpen ? 'font-mono text-neutral-600 min-h-[2rem] mt-2' : 'font-mono text-neutral-600 mt-1'}>
      {description}
    </p>
    <div className={isOpen ? 'mt-4' : 'mt-2'}>{children}</div>
  </motion.div>
);

export default function MenuPage() {
  // State to manage which menu accordion is open
  const [openMenu, setOpenMenu] = useState(null);
  // Hover handling with fallback lookup
  const [hoveredKey, setHoveredKey] = useState(null);
  const [lookup, setLookup] = useState({}); // key -> publicId

  const toggleMenu = (id) => setOpenMenu(openMenu === id ? null : id);

  const menuJsonLd = useMemo(() => {
    // Build a basic Restaurant with hasMenu JSON-LD
    const menuSections = sampleMenus.map((m) => ({
      '@type': 'Menu',
      name: m.title,
      hasMenuSection: (m.sections || []).map((s) => ({
        '@type': 'MenuSection',
        name: s.course,
        hasMenuItem: (s.items || []).map((it) => ({ '@type': 'MenuItem', name: it.name }))
      }))
    }));
    return {
      '@context': 'https://schema.org',
      '@type': 'Restaurant',
      name: 'Local Effort',
      url: 'https://localeffortfood.com/menu',
      servesCuisine: ['American', 'Local', 'Farm to Table', 'Seasonal'],
      areaServed: 'Twin Cities, MN',
      hasMenu: menuSections
    };
  }, []);

  return (
  <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8 py-8">
      <Helmet>
        <title>Past Menu Examples | Local Effort</title>
        <meta name="description" content="Real menus from recent events, showcasing wide options and locally sourced food." />
        <link rel="canonical" href="https://localeffortfood.com/menu" />
        <script type="application/ld+json">{JSON.stringify(menuJsonLd)}</script>
      </Helmet>
      <h1 className="text-4xl font-bold mb-4 text-center">Past Menu Examples.</h1>
      <div className="prose-lite max-w-3xl mx-auto text-center mb-8">
        <p>
          these are all real menus from events in the past couple years, just to show how wide the options are. We love to &quot;make it local.&quot;
        </p>
      </div>

  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sampleMenus.map((menu) => {
          const isOpen = openMenu === menu.id;

          return (
      <ServiceCard key={menu.id} title={menu.title} description={menu.description || ''} isOpen={isOpen}>
              <button
                onClick={() => toggleMenu(menu.id)}
                className="mt-2 text-sm font-medium text-blue-600 hover:underline"
              >
        {isOpen ? 'Hide Sections ▲' : 'View More ▼'}
              </button>

              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden mt-4"
              >
                {isOpen &&
                  menu.sections.map((section, idx) => (
                    <div key={idx} className="mt-4">
                      <h5 className="text-lg font-semibold">{section.course}</h5>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        {section.items.map((item, i) => {
                          const hasImage = typeof item.imagePublicId === 'string' && item.imagePublicId.trim().length > 0;
                          const itemKey = `${menu.id}-${section.course}-${i}`;
                          const previewPublicId = hasImage ? item.imagePublicId : lookup[itemKey];

                          const handleEnter = async () => {
                            if (hasImage) {
                              setHoveredKey(itemKey);
                              return;
                            }
                            // Attempt a best-effort lookup by slugifying the name and using tag search
                            setHoveredKey(itemKey);
                            if (lookup[itemKey]) return;
                            const slug = String(item.name || '')
                              .toLowerCase()
                              .replace(/[^a-z0-9]+/g, '_')
                              .replace(/^_+|_+$/g, '');
                            if (!slug) return;
                            try {
                              const res = await fetch(`/api/search-images?query=${encodeURIComponent(slug)}&per_page=1`);
                              if (!res.ok) return;
                              const data = await res.json();
                              const first = (data.images || [])[0];
                              if (first && first.public_id) {
                                setLookup((prev) => ({ ...prev, [itemKey]: first.public_id }));
                              }
                            } catch (_) {
                              // ignore
                            }
                          };
                          return (
                            <li
                              key={i}
                              onMouseEnter={handleEnter}
                              onMouseLeave={() => setHoveredKey(null)}
                              className={`relative py-1 ${hasImage || lookup[itemKey] ? 'cursor-pointer' : 'cursor-default'}`}
                            >
                              <span className={`font-medium ${hasImage || lookup[itemKey] ? 'underline decoration-dotted underline-offset-2' : ''}`}>
                                {item.name}
                              </span>
                              {hasImage || lookup[itemKey] ? (
                                <span className="ml-1 align-middle inline-block text-neutral-500" title="Preview available" aria-hidden="true">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" stroke="currentColor" strokeWidth="1.5"/>
                                    <path d="M9 11l3 3 3-3 4 5H5l4-5z" stroke="currentColor" strokeWidth="1.5"/>
                                    <circle cx="8" cy="9" r="1.5" fill="currentColor"/>
                                  </svg>
                                </span>
                              ) : null}
                            {item.note && (
                              <span className="text-gray-600 italic">
                                {' — '}
                                {item.note}
                              </span>
                            )}
                            {item.dietary?.length > 0 && (
                              <span className="ml-2 text-sm text-green-600">
                                [{item.dietary.join(', ')}]
                              </span>
                            )}

                              {/* Show hover preview only when an imagePublicId exists */}
                {(hasImage || previewPublicId) && (
                                <AnimatePresence>
                  {hoveredKey === itemKey && (
                                    <motion.div
                                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-white rounded-lg shadow-xl z-20 w-48 h-48 pointer-events-none"
                                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                                    >
                                      <CloudinaryImage
                    publicId={previewPublicId}
                                        alt={item.name}
                                        width={200}
                                        height={200}
                                        className="rounded-md w-full h-full object-cover"
                                        placeholderMode="none"
                                      />
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
              </motion.div>
            </ServiceCard>
          );
        })}
      </div>
    </div>
  );
}
