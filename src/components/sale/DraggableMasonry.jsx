import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DraggableMasonry = ({ images = [] }) => {
  const [imageOrder, setImageOrder] = useState([]);
  const [positions, setPositions] = useState({});
  const [rotations, setRotations] = useState({});
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const dragStartTime = useRef(0);
  const dragStartPos = useRef({ x: 0, y: 0 });

  // Initialize order and rotations once
  useEffect(() => {
    if (images.length > 0 && imageOrder.length === 0) {
      setImageOrder(images.map(img => img.id));
      
      // Set random rotations for each image (only once)
      const rots = {};
      images.forEach(img => {
        rots[img.id] = (Math.random() - 0.5) * 3;
      });
      setRotations(rots);
    }
  }, [images, imageOrder.length]);

  // Recalculate positions whenever order changes
  useEffect(() => {
    if (imageOrder.length === 0) return;
    
    const calculatePositions = () => {
      const newPositions = {};
      const columns = 3;
      const columnHeights = new Array(columns).fill(0);
      const baseGap = 16;
      const columnWidth = 310;

      imageOrder.forEach((imgId) => {
        const img = images.find(i => i.id === imgId);
        if (!img) return;
        
        // Find shortest column
        const shortestCol = columnHeights.indexOf(Math.min(...columnHeights));
        
        // Calculate position with slight randomness for organic feel
        const randomOffset = {
          x: (Math.random() - 0.5) * 20,
          y: (Math.random() - 0.5) * 10,
        };

        const x = shortestCol * columnWidth + randomOffset.x;
        const y = columnHeights[shortestCol] + baseGap + randomOffset.y;

        newPositions[imgId] = { x, y, column: shortestCol };
        
        // Update column height
        columnHeights[shortestCol] += (img.height || 380) + baseGap;
      });

      setPositions(newPositions);
    };

    calculatePositions();
  }, [imageOrder, images]);

  const handleDragStart = (id) => {
    setIsDragging(id);
    dragStartTime.current = Date.now();
    dragStartPos.current = positions[id] || { x: 0, y: 0 };
  };

  const handleDragEnd = (id, event, info) => {
    const dragDuration = Date.now() - dragStartTime.current;
    const dragDistance = Math.sqrt(info.offset.x ** 2 + info.offset.y ** 2);
    
    // If it was a quick click (not a drag), open lightbox
    // More lenient thresholds: 300ms and 10px
    if (dragDuration < 300 && dragDistance < 10) {
      const img = images.find(i => i.id === id);
      if (img) {
        setLightboxImage(img);
        setIsDragging(null);
        return;
      }
    }
    
    setIsDragging(null);
    
    const currentPos = positions[id];
    if (!currentPos) return;
    
    // Calculate new position after drag
    const newX = currentPos.x + info.offset.x;
    const newY = currentPos.y + info.offset.y;
    
    // Determine which column we're closest to
    const columnWidth = 310;
    const targetColumn = Math.max(0, Math.min(2, Math.round(newX / columnWidth)));
    
    // Find all images in each column (excluding the dragged one)
    const columnImages = [[], [], []];
    imageOrder.forEach(imgId => {
      if (imgId === id) return;
      const pos = positions[imgId];
      if (pos) {
        columnImages[pos.column].push({
          id: imgId,
          y: pos.y,
          height: images.find(i => i.id === imgId)?.height || 380
        });
      }
    });
    
    // Sort each column by Y position
    columnImages.forEach(col => col.sort((a, b) => a.y - b.y));
    
    // Find where in the target column this image should be inserted
    const targetColumnImages = columnImages[targetColumn];
    let insertIndex = targetColumnImages.length;
    
    for (let i = 0; i < targetColumnImages.length; i++) {
      if (newY < targetColumnImages[i].y) {
        insertIndex = i;
        break;
      }
    }
    
    // Rebuild the order array with the moved image in its new position
    const newOrder = [];
    const columnsToProcess = [[], [], []];
    
    // Distribute images back into columns
    imageOrder.forEach(imgId => {
      if (imgId === id) return;
      const pos = positions[imgId];
      if (pos) {
        columnsToProcess[pos.column].push(imgId);
      }
    });
    
    // Insert dragged image into target column at correct position
    columnsToProcess[targetColumn].splice(insertIndex, 0, id);
    
    // Interleave columns to rebuild order (for more natural flow)
    const maxLength = Math.max(...columnsToProcess.map(col => col.length));
    for (let i = 0; i < maxLength; i++) {
      columnsToProcess.forEach(col => {
        if (col[i]) newOrder.push(col[i]);
      });
    }
    
    setImageOrder(newOrder);
  };

  return (
    <>
      <div 
        ref={containerRef}
        className="relative w-full"
        style={{ minHeight: '1000px' }}
      >
        {images.map((img, idx) => {
          const pos = positions[img.id] || { x: 0, y: 0, column: 0 };
          const rotation = rotations[img.id] || 0;
          const isBeingDragged = isDragging === img.id;
          
          return (
            <motion.div
              key={img.id}
              drag
              dragMomentum={false}
              dragElastic={0.05}
              onDragStart={() => handleDragStart(img.id)}
              onDragEnd={(e, info) => handleDragEnd(img.id, e, info)}
              style={{
                position: 'absolute',
                width: img.width || 300,
                cursor: isBeingDragged ? 'grabbing' : 'grab',
                zIndex: isBeingDragged ? 5 : 1,
              }}
              animate={{
                x: pos.x,
                y: pos.y,
                rotate: rotation,
                opacity: 1,
                scale: 1,
              }}
              whileHover={{ 
                scale: 1.08, 
                rotate: rotation + (Math.random() - 0.5) * 2,
                zIndex: 3,
                transition: { type: "spring", stiffness: 400, damping: 25 }
              }}
              whileDrag={{ 
                scale: 1.12, 
                rotate: rotation + (Math.random() - 0.5) * 3,
                zIndex: 5,
                transition: { type: "spring", stiffness: 400, damping: 25 }
              }}
              initial={{ 
                opacity: 0, 
                scale: 0.7, 
                x: pos.x,
                y: pos.y,
                rotate: rotation - 10 
              }}
              transition={{ 
                type: "spring",
                stiffness: 260,
                damping: 26,
                delay: idx * 0.04,
              }}
              className="shadow-xl hover:shadow-2xl transition-shadow duration-300"
            >
              {/* Polaroid-style frame */}
              <div className="relative bg-white p-3 pb-8 rounded-sm">
                <img
                  src={img.url}
                  alt={`Pie gallery ${idx + 1}`}
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

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative max-w-6xl max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={lightboxImage.url}
                alt="Enlarged view"
                className="w-full h-full object-contain rounded-lg shadow-2xl"
              />
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute -top-4 -right-4 w-12 h-12 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-800 text-3xl font-light transition-colors shadow-lg"
                aria-label="Close"
              >
                ×
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default DraggableMasonry;