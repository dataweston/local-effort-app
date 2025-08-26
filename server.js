const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '/.env') });

const express = require('express');
const cloudinary = require('cloudinary');

const app = express();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Add CORS headers for local development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// The API route with better error handling
app.get('/api/search-images', async (req, res) => {
  console.log('API called with query:', req.query.query);
  
  try {
    // Test Cloudinary connection first
    const testResult = await cloudinary.v2.api.ping();
    console.log('Cloudinary ping successful:', testResult);
    
    const searchQuery = req.query.query || '';
    console.log('Executing search with query:', searchQuery);
    
    // If no query, search for all images
    const searchExpression = searchQuery || 'resource_type:image';
    
    const result = await cloudinary.v2.search
      .expression(searchExpression)
      .sort_by('created_at', 'desc')
      .with_field('context')
      .max_results(30)
      .execute();

    console.log('Search result:', {
      total_count: result.total_count,
      resources_count: result.resources?.length
    });

    res.json({ 
      images: result.resources,
      total_count: result.total_count 
    });
  } catch (error) {
    console.error('Detailed error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch images',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// For local development
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Cloudinary config:', {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'Missing',
      api_key: process.env.CLOUDINARY_API_KEY ? 'Set' : 'Missing',
      api_secret: process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Missing'
    });
  });
}

// Export for Vercel
module.exports = app;