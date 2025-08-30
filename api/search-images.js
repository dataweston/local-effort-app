// api/search-images.js
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

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
    // Optional: verify Cloudinary credentials quickly
    await cloudinary.api.ping();

    const searchExpression = query ? `tags:${query}` : 'resource_type:image';

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