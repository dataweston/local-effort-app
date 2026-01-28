// src/utils/performance.js
const supportsPreload = (() => {
  let memo;
  return () => {
    if (memo !== undefined) return memo;
    try {
      memo = !!document.createElement('link').relList.supports('preload');
    } catch (error) {
      memo = false;
    }
    return memo;
  };
})();

const runWhenIdle = (cb) => {
  if (typeof window === 'undefined') return;
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(cb, { timeout: 1500 });
    return;
  }
  window.setTimeout(cb, 1);
};

const attachStylesheet = (href, crossOrigin) => {
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = href;
  if (crossOrigin) {
    stylesheet.crossOrigin = crossOrigin;
  }
  stylesheet.media = 'print';
  stylesheet.onload = () => {
    stylesheet.media = 'all';
  };
  document.head.appendChild(stylesheet);
};

export const loadExternalStylesheet = (href, { crossOrigin = 'anonymous' } = {}) => {
  if (typeof document === 'undefined' || !href) return;

  if (supportsPreload()) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = href;
    if (crossOrigin) {
      link.crossOrigin = crossOrigin;
    }
    link.onload = () => {
      link.onload = null;
      link.rel = 'stylesheet';
      link.as = '';
    };
    link.onerror = () => {
      link.onerror = null;
      attachStylesheet(href, crossOrigin);
    };
    document.head.appendChild(link);
    return;
  }

  attachStylesheet(href, crossOrigin);
};

const normalizeFontEntry = (entry) => {
  if (typeof entry === 'string') {
    return { href: entry, crossOrigin: 'anonymous' };
  }
  if (!entry || typeof entry !== 'object') {
    return { href: null, crossOrigin: null };
  }
  const hasCrossOrigin = Object.prototype.hasOwnProperty.call(entry, 'crossOrigin');
  return {
    href: entry.href,
    crossOrigin: hasCrossOrigin ? entry.crossOrigin : 'anonymous',
  };
};

export const loadFonts = (fontEntries = []) => {
  if (!Array.isArray(fontEntries) || fontEntries.length === 0) return;

  runWhenIdle(() => {
    fontEntries.forEach((entry) => {
      const { href, crossOrigin } = normalizeFontEntry(entry);
      if (!href) return;
      loadExternalStylesheet(href, { crossOrigin });
    });
  });
};

export const preloadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = resolve;
    img.onerror = reject;
    img.src = src;
  });
