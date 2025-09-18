import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import HomePage from '../pages/HomePage';
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
  return (
    <HelmetProvider context={helmetContext}>
      <div className="app-root min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutUsPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/happy-monday" element={<HappyMondayPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/meal-prep" element={<MealPrepPage />} />
            <Route path="/partner-portal" element={<PartnerPortalPage />} />
            <Route path="/crowdfunding" element={<CrowdfundingPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </HelmetProvider>
  );
}
