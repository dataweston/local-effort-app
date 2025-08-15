import React, { useEffect, Suspense, lazy } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';

// Lazily import page components using the correct pattern for named exports
const HomePage = lazy(() => import('./pages/HomePage').then(module => ({ default: module.HomePage })));
const AboutUsPage = lazy(() => import('./pages/AboutUsPage').then(module => ({ default: module.AboutUsPage })));
const ServicesPage = lazy(() => import('./pages/ServicesPage').then(module => ({ default: module.ServicesPage })));
const PricingPage = lazy(() => import('./pages/PricingPage').then(module => ({ default: module.PricingPage })));
const CrowdfundingPage = lazy(() => import('./pages/CrowdfundingPage').then(module => ({ default: module.CrowdfundingPage })));

const AppContent = () => {
  const location = useLocation();

  return (
    <HelmetProvider>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-neutral-50 to-neutral-100">
        <Header />
        <main className="flex-1 px-4 py-8 md:px-8 lg:px-16">
          <Suspense fallback={<div>Loading...</div>}>
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutUsPage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/crowdfunding" element={<CrowdfundingPage />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
    </HelmetProvider>
  );
};

// ... rest of your App.js file
function App() {
  useEffect(() => {
    document.fonts.ready.then(() => document.body.classList.add('fonts-loaded'));
  }, []);

  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}

export default App;