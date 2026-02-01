import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Header } from '../components/layout/Header';
import FullPageDemoPage from '../pages/FullPageDemoPage';
import AboutUsPage from '../pages/AboutUsPage';
import ServicesPage from '../pages/ServicesPage';
import PricingPage from '../pages/PricingPage';
import MenuPage from '../pages/MenuPage';
import HappyMondayPage from '../pages/HappyMondayPage';
import GalleryPage from '../pages/GalleryPage';
import EventsPage from '../pages/EventsPage';
import MealPrepPage from '../pages/MealPrepPage';
import PartnerPortalPage from '../pages/PartnerPortalPage';
import CrowdfundingPage from '../pages/CrowdfundingPage';

export default function StaticApp({ helmetContext }) {
  const location = useLocation();
  const isFullPageHome = location.pathname === '/';
  return (
    <HelmetProvider context={helmetContext}>
      <div className="app-root min-h-screen flex flex-col">
        <Header />
        <main className="flex-1" style={{ paddingTop: isFullPageHome ? 0 : '5rem' }}>
          <Routes>
            <Route path="/" element={<FullPageDemoPage />} />
            <Route path="/about" element={<AboutUsPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/happymonday" element={<HappyMondayPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/meal-prep" element={<MealPrepPage />} />
            <Route path="/partner-portal" element={<PartnerPortalPage />} />
            <Route path="/crowdfunding" element={<CrowdfundingPage />} />
          </Routes>
        </main>
      </div>
    </HelmetProvider>
  );
}
