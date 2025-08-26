const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const cloudinary = require('cloudinary');

const app = express(); // Initialize express

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// The API route
app.get('/api/search-images', async (req, res) => {
  const searchQuery = req.query.query || '';
  try {
    const result = await cloudinary.v2.search
      .expression(searchQuery)
      .sort_by('created_at', 'desc')
      .with_field('context')
      .max_results(30)
      .execute();

    res.json({ images: result.resources });
  } catch (error) {
    console.error('Error fetching images from Cloudinary:', error);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

// Export the app for Vercel
module.exports = app;