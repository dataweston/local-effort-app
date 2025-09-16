const sanity = require('@sanity/client');

const projectId = process.env.VITE_APP_SANITY_PROJECT_ID || process.env.VITE_SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID;
const dataset = process.env.VITE_APP_SANITY_DATASET || process.env.VITE_SANITY_DATASET || process.env.SANITY_DATASET;
const site = process.env.SITE_ORIGIN || 'https://local-effort-app.vercel.app';

const client = projectId && dataset ? sanity.createClient({ projectId, dataset, useCdn: true, apiVersion: '2023-05-03' }) : null;

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

module.exports = async (req, res) => {
  try {
    if (!client) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      return res.end('<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>Local Effort Feed</title></channel></rss>');
    }
    const docs = await client.fetch(`*[_type == "product" && active == true]{
      _id, title, slug, shortDescription, longDescription, images[]{asset->{url}}, price, salePrice, inventoryManaged, inventory
    } | order(title asc)`);
    const items = (docs || []).map((d) => {
      const id = d._id;
      const slug = d.slug?.current || id;
      const link = `${site}/product/${encodeURIComponent(slug)}`;
      const allImages = (d.images || []).map((i) => i?.asset?.url).filter(Boolean);
      const image = allImages[0] || '';
      const additional = allImages.slice(1);
      const priceCents = (d.salePrice ?? d.price) || 0;
      const price = `${(priceCents / 100).toFixed(2)} USD`;
      const availability = d.inventoryManaged ? ((Number(d.inventory) || 0) > 0 ? 'in stock' : 'out of stock') : 'in stock';
      const desc = d.shortDescription || (Array.isArray(d.longDescription) ? '' : (d.longDescription || ''));
      return `
        <item>
          <g:id>${esc(id)}</g:id>
          <title>${esc(d.title)}</title>
          <description>${esc(desc)}</description>
          <link>${esc(link)}</link>
          ${image ? `<g:image_link>${esc(image)}</g:image_link>` : ''}
          ${additional.map((u) => `<g:additional_image_link>${esc(u)}</g:additional_image_link>`).join('')}
          <g:price>${esc(price)}</g:price>
          <g:availability>${esc(availability)}</g:availability>
          <g:condition>new</g:condition>
        </item>`;
    }).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Local Effort Product Feed</title>
    <link>${esc(site)}</link>
    <description>Automatically generated feed</description>
    ${items}
  </channel>
</rss>`;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.end(xml);
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Failed to generate feed');
  }
};
