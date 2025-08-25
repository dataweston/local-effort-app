import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import CloudinaryImage from '../components/common/cloudinaryImage'; // Use our new component

const GalleryPage = () => {
  const [images, setImages] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simple debounce to prevent API calls on every keystroke
    const handler = setTimeout(() => {
      setLoading(true);
      const searchQuery = query ? `tags:${query}` : '';
      fetch(`/api/search-images?query=${encodeURIComponent(searchQuery)}`)
        .then(res => res.json())
        .then(data => {
          setImages(data.images || []);
          setLoading(false);
        });
    }, 500); // 500ms delay

    return () => clearTimeout(handler);
  }, [query]);

  return (
    <>
      <Helmet>
        <title>Gallery | Local Effort</title>
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

        {loading ? <p>Loading...</p> : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map(img => (
              <CloudinaryImage
                key={img.asset_id}
                publicId={img.public_id}
                alt={img.context?.alt || 'Gallery image'}
                width={400}
                height={400}
                className="rounded-lg object-cover w-full h-full aspect-square"
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default GalleryPage;