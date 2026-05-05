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

// Lazily import page components
const ReleasesPage = lazy(() => import('./pages/ReleasesPage'));
const BlogList = lazy(() => import('./pages/BlogList'));
const BlogPost = lazy(() => import('./pages/BlogPost'));
const WeeklyList = lazy(() => import('./pages/WeeklyList'));
const WeeklyPost = lazy(() => import('./pages/WeeklyPost'));
const SalePage = lazy(() => import('./pages/SalePage'));
const ChezGaragePage = lazy(() => import('./pages/ChezGaragePage'));
const HappyMondayPage = lazy(() => import('./pages/happymondaypage'));
const ProductPage = lazy(() => import('./pages/ProductPage'));
const InboxPage = lazy(() => import('./pages/InboxPage'));
const CampaignsPage = lazy(() => import('./pages/CampaignsPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const HMEmbeddedApp = lazy(() => import('./partners/happymonday'));
const WeddingsEmbeddedApp = lazy(() => import('./partners/weddings'));
const PizzaPartyPage = lazy(() => import('./pages/PizzaPartyPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const SchedulePage = lazy(() => import('./pages/SchedulePage'));
const WinterDinnerPage = lazy(() => import('./pages/WinterDinnerPage'));
const WinterPizzaPage = lazy(() => import('./pages/WinterPizzaPage'));
const JanuaryMealsPage = lazy(() => import('./pages/JanuaryMealsPage'));
const FebruaryPage = lazy(() => import('./pages/FebruaryPage'));
const PsychePage = lazy(() => import('./pages/PsychePage'));
const FineFoodsPage = lazy(() => import('./pages/FineFoodsPage'));
const FullPageDemoPage = lazy(() => import('./pages/FullPageDemoPage'));
const SmallEventsAdminRequestsPage = lazy(() => import('./pages/SmallEventsAdminRequestsPage'));
const SmallEventsAdminAvailabilityPage = lazy(() => import('./pages/SmallEventsAdminAvailabilityPage'));
const WeeklyOrderPage = lazy(() => import('./pages/WeeklyOrderPage'));
const AdminWeeklyOrderPage = lazy(() => import('./pages/AdminWeeklyOrderPage'));
const AdminDecisionPreviewPage = lazy(() => import('./pages/AdminDecisionPreviewPage'));
const WeeklyDemoPage = lazy(() => import('./pages/WeeklyDemoPage'));
const SubscriberPortalPage = lazy(() => import('./pages/SubscriberPortalPage'));
const NativeMobileHubPage = lazy(() => import('./pages/NativeMobileHubPage'));
const CatherineSchedulePage = lazy(() => import('./pages/CatherineSchedulePage'));
const BookPage = lazy(() => import('./pages/BookPage'));
const BrainPortalPage = lazy(() => import('./pages/BrainPortalPage'));
const BrainBrowserPage = lazy(() => import('./pages/BrainBrowserPage'));

const AppContent = () => {
  const location = useLocation();
  const isFullPageHome = location.pathname === '/';
  const hideHeader =
    location.pathname === '/weddings' ||
    location.pathname === '/winterdinner' ||
    location.pathname === '/winterpizza' ||
    location.pathname === '/januarymeals' ||
    location.pathname === '/catherine-schedule' ||
    location.pathname === '/native-mobile-hub';
  const hideFooter =
    location.pathname === '/' ||
    location.pathname === '/sale' ||
    location.pathname === '/chez-garage' ||
    location.pathname === '/winterdinner' ||
    location.pathname === '/winterpizza' ||
    location.pathname === '/januarymeals' ||
    location.pathname === '/catherine-schedule' ||
    location.pathname === '/native-mobile-hub';

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
          <main
            className="flex-1"
            style={{
              paddingTop: !hideHeader && !isFullPageHome ? '5rem' : 0,
            }}
          >
          <Suspense fallback={<LoadingSpinner />}>
            <AnimatePresence mode="wait">
              <Routes location={location} key={location.pathname}>
                <Route
                  path="/"
                  element={
                    <AnimatedPage>
                      <FullPageDemoPage />
                    </AnimatedPage>
                  }
                />
                {/* Retired pages — redirect to home */}
                <Route path="/about" element={<Navigate to="/" replace />} />
                <Route path="/services" element={<Navigate to="/" replace />} />
                <Route path="/pricing" element={<Navigate to="/" replace />} />
                <Route path="/crowdfunding" element={<Navigate to="/" replace />} />
                <Route path="/pizzafunder" element={<Navigate to="/" replace />} />
                <Route path="/menu" element={<Navigate to="/" replace />} />
                <Route path="/meal-prep" element={<Navigate to="/" replace />} />
                <Route path="/gallery" element={<Navigate to="/" replace />} />
                <Route path="/tiny-diner" element={<Navigate to="/" replace />} />
                <Route path="/personal-chef-minneapolis" element={<Navigate to="/" replace />} />
                <Route path="/personal-chef-st-paul" element={<Navigate to="/" replace />} />
                <Route path="/personal-chef-twin-cities" element={<Navigate to="/" replace />} />
                <Route path="/personal-chef-minnesota" element={<Navigate to="/" replace />} />
                <Route path="/personal-chef-wisconsin" element={<Navigate to="/" replace />} />
                <Route path="/paikka" element={<Navigate to="/" replace />} />
                <Route path="/paikka/success" element={<Navigate to="/" replace />} />
                <Route path="/book-food-truck" element={<Navigate to="/" replace />} />
                <Route path="/partner-portal" element={<Navigate to="/" replace />} />
                <Route path="/intake-for-kara" element={<Navigate to="/" replace />} />
                <Route path="/intake-for-kara-questions" element={<Navigate to="/" replace />} />
                <Route path="/partners/zafa-events" element={<Navigate to="/" replace />} />
                <Route path="/partners/gallant-hawking" element={<Navigate to="/" replace />} />
                <Route path="/partners/placemaker" element={<Navigate to="/" replace />} />
                <Route path="/partners/aacrm" element={<Navigate to="/" replace />} />
                <Route path="/bridal-expo" element={<Navigate to="/" replace />} />
                <Route path="/bridalexpo" element={<Navigate to="/" replace />} />
                <Route path="/fullpage-demo" element={<Navigate to="/" replace />} />
                {/* Active pages */}
                <Route
                  path="/blog"
                  element={
                    <AnimatedPage>
                      <BlogList />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/blog/:slug"
                  element={
                    <AnimatedPage>
                      <BlogPost />
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
                  path="/sale"
                  element={
                    <AnimatedPage>
                      <SalePage />
                    </AnimatedPage>
                  }
                />
                <Route path="/salepage" element={<Navigate to="/sale" replace />} />
                <Route
                  path="/chez-garage"
                  element={
                    <AnimatedPage>
                      <ChezGaragePage />
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
                <Route path="/happy-monday" element={<Navigate to="/" replace />} />
                <Route
                  path="/happymonday"
                  element={
                    <AnimatedPage>
                      <HappyMondayPage />
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
                  path="/february"
                  element={
                    <AnimatedPage>
                      <FebruaryPage />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/psyche"
                  element={
                    <AnimatedPage>
                      <PsychePage />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/finefoods"
                  element={
                    <AnimatedPage>
                      <FineFoodsPage />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/weekly-order"
                  element={
                    <AnimatedPage>
                      <WeeklyOrderPage />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/weekly-order/:customerSlug"
                  element={
                    <AnimatedPage>
                      <WeeklyOrderPage />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/admin/weekly-order"
                  element={
                    <AnimatedPage>
                      <AdminWeeklyOrderPage />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/admin/decision-preview"
                  element={
                    <AnimatedPage>
                      <AdminDecisionPreviewPage />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/weekly-order/portal"
                  element={
                    <AnimatedPage>
                      <SubscriberPortalPage />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/weekly-order/:customerSlug/portal"
                  element={
                    <AnimatedPage>
                      <SubscriberPortalPage />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/weeklydemo"
                  element={
                    <AnimatedPage>
                      <WeeklyDemoPage />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/native-mobile-hub"
                  element={
                    <AnimatedPage>
                      <NativeMobileHubPage />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/portal/:shareToken"
                  element={<BrainPortalPage />}
                />
                <Route
                  path="/brain"
                  element={<BrainBrowserPage />}
                />
                <Route
                  path="/catherine-schedule"
                  element={
                    <AnimatedPage>
                      <CatherineSchedulePage />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/admin/small-events/requests"
                  element={
                    <AnimatedPage>
                      <SmallEventsAdminRequestsPage />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/admin/small-events/availability"
                  element={
                    <AnimatedPage>
                      <SmallEventsAdminAvailabilityPage />
                    </AnimatedPage>
                  }
                />
                <Route path="/events" element={<Navigate to="/book" replace />} />
                <Route
                  path="/book"
                  element={
                    <AnimatedPage>
                      <BookPage />
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
                <Route
                  path="/pizza-party"
                  element={
                    <AnimatedPage>
                      <PizzaPartyPage />
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
                  path="/partners/happy-monday"
                  element={
                    <AnimatedPage>
                      <HMEmbeddedApp />
                    </AnimatedPage>
                  }
                />
                <Route
                  path="/tiny-weddings"
                  element={<Navigate to="/weddings" replace />}
                />
                <Route
                  path="/weddings"
                  element={
                    <AnimatedPage>
                      <WeddingsEmbeddedApp />
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
