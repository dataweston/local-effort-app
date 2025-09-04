import React, { useEffect, Suspense, lazy } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { LoadingSpinner } from './components/layout/LoadingSpinner';
import { AnimatedPage } from './components/layout/AnimatedPage';
import { SupportWidget } from './components/support/SupportWidget';
import { RequireAuth } from './components/auth/RequireAuth';
import { RequirePartnerAccess } from './components/auth/RequirePartnerAccess';

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
// --- NEW: Lazily import the MealPrepPage ---
const MealPrepPage = lazy(() => import('./pages/MealPrepPage'));
// --- NEW: Partner Portal ---
const PartnerPortalPage = lazy(() => import('./pages/PartnerPortalPage'));
const PartnerPortalWelcome = lazy(() => import('./pages/PartnerPortalWelcome'));
const InboxPage = lazy(() => import('./pages/InboxPage'));
const CampaignsPage = lazy(() => import('./pages/CampaignsPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
// Integrated partner tools (embed their App components directly)
// ZAFA Events app embedded from local-effort-zafa-events (.jsx for JSX parsing)
const ZafaEmbeddedApp = lazy(() => import('../local-effort-zafa-events/src/app.jsx'));
const GallantEmbeddedApp = lazy(() => import('../gallant-hawking-l8r4wz/src/App'));
const HMEmbeddedApp = lazy(() => import('../happymonday/src/App.js?jsx'));

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
          <Suspense fallback={<LoadingSpinner />}>
            <AnimatePresence mode="wait">
              <Routes location={location} key={location.pathname}>
                <Route
                  path="/"
                  element={
                    <AnimatedPage>
                      <HomePage />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/about"
                  element={
                    <AnimatedPage>
                      <AboutUsPage />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/services"
                  element={
                    <AnimatedPage>
                      <ServicesPage />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/pricing"
                  element={
                    <AnimatedPage>
                      <PricingPage />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/crowdfunding"
                  element={
                    <AnimatedPage>
                      <CrowdfundingPage />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/menu"
                  element={
                    <AnimatedPage>
                      <MenuPage />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/meal-prep"
                  element={
                    <AnimatedPage>
                      <MealPrepPage />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/happy-monday"
                  element={
                    <AnimatedPage>
                      <HappyMondayPage />
                    </AnimatedPage>
                  }
                />
                {/* --- NEW: Add the route for the gallery page --- */}
                <Route
                  path="/gallery"
                  element={
                    <AnimatedPage>
                      <GalleryPage />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/partner-portal"
                  element={
                    <AnimatedPage>
                      <PartnerPortalPage />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/partner-portal/welcome"
                  element={
                    <AnimatedPage>
                      <PartnerPortalWelcome />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/auth"
                  element={
                    <AnimatedPage>
                      <AuthPage />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/inbox"
                  element={
                    <AnimatedPage>
                      <RequireAuth>
                        <InboxPage />
                      </RequireAuth>
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/campaigns"
                  element={
                    <AnimatedPage>
                      <RequireAuth>
                        <CampaignsPage />
                      </RequireAuth>
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/partners/zafa-events"
                  element={
                    <AnimatedPage>
                      <RequirePartnerAccess toolKey="zafa">
                        <ZafaEmbeddedApp />
                      </RequirePartnerAccess>
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/partners/gallant-hawking"
                  element={
                    <AnimatedPage>
                      <RequirePartnerAccess toolKey="gallant">
                        <GallantEmbeddedApp />
                      </RequirePartnerAccess>
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/partners/happy-monday"
                  element={
                    <AnimatedPage>
                      <RequirePartnerAccess toolKey="happymonday">
                        <HMEmbeddedApp />
                      </RequirePartnerAccess>
                    </AnimatedPage>
                  }
                />
              </Routes>
            </AnimatePresence>
          </Suspense>
        </main>
        <Footer />
  <SupportWidget />
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
