import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import CloudinaryImage from '../components/common/cloudinaryImage';

const GalleryPage = () => {
  const [images, setImages] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handler = setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const searchQuery = query ? `tags:${query}` : '';
        const apiUrl = `/api/search-images?query=${encodeURIComponent(searchQuery)}`;

        console.log('Making API call to:', apiUrl);
        console.log('Current location:', window.location.href);

        const response = await fetch(apiUrl);
        console.log('Response status:', response.status);
        console.log('Response content-type:', response.headers.get('content-type'));

        // Check if response is actually JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const textResponse = await response.text();
          console.error('Non-JSON response:', textResponse.substring(0, 200));
          throw new Error('API endpoint not found - got HTML instead of JSON');
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('API Response data:', data);

        setImages(data.images || []);
      } catch (err) {
        console.error('Error fetching images:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [query]);

  return (
    <>
      <Helmet>
        <title>Pictures of Food | Local Effort</title>
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-4 text-center">Image Gallery</h1>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by tag (e.g., pizza, events)..."
          className="w-full max-w-md mx-auto block p-3 border rounded-md mb-8"
        />

        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <div className="text-red-600 bg-red-50 p-4 rounded">
            <h3 className="font-bold">Error Details:</h3>
            <p>{error}</p>
            <p className="mt-2 text-sm">This usually means:</p>
            <ul className="list-disc ml-6 text-sm">
              <li>The /api/search-images.js file wasn't created properly</li>
              <li>Environment variables aren't set in Vercel</li>
              <li>The serverless function has an error</li>
            </ul>
            <p className="mt-2 text-sm">Check the browser Network tab and Vercel function logs.</p>
          </div>
        ) : images.length === 0 ? (
          <div className="text-center p-8">
            <p>No images found.</p>
            <p className="text-sm text-gray-600 mt-2">
              Try removing search terms or check that you have images in your Cloudinary account.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((img) => {
              console.log('Rendering image:', img.public_id);
              return (
                <div key={img.asset_id} className="border p-2">
                  <CloudinaryImage
                    publicId={img.public_id}
                    alt={img.context?.alt || 'Gallery image'}
                    width={400}
                    height={400}
                    className="rounded-lg object-cover w-full h-full aspect-square"
                  />
                  <p className="text-xs mt-2 text-gray-600">ID: {img.public_id}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default GalleryPage;
