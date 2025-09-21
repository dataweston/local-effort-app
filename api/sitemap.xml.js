const sanity = require('@sanity/client');

const projectId = process.env.VITE_APP_SANITY_PROJECT_ID || process.env.VITE_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID;
const dataset = process.env.VITE_APP_SANITY_DATASET || process.env.VITE_SANITY_DATASET || process.env.SANITY_DATASET;
const site = process.env.SITE_ORIGIN || 'https://local-effort-app.vercel.app';
const client = projectId && dataset ? sanity.createClient({ projectId, dataset, useCdn: true, apiVersion: '2023-05-03' }) : null;

const staticPaths = [
  '/',
  '/about',
  '/services',
  '/pricing',
  '/menu',
  '/sale',
  '/happy-monday',
  '/events',
  '/gallery',
  '/meal-prep',
  // New city landing pages
  '/personal-chef-minneapolis',
  '/personal-chef-st-paul',
  '/personal-chef-twin-cities',
];

module.exports = async (req, res) => {
  try {
    let urls = staticPaths.map((p) => `${site}${p}`);
    if (client) {
      const slugs = await client.fetch(`*[_type == "product" && defined(slug.current) && active == true][].slug.current`);
      urls = urls.concat((slugs || []).map((s) => `${site}/product/${encodeURIComponent(s)}`));
    }
    // Attempt to include a handful of gallery images as image sitemap entries if Cloudinary is configured
    let imageEntries = [];
    try {
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const apiKey = process.env.CLOUDINARY_API_KEY;
      const apiSecret = process.env.CLOUDINARY_API_SECRET;
      if (cloudName && apiKey && apiSecret) {
        const { v2: cld } = require('cloudinary');
        cld.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
        // Pull a small, recent set to keep response light
        const result = await cld.search.expression('resource_type:image').sort_by('created_at','desc').max_results(20).with_field('context').execute();
        imageEntries = (result.resources || []).slice(0, 12).map((r) => {
          const publicId = r.public_id;
          const large = cld.url(publicId, { width: 1200, crop: 'limit', quality: 'auto', fetch_format: 'auto' });
          const caption = (r.context && (r.context.caption || r.context.alt)) || 'Local Effort gallery image';
          const title = caption && caption.length > 80 ? caption.slice(0, 80) : caption;
          return {
            pageLoc: `${site}/gallery`,
            imageLoc: large,
            caption,
            title: title || 'Gallery image',
          };
        });
      }
    } catch (_) {
      // ignore image sitemap errors silently
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}
${imageEntries.map((e) => `  <url>\n    <loc>${e.pageLoc}</loc>\n    <image:image>\n      <image:loc>${e.imageLoc}</image:loc>\n      <image:caption>${escapeXml(e.caption)}</image:caption>\n      <image:title>${escapeXml(e.title)}</image:title>\n    </image:image>\n  </url>`).join('\n')}
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

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
