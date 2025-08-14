import React from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

// Layout and Animation Components
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { AnimatedPage } from './components/layout/AnimatedPage';

// Page Components
import { HomePage } from './pages/HomePage';
import { AboutUsPage } from './pages/AboutUsPage';
import { ServicesPage } from './pages/ServicesPage';
import { PricingPage } from './pages/PricingPage';
import { CrowdfundingPage } from './pages/CrowdfundingPage';
import { MealPrepPage } from './pages/MealPrepPage';
import { EventsPage } from './pages/EventsPage';
import { MenuPage } from './pages/MenuPage';
import { PizzaPartyPage } from './pages/PizzaPartyPage';

const AppContent = () => {
  const location = useLocation();
  return (
    <HelmetProvider>
      <div className="bg-[#F5F5F5] text-gray-900 font-sans antialiased">
        <Header />
        <main className="p-4 md:p-8 lg:p-16">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
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
          </AnimatePresence>
        </main>
        <Footer />
      </div>
    </HelmetProvider>
  );
}

function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}

export default App;