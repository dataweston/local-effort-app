const sanity = require('@sanity/client');

const projectId = process.env.VITE_APP_SANITY_PROJECT_ID || process.env.VITE_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID;
const dataset = process.env.VITE_APP_SANITY_DATASET || process.env.VITE_SANITY_DATASET || process.env.SANITY_DATASET;
const site = process.env.SITE_ORIGIN || 'https://local-effort-app.vercel.app';
const client = projectId && dataset ? sanity.createClient({ projectId, dataset, useCdn: true, apiVersion: '2023-05-03' }) : null;

const staticPaths = ['/', '/about', '/services', '/pricing', '/menu', '/sale', '/happy-monday', '/events', '/gallery', '/meal-prep'];

module.exports = async (req, res) => {
  try {
    let urls = staticPaths.map((p) => `${site}${p}`);
    if (client) {
      const slugs = await client.fetch(`*[_type == "product" && defined(slug.current) && active == true][].slug.current`);
      urls = urls.concat((slugs || []).map((s) => `${site}/product/${encodeURIComponent(s)}`));
    }
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>`;
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.end(xml);
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Failed to generate sitemap');
  }
}
