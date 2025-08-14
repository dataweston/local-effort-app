// src/App.js - Enhanced with dramatic visual improvements
import React, { useEffect } from 'react';
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

// Performance utilities
import { addResourceHints, loadFonts } from './utils/performance';

const AppContent = () => {
  const location = useLocation();
  
  return (
    <HelmetProvider>
      {/* Background with animated gradient and texture overlay */}
      <div className="min-h-screen relative overflow-hidden">
        {/* Animated background gradient */}
        <div className="fixed inset-0 bg-gradient-to-br from-orange-400 via-red-500 to-pink-600 opacity-10 animate-pulse"></div>
        
        {/* Dynamic pattern overlay */}
        <div className="fixed inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500 to-transparent transform rotate-12 scale-150 animate-pulse"></div>
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-red-500 to-transparent transform -rotate-12 scale-150 animate-pulse" style={{animationDelay: '1s'}}></div>
        </div>
        
        {/* Floating particles effect */}
        <div className="fixed inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-orange-400 rounded-full opacity-20 animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            ></div>
          ))}
        </div>
        
        {/* Main content container with glass effect */}
        <div className="relative z-10 min-h-screen backdrop-blur-sm bg-white/80 text-gray-900 font-body antialiased">
          {/* Dramatic announcement bar using custom CSS */}
          <div className="announcement-bar">
            <p>
              🔥 SPECIAL OFFER: 25% OFF All Catering Services This Month! 
              <span className="ml-2 px-3 py-1 bg-yellow-400 text-orange-900 rounded-full text-sm font-extrabold animate-pulse-warm">
                LIMITED TIME
              </span>
            </p>
          </div>
          
          <Header />
          
          {/* Enhanced main content with dramatic styling */}
          <main className="relative">
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-orange-400/20 to-red-400/20 rounded-full blur-3xl transform -translate-x-32 -translate-y-32"></div>
            <div className="absolute top-1/3 right-0 w-96 h-96 bg-gradient-to-bl from-pink-400/20 to-orange-400/20 rounded-full blur-3xl transform translate-x-48"></div>
            <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-gradient-to-tr from-red-400/20 to-yellow-400/20 rounded-full blur-3xl transform translate-y-48"></div>
            
            <div className="relative z-10 px-4 py-8 md:px-8 md:py-16 lg:px-16 lg:py-24">
              <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                  <Route 
                    path="/" 
                    element={
                      <div className="card glass-effect warm-shadow p-8 md:p-12 lg:p-16">
                        <AnimatedPage><HomePage /></AnimatedPage>
                      </div>
                    } 
                  />
                  <Route 
                    path="/about" 
                    element={
                      <div className="card glass-effect soft-shadow p-8 md:p-12 lg:p-16" style={{background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,237,213,0.8) 100%)'}}>
                        <AnimatedPage><AboutUsPage /></AnimatedPage>
                      </div>
                    } 
                  />
                  <Route 
                    path="/services" 
                    element={
                      <div className="card glass-effect soft-shadow p-8 md:p-12 lg:p-16" style={{background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(254,242,242,0.8) 100%)'}}>
                        <AnimatedPage><ServicesPage /></AnimatedPage>
                      </div>
                    } 
                  />
                  <Route 
                    path="/pricing" 
                    element={
                      <div className="card glass-effect soft-shadow p-8 md:p-12 lg:p-16" style={{background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(254,249,195,0.8) 100%)'}}>
                        <AnimatedPage><PricingPage /></AnimatedPage>
                      </div>
                    } 
                  />
                  <Route 
                    path="/crowdfunding" 
                    element={
                      <div className="card glass-effect soft-shadow p-8 md:p-12 lg:p-16" style={{background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(240,253,244,0.8) 100%)'}}>
                        <AnimatedPage><CrowdfundingPage /></AnimatedPage>
                      </div>
                    } 
                  />
                  <Route 
                    path="/meal-prep" 
                    element={
                      <div className="card glass-effect soft-shadow p-8 md:p-12 lg:p-16" style={{background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(250,245,255,0.8) 100%)'}}>
                        <AnimatedPage><MealPrepPage /></AnimatedPage>
                      </div>
                    } 
                  />
                  <Route 
                    path="/events" 
                    element={
                      <div className="card glass-effect soft-shadow p-8 md:p-12 lg:p-16" style={{background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(253,242,248,0.8) 100%)'}}>
                        <AnimatedPage><EventsPage /></AnimatedPage>
                      </div>
                    } 
                  />
                  <Route 
                    path="/menu" 
                    element={
                      <div className="card glass-effect soft-shadow p-8 md:p-12 lg:p-16" style={{background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,237,213,0.8) 100%)'}}>
                        <AnimatedPage><MenuPage /></AnimatedPage>
                      </div>
                    } 
                  />
                  <Route 
                    path="/pizza-party" 
                    element={
                      <div className="card glass-effect soft-shadow p-8 md:p-12 lg:p-16" style={{background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(254,242,242,0.8) 100%)'}}>
                        <AnimatedPage><PizzaPartyPage /></AnimatedPage>
                      </div>
                    } 
                  />
                </Routes>
              </AnimatePresence>
            </div>
          </main>
          
          {/* Enhanced Footer with dramatic styling */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent opacity-80"></div>
            <div className="relative z-10">
              <Footer />
            </div>
          </div>
        </div>
      </div>
    </HelmetProvider>
  );
}

function App() {
  useEffect(() => {
    // Initialize performance optimizations
    addResourceHints();
    loadFonts();

    // Add dynamic background animation
    const animateBackground = () => {
      const elements = document.querySelectorAll('.animate-pulse');
      elements.forEach((el, index) => {
        setTimeout(() => {
          el.style.animationDelay = `${index * 0.5}s`;
        }, index * 100);
      });
    };

    // Optimize scroll performance with enhanced effects
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrolled = window.pageYOffset;
          const parallaxElements = document.querySelectorAll('.parallax');
          
          parallaxElements.forEach((element) => {
            const speed = element.dataset.speed || 0.5;
            const yPos = -(scrolled * speed);
            element.style.transform = `translateY(${yPos}px)`;
          });
          
          ticking = false;
        });
        ticking = true;
      }
    };

    animateBackground();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}

export default App;