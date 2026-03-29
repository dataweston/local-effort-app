const fs = require('fs');
const path = require('path');

const DEFAULT_SITE_URL = 'https://www.localeffortfood.com';
const DEFAULT_SUPPORT = { email: 'yum@localeffortfood.com' };
const DEFAULT_PUBLIC_APIS = [
  { path: '/api/support/search', method: 'GET', query: { q: 'query string' } },
  { path: '/api/messages/submit', method: 'POST' },
  { path: '/api/events/request', method: 'POST' },
  { path: '/api/v1/posts', method: 'GET' },
  { path: '/api/v1/posts/:slug', method: 'GET' },
  { path: '/api/v1/authors', method: 'GET' },
  { path: '/api/v1/tags', method: 'GET' },
  { path: '/api/v1/categories', method: 'GET' },
  { path: '/api/activitypub/actor', method: 'GET' },
  { path: '/api/activitypub/outbox', method: 'GET' },
  { path: '/.well-known/webfinger', method: 'GET' },
  { path: '/.well-known/nodeinfo', method: 'GET' },
  { path: '/api/public/pricing-faq', method: 'GET' },
  { path: '/api/public/estimator-help', method: 'GET' },
];

function resolveSiteUrl({ manifest, env = process.env } = {}) {
  return (
    manifest?.site ||
    env.PUBLIC_SITE_URL ||
    env.NEXT_PUBLIC_SITE_URL ||
    env.PUBLIC_URL ||
    DEFAULT_SITE_URL
  );
}

function loadJsonFile(filePath, fallback, { fsImpl = fs } = {}) {
  try {
    const raw = fsImpl.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (_error) {
    return fallback;
  }
}

function readUpdatedAt(filePath, { fsImpl = fs } = {}) {
  try {
    return fsImpl.statSync(filePath).mtime.toISOString();
  } catch (_error) {
    return null;
  }
}

function loadManifest(manifestPath, { fsImpl = fs, logger = console } = {}) {
  if (!manifestPath || !fsImpl.existsSync(manifestPath)) return null;
  try {
    const raw = fsImpl.readFileSync(manifestPath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (logger?.warn) {
      logger.warn({ err: error, manifestPath }, 'failed to parse ai manifest');
    }
    return null;
  }
}

function buildDefaultFeeds(siteUrl) {
  const trimmedSite = siteUrl.replace(/\/$/, '');
  return [
    { type: 'sitemap', url: `${trimmedSite}/sitemap.xml` },
    { type: 'sitemap', url: `${trimmedSite}/api/sitemap.xml` },
    { type: 'rss', url: `${trimmedSite}/api/feeds/blog.rss` },
    { type: 'atom', url: `${trimmedSite}/api/feeds/blog.atom` },
    { type: 'json', url: `${trimmedSite}/api/feeds/blog.json` },
    { type: 'activitypub', url: `${trimmedSite}/api/activitypub/actor` },
    { type: 'rss', url: `${trimmedSite}/api/feeds/releases.rss` },
    { type: 'atom', url: `${trimmedSite}/api/feeds/releases.atom` },
  ];
}

function buildPublicSitePayload({
  manifest,
  env = process.env,
  now = () => new Date().toISOString(),
} = {}) {
  const siteUrl = resolveSiteUrl({ manifest, env });
  const trimmedSite = siteUrl.replace(/\/$/, '');
  return {
    name: manifest?.name || 'Local Effort',
    url: siteUrl,
    navigation: Array.isArray(manifest?.navigation) ? manifest.navigation : [],
    endpoints: Array.isArray(manifest?.apis) ? manifest.apis : DEFAULT_PUBLIC_APIS,
    feeds: Array.isArray(manifest?.feeds) ? manifest.feeds : buildDefaultFeeds(siteUrl),
    support: manifest?.support || DEFAULT_SUPPORT,
    mcp: Array.isArray(manifest?.mcpServers) ? manifest.mcpServers : [],
    ucp: Array.isArray(manifest?.ucpServers) ? manifest.ucpServers : [],
    sitemap: `${trimmedSite}/sitemap.xml`,
    aiTxt: `${trimmedSite}/ai.txt`,
    manifest: `${trimmedSite}/ai/manifest.json`,
    updatedAt: manifest?.updated || now(),
  };
}

function buildPublicCollectionPayload(filePath, { fsImpl = fs } = {}) {
  return {
    items: loadJsonFile(filePath, [], { fsImpl }),
    updatedAt: readUpdatedAt(filePath, { fsImpl }),
  };
}

function resolveDefaultPaths() {
  const repoRoot = path.resolve(__dirname, '../../..');
  return {
    manifestPath: path.join(repoRoot, 'public/ai/manifest.json'),
    pricingFaqPath: path.join(repoRoot, 'src/data/pricingFaq.json'),
    estimatorHelpPath: path.join(repoRoot, 'src/data/estimatorHelp.json'),
  };
}

module.exports = {
  DEFAULT_SITE_URL,
  buildPublicCollectionPayload,
  buildPublicSitePayload,
  loadJsonFile,
  loadManifest,
  readUpdatedAt,
  resolveDefaultPaths,
  resolveSiteUrl,
};
