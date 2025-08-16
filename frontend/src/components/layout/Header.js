import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const logo = '/gallery/logo.png?text=Local+Effort&font=mono';

const links = [
  { path: '/services', name: 'Services' },
  { path: '/pricing',  name: 'Pricing'  },
  { path: '/menu',     name: 'Menus'    },
  { path: '/about',    name: 'About'    },
];

export const Header = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen]);

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-neutral-200">
      <div className="mx-auto max-w-6xl px-4 md:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <NavLink to="/" onClick={() => setIsOpen(false)} className="flex items-center gap-2">
          <motion.img
            src={logo}
            alt="Local Effort Logo"
            className="h-9 w-auto"
            whileHover={{ scale: 1.03 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          />
        </NavLink>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-2 font-mono text-[0.9rem]">
          {links.map(({ path, name }) => (
            <NavLink key={path} to={path} className="relative px-2 py-1 rounded">
              {({ isActive }) => (
                <>
                  <span className="transition-colors hover:text-neutral-900 text-neutral-700">{name}</span>
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute left-2 right-2 -bottom-0.5 h-0.5 bg-[var(--color-accent)]"
                    initial={false}
                    animate={{ opacity: isActive ? 1 : 0 }}
                    transition={{ duration: 0.2 }}
                  />
                </>
              )}
            </NavLink>
          ))}
          <NavLink to="/crowdfunding" className="ml-2">
            <motion.span
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center rounded-md bg-[var(--color-accent)] px-3 py-1.5 font-semibold text-white shadow-sm"
            >
              Fundraiser
            </motion.span>
          </NavLink>
        </nav>

        {/* Mobile menu button */}
        <button
          onClick={() => setIsOpen(v => !v)}
          className="md:hidden z-50 w-9 h-7 flex flex-col justify-between"
          aria-label="Toggle menu"
        >
          <span className={`block h-0.5 w-full bg-black transition-transform ${isOpen ? 'rotate-45 translate-y-[10px]' : ''}`} />
          <span className={`block h-0.5 w-full bg-black transition-opacity ${isOpen ? 'opacity-0' : 'opacity-100'}`} />
          <span className={`block h-0.5 w-full bg-black transition-transform ${isOpen ? '-rotate-45 -translate-y-[10px]' : ''}`} />
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
                  transition: { staggerChildren: 0.08, delayChildren: 0.12 }
                }
              }}
              className="flex flex-col items-center justify-center h-full space-y-6 font-mono"
            >
              {links.map((l) => (
                <motion.div key={l.path} variants={{ hidden: { y: 10, opacity: 0 }, show: { y: 0, opacity: 1 } }}>
                  <NavLink to={l.path} onClick={() => setIsOpen(false)} className="text-3xl uppercase">
                    {l.name}
                  </NavLink>
                </motion.div>
              ))}
              <motion.div variants={{ hidden: { y: 10, opacity: 0 }, show: { y: 0, opacity: 1 } }}>
                <NavLink to="/crowdfunding" onClick={() => setIsOpen(false)}
                  className="text-2xl uppercase bg-[var(--color-accent)] text-white px-6 py-3 rounded font-semibold">
                  Fundraiser
                </NavLink>
              </motion.div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};