// src/pages/MenuPage.js
import React, { useState } from 'react';
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
  // State to track the publicId of the currently hovered menu item
  const [hoveredImage, setHoveredImage] = useState(null);

  const toggleMenu = (id) => setOpenMenu(openMenu === id ? null : id);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 text-center">Past Menu Examples.</h1>

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
                        {section.items.map((item, i) => (
                          <li
                            key={i}
                            // Set the hovered image ID on mouse enter
                            onMouseEnter={() => setHoveredImage(item.imagePublicId)}
                            // Clear it on mouse leave
                            onMouseLeave={() => setHoveredImage(null)}
                            className="relative py-1" // Add padding and relative positioning
                          >
                            <span className="font-medium">{item.name}</span>
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

                            {/* AnimatePresence allows the image to fade in and out smoothly */}
                            <AnimatePresence>
                              {hoveredImage === item.imagePublicId && (
                                <motion.div
                                  // This div contains the pop-up image
                                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-white rounded-lg shadow-xl z-20 w-48 h-48 pointer-events-none"
                                  // Animation properties
                                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                                >
                                  <CloudinaryImage
                                    publicId={item.imagePublicId}
                                    alt={item.name}
                                    width={200}
                                    height={200}
                                    className="rounded-md w-full h-full object-cover"
                                  />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </li>
                        ))}
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
