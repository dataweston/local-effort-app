import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

// Sample images - replace with your actual image URLs from your sanity/backend
const SAMPLE_IMAGES = [
  { id: 1, url: 'https://images.unsplash.com/photo-1464305795204-6f5bbfc7fb81?w=400', width: 280, height: 380 },
  { id: 2, url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400', width: 300, height: 340 },
  { id: 3, url: 'https://images.unsplash.com/photo-1476887334197-56adbf254e1a?w=400', width: 270, height: 400 },
  { id: 4, url: 'https://images.unsplash.com/photo-1495147466023-ac5c588e2e94?w=400', width: 310, height: 360 },
  { id: 5, url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400', width: 280, height: 380 },
  { id: 6, url: 'https://images.unsplash.com/photo-1481833761820-0509d3217039?w=400', width: 300, height: 350 },
  { id: 7, url: 'https://images.unsplash.com/photo-1519915212116-7cfef71f1d3e?w=400', width: 290, height: 370 },
  { id: 8, url: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=400', width: 280, height: 390 },
];

const DraggableMasonry = ({ images = SAMPLE_IMAGES }) => {
  const [positions, setPositions] = useState({});
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    // Initialize positions with loose masonry layout
    const initPositions = {};
    const columns = 3;
    const columnHeights = new Array(columns).fill(0);
    const baseGap = 25;
    const columnWidth = 310;

    images.forEach((img, idx) => {
      // Find shortest column
      const shortestCol = columnHeights.indexOf(Math.min(...columnHeights));
      
      // Add randomness for a loose, organic feel (but not too much)
      const randomOffset = {
        x: (Math.random() - 0.5) * 25,
        y: (Math.random() - 0.5) * 15,
      };

      const x = shortestCol * columnWidth + randomOffset.x;
      const y = columnHeights[shortestCol] + baseGap + randomOffset.y;

      // Add slight random rotation
      const rotation = (Math.random() - 0.5) * 3;

      initPositions[img.id] = { x, y, rotation };
      columnHeights[shortestCol] += (img.height || 380) + baseGap;
    });

    setPositions(initPositions);
  }, [images]);

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = (id, event, info) => {
    setIsDragging(false);
    setPositions(prev => ({
      ...prev,
      [id]: {
        x: (prev[id]?.x || 0) + info.offset.x,
        y: (prev[id]?.y || 0) + info.offset.y,
        rotation: prev[id]?.rotation || 0,
      }
    }));
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full"
      style={{ minHeight: '1000px' }}
    >
      {images.map((img, idx) => {
        const pos = positions[img.id] || { x: 0, y: 0, rotation: 0 };
        
        return (
          <motion.div
            key={img.id}
            drag
            dragMomentum={false}
            dragElastic={0.05}
            onDragStart={handleDragStart}
            onDragEnd={(e, info) => handleDragEnd(img.id, e, info)}
            style={{
              position: 'absolute',
              left: pos.x,
              top: pos.y,
              width: img.width || 300,
              cursor: isDragging ? 'grabbing' : 'grab',
            }}
            whileHover={{ 
              scale: 1.08, 
              rotate: pos.rotation + (Math.random() - 0.5) * 2,
              zIndex: 50,
              transition: { type: "spring", stiffness: 400, damping: 25 }
            }}
            whileDrag={{ 
              scale: 1.12, 
              rotate: pos.rotation + (Math.random() - 0.5) * 3,
              zIndex: 100,
              transition: { type: "spring", stiffness: 400, damping: 25 }
            }}
            initial={{ 
              opacity: 0, 
              scale: 0.7, 
              rotate: pos.rotation - 10 
            }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              rotate: pos.rotation 
            }}
            transition={{ 
              type: "spring",
              stiffness: 300,
              damping: 25,
              delay: idx * 0.05,
            }}
            className="shadow-xl hover:shadow-2xl transition-shadow duration-300"
          >
            {/* Polaroid-style frame */}
            <div className="relative bg-white p-3 pb-8 rounded-sm">
              <img
                src={img.url}
                alt={`Gallery image ${img.id}`}
                className="w-full h-auto select-none pointer-events-none"
                draggable={false}
                loading="lazy"
              />
              
              {/* Washi tape decoration - varies per image */}
              {idx % 2 === 0 ? (
                <div 
                  className="absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-6 bg-amber-200/80 shadow-md"
                  style={{ 
                    transform: `translateX(-50%) rotate(${(Math.random() - 0.5) * 6}deg)`,
                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,.1) 2px, rgba(255,255,255,.1) 4px)'
                  }}
                />
              ) : idx % 3 === 0 ? (
                <>
                  <div className="absolute -top-1.5 -left-1.5 w-10 h-7 bg-orange-200/70 rotate-[-20deg] shadow-sm" />
                  <div className="absolute -top-1.5 -right-1.5 w-10 h-7 bg-amber-200/70 rotate-[20deg] shadow-sm" />
                </>
              ) : (
                <div 
                  className="absolute -top-2 right-4 w-14 h-6 bg-yellow-200/80 shadow-md"
                  style={{ 
                    transform: `rotate(${(Math.random() - 0.5) * 8}deg)`,
                  }}
                />
              )}

              {/* Subtle inner shadow for depth */}
              <div className="absolute inset-0 pointer-events-none rounded-sm"
                   style={{ boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)' }} />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default DraggableMasonry;
