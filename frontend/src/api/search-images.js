// A Vercel/Netlify serverless function
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export default async function handler(req, res) {
  const { query } = req.query; // e.g., 'pizza' or 'tag:entree'

  try {
    const results = await cloudinary.search
      .expression(query || 'resource_type:image') // Default to all images if no query
      .sort_by('created_at', 'desc')
      .max_results(30)
      .execute();

    res.status(200).json({ images: results.resources });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch images.' });
  }
}