import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Header } from '../components/layout/Header';
import FullPageDemoPage from '../pages/FullPageDemoPage';

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
          </Routes>
        </main>
      </div>
    </HelmetProvider>
  );
}
