// src/components/fullpage/FullPageSection.jsx
import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import {
  fullPageSectionReveal,
  fullPageSlideUp,
  fullPageFadeScale,
  fullPageStagger,
} from '../../utils/animations';

/**
 * FullPageSection component - A full viewport width page with scroll-snap (horizontal)
 *
 * @param {string} id - Page ID (for hash navigation)
 * @param {string} className - Additional Tailwind classes
 * @param {string} animation - Animation variant name (sectionReveal, slideUp, fadeScale, stagger)
 * @param {number} animationDelay - Animation delay in seconds (default: 0)
 * @param {ReactNode} children - Page content
 */
const FullPageSection = forwardRef(
  (
    {
      id,
      className = '',
      animation = 'sectionReveal',
      animationDelay = 0,
      children,
      ...props
    },
    ref
  ) => {
    // Map animation name to variant
    const animationVariants = {
      sectionReveal: fullPageSectionReveal,
      slideUp: fullPageSlideUp,
      fadeScale: fullPageFadeScale,
      stagger: fullPageStagger,
    };

    const selectedVariant = animationVariants[animation] || fullPageSectionReveal;

    return (
      <motion.div
        ref={ref}
        id={id}
        className={`fullpage-section ${className}`}
        variants={selectedVariant}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        transition={{
          ...selectedVariant.visible?.transition,
          delay: animationDelay,
        }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

FullPageSection.displayName = 'FullPageSection';

export default FullPageSection;
