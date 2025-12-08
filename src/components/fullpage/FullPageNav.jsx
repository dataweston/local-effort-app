// src/components/fullpage/FullPageNav.jsx
import React from 'react';
import { motion } from 'framer-motion';

/**
 * FullPageNav component - Navigation dots for full-page sections
 *
 * @param {Array<{id: string, label: string}>} sections - Section metadata
 * @param {number} activeIndex - Currently active section index
 * @param {function} onNavigate - Callback to navigate to section
 * @param {string} position - Position: 'right' or 'bottom' (default: 'right')
 * @param {boolean} showLabels - Show text labels next to dots (default: false)
 */
const FullPageNav = ({
  sections,
  activeIndex,
  onNavigate,
  position = 'right',
  showLabels = false,
}) => {
  const isRight = position === 'right';

  return (
    <nav
      className={`fixed z-50 ${
        isRight
          ? 'right-6 top-1/2 -translate-y-1/2 flex flex-col gap-4'
          : 'bottom-6 left-1/2 -translate-x-1/2 flex flex-row gap-4'
      }`}
      aria-label="Full page navigation"
    >
      {sections.map((section, index) => {
        const isActive = index === activeIndex;

        return (
          <motion.button
            key={section.id}
            onClick={() => onNavigate(index)}
            className={`group relative flex items-center ${
              isRight ? 'flex-row' : 'flex-col'
            } gap-2`}
            aria-label={`Navigate to ${section.label}`}
            aria-current={isActive ? 'true' : 'false'}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            {/* Dot indicator */}
            <motion.span
              className={`block rounded-full transition-all duration-300 ${
                isActive
                  ? 'w-3 h-3 bg-neutral-900'
                  : 'w-2 h-2 bg-neutral-400 group-hover:bg-neutral-600'
              }`}
              animate={{
                scale: isActive ? 1.2 : 1,
              }}
              transition={{ duration: 0.3 }}
            />

            {/* Optional label */}
            {showLabels && (
              <motion.span
                className={`text-xs font-medium transition-all duration-300 ${
                  isActive ? 'text-neutral-900' : 'text-neutral-500'
                } ${isRight ? 'group-hover:translate-x-1' : 'group-hover:translate-y-1'}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: isActive ? 1 : 0.7 }}
              >
                {section.label}
              </motion.span>
            )}

            {/* Tooltip on hover (when labels are hidden) */}
            {!showLabels && (
              <span
                className={`absolute ${
                  isRight ? 'right-full mr-3' : 'bottom-full mb-3'
                } whitespace-nowrap bg-neutral-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none`}
              >
                {section.label}
              </span>
            )}
          </motion.button>
        );
      })}
    </nav>
  );
};

export default FullPageNav;
