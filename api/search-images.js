// api/search-images.js
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query = '' } = req.query;
  
  try {
    console.log('Environment check:', {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'Missing',
      api_key: process.env.CLOUDINARY_API_KEY ? 'Set' : 'Missing',
      api_secret: process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Missing'
    });

    // Test connection
    await cloudinary.api.ping();
    
    const searchExpression = query ? `tags:${query}` : 'resource_type:image';
    console.log('Searching with expression:', searchExpression);
    
    const result = await cloudinary.search
      .expression(searchExpression)
      .sort_by('created_at', 'desc')
      .with_field('context')
      .max_results(30)
      .execute();

    console.log('Search successful, found:', result.resources?.length, 'images');

    res.status(200).json({ 
      images: result.resources || [],
      total_count: result.total_count || 0
    });
    
  } catch (error) {
    console.error('Cloudinary error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch images',
      details: error.message,
      env_check: {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'Missing',
        api_key: process.env.CLOUDINARY_API_KEY ? 'Set' : 'Missing',
        api_secret: process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Missing'
      }
    });
  }
}