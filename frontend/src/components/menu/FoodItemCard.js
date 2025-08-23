import React from 'react';
import { motion } from 'framer-motion';
import { fadeInUp } from '../../utils/animations'; // Assuming you have this from your other pages

const FoodItemCard = ({ item, onClick }) => {
  return (
    <motion.div
      variants={fadeInUp} // Use an existing animation
      onClick={onClick}
      className="border border-neutral-200 rounded-lg p-6 cursor-pointer hover:shadow-lg hover:border-neutral-400 transition-all duration-300 bg-white"
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
    >
      <h4 className="text-xl font-bold text-neutral-800">{item.name}</h4>
      <p className="text-neutral-600 mt-2 line-clamp-2">{item.description}</p>
    </motion.div>
  );
};

export default FoodItemCard;