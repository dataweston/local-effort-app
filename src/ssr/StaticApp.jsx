import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Header } from '../components/layout/Header';
import { CartProvider } from '../store/cart/CartContext';
import DefaultSeo from '../components/seo/DefaultSeo';
import FullPageDemoPage from '../pages/FullPageDemoPage';
import BlogList from '../pages/BlogList';
import BlogPost from '../pages/BlogPost';
import ReleasesPage from '../pages/ReleasesPage';
import SalePage from '../pages/SalePage';
import HappyMondayPage from '../pages/happymondaypage';
import PizzaPartyPage from '../pages/PizzaPartyPage';
import PsychePage from '../pages/PsychePage';
import FebruaryPage from '../pages/FebruaryPage';
import JulyDinnerPage from '../pages/JulyDinnerPage';
import ReturnPolicyPage from '../pages/ReturnPolicyPage';
import OfficeCateringPage from '../pages/OfficeCateringPage';
import WeeklyMealsPage from '../pages/WeeklyMealsPage';
import SmallEventsPage from '../pages/SmallEventsPage';
import LocalistPage from '../pages/LocalistPage';
import MemberFundraisePage from '../pages/MemberFundraisePage';

export default function StaticApp({ helmetContext }) {
  const location = useLocation();
  const isFullPageHome = location.pathname === '/';
  return (
    <HelmetProvider context={helmetContext}>
      <CartProvider>
        <DefaultSeo />
        <div className="app-root min-h-screen flex flex-col">
          <Header />
          <main className="flex-1" style={{ paddingTop: isFullPageHome ? 0 : '5rem' }}>
            <Routes>
              <Route path="/" element={<FullPageDemoPage />} />
              <Route path="/blog" element={<BlogList />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/releases" element={<ReleasesPage />} />
              <Route path="/sale" element={<SalePage />} />
              <Route path="/return-policy" element={<ReturnPolicyPage />} />
              <Route path="/happymonday" element={<HappyMondayPage />} />
              <Route path="/pizza-party" element={<PizzaPartyPage />} />
              <Route path="/psyche" element={<PsychePage />} />
              <Route path="/february" element={<FebruaryPage />} />
              <Route path="/julydinner" element={<JulyDinnerPage />} />
              <Route path="/office-catering" element={<OfficeCateringPage />} />
              <Route path="/weekly-meals" element={<WeeklyMealsPage />} />
              <Route path="/small-events" element={<SmallEventsPage />} />
              <Route path="/localist" element={<LocalistPage />} />
              <Route path="/308b-member" element={<MemberFundraisePage />} />
            </Routes>
          </main>
        </div>
      </CartProvider>
    </HelmetProvider>
  );
}
