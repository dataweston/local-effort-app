import React, { useState } from 'react';
import { motion } from 'framer-motion';

export const ProductCard = ({ product, onAddToCart }) => {
  const [showInfo, setShowInfo] = useState(false);
  const buttonText = product.type === 'pizza' ? `Buy a ${product.name.split(' ')[0]}` : "Add to Cart";

  return (
    <div className="border rounded-lg p-4 flex flex-col gap-3 transition-all hover:shadow-lg hover:border-red-500 bg-white">
      <div className="flex justify-between items-start cursor-pointer" onClick={() => setShowInfo(!showInfo)}>
        <div className="flex-1">
          <h4 className="text-lg font-bold">{product.name}</h4>
          <p className="text-sm text-gray-600">{product.desc}</p>
        </div>
        <div className="text-4xl ml-4">{product.emoji}</div>
      </div>
      {showInfo && (
        <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="text-sm text-gray-500 border-t pt-2 mt-2"
        >
            More details about this awesome product would go here. It's a great choice!
        </motion.div>
      )}
      <div className="mt-auto flex items-center justify-between pt-4">
        <div className="font-bold text-xl">${product.price}</div>
        <button 
          className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors" 
          onClick={onAddToCart}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}