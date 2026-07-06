import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FULLPAGE_PAGES } from '../../config/fullPageNav';

export const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const navItems = FULLPAGE_PAGES.slice(1);
  const isUpcomingRoute = location.pathname === '/julydinner';
  const isShopRoute = location.pathname === '/sale';
  const isLocalistRoute = location.pathname === '/localist';

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'auto';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  const handleNavigate = (index) => {
    const page = FULLPAGE_PAGES[index];
    if (!page) return;
    const hash = page.id === 'home' ? '' : `#${page.id}`;
    const target = hash ? `/${hash}` : '/';

    if (location.pathname !== '/') {
      navigate(target);
      setIsOpen(false);
      return;
    }

    if (typeof window !== 'undefined' && typeof window.scrollToPage === 'function') {
      window.scrollToPage(index);
    }

    if (hash) {
      if (location.hash !== hash) {
        navigate({ pathname: '/', hash }, { replace: true });
      }
    } else if (location.hash) {
      navigate({ pathname: '/' }, { replace: true });
    }

    setIsOpen(false);
  };

  const handleHoverOn = (event) => {
    if (event.currentTarget.dataset.active === 'true') return;
    event.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
    event.currentTarget.style.color = 'var(--color-text-primary)';
  };

  const handleHoverOff = (event) => {
    if (event.currentTarget.dataset.active === 'true') return;
    event.currentTarget.style.backgroundColor = 'transparent';
    event.currentTarget.style.color = 'var(--color-text-primary)';
  };

  return (
    <header
      className="fixed left-0 right-0 z-50 shadow-sm"
      style={{
        top: 'var(--announcement-offset, 0px)',
        backgroundColor: 'var(--color-bg-page)',
        borderBottom: '1px solid var(--color-border-default)',
      }}
    >
      <div className="flex items-center justify-between px-4 py-4 sm:px-6">
        <button
          type="button"
          onClick={() => handleNavigate(0)}
          className="flex min-w-0 items-center gap-3"
        >
          <motion.span
            className="text-lg font-bold sm:text-xl lg:text-2xl"
            style={{
              color: 'var(--color-text-primary)',
              fontFamily: "'National Park', 'General Sans', sans-serif",
              fontWeight: 700,
              letterSpacing: 0,
              lineHeight: 1,
            }}
            whileHover={{ scale: 1.03 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            Local Effort Cooperative
          </motion.span>
          <span
            className="hidden text-sm font-medium xl:inline"
            style={{
              color: 'var(--color-text-primary)',
              fontFamily: "'Office Code Pro', monospace",
            }}
          >
            always mostly local
          </span>
        </button>

        <nav className="hidden lg:flex gap-1">
          {navItems.map((page, index) => {
            const pageIndex = index + 1;
            const href = `/#${page.id}`;
            return (
              <a
                key={page.id}
                href={href}
                data-menu-btn
                data-page-index={pageIndex}
                data-active="false"
                onClick={(e) => { e.preventDefault(); handleNavigate(pageIndex); }}
                className="px-4 py-2 rounded-md text-sm font-medium transition-all group"
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--color-text-primary)',
                  fontFamily: "'Office Code Pro', monospace",
                  textDecoration: 'none',
                }}
                onMouseEnter={handleHoverOn}
                onMouseLeave={handleHoverOff}
              >
                {page.label}
              </a>
            );
          })}
          <Link
            to="/julydinner"
            data-active={isUpcomingRoute ? 'true' : 'false'}
            className="px-4 py-2 rounded-md text-sm font-medium transition-all group"
            style={{
              backgroundColor: isUpcomingRoute ? 'var(--color-bg-secondary)' : 'transparent',
              color: 'var(--color-text-primary)',
              fontFamily: "'Office Code Pro', monospace",
              textDecoration: 'none',
            }}
            onMouseEnter={handleHoverOn}
            onMouseLeave={handleHoverOff}
          >
            Upcoming
          </Link>
          <Link
            to="/sale"
            data-active={isShopRoute ? 'true' : 'false'}
            className="px-4 py-2 rounded-md text-sm font-medium transition-all group"
            style={{
              backgroundColor: isShopRoute ? 'var(--color-bg-secondary)' : 'transparent',
              color: 'var(--color-text-primary)',
              fontFamily: "'Office Code Pro', monospace",
              textDecoration: 'none',
            }}
            onMouseEnter={handleHoverOn}
            onMouseLeave={handleHoverOff}
          >
            Shop
          </Link>
          <Link
            to="/localist"
            data-active={isLocalistRoute ? 'true' : 'false'}
            className="px-4 py-2 rounded-md text-sm font-medium transition-all group"
            style={{
              backgroundColor: isLocalistRoute ? 'var(--color-bg-secondary)' : 'transparent',
              color: 'var(--color-text-primary)',
              fontFamily: "'Office Code Pro', monospace",
              textDecoration: 'none',
            }}
            onMouseEnter={handleHoverOn}
            onMouseLeave={handleHoverOff}
          >
            Become a Localist
          </Link>
        </nav>

        <button
          onClick={() => setIsOpen((v) => !v)}
          className="z-50 flex h-7 w-9 flex-col justify-between lg:hidden"
          aria-label="Toggle menu"
        >
          <span
            className={`block h-0.5 w-full bg-slate-900 transition-transform ${isOpen ? 'rotate-45 translate-y-[10px]' : ''}`}
          />
          <span
            className={`block h-0.5 w-full bg-slate-900 transition-opacity ${isOpen ? 'opacity-0' : 'opacity-100'}`}
          />
          <span
            className={`block h-0.5 w-full bg-slate-900 transition-transform ${isOpen ? '-rotate-45 -translate-y-[10px]' : ''}`}
          />
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[var(--color-bg-page)] lg:hidden"
          >
            <motion.nav
              initial="hidden"
              animate="show"
              exit="hidden"
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: { staggerChildren: 0.08, delayChildren: 0.12 },
                },
              }}
              className="flex flex-col items-center justify-center h-full space-y-6 px-6"
            >
              {FULLPAGE_PAGES.map((page, index) => (
                <motion.a
                  key={page.id}
                  href={page.id === 'home' ? '/' : `/#${page.id}`}
                  onClick={(e) => { e.preventDefault(); handleNavigate(index); }}
                  className="text-3xl uppercase text-center text-slate-900"
                  style={{ fontFamily: "'Office Code Pro', monospace", textDecoration: 'none' }}
                  variants={{ hidden: { y: 10, opacity: 0 }, show: { y: 0, opacity: 1 } }}
                >
                  {page.label}
                </motion.a>
              ))}
              <motion.a
                href="/julydinner"
                onClick={(e) => { e.preventDefault(); navigate('/julydinner'); setIsOpen(false); }}
                className="text-3xl uppercase text-center text-slate-900"
                style={{ fontFamily: "'Office Code Pro', monospace", textDecoration: 'none' }}
                variants={{ hidden: { y: 10, opacity: 0 }, show: { y: 0, opacity: 1 } }}
              >
                Upcoming
              </motion.a>
              <motion.a
                href="/sale"
                onClick={(e) => { e.preventDefault(); navigate('/sale'); setIsOpen(false); }}
                className="text-3xl uppercase text-center text-slate-900"
                style={{ fontFamily: "'Office Code Pro', monospace", textDecoration: 'none' }}
                variants={{ hidden: { y: 10, opacity: 0 }, show: { y: 0, opacity: 1 } }}
              >
                Shop
              </motion.a>
              <motion.a
                href="/localist"
                onClick={(e) => { e.preventDefault(); navigate('/localist'); setIsOpen(false); }}
                className="text-3xl uppercase text-center text-slate-900"
                style={{ fontFamily: "'Office Code Pro', monospace", textDecoration: 'none' }}
                variants={{ hidden: { y: 10, opacity: 0 }, show: { y: 0, opacity: 1 } }}
              >
                Become a Localist
              </motion.a>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
