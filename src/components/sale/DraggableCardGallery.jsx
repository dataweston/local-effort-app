import React, { useEffect, useState, useCallback } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';

/**
 * DraggableCardGallery - Interactive draggable and tiltable cards
 * Inspired by Aceternity UI's draggable-card component
 */
const DraggableCardGallery = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-neutral-600 text-lg">Loading gallery...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-gradient-to-br from-neutral-50 to-neutral-100 p-8">
      <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-4 p-8">
        {images.map((image, index) => (
          <DraggableCard key={image.id} image={image} index={index} />
        ))}
      </div>
    </div>
  );
};

/**
 * Individual draggable card with tilt effect
 */
const DraggableCard = ({ image, index }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Create tilt effect based on mouse position
  const rotateX = useTransform(y, [-100, 100], [10, -10]);
  const rotateY = useTransform(x, [-100, 100], [-10, 10]);

  // Random initial position
  const randomPosition = {
    x: Math.random() * 200 - 100,
    y: Math.random() * 200 - 100,
    rotate: Math.random() * 20 - 10,
  };

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0.1}
      initial={{
        x: randomPosition.x,
        y: randomPosition.y,
        rotate: randomPosition.rotate,
        opacity: 0,
        scale: 0.8,
      }}
      animate={{
        opacity: 1,
        scale: 1,
      }}
      transition={{
        delay: index * 0.03,
        duration: 0.4,
      }}
      whileHover={{
        scale: 1.05,
        zIndex: 50,
      }}
      whileDrag={{
        scale: 1.1,
        zIndex: 100,
        cursor: 'grabbing',
      }}
      style={{
        x,
        y,
        rotateX,
        rotateY,
      }}
      className="absolute cursor-grab"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        x.set(e.clientX - centerX);
        y.set(e.clientY - centerY);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      <div className="relative group">
        <div className="w-64 h-80 rounded-xl overflow-hidden border-4 border-white shadow-2xl bg-white p-3 transition-all duration-300 group-hover:border-orange-400 group-hover:shadow-orange-200">
          <img
            src={image.url}
            alt={image.alt}
            className="w-full h-full object-cover rounded-lg"
            loading="lazy"
          />
        </div>
        {/* Decorative corner accent */}
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-orange-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
    </motion.div>
  );
};

export default DraggableCardGallery;
