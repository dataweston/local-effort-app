const cloudinary = require('cloudinary').v2;

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
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method-not-allowed' });
  }

  if (!CLOUD_NAME || !CLOUD_KEY || !CLOUD_SECRET) {
    console.warn('[localist/images] Cloudinary not configured');
    return res.status(503).json({ error: 'cloudinary-not-configured' });
  }

  try {
    const result = await cloudinary.search
      .expression('folder=localist')
      .with_field('context')
      .max_results(100)
      .execute();

    const images = (result.resources || []).map((r) => ({
      asset_id: r.asset_id,
      public_id: r.public_id || '',
      width: r.width,
      height: r.height,
      format: r.format,
      thumbnail_url: cloudinary.url(r.public_id || '', {
        width: 800,
        crop: 'limit',
        quality: 'auto',
        fetch_format: 'auto',
      }),
    }));

    return res.status(200).json({ images, total_count: images.length });
  } catch (error) {
    console.error('[localist/images] error:', error.message || error);
    return res.status(500).json({ error: 'internal-error', details: error.message });
  }
};
