// src/App.js - Clean and organized
import React, { Suspense, lazy, useEffect } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

// Layout Components
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { AnimatedPage } from './components/layout/AnimatedPage';
import { LoadingSpinner } from './components/layout/LoadingSpinner';
import { ScrollToTop } from './components/layout/ScrollToTop';

// Performance utilities
import { addResourceHints, loadFonts } from './utils/performance';

// Lazy load pages for code splitting
const HomePage = lazy(() => import('./pages/HomePage').then(module => ({ default: module.HomePage })));
const AboutUsPage = lazy(() => import('./pages/AboutUsPage').then(module => ({ default: module.AboutUsPage })));
const ServicesPage = lazy(() => import('./pages/ServicesPage').then(module => ({ default: module.ServicesPage })));
const PricingPage = lazy(() => import('./pages/PricingPage').then(module => ({ default: module.PricingPage })));
const CrowdfundingPage = lazy(() => import('./pages/CrowdfundingPage').then(module => ({ default: module.CrowdfundingPage })));
const MealPrepPage = lazy(() => import('./pages/MealPrepPage').then(module => ({ default: module.MealPrepPage })));
const EventsPage = lazy(() => import('./pages/EventsPage').then(module => ({ default: module.EventsPage })));
const MenuPage = lazy(() => import('./pages/MenuPage').then(module => ({ default: module.MenuPage })));
const PizzaPartyPage = lazy(() => import('./pages/PizzaPartyPage').then(module => ({ default: module.PizzaPartyPage })));

const AppContent = () => {
  const location = useLocation();

  const pageVariants = {
    initial: { opacity: 0, x: -20 },
    animate: { 
      opacity: 1, 
      x: 0,
      transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] }
    },
    exit: { 
      opacity: 0, 
      x: 20,
      transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
    }
  };

  return (
    <HelmetProvider>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 text-gray-900 font-body antialiased">
        <ScrollToTop />
        
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        >
          <Header />
        </motion.div>

        <main className="relative">
          <Suspense fallback={<LoadingSpinner />}>
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="optimize-rendering"
              >
                <Routes location={location}>
                  <Route path="/" element={<AnimatedPage><HomePage /></AnimatedPage>} />
                  <Route path="/about" element={<AnimatedPage><AboutUsPage /></AnimatedPage>} />
                  <Route path="/services" element={<AnimatedPage><ServicesPage /></AnimatedPage>} />
                  <Route path="/pricing" element={<AnimatedPage><PricingPage /></AnimatedPage>} />
                  <Route path="/crowdfunding" element={<AnimatedPage><CrowdfundingPage /></AnimatedPage>} />
                  <Route path="/meal-prep" element={<AnimatedPage><MealPrepPage /></AnimatedPage>} />
                  <Route path="/events" element={<AnimatedPage><EventsPage /></AnimatedPage>} />
                  <Route path="/menu" element={<AnimatedPage><MenuPage /></AnimatedPage>} />
                  <Route path="/pizza-party" element={<AnimatedPage><PizzaPartyPage /></AnimatedPage>} />
                </Routes>
              </motion.div>
            </AnimatePresence>
          </Suspense>
        </main>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
        >
          <Footer />
        </motion.div>
      </div>
    </HelmetProvider>
  );
};

function App() {
  useEffect(() => {
    // Initialize performance optimizations
    addResourceHints();
    loadFonts();

    // Optimize scroll performance
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}

export default App;