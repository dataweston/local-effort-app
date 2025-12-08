// src/components/fullpage/FullPageContainer.jsx
import React, { useRef, useEffect, Children, cloneElement } from 'react';
import { useLocation } from 'react-router-dom';
import { useFullPageScroll } from '../../hooks/useFullPageScroll';

/**
 * FullPageContainer component - Main container for horizontal full-page scroll
 *
 * @param {Array<{id: string, label: string}>} pages - Page metadata for navigation
 * @param {boolean} enableKeyboard - Enable keyboard navigation (default: true)
 * @param {string} snapType - Scroll-snap strictness: 'mandatory' or 'proximity' (default: 'mandatory')
 * @param {function} onPageChange - Callback when active page changes
 * @param {ReactNode} children - FullPageSection components (pages)
 */
const FullPageContainer = ({
  pages,
  enableKeyboard = true,
  snapType = 'mandatory',
  onPageChange,
  children,
}) => {
  const location = useLocation();
  const containerRef = useRef(null);

  // Create refs for each page
  const pageRefs = useRef(
    pages.map(() => React.createRef())
  );

  // Use custom hook for scroll management
  const { activeSection: activePage, scrollToSection: scrollToPage } = useFullPageScroll(
    pageRefs.current,
    enableKeyboard,
    'horizontal'
  );

  // Expose scrollToPage to parent via callback
  useEffect(() => {
    if (window) {
      window.scrollToPage = scrollToPage;
    }
  }, [scrollToPage]);

  // Call onPageChange callback when active page changes
  useEffect(() => {
    if (onPageChange) {
      onPageChange(activePage);
    }
  }, [activePage, onPageChange]);

  // Handle hash navigation (e.g., /page#page-id)
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const pageIndex = pages.findIndex((page) => page.id === id);

      if (pageIndex !== -1) {
        // Delay to allow AnimatePresence to complete
        setTimeout(() => {
          scrollToPage(pageIndex);
        }, 600);
      }
    }
  }, [location.hash, pages, scrollToPage]);

  // Clone children and attach refs
  const childrenWithRefs = Children.map(children, (child, index) => {
    if (!child) return null;

    return cloneElement(child, {
      ref: pageRefs.current[index],
      id: pages[index]?.id || child.props.id,
    });
  });

  return (
    <div
      ref={containerRef}
      className="fullpage-container"
      style={{
        scrollSnapType: `x ${snapType}`,
      }}
    >
      {childrenWithRefs}
    </div>
  );
};

export default FullPageContainer;
