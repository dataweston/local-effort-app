import React, { useEffect, Suspense, lazy } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { LoadingSpinner } from './components/layout/LoadingSpinner';
import { AnimatedPage } from './components/layout/AnimatedPage';
import { CartProvider } from './store/cart/CartContext';
import { ToastProvider } from './components/common/ToastProvider';
import { DefaultSeo } from './components/seo/DefaultSeo';
import { SupabaseAuthProvider } from './contexts/SupabaseAuthContext';
// Auth guards removed for public access to partner tools and partner portal

// Lazily import page components using the default export pattern
const HomePage = lazy(() => import('./pages/HomePage'));
const AboutUsPage = lazy(() => import('./pages/AboutUsPage'));
const ServicesPage = lazy(() => import('./pages/ServicesPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
// Old crowdfunding page - redirects to /pizzafunder
// const CrowdfundingPage = lazy(() => import('./pages/CrowdfundingPage'));
const PizzaFunderPage = lazy(() => import('./pages/PizzaFunderPage'));
const ReleasesPage = lazy(() => import('./pages/ReleasesPage'));
const MenuPage = lazy(() => import('./pages/MenuPage'));
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
const HappyMondaySalePage = lazy(() => import('./pages/HappyMondaySalePage'));
const HappyMondayPage = lazy(() => import('./pages/HappyMondayPage'));
const TinyDinerSalePage = lazy(() => import('./pages/TinyDinerSalePage'));
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
const TinyWeddingsEmbeddedApp = lazy(() => import('./partners/tiny-weddings'));
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
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const SchedulePage = lazy(() => import('./pages/SchedulePage'));
const WinterDinnerPage = lazy(() => import('./pages/WinterDinnerPage'));
const WinterPizzaPage = lazy(() => import('./pages/WinterPizzaPage'));
const JanuaryMealsPage = lazy(() => import('./pages/JanuaryMealsPage'));

const AppContent = () => {
  const location = useLocation();
  const hideHeader = location.pathname.startsWith('/partners/aacrm') || location.pathname === '/tiny-weddings' || location.pathname === '/winterdinner' || location.pathname === '/winterpizza';
  const hideFooter = location.pathname === '/sale' || location.pathname === '/winterdinner' || location.pathname === '/winterpizza';

  useEffect(() => {
    document.fonts?.ready?.then(() => document.body.classList.add('fonts-loaded'));
  }, []);

  return (
    <HelmetProvider>
      <DefaultSeo />
      <SupabaseAuthProvider>
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
                {/* Legacy bridal expo landing now forwards home */}
                <Route path="/bridal-expo" element={<Navigate to="/" replace />} />
                <Route path="/bridalexpo" element={<Navigate to="/" replace />} />
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
                  element={<Navigate to="/pizzafunder" replace />}
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
                      <HappyMondaySalePage />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/happymonday"
                  element={
                    <AnimatedPage>
                      <HappyMondayPage />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/tiny-diner"
                  element={
                    <AnimatedPage>
                      <TinyDinerSalePage />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/januarymeals"
                  element={
                    <AnimatedPage>
                      <JanuaryMealsPage />
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
                  path="/calendar"
                  element={
                    <AnimatedPage>
                      <CalendarPage />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/schedule/:token"
                  element={
                    <AnimatedPage>
                      <SchedulePage />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/winterdinner"
                  element={
                    <AnimatedPage>
                      <WinterDinnerPage />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/winterpizza"
                  element={
                    <AnimatedPage>
                      <WinterPizzaPage />
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
                {/* Hidden: Tiny Diner route */}
                {/* <Route
                  path="/partners/tiny-diner"
                  element={
                    <AnimatedPage>
                      <TinyDinerEmbeddedApp />
                    </AnimatedPage>
                  }
                /> */}
                <Route
                  path="/tiny-weddings"
                  element={
                    <AnimatedPage>
                      <TinyWeddingsEmbeddedApp />
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
          {!hideFooter && <Footer />}
          {/* Vercel Speed Insights */}
          <SpeedInsights />
        </div>
        </ToastProvider>
      </CartProvider>
      </SupabaseAuthProvider>
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




