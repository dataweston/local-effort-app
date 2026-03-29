const { decisionContextSchema } = require('./contracts');
const {
  inferCampaignClass,
  inferCommercialMode,
  inferHighIntent,
  inferPageType,
  inferRouteFamily,
  inferSessionDepth,
  normalizePath,
  normalizeString,
} = require('./contextSignals');

function toBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return /^(1|true|yes)$/i.test(value.trim());
  }
  return undefined;
}

function buildDecisionContext({
  sessionId,
  occurredAt = new Date().toISOString(),
  path,
  pageType,
  category,
  productSlug,
  acquisition = {},
  visitor = {},
  session = {},
  constraints = {},
} = {}) {
  const normalizedPath = normalizePath(path);
  const normalizedPageType = normalizeString(pageType, 80) || inferPageType(normalizedPath);
  const routeFamily = inferRouteFamily(normalizedPath);
  const viewedProductSlugs = Array.isArray(session.viewedProductSlugs)
    ? session.viewedProductSlugs
        .map((entry) => normalizeString(entry, 120))
        .filter(Boolean)
    : [];
  const cartItemCount = Number.isFinite(Number(session.cartItemCount))
    ? Math.max(0, parseInt(session.cartItemCount, 10))
    : 0;
  const isReturning = toBoolean(visitor.isReturning);
  const campaignClass = normalizeString(
    acquisition.campaignClass || inferCampaignClass(acquisition),
    80
  );
  const commercialMode = normalizeString(
    visitor.commercialMode
      || inferCommercialMode({
        path: normalizedPath,
        pageType: normalizedPageType,
        routeFamily,
        acquisition,
        visitor: { ...visitor, isReturning },
        session: { cartItemCount, viewedProductSlugs },
      }),
    80
  );
  const sessionDepth = inferSessionDepth({
    viewedProductSlugs,
    cartItemCount,
    isReturning,
  });
  const hasHighIntent = inferHighIntent({
    pageType: normalizedPageType,
    routeFamily,
    cartItemCount,
    viewedProductSlugs,
    isReturning,
  });

  return decisionContextSchema.parse({
    sessionId,
    occurredAt,
    page: {
      path: normalizedPath,
      type: normalizedPageType,
      routeFamily,
      category: normalizeString(category, 120),
      productSlug: normalizeString(productSlug, 120),
    },
    acquisition: {
      source: normalizeString(acquisition.source || acquisition.utmSource),
      campaign: normalizeString(acquisition.campaign || acquisition.utmCampaign),
      medium: normalizeString(acquisition.medium || acquisition.utmMedium),
      term: normalizeString(acquisition.term || acquisition.utmTerm),
      referrer: normalizeString(acquisition.referrer, 500),
      campaignClass,
    },
    visitor: {
      isReturning,
      deviceType: normalizeString(visitor.deviceType, 80),
      geoRegion: normalizeString(visitor.geoRegion, 120),
      language: normalizeString(visitor.language, 40),
      commercialMode,
    },
    session: {
      cartItemCount,
      viewedProductSlugs,
      depth: sessionDepth,
      hasHighIntent,
    },
    constraints: {
      maxWords: Number.isFinite(Number(constraints.maxWords))
        ? Math.max(1, parseInt(constraints.maxWords, 10))
        : undefined,
      tone: normalizeString(constraints.tone, 120),
      mustNotClaim: Array.isArray(constraints.mustNotClaim)
        ? constraints.mustNotClaim
            .map((entry) => normalizeString(entry, 160))
            .filter(Boolean)
        : [],
    },
  });
}

function buildDecisionContextFromRequest(req, overrides = {}) {
  const query = req?.query || {};
  const headers = req?.headers || {};
  const path = overrides.path || req?.path || req?.originalUrl || '/';
  const sessionId =
    overrides.sessionId ||
    normalizeString(headers['x-session-id'], 120) ||
    normalizeString(query.session_id, 120) ||
    normalizeString(query.sessionId, 120) ||
    'anonymous-session';

  return buildDecisionContext({
    sessionId,
    occurredAt: overrides.occurredAt || new Date().toISOString(),
    path,
    pageType: overrides.pageType || query.page_type || query.pageType,
    category: overrides.category || query.category,
    productSlug: overrides.productSlug || query.product_slug || query.productSlug,
    acquisition: {
      source: overrides.acquisition?.source || query.utm_source || query.utmSource,
      campaign: overrides.acquisition?.campaign || query.utm_campaign || query.utmCampaign,
      medium: overrides.acquisition?.medium || query.utm_medium || query.utmMedium,
      term: overrides.acquisition?.term || query.utm_term || query.utmTerm,
      referrer: overrides.acquisition?.referrer || headers.referer || headers.referrer,
    },
    visitor: {
      isReturning: overrides.visitor?.isReturning ?? query.returning,
      deviceType: overrides.visitor?.deviceType || headers['x-device-type'],
      geoRegion: overrides.visitor?.geoRegion || headers['x-geo-region'],
      language: overrides.visitor?.language || headers['accept-language'],
      commercialMode: overrides.visitor?.commercialMode || query.commercial_mode || query.commercialMode,
    },
    session: {
      cartItemCount: overrides.session?.cartItemCount ?? query.cart_count ?? query.cartCount,
      viewedProductSlugs:
        overrides.session?.viewedProductSlugs
        || query.viewed_products?.split(',')
        || query.viewedProducts?.split(',')
        || [],
    },
    constraints: overrides.constraints || {},
  });
}

module.exports = {
  buildDecisionContext,
  buildDecisionContextFromRequest,
  inferPageType,
};
