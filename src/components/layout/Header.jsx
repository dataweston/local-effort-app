import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
const logo = '/gallery/logo.png?text=Local+Effort&font=mono';

const links = [
  { path: '/sale', name: 'SALE', sale: true },
  { path: '/services', name: 'Services', children: [
    { path: '/services#event-request', name: 'Submit an event request' },
  ] },
  { path: '/pricing', name: 'Pricing' },
  { path: '/menu', name: 'Menus' },
  { path: '/about', name: 'About' },
  // { path: '/happy-monday', name: 'Happy Monday' }, // temporarily hidden
  { path: '/gallery', name: 'Gallery' },
];

// Toggle to show/hide fundraiser button in nav (routes still accessible directly)
const SHOW_FUNDRAISER = false;

export const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [openMobileSection, setOpenMobileSection] = useState(null);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'auto';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-6xl px-2 md:px-5 lg:px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <NavLink to="/" onClick={() => setIsOpen(false)} className="flex items-center gap-2">
          <motion.img
            src={logo}
            alt="Local Effort Logo"
            className="h-6 w-auto"
            whileHover={{ scale: 1.03 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          />
        </NavLink>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-2 font-mono text-[0.9rem]">
          {links.map(({ path, name, sale, children }) => (
            <div key={path} className="relative group">
            <NavLink to={path} className="relative px-2 py-1 rounded">
              {({ isActive }) => (
                <>
                  {sale ? (
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-white shadow-sm transition-transform ${isActive ? 'scale-[1.02]' : ''}`} style={{ backgroundColor: '#e11d48' }}>
                      {name}
                    </span>
                  ) : (
                    <span className="transition-colors hover:text-neutral-900 text-neutral-700">
                      {name}
                    </span>
                  )}
                  {!sale && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute left-2 right-2 -bottom-0.5 h-0.5 bg-[var(--color-accent)]"
                      initial={false}
                      animate={{ opacity: isActive ? 1 : 0 }}
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </>
              )}
            </NavLink>
            {children && (
              <div className="absolute left-0 mt-1">
                <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="mt-1 rounded-md border bg-white shadow-lg py-1 min-w-[220px]">
                    {children.map((c) => (
                      <NavLink key={c.path} to={c.path} className="block px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50">
                        {c.name}
                      </NavLink>
                    ))}
                  </div>
                </div>
              </div>
            )}
            </div>
          ))}
          {SHOW_FUNDRAISER && (
            <NavLink to="/crowdfunding" className="ml-2">
              <motion.span
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center rounded-md bg-[var(--color-accent)] px-3 py-1.5 font-semibold text-white shadow-sm"
              >
                Fundraiser
              </motion.span>
            </NavLink>
          )}
        </nav>

        {/* Mobile menu button */}
        <button
          onClick={() => setIsOpen((v) => !v)}
          className="md:hidden z-50 w-9 h-7 flex flex-col justify-between"
          aria-label="Toggle menu"
        >
          <span
            className={`block h-0.5 w-full bg-black transition-transform ${isOpen ? 'rotate-45 translate-y-[10px]' : ''}`}
          />
          <span
            className={`block h-0.5 w-full bg-black transition-opacity ${isOpen ? 'opacity-0' : 'opacity-100'}`}
          />
          <span
            className={`block h-0.5 w-full bg-black transition-transform ${isOpen ? '-rotate-45 -translate-y-[10px]' : ''}`}
          />
        </button>
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 bg-neutral-50"
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
              className="flex flex-col items-center justify-center h-full space-y-6 font-mono px-6"
            >
      {links.map((l) => (
                <motion.div
                  key={l.path}
                  variants={{ hidden: { y: 10, opacity: 0 }, show: { y: 0, opacity: 1 } }}
                >
                  {!l.children ? (
                    <NavLink
                      to={l.path}
                      onClick={() => setIsOpen(false)}
                      className={`block text-3xl uppercase text-center ${l.sale ? 'bg-rose-600 text-white px-4 py-2 rounded-md' : ''}`}
                    >
                      {l.name}
                    </NavLink>
                  ) : (
                    <div className="w-full max-w-md">
                      <button
                        type="button"
                        onClick={() => setOpenMobileSection(openMobileSection === l.path ? null : l.path)}
                        className="w-full text-3xl uppercase text-center flex items-center justify-center gap-2"
                        aria-expanded={openMobileSection === l.path}
                        aria-controls={`section-${l.path}`}
                      >
                        {l.name}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className={`h-6 w-6 transition-transform ${openMobileSection === l.path ? 'rotate-180' : ''}`}
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <AnimatePresence initial={false}>
                        {openMobileSection === l.path && (
                          <motion.div
                            id={`section-${l.path}`}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden mt-2"
                          >
                            <div className="flex flex-col items-center space-y-2">
                              {l.children.map((c) => (
                                <NavLink
                                  key={c.path}
                                  to={c.path}
                                  onClick={() => setIsOpen(false)}
                                  className="text-base text-neutral-800 hover:text-black"
                                >
                                  {c.name}
                                </NavLink>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </motion.div>
              ))}
              {SHOW_FUNDRAISER && (
                <motion.div variants={{ hidden: { y: 10, opacity: 0 }, show: { y: 0, opacity: 1 } }}>
                  <NavLink
                    to="/crowdfunding"
                    onClick={() => setIsOpen(false)}
                    className="text-2xl uppercase bg-[var(--color-accent)] text-white px-6 py-3 rounded font-semibold"
                  >
                    Fundraiser
                  </NavLink>
                </motion.div>
              )}
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
