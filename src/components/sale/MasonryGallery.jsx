import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

/**
 * MasonryGallery - Draggable masonry grid using Packery
 * Images fill the page with borders, padding, and hover animations
 */
const MasonryGallery = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const gridRef = useRef(null);
  const packeryRef = useRef(null);

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

  // Initialize Packery once images are loaded
  useEffect(() => {
    if (!gridRef.current || images.length === 0 || loading) return;

    // Load Packery and Draggabilly from CDN if not already loaded
    const loadPackery = async () => {
      // Check if Packery is already loaded
      if (window.Packery && window.Draggabilly) {
        initializePackery();
        return;
      }

      // Load Packery
      if (!window.Packery) {
        const packeryScript = document.createElement('script');
        packeryScript.src = 'https://unpkg.com/packery@2/dist/packery.pkgd.min.js';
        packeryScript.async = true;
        document.body.appendChild(packeryScript);

        await new Promise((resolve) => {
          packeryScript.onload = resolve;
        });
      }

      // Load Draggabilly for drag-and-drop
      if (!window.Draggabilly) {
        const draggabillyScript = document.createElement('script');
        draggabillyScript.src = 'https://unpkg.com/draggabilly@2/dist/draggabilly.pkgd.min.js';
        draggabillyScript.async = true;
        document.body.appendChild(draggabillyScript);

        await new Promise((resolve) => {
          draggabillyScript.onload = resolve;
        });
      }

      initializePackery();
    };

    const initializePackery = () => {
      if (!window.Packery || !gridRef.current) return;

      // Small delay to ensure images are rendered
      setTimeout(() => {
        try {
          const pckry = new window.Packery(gridRef.current, {
            itemSelector: '.masonry-item',
            gutter: 12,
            percentPosition: true,
            transitionDuration: '0.3s',
          });

          packeryRef.current = pckry;

          // Make each item draggable
          pckry.getItemElements().forEach((itemElem) => {
            const draggie = new window.Draggabilly(itemElem);
            pckry.bindDraggabillyEvents(draggie);
          });
        } catch (error) {
          console.error('Error initializing Packery:', error);
        }
      }, 100);
    };

    loadPackery();

    return () => {
      if (packeryRef.current && packeryRef.current.destroy) {
        packeryRef.current.destroy();
      }
    };
  }, [images, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-neutral-600 text-lg">Loading gallery...</p>
      </div>
    );
  }

  return (
    <div className="w-full py-4">
      <div ref={gridRef} className="masonry-grid">
        {images.map((image, index) => (
          <motion.div
            key={image.id}
            className="masonry-item"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.02, duration: 0.3 }}
            style={{
              width: `${Math.random() > 0.5 ? '25%' : '33.333%'}`,
            }}
          >
            <div className="masonry-item-content">
              <img
                src={image.url}
                alt={image.alt}
                loading="lazy"
                className="w-full h-auto rounded-lg"
              />
            </div>
          </motion.div>
        ))}
      </div>

      <style jsx>{`
        .masonry-grid {
          position: relative;
        }

        .masonry-item {
          float: left;
          padding: 6px;
          cursor: move;
          cursor: grab;
        }

        .masonry-item:active {
          cursor: grabbing;
        }

        .masonry-item-content {
          border: 3px solid #e5e7eb;
          border-radius: 12px;
          padding: 8px;
          background: white;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
          overflow: hidden;
        }

        .masonry-item-content:hover {
          border-color: #f97316;
          box-shadow: 0 8px 16px rgba(249, 115, 22, 0.2);
          transform: translateY(-4px) scale(1.02);
        }

        .masonry-item-content img {
          display: block;
          transition: transform 0.3s ease;
        }

        .masonry-item-content:hover img {
          transform: scale(1.05);
        }

        .masonry-item.is-dragging {
          z-index: 100;
          opacity: 0.8;
        }

        .masonry-item.is-positioning-post-drag {
          transition: transform 0.4s ease;
        }
      `}</style>
    </div>
  );
};

export default MasonryGallery;
