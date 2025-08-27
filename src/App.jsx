import React, { useEffect, Suspense, lazy } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { LoadingSpinner } from './components/layout/LoadingSpinner';
import { AnimatedPage } from './components/layout/AnimatedPage';

// Lazily import page components using the default export pattern
const HomePage = lazy(() => import('./pages/HomePage'));
const AboutUsPage = lazy(() => import('./pages/AboutUsPage'));
const ServicesPage = lazy(() => import('./pages/ServicesPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const CrowdfundingPage = lazy(() => import('./pages/CrowdfundingPage'));
const MenuPage = lazy(() => import('./pages/MenuPage'));
const HappyMondayPage = lazy(() => import('./pages/HappyMondayPage'));
// --- NEW: Lazily import the GalleryPage ---
const GalleryPage = lazy(() => import('./pages/GalleryPage'));


const AppContent = () => {
  const location = useLocation();

  useEffect(() => {
    document.fonts?.ready?.then(() => document.body.classList.add('fonts-loaded'));
  }, []);

  return (
    <HelmetProvider>
      <div className="min-h-screen flex flex-col bg-white">
        <Header />
        <main className="flex-1">
          <Suspense fallback={<LoadingSpinner /> }>
            <AnimatePresence mode="wait">
              <Routes location={location} key={location.pathname}>
                <Route path="/" element={<AnimatedPage><HomePage /></AnimatedPage>} />
                <Route path="/about" element={<AnimatedPage><AboutUsPage /></AnimatedPage>} />
                <Route path="/services" element={<AnimatedPage><ServicesPage /></AnimatedPage>} />
                <Route path="/pricing" element={<AnimatedPage><PricingPage /></AnimatedPage>} />
                <Route path="/crowdfunding" element={<AnimatedPage><CrowdfundingPage /></AnimatedPage>} />
                <Route path="/menu" element={<AnimatedPage><MenuPage /></AnimatedPage>} />
                <Route path="/happy-monday" element={<AnimatedPage><HappyMondayPage /></AnimatedPage>} />
                {/* --- NEW: Add the route for the gallery page --- */}
                <Route path="/gallery" element={<AnimatedPage><GalleryPage /></AnimatedPage>} />
              </Routes>
            </AnimatePresence>
          </Suspense>
        </main>
        <Footer />
      </div>
    </HelmetProvider>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
