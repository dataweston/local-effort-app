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

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method-not-allowed' });
  }

  try {
    if (!CLOUD_NAME || !CLOUD_KEY || !CLOUD_SECRET) {
      return res.status(503).json({ error: 'cloudinary-not-configured' });
    }

    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'localist',
      max_results: 100,
    });

    const images = (result.resources || []).map((r) => {
      const publicId = r.public_id || '';
      return {
        asset_id: r.asset_id,
        public_id: publicId,
        width: r.width,
        height: r.height,
        format: r.format,
        thumbnail_url: cloudinary.url(publicId, {
          width: 800,
          crop: 'limit',
          quality: 'auto',
          fetch_format: 'auto',
        }),
      };
    });

    return res.status(200).json({ images, total_count: images.length });
  } catch (error) {
    console.error('[localist/images] error:', error.message);
    return res.status(500).json({ error: 'internal-error' });
  }
}
