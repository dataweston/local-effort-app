import React, { useEffect } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { HomePage } from './pages/HomePage';
import { AboutUsPage } from './pages/AboutUsPage';
import { ServicesPage } from './pages/ServicesPage';
import { PricingPage } from './pages/PricingPage';
import { CrowdfundingPage } from './pages/CrowdfundingPage';

const AppContent = () => {
  const location = useLocation();

  return (
    <HelmetProvider>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-neutral-50 to-neutral-100">
        <Header />
        <main className="flex-1 px-4 py-8 md:px-8 lg:px-16">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutUsPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/crowdfunding" element={<CrowdfundingPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </HelmetProvider>
  );
};

function App() {
  useEffect(() => {
    // minimal performance setup
    document.fonts.ready.then(() => document.body.classList.add('fonts-loaded'));
  }, []);

  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}

export default App;

