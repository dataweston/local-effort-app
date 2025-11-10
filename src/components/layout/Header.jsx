import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
const logo = '/gallery/logo.png?text=Local+Effort&font=mono';

const links = [
  {
    path: '/services',
    name: 'Services',
    children: [{ path: '/services#event-request', name: 'Submit an event request' }],
  },
  { path: '/pricing', name: 'Pricing' },
  { path: '/menu', name: 'Menus' },
  { path: '/pizza-party', name: 'Pizza Party' },
  // { path: '/book-food-truck', name: 'Book a Food Truck', tag: 'Beta' }, // hidden from nav
  { path: '/about', name: 'About' },
  // { path: '/happy-monday', name: 'Happy Monday' }, // temporarily hidden
  { path: '/gallery', name: 'Gallery' },
  { name: 'Tiny Weddings', external: true, href: 'https://tiny-weddings.localeffortfood.com' },
  { path: '/sale', name: '🥧 Holiday Pie Sale', isRedLink: true },
  // { path: '/releases', name: 'Releases' }, // temporarily hidden
];

// Toggle to show/hide fundraiser button in nav (routes still accessible directly)
const SHOW_FUNDRAISER = true;

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
    <header className="sticky top-0 z-40 bg-white backdrop-blur supports-[backdrop-filter]:bg-white/70 md:bg-white/80">
  <div className="mx-auto max-w-6xl px-2 md:px-5 lg:px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <NavLink to="/" onClick={() => setIsOpen(false)} className="flex items-center gap-2">
          <motion.img
            src={logo}
            alt="Local Effort Logo"
            className="h-7 w-auto rounded-md border border-black"
            whileHover={{ scale: 1.03 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          />
        </NavLink>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-2 font-mono text-[0.9rem]">
          {links.map((link) => {
            const { path, name, sale, children, tag, external, href, isRedLink } = link;
            const key = path || href;
            if (external) {
              return (
                <div key={key} className="relative group">
                  <a
                    href={href}
                    className="relative px-2 py-1 rounded inline-flex items-center gap-1 text-neutral-700 transition-colors hover:text-neutral-900"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span>{name}</span>
                    <svg
                      className="h-3.5 w-3.5 opacity-70"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M9 3a1 1 0 0 0 0 2h4.586l-9.293 9.293a1 1 0 1 0 1.414 1.414L15 6.414V11a1 1 0 1 0 2 0V3H9Z" />
                    </svg>
                  </a>
                </div>
              );
            }

            return (
              <div key={key} className="relative group">
                <NavLink to={path} className="relative px-2 py-1 rounded">
                  {({ isActive }) => (
                    <>
                      {sale ? (
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-1 text-white shadow-sm transition-transform ${isActive ? 'scale-[1.02]' : ''}`}
                          style={{ backgroundColor: '#e11d48' }}
                        >
                          {name}
                        </span>
                      ) : isRedLink ? (
                        <span className="inline-flex items-center gap-1 transition-colors hover:text-red-700 text-red-600 font-semibold">
                          <span>{name}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 transition-colors hover:text-neutral-900 text-neutral-700">
                          <span>{name}</span>
                          {tag && (
                            <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.2em] text-rose-500">
                              {tag}
                            </span>
                          )}
                        </span>
                      )}
                      {!sale && !isRedLink && (
                        <motion.span
                          layoutId="nav-underline"
                          className="absolute left-2 right-2 -bottom-0.5 h-0.5 bg-[var(--color-accent)]"
                          initial={false}
                          animate={{ opacity: isActive ? 1 : 0 }}
                          transition={{ duration: 0.2 }}
                        />
                      )}
                      {isRedLink && (
                        <motion.span
                          layoutId="nav-underline-red"
                          className="absolute left-2 right-2 -bottom-0.5 h-0.5 bg-red-600"
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
            );
          })}
          {SHOW_FUNDRAISER && (
            <NavLink to="/pizzafunder" className="ml-2">
              <motion.span
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center rounded-md bg-[var(--color-accent)] px-3 py-1.5 font-semibold text-white shadow-sm"
              >
                Pizza Fundraiser
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
            className="md:hidden fixed inset-0 bg-white"
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
              {links.map((l) => {
                const hasChildren = Array.isArray(l.children) && l.children.length > 0;
                const sectionKey = l.path || l.href || l.name;
                const isExternal = Boolean(l.external && l.href);
                return (
                  <motion.div
                    key={sectionKey}
                    variants={{ hidden: { y: 10, opacity: 0 }, show: { y: 0, opacity: 1 } }}
                  >
                  {!hasChildren ? (
                    isExternal ? (
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setIsOpen(false)}
                        className="block text-3xl uppercase text-center text-neutral-800 hover:text-black"
                      >
                        <span className="flex items-center justify-center gap-3">
                          <span>{l.name}</span>
                          <svg
                            className="h-6 w-6 opacity-70"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path d="M9 3a1 1 0 0 0 0 2h4.586l-9.293 9.293a1 1 0 1 0 1.414 1.414L15 6.414V11a1 1 0 1 0 2 0V3H9Z" />
                          </svg>
                        </span>
                      </a>
                    ) : (
                      <NavLink
                        to={l.path}
                        onClick={() => setIsOpen(false)}
                        className={`block text-3xl uppercase text-center ${l.sale ? 'bg-rose-600 text-white px-4 py-2 rounded-md' : l.isRedLink ? 'text-red-600 font-bold' : ''}`}
                      >
                        <span className="flex items-center justify-center gap-2">
                          <span>{l.name}</span>
                          {l.tag && (
                            <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.2em] text-rose-500">
                              {l.tag}
                            </span>
                          )}
                        </span>
                      </NavLink>
                    )
                  ) : (
                    <div className="w-full max-w-md">
                      <button
                        type="button"
                        onClick={() => setOpenMobileSection(openMobileSection === sectionKey ? null : sectionKey)}
                        className="w-full text-3xl uppercase text-center flex items-center justify-center gap-2"
                        aria-expanded={openMobileSection === sectionKey}
                        aria-controls={`section-${sectionKey}`}
                      >
                        {l.name}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className={`h-6 w-6 transition-transform ${openMobileSection === sectionKey ? 'rotate-180' : ''}`}
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <AnimatePresence initial={false}>
                        {openMobileSection === sectionKey && (
                          <motion.div
                            id={`section-${sectionKey}`}
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
                );
              })}
              {SHOW_FUNDRAISER && (
                <motion.div variants={{ hidden: { y: 10, opacity: 0 }, show: { y: 0, opacity: 1 } }}>
                  <NavLink
                    to="/pizzafunder"
                    onClick={() => setIsOpen(false)}
                    className="text-2xl uppercase bg-[var(--color-accent)] text-white px-6 py-3 rounded font-semibold"
                  >
                    Pizza Fundraiser
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

