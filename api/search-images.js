// api/search-images.js (for Vercel)
const cloudinary = require('cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query = '' } = req.query;
  
  try {
    console.log('Cloudinary search with query:', query);
    
    const searchExpression = query ? `tags:${query}` : 'resource_type:image';
    
    const result = await cloudinary.v2.search
      .expression(searchExpression)
      .sort_by('created_at', 'desc')
      .with_field('context')
      .max_results(30)
      .execute();

    res.status(200).json({ 
      images: result.resources,
      total_count: result.total_count 
    });
  } catch (error) {
    console.error('Cloudinary search error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch images',
      details: error.message 
    });
  }
}