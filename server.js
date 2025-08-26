// server.js

require('dotenv').config();
const express = require('express');
const cloudinary = require('cloudinary');

const app = express();
const port = 3001; // Run the backend on a different port from React

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Create the API route
app.get('/api/search-images', async (req, res) => {
  const searchQuery = req.query.query || '';

  try {
    // Use the Cloudinary Search API
    const result = await cloudinary.v2.search
      .expression(searchQuery) // Use the query from the frontend
      .sort_by('created_at', 'desc')
      .with_field('context') // Include context metadata like alt text
      .max_results(30)
      .execute();
    
    res.json({ images: result.resources });
  } catch (error) {
    console.error('Error fetching images from Cloudinary:', error);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});