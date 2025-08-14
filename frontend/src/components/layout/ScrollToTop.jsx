// src/components/layout/ScrollToTop.jsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const ScrollToTop = () => {
  const { pathname } = useLocation();
  
  useEffect(() => {
    const scrollToTop = () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    };
    
    const timer = setTimeout(scrollToTop, 100);
    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
};