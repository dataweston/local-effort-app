import React from 'react';
import { motion } from 'framer-motion';

export const FloatingText = ({ text, onAnimationEnd }) => {
  return (
    <motion.div
      initial={{ y: 0, opacity: 1, scale: 1, x: Math.random() * 60 - 30 }}
      animate={{ y: -100, opacity: 0, scale: 1.5 }}
      transition={{ duration: 1.5, ease: "easeOut" }}
      onAnimationComplete={onAnimationEnd}
      className="absolute text-2xl font-bold text-yellow-400 drop-shadow-lg"
      style={{ textShadow: '1px 1px 2px #000' }}
    >
      {text}
    </motion.div>
  );
}