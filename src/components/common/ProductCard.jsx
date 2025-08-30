import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';

export const ProductCard = ({ product, onAddToCart }) => {
  const [showInfo, setShowInfo] = useState(false);
  const buttonText =
    product.type === 'pizza' ? `Buy a ${product.name.split(' ')[0]}` : 'Add to Cart';

  return (
    <div className="border rounded-lg p-4 flex flex-col gap-3 transition-all hover:shadow-lg hover:border-red-500 bg-white">
      <button
        type="button"
        className="flex justify-between items-start text-left w-full"
        onClick={() => setShowInfo(!showInfo)}
        aria-expanded={showInfo}
      >
        <div className="flex-1">
          <h4 className="text-lg font-bold">{product.name}</h4>
          <p className="text-sm text-gray-600">{product.desc}</p>
        </div>
        <div className="text-4xl ml-4" aria-hidden>
          {product.emoji}
        </div>
      </button>
      {showInfo && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="text-sm text-gray-500 border-t pt-2 mt-2"
        >
          More details about this awesome product would go here. It&apos;s a great choice!
        </motion.div>
      )}
      <div className="mt-auto flex items-center justify-between pt-4">
        <div className="font-bold text-xl">${product.price}</div>
        <button
          type="button"
          className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
          onClick={() => onAddToCart(product)}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
};

ProductCard.propTypes = {
  product: PropTypes.shape({
    type: PropTypes.string,
    name: PropTypes.string,
    desc: PropTypes.string,
    emoji: PropTypes.string,
    price: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  }).isRequired,
  onAddToCart: PropTypes.func,
};

ProductCard.defaultProps = {
  onAddToCart: () => {},
};
