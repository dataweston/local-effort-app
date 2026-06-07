const { getSanityClient, getSanityReadClient } = require('../../backend/api/sanityClient');
const { methodNotAllowed } = require('./_http');

const LOCALIST_MENU_QUERY = `
*[
  _type == "hubLocalistItem" &&
  active != false &&
  (defined(name) || defined(title))
] | order(order asc, name asc, title asc) {
  _id,
  "name": coalesce(name, title),
  description,
  "price": coalesce(price, displayPrice, priceLabel),
  order
}`;

const LOCALIST_CONTENT_QUERY = `
*[
  _type == "hubLocalistContent" &&
  active != false &&
  (defined(headline) || defined(body))
] | order(_updatedAt desc)[0] {
  _id,
  eyebrow,
  headline,
  body,
  note,
  _updatedAt
}`;

function publicContent(content) {
  if (!content) return null;
  return {
    _id: content._id,
    eyebrow: content.eyebrow || '',
    headline: content.headline || '',
    body: content.body || '',
    note: content.note || '',
    updatedAt: content._updatedAt || null,
  };
}

function publicItem(item) {
  return {
    _id: item._id,
    name: item.name || '',
    description: typeof item.description === 'string' ? item.description : '',
    price: item.price || '',
    order: Number.isFinite(Number(item.order)) ? Number(item.order) : null,
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  res.setHeader('Cache-Control', 'no-store');

  const client = getSanityClient() || getSanityReadClient();
  if (!client) {
    return res.status(503).json({ ok: false, error: 'sanity-not-configured', items: [] });
  }

  try {
    const [content, items] = await Promise.all([
      client.fetch(LOCALIST_CONTENT_QUERY),
      client.fetch(LOCALIST_MENU_QUERY),
    ]);
    return res.status(200).json({
      ok: true,
      generatedAt: new Date().toISOString(),
      content: publicContent(content),
      items: Array.isArray(items) ? items.map(publicItem) : [],
    });
  } catch (err) {
    console.error('[hub/localist-menu] error', err);
    return res.status(500).json({ ok: false, error: 'Unable to load Localist menu', items: [] });
  }
};
