const fs = require('fs');
const path = require('path');
const sanity = require('@sanity/client');

const projectId = process.env.VITE_APP_SANITY_PROJECT_ID || process.env.VITE_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID;
const dataset = process.env.VITE_APP_SANITY_DATASET || process.env.VITE_SANITY_DATASET || process.env.SANITY_DATASET;
const site = process.env.SITE_ORIGIN || 'https://www.localeffortfood.com';
const client = projectId && dataset ? sanity.createClient({ projectId, dataset, useCdn: true, apiVersion: '2023-05-03' }) : null;

// Fallback when .routes-manifest.json is unavailable. Keep in sync with
// PUBLIC_ROUTES in src/config/routes.js (the build-time source of truth).
const fallbackPaths = [
  '/',
  '/blog',
  '/releases',
  '/sale',
  '/happymonday',
  '/pizza-party',
  '/february',
  '/psyche',
  '/book',
];

function loadPublicPaths() {
  try {
    const manifestPath = path.resolve(__dirname, '../.routes-manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (Array.isArray(manifest.publicPaths) && manifest.publicPaths.length > 0) {
      return manifest.publicPaths;
    }
  } catch (_) {
    // fall through to fallback list
  }
  return fallbackPaths;
}

module.exports = async (req, res) => {
  try {
    let urls = loadPublicPaths().map((p) => (p === '/' ? site + '/' : site + p));
    if (client) {
      const slugs = await client.fetch(`*[_type == "product" && defined(slug.current) && active == true][].slug.current`).catch(() => []);
      urls = urls.concat((slugs || []).map((s) => `${site}/product/${encodeURIComponent(s)}`));
      const postSlugs = await client.fetch(`*[_type == "blogPost" && defined(slug.current)][].slug.current`).catch(() => []);
      urls = urls.concat((postSlugs || []).map((s) => `${site}/blog/${encodeURIComponent(s)}`));
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${escapeXml(u)}</loc></url>`).join('\n')}
</urlset>`;
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.end(xml);
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Failed to generate sitemap');
  }
};

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
