// api/search-images.js
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary defensively
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUD_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUD_SECRET = process.env.CLOUDINARY_API_SECRET;

if (CLOUD_NAME && CLOUD_KEY && CLOUD_SECRET) {
  cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: CLOUD_KEY,
    api_secret: CLOUD_SECRET,
    secure: true,
  });
} else {
  // Don't call cloudinary.config with undefined values; handler will return a clear error.
  // eslint-disable-next-line no-console
  console.warn('Cloudinary environment variables are not fully configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.');
}

async function handler(req, res) {
  // Add CORS headers for local dev / preview
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query = '', next_cursor = null, per_page = '24' } = req.query;
  const perPage = Math.min(100, parseInt(per_page, 10) || 24);

  try {
    // Defensive: ensure Cloudinary credentials are present before calling the API
    if (!CLOUD_NAME || !CLOUD_KEY || !CLOUD_SECRET) {
      return res.status(500).json({ error: 'Cloudinary not configured on server', details: 'Missing CLOUDINARY_CLOUD_NAME/API_KEY/SECRET' });
    }

    // Optional: verify Cloudinary credentials quickly
    try {
      await cloudinary.api.ping();
    } catch (pingErr) {
      console.error('Cloudinary ping failed:', pingErr && (pingErr.message || pingErr));
      return res.status(500).json({ error: 'Cloudinary ping failed', details: String(pingErr) });
    }

    // Support a friendly `collection` query param (e.g. collection=home)
    // which maps to tags:collection:<name> and tags:published by default.
    const { collection, type } = req.query || {};
    let searchExpression;
    if (collection) {
      // lazy-require the helper to avoid circular issues in serverless bundles
      // eslint-disable-next-line global-require
      const { buildExpression } = require('../backend/utils/searchExpression');
      searchExpression = buildExpression({ collection, type, published: true });
    } else {
      searchExpression = query ? `tags:${query}` : 'resource_type:image';
    }

    const builder = cloudinary.search
      .expression(searchExpression)
      .sort_by('created_at', 'desc')
      .with_field('context')
      .max_results(perPage);

    if (next_cursor) builder.next_cursor(next_cursor);

    const result = await builder.execute();

    const images = (result.resources || []).map((r) => {
      const publicId = r.public_id || '';
      return {
        asset_id: r.asset_id,
        public_id: publicId,
        context: r.context || {},
        tags: r.tags || [],
        width: r.width,
        height: r.height,
        format: r.format,
        // client-friendly URLs (thumbnails for gallery, large for modal)
        thumbnail_url: cloudinary.url(publicId, {
          width: 600,
          height: 600,
          crop: 'fill',
          quality: 'auto',
          fetch_format: 'auto',
        }),
        large_url: cloudinary.url(publicId, {
          width: 1400,
          quality: 'auto',
          fetch_format: 'auto',
        }),
      };
    });

    res.status(200).json({
      images,
      total_count: result.total_count || 0,
      next_cursor: result.next_cursor || null,
    });
  } catch (error) {
    console.error('Cloudinary error:', error);
    res.status(500).json({ error: 'Failed to fetch images', details: error.message });
  }
}

module.exports = handler;