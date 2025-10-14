import React, { useEffect, Suspense, lazy } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { LoadingSpinner } from './components/layout/LoadingSpinner';
import { AnimatedPage } from './components/layout/AnimatedPage';
import { SupportWidget } from './components/support/SupportWidget';
import { CartProvider } from './store/cart/CartContext';
import { ToastProvider } from './components/common/ToastProvider';
import { DefaultSeo } from './components/seo/DefaultSeo';
// Auth guards removed for public access to partner tools and partner portal

// Lazily import page components using the default export pattern
const HomePage = lazy(() => import('./pages/HomePage'));
const AboutUsPage = lazy(() => import('./pages/AboutUsPage'));
const ServicesPage = lazy(() => import('./pages/ServicesPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const CrowdfundingPage = lazy(() => import('./pages/CrowdfundingPage'));
const PizzaFunderPage = lazy(() => import('./pages/PizzaFunderPage'));
const ReleasesPage = lazy(() => import('./pages/ReleasesPage'));
const MenuPage = lazy(() => import('./pages/MenuPage'));
const HappyMondayPage = lazy(() => import('./pages/HappyMondayPage'));
const EventsPage = lazy(() => import('./pages/EventsPage'));
const WeeklyList = lazy(() => import('./pages/WeeklyList'));
const WeeklyPost = lazy(() => import('./pages/WeeklyPost'));
const FoodTruckPage = lazy(() => import('./pages/FoodTruckPage'));
// --- NEW: Lazily import the GalleryPage ---
const GalleryPage = lazy(() => import('./pages/GalleryPage'));
// --- NEW: Lazily import the MealPrepPage ---
const MealPrepPage = lazy(() => import('./pages/MealPrepPage'));
// --- NEW: Sale page ---
const SalePage = lazy(() => import('./pages/SalePage'));
const ProductPage = lazy(() => import('./pages/ProductPage'));
// --- NEW: Partner Portal ---
const PartnerPortalPage = lazy(() => import('./pages/PartnerPortalPage'));
const InboxPage = lazy(() => import('./pages/InboxPage'));
const CampaignsPage = lazy(() => import('./pages/CampaignsPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
// Integrated partner tools (embed their App components directly via local proxies)
const ZafaEmbeddedApp = lazy(() => import('./partners/zafa'));
const GallantEmbeddedApp = lazy(() => import('./partners/gallant'));
const HMEmbeddedApp = lazy(() => import('./partners/happymonday'));
const PlacemakerEmbeddedApp = lazy(() => import('./partners/placemaker'));
const AACRMEmbeddedApp = lazy(() => import('./partners/aacrm'));
const TinyDinerEmbeddedApp = lazy(() => import('./partners/tiny-diner'));
const CookbookSearchPage = lazy(() => import('./pages/CookbookSearchPage'));
const CookbookRecipePage = lazy(() => import('./pages/CookbookRecipePage'));
// City landing pages
const PersonalChefMinneapolisPage = lazy(() => import('./pages/PersonalChefMinneapolis'));
const PersonalChefStPaulPage = lazy(() => import('./pages/PersonalChefStPaul'));
const PersonalChefTwinCitiesPage = lazy(() => import('./pages/PersonalChefTwinCities'));
const PersonalChefMinnesotaPage = lazy(() => import('./pages/PersonalChefMinnesota'));
const PersonalChefWisconsinPage = lazy(() => import('./pages/PersonalChefWisconsin'));
const PizzaPartyPage = lazy(() => import('./pages/PizzaPartyPage'));
const PaikkaPage = lazy(() => import('./pages/PaikkaPage'));
const PaikkaSuccessPage = lazy(() => import('./pages/PaikkaSuccessPage'));

const AppContent = () => {
  const location = useLocation();
  const hideHeader = location.pathname.startsWith('/partners/aacrm');

  useEffect(() => {
    document.fonts?.ready?.then(() => document.body.classList.add('fonts-loaded'));
  }, []);

  return (
    <HelmetProvider>
      <DefaultSeo />
      <CartProvider>
        <ToastProvider>
        <div className="min-h-screen flex flex-col bg-white">
          {!hideHeader && <Header />}
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
                  path="/pizzafunder"
                  element={
                    <AnimatedPage>
                      <PizzaFunderPage />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/releases"
                  element={
                    <AnimatedPage>
                      <ReleasesPage />
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
                  path="/sale"
                  element={
                    <AnimatedPage>
                      <SalePage />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/product/:slug"
                  element={
                    <AnimatedPage>
                      <ProductPage />
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
                <Route
                  path="/events"
                  element={
                    <AnimatedPage>
                      <EventsPage />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/weekly"
                  element={
                    <AnimatedPage>
                      <WeeklyList />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/weekly/:slug"
                  element={
                    <AnimatedPage>
                      <WeeklyPost />
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
                  path="/personal-chef-minneapolis"
                  element={
                    <AnimatedPage>
                      <PersonalChefMinneapolisPage />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/personal-chef-st-paul"
                  element={
                    <AnimatedPage>
                      <PersonalChefStPaulPage />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/personal-chef-twin-cities"
                  element={
                    <AnimatedPage>
                      <PersonalChefTwinCitiesPage />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/personal-chef-minnesota"
                  element={
                    <AnimatedPage>
                      <PersonalChefMinnesotaPage />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/personal-chef-wisconsin"
                  element={
                    <AnimatedPage>
                      <PersonalChefWisconsinPage />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/pizza-party"
                  element={
                    <AnimatedPage>
                      <PizzaPartyPage />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/paikka"
                  element={
                    <AnimatedPage>
                      <PaikkaPage />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/paikka/success"
                  element={
                    <AnimatedPage>
                      <PaikkaSuccessPage />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/book-food-truck"
                  element={
                    <AnimatedPage>
                      <FoodTruckPage />
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
                {/* Partner portal welcome route removed in favor of single landing */}
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
                      <InboxPage />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/campaigns"
                  element={
                    <AnimatedPage>
                      <CampaignsPage />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/partners/zafa-events"
                  element={
                    <AnimatedPage>
                      <ZafaEmbeddedApp />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/partners/gallant-hawking"
                  element={
                    <AnimatedPage>
                      <GallantEmbeddedApp />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/partners/happy-monday"
                  element={
                    <AnimatedPage>
                      <HMEmbeddedApp />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/partners/placemaker"
                  element={
                    <AnimatedPage>
                      <PlacemakerEmbeddedApp />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/partners/aacrm"
                  element={
                    <AnimatedPage>
                      <AACRMEmbeddedApp />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/partners/tiny-diner"
                  element={
                    <AnimatedPage>
                      <TinyDinerEmbeddedApp />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/cookbook"
                  element={
                    <AnimatedPage>
                      <CookbookSearchPage />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/recipes/:id"
                  element={
                    <AnimatedPage>
                      <CookbookRecipePage />
                    </AnimatedPage>
                  }
                />
              </Routes>
            </AnimatePresence>
          </Suspense>
          </main>
          <Footer />
          <SupportWidget />
          {/* Vercel Speed Insights */}
          <SpeedInsights />
        </div>
        </ToastProvider>
      </CartProvider>
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




