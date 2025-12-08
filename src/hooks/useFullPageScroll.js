// src/hooks/useFullPageScroll.js
import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for full-page scroll navigation (horizontal or vertical)
 * Tracks active section using IntersectionObserver and provides navigation controls
 *
 * @param {Array} sectionRefs - Array of React refs for each section
 * @param {boolean} enableKeyboard - Enable keyboard navigation (default: true)
 * @param {string} direction - Scroll direction: 'horizontal' or 'vertical' (default: 'vertical')
 * @returns {Object} { activeSection, scrollToSection, direction }
 */
export const useFullPageScroll = (sectionRefs, enableKeyboard = true, scrollDirection = 'vertical') => {
  const [activeSection, setActiveSection] = useState(0);
  const [moveDirection, setMoveDirection] = useState(0); // 1 = forward, -1 = backward, 0 = none
  const lastScrollPos = useRef(0);

  // Function to scroll to a specific section
  const scrollToSection = useCallback((index) => {
    if (index < 0 || index >= sectionRefs.length) return;

    const section = sectionRefs[index]?.current;
    if (section) {
      section.scrollIntoView({
        behavior: 'smooth',
        block: scrollDirection === 'horizontal' ? 'nearest' : 'start',
        inline: scrollDirection === 'horizontal' ? 'start' : 'nearest'
      });
      setMoveDirection(index > activeSection ? 1 : -1);
    }
  }, [sectionRefs, activeSection, scrollDirection]);

  // IntersectionObserver to track active section
  useEffect(() => {
    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.5, // Section is "active" when 50% visible
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const index = sectionRefs.findIndex(
            (ref) => ref.current === entry.target
          );
          if (index !== -1 && index !== activeSection) {
            setActiveSection(index);

            // Determine scroll direction
            const currentScrollPos = scrollDirection === 'horizontal' ? window.scrollX : window.scrollY;
            setMoveDirection(currentScrollPos > lastScrollPos.current ? 1 : -1);
            lastScrollPos.current = currentScrollPos;
          }
        }
      });
    }, options);

    // Observe all sections
    sectionRefs.forEach((ref) => {
      if (ref.current) {
        observer.observe(ref.current);
      }
    });

    return () => {
      sectionRefs.forEach((ref) => {
        if (ref.current) {
          observer.unobserve(ref.current);
        }
      });
    };
  }, [sectionRefs, activeSection, scrollDirection]);

  // Keyboard navigation
  useEffect(() => {
    if (!enableKeyboard) return;

    const handleKeyDown = (e) => {
      if (scrollDirection === 'horizontal') {
        switch (e.key) {
          case 'ArrowRight':
          case 'PageDown':
            e.preventDefault();
            scrollToSection(activeSection + 1);
            break;
          case 'ArrowLeft':
          case 'PageUp':
            e.preventDefault();
            scrollToSection(activeSection - 1);
            break;
          case 'Home':
            e.preventDefault();
            scrollToSection(0);
            break;
          case 'End':
            e.preventDefault();
            scrollToSection(sectionRefs.length - 1);
            break;
          default:
            break;
        }
      } else {
        switch (e.key) {
          case 'ArrowDown':
          case 'PageDown':
            e.preventDefault();
            scrollToSection(activeSection + 1);
            break;
          case 'ArrowUp':
          case 'PageUp':
            e.preventDefault();
            scrollToSection(activeSection - 1);
            break;
          case 'Home':
            e.preventDefault();
            scrollToSection(0);
            break;
          case 'End':
            e.preventDefault();
            scrollToSection(sectionRefs.length - 1);
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSection, enableKeyboard, scrollToSection, sectionRefs.length, scrollDirection]);

  return {
    activeSection,
    scrollToSection,
    direction: moveDirection,
  };
};
