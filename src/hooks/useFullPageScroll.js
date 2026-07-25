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
    if (!section) return;

    // Horizontal mode drives the scroll container's own axis directly rather
    // than using scrollIntoView. scrollIntoView with block:'nearest' is still
    // free to move the *vertical* axis, and the container carries ~60px of
    // phantom vertical overflow (100vh sections inside a 100vh flex row that
    // reserves a horizontal scrollbar gutter). The result was that the first
    // tab click set container.scrollTop to 60, shoving every panel up and
    // exposing a 60px band of the page background under the fold.
    if (scrollDirection === 'horizontal') {
      const container = section.parentElement;
      if (container) {
        container.scrollTo({ left: section.offsetLeft, behavior: 'smooth' });
        // Belt and braces: a focus inside a panel can still nudge the axis.
        if (container.scrollTop !== 0) container.scrollTop = 0;
      } else {
        section.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
      }
    } else {
      section.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
    }
    setMoveDirection(index > activeSection ? 1 : -1);
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
