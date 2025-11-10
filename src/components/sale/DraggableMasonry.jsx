import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

const DraggableMasonry = ({ images = [] }) => {
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
    
    // Calculate new position after drag
    const newX = (positions[id]?.x || 0) + info.offset.x;
    const newY = (positions[id]?.y || 0) + info.offset.y;
    
    // Snap to nearest column
    const columnWidth = 310;
    const nearestColumn = Math.round(newX / columnWidth);
    const snappedX = nearestColumn * columnWidth;
    
    // Find the appropriate Y position in that column
    const imagesInColumn = Object.entries(positions)
      .filter(([imgId, pos]) => {
        if (imgId === String(id)) return false;
        const colIndex = Math.round(pos.x / columnWidth);
        return colIndex === nearestColumn;
      })
      .map(([imgId, pos]) => {
        const img = images.find(i => String(i.id) === imgId);
        return { y: pos.y, height: img?.height || 380 };
      })
      .sort((a, b) => a.y - b.y);
    
    // Find appropriate Y position (either above, between, or below existing images)
    let snappedY = newY;
    const currentImage = images.find(i => String(i.id) === String(id));
    const currentHeight = currentImage?.height || 380;
    const baseGap = 25;
    
    if (imagesInColumn.length === 0) {
      // Empty column, snap to top with some offset
      snappedY = baseGap + (Math.random() - 0.5) * 15;
    } else {
      // Find best spot in column
      let bestSpot = baseGap + (Math.random() - 0.5) * 15;
      
      for (let i = 0; i < imagesInColumn.length; i++) {
        const img = imagesInColumn[i];
        const potentialY = img.y + img.height + baseGap;
        
        if (newY < img.y && i === 0) {
          // Before first image
          bestSpot = baseGap + (Math.random() - 0.5) * 15;
          break;
        } else if (newY >= img.y && (i === imagesInColumn.length - 1 || newY < imagesInColumn[i + 1].y)) {
          // After this image
          bestSpot = potentialY + (Math.random() - 0.5) * 15;
          break;
        }
      }
      snappedY = bestSpot;
    }
    
    setPositions(prev => ({
      ...prev,
      [id]: {
        x: snappedX,
        y: snappedY,
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
              width: img.width || 300,
              cursor: isDragging ? 'grabbing' : 'grab',
            }}
            animate={{
              x: pos.x,
              y: pos.y,
              rotate: pos.rotation,
              opacity: 1,
              scale: 1,
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
              x: pos.x,
              y: pos.y,
              rotate: pos.rotation - 10 
            }}
            transition={{ 
              type: "spring",
              stiffness: 300,
              damping: 30,
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