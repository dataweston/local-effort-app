// src/utils/performance.js
export const addResourceHints = () => {
  const hints = [
    { rel: 'dns-prefetch', href: '//fonts.googleapis.com' },
    { rel: 'dns-prefetch', href: '//fonts.gstatic.com' },
    { rel: 'preconnect', href: 'https://fonts.googleapis.com', crossOrigin: 'anonymous' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' }
  ];

  hints.forEach(hint => {
    const link = document.createElement('link');
    Object.keys(hint).forEach(key => {
      if (key === 'crossOrigin') {
        link.crossOrigin = hint[key];
      } else {
        link[key] = hint[key];
      }
    });
    document.head.appendChild(link);
  });
};

export const loadFonts = () => {
  const fonts = [
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
    'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap'
  ];

  fonts.forEach(href => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = href;
    document.head.appendChild(link);
  });
};

export const preloadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = resolve;
    img.onerror = reject;
    img.src = src;
  });
};