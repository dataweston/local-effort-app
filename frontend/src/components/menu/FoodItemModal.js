import React from 'react';
import { motion } from 'framer-motion';

const backdrop = {
  visible: { opacity: 1 },
  hidden: { opacity: 0 },
};

const modal = {
  hidden: { y: "-50px", opacity: 0 },
  visible: { y: "0", opacity: 1, transition: { delay: 0.1 } },
};

const FoodItemModal = ({ item, onClose }) => {
  return (
    <motion.div
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4"
      variants={backdrop}
      initial="hidden"
      animate="visible"
      exit="hidden"
      onClick={onClose}
    >
      <motion.div
        variants={modal}
        className="bg-white rounded-lg shadow-xl max-w-lg w-full p-8 relative"
        onClick={(e) => e.stopPropagation()} // Prevents modal from closing when clicking inside
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-neutral-500 hover:text-neutral-800 text-2xl">&times;</button>
        <h3 className="text-3xl font-bold mb-4">{item.name}</h3>
        <p className="text-body mb-6">{item.description}</p>
        <div>
          <h4 className="font-bold text-lg mb-2">Ingredients:</h4>
          <ul className="list-disc list-inside text-neutral-600 space-y-1">
            {item.ingredients.map((ingredient, index) => (
              <li key={index}>{ingredient}</li>
            ))}
          </ul>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default FoodItemModal;