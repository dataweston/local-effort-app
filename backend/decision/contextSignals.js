function normalizeString(value, max = 200) {
  if (value == null) return undefined;
  const normalized = String(value).trim();
  if (!normalized) return undefined;
  return normalized.slice(0, max);
}

function normalizePath(value) {
  return normalizeString(value, 500) || '/';
}

function inferPageType(pathname) {
  if (!pathname || pathname === '/') return 'home';
  if (pathname.startsWith('/product/')) return 'product';
  if (pathname.startsWith('/blog/')) return 'article';
  if (pathname.startsWith('/sale')) return 'sale';
  if (pathname.startsWith('/weekly-order')) return 'commerce';
  if (pathname.startsWith('/pizza-party')) return 'service';
  if (pathname.startsWith('/february')) return 'service';
  if (pathname.startsWith('/psyche')) return 'product';
  return 'page';
}

function inferRouteFamily(pathname) {
  if (!pathname || pathname === '/') return 'home';
  if (pathname.startsWith('/admin/')) return 'admin';
  if (pathname.startsWith('/product/')) return 'catalog';
  if (pathname.startsWith('/sale')) return 'campaign';
  if (pathname.startsWith('/weekly-order')) return 'subscription';
  if (pathname.startsWith('/pizza-party')) return 'events';
  if (pathname.startsWith('/blog/') || pathname.startsWith('/releases')) return 'editorial';
  return 'general';
}

function inferCampaignClass({ source, medium, campaign, referrer } = {}) {
  const sourceValue = String(source || '').toLowerCase();
  const mediumValue = String(medium || '').toLowerCase();
  const campaignValue = String(campaign || '').toLowerCase();
  const referrerValue = String(referrer || '').toLowerCase();

  if (mediumValue.includes('email') || sourceValue.includes('newsletter')) return 'retention';
  if (campaignValue.includes('sale') || campaignValue.includes('launch') || campaignValue.includes('drop')) return 'promotion';
  if (sourceValue.includes('google') || sourceValue.includes('instagram') || sourceValue.includes('facebook')) return 'paid-acquisition';
  if (referrerValue.includes('google.') || referrerValue.includes('bing.')) return 'search';
  if (referrerValue && !referrerValue.includes('localeffort')) return 'referral';
  return 'direct';
}

function inferCommercialMode({ path, pageType, routeFamily, acquisition = {}, visitor = {}, session = {} } = {}) {
  const pathname = normalizePath(path);
  const acquisitionSource = String(acquisition.source || '').toLowerCase();
  const campaignClass = String(acquisition.campaignClass || inferCampaignClass(acquisition) || '').toLowerCase();
  if (pathname.startsWith('/weekly-order')) return 'subscriber';
  if (pathname.startsWith('/pizza-party') || pathname.includes('small-events')) return 'b2b';
  if (acquisitionSource.includes('wholesale')) return 'b2b';
  if (pageType === 'service' || routeFamily === 'events') return 'planner';
  if (pageType === 'product' || pageType === 'sale' || routeFamily === 'catalog' || routeFamily === 'campaign') return 'consumer';
  if (visitor.isReturning && Number(session.cartItemCount || 0) > 0) return 'subscriber';
  if (campaignClass === 'retention' || acquisitionSource.includes('newsletter') || acquisitionSource.includes('email')) {
    return 'subscriber';
  }
  if (campaignClass === 'paid-acquisition' || campaignClass === 'promotion' || campaignClass === 'search') {
    return 'consumer';
  }
  return 'unknown';
}

function inferSessionDepth({ viewedProductSlugs = [], cartItemCount = 0, isReturning = false } = {}) {
  const views = Array.isArray(viewedProductSlugs) ? viewedProductSlugs.filter(Boolean).length : 0;
  if (cartItemCount > 0 || views >= 3) return 'deep';
  if (isReturning || views >= 1) return 'engaged';
  return 'entry';
}

function inferHighIntent({ pageType, routeFamily, cartItemCount = 0, viewedProductSlugs = [], isReturning = false } = {}) {
  if (Number(cartItemCount || 0) > 0) return true;
  if (pageType === 'product' && Array.isArray(viewedProductSlugs) && viewedProductSlugs.length >= 2) return true;
  if (routeFamily === 'subscription' && isReturning) return true;
  return false;
}

module.exports = {
  inferCampaignClass,
  inferCommercialMode,
  inferHighIntent,
  inferPageType,
  inferRouteFamily,
  inferSessionDepth,
  normalizePath,
  normalizeString,
};
