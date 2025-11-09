import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * LayoutGridGallery - Animated grid layout with expandable cards
 * Inspired by Aceternity UI's layout-grid component
 */
const LayoutGridGallery = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  // Local images from /images folder
  const localImages = [
    '2f4a4f32-21ae-47fc-bcf1-f4e2439294bc_3000.jpg',
    '819af5c9-a882-4a4d-a1f1-357762a78ebd_3000.jpg',
    '927eec02-f5a6-4501-8a83-edd2af06f973_3000.jpg',
    'a847c096-4191-454a-82a2-35e6fd246b2a_2645.jpg',
    'DP-14936-049.jpg',
    'DP-15526-010.jpg',
    'DP-30169-001.jpg',
    'DP800004.jpg',
    'DP823463.jpg',
    'DP885938.jpg',
    'DPB874625.jpg',
    'DT1939.jpg',
    'DT4854.jpg',
  ];

  // Fetch Cloudinary images tagged with 'pie'
  const fetchCloudinaryImages = useCallback(async () => {
    try {
      const response = await fetch('/api/search-images?query=pie&per_page=50');
      if (!response.ok) return [];

      const data = await response.json();
      return (data.images || []).map((img) => ({
        id: img.asset_id || img.public_id,
        url: img.thumbnail_url || img.large_url,
        alt: img.context?.alt || 'Pie image',
        source: 'cloudinary',
      }));
    } catch (error) {
      console.error('Error fetching Cloudinary images:', error);
      return [];
    }
  }, []);

  // Load images on mount
  useEffect(() => {
    let mounted = true;

    const loadImages = async () => {
      setLoading(true);

      // Combine local and Cloudinary images
      const cloudinaryImages = await fetchCloudinaryImages();

      const localImageObjects = localImages.map((filename, index) => ({
        id: `local-${index}`,
        url: `/images/${filename}`,
        alt: `Sale image ${index + 1}`,
        source: 'local',
      }));

      if (mounted) {
        // Shuffle and combine images
        const allImages = [...localImageObjects, ...cloudinaryImages];
        const shuffled = allImages.sort(() => Math.random() - 0.5);
        setImages(shuffled);
        setLoading(false);
      }
    };

    loadImages();

    return () => {
      mounted = false;
    };
  }, [fetchCloudinaryImages]);

  const selectedImage = selectedId ? images.find((img) => img.id === selectedId) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-neutral-600 text-lg">Loading gallery...</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen p-4 md:p-8 bg-neutral-900">
      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-7xl mx-auto auto-rows-[200px]">
        {images.map((image, index) => {
          // Create varied grid spans for visual interest
          const isLarge = index % 7 === 0;
          const isMedium = index % 5 === 0 && !isLarge;

          return (
            <GridCard
              key={image.id}
              image={image}
              index={index}
              className={
                isLarge
                  ? 'md:col-span-2 md:row-span-2'
                  : isMedium
                  ? 'md:col-span-2'
                  : 'col-span-1'
              }
              onClick={() => setSelectedId(image.id)}
            />
          );
        })}
      </div>

      {/* Expanded Modal View */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedId(null)}
          >
            <motion.div
              layoutId={selectedImage.id}
              className="relative max-w-5xl w-full max-h-[90vh] bg-white rounded-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedId(null)}
                className="absolute top-4 right-4 z-10 bg-white/90 hover:bg-white text-neutral-900 rounded-full p-2 w-10 h-10 flex items-center justify-center shadow-lg transition-colors"
              >
                ✕
              </button>
              <div className="p-6">
                <img
                  src={image.url}
                  alt={selectedImage.alt}
                  className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
                />
                <div className="mt-4 text-center">
                  <h3 className="text-2xl font-bold text-neutral-900">
                    {selectedImage.alt}
                  </h3>
                  <p className="text-neutral-600 mt-2">
                    Source: {selectedImage.source}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Individual grid card
 */
const GridCard = ({ image, index, className, onClick }) => {
  return (
    <motion.div
      layoutId={image.id}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.02, duration: 0.4 }}
      whileHover={{ scale: 1.02, zIndex: 10 }}
      className={`relative overflow-hidden rounded-xl cursor-pointer group ${className}`}
      onClick={onClick}
    >
      {/* Image */}
      <div className="absolute inset-0">
        <img
          src={image.url}
          alt={image.alt}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />

      {/* Border on hover */}
      <div className="absolute inset-0 border-4 border-transparent group-hover:border-orange-500 transition-colors duration-300 rounded-xl" />

      {/* Content Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 text-white transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
        <h3 className="font-semibold text-sm md:text-base opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {image.alt}
        </h3>
      </div>

      {/* Click indicator */}
      <div className="absolute top-2 right-2 bg-white/20 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <svg
          className="w-4 h-4 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m0 0v6m0-6h6m-6 0H4"
          />
        </svg>
      </div>
    </motion.div>
  );
};

export default LayoutGridGallery;
