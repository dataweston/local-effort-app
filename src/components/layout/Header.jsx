import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FULLPAGE_PAGES, HEADER_CTA, HEADER_NAV } from '../../config/fullPageNav';
import './header-nav.css';

export const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activePanel, setActivePanel] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'auto';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  // The home page's scroll-snap container reports the visible panel here. This
  // replaced a DOM-mutation sync in FullPageDemoPage that queried
  // `nav button[data-menu-btn]` while this nav rendered anchors — so it never
  // matched and the active tab was never marked. React state, one source.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onPanel = (event) => {
      const next = Number(event.detail);
      if (Number.isFinite(next)) setActivePanel(next);
    };
    window.addEventListener('localeffort:panelchange', onPanel);
    return () => window.removeEventListener('localeffort:panelchange', onPanel);
  }, []);

  const isItemActive = (item) => {
    if (item.pageIndex != null) return isHome && activePanel === item.pageIndex;
    return location.pathname === item.href;
  };

  // Home-page panels scroll in place; everything else is a route.
  const go = (item) => (event) => {
    if (item.pageIndex == null) return; // let the anchor navigate normally
    event.preventDefault();
    setIsOpen(false);
    if (!isHome) {
      navigate(item.pageIndex === 0 ? '/' : { pathname: '/', hash: `#${item.id}` });
      return;
    }
    if (typeof window.scrollToPage === 'function') window.scrollToPage(item.pageIndex);
    const hash = item.pageIndex === 0 ? '' : `#${item.id}`;
    if (hash) {
      if (location.hash !== hash) navigate({ pathname: '/', hash }, { replace: true });
    } else if (location.hash) {
      navigate({ pathname: '/' }, { replace: true });
    }
  };

  const goHome = (event) => {
    event.preventDefault();
    setIsOpen(false);
    if (!isHome) { navigate('/'); return; }
    if (typeof window.scrollToPage === 'function') window.scrollToPage(0);
    if (location.hash) navigate({ pathname: '/' }, { replace: true });
  };

  return (
    <header className="le-header">
      <div className="le-header__bar">
        <a href="/" className="le-header__brand" onClick={goHome}>
          <motion.span
            className="le-header__wordmark"
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            Local Effort Cooperative
          </motion.span>
          <span className="le-header__tagline">always mostly local</span>
        </a>

        <nav className="le-header__nav" aria-label="Main">
          {HEADER_NAV.map((item) => {
            const active = isItemActive(item);
            return (
              <a
                key={item.id}
                href={item.href}
                onClick={go(item)}
                className="le-nav-item"
                aria-current={active ? 'page' : undefined}
                data-active={active ? 'true' : 'false'}
                style={{ '--nav-accent': item.accent }}
              >
                <span className="le-nav-item__label">{item.label}</span>
                <span className="le-nav-item__note">{item.note}</span>
              </a>
            );
          })}
          <a
            href={HEADER_CTA.href}
            className="le-nav-cta"
            aria-current={location.pathname === HEADER_CTA.href ? 'page' : undefined}
            data-active={location.pathname === HEADER_CTA.href ? 'true' : 'false'}
          >
            {HEADER_CTA.label}
          </a>
        </nav>

        <button
          onClick={() => setIsOpen((v) => !v)}
          className="le-header__burger"
          aria-label="Toggle menu"
          aria-expanded={isOpen}
        >
          <span className={isOpen ? 'is-open' : ''} />
          <span className={isOpen ? 'is-open' : ''} />
          <span className={isOpen ? 'is-open' : ''} />
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="le-header__sheet"
          >
            <motion.nav
              initial="hidden"
              animate="show"
              exit="hidden"
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.08 } },
              }}
              aria-label="Main"
            >
              <motion.a
                href="/"
                onClick={goHome}
                className="le-sheet-item"
                style={{ '--nav-accent': 'var(--brand-bridge)' }}
                variants={{ hidden: { y: 8, opacity: 0 }, show: { y: 0, opacity: 1 } }}
              >
                <span className="le-sheet-item__label">{FULLPAGE_PAGES[0].label}</span>
                <span className="le-sheet-item__note">the photo wall</span>
              </motion.a>
              {HEADER_NAV.map((item) => (
                <motion.a
                  key={item.id}
                  href={item.href}
                  onClick={go(item)}
                  className="le-sheet-item"
                  data-active={isItemActive(item) ? 'true' : 'false'}
                  style={{ '--nav-accent': item.accent }}
                  variants={{ hidden: { y: 8, opacity: 0 }, show: { y: 0, opacity: 1 } }}
                >
                  <span className="le-sheet-item__label">{item.label}</span>
                  <span className="le-sheet-item__note">{item.note}</span>
                </motion.a>
              ))}
              <motion.a
                href={HEADER_CTA.href}
                className="le-sheet-cta"
                variants={{ hidden: { y: 8, opacity: 0 }, show: { y: 0, opacity: 1 } }}
              >
                {HEADER_CTA.label}
              </motion.a>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
